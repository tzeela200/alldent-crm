import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DictItem } from '@/types'

interface ApplicationDicts {
  applicationStatuses: DictItem[]
  checkStatuses: DictItem[]
  sources: DictItem[]
  regions: DictItem[]
  roles: DictItem[]
  workStatuses: DictItem[]
  availabilities: DictItem[]
  jobStatuses: DictItem[]
  cities: DictItem[]
}

export function useApplicationDicts() {
  return useQuery({
    queryKey: ['application-dicts'],
    queryFn: async (): Promise<ApplicationDicts> => {
      const [appStatuses, checkStatuses, sources, regions, roles, workStatuses, availabilities, jobStatuses, cities] =
        await Promise.all([
          supabase.from('dict_application_statuses').select('id, name').order('id'),
          supabase.from('dict_check_statuses').select('id, name').order('id'),
          supabase.from('dict_sources').select('id, name').order('id'),
          supabase.from('dict_regions').select('id, name').order('name'),
          supabase.from('dict_roles').select('id, name').order('name'),
          supabase.from('dict_contact_work_statuses').select('id, name').order('id'),
          supabase.from('dict_availability').select('id, name').order('id'),
          supabase.from('dict_job_statuses').select('id, name').order('id'),
          supabase.from('dict_cities').select('id, name').order('name'),
        ])
      return {
        applicationStatuses: (appStatuses.data ?? []) as DictItem[],
        checkStatuses: (checkStatuses.data ?? []) as DictItem[],
        sources: (sources.data ?? []) as DictItem[],
        regions: (regions.data ?? []) as DictItem[],
        roles: (roles.data ?? []) as DictItem[],
        workStatuses: (workStatuses.data ?? []) as DictItem[],
        availabilities: (availabilities.data ?? []) as DictItem[],
        jobStatuses: (jobStatuses.data ?? []) as DictItem[],
        cities: (cities.data ?? []) as DictItem[],
      }
    },
    staleTime: 5 * 60_000,
  })
}

/** Look up a dict item label by id. Returns the label string or a fallback. */
export function getDictLabel(items: DictItem[] | undefined, id: number | null | undefined): string {
  if (!items || id == null) return '—'
  return items.find((d) => d.id === id)?.name ?? String(id)
}
