// =====================================================
// AllDent CRM — Canonical Types
// Based on Supabase schema (27 tables, 40 FKs)
// =====================================================

// --- Dict / Reference Data ---
export interface DictItem {
  id: number
  name: string
  slug?: string
  color?: string
  sort_order?: number
  is_active?: boolean
}

// --- Contact (אדם) ---
export interface Contact {
  contact_id: number
  phone: string | null
  phone_norm: string // UNIQUE NOT NULL
  display_name: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  second_phone: string | null
  second_email: string | null
  role: number | null // → dict_roles
  sub_role: number | null // → dict_sub_roles
  candidate_availability_ids: number[] | null // → dict_availability (multi-value; canonical column)
  /** @deprecated column removed from DB (June 2026). Use candidate_availability_ids. Kept only so legacy read-sites compile; always undefined at runtime. */
  availability?: number | null
  experience: number | null // → dict_experience
  preferred_scope: string | null
  languages: string | null
  region_id: number | null // → dict_regions
  city_id: number | null // → dict_cities
  cv_link: string | null
  has_cv: boolean
  cv_received_date: string | null
  account_link: number | null // → accounts.account_id (FK קנוני)
  profile_type: number | null // → dict_profile_types (display only)
  source: number | null // → dict_sources
  check_status: number | null // → dict_check_statuses
  work_status?: number | null // → dict_contact_work_statuses
  social_status: number | null // → dict_social_statuses
  facebook_url: string | null
  facebook_name: string | null
  facebook_id: string | null
  whatsapp_campaign_last_sent: string | null
  last_contact_date: string | null
  next_follow_up: string | null
  candidate_status_date: string | null
  prev_applications_count: number
  notes: string | null
  linked_org_name: string | null
  gender: string | null
  license_no: string | null
  professional_title: string | null
  current_employer: string | null
  previous_employers: Record<string, unknown> | null // JSONB
  systems_used: number[] | null
  procedures_experience: number[] | null
  salary_expectation_hourly: number | null
  salary_expectation_monthly: number | null
  tax_type: string | null
  birth_year: number | null
  ai_profile_summary: string | null
  extended_data: Record<string, unknown> | null // JSONB
  mobility_id: number | null
  preferred_regions: number[] | null
  preferred_cities: number[] | null
  dup_email_flag: boolean | null
  created_timestamp: string | null
  updated_timestamp: string | null
}

// --- Account (ארגון) ---
export interface Account {
  account_id: number
  account_name: string | null
  bus_id: string | null // UNIQUE business key
  account_status: number | null // → dict_account_statuses
  account_type: number | null // → dict_account_types
  phone: string | null
  second_phone: string | null
  email: string | null
  second_email: string | null
  billing_email: string | null
  website_url: string | null
  facebook_url: string | null
  region_id: number | null // → dict_regions
  city_id: number | null // → dict_cities
  address: string | null
  contact_link: string | null // legacy TEXT — NOT canonical FK
  notes: string | null
  merged_into_account_id?: number | null // → accounts.account_id (set when converted to contact + merged)
  merged_at?: string | null
  active_job_count_auto: number
  total_jobs_count: number
  rel_role: string | null
  all_applicants_names: string | null
  clinic_type: string | null
  chairs_count: number | null
  specialties: string[] | null
  team_size: number | null
  hiring_roles: string[] | null
  systems_used: number[] | null
  extended_data: Record<string, unknown> | null
  last_contact_date: string | null
  next_follow_up: string | null
  whatsapp_last_sent: string | null
  created_timestamp: string | null
  updated_timestamp: string | null
}

// --- Job (משרה) ---
export interface Job {
  job_code: string // PK — TEXT
  account_link: number | null // → accounts.account_id
  job_status: number | null // → dict_job_statuses
  job_title: string | null
  job_role: number | null // → dict_roles
  job_sub_role: number | null // FK → dict_sub_roles (bigint ב-DB)
  scope: number | null // FK → dict_scopes (bigint ב-DB)
  required_experience: number | null // → dict_experience
  required_languages: string | null
  region_id: number | null // → dict_regions
  city_id: number | null // → dict_cities
  address: string | null
  salary_min: number | null
  salary_max: number | null
  salary_range: string | null
  job_description: string | null
  job_requirements: string | null
  job_url: string | null
  rel_employer_contact: number | null // → contact.contact_id
  rel_recruiter_contact: number | null // → contact.contact_id
  total_applicants: number
  channels: string[] | null
  date_facebook: string | null
  date_website: string | null
  date_whatsapp: string | null
  last_publish_date: string | null
  notes: string | null
  created_time: string | null
  updated_timestamp: string | null
  /** Populated by joinMockData / hooks from accounts — not on raw mock job rows */
  account_name?: string
}

/** Core `applications` row (canonical SSOT; align with live Supabase when available). */
export interface ApplicationRow {
  application_id: number
  job_code: string | null // → job.job_code
  candidate_link: number | null // → contact.contact_id
  phone_norm: string | null
  application_status: number | null // → dict_application_statuses
  check_status: number | null // → dict_check_statuses
  submission_date: string | null
  internal_notes: string | null
  created_timestamp: string | null
  updated_timestamp: string | null
}

/** Join/display projection for UI — produced in joinMockData, not stored on raw mocks. */
export interface ApplicationEnriched extends ApplicationRow {
  record_name: string | null
  display_date: string | null
  form_title: string | null
  job_link: string | null
  account_name: string | null
  job_role: string | null
  job_city: string | null
  job_region: string | null
  candidate_phone: string | null
  candidate_name: string | null
  candidate_email: string | null
  cv_link: string | null
  candidate_notes: string | null
  status_in_master: string | null
  job_status_view: string | null
  master_availability: string | null
  master_role: string | null
  master_city: string | null
  master_region: string | null
  record_quality: string | null
}

/** @deprecated Prefer ApplicationRow vs ApplicationEnriched; kept for gradual migration */
export type Application = ApplicationEnriched

// --- Inbox Lead (ליד) ---
export interface InboxLead {
  lead_id: number
  phone: string | null
  phone_norm: string | null
  display_name: string | null
  candidate_email: string | null
  facebook_id: string | null
  facebook_name: string | null
  facebook_url: string | null
  record_key: string | null
  dup_count: number
  is_duplicate: boolean | null
  lead_source: number | null // → dict_sources
  inbox_date: string | null
  entity_type: string | null // מועמד / ארגון / לא רלוונטי
  temp_role: string | null
  temp_city: string | null
  notes: string | null
  match_contact: number | null // → contact.contact_id
  match_account: number | null // → accounts.account_id
  action_intent: string | null
  availability_upd: string | null
  account_status_upd: string | null
  check_status_upd: string | null
  social_status: number | null
  next_follow_up: string | null
  last_action_date: string | null
  original_content: string | null
  created_timestamp: string | null
}

// --- Contact Tag ---
export interface ContactTag {
  id: number
  contact_id: number
  tag: string
  created_at: string | null
}

// --- Smart Match Result ---
export interface MatchResult {
  contact: Contact
  score: number
  breakdown: {
    region: number // max 40
    role: number // max 30
    experience: number // max 15
    availability: number // max 15
  }
  hasExistingApplication: boolean
}

// --- Predefined Tags ---
export const PREDEFINED_TAGS = [
  'VIP',
  'זמינות-מיידית',
  'מחפש-אקטיבי',
  'מחפש-פסיבי',
  'אין-קו"ח',
  'ציפיות-שכר-גבוהות',
  'פוטנציאל-גבוה',
  'ללא-ניסיון',
  'מגורים-קרובים',
  'דגל-אדום-מבריז',
  'בוגר-הדסה',
] as const

// --- Profile Types ---
export const PROFILE_TYPES = {
  1: 'מועמד',
  2: 'מעסיק',
  3: 'מגייס',
  4: 'אנשי קשר',
  5: 'עובד ארגון',
} as const

// --- Filter types ---
export interface ContactFilters {
  search?: string
  role?: number
  sub_role?: number
  region_id?: number
  city_id?: number
  availability?: number
  experience?: number
  source?: number
  check_status?: number
  profile_type?: number
  has_cv?: boolean
  tags?: string[]
}

export interface JobFilters {
  search?: string
  job_status?: number
  job_role?: number
  region_id?: number
  city_id?: number
  account_link?: number
  scope?: string
}

export interface ApplicationFilters {
  search?: string
  application_status?: number
  check_status?: number
  job_code?: string
  job_role?: string
  date_from?: string
  date_to?: string
}

export interface InboxFilters {
  search?: string
  lead_source?: number
  entity_type?: string
  is_duplicate?: boolean
  action_intent?: string
  date_from?: string
  date_to?: string
}
