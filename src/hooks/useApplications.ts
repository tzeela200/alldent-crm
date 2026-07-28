import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ApplicationRow, ApplicationFilters, ApplicationKPIs } from '@/types/applications'

export const APPLICATIONS_PAGE_SIZE = 20

/**
 * Statuses that end an application's life:
 * 5 לא ענה / נעלם · 10 הברזה מראיון · 13 הסיר מועמדות · 14 אין התאמה · 15 לא דנטלי - ארכיון.
 * Single source for both "active only" (excludes these) and "closed only"
 * (includes these) so the two filters stay complementary.
 */
export const TERMINAL_STATUSES: number[] = [5, 10, 13, 14, 15]

/** Statuses the "בראיונות" KPI counts — card count and click filter share this. */
export const INTERVIEW_STAGE_STATUSES: number[] = [6, 7, 8]

/**
 * Contacts that are linked from some application AND have a CV on their own card.
 *
 * "חסר קו״ח" must mean "we have no CV for this person anywhere", not "this
 * application row has no CV". A CV uploaded to the candidate's card is not
 * copied back onto older application rows, so counting the row alone reported
 * 39 missing when 24 of them did have a CV in the מאגר (INC-3116).
 *
 * The linked set is small (one id per application), so this is two tiny queries
 * rather than a join — no schema change required.
 */
export async function fetchLinkedContactsWithCv(): Promise<number[]> {
  const { data: links, error: linkErr } = await supabase
    .from('applications')
    .select('candidate_link')
    .not('candidate_link', 'is', null)
  if (linkErr) throw linkErr

  const ids = [...new Set((links ?? []).map((r) => r.candidate_link as number))]
  if (!ids.length) return []

  const withCv: number[] = []
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('contact')
      .select('contact_id')
      .in('contact_id', ids.slice(i, i + CHUNK))
      .or('has_cv.eq.true,cv_link.not.is.null,cv_storage_path.not.is.null')
    if (error) throw error
    withCv.push(...(data ?? []).map((c) => c.contact_id as number))
  }
  return withCv
}

/**
 * Narrow a query to applications that have no CV anywhere — not on the row and
 * not on the linked contact. `contactsWithCv` comes from
 * fetchLinkedContactsWithCv(). Shared by the KPI and the "ללא קו״ח" filter so
 * the card count and the list can never disagree.
 */
function applyMissingCvFilter<T>(queryIn: T, contactsWithCv: number[]): T {
  let query = queryIn as any
  query = query
    .or('has_cv.is.null,has_cv.eq.false')
    .is('cv_link', null)
    .is('cv_storage_path', null)
  if (contactsWithCv.length)
    query = query.or(`candidate_link.is.null,candidate_link.not.in.(${contactsWithCv.join(',')})`)
  return query as T
}

/**
 * Apply every server-side filter to an `applications` query.
 * Shared by the paged list and the "export all" fetch so both stay in sync.
 */
function applyApplicationFilters<T>(
  queryIn: T,
  filters: ApplicationFilters,
  /** From fetchLinkedContactsWithCv(); only needed when cv_state is set. */
  contactsWithCv: number[] = [],
): T {
  let query = queryIn as any
  {
      if (filters.search) {
        // Strip characters that break PostgREST's or() filter grammar.
        const s = filters.search.trim().replace(/[,()%*"\\]/g, ' ').trim()
        if (s)
          query = query.or(
            `candidate_name.ilike.%${s}%,candidate_phone.ilike.%${s}%,phone_norm.ilike.%${s}%,candidate_email.ilike.%${s}%,job_code.ilike.%${s}%,account_name.ilike.%${s}%`
          )
      }
      if (filters.application_status != null)
        query = query.eq('application_status', filters.application_status)
      if (filters.application_status_in?.length)
        query = query.in('application_status', filters.application_status_in)
      if (filters.check_status != null)
        query = query.eq('check_status', filters.check_status)
      if (filters.source != null)
        query = query.eq('source', filters.source)
      if (filters.job_region_id != null)
        query = query.eq('job_region_id', filters.job_region_id)
      if (filters.job_city_id != null)
        query = query.eq('job_city_id', filters.job_city_id)
      // Exact match, never ilike: '%רופא%' also matched "סייעת רופא שיניים",
      // so the "רופאים" chip returned every assistant row too (INC-3116).
      if (filters.job_role_names?.length)
        query = query.in('job_role', filters.job_role_names)
      if (filters.date_from)
        query = query.gte('submission_date', filters.date_from)
      if (filters.date_to)
        query = query.lte('submission_date', filters.date_to + 'T23:59:59')
      // "יש/אין קו״ח" is about the *person*, not the row: a CV may sit on the
      // application (has_cv / cv_link / cv_storage_path) or on the linked
      // contact's card. Counting the row alone marked 24 candidates who do have
      // a CV in the מאגר as "חסר קו״ח" (INC-3116).
      if (filters.cv_state === 'with')
        query = contactsWithCv.length
          ? query.or(
              `has_cv.eq.true,cv_link.not.is.null,cv_storage_path.not.is.null,candidate_link.in.(${contactsWithCv.join(',')})`
            )
          : query.or('has_cv.eq.true,cv_link.not.is.null,cv_storage_path.not.is.null')
      if (filters.cv_state === 'without')
        query = applyMissingCvFilter(query, contactsWithCv)
      if (filters.is_manual != null)
        query = query.eq('is_manual', filters.is_manual)
      if (filters.is_new_candidate != null)
        query = query.eq('is_new_candidate', filters.is_new_candidate)
      if (filters.has_follow_up)
        query = query.not('follow_up_date', 'is', null)
      if (filters.in_db === 'existing')
        query = query.not('candidate_link', 'is', null).eq('is_new_candidate', false)
      if (filters.in_db === 'new')
        query = query.or('is_new_candidate.eq.true,candidate_link.is.null')
      // Both branches must use the same set, otherwise a status belongs to
      // neither filter — status 10 ("הברזה מראיון") used to fall through the
      // gap and was invisible in both views (INC-3116).
      if (filters.active_apps_only)
        query = query.not('application_status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
      if (filters.closed_apps_only)
        query = query.in('application_status', TERMINAL_STATUSES)
      if (filters.overdue_follow_up) {
        const today = new Date().toISOString().slice(0, 10)
        query = query.not('follow_up_date', 'is', null).lte('follow_up_date', today)
      }
      if (filters.account_name_search)
        query = query.ilike('account_name', `%${filters.account_name_search}%`)
  }
  return query as T
}

/** Attach related contact + job fields onto application rows. */
async function enrichApplicationRows(rowsIn: ApplicationRow[]): Promise<ApplicationRow[]> {
  let rows = rowsIn
  {
      // Enrich with contact data
      const candidateIds = [...new Set(rows.map((r) => r.candidate_link).filter(Boolean))] as number[]
      if (candidateIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contact')
          .select('contact_id, work_status, candidate_availability_ids, profile_type, role, city_id, region_id, has_cv, cv_link, cv_storage_path, cv_received_date, display_name')
          .in('contact_id', candidateIds)
        if (contacts) {
          const contactMap = new Map(contacts.map((c) => [c.contact_id, c]))
          rows = rows.map((r) => {
            const c = r.candidate_link ? contactMap.get(r.candidate_link) : undefined
            if (!c) return r
            return {
              ...r,
              contact_work_status: c.work_status ?? null,
              contact_availability: c.candidate_availability_ids?.[0] ?? null,
              contact_profile_type: c.profile_type ?? null,
              contact_role: c.role ?? null,
              contact_city_id: c.city_id ?? null,
              contact_region_id: c.region_id ?? null,
              contact_has_cv: c.has_cv ?? null,
              contact_cv_link: c.cv_link ?? null,
              contact_cv_storage_path: c.cv_storage_path ?? null,
              contact_cv_received_date: c.cv_received_date ?? null,
              contact_display_name: c.display_name ?? null,
            }
          })
        }
      }

      // Enrich with job data
      const jobCodes = [...new Set(rows.map((r) => r.job_code).filter(Boolean))] as string[]
      if (jobCodes.length > 0) {
        const { data: jobs } = await supabase
          .from('job')
          .select('job_code, job_status, job_title, job_role, city_id, region_id')
          .in('job_code', jobCodes)
        if (jobs) {
          const jobMap = new Map(jobs.map((j) => [j.job_code, j]))
          rows = rows.map((r) => {
            const j = r.job_code ? jobMap.get(r.job_code) : undefined
            if (!j) return r
            return {
              ...r,
              job_status: j.job_status ?? null,
              job_title_from_job: j.job_title ?? null,
              job_role_id: j.job_role ?? null,
              job_city_id_from_job: j.city_id ?? null,
              job_region_id_from_job: j.region_id ?? null,
            }
          })
        }
      }

  }
  return rows
}

/**
 * Filters that depend on enriched (joined) fields, so they cannot run in the
 * Supabase query. NOTE: on the paged list these only see the current page —
 * tracked as a known limitation until a joined View/RPC exists.
 */
function applyEnrichedFilters(
  rowsIn: ApplicationRow[],
  filters: ApplicationFilters
): ApplicationRow[] {
  let rows = rowsIn
  if (filters.job_status != null)
    rows = rows.filter((r) => r.job_status === filters.job_status)
  if (filters.contact_work_status != null)
    rows = rows.filter((r) => r.contact_work_status === filters.contact_work_status)
  if (filters.contact_availability != null)
    rows = rows.filter((r) => r.contact_availability === filters.contact_availability)
  return rows
}

export function useApplicationRows(
  filters: ApplicationFilters,
  page: number,
  sortBy = 'submission_date',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  return useQuery({
    queryKey: ['applications', filters, page, sortBy, sortDir],
    queryFn: async () => {
      // Only needed for the CV filter — skip the extra round-trips otherwise.
      const contactsWithCv = filters.cv_state ? await fetchLinkedContactsWithCv() : []
      const query = applyApplicationFilters(
        supabase
          .from('applications')
          .select('*', { count: 'exact' })
          .order(sortBy, { ascending: sortDir === 'asc' })
          .range(page * APPLICATIONS_PAGE_SIZE, (page + 1) * APPLICATIONS_PAGE_SIZE - 1),
        filters,
        contactsWithCv
      )

      const { data, count, error } = await query
      if (error) throw error

      const enriched = await enrichApplicationRows((data ?? []) as ApplicationRow[])
      return { rows: applyEnrichedFilters(enriched, filters), total: count ?? 0 }
    },
    staleTime: 30_000,
  })
}

/**
 * Fetch every application matching `filters` across all pages — used by CSV
 * export so it exports the whole filtered result set, not just the current page.
 */
export async function fetchAllApplicationRows(
  filters: ApplicationFilters,
  sortBy = 'submission_date',
  sortDir: 'asc' | 'desc' = 'desc',
  maxRows = 5000
): Promise<ApplicationRow[]> {
  const CHUNK = 1000
  let all: ApplicationRow[] = []
  const contactsWithCv = filters.cv_state ? await fetchLinkedContactsWithCv() : []
  for (let from = 0; from < maxRows; from += CHUNK) {
    const query = applyApplicationFilters(
      supabase
        .from('applications')
        .select('*')
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(from, from + CHUNK - 1),
      filters,
      contactsWithCv
    )
    const { data, error } = await query
    if (error) throw error
    const batch = (data ?? []) as ApplicationRow[]
    all = all.concat(batch)
    if (batch.length < CHUNK) break
  }
  const enriched = await enrichApplicationRows(all)
  return applyEnrichedFilters(enriched, filters)
}

export function useApplicationRow(applicationId: number | null) {
  return useQuery({
    queryKey: ['application-row', applicationId],
    queryFn: async () => {
      if (!applicationId) return null
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('application_id', applicationId)
        .single()
      if (error) throw error
      return data as ApplicationRow
    },
    enabled: !!applicationId,
    staleTime: 30_000,
  })
}

export function useApplicationKPIs() {
  return useQuery({
    queryKey: ['applications-kpis'],
    queryFn: async () => {
      // Same definition the "ללא קו״ח" filter uses, so the card and the list it
      // opens can never disagree (INC-3116).
      const contactsWithCv = await fetchLinkedContactsWithCv()
      const [total, newApps, waitingHandling, advanced, hires, missingCv, waitingEmployer, archived] =
        await Promise.all([
          supabase.from('applications').select('application_id', { count: 'exact', head: true }),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 1),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .in('application_status', [1, 2]),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .in('application_status', INTERVIEW_STAGE_STATUSES),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 12),
          applyMissingCvFilter(
            supabase
              .from('applications')
              .select('application_id', { count: 'exact', head: true }),
            contactsWithCv
          ),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 9),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 15),
        ])
      return {
        total: total.count ?? 0,
        newApps: newApps.count ?? 0,
        waitingHandling: waitingHandling.count ?? 0,
        advanced: advanced.count ?? 0,
        hires: hires.count ?? 0,
        missingCv: missingCv.count ?? 0,
        waitingEmployer: waitingEmployer.count ?? 0,
        archived: archived.count ?? 0,
      } as ApplicationKPIs
    },
    staleTime: 60_000,
  })
}
