import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { ApplicationRow } from '@/types/applications'

/** Status 15 = "לא דנטלי - ארכיון" */
const ARCHIVE_STATUS = 15

export function useApplicationMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications'] })
    qc.invalidateQueries({ queryKey: ['applications-kpis'] })
    qc.invalidateQueries({ queryKey: ['application-row'] })
  }

  /**
   * Update fields on one application.
   * Business rule: application changes never update job status automatically.
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

    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Bulk-update application_status. Does not update job status automatically. */
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

  /** Create a contact record from application data and link it back. */
  const createContactFromApplication = useMutation({
    mutationFn: async (app: ApplicationRow) => {
      // Fetch dict IDs for profile_type, work_status, check_status by name
      const [profileTypeRes, workStatusRes, checkStatusRes] = await Promise.all([
        supabase.from('dict_profile_types').select('id').eq('name', 'מועמד').maybeSingle(),
        supabase.from('dict_contact_work_statuses').select('id').eq('name', 'מחפש עבודה אקטיבי').maybeSingle(),
        supabase.from('dict_check_statuses').select('id').eq('name', 'ממתין לבדיקה').maybeSingle(),
      ])

      const { data: contact, error: contactError } = await supabase
        .from('contact')
        .insert({
          display_name: app.candidate_name,
          full_name: app.candidate_name,
          phone: app.candidate_phone,
          phone_norm: app.phone_norm,
          email: app.candidate_email,
          cv_link: app.cv_link,
          cv_storage_path: app.cv_storage_path ?? null,
          has_cv: app.has_cv ?? false,
          cv_received_date: app.cv_received_date ?? null,
          source: app.source ?? null,
          profile_type: profileTypeRes.data?.id ?? null,
          work_status: workStatusRes.data?.id ?? null,
          check_status: checkStatusRes.data?.id ?? null,
        })
        .select('contact_id')
        .single()
      if (contactError) throw contactError

      const { error: updateError } = await supabase
        .from('applications')
        .update({ candidate_link: contact.contact_id, is_new_candidate: false })
        .eq('application_id', app.application_id)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      invalidate()
      toast.success('פרופיל נוצר בהצלחה')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /** Send application data as a new lead to inbox_v2 (application stays in applications). */
  const sendToLeadsV2 = useMutation({
    mutationFn: async (app: ApplicationRow) => {
      const { error } = await supabase.from('inbox_v2').insert({
        display_name: app.candidate_name,
        phone: app.candidate_phone,
        phone_norm: app.phone_norm,
        email: app.candidate_email,
        source_name: 'הגשת מועמדות באתר',
        source_unique_key: `application_${app.application_id}_${app.job_code}`,
        notes: `הגשה ממשרה ${app.job_code ?? ''}${app.candidate_notes ? ' — ' + app.candidate_notes : ''}`,
        raw_payload: {
          application_id: app.application_id,
          job_code: app.job_code,
          candidate_name: app.candidate_name,
          candidate_phone: app.candidate_phone,
          candidate_email: app.candidate_email,
          submission_date: app.submission_date,
          source: app.source,
        },
        temp_role: null,
        temp_region_id: app.job_region_id ?? null,
        temp_city_id: app.job_city_id ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => toast.success('נשלח ללידים בהצלחה'),
    onError: (err: Error) => toast.error(err.message),
  })

  /** Set application status to 15 = "לא דנטלי - ארכיון". */
  const archiveApplication = useMutation({
    mutationFn: async (applicationId: number) => {
      const { error } = await supabase
        .from('applications')
        .update({ application_status: ARCHIVE_STATUS, updated_timestamp: new Date().toISOString() })
        .eq('application_id', applicationId)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success('הועבר לארכיון')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    updateApplication,
    bulkUpdateStatus,
    bulkUpdateCheckStatus,
    bulkAssign,
    bulkSetFollowUp,
    createApplication,
    createContactFromApplication,
    sendToLeadsV2,
    archiveApplication,
  }
}
