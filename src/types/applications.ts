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
  master_availability: string | null
  master_role: string | null
  master_city: string | null
  master_region: string | null
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
}

export type CvFilter = 'all' | 'with' | 'without'

export interface ApplicationFilters {
  search?: string
  application_status?: number
  check_status?: number
  source?: number
  job_region_id?: number
  job_role?: string
  date_from?: string
  date_to?: string
  cv_state?: CvFilter
  is_manual?: boolean
  is_new_candidate?: boolean
  assigned_to?: string
  has_follow_up?: boolean
}

export interface ApplicationKPIs {
  total: number
  newApps: number
  waitingHandling: number
  advanced: number
  hires: number
  missingCv: number
  waitingEmployer: number
  archived: number
}
