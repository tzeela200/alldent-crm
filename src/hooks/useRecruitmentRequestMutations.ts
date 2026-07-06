import { supabase } from '@/lib/supabase'

export type RecruitmentRequestPayload = {
  requester_company_name: string
  requester_business_id: string | null
  requester_contact_name: string
  requester_phone: string
  requester_email: string
  publication_track_id: number
  job_role: number
  job_sub_role: number[]
  region_id: number
  city_id: number
  scope: number[]
  job_description: string
  job_requirements: string
  work_schedule_text: string | null
  required_experience: number
  required_languages: number[]
  systems_used: number[]
  mobility_id: number | null
  tax_type_id: number | null
  salary_expectation_monthly: number | null
  salary_expectation_hourly: number | null
  show_salary_public: boolean
  salary_type_ids: number[]
  employer_notes: string | null
  source_page: string | null
  source_url: string | null
}

export function useRecruitmentRequestMutations() {
  async function submitRecruitmentRequest(payload: RecruitmentRequestPayload) {
    const { data, error } = await supabase.rpc('submit_public_recruitment_request', {
      p_requester_company_name: payload.requester_company_name,
      p_requester_business_id: payload.requester_business_id,
      p_requester_contact_name: payload.requester_contact_name,
      p_requester_phone: payload.requester_phone,
      p_requester_email: payload.requester_email,
      p_publication_track_id: payload.publication_track_id,
      p_job_role: payload.job_role,
      p_job_sub_role: payload.job_sub_role,
      p_region_id: payload.region_id,
      p_city_id: payload.city_id,
      p_scope: payload.scope,
      p_job_description: payload.job_description,
      p_job_requirements: payload.job_requirements,
      p_work_schedule_text: payload.work_schedule_text,
      p_required_experience: payload.required_experience,
      p_required_languages: payload.required_languages,
      p_systems_used: payload.systems_used,
      p_mobility_id: payload.mobility_id,
      p_tax_type_id: payload.tax_type_id,
      p_salary_expectation_monthly: payload.salary_expectation_monthly,
      p_salary_expectation_hourly: payload.salary_expectation_hourly,
      p_show_salary_public: payload.show_salary_public,
      p_salary_type_ids: payload.salary_type_ids,
      p_employer_notes: payload.employer_notes,
      p_source_page: payload.source_page,
      p_source_url: payload.source_url,
    })
    if (error) return { data: null, error }
    const row = Array.isArray(data) ? data[0] : data
    return { data: row as { status: string; job_code: string } | null, error: null }
  }

  return { submitRecruitmentRequest }
}
