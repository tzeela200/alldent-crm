/**
 * שלב 8 של INC-3119: שליפת שורות התוצאות + סיכום KPI, עם מסננים ועימוד.
 * שאילתה אחת לטבלה + embedding של הפעולה האחרונה (result) דרך PostgREST,
 * לא JOIN ידני ולא שאילתה נפרדת לכל שורה.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ContentType, EmploymentIntakeRow } from '@/types/employment-intake'
import type { MatchStatus } from '@/types/employment-intake'
import { supabaseError } from '@/lib/employment-intake/errors'

export interface EmploymentIntakeFilters {
  search: string
  contentTypes: ContentType[]
  matchStatus: MatchStatus | ''
  roleId: number | null
  cityId: number | null
}

export const EMPTY_FILTERS: EmploymentIntakeFilters = {
  search: '',
  contentTypes: [],
  matchStatus: '',
  roleId: null,
  cityId: null,
}

export function hasActiveFilters(f: EmploymentIntakeFilters): boolean {
  return !!f.search || f.contentTypes.length > 0 || !!f.matchStatus || f.roleId != null || f.cityId != null
}

export interface RowWithAction extends EmploymentIntakeRow {
  last_action: { result: string; performed_at: string; performed_by: string; action_type: string } | null
}

const PAGE_SIZE = 25

function sanitize(v: string): string {
  return v.replace(/[%,()"]/g, '')
}

export function useEmploymentIntakeRows(filters: EmploymentIntakeFilters, page: number, sortDir: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: ['employment-intake-rows', filters, page, sortDir],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('employment_intake')
        .select(
          '*, last_action:employment_intake_action!last_action_id(result, performed_at, performed_by, action_type)',
          { count: 'exact' },
        )
        .is('deleted_at', null)

      if (filters.search.trim()) {
        const term = sanitize(filters.search.trim())
        query = query.or(
          `original_text.ilike.%${term}%,contact_name.ilike.%${term}%,org_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
        )
      }
      if (filters.contentTypes.length) query = query.in('content_type', filters.contentTypes)
      if (filters.roleId != null) query = query.eq('role_id', filters.roleId)
      if (filters.cityId != null) query = query.eq('city_id', filters.cityId)

      switch (filters.matchStatus) {
        case 'none':
          query = query.is('match_contact', null).is('match_account', null).neq('match_type', 'ambiguous')
          break
        case 'contact_found':
          query = query.not('match_contact', 'is', null).is('match_account', null)
          break
        case 'account_found':
          query = query.not('match_account', 'is', null).is('match_contact', null)
          break
        case 'both_found':
          query = query.not('match_contact', 'is', null).not('match_account', 'is', null)
          break
        case 'multiple':
          query = query.eq('match_type', 'ambiguous')
          break
        case 'already_linked':
          query = query.not('last_action_id', 'is', null)
          break
      }

      const from = (page - 1) * PAGE_SIZE
      const { data, error, count } = await query
        .order('ingested_at', { ascending: sortDir === 'asc' })
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
  irrelevant: number
  unclear: number
  uniqueIdentities: number
  existing: number
  newRecords: number
  alreadyHandled: number
}

/** סיכום KPI — שאילתת ספירה אחת עם head:true לכל ציר, לא סריקת כל השורות בלקוח. */
export function useEmploymentIntakeSummary() {
  return useQuery({
    queryKey: ['employment-intake-summary'],
    staleTime: 30_000,
    queryFn: async (): Promise<IntakeSummaryCounts> => {
      const base = () => supabase.from('employment_intake').select('*', { count: 'exact', head: true }).is('deleted_at', null)

      const [total, jobSeekers, recruiters, groupJoin, irrelevant, unclear, existing, newRecords, alreadyHandled] = await Promise.all([
        base(),
        base().eq('content_type', 'job_seeker'),
        base().eq('content_type', 'recruiter'),
        base().eq('content_type', 'group_join'),
        base().eq('content_type', 'irrelevant'),
        base().eq('content_type', 'unclear'),
        base().or('match_contact.not.is.null,match_account.not.is.null'),
        base().is('match_contact', null).is('match_account', null).neq('match_type', 'ambiguous'),
        base().not('last_action_id', 'is', null),
      ])

      const failed = [total, jobSeekers, recruiters, groupJoin, irrelevant, unclear, existing, newRecords, alreadyHandled].find((r) => r.error)
      if (failed?.error) throw supabaseError('טעינת סיכום נכשלה', failed.error)

      // זהויות ייחודיות: ספירה מדויקת דורשת שליפת עמודות זהות; לביצועים נשלף רק בעת הצורך (ראה fetchUniqueIdentityCount)
      const uniqueIdentities = await fetchUniqueIdentityCount()

      return {
        total: total.count ?? 0,
        jobSeekers: jobSeekers.count ?? 0,
        recruiters: recruiters.count ?? 0,
        groupJoin: groupJoin.count ?? 0,
        irrelevant: irrelevant.count ?? 0,
        unclear: unclear.count ?? 0,
        existing: existing.count ?? 0,
        newRecords: newRecords.count ?? 0,
        alreadyHandled: alreadyHandled.count ?? 0,
        uniqueIdentities,
      }
    },
  })
}

/** סופר זהויות ייחודיות (canonical_contact_id או identity_group_id) — שליפה קלה של שתי העמודות בלבד. */
async function fetchUniqueIdentityCount(): Promise<number> {
  const { data, error } = await supabase
    .from('employment_intake')
    .select('canonical_contact_id, identity_group_id')
    .is('deleted_at', null)
  if (error) throw supabaseError('ספירת זהויות נכשלה', error)
  const keys = new Set<string>()
  for (const row of data ?? []) {
    const r = row as { canonical_contact_id: number | null; identity_group_id: string | null }
    if (r.canonical_contact_id != null) keys.add(`c:${r.canonical_contact_id}`)
    else if (r.identity_group_id) keys.add(`g:${r.identity_group_id}`)
  }
  return keys.size
}
