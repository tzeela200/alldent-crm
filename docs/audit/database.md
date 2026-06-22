# Database Map (Code-Derived)

**Audit date:** 2026-06-17  
**Method:** TypeScript types (`src/types/`), Supabase `.from()` calls across `src/`, mock dict maps.  
**Live Supabase introspection:** **Not performed** in this session. Row counts, RLS, indexes, and exact column nullability require validation against project `AllDent_CRM_2026` (referenced in prior agent transcripts).

**Overall certainty:** Medium for table/column names; Low for production data state.

---

## Schema Reference Comment

`src/types/index.ts` header states: **"Based on Supabase schema (27 tables, 40 FKs)"**.

**Certainty:** Medium — comment in code; full table list not enumerated in repo.

---

## Core Tables

### `contact` — Person

**Primary key:** `contact_id` (number)  
**Business key:** `phone_norm` (unique, NOT NULL per types)

**Key fields (from types):** names, phones, emails, `role`, `sub_role`, `availability`, `experience`, geo (`region_id`, `city_id`), CV fields, `account_link` → `accounts`, `profile_type`, `source`, `check_status`, `social_status`, follow-up dates, salary fields, JSONB `extended_data`, `systems_used`, `procedures_experience`, etc.

**Used by screens:** AdminContacts, AdminCandidates, Candidate360, CandidateProfile, SmartMatch (mock), Inbox merge, Application mutations (create contact from application).

**Related tables:** `contact_tags`, `rel_contact_profiles`, `applications.candidate_link`

**Certainty:** High

---

### `accounts` — Organization

**Primary key:** `account_id`  
**Business key:** `bus_id` (unique text)

**Key fields:** `account_name`, `account_status`, `account_type`, contact info, geo, `clinic_type`, `chairs_count`, job counters (`active_job_count_auto`, `total_jobs_count`), follow-up fields, JSONB `extended_data`.

**Legacy field:** `contact_link` (TEXT) — noted in types as **NOT canonical FK**.

**Used by screens:** AdminEmployers, AdminAccounts, Employer360, EmployerProfile, CreateJobWizard, AdminJobs (picker), AdminContacts (org picker).

**Certainty:** High

---

### `job` — Job opening

**Primary key:** `job_code` (TEXT)

**Key fields:** `account_link` → `accounts`, `job_status`, `job_title`, role/sub_role/scope, geo, salary, description, recruiter/employer contact links, applicant counts, channel dates.

**Used by screens:** AdminJobs, CreateJobWizard, JobDetails, Employer360, SmartMatch (mock), public jobs via view.

**Certainty:** High

---

### `applications` — Application / submission

**Note:** Live table shape in `src/types/applications.ts` is **denormalized** — includes display fields (`candidate_name`, `account_name`, `job_role`, etc.) not present on canonical `ApplicationRow` in `src/types/index.ts`.

**Key fields (live type):** `application_id`, `job_code`, `candidate_link`, `phone_norm`, `application_status`, `check_status`, `submission_date`, `source`, `is_manual`, `is_new_candidate`, `assigned_to`, `follow_up_date`, CV fields, geo ids, internal notes.

**Duplicate guard (logical):** `job_code` + `phone_norm` — enforced in UI (SmartMatch mock, ManualCreateDialog, mutations comments).

**Used by screens:** AdminApplications (live), Candidate360 (insert), Employer360 (read), JobDetails (read), useApplicationMutations.

**Certainty:** High for usage; **Medium** for which columns are DB-generated vs UI-populated.

---

## Supporting Tables

| Table | Purpose | Used in code | Certainty |
|-------|---------|--------------|-----------|
| `contact_tags` | Tags on contacts | AdminContacts, Candidate360, AdminCandidates | High |
| `rel_contact_profiles` | Multi-profile linkage | AdminContacts, AdminCandidates | High |
| `inbox_v2` | Lead triage queue v2 | InboxV2 hooks/components | High |
| `inbox_import_batches` | CSV/upload batches | useInboxV2Upload, useInboxV2Batches | High |
| `inbox_merge_actions` | Audit of merge decisions | useInboxV2 mutations | High |
| `inbox_ai_chat` | AI chat on inbox rows | Referenced in `inbox-v2.ts` types only | **Low** — table not seen in `.from()` grep |

### Legacy inbox

| Artifact | Source | Supabase usage |
|----------|--------|----------------|
| `InboxLead` type | `src/types/index.ts` | **No** `.from('inbox')` in `src/` |
| `mockInboxLeads` | `src/mocks/data.ts` | InboxPage v1 only |

**Certainty:** High

---

## Views

| View | Purpose | Used by |
|------|---------|---------|
| `v_job_public` | Public job listing/detail | `publicJobsService.ts`, `usePublicJobs` |

**Certainty:** High

---

## Dictionary Tables (`dict_*`)

Observed in Supabase queries:

| Table | Typical use |
|-------|-------------|
| `dict_roles` | Contact/job role |
| `dict_sub_roles` | Sub-role (with `role_id`) |
| `dict_regions` | Geo |
| `dict_cities` | Geo (with `region_id`) |
| `dict_availability` | Candidate availability |
| `dict_experience` | Experience bands |
| `dict_sources` | Lead/application source |
| `dict_application_statuses` | Application pipeline status |
| `dict_check_statuses` | QA check on contact/application |
| `dict_account_statuses` | Account lifecycle |
| `dict_account_types` | Organization type |
| `dict_social_statuses` | Marital/social |
| `dict_profile_types` | Contact profile classification |
| `dict_scopes` | Job scope (full/part time) |
| `dict_genders` | Gender |
| `dict_languages` | Languages |
| `dict_tax_types` | Tax classification |
| `dict_mobility` | Mobility preference |
| `dict_systems` | Dental systems |
| `dict_procedures` | Procedures experience |

**In mocks but not confirmed live query:**

- `dict_job_statuses` — job status updates use numeric IDs in code; mock dict exists in `mocks/dicts.ts`

**Inbox v2 dicts (per types comment):** 3 dict tables for inbox v2 — names in `src/lib/inbox-v2-dicts.ts` (not fully expanded in this audit).

**Certainty:** High for tables listed in `.from()` calls; Medium for complete dict inventory.

---

## Entity Relationships (Logical)

```
accounts (1) ──< job (N)          via job.account_link
contact (1) ──< applications (N)  via applications.candidate_link
job (1) ──< applications (N)       via applications.job_code
contact (1) ──< contact_tags (N)
contact (N) ── rel_contact_profiles ── profiles (multi-profile)
inbox_v2 ──match──> contact | accounts   via match_contact, match_account
```

**FK enforcement:** Assumed in Postgres; **not verified** without live schema dump.

**Certainty:** Medium

---

## Data Access Patterns by Layer

| Pattern | Files | Tables |
|---------|-------|--------|
| Direct `supabase.from` in page | Most admin pages | Various |
| React Query hooks | useApplications, useContact360, useInboxV2, AdminEmployers | Various |
| Mock static arrays | useMockData, InboxPage | N/A (in-memory) |
| useSupabaseData hybrid | contact/accounts live; rest mock re-export | contact, accounts |

---

## Auth

- Supabase Auth session via `AuthContext`
- Client uses **anon key** only in frontend code
- Service role / RLS behavior: **unknown** in this audit

**Certainty:** High for client wiring; Low for security policies.

---

## Migrations / SSOT in Repo

- No `supabase/migrations/` directory found in project root.
- Canonical field names documented in `src/types/index.ts` and `.cursorrules`.

**Certainty:** High

---

## Schema Gaps / Inconsistencies (Documented Only)

| Topic | Observation | Certainty |
|-------|-------------|-----------|
| Dual `ApplicationRow` types | `types/index.ts` vs `types/applications.ts` differ in shape | High |
| Mock vs live status IDs | `mockApplicationStatuses` labels/IDs may not match `useApplicationMutations` constants | High |
| `applications` denormalized columns | Filters query `candidate_name`, `account_name` on table — implies wide table or view; not confirmed | Medium |
| `contact.sub_role` | Types say `number`; useContact360 uses `number[]` | Medium |
| `inbox` legacy table | Type exists; v1 screen uses mocks only | High |
| Empty core tables | Prior transcripts report 0 rows in contact/applications — **not re-verified** | Low |

---

## Tables Referenced Only in Types / Comments

- `inbox` (legacy)
- `inbox_ai_chat`
- `profiles_contact_rel` (alias name in rules vs `rel_contact_profiles` in code)

**Requires validation:** Which names exist in live Supabase.
