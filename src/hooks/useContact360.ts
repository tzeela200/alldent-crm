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
  whatsapp_last_delivery_status: string | null;
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
  /** Internal recruiter note on the application. Not the candidate's own text. */
  internal_notes: string | null;
  /** What the candidate wrote in the public application form. Display only. */
  candidate_notes: string | null;
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
  /**
   * Live job_status pulled from `job` via the job_code FK — never the stale
   * text copies kept on the application row. Null when the job is missing.
   */
  job_status_live: number | null;
  /** job.address, for the WhatsApp handoff template. Null when job missing or unset. */
  job_address: string | null;
  /** accounts.website_url for the job's employer, for the handoff template. */
  org_website_url: string | null;
  /** contact.full_name of job.rel_recruiter_contact, resolved separately. */
  recruiter_name: string | null;
}

export interface ContactProfileRow {
  profile_type_id: number;
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
    // job(...) rides the applications_job_code_fkey relationship so the table
    // can show the *current* job status/address/employer instead of the text
    // snapshots frozen on the application row (used for the WhatsApp handoff
    // template — see recruiter lookup below for rel_recruiter_contact's name).
    .select("*, job(job_status, address, rel_recruiter_contact, accounts(website_url))")
    .order("submission_date", { ascending: false });
  const scopedApplicationsQuery = contact.phone_norm
    ? applicationsQuery.or(`candidate_link.eq.${contact.contact_id},phone_norm.eq.${contact.phone_norm}`)
    : applicationsQuery.eq("candidate_link", contact.contact_id);

  const [applicationsRes, profilesRes, tagsRes, accountRes, jobsRes, linkedJobsRes] = await Promise.all([
    scopedApplicationsQuery,
    supabase
      .from("rel_contact_profiles")
      .select("profile_type_id")
      .eq("contact_id", contact.contact_id),
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
  throwQueryError("טעינת סוגי הפרופיל נכשלה", profilesRes.error);
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

  type EmbeddedJob = {
    job_status: number | null;
    address: string | null;
    rel_recruiter_contact: number | null;
    accounts: { website_url: string | null } | null;
  } | null;

  const rawApplications = (applicationsRes.data ?? []) as Array<Record<string, unknown>>;
  const recruiterIds = Array.from(new Set(
    rawApplications
      .map((row) => (row.job as EmbeddedJob)?.rel_recruiter_contact)
      .filter((id): id is number => id != null),
  ));
  const recruiterNamesRes = recruiterIds.length
    ? await supabase.from("contact").select("contact_id, full_name, display_name").in("contact_id", recruiterIds)
    : { data: [] as Array<{ contact_id: number; full_name: string | null; display_name: string | null }>, error: null };
  throwQueryError("טעינת שמות המגייסים נכשלה", recruiterNamesRes.error);
  const recruiterNameById = new Map(
    (recruiterNamesRes.data ?? []).map((row) => [Number(row.contact_id), row.full_name ?? row.display_name ?? null]),
  );

  const applications: ApplicationRow[] = rawApplications.map((row) => {
    const { job: jobData, ...rest } = row;
    const embeddedJob = jobData as EmbeddedJob;
    return {
      ...(rest as Omit<ApplicationRow, "job_status_live" | "job_address" | "org_website_url" | "recruiter_name">),
      job_status_live: embeddedJob?.job_status ?? null,
      job_address: embeddedJob?.address ?? null,
      org_website_url: embeddedJob?.accounts?.website_url ?? null,
      recruiter_name: embeddedJob?.rel_recruiter_contact != null
        ? recruiterNameById.get(Number(embeddedJob.rel_recruiter_contact)) ?? null
        : null,
    };
  });

  return {
    contact,
    applications,
    profileTypeIds: Array.from(new Set([
      ...(profilesRes.data ?? []).map((row: ContactProfileRow) => Number(row.profile_type_id)),
      ...(contact.profile_type ? [Number(contact.profile_type)] : []),
    ].filter(Number.isFinite))),
    tags: (tagsRes.data ?? []) as ContactTagRow[],
    account: (accountRes.data ?? null) as AccountRow | null,
    jobs,
    linkedJobs,
    dicts: dictsRes,
  };
}

/**
 * dict_cities has ~1300 rows; PostgREST caps any single request at 1000
 * regardless of .limit(), so a plain select silently drops everything past
 * row 1000 alphabetically (e.g. "תל-אביב"). Paginate in 1000-row pages until
 * a short page confirms the end — same pattern already used by
 * CityRegionPicker's useCitiesAll.
 */
async function fetchAllCities(): Promise<{ data: CityItem[] | null; error: { message: string } | null }> {
  const PAGE = 1000;
  const all: CityItem[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("dict_cities")
      .select("id, name, region_id")
      .order("name")
      .range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    const batch = (data ?? []) as CityItem[];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, error: null };
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
    fetchAllCities(),
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
