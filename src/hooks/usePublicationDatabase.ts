/**
 * שכבת הנתונים של מסך "מאגר לפי פרסום".
 *
 * ההבדל ממסך פרסומי WhatsApp: שם שורה = שליחה, כאן שורה = **אדם**.
 * הבסיס הוא `contact` ולא `whatsapp_campaign_recipients`, ולכן מופיעים גם
 * מי שמעולם לא נכלל בקמפיין — בדיוק מי שהמשתמשת מחפשת.
 *
 * כל הסינון, המיון והעימוד בשרת, על שדות הסיכום שכבר יושבים על `contact`:
 *   whatsapp_campaign_last_sent   — מועד הפרסום האחרון
 *   whatsapp_last_delivery_status — סטטוס המסירה האחרון
 *
 * ספירות הקמפיינים לכל אדם נשלפות **לעמוד המוצג בלבד** — אותו דפוס שבו
 * AdminContactsPage שולף תגיות לפי pageContactIds.
 *
 * אפס שינוי סכמה: אין טבלה חדשה, אין View ואין RPC.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { phoneSearchTerm } from '@/lib/normalizePhone'
import {
  OUTCOME_STATUS_CODES, outcomeOfRecord,
  type DeliveryOutcome,
} from '@/lib/fixPublications/deliveryOutcome'

export const PUBLICATION_DB_KEYS = {
  all: ['publication-database'] as const,
  rows: ['publication-database', 'rows'] as const,
  stats: ['publication-database', 'stats'] as const,
  optOut: ['publication-database', 'opt-out-ids'] as const,
}

/**
 * סוג יישוב — שדה טקסט על `contact`, נגזר מהעיר ע"י
 * `trg_contact_fill_region_locality_from_city`. שני ערכים בלבד במסד
 * (אומת 01/09/2026: 29,279 יהודי · 2,031 ערבי · 382 ריק).
 * ה-382 הריקים הם רשומות בלי עיר — ולכן יש להם אפשרות סינון משלהם,
 * אחרת הם היו נעלמים בשקט בכל סינון לפי סוג יישוב.
 */
export const LOCALITY_TYPES = ['יישוב יהודי', 'יישוב ערבי'] as const
export const LOCALITY_UNCLASSIFIED = '__unclassified__'

export const LOCALITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  ...LOCALITY_TYPES.map((v) => ({ value: v, label: v })),
  { value: LOCALITY_UNCLASSIFIED, label: 'ללא סיווג (אין עיר)' },
]

export const PAGE_SIZE = 25
/** כמה מזהים נכנסים ל-in(...) אחד לפני שה-URL של PostgREST נחתך */
const IN_CHUNK = 250

export interface PublicationDbFilters {
  search: string
  roleIds: number[]
  regionIds: number[]
  cityIds: number[]
  outcomes: DeliveryOutcome[]
  /** ערך מ-LOCALITY_TYPES, או LOCALITY_UNCLASSIFIED, או '' לכולם */
  localityType: string
  sentFrom: string
  sentTo: string
}

export const EMPTY_DB_FILTERS: PublicationDbFilters = {
  search: '', roleIds: [], regionIds: [], cityIds: [], outcomes: [],
  localityType: '', sentFrom: '', sentTo: '',
}

export function hasActiveDbFilters(f: PublicationDbFilters): boolean {
  return !!f.search || !!f.sentFrom || !!f.sentTo || !!f.localityType ||
    f.roleIds.length > 0 || f.regionIds.length > 0 || f.cityIds.length > 0 || f.outcomes.length > 0
}

export interface PublicationDbRow {
  contact_id: number
  full_name: string | null
  display_name: string | null
  phone: string | null
  phone_norm: string | null
  role: number | null
  region_id: number | null
  city_id: number | null
  social_status: number | null
  locality_type: string | null
  whatsapp_campaign_last_sent: string | null
  whatsapp_last_delivery_status: string | null
  /** נגזר — לא עמודה במסד */
  outcome: DeliveryOutcome
  /** העשרה לעמוד המוצג בלבד */
  campaignCount: number
  readCount: number
  lastCampaignName: string | null
  /** קיים רישום ידני (פרסום אישי) לאדם הזה — קובע אם מוצג כפתור המחיקה בתא */
  hasManualRecord: boolean
}

const ROW_COLUMNS =
  'contact_id, full_name, display_name, phone, phone_norm, role, region_id, city_id, ' +
  'social_status, locality_type, whatsapp_campaign_last_sent, whatsapp_last_delivery_status'

/**
 * מיון בשרת לכל עמודה שיש לה מקור אמיתי במסד.
 *
 * עמודות מילוניות (תפקיד/אזור/עיר/סטטוס פנייה) ממוינות לפי **השם בעברית**
 * ולא לפי המזהה, דרך embed על ה-FK. אומת מול PostgREST החי.
 *
 * ⚠️ העמודות "קמפיינים", "נקראו" ו"קמפיין אחרון" **אינן ניתנות למיון**:
 *    הן מחושבות לעמוד המוצג בלבד מתוך טבלת הנמענים, ומיון עליהן היה ממיין
 *    25 שורות מתוך אלפים — כלומר משקר. מיון אמיתי עליהן דורש View או RPC
 *    עם GROUP BY, כלומר שינוי Supabase באישור נפרד.
 */
export const PUBLICATION_DB_SORT_COLUMNS: Record<string, string> = {
  name: 'full_name',
  phone: 'phone_norm',
  locality_type: 'locality_type',
  last_sent: 'whatsapp_campaign_last_sent',
  last_status: 'whatsapp_last_delivery_status',
  // ההחלטה נגזרת מהסטטוס; nullsLast מקבץ בסוף את מי שמעולם לא נשלח אליו
  outcome: 'whatsapp_last_delivery_status',
  role: 'sort_role(name)',
  region: 'sort_region(name)',
  city: 'sort_city(name)',
  social_status: 'sort_social(name)',
}

/**
 * ה-embed שצריך להתווסף ל-select כדי שמיון מילוני יעבוד.
 * מתווסף **רק** כשממיינים לפיו — אין סיבה לצרף JOIN לכל שאילתה.
 * שמות ה-FK מפורשים כדי שלא תהיה עמימות בין קשרים שונים לאותה טבלה.
 */
const SORT_EMBEDS: Record<string, string> = {
  role: 'sort_role:dict_roles!contact_role_fkey(name)',
  region: 'sort_region:dict_regions!contact_region_id_fkey(name)',
  city: 'sort_city:dict_cities!contact_city_id_fkey(name)',
  social_status: 'sort_social:dict_social_statuses!contact_social_status_fkey(name)',
}

/** העמודות שאין להן מיון אמיתי — הערך מחושב לעמוד המוצג בלבד */
export const PUBLICATION_DB_UNSORTABLE = new Set(['campaigns', 'read', 'last_campaign'])

// ───────────────────── מי ביקש להפסיק לקבל פרסום ─────────────────────

/**
 * רשימת אנשי הקשר שביקשו הסרה — נקבעת מקיום ולו שורת נמען אחת עם
 * failure_category='opt_out', ולכן **אינה נדרסת** ע"י קמפיין מאוחר יותר.
 *
 * זה ההבדל בין הסימון הקבוע (בקשת הסרה) לסימון ההפיך (אין מכשיר, שנגזר
 * מהסטטוס האחרון ויורד לבד כשקמפיין מצליח).
 *
 * ⚠️ מוגבל ל-1,000 מזהים. הקבוצה קטנה מטבעה (2 בקובץ הרופאים); אם תגדל
 *    מעבר לכך — `truncated` נדלק והמסך מתריע במקום לחתוך בשקט.
 */
export function useOptedOutContactIds() {
  return useQuery({
    queryKey: PUBLICATION_DB_KEYS.optOut,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('contact_id')
        .eq('failure_category', 'opt_out')
        .not('contact_id', 'is', null)
        .limit(1000)
      if (error) throw error
      const ids = Array.from(new Set((data ?? []).map((r) => Number(r.contact_id))))
      return { ids, truncated: (data?.length ?? 0) >= 1000 }
    },
  })
}

// ─────────────────────────── בניית השאילתה ───────────────────────────

/**
 * טיפוסי בוני-השאילתה של supabase-js אינם ניתנים להבעה כשמעבירים אותם בין
 * פונקציות (ה-generic של שם הטבלה נאבד). הפונקציות כאן גנריות ומחזירות את
 * הטיפוס שהתקבל, כדי שבאתר הקריאה השאילתה תישאר מוטפסת במלואה.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any

/**
 * מתרגם החלטה לתנאי על `contact`.
 *
 * "אין נייד" ו"מעולם לא נשלח" אינם נגזרים מהסטטוס אלא משדות אחרים, ולכן
 * הם בלעדיים — בחירתם מתעלמת משאר הדליים. שאר הדליים משתלבים ב-in() אחד.
 */
function applyOutcomeFilter<Q>(
  queryIn: Q,
  outcomes: DeliveryOutcome[],
  optedOutIds: number[],
): Q {
  const query: AnyQuery = queryIn
  if (!outcomes.length) return query

  // "אין נייד" — אי אפשר לשלוח בכלל
  if (outcomes.includes('no_phone')) {
    return query.is('phone_norm', null)
  }

  // "מעולם לא נשלח" — יש נייד, אין מועד פרסום
  if (outcomes.includes('never_sent')) {
    return query.not('phone_norm', 'is', null).is('whatsapp_campaign_last_sent', null)
  }

  const codes = Array.from(new Set(outcomes.flatMap((o) => OUTCOME_STATUS_CODES[o])))
  if (!codes.length) return query

  // בקשת הסרה אינה נגזרת מהסטטוס — היא נשלפת בנפרד ומוזרקת כאן.
  if (outcomes.includes('do_not_send') && optedOutIds.length) {
    const ids = optedOutIds.slice(0, IN_CHUNK)
    return query.or(
      `whatsapp_last_delivery_status.in.(${codes.join(',')}),contact_id.in.(${ids.join(',')})`,
    )
  }
  return query.in('whatsapp_last_delivery_status', codes)
}

function applyBaseFilters<Q>(queryIn: Q, f: PublicationDbFilters): Q {
  let q: AnyQuery = queryIn
  if (f.search.trim()) {
    const term = f.search.trim().replace(/[%,()]/g, '')
    const digits = phoneSearchTerm(term)
    const clauses = [`full_name.ilike.%${term}%`, `display_name.ilike.%${term}%`]
    if (digits) clauses.push(`phone_norm.ilike.%${digits}%`)
    q = q.or(clauses.join(','))
  }
  if (f.roleIds.length) q = q.in('role', f.roleIds)
  if (f.regionIds.length) q = q.in('region_id', f.regionIds)
  if (f.cityIds.length) q = q.in('city_id', f.cityIds)
  if (f.localityType === LOCALITY_UNCLASSIFIED) q = q.is('locality_type', null)
  else if (f.localityType) q = q.eq('locality_type', f.localityType)
  if (f.sentFrom) q = q.gte('whatsapp_campaign_last_sent', f.sentFrom)
  if (f.sentTo) q = q.lte('whatsapp_campaign_last_sent', `${f.sentTo}T23:59:59`)
  return q
}

// ─────────────────────────── שורות הטבלה ───────────────────────────

export function usePublicationDatabase(
  filters: PublicationDbFilters,
  page: number,
  sortBy: string,
  sortDir: 'asc' | 'desc',
) {
  const optOut = useOptedOutContactIds()
  const optedOutIds = optOut.data?.ids ?? []

  return useQuery({
    queryKey: [...PUBLICATION_DB_KEYS.rows, filters, page, sortBy, sortDir, optedOutIds.length],
    enabled: !optOut.isLoading,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    queryFn: async () => {
      const embed = SORT_EMBEDS[sortBy]
      const selectColumns = embed ? `${ROW_COLUMNS}, ${embed}` : ROW_COLUMNS

      let query = supabase.from('contact').select(selectColumns, { count: 'exact' })
      query = applyBaseFilters(query, filters)
      query = applyOutcomeFilter(query, filters.outcomes, optedOutIds)

      const column = PUBLICATION_DB_SORT_COLUMNS[sortBy] ?? 'whatsapp_campaign_last_sent'
      query = query
        .order(column, { ascending: sortDir === 'asc', nullsFirst: false })
        .order('contact_id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error

      type BaseRow = Omit<PublicationDbRow,
        'outcome' | 'campaignCount' | 'readCount' | 'lastCampaignName' | 'hasManualRecord'>
      const base = (data ?? []) as unknown as BaseRow[]
      const optedOut = new Set(optedOutIds)
      const enrichment = await fetchPageEnrichment(base.map((r) => r.contact_id))

      const rows: PublicationDbRow[] = base.map((r) => ({
        ...r,
        outcome: outcomeOfRecord({
          phoneNorm: r.phone_norm,
          lastSentAt: r.whatsapp_campaign_last_sent,
          lastStatus: r.whatsapp_last_delivery_status,
          isOptedOut: optedOut.has(r.contact_id),
        }),
        campaignCount: enrichment.get(r.contact_id)?.campaigns ?? 0,
        readCount: enrichment.get(r.contact_id)?.read ?? 0,
        lastCampaignName: enrichment.get(r.contact_id)?.lastCampaign ?? null,
        hasManualRecord: enrichment.get(r.contact_id)?.hasManual ?? false,
      }))

      return { rows, total: count ?? 0, pageSize: PAGE_SIZE }
    },
  })
}

interface Enrichment {
  campaigns: number
  read: number
  lastCampaign: string | null
  lastSent: string | null
  hasManual: boolean
}

/**
 * כמה קמפיינים כל אדם קיבל וכמה מהם נקראו — לעמוד המוצג בלבד.
 *
 * ⚠️ תקרת 1,000 של PostgREST: אדם יכול להופיע בעשרות קמפיינים, ולכן
 *    25 שורות בעמוד עלולות להחזיר מאות שורות נמענים. השליפה מעומדת.
 */
async function fetchPageEnrichment(contactIds: number[]): Promise<Map<number, Enrichment>> {
  const out = new Map<number, Enrichment>()
  if (!contactIds.length) return out

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('contact_id, delivery_status, sent_at, source_unique_key, campaign:whatsapp_campaigns(campaign_name)')
      .in('contact_id', contactIds)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error

    for (const row of data ?? []) {
      const id = Number(row.contact_id)
      const entry = out.get(id) ?? { campaigns: 0, read: 0, lastCampaign: null, lastSent: null, hasManual: false }
      entry.campaigns++
      // רישום ידני מזוהה לפי המפתח הדטרמיניסטי שלו (ראו useManualPublication)
      if (String(row.source_unique_key ?? '').startsWith('manual|')) entry.hasManual = true
      if (row.delivery_status === 'read') entry.read++
      const sentAt = (row.sent_at as string | null) ?? null
      if (!entry.lastSent || (sentAt && sentAt > entry.lastSent)) {
        entry.lastSent = sentAt
        const campaign = row.campaign as unknown as { campaign_name: string | null } | null
        entry.lastCampaign = campaign?.campaign_name ?? null
      }
      out.set(id, entry)
    }
    if (!data || data.length < 1000) break
  }
  return out
}

// ────────────────────────────── ה-KPI ──────────────────────────────

export interface PublicationDbStats {
  total: number
  byOutcome: Record<DeliveryOutcome, number>
}

/**
 * הכרטיסים העליונים. כל מונה סופר **בדיוק** את מה שהלחיצה עליו מציגה —
 * אותו תנאי ואותם פילטרים פעילים. זו דרישת ה-Screen Closure Checklist,
 * וגם הסיבה שהספירה עוברת דרך אותה applyOutcomeFilter של הטבלה.
 */
export function usePublicationDbStats(filters: PublicationDbFilters) {
  const optOut = useOptedOutContactIds()
  const optedOutIds = optOut.data?.ids ?? []

  return useQuery({
    queryKey: [...PUBLICATION_DB_KEYS.stats, filters, optedOutIds.length],
    enabled: !optOut.isLoading,
    staleTime: 30_000,
    queryFn: async (): Promise<PublicationDbStats> => {
      const countFor = async (outcomes: DeliveryOutcome[]) => {
        let q = supabase.from('contact').select('contact_id', { count: 'exact', head: true })
        q = applyBaseFilters(q, filters)
        q = applyOutcomeFilter(q, outcomes, optedOutIds)
        const { count, error } = await q
        if (error) throw error
        return count ?? 0
      }

      const [total, reached, doNotSend, retry, neverSent, noPhone, unknown] = await Promise.all([
        countFor([]),
        countFor(['reached']),
        countFor(['do_not_send']),
        countFor(['retry']),
        countFor(['never_sent']),
        countFor(['no_phone']),
        countFor(['unknown']),
      ])

      return {
        total,
        byOutcome: {
          reached, do_not_send: doNotSend, retry,
          never_sent: neverSent, no_phone: noPhone, unknown,
        },
      }
    },
  })
}

// ─────────────────────────────── ייצוא ───────────────────────────────

export interface ExportExclusions {
  noDevice: number
  optOut: number
  noPhone: number
}

/**
 * שולף את **כל** התוצאות המסוננות (לא רק העמוד) לצורך ייצוא.
 *
 * `excludeDoNotSend` מייצר את "רשימת השליחה הנקייה": אותו קהל, פחות מי
 * שאסור לשלוח אליו (בקשת הסרה), מי שאין לו וואטסאפ, ומי שאין לו נייד.
 * המספרים שהוצאו מוחזרים כדי שיוצגו למשתמשת ולא ייעלמו בשקט.
 */
export async function fetchAllPublicationRows(
  filters: PublicationDbFilters,
  optedOutIds: number[],
  excludeDoNotSend: boolean,
): Promise<{ rows: PublicationDbRow[]; excluded: ExportExclusions }> {
  const collected: PublicationDbRow[] = []
  const optedOut = new Set(optedOutIds)
  const excluded: ExportExclusions = { noDevice: 0, optOut: 0, noPhone: 0 }

  for (let page = 0; ; page++) {
    let query = supabase.from('contact').select(ROW_COLUMNS)
    query = applyBaseFilters(query, filters)
    query = applyOutcomeFilter(query, filters.outcomes, optedOutIds)
    const { data, error } = await query
      .order('contact_id', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error

    for (const raw of (data ?? []) as unknown as PublicationDbRow[]) {
      const outcome = outcomeOfRecord({
        phoneNorm: raw.phone_norm,
        lastSentAt: raw.whatsapp_campaign_last_sent,
        lastStatus: raw.whatsapp_last_delivery_status,
        isOptedOut: optedOut.has(raw.contact_id),
      })

      if (excludeDoNotSend) {
        if (outcome === 'no_phone') { excluded.noPhone++; continue }
        if (outcome === 'do_not_send') {
          if (optedOut.has(raw.contact_id)) excluded.optOut++
          else excluded.noDevice++
          continue
        }
      }
      collected.push({ ...raw, outcome, campaignCount: 0, readCount: 0, lastCampaignName: null, hasManualRecord: false })
    }
    if (!data || data.length < 1000) break
  }

  return { rows: collected, excluded }
}
