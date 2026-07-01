// src/lib/contactForm.ts
// Centralized form helpers for contact edit forms.
// Single source of truth for form ↔ DB field mapping and patch building.

export type FormState = Record<string, unknown>;

/** Coerce any value to a string so a controlled <select value=...> matches its string option values. */
export function selectValue(value: unknown): string {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

export function nullableString(form: FormState, field: string): string | null {
  const value = form[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function nullableNumber(form: FormState, field: string): number | null {
  const value = form[field];
  return value === null || value === undefined || value === "" ? null : Number(value);
}

export function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter(Number.isFinite);
}

export function splitFullName(full: string | null | undefined): { first_name: string; last_name: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/** If a record has city_id but no region_id, recover region_id from the city dictionary. */
export function deriveRegionFromCity(
  form: FormState,
  cities: { id: number; region_id: number | null }[],
): FormState {
  if (form.city_id != null && (form.region_id == null || form.region_id === "")) {
    const city = cities.find((c) => Number(c.id) === Number(form.city_id));
    if (city?.region_id != null) return { ...form, region_id: city.region_id };
  }
  return form;
}

function normalizePatchValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? null;
}

function isPatchValueEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizePatchValue(a)) === JSON.stringify(normalizePatchValue(b));
}

/**
 * Build a minimal patch of only the fields that changed.
 *
 * NAME FIX: full_name/display_name are taken from their own edited fields first,
 * and only derived from first/last when the explicit field is empty — so editing
 * unrelated fields can never wipe a real full_name/display_name.
 */
export function buildContactPatch(form: FormState, original: FormState): Record<string, unknown> {
  const first = nullableString(form, "first_name");
  const last = nullableString(form, "last_name");
  const derivedFull = [first, last].filter(Boolean).join(" ") || null;
  const fullName = nullableString(form, "full_name") ?? derivedFull;
  const displayName = nullableString(form, "display_name") ?? fullName;

  const candidatePatch: Record<string, unknown> = {
    first_name: first,
    last_name: last,
    full_name: fullName,
    display_name: displayName,
    phone: nullableString(form, "phone"),
    second_phone: nullableString(form, "second_phone"),
    email: nullableString(form, "email"),
    second_email: nullableString(form, "second_email"),
    region_id: nullableNumber(form, "region_id"),
    city_id: nullableNumber(form, "city_id"),
    gender: nullableNumber(form, "gender"),
    birth_year: nullableNumber(form, "birth_year"),
    role: nullableNumber(form, "role"),
    sub_role: toNumberArray(form.sub_role),
    experience: nullableNumber(form, "experience"),
    professional_title: nullableString(form, "professional_title"),
    license_no: nullableString(form, "license_no"),
    mobility_id: nullableNumber(form, "mobility_id"),
    tax_type_id: nullableNumber(form, "tax_type_id"),
    preferred_regions: toNumberArray(form.preferred_regions),
    preferred_cities: toNumberArray(form.preferred_cities),
    preferred_scope: toNumberArray(form.preferred_scope),
    candidate_availability_ids: toNumberArray(form.candidate_availability_ids),
    candidate_salary_type_ids: toNumberArray(form.candidate_salary_type_ids),
    languages: toNumberArray(form.languages),
    systems_used: toNumberArray(form.systems_used),
    check_status: nullableNumber(form, "check_status"),
    social_status: nullableNumber(form, "social_status"),
    source: nullableNumber(form, "source"),
    profile_type: nullableNumber(form, "profile_type"),
    work_status: nullableNumber(form, "work_status"),
    next_follow_up: nullableString(form, "next_follow_up"),
    last_contact_date: nullableString(form, "last_contact_date"),
    notes: nullableString(form, "notes"),
    salary_expectation_monthly: nullableNumber(form, "salary_expectation_monthly"),
    salary_expectation_hourly: nullableNumber(form, "salary_expectation_hourly"),
    personal_summary: nullableString(form, "personal_summary"),
    academic_education: nullableString(form, "academic_education"),
    professional_courses: nullableString(form, "professional_courses"),
    additional_skills_notes: nullableString(form, "additional_skills_notes"),
    current_employer: nullableString(form, "current_employer"),
    work_schedule_text: nullableString(form, "work_schedule_text"),
    cv_link: nullableString(form, "cv_link"),
    cv_received_date: nullableString(form, "cv_received_date"),
    has_cv: Boolean(form.has_cv),
    portfolio_url: nullableString(form, "portfolio_url"),
    recommendations_url: nullableString(form, "recommendations_url"),
    preferred_all_country: Boolean(form.preferred_all_country),
    procedures_experience: toNumberArray(form.procedures_experience),
    facebook_url: nullableString(form, "facebook_url"),
    facebook_name: nullableString(form, "facebook_name"),
    facebook_id: nullableNumber(form, "facebook_id"),
  };

  const patch: Record<string, unknown> = {};
  Object.entries(candidatePatch).forEach(([field, value]) => {
    if (!isPatchValueEqual(value, original[field])) patch[field] = value;
  });
  if (Object.keys(patch).length > 0) patch.updated_timestamp = new Date().toISOString();
  return patch;
}
