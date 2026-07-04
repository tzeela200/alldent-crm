import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContactRow } from "@/hooks/useContact360";

// ─── SINGLE SOURCE OF TRUTH: public vs admin fields ─────────────────────────

export const CANDIDATE_PUBLIC_FIELDS = [
  "first_name", "last_name", "full_name", "display_name",
  "professional_title", "phone", "second_phone", "email", "second_email",
  "role", "sub_role", "experience", "candidate_availability_ids",
  "preferred_scope", "preferred_regions", "preferred_cities",
  "languages", "region_id", "city_id",
  "personal_summary", "ai_profile_summary",
  "academic_education", "professional_courses",
  "previous_employers", "current_employer",
  "systems_used", "procedures_experience",
  "salary_expectation_hourly", "salary_expectation_monthly",
  "portfolio_url", "recommendations_url",
  "cv_link", "has_cv", "birth_year", "gender",
  "license_no", "tax_type", "tax_type_id", "mobility_id",
  "additional_skills_notes", "facebook_url",
] as const;

// Admin-only fields (never exposed to candidate):
// check_status, social_status, dup_email_flag, source,
// facebook_id, facebook_name, whatsapp_campaign_last_sent,
// account_link, prev_applications_count, notes,
// created_timestamp, updated_timestamp, linked_org_name,
// extended_data, phone_norm, profile_type,
// last_contact_date, next_follow_up, candidate_status_date, cv_received_date

export type CandidatePublicFields = Pick<
  ContactRow,
  (typeof CANDIDATE_PUBLIC_FIELDS)[number]
>;

// ─── Fetch — selects only public fields ─────────────────────────────────────

async function fetchCandidateProfile(contactId: number) {
  const { data, error } = await supabase
    .from("contact")
    .select(CANDIDATE_PUBLIC_FIELDS.join(", ") + ", contact_id")
    .eq("contact_id", contactId)
    .single();
  if (error) throw error;
  return data as unknown as CandidatePublicFields & { contact_id: number };
}

// ─── Update — strips admin fields before saving ─────────────────────────────

export async function updateCandidateProfile(
  contactId: number,
  fields: Partial<CandidatePublicFields>,
  token?: string,
) {
  const safe = Object.fromEntries(
    Object.entries(fields).filter(([key]) =>
      (CANDIDATE_PUBLIC_FIELDS as readonly string[]).includes(key),
    ),
  );

  if (token) {
    // Public self-edit via the token link (/profile/:token) — goes through a
    // security-definer RPC that validates the token server-side. Not gated by
    // table RLS, so this keeps working regardless of anon table permissions.
    const { error } = await supabase.rpc("update_profile_by_token", {
      p_token: token,
      p_fields: safe,
    });
    if (error) throw error;
    return;
  }

  // Admin edit (logged-in session, e.g. Candidate360Page) — direct table update,
  // gated by the "Authenticated users full access" RLS policy on contact.
  const { error } = await supabase
    .from("contact")
    .update(safe)
    .eq("contact_id", contactId);
  if (error) throw error;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCandidateProfile(contactId: number) {
  return useQuery({
    queryKey: ["candidateProfile", contactId],
    queryFn: () => fetchCandidateProfile(contactId),
    enabled: !!contactId && contactId > 0,
    staleTime: 30_000,
  });
}

export function useUpdateCandidateProfile(contactId: number, token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: Partial<CandidatePublicFields>) =>
      updateCandidateProfile(contactId, fields, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidateProfile", contactId] });
      if (token) qc.invalidateQueries({ queryKey: ["candidateProfileByToken", token] });
    },
  });
}

// ─── Token-based access (public link for candidates) ────────────────────────

async function fetchCandidateProfileByToken(token: string) {
  const { data, error } = await supabase
    .rpc("get_profile_by_token", { p_token: token })
    .single();
  if (error) throw error;
  // Strip admin fields from the result
  const row = data as Record<string, unknown>;
  const publicFields = Object.fromEntries(
    Object.entries(row).filter(
      ([key]) =>
        (CANDIDATE_PUBLIC_FIELDS as readonly string[]).includes(key) ||
        key === "contact_id",
    ),
  );
  return publicFields as unknown as CandidatePublicFields & { contact_id: number };
}

export function useCandidateProfileByToken(token: string) {
  return useQuery({
    queryKey: ["candidateProfileByToken", token],
    queryFn: () => fetchCandidateProfileByToken(token),
    enabled: !!token,
    staleTime: 30_000,
  });
}
