# Open Questions

**Audit date:** 2026-06-17  
Items below require validation from product owner, live Supabase, or runtime testing. Grouped by priority.

**Legend:** Certainty of the *question itself* (that we genuinely don't know) — not the answer.

---

## P0 — Requires Your Validation (Business / DB Truth)

### 1. Application status ID semantics

**Observation:** `useApplicationMutations` treats ID `12` as **hire** ("השמה") and triggers `job_status = 5`. Mock dict labels ID `12` as **"לא ענה"** and ID `15` as **"הושמה"**.

**Question:** What are the authoritative IDs and Hebrew labels in live `dict_application_statuses`?

**Certainty that question is open:** High  
**Impact:** AdminApplications KPIs, hire automation, pipeline columns, reporting.

---

### 2. Job status on hire

**Observation:** Hire sets `job_status = 5`. Mock dict: 5 = "סגורה", 6 = "אוישה".

**Question:** Which `dict_job_statuses` ID should represent a filled/hired job?

**Certainty:** High

---

### 3. Live Supabase row counts and RLS

**Observation:** Prior agent sessions reported empty `contact` / `applications` but populated dicts. Not re-verified in this audit (MCP auth only tool available).

**Question:** Current row counts per core table? Which RLS policies apply to anon/authenticated roles?

**Certainty:** High that live state is unverified here

---

### 4. `applications` table shape

**Observation:** `src/types/applications.ts` includes denormalized fields (`candidate_name`, `account_name`, …) queried in filters. Canonical `ApplicationRow` in `types/index.ts` is narrower.

**Question:** Is `applications` a wide table, a view, or populated by triggers? Which columns are writeable from UI?

**Certainty:** High

---

## P1 — Architecture / Product Direction

### 5. Dual inbox strategy

**Question:** Is `InboxPage` (mock v1) deprecated? Should sidebar "לידים / פניות" point to InboxV2?

**Certainty:** Medium

---

### 6. Mock migration order

**Question:** Confirm priority: Dashboard → Pipeline → SmartMatch → Inbox v1 for Supabase migration?

**Certainty:** Medium (rules suggest order; not confirmed by you)

---

### 7. Admin URL prefix convention

**Observation:** Many screens link to `/contacts`, `/jobs`, `/applications` without `/admin`. Current routes require `/admin/*`.

**Question:** Should legacy root paths (`/jobs`, `/contacts`) be added as redirects, or should all links be updated to `/admin/…`?

**Certainty:** High that inconsistency exists; Medium on preferred fix (out of scope for this audit)

---

### 8. Missing routes

| Path | Linked from |
|------|-------------|
| `/admin/settings` | AppSidebar |
| `/admin/contacts/new` | AdminContactsPage |

**Question:** Are these planned screens or dead links?

**Certainty:** High

---

### 9. Profile pages security

**Observation:** `/employer-profile/:id`, `/candidate/:contactId`, `/profile/:token` have no `AuthGuard`.

**Question:** Intended access model — public token, magic link, or should these be protected?

**Certainty:** High

---

### 10. PublicLaunchGate vs profile URLs

**Observation:** Allowlist includes `/admin`, `/login`, `/auth`, `/dashboard` — not profile paths.

**Question:** Should candidate/employer profile URLs work before public site launch?

**Certainty:** High

---

## P2 — Screen-Level Behavior

### 11. AdminContacts → Candidate360 entry

**Question:** How do users navigate from contact list to 360 view? Is side panel the only path?

**Certainty:** Medium

---

### 12. AdminEmployers → Employer360

**Question:** Should table row "view" open Employer360 route or only side sheet?

**Certainty:** Medium

---

### 13. Dashboard KPI query params

**Question:** Do targets like `/applications?pending=true` parse params on AdminApplicationsPage?

**Certainty:** Low (not fully traced)

---

### 14. CreateJobWizard `account_id` query

**Question:** Does wizard pre-fill account when opened from Employer360's `/jobs/new?account_id=` (currently wrong path)?

**Certainty:** Medium

---

### 15. ATS pipeline persistence

**Question:** When pipeline goes live, should it use same `ADJACENT_STATUS_POLICY` and hire side-effect as AdminApplications?

**Certainty:** Medium

---

### 16. SmartMatch scoring ownership

**Question:** Who owns weight rules in SmartMatchPage scoring breakdown?

**Certainty:** Low

---

### 17. Duplicate application guard at DB level

**Question:** Is there a unique index on `(job_code, phone_norm)` in live DB, or UI-only guard?

**Certainty:** Medium

---

## P3 — Schema / Naming

### 18. Table name: `rel_contact_profiles` vs `profiles_contact_rel`

**Question:** Canonical table name in Supabase?

**Certainty:** Medium

---

### 19. Legacy `inbox` table

**Question:** Does table `inbox` still exist in DB or fully replaced by `inbox_v2`?

**Certainty:** Medium

---

### 20. `contact.sub_role` type

**Question:** Single FK (`number`) or array (`number[]`) in live schema? Code types conflict.

**Certainty:** Medium

---

### 21. `inbox_ai_chat` table

**Question:** Exists and wired to AIChatPanel?

**Certainty:** Low

---

### 22. Full dict inventory

**Question:** Complete list of `dict_*` tables and seed completeness vs UI needs (systems, procedures, mobility, tax_types, …)?

**Certainty:** Medium

---

## P4 — Operational

### 23. Sidebar inbox badge

**Observation:** Hardcoded `badge: 3` in AppSidebar.

**Question:** Should this reflect live inbox_v2 count?

**Certainty:** High

---

### 24. Supabase project ID

**Observation:** Prior transcript references project `urcdxdcyiedbdwegcebq` (AllDent_CRM_2026).

**Question:** Confirm this is the only/production project for this repo.

**Certainty:** Medium

---

### 25. Repository migrations

**Observation:** No `supabase/migrations/` in repo.

**Question:** Where is schema SSOT managed — Supabase dashboard only, external repo, or pending check-in?

**Certainty:** High

---

## Validation Checklist (Suggested for You)

- [ ] Export `dict_application_statuses` and `dict_job_statuses` from Supabase
- [ ] Confirm hire flow: application status ID + job status ID
- [ ] Test Dashboard KPI links in browser
- [ ] Test Employer360 internal links in browser
- [ ] Confirm inbox v1 vs v2 product decision
- [ ] Confirm profile URL access policy
- [ ] Row counts: contact, accounts, job, applications, inbox_v2
