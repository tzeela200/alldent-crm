/**
 * "סווג מחדש" — מריץ את הכללים העדכניים (rules_version נוכחי) על שורות
 * employment_intake קיימות, בדיוק כאילו הן נטענות היום מחדש. תצוגה
 * מקדימה חייבת להיבנות ולהיבחן לפני כל כתיבה (§4.5 SSOT, אותו דפוס כמו
 * useEmploymentIntakeBulk.ts). כתיבה ל-employment_intake בלבד — staging
 * של המודול, לא ליבה; אין כאן שום כתיבה ל-contact/accounts.
 *
 * לוגיקת ה"מה מותר לכתוב" (זכאות, שמירה על שדה שנערך ידנית, קיבוץ
 * לתצוגה) גרה ב-src/lib/employment-intake/reclassifyDiff.ts (טהורה,
 * נבדקת ב-scripts/employment-intake-acceptance.ts). הקובץ הזה רק מדבר
 * עם Supabase: שולף שורות, בונה יחידות הקשר מהמצב השמור, מריץ
 * computeUnitAnalyses (אותה לוגיקה בדיוק כמו קליטה חדשה), וכותב.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  computeUnitAnalyses,
  RULES_VERSION,
  ENGINE_VERSION,
  type UnitAnalysisInput,
  type UnitAnalysisResult,
} from '@/hooks/useEmploymentIntakePipeline'
import {
  isEligibleForReclassify,
  buildRowPatch,
  classifyRowDiff,
  type ReclassifyBucket,
  type ReclassifyDiffState,
} from '@/lib/employment-intake/reclassifyDiff'
import type { CityIndexEntry } from '@/lib/employment-intake/normalize'
import type { EmploymentIntakeRow } from '@/types/employment-intake'
import { supabaseError, describeError } from '@/lib/employment-intake/errors'

export type ReclassifyScope = { mode: 'selected'; ids: number[] } | { mode: 'all_eligible' }

/** מס' יחידות (לא שורות) שמעובדות במקביל בכל סבב RPC — לא כל האצווה
 * בבת אחת, כדי לא להציף את Supabase בקריאות מקבילות על ~2,000 רשומות. */
const ANALYSIS_CHUNK_SIZE = 300
/** מס' בקשות UPDATE מקבילות בכל סבב כתיבה — לא upsert מוקבץ (ראו useRunReclassify). */
const UPDATE_CONCURRENCY = 20
const FETCH_PAGE = 1000

export interface ReclassifyRowPlan {
  rowId: number
  originalText: string
  sourceName: string | null
  bucket: ReclassifyBucket
  patch: Record<string, unknown>
  before: Record<string, unknown>
  after: Record<string, unknown>
  touchedFields: string[]
  skippedFields: string[]
}

export interface ReclassifyPreview {
  scanned: number
  eligible: number
  buckets: Record<ReclassifyBucket, number>
  /** רק שורות שבפועל ישתנו (bucket !== 'no_change') — אלה שמוצגות לבחירה בתצוגה המקדימה. */
  plans: ReclassifyRowPlan[]
}

type RawRow = EmploymentIntakeRow

function rowKey(importId: string, seq: number): string {
  return `${importId}:${seq}`
}

/** בונה יחידות הקשר מתוך שורות שכבר נשמרו: primary = parent_seq null,
 * חברות = parent_seq שמצביע על primary.source_seq. תואם בדיוק את מבנה
 * connectContext/buildDraftRows בשלב הקליטה — לא מנגנון מקביל. */
function groupIntoUnits(rows: RawRow[]): Map<string, RawRow[]> {
  const byKey = new Map<string, RawRow>()
  for (const r of rows) {
    if (r.source_seq != null) byKey.set(rowKey(r.import_id, r.source_seq), r)
  }
  const units = new Map<string, RawRow[]>()
  for (const r of rows) {
    const primaryKey = r.parent_seq == null
      ? (r.source_seq != null ? rowKey(r.import_id, r.source_seq) : `row:${r.id}`)
      : rowKey(r.import_id, r.parent_seq)
    const list = units.get(primaryKey) ?? []
    list.push(r)
    units.set(primaryKey, list)
  }
  return units
}

function unitInputFromRows(unitKey: string, members: RawRow[]): UnitAnalysisInput {
  const primary = members.find((m) => m.parent_seq == null) ?? members[0]
  const combinedText = primary.context_text ?? primary.original_text
  return {
    key: unitKey,
    combinedText,
    primaryText: primary.original_text,
    primarySenderName: primary.sender_name,
    primarySenderPhone: primary.sender_phone,
  }
}

/** ממפה תוצאת ניתוח יחידה לערכי השדות הטריים, באותם שמות עמודה בדיוק
 * כמו buildInsertRow בקליטה חדשה (§ אותה לוגיקה, לא כפולה). */
function analysisToFieldValues(a: UnitAnalysisResult): Record<string, unknown> {
  return {
    content_type: a.classification.contentType,
    is_active_request: a.classification.isActiveRequest,
    classify_reason: a.classification.classifyReason,
    evidence: a.classification.evidence,
    confidence_level: a.classification.confidenceLevel,
    needs_context: a.classification.needsContext,

    role_raw: a.roleResult?.matchedAlias ?? null,
    role_id: a.roleResult?.roleId ?? null,
    city_raw: a.cityCandidate,
    city_id: a.cityResult?.cityId ?? null,
    region_id: a.cityResult?.regionId ?? null,

    contact_name: a.contactName,
    phone: a.phones.phone,
    phone_norm: a.phones.phoneNorm,
    second_phone: a.phones.secondPhone,
    second_phone_norm: a.phones.secondPhoneNorm,
    email: a.emails[0] ?? null,
    email_norm: a.emails[0]?.toLowerCase() ?? null,
    second_email: a.emails[1] ?? null,
    second_email_norm: a.emails[1]?.toLowerCase() ?? null,
    facebook_id: a.facebookId,
    facebook_url: a.facebookUrls[0] ?? null,
    facebook_url_norm: a.facebookUrls[0]?.toLowerCase() ?? null,
    unassigned_phones: a.phones.unassignedPhones,

    match_contact: a.match.matchContact,
    match_account: a.match.matchAccount,
    match_field: a.match.matchField,
    match_type: a.match.matchType,
    match_candidates: a.match.matchCandidates,

    proposed_social_status: a.proposal.proposedSocialStatus,
    proposed_action: a.proposal.proposedAction,

    tags: a.extraTags,
  }
}

function diffState(fields: Record<string, unknown>): ReclassifyDiffState {
  return {
    match_contact: (fields.match_contact as number | null) ?? null,
    match_account: (fields.match_account as number | null) ?? null,
    content_type: fields.content_type as string,
    proposed_social_status: (fields.proposed_social_status as number | null) ?? null,
    proposed_action: (fields.proposed_action as string | null) ?? null,
    tags: Array.isArray(fields.tags) ? (fields.tags as string[]) : [],
  }
}

async function fetchRowsByIds(ids: number[]): Promise<RawRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('employment_intake').select('*').in('id', ids).is('deleted_at', null)
  if (error) throw supabaseError('טעינת השורות שנבחרו נכשלה', error)
  return (data ?? []) as unknown as RawRow[]
}

async function fetchEligibleRows(): Promise<RawRow[]> {
  const all: RawRow[] = []
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabase
      .from('employment_intake')
      .select('*')
      .is('deleted_at', null)
      .is('last_action_id', null)
      // neq לבדו מחריג בטעות rules_version=NULL (NULL != 'v2' מוערך כ-NULL
      // ב-Postgres, לא true) — שורה כזו כן זכאית לפי isEligibleForReclassify.
      .or(`rules_version.is.null,rules_version.neq.${RULES_VERSION}`)
      .range(from, from + FETCH_PAGE - 1)
    if (error) throw supabaseError('טעינת רשומות זכאיות נכשלה', error)
    const batch = (data ?? []) as unknown as RawRow[]
    all.push(...batch)
    if (batch.length < FETCH_PAGE) break
  }
  return all
}

async function fetchTotalCount(): Promise<number> {
  const { count, error } = await supabase.from('employment_intake').select('*', { count: 'exact', head: true }).is('deleted_at', null)
  if (error) throw supabaseError('ספירת רשומות נכשלה', error)
  return count ?? 0
}

/** שולף את כל השורות (כולל בת/הורה) של import_ids נתונים — כדי שיחידת
 * הקשר תיבנה שלמה, גם כשרק חלק ממנה נבחר/זכאי. */
async function fetchRowsForImportIds(importIds: string[]): Promise<RawRow[]> {
  if (importIds.length === 0) return []
  const all: RawRow[] = []
  for (const importId of importIds) {
    for (let from = 0; ; from += FETCH_PAGE) {
      const { data, error } = await supabase
        .from('employment_intake')
        .select('*')
        .eq('import_id', importId)
        .is('deleted_at', null)
        .range(from, from + FETCH_PAGE - 1)
      if (error) throw supabaseError('טעינת יחידות הקשר נכשלה', error)
      const batch = (data ?? []) as unknown as RawRow[]
      all.push(...batch)
      if (batch.length < FETCH_PAGE) break
    }
  }
  return all
}

/** ספירה קלה בלבד — לכרזה "יש X רשומות בגרסה ישנה" מעל הטבלה, בלי לחשב Preview מלא. */
export function useReclassifyEligibleCount() {
  return useQuery({
    queryKey: ['employment-intake-reclassify-eligible-count'],
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('employment_intake')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .is('last_action_id', null)
        .or(`rules_version.is.null,rules_version.neq.${RULES_VERSION}`)
      if (error) throw supabaseError('ספירת רשומות זכאיות לסיווג מחדש נכשלה', error)
      return count ?? 0
    },
  })
}

/**
 * בונה את תוכנית הביצוע. אינו כותב דבר — זהו בדיוק מה שמוצג בתצוגה
 * המקדימה, וגם בדיוק מה שירוץ באישור.
 */
export async function buildReclassifyPreview(scope: ReclassifyScope, cityIndex: CityIndexEntry[]): Promise<ReclassifyPreview> {
  const candidates = scope.mode === 'selected' ? await fetchRowsByIds(scope.ids) : await fetchEligibleRows()
  const scanned = scope.mode === 'selected' ? scope.ids.length : await fetchTotalCount()

  const eligibleCandidates = candidates.filter((r) => isEligibleForReclassify(r, RULES_VERSION))

  // הרחבה ליחידות שלמות (§3 בתוכנית): אם נבחרה/זכאית שורה אחת ביחידה,
  // כל היחידה נבנית ומחושבת יחד — עקביות הסיווג היא ברמת יחידה, לא שורה.
  const importIds = Array.from(new Set(eligibleCandidates.map((r) => r.import_id)))
  const allRowsInScope = await fetchRowsForImportIds(importIds)
  const unitsByKey = groupIntoUnits(allRowsInScope)

  const candidateIds = new Set(eligibleCandidates.map((r) => r.id))
  const touchedUnitKeys = Array.from(unitsByKey.entries())
    .filter(([, members]) => members.some((m) => candidateIds.has(m.id)))
    .map(([key]) => key)

  const buckets: Record<ReclassifyBucket, number> = {
    now_matched: 0,
    now_hidden_system_noise: 0,
    group_join_status_fixed: 0,
    category_changed: 0,
    field_updated: 0,
    no_change: 0,
  }
  const plans: ReclassifyRowPlan[] = []

  for (let from = 0; from < touchedUnitKeys.length; from += ANALYSIS_CHUNK_SIZE) {
    const chunkKeys = touchedUnitKeys.slice(from, from + ANALYSIS_CHUNK_SIZE)
    const unitInputs = chunkKeys.map((key) => unitInputFromRows(key, unitsByKey.get(key)!))
    const { perUnit } = await computeUnitAnalyses(unitInputs, cityIndex)

    for (const key of chunkKeys) {
      const analysis = perUnit.get(key)
      if (!analysis) continue
      const freshValues = analysisToFieldValues(analysis)

      for (const row of unitsByKey.get(key)!) {
        // כל חברה זכאית ביחידה שנגעה בה, לא רק זו שנבחרה במקור — עקביות
        // הסיווג היא ברמת יחידה (§3 בתוכנית).
        if (!isEligibleForReclassify(row, RULES_VERSION)) continue

        const { patch, touchedFields, skippedFields } = buildRowPatch(row as unknown as Record<string, unknown>, freshValues)
        const before = diffState(row as unknown as Record<string, unknown>)
        const after = diffState(patch)
        const bucket = classifyRowDiff(before, after, touchedFields)
        buckets[bucket]++

        if (bucket !== 'no_change') {
          plans.push({
            rowId: row.id,
            originalText: row.original_text,
            sourceName: row.source_name,
            bucket,
            patch,
            before: before as unknown as Record<string, unknown>,
            after: after as unknown as Record<string, unknown>,
            touchedFields,
            skippedFields,
          })
        }
      }
    }
  }

  return { scanned, eligible: eligibleCandidates.length, buckets, plans }
}

export interface ReclassifyRunReport {
  updated: number
}

/**
 * כותב את ה-patches שנבחרו (checkbox-per-row בתצוגה המקדימה — לא הכול-
 * או-כלום). אחרי הכתיבה: התכנסות זהות אחת לכל import_id שנגע בו שינוי
 * בפועל, ברצף (לא Promise.all) — resolve_employment_identity סורק את כל
 * ה-import ההיסטורי ולא כדאי כמה קריאות כאלה יחד מול production.
 */
export function useRunReclassify() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ plans, includedIds }: { plans: ReclassifyRowPlan[]; includedIds: Set<number> }): Promise<ReclassifyRunReport> => {
      const toWrite = plans.filter((p) => includedIds.has(p.rowId))
      if (toWrite.length === 0) return { updated: 0 }

      let updated = 0
      const now = new Date().toISOString()

      // לא upsert: id ב-employment_intake הוא GENERATED ALWAYS AS IDENTITY,
      // ו-upsert() מייצר אצל PostgREST תמיד INSERT ... ON CONFLICT DO UPDATE
      // עם ה-id בתוך ה-INSERT המוצע — Postgres דוחה את זה על הסף (קוד 428C9,
      // "cannot insert a non-DEFAULT value into column id") גם כשכל השורות
      // כבר קיימות ובפועל היה קורה רק UPDATE. אומת ישירות מול Supabase
      // (INSERT...ON CONFLICT זהה על שורה קיימת החזיר בדיוק את השגיאה הזו).
      // אין דרך ב-PostgREST לעקוף את זה (אין OVERRIDING SYSTEM VALUE ב-REST),
      // ולכן זו חייבת להיות UPDATE אמיתי, לא upsert — מוגבל למספר קריאות
      // מקבילות בכל סבב כדי לא להציף את Supabase, לא ~2,000 ברצף אחד-אחד.
      for (let from = 0; from < toWrite.length; from += UPDATE_CONCURRENCY) {
        const chunk = toWrite.slice(from, from + UPDATE_CONCURRENCY)
        const results = await Promise.all(
          chunk.map((plan) =>
            supabase
              .from('employment_intake')
              .update({ ...plan.patch, engine_version: ENGINE_VERSION, rules_version: RULES_VERSION, updated_at: now })
              .eq('id', plan.rowId),
          ),
        )
        const failed = results.find((r) => r.error)
        if (failed?.error) throw supabaseError('עדכון סיווג מחדש נכשל', failed.error)
        updated += chunk.length
      }

      const touchedImportIds = new Set<string>()

      // אילו import_ids נגעו בהם שינויים בפועל — כדי להריץ התכנסות זהות רק עליהם
      const { data: touchedRows, error: fetchErr } = await supabase
        .from('employment_intake')
        .select('id, import_id')
        .in('id', toWrite.map((p) => p.rowId))
      if (fetchErr) throw supabaseError('טעינת import_id לאחר עדכון נכשלה', fetchErr)
      for (const r of touchedRows ?? []) touchedImportIds.add((r as { import_id: string }).import_id)

      for (const importId of touchedImportIds) {
        const { error } = await supabase.rpc('resolve_employment_identity', { p_import_id: importId })
        if (error) throw supabaseError('התכנסות זהות לאחר סיווג מחדש נכשלה', error)
      }

      return { updated }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employment-intake-rows'] })
      qc.invalidateQueries({ queryKey: ['employment-intake-summary'] })
    },
    onError: (err: unknown) => toast.error(describeError(err, 'סיווג מחדש נכשל')),
  })
}
