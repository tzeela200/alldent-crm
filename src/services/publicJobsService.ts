import { supabase } from '@/lib/supabase'

export interface PublicJob {
  job_code: string
  job_title: string
  public_excerpt: string | null
  public_image_url: string | null
  job_url: string | null
  job_role: number | null
  job_role_name: string | null
  city_id: number | null
  city_name: string | null
  region_id: number | null
  region_name: string | null
  scope_names: string | null
  required_experience_name: string | null
  required_languages: string | null
  system_names: string | null
  mobility_name: string | null
  tax_type_name: string | null
  job_description: string | null
  job_requirements: string | null
  salary_expectation_monthly: number | null
  salary_expectation_hourly: number | null
  show_salary_public: boolean | null
  last_publish_date: string | null
  created_time: string | null
  updated_timestamp: string | null
}

export interface PublicJobFilters {
  search?: string
  role?: string
  region?: string
  city?: string
  sort?: 'newest' | 'city' | 'role'
}

const ALLOWED_FIELDS = [
  'job_code', 'job_title', 'public_excerpt', 'public_image_url', 'job_url',
  'job_role', 'job_role_name',
  'city_id', 'city_name', 'region_id', 'region_name',
  'scope_names', 'required_experience_name', 'required_languages',
  'system_names', 'mobility_name', 'tax_type_name',
  'job_description', 'job_requirements',
  'salary_expectation_monthly', 'salary_expectation_hourly', 'show_salary_public',
  'last_publish_date', 'created_time', 'updated_timestamp',
] as const

export function stripPrivateInfo(row: Record<string, unknown>): PublicJob {
  const safe: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    safe[field] = row[field] ?? null
  }
  return safe as unknown as PublicJob
}

export async function getPublicJobs(filters: PublicJobFilters = {}): Promise<PublicJob[]> {
  let query = supabase.from('v_job_public').select('*')

  if (filters.search) {
    const q = filters.search.trim()
    query = query.or(
      `job_code.ilike.%${q}%,job_title.ilike.%${q}%,job_role_name.ilike.%${q}%,city_name.ilike.%${q}%,region_name.ilike.%${q}%,public_excerpt.ilike.%${q}%`
    )
  }
  if (filters.role) query = query.eq('job_role_name', filters.role)
  if (filters.region) query = query.eq('region_name', filters.region)
  if (filters.city) query = query.eq('city_name', filters.city)

  if (filters.sort === 'city') {
    query = query.order('city_name', { ascending: true })
  } else if (filters.sort === 'role') {
    query = query.order('job_role_name', { ascending: true })
  } else {
    query = query.order('last_publish_date', { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(stripPrivateInfo)
}

export async function getPublicJob(jobCode: string): Promise<PublicJob | null> {
  const { data, error } = await supabase
    .from('v_job_public')
    .select('*')
    .eq('job_code', jobCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? stripPrivateInfo(data as Record<string, unknown>) : null
}

export async function getPublicJobByCode(jobCode: string): Promise<PublicJob | null> {
  const { data, error } = await supabase
    .from('v_job_public')
    .select(`
      public_image_url,
      job_code,
      job_title,
      public_excerpt,
      job_role_name,
      region_name,
      city_name,
      scope_names,
      required_experience_name,
      required_languages,
      system_names,
      mobility_name,
      tax_type_name,
      job_description,
      job_requirements,
      salary_expectation_monthly,
      salary_expectation_hourly,
      show_salary_public
    `)
    .eq('job_code', jobCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error(error)
    return null
  }
  return data as unknown as PublicJob
}
