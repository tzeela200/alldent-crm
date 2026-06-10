import { supabase } from '@/lib/supabase'

export interface PublicJob {
  job_code: string
  job_title: string
  job_role: number | null
  job_role_name: string | null
  job_sub_role: number | null
  job_sub_role_name: string | null
  scope: number | null
  scope_name: string | null
  required_experience: number | null
  required_experience_name: string | null
  required_languages: string | null
  region_id: number | null
  region_name: string | null
  city_id: number | null
  city_name: string | null
  salary_range: string | null
  job_description: string | null
  job_requirements: string | null
  last_publish_date: string | null
  created_time: string | null
  updated_timestamp: string | null
  job_url: string | null
  image_url: string | null
}

export interface PublicJobFilters {
  search?: string
  role?: string
  region?: string
  city?: string
  scope?: string
  experience?: string
  sort?: 'newest' | 'city' | 'role'
}

const ALLOWED_FIELDS = [
  'job_code', 'job_title', 'job_role', 'job_role_name',
  'job_sub_role', 'job_sub_role_name', 'scope', 'scope_name',
  'required_experience', 'required_experience_name', 'required_languages',
  'region_id', 'region_name', 'city_id', 'city_name',
  'salary_range', 'job_description', 'job_requirements',
  'last_publish_date', 'created_time', 'updated_timestamp',
  'job_url', 'image_url',
] as const

export function stripPrivateInfo(row: Record<string, unknown>): PublicJob {
  const safe: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    safe[field] = row[field] ?? null
  }
  return safe as unknown as PublicJob
}

export async function getPublicJobs(filters: PublicJobFilters = {}): Promise<PublicJob[]> {
  let query = supabase.from('public_jobs_view').select('*')

  if (filters.search) {
    const q = filters.search.trim()
    query = query.or(
      `job_code.ilike.%${q}%,job_title.ilike.%${q}%,job_role_name.ilike.%${q}%,city_name.ilike.%${q}%,region_name.ilike.%${q}%,job_description.ilike.%${q}%`
    )
  }
  if (filters.role) query = query.eq('job_role_name', filters.role)
  if (filters.region) query = query.eq('region_name', filters.region)
  if (filters.city) query = query.eq('city_name', filters.city)
  if (filters.scope) query = query.eq('scope_name', filters.scope)
  if (filters.experience) query = query.eq('required_experience_name', filters.experience)

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
    .from('public_jobs_view')
    .select('*')
    .eq('job_code', jobCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? stripPrivateInfo(data as Record<string, unknown>) : null
}
