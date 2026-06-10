import { useQuery } from '@tanstack/react-query'
import { getPublicJobs, getPublicJob, type PublicJobFilters, type PublicJob } from '@/services/publicJobsService'
import { useMemo } from 'react'

export function usePublicJobs(filters: PublicJobFilters = {}) {
  return useQuery({
    queryKey: ['public-jobs', filters],
    queryFn: () => getPublicJobs(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function usePublicJob(jobCode: string | undefined) {
  return useQuery({
    queryKey: ['public-job', jobCode],
    queryFn: () => getPublicJob(jobCode!),
    enabled: !!jobCode,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePublicJobFilters(jobs: PublicJob[] | undefined) {
  return useMemo(() => {
    if (!jobs?.length) return { roles: [], regions: [], cities: [], scopes: [], experiences: [] }

    const unique = <T>(arr: (T | null | undefined)[]): T[] =>
      [...new Set(arr.filter((v): v is T => v != null && v !== ''))] as T[]

    return {
      roles: unique(jobs.map((j) => j.job_role_name)).sort(),
      regions: unique(jobs.map((j) => j.region_name)).sort(),
      cities: unique(jobs.map((j) => j.city_name)).sort(),
      scopes: unique(jobs.map((j) => j.scope_name)).sort(),
      experiences: unique(jobs.map((j) => j.required_experience_name)).sort(),
    }
  }, [jobs])
}
