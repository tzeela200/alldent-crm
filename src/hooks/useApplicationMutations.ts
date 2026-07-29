import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
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
      const { data, error } = await supabase
        .from('applications')
        .update({ ...updates, updated_timestamp: new Date().toISOString() })
        .eq('application_id', applicationId)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('העדכון לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה')
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
      const { data, error } = await supabase
        .from('applications')
        .update({ application_status: status, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('אף הגשה לא עודכנה — ייתכן שאין הרשאה')
      return data.length
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
      const { data, error } = await supabase
        .from('applications')
        .update({ check_status: checkStatus, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('אף הגשה לא עודכנה — ייתכן שאין הרשאה')
      return data.length
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
      const { data, error } = await supabase
        .from('applications')
        .update({ assigned_to: assignedTo, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('אף הגשה לא עודכנה — ייתכן שאין הרשאה')
      return data.length
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
      const { data, error } = await supabase
        .from('applications')
        .update({ follow_up_date: date, updated_timestamp: new Date().toISOString() })
        .in('application_id', applicationIds)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('אף הגשה לא עודכנה — ייתכן שאין הרשאה')
      return data.length
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

  /**
   * Approve to registry ("מאושר למאגר"): create a contact from application data,
   * link it back, and mark both records check_status=3.
   * profile_type / work_status are NOT set here — the DB trigger
   * `ensure_candidate_profile_from_application` sets them once candidate_link is filled,
   * and also maintains rel_contact_profiles (the "candidates" membership).
   * Returns the new contact_id for navigation.
   */
  const createContactFromApplication = useMutation({
    mutationFn: async (app: ApplicationRow): Promise<number> => {
      // check_status = "מאושר למאגר" (3). Trigger does not touch contact.check_status,
      // so it must be set explicitly on both the contact and the application.
      const { data: approvedRes } = await supabase
        .from('dict_check_statuses')
        .select('id')
        .eq('name', 'מאושר למאגר')
        .maybeSingle()
      const approvedId = approvedRes?.id ?? 3

      // contact.phone_norm is UNIQUE — reuse an existing contact instead of
      // inserting a duplicate (which would fail on the unique constraint).
      let contactId: number | null = null
      if (app.phone_norm) {
        const { data: existing } = await supabase
          .from('contact')
          .select('contact_id')
          .eq('phone_norm', app.phone_norm)
          .maybeSingle()
        if (existing) contactId = existing.contact_id as number
      }

      if (contactId == null) {
        const { data: contact, error: contactError } = await supabase
          .from('contact')
          .insert({
            full_name: app.candidate_name,
            display_name: app.candidate_name,
            phone: app.candidate_phone,
            phone_norm: app.phone_norm,
            email: app.candidate_email,
            cv_link: app.cv_link,
            cv_storage_path: app.cv_storage_path ?? null,
            has_cv: app.has_cv ?? false,
            cv_received_date: app.cv_received_date ?? null,
            source: app.source ?? null,
            // contact.* array columns are NOT NULL DEFAULT '{}' too — never send null.
            candidate_availability_ids: app.candidate_availability_ids ?? [],
            candidate_salary_type_ids: app.candidate_salary_type_ids ?? [],
            check_status: approvedId,
          })
          .select('contact_id')
          .single()
        if (contactError) throw contactError
        contactId = contact.contact_id as number
      } else {
        // Existing contact — mark it approved too. Verify it actually applied,
        // otherwise we would report full success on a partial update.
        const { data: updatedContact, error: contactUpdateError } = await supabase
          .from('contact')
          .update({ check_status: approvedId })
          .eq('contact_id', contactId)
          .select('contact_id')
        if (contactUpdateError) throw contactUpdateError
        if (!updatedContact || updatedContact.length === 0)
          throw new Error('עדכון איש הקשר הקיים נכשל — ייתכן שאין הרשאה')
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          candidate_link: contactId,
          is_new_candidate: false,
          check_status: approvedId,
          updated_timestamp: new Date().toISOString(),
        })
        .eq('application_id', app.application_id)
      if (updateError) throw updateError

      return contactId as number
    },
    onSuccess: () => {
      invalidate()
      toast.success('מאושר למאגר — פרופיל נוצר')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /**
   * Link an application to a contact that already exists in the registry.
   *
   * Needed when the submitted phone was malformed: the approve-to-registry flow
   * finds the contact by phone_norm, so a broken number leaves no way to attach
   * the application to the person you created by hand (INC-3116). Mirrors the
   * existing-contact branch of createContactFromApplication.
   *
   * Setting candidate_link fires `trg_application_candidate_profile`, which
   * maintains profile_type / work_status and rel_contact_profiles — so we must
   * not set those here.
   */
  const linkApplicationToContact = useMutation({
    mutationFn: async ({
      applicationId,
      contactId,
    }: {
      applicationId: number
      contactId: number
    }) => {
      const { data: approvedRes } = await supabase
        .from('dict_check_statuses')
        .select('id')
        .eq('name', 'מאושר למאגר')
        .maybeSingle()
      const approvedId = approvedRes?.id ?? 3

      const { data: contactRow, error: contactErr } = await supabase
        .from('contact')
        .update({ check_status: approvedId })
        .eq('contact_id', contactId)
        .select('contact_id')
      if (contactErr) throw contactErr
      if (!contactRow || contactRow.length === 0)
        throw new Error('איש הקשר לא נמצא — ייתכן שנמחק או שאין הרשאה')

      const { data, error } = await supabase
        .from('applications')
        .update({
          candidate_link: contactId,
          is_new_candidate: false,
          check_status: approvedId,
          updated_timestamp: new Date().toISOString(),
        })
        .eq('application_id', applicationId)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('הקישור לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה')
      return contactId
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('ההגשה קושרה למועמד קיים')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /**
   * Correct the mobile on an application.
   *
   * Keeps candidate_phone (as typed) and phone_norm (9725XXXXXXXX) in sync —
   * they are what the approve-to-registry lookup and the duplicate guard use, so
   * updating one without the other would silently break both.
   */
  const updateApplicationPhone = useMutation({
    mutationFn: async ({
      applicationId,
      phone,
      jobCode,
    }: {
      applicationId: number
      phone: string
      jobCode?: string | null
    }) => {
      const normalized = normalizeIlMobile(phone)
      if (!normalized) throw new Error(IL_MOBILE_ERROR)

      // Same logical duplicate key the manual-create dialog enforces:
      // one application per phone per job.
      if (jobCode) {
        const { data: clash } = await supabase
          .from('applications')
          .select('application_id')
          .eq('job_code', jobCode)
          .eq('phone_norm', normalized)
          .neq('application_id', applicationId)
          .limit(1)
        if (clash && clash.length > 0)
          throw new Error(`כבר קיימת הגשה עם נייד זה למשרה ${jobCode} (הגשה #${clash[0].application_id})`)
      }

      const { data, error } = await supabase
        .from('applications')
        .update({
          candidate_phone: phone.trim(),
          phone_norm: normalized,
          updated_timestamp: new Date().toISOString(),
        })
        .eq('application_id', applicationId)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('הנייד לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה')
    },
    onSuccess: () => {
      invalidate()
      toast.success('הנייד עודכן')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /**
   * Mark an application as spam / not relevant ("ספאם"):
   * check_status=2 + application_status=15 (archive). Classification only — no data is deleted.
   */
  const markSpam = useMutation({
    mutationFn: async (app: ApplicationRow) => {
      const { data: spamRes } = await supabase
        .from('dict_check_statuses')
        .select('id')
        .eq('name', 'ספאם')
        .maybeSingle()
      const spamId = spamRes?.id ?? 2

      const { data, error } = await supabase
        .from('applications')
        .update({
          check_status: spamId,
          application_status: ARCHIVE_STATUS,
          updated_timestamp: new Date().toISOString(),
        })
        .eq('application_id', app.application_id)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('הסימון לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה')
    },
    onSuccess: () => {
      invalidate()
      toast.success('סומן כספאם — הועבר לארכיון')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /** Send application data as a new lead to inbox_v2 (application stays in applications). */
  const sendToLeadsV2 = useMutation({
    mutationFn: async (app: ApplicationRow) => {
      // No DB unique constraint on inbox_v2.source_unique_key — dedupe here so a
      // double click doesn't create duplicate leads.
      const sourceKey = `application_${app.application_id}_${app.job_code}`
      const { data: existingLead } = await supabase
        .from('inbox_v2')
        .select('lead_id')
        .eq('source_unique_key', sourceKey)
        .maybeSingle()
      if (existingLead) throw new Error('הגשה זו כבר נשלחה ללידים')

      const { error } = await supabase.from('inbox_v2').insert({
        display_name: app.candidate_name,
        phone: app.candidate_phone,
        phone_norm: app.phone_norm,
        email: app.candidate_email,
        source_name: 'הגשת מועמדות באתר',
        source_unique_key: sourceKey,
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
    onSuccess: () => {
      // The new lead lands in inbox_v2 — Inbox 2 must refresh, or the lead is
      // invisible there until a manual reload (INC-3116).
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-stats'] })
      toast.success('נשלח ללידים בהצלחה')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /** Set application status to 15 = "לא דנטלי - ארכיון". */
  const archiveApplication = useMutation({
    mutationFn: async (applicationId: number) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ application_status: ARCHIVE_STATUS, updated_timestamp: new Date().toISOString() })
        .eq('application_id', applicationId)
        .select('application_id')
      if (error) throw error
      if (!data || data.length === 0)
        throw new Error('הארכוב לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה')
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
    linkApplicationToContact,
    updateApplicationPhone,
    markSpam,
    sendToLeadsV2,
    archiveApplication,
  }
}
