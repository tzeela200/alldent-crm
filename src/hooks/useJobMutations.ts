import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const JOB_QUERY_KEYS = [
  ['jobs-admin-v4'],
  ['job-detail'],
  ['applications-for-job'],
  ['jobs', 'account-counts'],
  ['employer360', 'jobs'],
  ['active_jobs_for_apply'],
] as const

async function invalidateAllJobQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all(
    JOB_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  )
}

export function useJobMutations() {
  const queryClient = useQueryClient()

  async function updateJob(jobCode: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from('job').update(patch).eq('job_code', jobCode)
    if (!error) await invalidateAllJobQueries(queryClient)
    return { error }
  }

  async function insertJob(payload: Record<string, unknown>) {
    const { error } = await supabase.from('job').insert(payload)
    if (!error) await invalidateAllJobQueries(queryClient)
    return { error }
  }

  return { updateJob, insertJob }
}
