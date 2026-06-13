import { supabase } from '@/lib/supabase'

export interface PublicJob {
  job_code: string
  job_title: string
  public_excerpt: string | null
  public_image_url: string | null
  job_url: string | null

  job_role: number | null
  job_role_name: string | null
  job_sub_role: number[] | null
  job_sub_role_names: string[] | null

  city_id: number | null
  city_name: string | null
  region_id: number | null
  region_name: string | null

  scope: number[] | null
  scope_names: string[] | null

  required_experience: number | null
  required_experience_name: string | null

  required_languages: number[] | null
  required_languages_names: string[] | null

  systems_used: number[] | null
  system_names: string[] | null

  mobility_id: number | null
  mobility_name: string | null

  tax_type_id: number | null
  tax_type_name: string | null

  job_description: string | null
  job_requirements: string | null

  salary_expectation_monthly: number | null
  salary_expectation_hourly: number | null
  show_salary_public: boolean | null

  published_at: string | null

  /**
   * Compatibility alias for existing components that still use last_publish_date.
   * Supabase v_job_public exposes published_at, not last_publish_date.
   */
  last_publish_date: string | null
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

const PUBLIC_JOB_FIELDS = [
  'job_code',
  'job_title',
  'public_excerpt',
  'public_image_url',
  'job_url',

  'job_role',
  'job_role_name',
  'job_sub_role',
  'job_sub_role_names',

  'city_id',
  'city_name',
  'region_id',
  'region_name',

  'scope',
  'scope_names',

  'required_experience',
  'required_experience_name',

  'required_languages',
  'required_languages_names',

  'systems_used',
  'system_names',

  'mobility_id',
  'mobility_name',

  'tax_type_id',
  'tax_type_name',

  'job_description',
  'job_requirements',

  'salary_expectation_monthly',
  'salary_expectation_hourly',
  'show_salary_public',

  'published_at',
] as const

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string')
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

export function stripPrivateInfo(row: Record<string, unknown>): PublicJob {
  const publishedAt = typeof row.published_at === 'string' ? row.published_at : null

  return {
    job_code: String(row.job_code ?? ''),
    job_title: String(row.job_title ?? ''),
    public_excerpt: typeof row.public_excerpt === 'string' ? row.public_excerpt : null,
    public_image_url: typeof row.public_image_url === 'string' ? row.public_image_url : null,
    job_url: typeof row.job_url === 'string' ? row.job_url : null,

    job_role: typeof row.job_role === 'number' ? row.job_role : row.job_role ? Number(row.job_role) : null,
    job_role_name: typeof row.job_role_name === 'string' ? row.job_role_name : null,
    job_sub_role: asNumberArray(row.job_sub_role),
    job_sub_role_names: asStringArray(row.job_sub_role_names),

    city_id: typeof row.city_id === 'number' ? row.city_id : row.city_id ? Number(row.city_id) : null,
    city_name: typeof row.city_name === 'string' ? row.city_name : null,
    region_id: typeof row.region_id === 'number' ? row.region_id : row.region_id ? Number(row.region_id) : null,
    region_name: typeof row.region_name === 'string' ? row.region_name : null,

    scope: asNumberArray(row.scope),
    scope_names: asStringArray(row.scope_names),

    required_experience:
      typeof row.required_experience === 'number'
        ? row.required_experience
        : row.required_experience
          ? Number(row.required_experience)
          : null,
    required_experience_name:
      typeof row.required_experience_name === 'string' ? row.required_experience_name : null,

    required_languages: asNumberArray(row.required_languages),
    required_languages_names: asStringArray(row.required_languages_names),

    systems_used: asNumberArray(row.systems_used),
    system_names: asStringArray(row.system_names),

    mobility_id:
      typeof row.mobility_id === 'number' ? row.mobility_id : row.mobility_id ? Number(row.mobility_id) : null,
    mobility_name: typeof row.mobility_name === 'string' ? row.mobility_name : null,

    tax_type_id:
      typeof row.tax_type_id === 'number' ? row.tax_type_id : row.tax_type_id ? Number(row.tax_type_id) : null,
    tax_type_name: typeof row.tax_type_name === 'string' ? row.tax_type_name : null,

    job_description: typeof row.job_description === 'string' ? row.job_description : null,
    job_requirements: typeof row.job_requirements === 'string' ? row.job_requirements : null,

    salary_expectation_monthly:
      typeof row.salary_expectation_monthly === 'number'
        ? row.salary_expectation_monthly
        : row.salary_expectation_monthly
          ? Number(row.salary_expectation_monthly)
          : null,
    salary_expectation_hourly:
      typeof row.salary_expectation_hourly === 'number'
        ? row.salary_expectation_hourly
        : row.salary_expectation_hourly
          ? Number(row.salary_expectation_hourly)
          : null,
    show_salary_public:
      typeof row.show_salary_public === 'boolean' ? row.show_salary_public : null,

    published_at: publishedAt,
    last_publish_date: publishedAt,
  }
}

export async function getPublicJobs(filters: PublicJobFilters = {}): Promise<PublicJob[]> {
  let query = supabase
    .from('v_job_public')
    .select(PUBLIC_JOB_FIELDS.join(','))

  if (filters.search) {
    const q = filters.search.trim()
    query = query.or(
      `job_code.ilike.%${q}%,job_title.ilike.%${q}%,job_role_name.ilike.%${q}%,city_name.ilike.%${q}%,region_name.ilike.%${q}%,public_excerpt.ilike.%${q}%`
    )
  }

  if (filters.role) query = query.eq('job_role_name', filters.role)
  if (filters.region) query = query.eq('region_name', filters.region)
  if (filters.city) query = query.eq('city_name', filters.city)
  if (filters.experience) query = query.eq('required_experience_name', filters.experience)
  if (filters.scope) query = query.contains('scope_names', [filters.scope])

  if (filters.sort === 'city') {
    query = query.order('city_name', { ascending: true })
  } else if (filters.sort === 'role') {
    query = query.order('job_role_name', { ascending: true })
  } else {
    query = query.order('published_at', { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => stripPrivateInfo(row as unknown as Record<string, unknown>))
}

export async function getPublicJob(jobCode: string): Promise<PublicJob | null> {
  const { data, error } = await supabase
    .from('v_job_public')
    .select(PUBLIC_JOB_FIELDS.join(','))
    .eq('job_code', jobCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data ? stripPrivateInfo(data as unknown as Record<string, unknown>) : null
}

export async function getPublicJobByCode(jobCode: string): Promise<PublicJob | null> {
  return getPublicJob(jobCode)
}