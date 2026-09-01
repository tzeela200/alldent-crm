/**
 * שכבת הנתונים של מסך "פרסומי WhatsApp".
 *
 * עקרונות:
 * - Supabase הוא מקור האמת. דוח Fix מעדכן אך ורק נתוני פרסום ושליחה —
 *   לעולם לא שם, אימייל, תפקיד, עיר, אזור, סטטוס תעסוקתי או פרופיל.
 * - דוח Fix לעולם אינו יוצר, מאחד או מוחק אנשי קשר וארגונים.
 * - כל שורת קמפיין היא אירוע היסטורי. אירוע ישן אינו נמחק כשמגיע חדש.
 * - סינון, מיון ו-Pagination מתבצעים בשרת בלבד.
 * - קליטת קובץ היא דו-שלבית: preview (ללא שום כתיבה) → commit (לאחר אישור).
 *
 * ⚠️ הסכמה החיה שונה מהמסמך המקורי של המסך. העמודות בפועל:
 *   whatsapp_campaigns          — campaign_id, external_campaign_id (UNIQUE),
 *                                 campaign_name, process_name, source_type,
 *                                 source_file_name, started_at, completed_at,
 *                                 status, total_recipients, submitted_count,
 *                                 delivered_count, read_count, failed_count,
 *                                 raw_payload
 *   whatsapp_campaign_recipients — recipient_id, campaign_id, contact_id,
 *                                 account_id, fix_contact_link_id, fixdigital_id,
 *                                 phone_norm, delivery_status_raw, delivery_status,
 *                                 failure_category, failure_message, sent_at,
 *                                 delivered_at, read_at, source_unique_key (UNIQUE),
 *                                 raw_payload
 * אין בטבלה phone_raw / full_name_raw / match_result — הערכים האלה נשמרים
 * בתוך raw_payload._alldent ומוצגים משם. אין צורך בשינוי סכמה.
 *
 * אילוצים חיים שחשוב לזכור:
 * - num_nonnulls(contact_id, account_id) <= 1 — אסור לשייך שורה גם לאיש
 *   קשר וגם לארגון. התנגשות אמיתית נשמרת ללא שיוך ומדווחת למשתמשת.
 * - source_unique_key הוא NOT NULL UNIQUE גלובלי (לא לכל קמפיין).
 * - raw_payload הוא NOT NULL default '{}'.
 * - recipient_id ו-campaign_id הם GENERATED ALWAYS AS IDENTITY — אין
 *   להכניס אותם ב-payload, ואין להשתמש ב-upsert() מולם (שגיאת 428C9).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  readCampaignFile, parseCampaignSheets, validateCampaignFile, groupIntoCampaigns,
  computeFileHash, inferCampaignSentAt, suggestCampaignName, rekeyCampaignGroup,
  type ParsedCampaignRow, type CampaignGroup, type FileValidation, type MatchResult,
} from '@/lib/fixPublications/campaignParser'
import { pickHigherStatus, type DeliveryStatusCode } from '@/lib/fixPublications/deliveryStatus'

export const FIX_PUBLICATIONS_KEYS = {
  all: ['fix-publications'] as const,
  overview: ['fix-publications', 'overview'] as const,
  campaigns: ['fix-publications', 'campaigns'] as const,
  stats: ['fix-publications', 'stats'] as const,
  dicts: ['fix-publications', 'dicts'] as const,
}

/** כמה מזהים נכנסים ל-`in(...)` אחד. גבוה מזה — ה-URL של PostgREST נחתך. */
const IN_CHUNK = 250
/** כמה שורות נשלחות ב-insert אחד */
const INSERT_CHUNK = 500

// ─────────────────────────────── סינון ───────────────────────────────

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

// ─────────────────────────────── שורת תצוגה ───────────────────────────────

/**
 * הבלוק שהמערכת כותבת לתוך raw_payload לצד שורת המקור המלאה.
 * שורת המקור עצמה נשמרת כפי שהתקבלה, עם הכותרות המקוריות שלה; הבלוק הזה
 * מחזיק את אותם ערכים בשמות אחידים כדי שהמסך לא יצטרך לנחש כותרות.
 */
export interface RecipientAudit {
  full_name?: string | null
  email?: string | null
  phone_raw?: string | null
  fix_status?: string | null
  fix_process?: string | null
  source_file?: string | null
  source_row?: string | null
  record_number?: string | null
  match?: MatchResult
  imported_at?: string
}

export interface PublicationRow {
  recipient_id: number
  campaign_id: number
  contact_id: number | null
  account_id: number | null
  phone_norm: string | null
  sent_at: string | null
  delivery_status: DeliveryStatusCode
  delivery_status_raw: string | null
  failure_category: string | null
  failure_message: string | null
  fixdigital_id: string | null
  source_unique_key: string
  raw_payload: Record<string, unknown> & { _alldent?: RecipientAudit }
  campaign: { campaign_id: number; campaign_name: string | null; source_file_name: string | null } | null
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
  account: {
    account_id: number
    account_name: string
    phone: string | null
    account_type: number | null
    region_id: number | null
    city_id: number | null
  } | null
}

/** קיצור קריאה: הבלוק שהמערכת כתבה, גם כשהוא חסר */
export function auditOf(row: PublicationRow): RecipientAudit {
  return row.raw_payload?._alldent ?? {}
}

/**
 * עמודות המיון. שם הנמען אינו עמודה בטבלה — הוא יושב בתוך raw_payload,
 * ולכן המיון עליו נעשה דרך נתיב ה-JSON (נתמך ב-PostgREST).
 */
/**
 * מיון בשרת לכל עמודה בטבלה.
 *
 * ⚠️ עמודות מילוניות (תפקיד/אזור/עיר/סטטוס פנייה) ממוינות כאן לפי **סדר
 *    המילון** ולא לפי השם בעברית: הבסיס הוא טבלת הנמענים, ולכן השם יושב שתי
 *    רמות embed מתחת (recipients → contact → dict), ו-PostgREST אינו תומך
 *    בכך (אומת: מחזיר 400). המיון עדיין מקבץ תפקידים דומים יחד, שזה מה
 *    שמיון לפי תפקיד נועד לו. במסך "מאגר לפי פרסום" הבסיס הוא contact
 *    ולכן שם המיון כן אלפביתי.
 */
export const PUBLICATION_SORT_COLUMNS: Record<string, string> = {
  entity_name: 'raw_payload->_alldent->>full_name',
  entity_type: 'contact_id',
  phone: 'phone_norm',
  role_name: 'contact(role)',
  region_name: 'contact(region_id)',
  city_name: 'contact(city_id)',
  social_status_name: 'contact(social_status)',
  last_delivery_status: 'delivery_status',
  last_sent_at: 'sent_at',
  campaign_name: 'campaign(campaign_name)',
  fix_name: 'raw_payload->_alldent->>full_name',
  email: 'raw_payload->_alldent->>email',
  fix_status_raw: 'raw_payload->_alldent->>fix_status',
  fix_process_raw: 'raw_payload->_alldent->>fix_process',
  delivery_status_raw: 'delivery_status_raw',
  failure_message: 'failure_message',
  source_file: 'raw_payload->_alldent->>source_file',
  source_row: 'raw_payload->_alldent->>source_row',
  record_number: 'raw_payload->_alldent->>record_number',
  fix_digital_id: 'fixdigital_id',
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
      const [roles, regions, cities, socialStatuses, accountTypes] = await Promise.all([
        fetchAllPages<DictRow>('dict_roles', 'id, name'),
        fetchAllPages<DictRow>('dict_regions', 'id, name'),
        fetchAllPages<DictRow>('dict_cities', 'id, name, region_id'),
        fetchAllPages<DictRow>('dict_social_statuses', 'id, name'),
        fetchAllPages<DictRow>('dict_account_types', 'id, name'),
      ])
      const byId = (rows: DictRow[]) => new Map(rows.map((r) => [Number(r.id), r.name]))
      return {
        roles, regions, cities, socialStatuses, accountTypes,
        roleById: byId(roles),
        regionById: byId(regions),
        cityById: byId(cities),
        socialStatusById: byId(socialStatuses),
        accountTypeById: byId(accountTypes),
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
          `recipient_id, campaign_id, contact_id, account_id, phone_norm, sent_at,
           delivery_status, delivery_status_raw, failure_category, failure_message,
           fixdigital_id, source_unique_key, raw_payload,
           campaign:whatsapp_campaigns!inner(campaign_id, campaign_name, source_file_name),
           ${contactJoin}(contact_id, full_name, display_name, phone, role, region_id, city_id, social_status),
           account:accounts(account_id, account_name, phone, account_type, region_id, city_id)`,
          { count: 'exact' },
        )

      if (filters.search.trim()) {
        const term = filters.search.trim().replace(/[%,()]/g, '')
        const digits = term.replace(/\D/g, '')
        const clauses = [`raw_payload->_alldent->>full_name.ilike.%${term}%`]
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

/**
 * ה-KPI העליונים. נספרים בשרת על כל הטבלה — לא על העמוד המוצג.
 * (הגרסה הקודמת ספרה "לא נמצאו במאגר" מתוך 25 השורות של העמוד הנוכחי.)
 */
export function usePublicationStats() {
  return useQuery({
    queryKey: FIX_PUBLICATIONS_KEYS.stats,
    staleTime: 30_000,
    queryFn: async () => {
      const [totalRes, campaignsRes, unmatchedRes, lastRes] = await Promise.all([
        supabase.from('whatsapp_campaign_recipients').select('recipient_id', { count: 'exact', head: true }),
        supabase.from('whatsapp_campaigns').select('campaign_id', { count: 'exact', head: true }),
        supabase.from('whatsapp_campaign_recipients')
          .select('recipient_id', { count: 'exact', head: true })
          .is('contact_id', null).is('account_id', null),
        supabase.from('whatsapp_campaign_recipients')
          .select('sent_at').not('sent_at', 'is', null)
          .order('sent_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (totalRes.error) throw totalRes.error
      if (campaignsRes.error) throw campaignsRes.error
      if (unmatchedRes.error) throw unmatchedRes.error
      if (lastRes.error) throw lastRes.error

      return {
        totalRecipients: totalRes.count ?? 0,
        totalCampaigns: campaignsRes.count ?? 0,
        unmatched: unmatchedRes.count ?? 0,
        lastSentAt: (lastRes.data?.sent_at as string | null) ?? null,
      }
    },
  })
}

/** סיכום קמפיין כפי שהוא נשמר בטבלה — המונים מרועננים בסוף כל קליטה */
export interface CampaignSummary {
  campaign_id: number
  external_campaign_id: string | null
  campaign_name: string | null
  process_name: string | null
  source_file_name: string | null
  started_at: string | null
  completed_at: string | null
  total_recipients: number | null
  submitted_count: number | null
  delivered_count: number | null
  read_count: number | null
  failed_count: number | null
  created_at: string | null
}

export function useCampaigns() {
  return useQuery({
    queryKey: FIX_PUBLICATIONS_KEYS.campaigns,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .select(`campaign_id, external_campaign_id, campaign_name, process_name, source_file_name,
                 started_at, completed_at, total_recipients, submitted_count, delivered_count,
                 read_count, failed_count, created_at`)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as unknown as CampaignSummary[]
    },
  })
}

// ─────────────────────── קליטת דוח קמפיין: Preview ───────────────────────

/** מצב קמפיין אחד בתוך הקובץ שהועלה, כפי שיוצג לאישור */
export interface CampaignPlan {
  campaignKey: string
  label: string
  /** קמפיין קיים ב-Supabase עם אותו external_campaign_id, אם יש */
  existingCampaignId: number | null
  startedAt: string | null
  completedAt: string | null
  processName: string | null
  rowCount: number
  newRows: number
  existingRows: number
  /** שורות שלא ניתן לשמור כלל — אין בהן נייד תקין */
  noPhone: number
  statusUpdates: number
  matched: number
  notFound: number
  /** איך הקמפיין זוהה ככזה שכבר קיים. null = קמפיין חדש לגמרי */
  identityMatch: CampaignIdentityMatch | null
}

/**
 * איך הקמפיין בקובץ זוהה כקמפיין שכבר קיים במערכת.
 *
 * `external_id` — אותו מזהה בדיוק (אותה תווית "קובץ מקור" או אותו שם קובץ).
 * `file_hash`   — **אותו קובץ בדיוק**, בשם אחר. חתימת SHA-256 זהה.
 * `same_send`   — אותו מועד שליחה **וגם** אותם נמענים. ייצוא חוזר שבו
 *                 סטטוסים התקדמו, ולכן החתימה שונה.
 */
export type CampaignMatchKind = 'external_id' | 'file_hash' | 'same_send'

export interface CampaignIdentityMatch {
  kind: CampaignMatchKind
  existingCampaignName: string
  existingSourceFile: string | null
  /** אחוז חפיפת הנמענים — רק ב-same_send */
  overlapPct?: number
}

export interface CampaignPreview {
  fileName: string
  fileHash: string
  validation: FileValidation
  campaigns: CampaignPlan[]
  rows: ParsedCampaignRow[]
  counts: {
    total: number
    campaigns: number
    matchedContacts: number
    matchedAccounts: number
    ambiguous: number
    notFound: number
    invalidPhone: number
    missingPhone: number
    alreadyExists: number
    statusUpdates: number
    willInsert: number
    byStatus: Record<string, number>
  }
}

/** הסטטוס הקיים לשורה שכבר נקלטה — משמש כדי לדעת אם הסטטוס התקדם */
type ExistingRecipient = { recipient_id: number; delivery_status: DeliveryStatusCode }

async function fetchExistingRecipients(campaignIds: number[]): Promise<Map<string, ExistingRecipient>> {
  const out = new Map<string, ExistingRecipient>()
  if (!campaignIds.length) return out

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('recipient_id, source_unique_key, delivery_status')
      .in('campaign_id', campaignIds)
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error
    for (const r of data ?? []) {
      out.set(r.source_unique_key as string, {
        recipient_id: Number(r.recipient_id),
        delivery_status: r.delivery_status as DeliveryStatusCode,
      })
    }
    if (!data || data.length < 1000) break
  }
  return out
}

/**
 * קורא, מנרמל ומתאים את הקובץ מול Supabase — ללא שום כתיבה.
 *
 * ההתאמה היא לפי נייד מנורמל בלבד (normalizeIlMobile — פורט מדויק של
 * public.normalize_il_mobile_phone). לא לפי שם ולא לפי אימייל.
 */
export async function buildCampaignPreview(
  file: File,
  /** לזהות אוטומטית קמפיין שכבר נקלט תחת שם אחר */
  autoMatch = true,
): Promise<CampaignPreview> {
  const sheets = await readCampaignFile(file)
  if (!sheets.length) throw new Error('הקובץ ריק או שלא נמצאו בו שורות נתונים.')

  const validation = validateCampaignFile(sheets)
  if (!validation.ok) {
    throw new Error(
      'הקובץ אינו דוח תוצאות קמפיין. חסרות העמודות: ' +
      validation.missingRequired.map((f) => (f === 'phone' ? 'טלפון' : 'סטטוס שליחה')).join(', '),
    )
  }

  const fileHash = await computeFileHash(file)
  const rows = parseCampaignSheets(sheets, file.name)
  const groups = groupIntoCampaigns(rows)

  await matchRowsToRecords(rows)

  // קמפיינים שכבר קיימים — לפי המזהה החיצוני הדטרמיניסטי
  const existingCampaigns = new Map<string, number>()
  const keys = groups.map((g) => g.campaignKey)
  for (let i = 0; i < keys.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select('campaign_id, external_campaign_id')
      .in('external_campaign_id', keys.slice(i, i + IN_CHUNK))
    if (error) throw error
    for (const c of data ?? []) existingCampaigns.set(c.external_campaign_id as string, Number(c.campaign_id))
  }

  // זיהוי הקמפיין הקיים **לפני** חישוב מה כבר קיים — כי הזיהוי ממפה מחדש
  // את מפתחות השורות, ובלי זה כל שורה הייתה נראית חדשה.
  const resolved = await resolveCampaignIdentities(groups, existingCampaigns, fileHash, autoMatch)

  const existingRecipients = await fetchExistingRecipients(
    Array.from(resolved.values()).map((r) => r.campaignId),
  )

  for (const row of rows) {
    row.alreadyExists = existingRecipients.has(row.sourceUniqueKey)
  }

  const campaigns: CampaignPlan[] = groups.map((group) => buildPlan(
    group,
    resolved.get(group.campaignKey)?.campaignId ?? null,
    existingRecipients,
    resolved.get(group.campaignKey)?.match ?? null,
  ))

  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.deliveryStatus] = (byStatus[r.deliveryStatus] ?? 0) + 1

  const countMatch = (m: MatchResult) => rows.filter((r) => r.matchResult === m).length
  const alreadyExists = rows.filter((r) => r.alreadyExists).length

  return {
    fileName: file.name,
    fileHash,
    validation,
    campaigns,
    rows,
    counts: {
      total: rows.length,
      campaigns: campaigns.length,
      matchedContacts: countMatch('matched_contact'),
      matchedAccounts: countMatch('matched_account'),
      ambiguous: countMatch('ambiguous_match'),
      notFound: countMatch('not_found'),
      invalidPhone: countMatch('invalid_phone'),
      missingPhone: countMatch('missing_phone'),
      alreadyExists,
      statusUpdates: campaigns.reduce((sum, c) => sum + c.statusUpdates, 0),
      // רק שורות עם נייד תקין ניתנות לשמירה (identifier_chk), ורק כאלה
      // שטרם נקלטו. זה המספר שמופיע על כפתור האישור.
      willInsert: rows.filter((r) => r.phoneNorm && !r.alreadyExists).length,
      byStatus,
    },
  }
}

/** חפיפת נמענים מינימלית כדי לזהות ייצוא חוזר של אותו קמפיין */
const SAME_SEND_MIN_OVERLAP = 0.9

/**
 * מזהה איזה קמפיין קיים במערכת הוא **אותו קמפיין** שבקובץ, גם אם שם הקובץ שונה.
 *
 * שלושה מסלולים, לפי סדר ודאות יורד:
 *
 * 1. **אותו מזהה** — אותה תווית "קובץ מקור" או אותו שם קובץ. תמיד ודאי.
 * 2. **אותו קובץ בדיוק** — חתימת SHA-256 זהה. ודאי לחלוטין: אותם בתים.
 *    מוגבל לקובץ שמפיק קמפיין **אחד** — בקובץ מאוחד אין דרך לדעת איזה
 *    מ-12 הקמפיינים מתאים למי, וממילא מסלול 1 כבר תופס אותו.
 * 3. **אותו מועד שליחה + אותם נמענים** — ייצוא חוזר של אותו קמפיין שבו
 *    סטטוסים התקדמו, ולכן החתימה שונה. Fix שולח קמפיין שלם באותה דקה,
 *    ובשילוב עם חפיפת נמענים של 90%+ זה אותו פרסום.
 *
 * כשנמצאת התאמה, הקבוצה **ממופה מחדש** למזהה הקיים (rekeyCampaignGroup) —
 * אחרת מזהה הקמפיין שבתוך source_unique_key היה שונה וכל שורה הייתה נקלטת
 * בשנית. זה הלב של מניעת הכפילות.
 */
async function resolveCampaignIdentities(
  groups: CampaignGroup[],
  existingCampaigns: Map<string, number>,
  fileHash: string,
  autoMatch: boolean,
): Promise<Map<string, { campaignId: number; match: CampaignIdentityMatch }>> {
  const out = new Map<string, { campaignId: number; match: CampaignIdentityMatch }>()

  // ── מסלול 1: אותו מזהה ──
  const unresolved: CampaignGroup[] = []
  for (const group of groups) {
    const id = existingCampaigns.get(group.campaignKey)
    if (id != null) {
      out.set(group.campaignKey, {
        campaignId: id,
        match: { kind: 'external_id', existingCampaignName: group.label, existingSourceFile: null },
      })
    } else {
      unresolved.push(group)
    }
  }
  if (!autoMatch || !unresolved.length) return out

  // ── מסלול 2: אותו קובץ בדיוק (רק כשהקובץ מפיק קמפיין אחד) ──
  if (groups.length === 1 && unresolved.length === 1) {
    const { data } = await supabase
      .from('whatsapp_campaigns')
      .select('campaign_id, campaign_name, source_file_name, external_campaign_id')
      .eq('raw_payload->>file_hash', fileHash)
      .limit(1)
    const hit = (data ?? [])[0]
    if (hit) {
      const group = unresolved[0]
      rekeyCampaignGroup(group, String(hit.external_campaign_id))
      out.set(group.campaignKey, {
        campaignId: Number(hit.campaign_id),
        match: {
          kind: 'file_hash',
          existingCampaignName: hit.campaign_name ?? 'קמפיין ללא שם',
          existingSourceFile: hit.source_file_name ?? null,
        },
      })
      return out
    }
  }

  // ── מסלול 3: אותו מועד שליחה + חפיפת נמענים ──
  const stamps = Array.from(new Set(unresolved.map((g) => g.startedAt).filter(Boolean))) as string[]
  if (!stamps.length) return out

  const { data: candidates } = await supabase
    .from('whatsapp_campaigns')
    .select('campaign_id, campaign_name, source_file_name, started_at, external_campaign_id')
    .in('started_at', stamps)
    .limit(200)

  for (const group of unresolved) {
    if (out.has(group.campaignKey)) continue
    const candidate = (candidates ?? []).find(
      (c) => c.started_at === group.startedAt && c.external_campaign_id !== group.campaignKey,
    )
    if (!candidate) continue

    const overlap = await recipientOverlap(Number(candidate.campaign_id), group)
    if (overlap < SAME_SEND_MIN_OVERLAP) continue

    rekeyCampaignGroup(group, String(candidate.external_campaign_id))
    out.set(group.campaignKey, {
      campaignId: Number(candidate.campaign_id),
      match: {
        kind: 'same_send',
        existingCampaignName: candidate.campaign_name ?? 'קמפיין ללא שם',
        existingSourceFile: candidate.source_file_name ?? null,
        overlapPct: Math.round(overlap * 100),
      },
    })
  }

  return out
}

/** איזה חלק מנמעני הקבוצה כבר קיימים בקמפיין הקיים */
async function recipientOverlap(campaignId: number, group: CampaignGroup): Promise<number> {
  const groupPhones = new Set(group.rows.map((r) => r.phoneNorm).filter(Boolean) as string[])
  if (!groupPhones.size) return 0

  const existing = new Set<string>()
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('phone_norm')
      .eq('campaign_id', campaignId)
      .range(page * 1000, page * 1000 + 999)
    if (error) return 0
    for (const r of data ?? []) if (r.phone_norm) existing.add(String(r.phone_norm))
    if (!data || data.length < 1000) break
  }
  if (!existing.size) return 0

  let hits = 0
  for (const phone of groupPhones) if (existing.has(phone)) hits++
  return hits / groupPhones.size
}

function buildPlan(
  group: CampaignGroup,
  existingCampaignId: number | null,
  existingRecipients: Map<string, ExistingRecipient>,
  identityMatch: CampaignIdentityMatch | null,
): CampaignPlan {
  let statusUpdates = 0
  for (const row of group.rows) {
    const prior = existingRecipients.get(row.sourceUniqueKey)
    if (prior && pickHigherStatus(prior.delivery_status, row.deliveryStatus) !== prior.delivery_status) {
      statusUpdates++
    }
  }
  // שורה בלי נייד תקין אינה ניתנת לשמירה (identifier_chk) — היא לא נספרת
  // כ"תיקלט" ולא כ"כבר קיימת", אלא בעמודה נפרדת.
  const storable = group.rows.filter((r) => r.phoneNorm)
  const existingRows = storable.filter((r) => r.alreadyExists).length

  return {
    campaignKey: group.campaignKey,
    label: group.label,
    existingCampaignId,
    startedAt: group.startedAt,
    completedAt: group.completedAt,
    processName: group.processName,
    rowCount: group.rows.length,
    newRows: storable.length - existingRows,
    existingRows,
    noPhone: group.rows.length - storable.length,
    statusUpdates,
    matched: group.rows.filter(
      (r) => r.matchResult === 'matched_contact' || r.matchResult === 'matched_account',
    ).length,
    notFound: group.rows.filter((r) => r.matchResult === 'not_found').length,
    identityMatch,
  }
}

/**
 * משייך כל שורה לאיש קשר או לארגון לפי phone_norm.
 *
 * כללים:
 * - אין יצירת רשומה חדשה. נייד שלא נמצא נשאר ללא שיוך ונספר כ"לא נמצא".
 * - נייד שיושב גם באיש קשר וגם בארגון, או בשתי רשומות מאותו סוג, מסומן
 *   כהתנגשות. המערכת לא בוחרת — האילוץ בטבלה גם ממילא אוסר שיוך כפול.
 */
async function matchRowsToRecords(rows: ParsedCampaignRow[]): Promise<void> {
  const phones = Array.from(new Set(rows.map((r) => r.phoneNorm).filter(Boolean))) as string[]
  if (!phones.length) return

  const contactByPhone = new Map<string, number>()
  const accountByPhone = new Map<string, number>()
  const duplicatePhones = new Set<string>()

  for (let i = 0; i < phones.length; i += IN_CHUNK) {
    const chunk = phones.slice(i, i + IN_CHUNK)
    const [contacts, accounts] = await Promise.all([
      supabase.from('contact').select('contact_id, phone_norm').in('phone_norm', chunk),
      supabase.from('accounts').select('account_id, phone_norm').in('phone_norm', chunk),
    ])
    if (contacts.error) throw contacts.error
    if (accounts.error) throw accounts.error

    // כלל הפרויקט: נייד = רשומת אב אחת. שתי רשומות לאותו נייד הן שגיאת
    // נתונים שמוצגת למשתמשת, ולא משהו שנכריע עליו בשקט.
    for (const c of contacts.data ?? []) {
      if (!c.phone_norm) continue
      if (contactByPhone.has(c.phone_norm)) duplicatePhones.add(c.phone_norm)
      else contactByPhone.set(c.phone_norm, Number(c.contact_id))
    }
    for (const a of accounts.data ?? []) {
      if (!a.phone_norm) continue
      if (accountByPhone.has(a.phone_norm)) duplicatePhones.add(a.phone_norm)
      else accountByPhone.set(a.phone_norm, Number(a.account_id))
    }
  }

  for (const row of rows) {
    if (!row.phoneNorm) continue
    const contactId = contactByPhone.get(row.phoneNorm)
    const accountId = accountByPhone.get(row.phoneNorm)

    if (duplicatePhones.has(row.phoneNorm) || (contactId != null && accountId != null)) {
      row.matchResult = 'ambiguous_match'
      row.contactId = null
      row.accountId = null
      continue
    }
    if (contactId != null) {
      row.contactId = contactId
      row.matchResult = 'matched_contact'
    } else if (accountId != null) {
      row.accountId = accountId
      row.matchResult = 'matched_account'
    }
  }
}

export function useCampaignPreview() {
  return useMutation({
    mutationFn: ({ file, autoMatch }: { file: File; autoMatch: boolean }) =>
      buildCampaignPreview(file, autoMatch),
  })
}

// ─────────────────────── קליטת דוח קמפיין: Commit ───────────────────────

export interface CommitResult {
  campaignsCreated: number
  campaignsUpdated: number
  inserted: number
  skippedExisting: number
  /** שורות שלא נשמרו כי אין בהן נייד תקין — אין להן מזהה שהטבלה מקבלת */
  skippedNoPhone: number
  statusUpdated: number
  contactsUpdated: number
  accountsUpdated: number
  /** שגיאות ברמת מנה — כישלון במנה אחת אינו מבטל את השאר */
  errors: string[]
}

export function useCommitCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { preview: CampaignPreview }) => commitCampaignPreview(args.preview),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FIX_PUBLICATIONS_KEYS.all })
      qc.invalidateQueries({ queryKey: ['contacts-v2'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contact360'] })
      qc.invalidateQueries({ queryKey: ['employer360'] })
    },
  })
}

async function commitCampaignPreview(preview: CampaignPreview): Promise<CommitResult> {
  const result: CommitResult = {
    campaignsCreated: 0, campaignsUpdated: 0, inserted: 0, skippedExisting: 0,
    skippedNoPhone: 0, statusUpdated: 0, contactsUpdated: 0, accountsUpdated: 0, errors: [],
  }

  const groups = groupIntoCampaigns(preview.rows)
  const planByKey = new Map(preview.campaigns.map((c) => [c.campaignKey, c]))
  /** כל השורות שנשמרו או שכבר קיימות — הבסיס לעדכון שדות הסיכום */
  const committedRows: ParsedCampaignRow[] = []

  for (const group of groups) {
    const plan = planByKey.get(group.campaignKey)
    let campaignId = plan?.existingCampaignId ?? null

    if (campaignId == null) {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .insert({
          external_campaign_id: group.campaignKey,
          campaign_name: suggestCampaignName(group.label, group.startedAt),
          process_name: group.processName,
          source_type: 'fix_digital',
          source_file_name: preview.fileName,
          started_at: group.startedAt,
          completed_at: group.completedAt,
          raw_payload: {
            imported_from: preview.fileName,
            // נשמר כדי לזהות בעתיד אותו קובץ בדיוק שהועלה בשם אחר
            file_hash: preview.fileHash,
            source_label: group.label,
            imported_at: new Date().toISOString(),
          },
        })
        .select('campaign_id').single()

      if (error) {
        result.errors.push(`הקמפיין "${group.label}" לא נוצר: ${error.message}`)
        continue
      }
      campaignId = Number(data.campaign_id)
      result.campaignsCreated++
    } else {
      result.campaignsUpdated++
    }

    // ─── שורות חדשות בלבד. אירוע קיים לעולם אינו נמחק ואינו מוחלף. ───
    //
    // שורה בלי נייד תקין אינה ניתנת לשמירה כלל: האילוץ החי
    // whatsapp_campaign_recipients_identifier_chk דורש לפחות אחד מתוך
    // fix_contact_link_id / fixdigital_id / phone_norm, ודוח תוצאות הקמפיין
    // אינו מספק את שני הראשונים. שורה כזו הייתה מפילה את כל מנת ה-INSERT.
    const storable = group.rows.filter((r) => r.phoneNorm)
    const newRows = storable.filter((r) => !r.alreadyExists)
    result.skippedNoPhone += group.rows.length - storable.length
    result.skippedExisting += storable.length - newRows.length

    const payload = newRows.map((row) => ({
      campaign_id: campaignId,
      contact_id: row.contactId,
      account_id: row.accountId,
      phone_norm: row.phoneNorm,
      delivery_status: row.deliveryStatus,
      delivery_status_raw: row.deliveryStatusRaw,
      failure_category: row.failureCategory,
      failure_message: row.failureMessage,
      sent_at: row.sentAt,
      // delivered_at / read_at נשארים ריקים: דוח Fix מוסר רק מועד שליחה.
      // אין להמציא מועד מסירה או קריאה מתוך סטטוס.
      source_unique_key: row.sourceUniqueKey,
      raw_payload: buildRawPayload(row),
    }))

    for (let i = 0; i < payload.length; i += INSERT_CHUNK) {
      const chunk = payload.slice(i, i + INSERT_CHUNK)
      const { error } = await supabase.from('whatsapp_campaign_recipients').insert(chunk)
      if (error) {
        result.errors.push(
          `${group.label}: מנה של ${chunk.length} שורות נכשלה (${error.message})`,
        )
        continue
      }
      result.inserted += chunk.length
      committedRows.push(...newRows.slice(i, i + chunk.length))
    }

    // ─── שורות קיימות: רק התקדמות סטטוס, לעולם לא נסיגה ולא מחיקה ───
    // בקמפיין חדש אין מה לעדכן — כל השורות בו הוכנסו זה עתה.
    if (plan?.existingCampaignId != null) {
      result.statusUpdated += await advanceExistingStatuses(group, campaignId, result.errors)
    }
    committedRows.push(...storable.filter((r) => r.alreadyExists))
  }

  // ─── שדות הסיכום בטבלאות הליבה ───
  result.contactsUpdated = await syncSummary(
    committedRows, 'contact', 'contact_id', 'whatsapp_campaign_last_sent',
    (r) => r.contactId, result.errors,
  )
  result.accountsUpdated = await syncSummary(
    committedRows, 'accounts', 'account_id', 'whatsapp_last_sent',
    (r) => r.accountId, result.errors,
  )

  await refreshCampaignCounts(preview.campaigns.map((c) => c.campaignKey), result.errors)

  return result
}

/**
 * raw_payload = שורת המקור המלאה כפי שהתקבלה, בתוספת בלוק `_alldent`
 * עם אותם ערכים בשמות אחידים. שורת המקור לא משתנה — הבלוק רק מתווסף.
 */
function buildRawPayload(row: ParsedCampaignRow): Record<string, unknown> {
  const audit: RecipientAudit = {
    full_name: row.fullNameRaw,
    email: row.emailRaw,
    phone_raw: row.phoneRaw,
    fix_status: row.fixStatusRaw,
    fix_process: row.fixProcessRaw,
    source_file: row.sourceFile,
    source_row: row.sourceRow,
    record_number: row.recordNumber,
    match: row.matchResult,
    imported_at: new Date().toISOString(),
  }
  return { ...row.rawPayload, _alldent: audit }
}

/**
 * ייצוא מחדש של אותו קמפיין עם סטטוסים שהתקדמו (נשלח ← נמסר ← נקרא).
 * מעדכן רק שורות שבהן הסטטוס באמת עלה בדרגה. אין מחיקה, אין נסיגה,
 * ואין שורה חדשה — זה אותו אירוע עם מידע מעודכן.
 */
async function advanceExistingStatuses(
  group: CampaignGroup,
  campaignId: number,
  errors: string[],
): Promise<number> {
  const existing = await fetchExistingRecipients([campaignId])
  if (!existing.size) return 0

  /** קיבוץ לפי הסטטוס החדש — עדכון אחד לכל סטטוס במקום אחד לכל שורה */
  const byStatus = new Map<DeliveryStatusCode, { ids: number[]; raw: string | null }>()
  for (const row of group.rows) {
    const prior = existing.get(row.sourceUniqueKey)
    if (!prior) continue
    if (pickHigherStatus(prior.delivery_status, row.deliveryStatus) === prior.delivery_status) continue
    const bucket = byStatus.get(row.deliveryStatus) ?? { ids: [], raw: row.deliveryStatusRaw }
    bucket.ids.push(prior.recipient_id)
    byStatus.set(row.deliveryStatus, bucket)
  }

  let updated = 0
  for (const [status, bucket] of byStatus) {
    for (let i = 0; i < bucket.ids.length; i += IN_CHUNK) {
      const ids = bucket.ids.slice(i, i + IN_CHUNK)
      const { error } = await supabase
        .from('whatsapp_campaign_recipients')
        .update({
          delivery_status: status,
          delivery_status_raw: bucket.raw,
          updated_at: new Date().toISOString(),
        })
        .in('recipient_id', ids)
      if (error) { errors.push(`עדכון סטטוסים ב-"${group.label}" נכשל: ${error.message}`); continue }
      updated += ids.length
    }
  }
  return updated
}

/**
 * שדות הסיכום בטבלאות הליבה — אותה פעולה בדיוק לאיש קשר ולארגון:
 * מועד הפרסום האחרון וסטטוס המסירה האחרון מתעדכנים יחד, ורק אם השליחה
 * מאוחרת מהערך שכבר קיים.
 *
 * זה מה שמונע מדוח היסטורי שנקלט מאוחר לדרוס את מצב הפרסום העדכני:
 * קליטה של דוח מ-01/05 אחרי דוח מ-26/08 לא תזיז את "הפרסום האחרון".
 *
 * מקור האמת להיסטוריה נשאר whatsapp_campaign_recipients. אלה שדות Cache.
 */
async function syncSummary(
  rows: ParsedCampaignRow[],
  table: 'contact' | 'accounts',
  idColumn: 'contact_id' | 'account_id',
  dateColumn: 'whatsapp_campaign_last_sent' | 'whatsapp_last_sent',
  pickId: (r: ParsedCampaignRow) => number | null,
  errors: string[],
): Promise<number> {
  const matched = rows.filter((r) => pickId(r) != null && r.sentAt)
  if (!matched.length) return 0

  const ids = Array.from(new Set(matched.map((r) => pickId(r) as number)))
  const current = new Map<number, string | null>()
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from(table).select(`${idColumn}, ${dateColumn}`).in(idColumn, ids.slice(i, i + IN_CHUNK))
    if (error) { errors.push(`קריאת ${table} לעדכון סיכום נכשלה: ${error.message}`); return 0 }
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      current.set(Number(row[idColumn]), (row[dateColumn] as string | null) ?? null)
    }
  }

  // הערך הסופי לכל רשומה: השליחה המאוחרת ביותר בקובץ שגם מאוחרת מהקיים.
  const staged = new Map<number, { stamp: string; status: DeliveryStatusCode }>()
  for (const r of matched) {
    const id = pickId(r) as number
    const stamp = r.sentAt as string
    const prev = staged.get(id)
    if (!prev) { staged.set(id, { stamp, status: r.deliveryStatus }); continue }
    if (new Date(stamp) > new Date(prev.stamp)) staged.set(id, { stamp, status: r.deliveryStatus })
    else if (new Date(stamp).getTime() === new Date(prev.stamp).getTime()) {
      // אותה שליחה מופיעה יותר מפעם אחת — נשמר הסטטוס המתקדם יותר
      staged.set(id, { stamp, status: pickHigherStatus(prev.status, r.deliveryStatus) })
    }
  }

  /** רק מי שהערך שלו באמת מתקדם. קיבוץ לפי (מועד, סטטוס) → עדכון אחד לקבוצה. */
  const buckets = new Map<string, { stamp: string; status: DeliveryStatusCode; ids: number[] }>()
  for (const [id, next] of staged) {
    const prev = current.get(id) ?? null
    if (prev && new Date(next.stamp) <= new Date(prev)) continue
    const key = `${next.stamp}|${next.status}`
    const bucket = buckets.get(key) ?? { stamp: next.stamp, status: next.status, ids: [] }
    bucket.ids.push(id)
    buckets.set(key, bucket)
  }

  let updated = 0
  for (const bucket of buckets.values()) {
    for (let i = 0; i < bucket.ids.length; i += IN_CHUNK) {
      const chunk = bucket.ids.slice(i, i + IN_CHUNK)
      const { error } = await supabase
        .from(table)
        .update({ [dateColumn]: bucket.stamp, whatsapp_last_delivery_status: bucket.status })
        .in(idColumn, chunk)
      if (error) { errors.push(`עדכון ${table} נכשל: ${error.message}`); continue }
      updated += chunk.length
    }
  }
  return updated
}

/**
 * מרענן את מוני הסטטוס ברמת הקמפיין מתוך הנמענים שנשמרו בפועל,
 * כדי שהמונים לא יסתמכו על מה שהיה בקובץ אלא על מה שיש בטבלה.
 */
async function refreshCampaignCounts(campaignKeys: string[], errors: string[]): Promise<void> {
  if (!campaignKeys.length) return

  const { data: campaigns, error } = await supabase
    .from('whatsapp_campaigns')
    .select('campaign_id, external_campaign_id')
    .in('external_campaign_id', campaignKeys.slice(0, IN_CHUNK))
  if (error) { errors.push(`רענון מוני הקמפיין נכשל: ${error.message}`); return }

  for (const campaign of campaigns ?? []) {
    const campaignId = Number(campaign.campaign_id)
    const base = () => supabase
      .from('whatsapp_campaign_recipients')
      .select('recipient_id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    // חמש ספירות לקמפיין. "נכשל" נספר כקבוצה — כל הקודים מתחילים ב-failed_.
    const [totalRes, submittedRes, deliveredRes, readRes, failedRes] = await Promise.all([
      base(),
      base().eq('delivery_status', 'submitted'),
      base().eq('delivery_status', 'delivered'),
      base().eq('delivery_status', 'read'),
      base().like('delivery_status', 'failed_%'),
    ])
    const failure = [totalRes, submittedRes, deliveredRes, readRes, failedRes].find((r) => r.error)
    if (failure?.error) { errors.push(`ספירת סטטוסים נכשלה: ${failure.error.message}`); return }

    const { error: uErr } = await supabase
      .from('whatsapp_campaigns')
      .update({
        total_recipients: totalRes.count ?? 0,
        submitted_count: submittedRes.count ?? 0,
        delivered_count: deliveredRes.count ?? 0,
        read_count: readRes.count ?? 0,
        failed_count: failedRes.count ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
    if (uErr) errors.push(`עדכון מוני הקמפיין נכשל: ${uErr.message}`)
  }
}
