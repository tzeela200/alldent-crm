/** Matches the live `applications` Supabase table exactly. */
export interface ApplicationRow {
  application_id: number
  submission_date: string | null
  form_title: string | null
  job_code: string | null
  job_link: string | null
  account_name: string | null
  job_role: string | null
  job_city: string | null
  job_region: string | null
  candidate_phone: string | null
  candidate_name: string | null
  candidate_email: string | null
  cv_link: string | null
  candidate_link: number | null
  candidate_notes: string | null
  check_status: number | null
  application_status: number | null
  master_role: string | null
  master_city: string | null
  master_region: string | null
  /** Nullable id columns paired with master_city / master_region.
   *  Optional: not every writer populates them. */
  master_city_id?: number | null
  master_region_id?: number | null
  internal_notes: string | null
  created_timestamp: string | null
  updated_timestamp: string | null
  phone_norm: string | null
  job_city_id: number | null
  job_region_id: number | null
  source: number | null
  is_manual: boolean
  is_new_candidate: boolean
  account_link: number | null
  follow_up_date: string | null
  assigned_to: string | null
  has_cv: boolean | null
  cv_storage_path: string | null
  cv_received_date: string | null
  candidate_availability_ids: number[] | null
  candidate_salary_type_ids: number[] | null

  // Enriched from contact (via candidate_link) — not in DB table
  contact_work_status?: number | null
  contact_availability?: number | null
  contact_profile_type?: number | null
  contact_role?: number | null
  contact_city_id?: number | null
  contact_region_id?: number | null
  contact_has_cv?: boolean | null
  contact_cv_link?: string | null
  contact_cv_storage_path?: string | null

  /**
   * Set when the row has NO candidate_link but a contact with the same
   * phone_norm already exists — i.e. the person is in the registry, this
   * application was just never linked to them (INC-3116).
   */
  registry_match_contact_id?: number | null
  registry_match_name?: string | null
  contact_cv_received_date?: string | null
  contact_display_name?: string | null

  // Enriched from job (via job_code) — not in DB table
  job_status?: number | null
  job_title_from_job?: string | null
  job_role_id?: number | null
  job_city_id_from_job?: number | null
  job_region_id_from_job?: number | null
}

export type CvFilter = 'all' | 'with' | 'without'
export type InDbFilter = 'existing' | 'new'

export interface ApplicationFilters {
  search?: string
  application_status?: number
  /**
   * Match any of these statuses. Used where a KPI card counts a range of
   * statuses — the click filter must select the same range, or the card and
   * the list disagree (INC-3116).
   */
  application_status_in?: number[]
  check_status?: number
  source?: number
  job_region_id?: number
  /**
   * Exact `applications.job_role` names to match. Replaces the old free-text
   * `ilike '%…%'` filter, which made "רופאים" also return every
   * "סייעת רופא שיניים" row (INC-3116). Names are resolved from the live
   * `dict_roles` — verified: every non-null job_role equals a dict_roles.name.
   */
  job_role_names?: string[]
  job_city_id?: number
  /** Exact job code — powers the "top job" KPI and the ?job= deep link. */
  job_code?: string
  /** ISO date; applications submitted on or after it (week/month KPI cards). */
  submitted_from?: string
  job_status?: number
  contact_work_status?: number
  contact_availability?: number
  in_db?: InDbFilter
  date_from?: string
  date_to?: string
  cv_state?: CvFilter
  is_manual?: boolean
  is_new_candidate?: boolean
  has_follow_up?: boolean
  active_apps_only?: boolean
  closed_apps_only?: boolean
  overdue_follow_up?: boolean
  account_name_search?: string
}

/** ספירה של קבוצת תפקיד אחת, עם השמות שבהם מסננים אותה. */
export interface ApplicationRoleCount {
  key: string
  label: string
  /** שמות `job_role` של הקבוצה — בדיוק מה שהלחיצה על הכרטיס תסנן. */
  names: string[]
  count: number
}

/**
 * המדדים שמוצגים מעל הטבלה. הוחלפו (INC-3116) — הקודמים כללו שני כרטיסים
 * שתמיד הציגו 0 (סטטוסים 12 ו-9 אינם בשימוש) ו"סה״כ" שכלל ארכיון וספאם.
 */
export interface ApplicationKPIs {
  /** כל ההגשות, כולל טרמינליות — לשורת הכותרת, לא לכרטיס. */
  total: number
  /** לא-טרמינליות (מחוץ ל-TERMINAL_STATUSES). */
  active: number
  newApps: number
  sentToEmployer: number
  missingCv: number
  thisWeek: number
  thisMonth: number
  byRole: ApplicationRoleCount[]
  topJobCode: string | null
  topJobCount: number
}
