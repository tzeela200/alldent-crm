import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ApplicationRow, ApplicationFilters, ApplicationKPIs } from '@/types/applications'

export const APPLICATIONS_PAGE_SIZE = 20

export function useApplicationRows(
  filters: ApplicationFilters,
  page: number,
  sortBy = 'submission_date',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  return useQuery({
    queryKey: ['applications', filters, page, sortBy, sortDir],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(page * APPLICATIONS_PAGE_SIZE, (page + 1) * APPLICATIONS_PAGE_SIZE - 1)

      if (filters.search) {
        const s = filters.search.trim()
        query = query.or(
          `candidate_name.ilike.%${s}%,candidate_phone.ilike.%${s}%,phone_norm.ilike.%${s}%,candidate_email.ilike.%${s}%,job_code.ilike.%${s}%,account_name.ilike.%${s}%`
        )
      }
      if (filters.application_status != null)
        query = query.eq('application_status', filters.application_status)
      if (filters.check_status != null)
        query = query.eq('check_status', filters.check_status)
      if (filters.source != null)
        query = query.eq('source', filters.source)
      if (filters.job_region_id != null)
        query = query.eq('job_region_id', filters.job_region_id)
      if (filters.job_city_id != null)
        query = query.eq('job_city_id', filters.job_city_id)
      if (filters.job_role)
        query = query.ilike('job_role', `%${filters.job_role}%`)
      if (filters.date_from)
        query = query.gte('submission_date', filters.date_from)
      if (filters.date_to)
        query = query.lte('submission_date', filters.date_to + 'T23:59:59')
      if (filters.cv_state === 'with')
        query = query.not('cv_link', 'is', null)
      if (filters.cv_state === 'without')
        query = query.is('cv_link', null)
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
      if (filters.active_apps_only)
        query = query.not('application_status', 'in', '(5,10,13,14,15)')
      if (filters.closed_apps_only)
        query = query.in('application_status', [5, 13, 14, 15])
      if (filters.overdue_follow_up) {
        const today = new Date().toISOString().slice(0, 10)
        query = query.not('follow_up_date', 'is', null).lte('follow_up_date', today)
      }
      if (filters.account_name_search)
        query = query.ilike('account_name', `%${filters.account_name_search}%`)

      const { data, count, error } = await query
      if (error) throw error

      let rows = (data ?? []) as ApplicationRow[]

      // Enrich with contact data
      const candidateIds = [...new Set(rows.map((r) => r.candidate_link).filter(Boolean))] as number[]
      if (candidateIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contact')
          .select('contact_id, work_status, availability, profile_type, role, city_id, region_id, has_cv, cv_link, cv_received_date, display_name')
          .in('contact_id', candidateIds)
        if (contacts) {
          const contactMap = new Map(contacts.map((c) => [c.contact_id, c]))
          rows = rows.map((r) => {
            const c = r.candidate_link ? contactMap.get(r.candidate_link) : undefined
            if (!c) return r
            return {
              ...r,
              contact_work_status: c.work_status ?? null,
              contact_availability: c.availability ?? null,
              contact_profile_type: c.profile_type ?? null,
              contact_role: c.role ?? null,
              contact_city_id: c.city_id ?? null,
              contact_region_id: c.region_id ?? null,
              contact_has_cv: c.has_cv ?? null,
              contact_cv_link: c.cv_link ?? null,
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

      // Client-side filters on enriched fields (job_status, work_status, availability)
      if (filters.job_status != null)
        rows = rows.filter((r) => r.job_status === filters.job_status)
      if (filters.contact_work_status != null)
        rows = rows.filter((r) => r.contact_work_status === filters.contact_work_status)
      if (filters.contact_availability != null)
        rows = rows.filter((r) => r.contact_availability === filters.contact_availability)

      return { rows, total: count ?? 0 }
    },
    staleTime: 30_000,
  })
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
            .in('application_status', [6, 7, 8]),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 12),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .or('has_cv.is.null,has_cv.eq.false'),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 9),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .eq('application_status', 13),
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
