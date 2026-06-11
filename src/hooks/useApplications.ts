import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ApplicationRow, ApplicationFilters, ApplicationKPIs } from '@/types/applications'

export const APPLICATIONS_PAGE_SIZE = 20

export function useApplicationRows(filters: ApplicationFilters, page: number) {
  return useQuery({
    queryKey: ['applications', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .order('submission_date', { ascending: false })
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
      if (filters.assigned_to != null)
        query = query.eq('assigned_to', filters.assigned_to)
      if (filters.has_follow_up)
        query = query.not('follow_up_date', 'is', null)

      const { data, count, error } = await query
      if (error) throw error
      return { rows: (data ?? []) as ApplicationRow[], total: count ?? 0 }
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
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [total, newApps, waitingHandling, advanced, hires, missingCv, waitingEmployer, archived] =
        await Promise.all([
          supabase.from('applications').select('application_id', { count: 'exact', head: true }),
          supabase
            .from('applications')
            .select('application_id', { count: 'exact', head: true })
            .gte('submission_date', sevenDaysAgo),
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
            .is('cv_link', null),
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
