import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DictItem {
  id: number;
  name: string;
}

export interface CandidateTagDictItem extends DictItem {
  sort_order?: number | null;
}

export interface SubRoleItem extends DictItem {
  role_id: number | null;
}

export interface CityItem extends DictItem {
  region_id: number | null;
}

export interface Contact360Dicts {
  roles: DictItem[];
  subRoles: SubRoleItem[];
  availability: DictItem[];
  cities: CityItem[];
  regions: DictItem[];
  sources: DictItem[];
  checkStatuses: DictItem[];
  socialStatuses: DictItem[];
  profileTypes: DictItem[];
  experience: DictItem[];
  applicationStatuses: DictItem[];
  jobStatuses: DictItem[];
  candidateTags: CandidateTagDictItem[];
  scopes: DictItem[];
  genders: DictItem[];
  languages: DictItem[];
  taxTypes: DictItem[];
  mobility: DictItem[];
  systems: DictItem[];
  procedures: DictItem[];
  salaryTypes: DictItem[];
  workStatuses: DictItem[];
}

export interface ContactRow {
  contact_id: number;
  phone: string | null;
  phone_norm: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  second_phone: string | null;
  second_email: string | null;
  role: number | null;
  sub_role: number[] | null;
  experience: number | null;
  preferred_scope: number[] | null;
  languages: number[] | null;
  candidate_availability_ids: number[] | null;
  candidate_salary_type_ids: number[] | null;
  work_status: number | null;
  region_id: number | null;
  city_id: number | null;
  cv_link: string | null;
  has_cv: boolean | null;
  cv_received_date: string | null;
  account_link: number | null;
  profile_type: number | null;
  source: number | null;
  check_status: number | null;
  social_status: number | null;
  facebook_url: string | null;
  facebook_name: string | null;
  facebook_id: number | null;
  whatsapp_campaign_last_sent: string | null;
  last_contact_date: string | null;
  next_follow_up: string | null;
  candidate_status_date: string | null;
  prev_applications_count: number | null;
  notes: string | null;
  personal_summary: string | null;
  created_timestamp: string | null;
  updated_timestamp: string | null;
  gender: number | null;
  license_no: string | null;
  linked_org_name: string | null;
  dup_email_flag: boolean | null;
  professional_title: string | null;
  systems_used: number[] | null;
  procedures_experience: number[] | null;
  current_employer: string | null;
  previous_employers: Array<{ name?: string; role?: string; years?: string; description?: string }> | null;
  tax_type_id: number | null;
  mobility_id: number | null;
  birth_year: number | null;
  salary_expectation_hourly: number | null;
  salary_expectation_monthly: number | null;
  ai_profile_summary: string | null;
  extended_data: Record<string, unknown> | null;
  additional_skills_notes: string | null;
  academic_education: string | null;
  professional_courses: string | null;
  preferred_regions: number[] | null;
  preferred_cities: number[] | null;
  portfolio_url: string | null;
  recommendations_url: string | null;
  profile_token: string | null;
  preferred_all_country: boolean | null;
  locality_type: string | null;
  work_schedule_text: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  candidate_notes: string | null;
  cv_storage_path: string | null;
}

export interface ApplicationRow {
  application_id: number;
  job_code: string | null;
  candidate_link: number | null;
  phone_norm: string | null;
  application_status: number | null;
  check_status: number | null;
  submission_date: string | null;
  internal_notes: string | null;
  created_timestamp: string | null;
  updated_timestamp: string | null;
  account_name: string | null;
  job_role: string | null;
  job_city: string | null;
  job_region: string | null;
  candidate_name: string | null;
  has_cv: boolean | null;
  cv_link: string | null;
  cv_storage_path: string | null;
}

export interface ContactTagRow {
  id: number;
  contact_id: number;
  tag_id: number | null;
  tag: string;
  created_at: string;
}

export interface AccountRow {
  account_id: number;
  account_name: string;
  region_id: number | null;
  city_id: number | null;
  phone: string | null;
  email: string | null;
}

export interface JobRow {
  job_code: string;
  job_title: string;
  job_status: number | null;
  job_role: number | null;
  job_sub_role: number[] | null;
  scope: number[] | null;
  work_schedule_text?: string | null;
  systems_used?: number[] | null;
  required_languages?: number[] | null;
  salary_type_ids?: number[] | null;
  tax_type_id?: number | null;
  mobility_id?: number | null;
  required_experience: number | null;
  region_id: number | null;
  city_id: number | null;
  account_link: number | null;
  account_name?: string;
}

export interface LinkedJobRow {
  job_code: string;
  job_title: string;
  job_status: number | null;
  account_link: number | null;
  account_name?: string;
  rel_employer_contact: number | null;
  rel_recruiter_contact: number | null;
}

export class ContactNotFoundError extends Error {
  constructor(contactId: number) {
    super(`Contact ${contactId} was not found`);
    this.name = "ContactNotFoundError";
  }
}

export function isContactNotFoundError(error: unknown): error is ContactNotFoundError {
  return error instanceof ContactNotFoundError ||
    (error instanceof Error && error.name === "ContactNotFoundError");
}

function throwQueryError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function fetchContact360(contactId: number) {
  const [contactRes, dictsRes] = await Promise.all([
    supabase.from("contact").select("*").eq("contact_id", contactId).maybeSingle(),
    fetchAllDicts(),
  ]);

  throwQueryError("טעינת איש הקשר נכשלה", contactRes.error);
  if (!contactRes.data) throw new ContactNotFoundError(contactId);
  const contact = contactRes.data as ContactRow;

  const applicationsQuery = supabase
    .from("applications")
    .select("*")
    .order("submission_date", { ascending: false });
  const scopedApplicationsQuery = contact.phone_norm
    ? applicationsQuery.or(`candidate_link.eq.${contact.contact_id},phone_norm.eq.${contact.phone_norm}`)
    : applicationsQuery.eq("candidate_link", contact.contact_id);

  const [applicationsRes, tagsRes, accountRes, jobsRes, linkedJobsRes] = await Promise.all([
    scopedApplicationsQuery,
    supabase
      .from("contact_tags")
      .select("id, contact_id, tag_id, tag, created_at")
      .eq("contact_id", contact.contact_id)
      .order("created_at", { ascending: true }),
    contact.account_link
      ? supabase
          .from("accounts")
          .select("account_id, account_name, region_id, city_id, phone, email")
          .eq("account_id", contact.account_link)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("job")
      .select("job_code, job_title, job_status, job_role, job_sub_role, scope, required_experience, region_id, city_id, account_link, work_schedule_text, systems_used, required_languages, salary_type_ids, tax_type_id, mobility_id, accounts(account_name)")
      .eq("job_status", 3),
    supabase
      .from("job")
      .select("job_code, job_title, job_status, account_link, rel_employer_contact, rel_recruiter_contact, accounts(account_name)")
      .or(`rel_recruiter_contact.eq.${contact.contact_id},rel_employer_contact.eq.${contact.contact_id}`),
  ]);

  throwQueryError("טעינת ההגשות נכשלה", applicationsRes.error);
  throwQueryError("טעינת התגיות נכשלה", tagsRes.error);
  throwQueryError("טעינת הארגון המקושר נכשלה", accountRes.error);
  throwQueryError("טעינת המשרות הפעילות נכשלה", jobsRes.error);
  throwQueryError("טעינת המשרות המקושרות נכשלה", linkedJobsRes.error);

  const jobs: JobRow[] = (jobsRes.data ?? []).map((j: Record<string, unknown>) => {
    const { accounts: accountData, ...rest } = j;
    return {
      ...(rest as Omit<JobRow, "account_name">),
      account_name: (accountData as { account_name: string } | null)?.account_name ?? undefined,
    };
  });

  const linkedJobs: LinkedJobRow[] = (linkedJobsRes.data ?? []).map((j: Record<string, unknown>) => {
    const { accounts: accountData, ...rest } = j;
    return {
      ...(rest as Omit<LinkedJobRow, "account_name">),
      account_name: (accountData as { account_name: string } | null)?.account_name ?? undefined,
    };
  });

  return {
    contact,
    applications: (applicationsRes.data ?? []) as ApplicationRow[],
    tags: (tagsRes.data ?? []) as ContactTagRow[],
    account: (accountRes.data ?? null) as AccountRow | null,
    jobs,
    linkedJobs,
    dicts: dictsRes,
  };
}

async function fetchAllDicts(): Promise<Contact360Dicts> {
  const [
    rolesRes,
    subRolesRes,
    availRes,
    citiesRes,
    regionsRes,
    sourcesRes,
    checkRes,
    socialRes,
    profileRes,
    expRes,
    appStatusRes,
    jobStatusRes,
    candidateTagsRes,
    scopesRes,
    gendersRes,
    languagesRes,
    taxTypesRes,
    mobilityRes,
    systemsRes,
    proceduresRes,
    salaryTypesRes,
    workStatusesRes,
  ] = await Promise.all([
    supabase.from("dict_roles").select("id, name").order("id"),
    supabase.from("dict_sub_roles").select("id, name, role_id").order("id"),
    supabase.from("dict_availability").select("id, name").order("id"),
    supabase.from("dict_cities").select("id, name, region_id").order("name").limit(5000),
    supabase.from("dict_regions").select("id, name").order("id"),
    supabase.from("dict_sources").select("id, name").order("id"),
    supabase.from("dict_check_statuses").select("id, name").order("id"),
    supabase.from("dict_social_statuses").select("id, name").order("id"),
    supabase.from("dict_profile_types").select("id, name").order("id"),
    supabase.from("dict_experience").select("id, name").order("id"),
    supabase.from("dict_application_statuses").select("id, name").order("id"),
    supabase.from("dict_job_statuses").select("id, name").order("id"),
    supabase
      .from("dict_candidate_tags")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("id"),
    supabase.from("dict_scopes").select("id, name").order("id"),
    supabase.from("dict_genders").select("id, name").order("id"),
    supabase.from("dict_languages").select("id, name").order("name"),
    supabase.from("dict_tax_types").select("id, name").order("id"),
    supabase.from("dict_mobility").select("id, name").order("id"),
    supabase.from("dict_systems").select("id, name").order("name"),
    supabase.from("dict_procedures").select("id, name").order("name"),
    supabase.from("dict_salary_types").select("id, name").order("id"),
    supabase.from("dict_contact_work_statuses").select("id, name").order("sort_order"),
  ]);

  throwQueryError("טעינת מילון תפקידים נכשלה", rolesRes.error);
  throwQueryError("טעינת מילון תתי־תפקידים נכשלה", subRolesRes.error);
  throwQueryError("טעינת מילון זמינות נכשלה", availRes.error);
  throwQueryError("טעינת מילון ערים נכשלה", citiesRes.error);
  throwQueryError("טעינת מילון אזורים נכשלה", regionsRes.error);
  throwQueryError("טעינת מילון מקורות נכשלה", sourcesRes.error);
  throwQueryError("טעינת מילון סטטוסי בדיקה נכשלה", checkRes.error);
  throwQueryError("טעינת מילון סטטוסי מדיה נכשלה", socialRes.error);
  throwQueryError("טעינת מילון סוגי פרופיל נכשלה", profileRes.error);
  throwQueryError("טעינת מילון ניסיון נכשלה", expRes.error);
  throwQueryError("טעינת מילון סטטוסי הגשה נכשלה", appStatusRes.error);
  throwQueryError("טעינת מילון סטטוסי משרה נכשלה", jobStatusRes.error);
  throwQueryError("טעינת מילון תגיות מועמד נכשלה", candidateTagsRes.error);
  throwQueryError("טעינת מילון היקפים נכשלה", scopesRes.error);
  throwQueryError("טעינת מילון מגדרים נכשלה", gendersRes.error);
  throwQueryError("טעינת מילון שפות נכשלה", languagesRes.error);
  throwQueryError("טעינת מילון סוגי מס נכשלה", taxTypesRes.error);
  throwQueryError("טעינת מילון ניידות נכשלה", mobilityRes.error);
  throwQueryError("טעינת מילון מערכות נכשלה", systemsRes.error);
  throwQueryError("טעינת מילון פרוצדורות נכשלה", proceduresRes.error);
  throwQueryError("טעינת מילון סוגי שכר נכשלה", salaryTypesRes.error);
  throwQueryError("טעינת מילון סטטוסי תעסוקה נכשלה", workStatusesRes.error);

  return {
    roles: (rolesRes.data ?? []) as DictItem[],
    subRoles: (subRolesRes.data ?? []) as SubRoleItem[],
    availability: (availRes.data ?? []) as DictItem[],
    cities: (citiesRes.data ?? []) as CityItem[],
    regions: (regionsRes.data ?? []) as DictItem[],
    sources: (sourcesRes.data ?? []) as DictItem[],
    checkStatuses: (checkRes.data ?? []) as DictItem[],
    socialStatuses: (socialRes.data ?? []) as DictItem[],
    profileTypes: (profileRes.data ?? []) as DictItem[],
    experience: (expRes.data ?? []) as DictItem[],
    applicationStatuses: (appStatusRes.data ?? []) as DictItem[],
    jobStatuses: (jobStatusRes.data ?? []) as DictItem[],
    candidateTags: (candidateTagsRes.data ?? []) as CandidateTagDictItem[],
    scopes: (scopesRes.data ?? []) as DictItem[],
    genders: (gendersRes.data ?? []) as DictItem[],
    languages: (languagesRes.data ?? []) as DictItem[],
    taxTypes: (taxTypesRes.data ?? []) as DictItem[],
    mobility: (mobilityRes.data ?? []) as DictItem[],
    systems: (systemsRes.data ?? []) as DictItem[],
    procedures: (proceduresRes.data ?? []) as DictItem[],
    salaryTypes: (salaryTypesRes.data ?? []) as DictItem[],
    workStatuses: (workStatusesRes.data ?? []) as DictItem[],
  };
}

export function useContact360Dicts(enabled = true) {
  return useQuery({
    queryKey: ["contact360dicts"],
    queryFn: fetchAllDicts,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useContact360(contactId: number) {
  return useQuery({
    queryKey: ["contact360", contactId],
    queryFn: () => fetchContact360(contactId),
    enabled: !!contactId && contactId > 0,
    staleTime: 30_000,
  });
}
