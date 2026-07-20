/**
 * שכבת הנתונים של מסך "פרסומי WhatsApp".
 *
 * עקרונות:
 * - Supabase הוא מקור האמת. נתוני Fix לעולם אינם דורסים שם/תפקיד/עיר/אזור.
 * - סינון, מיון ו-Pagination מתבצעים בשרת בלבד.
 * - קליטת קובץ היא דו-שלבית: preview (ללא כתיבה) → commit (לאחר אישור).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  readCampaignFile, parseCampaignRows, isCampaignResultsFile, getMissingHeaders,
  computeFileHash, inferCampaignSentAt, suggestCampaignName,
  type ParsedCampaignRow,
} from '@/lib/fixPublications/campaignParser'
import { pickHigherStatus, type DeliveryStatusCode } from '@/lib/fixPublications/deliveryStatus'

export const FIX_PUBLICATIONS_KEYS = {
  overview: ['fix-publications', 'overview'] as const,
  campaigns: ['fix-publications', 'campaigns'] as const,
  stats: ['fix-publications', 'stats'] as const,
  dicts: ['fix-publications', 'dicts'] as const,
}

export interface PublicationFilters {
  search: string
  campaignIds: number[]
  roleIds: number[]
  regionIds: number[]
  cityIds: number[]
  deliveryStatuses: string[]
  sentFrom: string
  sentTo: string
}

export const EMPTY_FILTERS: PublicationFilters = {
  search: '', campaignIds: [], roleIds: [], regionIds: [], cityIds: [],
  deliveryStatuses: [], sentFrom: '', sentTo: '',
}

export function hasActiveFilters(f: PublicationFilters): boolean {
  return !!f.search || !!f.sentFrom || !!f.sentTo ||
    f.campaignIds.length > 0 || f.roleIds.length > 0 || f.regionIds.length > 0 ||
    f.cityIds.length > 0 || f.deliveryStatuses.length > 0
}

export interface PublicationRow {
  recipient_id: number
  campaign_id: number
  contact_id: number | null
  phone_norm: string | null
  phone_raw: string | null
  full_name_raw: string | null
  sent_at: string | null
  delivery_status: DeliveryStatusCode
  delivery_status_raw: string | null
  fix_status_raw: string | null
  fix_process_raw: string | null
  email_raw: string | null
  fix_digital_id: string | null
  fix_lead_number: string | null
  fix_file_code: string | null
  match_result: string
  campaign: { campaign_id: number; campaign_name: string } | null
  contact: {
    contact_id: number
    full_name: string | null
    display_name: string | null
    phone: string | null
    role: number | null
    region_id: number | null
    city_id: number | null
    social_status: number | null
  } | null
}

export const PUBLICATION_SORT_COLUMNS: Record<string, string> = {
  entity_name: 'full_name_raw',
  phone: 'phone_norm',
  last_delivery_status: 'delivery_status',
  last_sent_at: 'sent_at',
}

const PAGE_SIZE = 25

// ─────────────────────────────── מילונים ───────────────────────────────

export interface DictRow { id: number; name: string; region_id?: number | null }

async function fetchAllPages<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table).select(columns).range(page * 1000, page * 1000 + 999)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

export function usePublicationDicts() {
  return useQuery({
    queryKey: FIX_PUBLICATIONS_KEYS.dicts,
    staleTime: 600_000,
    queryFn: async () => {
      const [roles, regions, cities, socialStatuses] = await Promise.all([
        fetchAllPages<DictRow>('dict_roles', 'id, name'),
        fetchAllPages<DictRow>('dict_regions', 'id, name'),
        fetchAllPages<DictRow>('dict_cities', 'id, name, region_id'),
        fetchAllPages<DictRow>('dict_social_statuses', 'id, name'),
      ])
      const byId = (rows: DictRow[]) => new Map(rows.map((r) => [Number(r.id), r.name]))
      return {
        roles, regions, cities, socialStatuses,
        roleById: byId(roles),
        regionById: byId(regions),
        cityById: byId(cities),
        socialStatusById: byId(socialStatuses),
      }
    },
  })
}

// ─────────────────────────── טבלת מצב פרסומים ───────────────────────────

export function usePublicationsOverview(
  filters: PublicationFilters,
  page: number,
  sortBy: string,
  sortDir: 'asc' | 'desc',
) {
  return useQuery({
    queryKey: [...FIX_PUBLICATIONS_KEYS.overview, filters, page, sortBy, sortDir],
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    queryFn: async () => {
      // סינון על שדות איש הקשר מחייב inner join — אחרת שורות לא-מותאמות
      // היו נעלמות גם כשאין פילטר תוכן.
      const needsContactJoin =
        filters.roleIds.length > 0 || filters.regionIds.length > 0 || filters.cityIds.length > 0
      const contactJoin = needsContactJoin ? 'contact!inner' : 'contact'

      let query = supabase
        .from('whatsapp_campaign_recipients')
        .select(
          `recipient_id, campaign_id, contact_id, phone_norm, phone_raw, full_name_raw,
           sent_at, delivery_status, delivery_status_raw, fix_status_raw, fix_process_raw,
           email_raw, fix_digital_id, fix_lead_number, fix_file_code, match_result,
           campaign:whatsapp_campaigns!inner(campaign_id, campaign_name),
           ${contactJoin}(contact_id, full_name, display_name, phone, role, region_id, city_id, social_status)`,
          { count: 'exact' },
        )

      if (filters.search.trim()) {
        const term = filters.search.trim().replace(/[%,()]/g, '')
        const digits = term.replace(/\D/g, '')
        const clauses = [`full_name_raw.ilike.%${term}%`]
        if (digits) clauses.push(`phone_norm.ilike.%${digits}%`)
        query = query.or(clauses.join(','))
      }
      if (filters.campaignIds.length) query = query.in('campaign_id', filters.campaignIds)
      if (filters.deliveryStatuses.length) query = query.in('delivery_status', filters.deliveryStatuses)
      if (filters.roleIds.length) query = query.in('contact.role', filters.roleIds)
      if (filters.regionIds.length) query = query.in('contact.region_id', filters.regionIds)
      if (filters.cityIds.length) query = query.in('contact.city_id', filters.cityIds)
      if (filters.sentFrom) query = query.gte('sent_at', filters.sentFrom)
      if (filters.sentTo) query = query.lte('sent_at', `${filters.sentTo}T23:59:59`)

      const column = PUBLICATION_SORT_COLUMNS[sortBy] ?? 'sent_at'
      query = query
        .order(column, { ascending: sortDir === 'asc', nullsFirst: false })
        .order('recipient_id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as PublicationRow[], total: count ?? 0, pageSize: PAGE_SIZE }
    },
  })
}

export function useCampaigns() {
  return useQuery({
    queryKey: FIX_PUBLICATIONS_KEYS.campaigns,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .select('campaign_id, campaign_name, sent_at, source_file_name, total_rows, matched_rows, unmatched_rows, created_at')
        .order('sent_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ─────────────────────── קליטת דוח קמפיין: Preview ───────────────────────

export interface CampaignPreview {
  fileName: string
  fileHash: string
  suggestedName: string
  campaignSentAt: string | null
  rows: ParsedCampaignRow[]
  counts: {
    total: number
    matched: number
    notFound: number
    invalidPhone: number
    missingPhone: number
    byStatus: Record<string, number>
  }
  duplicateOf: { campaign_id: number; campaign_name: string } | null
  missingHeaders: string[]
}

/**
 * קורא, מנרמל ומתאים את הקובץ מול Supabase — ללא שום כתיבה.
 */
export async function buildCampaignPreview(file: File): Promise<CampaignPreview> {
  const rawRows = await readCampaignFile(file)
  if (!rawRows.length) throw new Error('הקובץ ריק או שלא נמצאו בו שורות נתונים.')
  if (!isCampaignResultsFile(rawRows)) {
    throw new Error('הקובץ אינו דוח תוצאות קמפיין. נדרשות לפחות העמודות phone ו-sending_status.')
  }

  const fileHash = await computeFileHash(file)
  const { data: dup } = await supabase
    .from('whatsapp_campaigns')
    .select('campaign_id, campaign_name')
    .eq('file_hash', fileHash)
    .maybeSingle()

  const rows = parseCampaignRows(rawRows)

  // התאמה לפי phone_norm בלבד — לא לפי שם ולא לפי אימייל.
  const phones = Array.from(new Set(rows.map((r) => r.phoneNorm).filter(Boolean))) as string[]
  const byPhone = new Map<string, number>()
  for (let i = 0; i < phones.length; i += 500) {
    const chunk = phones.slice(i, i + 500)
    const { data, error } = await supabase
      .from('contact').select('contact_id, phone_norm').in('phone_norm', chunk)
    if (error) throw error
    for (const c of data ?? []) {
      if (c.phone_norm) byPhone.set(c.phone_norm, Number(c.contact_id))
    }
  }

  for (const row of rows) {
    if (!row.phoneNorm) continue
    const id = byPhone.get(row.phoneNorm)
    if (id != null) { row.contactId = id; row.matchResult = 'matched_contact' }
  }

  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.deliveryStatus] = (byStatus[r.deliveryStatus] ?? 0) + 1

  const campaignSentAt = inferCampaignSentAt(rows)
  return {
    fileName: file.name,
    fileHash,
    suggestedName: suggestCampaignName(campaignSentAt, file.name),
    campaignSentAt,
    rows,
    counts: {
      total: rows.length,
      matched: rows.filter((r) => r.matchResult === 'matched_contact').length,
      notFound: rows.filter((r) => r.matchResult === 'not_found').length,
      invalidPhone: rows.filter((r) => r.matchResult === 'invalid_phone').length,
      missingPhone: rows.filter((r) => r.matchResult === 'missing_phone').length,
      byStatus,
    },
    duplicateOf: dup ?? null,
    missingHeaders: getMissingHeaders(rawRows),
  }
}

export function useCampaignPreview() {
  return useMutation({ mutationFn: buildCampaignPreview })
}

// ─────────────────────── קליטת דוח קמפיין: Commit ───────────────────────

interface CommitArgs {
  preview: CampaignPreview
  campaignName: string
  /** קמפיין קיים לעדכון, או null ליצירת קמפיין חדש */
  existingCampaignId: number | null
}

export function useCommitCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ preview, campaignName, existingCampaignId }: CommitArgs) => {
      const { rows, counts, campaignSentAt, fileName, fileHash } = preview

      let campaignId = existingCampaignId
      if (campaignId == null) {
        const { data, error } = await supabase
          .from('whatsapp_campaigns')
          .insert({
            campaign_name: campaignName.trim() || preview.suggestedName,
            sent_at: campaignSentAt,
            source_file_name: fileName,
            file_hash: fileHash,
            total_rows: counts.total,
            matched_rows: counts.matched,
            unmatched_rows: counts.total - counts.matched,
          })
          .select('campaign_id').single()
        if (error) throw error
        campaignId = Number(data.campaign_id)
      }

      // רק שורות עם טלפון תקין נשמרות כנמענים. שורות ללא טלפון או עם טלפון
      // פסול אינן נשמרות — הן מוצגות ב-Preview לבדיקה ידנית ב-Fix.
      const storable = rows.filter((r) => r.phoneNorm)

      // ייבוא חוזר של אותו קמפיין: הסטטוס אינו נסוג אחורה (Read לא יוחלף ב-Delivered).
      const { data: existing, error: exErr } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('phone_norm, delivery_status')
        .eq('campaign_id', campaignId)
      if (exErr) throw exErr
      const priorStatus = new Map<string, DeliveryStatusCode>(
        (existing ?? []).map((r) => [r.phone_norm as string, r.delivery_status as DeliveryStatusCode]),
      )

      const payload = storable.map((r) => ({
        campaign_id: campaignId,
        contact_id: r.contactId,
        phone_norm: r.phoneNorm,
        phone_raw: r.phoneRaw,
        full_name_raw: r.fullNameRaw,
        sent_at: r.sentAt ?? campaignSentAt,
        delivery_status: pickHigherStatus(priorStatus.get(r.phoneNorm as string), r.deliveryStatus),
        delivery_status_raw: r.deliveryStatusRaw,
        fix_status_raw: r.fixStatusRaw,
        fix_process_raw: r.fixProcessRaw,
        email_raw: r.emailRaw,
        match_result: r.matchResult,
        source_row_number: r.rowNumber,
        raw_payload: r.rawPayload,
        updated_at: new Date().toISOString(),
      }))

      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase
          .from('whatsapp_campaign_recipients')
          .upsert(payload.slice(i, i + 500), { onConflict: 'campaign_id,phone_norm' })
        if (error) throw error
      }

      // שדה סיכום בלבד — מקור האמת להיסטוריה הוא whatsapp_campaign_recipients.
      // עדכון רק כאשר התאריך החדש מאוחר מהקיים.
      const matched = storable.filter((r) => r.contactId != null && (r.sentAt ?? campaignSentAt))
      const ids = Array.from(new Set(matched.map((r) => r.contactId as number)))
      const current = new Map<number, string | null>()
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await supabase
          .from('contact').select('contact_id, whatsapp_campaign_last_sent').in('contact_id', ids.slice(i, i + 500))
        for (const c of data ?? []) current.set(Number(c.contact_id), c.whatsapp_campaign_last_sent)
      }

      const toUpdate = new Map<number, string>()
      for (const r of matched) {
        const id = r.contactId as number
        const stamp = (r.sentAt ?? campaignSentAt) as string
        const prev = toUpdate.get(id) ?? current.get(id) ?? null
        if (!prev || new Date(stamp) > new Date(prev)) toUpdate.set(id, stamp)
      }

      const updates = Array.from(toUpdate.entries())
      for (let i = 0; i < updates.length; i += 25) {
        await Promise.all(
          updates.slice(i, i + 25).map(([contactId, stamp]) =>
            supabase.from('contact')
              .update({ whatsapp_campaign_last_sent: stamp })
              .eq('contact_id', contactId),
          ),
        )
      }

      return { campaignId, saved: payload.length, contactsUpdated: updates.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fix-publications'] })
      qc.invalidateQueries({ queryKey: ['contacts-v2'] })
    },
  })
}
