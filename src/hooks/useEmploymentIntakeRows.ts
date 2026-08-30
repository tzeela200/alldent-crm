/**
 * שאילתות Table First למסך "איתור מחפשי עבודה ומגייסים".
 * ה-DB נשאר source of truth; ה-hook מחזיר גם תקציר Contact/Account מקושר כדי
 * שהטבלה תוכל להציג שם/נייד קנוניים בלי שאילתה לכל שורה.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ContentType, EmploymentIntakeRow } from '@/types/employment-intake'
import { supabaseError } from '@/lib/employment-intake/errors'
import type { DatabaseState } from '@/lib/employment-intake/labels'

export interface EmploymentIntakeFilters {
  search: string
  contentTypes: ContentType[]
  databaseState: DatabaseState | ''
  roleId: number | null
  cityId: number | null
  dateFrom: string
  dateTo: string
  needsReview: boolean
  hideSystemNoise: boolean
}

export const EMPTY_FILTERS: EmploymentIntakeFilters = {
  search: '',
  contentTypes: [],
  databaseState: '',
  roleId: null,
  cityId: null,
  dateFrom: '',
  dateTo: '',
  needsReview: false,
  hideSystemNoise: true,
}

export function hasActiveFilters(f: EmploymentIntakeFilters): boolean {
  return !!f.search || f.contentTypes.length > 0 || !!f.databaseState || f.roleId != null || f.cityId != null || !!f.dateFrom || !!f.dateTo || f.needsReview || !f.hideSystemNoise
}

export interface MatchedContactSummary {
  contact_id: number
  display_name: string | null
  phone: string | null
  second_phone: string | null
  email: string | null
  role: number | null
  city_id: number | null
  region_id: number | null
  social_status: number | null
}

export interface MatchedAccountSummary {
  account_id: number
  account_name: string | null
  phone: string | null
  email: string | null
  account_type: number | null
  city_id: number | null
  region_id: number | null
  account_status: number | null
}

export interface RowWithAction extends EmploymentIntakeRow {
  last_action: { result: string; performed_at: string; performed_by: string; action_type: string } | null
  matched_contact: MatchedContactSummary | null
  matched_account: MatchedAccountSummary | null
}

export type EmploymentIntakeSortKey =
  | 'source_published_at'
  | 'sender_name'
  | 'contact_name'
  | 'phone'
  | 'content_type'
  | 'role_id'
  | 'city_id'
  | 'source_name'
  | 'ingested_at'
  | 'updated_at'

const PAGE_SIZE = 25

function sanitize(v: string): string {
  return v.replace(/[%,()\"]/g, '')
}

/**
 * חייב לשקף **בדיוק** את computeDatabaseState (labels.ts) — אחרת המסך סותר
 * את עצמו: הטבלה מציגה "קיים" וה-KPI/המסנן סופרים את אותה שורה כ"דורש
 * בדיקה". זה בדיוק מה שקרה אחרי INC-3128 (התווית תוקנה, השאילתות לא).
 * סדר העדיפות שם: תג פורמט Google ⇒ קיים · התאמה ⇒ קיים · ambiguous/
 * probable/needs_context/requires_identification ⇒ נדרש זיהוי · אחרת לא קיים.
 */
function applyDatabaseState<T extends { is: Function; not: Function; eq: Function; or: Function; contains: Function; neq: Function }>(query: T, state: DatabaseState | ''): T {
  switch (state) {
    case 'existing':
      return query.or('match_contact.not.is.null,match_account.not.is.null,tags.cs.{google_contact_expected_existing}') as T
    case 'not_existing':
      return query
        .is('match_contact', null)
        .is('match_account', null)
        .not('tags', 'cs', '{google_contact_expected_existing}')
        .not('tags', 'cs', '{requires_identification}')
        .not('match_type', 'in', '(ambiguous,probable)')
        .eq('needs_context', false) as T
    case 'needs_identification':
      return query
        .is('match_contact', null)
        .is('match_account', null)
        .not('tags', 'cs', '{google_contact_expected_existing}')
        .or('match_type.in.(ambiguous,probable),needs_context.eq.true,tags.cs.{requires_identification}') as T
    default:
      // google_sync_exception אינו מיוצר יותר (INC-3128) ולכן אינו מסונן.
      return query
  }
}

export function useEmploymentIntakeRows(
  filters: EmploymentIntakeFilters,
  page: number,
  sortKey: EmploymentIntakeSortKey = 'source_published_at',
  sortDir: 'asc' | 'desc' = 'desc',
) {
  return useQuery({
    queryKey: ['employment-intake-rows', filters, page, sortKey, sortDir],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('employment_intake')
        .select(
          `*,
           last_action:employment_intake_action!last_action_id(result, performed_at, performed_by, action_type),
           matched_contact:contact!employment_intake_match_contact_fkey(contact_id, display_name, phone, second_phone, email, role, city_id, region_id, social_status),
           matched_account:accounts!employment_intake_match_account_fkey(account_id, account_name, phone, email, account_type, city_id, region_id, account_status)`,
          { count: 'exact' },
        )
        .is('deleted_at', null)

      if (filters.hideSystemNoise) query = query.not('tags', 'cs', '{system_noise}')
      if (filters.search.trim()) {
        const term = sanitize(filters.search.trim())
        query = query.or(
          `original_text.ilike.%${term}%,sender_name.ilike.%${term}%,contact_name.ilike.%${term}%,org_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
        )
      }
      if (filters.contentTypes.length) query = query.in('content_type', filters.contentTypes)
      if (filters.roleId != null) query = query.eq('role_id', filters.roleId)
      if (filters.cityId != null) query = query.eq('city_id', filters.cityId)
      if (filters.dateFrom) query = query.gte('source_published_at', `${filters.dateFrom}T00:00:00`)
      if (filters.dateTo) query = query.lte('source_published_at', `${filters.dateTo}T23:59:59.999`)
      if (filters.needsReview) {
        query = query
          .is('match_contact', null)
          .is('match_account', null)
          .not('tags', 'cs', '{google_contact_expected_existing}')
          .or('match_type.in.(ambiguous,probable),needs_context.eq.true,tags.cs.{requires_identification}')
      }
      query = applyDatabaseState(query as never, filters.databaseState) as typeof query

      const from = (page - 1) * PAGE_SIZE
      const { data, error, count } = await query
        .order(sortKey, { ascending: sortDir === 'asc', nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw supabaseError('טעינת התוצאות נכשלה', error)
      return { rows: (data ?? []) as unknown as RowWithAction[], total: count ?? 0, pageSize: PAGE_SIZE }
    },
  })
}

export interface IntakeSummaryCounts {
  total: number
  jobSeekers: number
  recruiters: number
  groupJoin: number
  existing: number
  notExisting: number
  needsReview: number
}

/** KPI עסקיים בלבד. הודעות system_noise אינן נספרות בשולחן העבודה. */
export function useEmploymentIntakeSummary() {
  return useQuery({
    queryKey: ['employment-intake-summary'],
    staleTime: 30_000,
    queryFn: async (): Promise<IntakeSummaryCounts> => {
      const base = () => supabase
        .from('employment_intake')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('tags', 'cs', '{system_noise}')

      const [total, jobSeekers, recruiters, groupJoin, existing, notExisting, needsReview] = await Promise.all([
        base(),
        base().eq('content_type', 'job_seeker'),
        base().eq('content_type', 'recruiter'),
        base().eq('content_type', 'group_join'),
        // שלושת אלה חייבים לשקף את computeDatabaseState בדיוק — ראו ההערה
        // ב-applyDatabaseState. אחרת ה-KPI סותר את התווית בטבלה.
        base().or('match_contact.not.is.null,match_account.not.is.null,tags.cs.{google_contact_expected_existing}'),
        base()
          .is('match_contact', null)
          .is('match_account', null)
          .not('tags', 'cs', '{google_contact_expected_existing}')
          .not('tags', 'cs', '{requires_identification}')
          .not('match_type', 'in', '(ambiguous,probable)')
          .eq('needs_context', false),
        base()
          .is('match_contact', null)
          .is('match_account', null)
          .not('tags', 'cs', '{google_contact_expected_existing}')
          .or('match_type.in.(ambiguous,probable),needs_context.eq.true,tags.cs.{requires_identification}'),
      ])

      const all = [total, jobSeekers, recruiters, groupJoin, existing, notExisting, needsReview]
      const failed = all.find((r) => r.error)
      if (failed?.error) throw supabaseError('טעינת סיכום נכשלה', failed.error)

      return {
        total: total.count ?? 0,
        jobSeekers: jobSeekers.count ?? 0,
        recruiters: recruiters.count ?? 0,
        groupJoin: groupJoin.count ?? 0,
        existing: existing.count ?? 0,
        notExisting: notExisting.count ?? 0,
        needsReview: needsReview.count ?? 0,
      }
    },
  })
}
