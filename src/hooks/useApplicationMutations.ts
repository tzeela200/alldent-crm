import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { ApplicationRow } from '@/types/applications'

/** Status 12 = "השמה (התקבל)" — triggers job.job_status = 5 ("מאוישת"). */
const HIRE_STATUS = 12
const HIRED_JOB_STATUS = 5

async function triggerHireIfNeeded(status: number, jobCode: string | null | undefined) {
  if (status !== HIRE_STATUS || !jobCode) return
  const { error } = await supabase
    .from('job')
    .update({ job_status: HIRED_JOB_STATUS })
    .eq('job_code', jobCode)
  if (error) throw error
}

export function useApplicationMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications'] })
    qc.invalidateQueries({ queryKey: ['applications-kpis'] })
    qc.invalidateQueries({ queryKey: ['application-row'] })
  }

  /**
   * Update fields on one application.
   * If application_status is set to 12 (השמה), also updates job.job_status = 5 (מאוישת).
   * The hire trigger only fires when the admin explicitly saves this status change from the UI.
   */
  const updateApplication = useMutation({
    mutationFn: async ({
      applicationId,
      updates,
      jobCode,
    }: {
      applicationId: number
      updates: Partial<ApplicationRow>
      /** Caller must pass job_code when updating application_status to 12. */
      jobCode?: string | null
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ ...updates, updated_timestamp: new Date().toISOString() })
        .eq('application_id', applicationId)
      if (error) throw error

      if (updates.application_status != null) {
        await triggerHireIfNeeded(updates.application_status, jobCode)
      }
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Bulk-update application_status. Fires hire trigger per unique job_code if status = 12. */
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({
      applicationIds,
      status,
    }: {
      applicationIds: number[]
      status: number
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ application_status: status, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
      if (error) throw error

      if (status === HIRE_STATUS) {
        const { data } = await supabase
          .from('applications')
          .select('job_code')
          .in('application_id', applicationIds)
        const jobCodes = [...new Set((data ?? []).map((r) => r.job_code).filter(Boolean))]
        await Promise.all(
          jobCodes.map((code) =>
            supabase.from('job').update({ job_status: HIRED_JOB_STATUS }).eq('job_code', code)
          )
        )
      }
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Bulk-update check_status. */
  const bulkUpdateCheckStatus = useMutation({
    mutationFn: async ({
      applicationIds,
      checkStatus,
    }: {
      applicationIds: number[]
      checkStatus: number
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ check_status: checkStatus, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
      if (error) throw error
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Bulk-assign assigned_to. */
  const bulkAssign = useMutation({
    mutationFn: async ({
      applicationIds,
      assignedTo,
    }: {
      applicationIds: number[]
      assignedTo: string | null
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ assigned_to: assignedTo, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
      if (error) throw error
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Bulk-set follow_up_date. */
  const bulkSetFollowUp = useMutation({
    mutationFn: async ({
      applicationIds,
      date,
    }: {
      applicationIds: number[]
      date: string
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ follow_up_date: date, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
      if (error) throw error
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /**
   * Create a new manual application from an existing contact + job.
   * Caller must verify duplicate guard (job_code + phone_norm) before calling.
   */
  const createApplication = useMutation({
    mutationFn: async (
      row: Omit<ApplicationRow, 'application_id' | 'created_timestamp' | 'updated_timestamp'>
    ) => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('applications')
        .insert({ ...row, created_timestamp: now, updated_timestamp: now })
        .select('application_id')
        .single()
      if (error) throw error
      return data.application_id as number
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    updateApplication,
    bulkUpdateStatus,
    bulkUpdateCheckStatus,
    bulkAssign,
    bulkSetFollowUp,
    createApplication,
  }
}
