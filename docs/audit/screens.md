# Screen Inventory

**Audit date:** 2026-06-17  
**Format:** Per screen — Purpose, Route, Data Sources, Supabase Tables, Actions, Status Changes, Navigation Targets, Open Questions.  
**Certainty** noted per section where non-obvious.

---

## Admin — Core Operations

### DashboardPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Executive control center: KPIs, insights, alerts, quick actions for jobs, applications, contacts, accounts, inbox | High |
| **Route** | `/admin`, `/admin/dashboard` | High |
| **Data Sources** | `@/hooks/useMockData` — `useApplications`, `useInbox`, `useJobs`, `useCandidates`, `useAccounts`, `useDicts` | High |
| **Supabase Tables** | None (mock only) | High |
| **Actions** | Filter by date preset; refresh; KPI drill-down links; quick action buttons; export-oriented UI sections | High |
| **Status Changes** | None persisted | High |
| **Navigation Targets** | Links to `/jobs`, `/applications`, `/contacts`, `/accounts`, `/inbox`, `/pipeline`, `/smart-match`, `/jobs/new` — **without `/admin` prefix** | High |
| **Open Questions** | Are KPI deep-link query params handled on target screens? Is dashboard intended to migrate to Supabase KPIs? | Medium |

---

### InboxPage (v1)

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Legacy lead/inquiry queue UI — triage duplicates, entity type, open/handled/spam | High |
| **Route** | `/admin/inbox` | High |
| **Data Sources** | Direct `@/mocks/data` (`mockInboxLeads`, `mockAccounts`, `mockContacts`); `@/mocks/dicts` | High |
| **Supabase Tables** | None | High |
| **Actions** | Search/filter/sort; mark handled; spam; WhatsApp links; notes (local UI) | Medium |
| **Status Changes** | Mock-only open state strings | High |
| **Navigation Targets** | Limited internal navigation observed | Medium |
| **Open Questions** | Is v1 deprecated in favor of InboxV2? Should sidebar badge (3) reflect live data? | Medium |

---

### InboxV2Page

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Data triage: CSV upload, batch tracking, AI-assisted classification, merge to contact, create from lead | High |
| **Route** | `/admin/inbox-v2` | High |
| **Data Sources** | `useInboxV2`, `useInboxV2Upload`, `useInboxV2Matching`; components in `components/inbox-v2/` | High |
| **Supabase Tables** | `inbox_v2`, `inbox_import_batches`, `inbox_merge_actions`, `contact` (merge/create) | High |
| **Actions** | Upload file; filter rows; bulk match; merge panel; create contact dialog; AI chat panel; pagination | High |
| **Status Changes** | `merge_status` and row field updates on `inbox_v2` | Medium |
| **Navigation Targets** | Stays on page; merge may link to contact records internally | Medium |
| **Open Questions** | Full merge_status enum; RLS on inbox tables; is `inbox_ai_chat` wired? | Low |

---

### AdminContactsPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Master contact registry — search, filter, side panel CRUD, tags, merge duplicates, bulk update, export | High |
| **Route** | `/admin/contacts` | High |
| **Data Sources** | Direct Supabase via React Query; dict reads from Supabase | High |
| **Supabase Tables** | `contact`, `contact_tags`, `rel_contact_profiles`, `accounts` (picker), `dict_regions`, `dict_cities` | High |
| **Actions** | Create/edit contact; add/remove tags; merge two contacts; bulk field update; export CSV; column resize/sort; navigate to new contact (route may be missing) | High |
| **Status Changes** | `check_status`, `availability`, and other contact fields via update | High |
| **Navigation Targets** | `navigate('/admin/contacts/new')` — **route not in App.tsx**; row opens side panel (not Candidate360 link observed in grep) | Medium |
| **Open Questions** | How does user reach Candidate360 from this screen? Is `/admin/contacts/new` implemented elsewhere? | Medium |

---

### AdminCandidatesPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Candidate-focused view over contacts — filters for availability, profiles, tags, applications context | High |
| **Route** | `/admin/candidates` | High |
| **Data Sources** | Supabase React Query | High |
| **Supabase Tables** | `contact`, `rel_contact_profiles`, `contact_tags`, `dict_regions`, `dict_cities` | High |
| **Actions** | Filter/search; table actions; export patterns (similar shell to contacts) | Medium |
| **Status Changes** | Contact fields if edit actions present | Medium |
| **Navigation Targets** | `/admin/candidates/:id` → Candidate360 (by route definition) | High |
| **Open Questions** | Exact duplicate vs AdminContacts feature overlap; application counts source | Medium |

---

### Candidate360Page

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | 360° person view — tabs for profile, applications, jobs, tags, notes, CV, check status, manual application create, public profile link | High |
| **Route** | `/admin/contacts/:contactId`, `/admin/candidates/:id` | High |
| **Data Sources** | `useContact360`, `useContact360Dicts`; direct Supabase mutations | High |
| **Supabase Tables** | `contact`, `applications`, `contact_tags`, `job`, `accounts`, many `dict_*` | High |
| **Actions** | Edit/save contact; add/remove tags; update check_status; insert application; generate/open profile token; create contact | High |
| **Status Changes** | `contact.check_status`; new `applications.application_status` on manual create | High |
| **Navigation Targets** | `/contacts` (back — **broken**); `/accounts/:id` (**broken**); `/admin/contacts/:id` after create | High |
| **Open Questions** | Default application_status on manual create; profile_token column existence in live DB | Medium |

---

### AdminAccountsPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | All organizations view — wrapper with `viewMode="accounts"`, subtitle emphasizes orgs without jobs | High |
| **Route** | `/admin/accounts` | High |
| **Data Sources** | Delegates to `AdminEmployersPage` | High |
| **Supabase Tables** | Same as AdminEmployers | High |
| **Actions** | Same as AdminEmployers | High |
| **Status Changes** | `account_status`, `account_type`, etc. | High |
| **Navigation Targets** | Side sheet only (no direct Employer360 link from table in grep) | Medium |
| **Open Questions** | Should accounts view differ filters from employers view beyond `viewMode`? | Medium |

---

### AdminEmployersPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Employer/account registry — KPIs, rich filters (jobs, contacts, geo), side sheet view/edit/create, bulk update, export | High |
| **Route** | `/admin/employers` | High |
| **Data Sources** | Supabase + React Query; paginated `accounts` fetch | High |
| **Supabase Tables** | `accounts`, `job`, `contact`, `dict_regions`, `dict_cities`, `dict_account_statuses`, `dict_account_types` | High |
| **Actions** | Create/edit account in sheet; inline status update; bulk update; export CSV; phone/WhatsApp | High |
| **Status Changes** | `account_status` (inline + bulk) | High |
| **Navigation Targets** | No Employer360 deep link from table — sheet-based UX | High |
| **Open Questions** | `viewMode='employers'` vs `'accounts'` filter differences in code path; `has_jobs` filter logic | Medium |

---

### Employer360Page

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | 360° organization view — account details, jobs list, contacts, applications, notes, edit account | High |
| **Route** | `/admin/accounts/:id`, `/admin/employers/:id` | High |
| **Data Sources** | Supabase React Query | High |
| **Supabase Tables** | `accounts`, `job`, `contact`, `applications` | High |
| **Actions** | Edit/save account; view related jobs/contacts/applications | High |
| **Status Changes** | Account field updates on save | High |
| **Navigation Targets** | `/employer-profile/:id`; `/jobs/new?account_id=`; `/jobs/:code`; `/contacts`, `/contacts/:id`; `/applications`; `/accounts` — **most without `/admin`** | High |
| **Open Questions** | Intended canonical path prefix for internal links? | High |

---

### AdminJobsPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Job master list — filters, KPIs, side panel create/edit job, status management, publish fields | High |
| **Route** | `/admin/jobs` | High |
| **Data Sources** | Supabase React Query | High |
| **Supabase Tables** | `job`, `accounts`, `contact`, `dict_sub_roles`, `dict_cities` | High |
| **Actions** | Create job (panel); update job; change job_code; filter/export patterns | High |
| **Status Changes** | `job_status`, `public_status` (if field exists on row) | Medium |
| **Navigation Targets** | `/admin/jobs/new` | High |
| **Open Questions** | Link to JobDetails / ATS from table row — not found in grep; public_status field in live schema | Medium |

---

### CreateJobWizardPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Multi-step wizard to create job (+ optional new account) | High |
| **Route** | `/admin/jobs/new` | High |
| **Data Sources** | Supabase | High |
| **Supabase Tables** | `job`, `accounts`, `dict_cities` | High |
| **Actions** | Step through form; insert account; insert job; cancel → `/admin/jobs` | High |
| **Status Changes** | New jobs: `job_status: 1` (draft) | High |
| **Navigation Targets** | `/admin/jobs` on success/cancel | High |
| **Open Questions** | Does wizard read `?account_id=` query from Employer360 broken links? | Medium |

---

### JobDetailsPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Single job operational view — edit fields, applicants list, links to ATS/SmartMatch/Applications/Employer360 | High |
| **Route** | `/admin/jobs/:code` | High |
| **Data Sources** | Supabase | High |
| **Supabase Tables** | `job`, `accounts`, `contact`, `applications`, multiple dicts | High |
| **Actions** | Inline edit job sections; save patches to job | High |
| **Status Changes** | `job_status` via update patches | High |
| **Navigation Targets** | `/admin/smart-match?job=`, `/admin/ats?job=`, `/admin/applications?job=`, `/admin/accounts/:id`, `/admin/candidates/:id`, `/admin/jobs` | High |
| **Open Questions** | Which job fields are editable vs read-only by business rule | Medium |

---

### AdminApplicationsPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Applications master table — KPIs, filters, bulk status/check/assign/follow-up, detail panel, manual create, CSV export | High |
| **Route** | `/admin/applications` | High |
| **Data Sources** | `useApplications`, `useApplicationMutations`, `useApplicationDicts` | High |
| **Supabase Tables** | `applications`, `dict_application_statuses`, `dict_check_statuses`, `dict_sources`, `dict_regions`, `dict_roles`; related via detail panel: `contact`, `job`, `accounts` | High |
| **Actions** | CRUD via mutations; bulk updates; manual create dialog; export CSV; table/grid toggle | High |
| **Status Changes** | `application_status`, `check_status`; hire (12) → `job.job_status=5`; archive (15) | High |
| **Navigation Targets** | Detail panel internal; no page-level Link grep hits | Medium |
| **Open Questions** | Live dict IDs vs mutation constants; denormalized column population | High |

---

### ATSPipelinePage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Kanban-style recruitment pipeline by application_status columns | High |
| **Route** | `/admin/pipeline`, `/admin/ats` | High |
| **Data Sources** | `useMockData` — `useApplications`, `useJobs`, `useDicts` | High |
| **Supabase Tables** | None (local state after load) | High |
| **Actions** | Filter; move cards between statuses (adjacency policy); check status change; detail sheet; load more per column | High |
| **Status Changes** | **Local only** — `application_status`, `check_status` not written to Supabase | High |
| **Navigation Targets** | `/applications` (**broken** — missing `/admin`) | High |
| **Open Questions** | When will pipeline connect to live mutations? Hire side-effect not applied here | High |

---

### SmartMatchPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Rule-based candidate↔job matching scores; create application from match; export | High |
| **Route** | `/admin/smart-match` | High |
| **Data Sources** | `useMockData` — applications, candidates, jobs, dicts | High |
| **Supabase Tables** | None | High |
| **Actions** | Select job; score candidates; filters; create application (local); duplicate guard; export CSV | High |
| **Status Changes** | Local mock application rows only | High |
| **Navigation Targets** | `?job=` via search params | Medium |
| **Open Questions** | Migration plan to Supabase; scoring weights business ownership | Medium |

---

### LoginPage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Admin authentication | High |
| **Route** | `/login` | High |
| **Data Sources** | `AuthContext` → Supabase Auth | High |
| **Supabase Tables** | Auth users (Supabase managed) | High |
| **Actions** | signIn email/password; redirect to `/admin` | High |
| **Status Changes** | None | High |
| **Navigation Targets** | `/admin` on success | High |
| **Open Questions** | Role-based access beyond logged-in check? | Low |

---

## Admin — Profile Routes (outside AdminLayout)

### CandidateProfilePage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Public/candidate self-service profile view by contact ID or token | High |
| **Route** | `/candidate/:contactId`, `/profile/:token` | High |
| **Data Sources** | `useCandidateProfile`, `useContact360Dicts` | High |
| **Supabase Tables** | `contact` | High |
| **Actions** | View/edit limited public fields (per hook) | Medium |
| **Status Changes** | Possible contact updates if edit enabled | Medium |
| **Navigation Targets** | Minimal | Low |
| **Open Questions** | Blocked by PublicLaunchGate when site not live? Field allowlist for candidates | Medium |

---

### EmployerProfilePage

| Field | Detail | Certainty |
|-------|--------|-----------|
| **Purpose** | Employer-facing profile edit for organization | High |
| **Route** | `/employer-profile/:id` | High |
| **Data Sources** | Supabase | High |
| **Supabase Tables** | `accounts`, dict tables | High |
| **Actions** | Edit/save account fields | High |
| **Status Changes** | `account_status`, other account fields | High |
| **Navigation Targets** | `/admin/accounts` (back link) | High |
| **Open Questions** | Auth protection — page has no AuthGuard | High |

---

## Public Site

### PublicHomePage

| Field | Detail |
|-------|--------|
| **Purpose** | Marketing home — hero, categories, featured jobs |
| **Route** | `/` |
| **Data Sources** | `usePublicJobs` → `v_job_public` |
| **Supabase Tables** | `v_job_public` (view) |
| **Actions** | Browse; navigate to jobs/employers |
| **Status Changes** | None |
| **Navigation Targets** | `/jobs`, `/employers` |
| **Open Questions** | Launch gate behavior |
| **Certainty** | High |

---

### PublicJobsPage

| Purpose | Job board listing with filters |
| Route | `/jobs` |
| Data | `usePublicJobs` |
| Tables | `v_job_public` |
| Actions | Filter; navigate to role pages and job detail |
| Navigation | `/jobs/role/:slug`, `/jobs/:jobCode` |
| **Certainty** | High |

---

### PublicRoleJobsPage

| Purpose | Role-filtered job list (hygienists, dentists, etc.) |
| Route | `/jobs/role/:role` |
| Data | `usePublicJobs` + `publicRolePages` |
| Tables | `v_job_public` |
| Navigation | `/jobs`, other role slugs; invalid role → redirect `/jobs` |
| **Certainty** | High |

---

### PublicJobPage

| Purpose | Single public job detail + apply CTA |
| Route | `/jobs/:jobCode` |
| Data | `usePublicJobs` / publicJobsService |
| Tables | `v_job_public` |
| Navigation | `/jobs` |
| **Certainty** | High |

---

### EmployersPage / EmployersDiscreetPage / EmployersBrandingPage

| Purpose | Marketing pages for employer services |
| Routes | `/employers`, `/employers/discreet`, `/employers/branding` |
| Data | Static content |
| Tables | None |
| Navigation | Cross-links between employer subpages |
| **Certainty** | High |

---

### DentalShopPage / DentalAssetsPage / ClassDentalPage

| Purpose | Marketing — dental shop, assets, education channel |
| Routes | `/dental-shop`, `/dental-assets`, `/class-dental` |
| Data | Static |
| Tables | None |
| **Certainty** | High (from route names + file size) |

---

### ContactPage

| Purpose | Contact CTAs — WhatsApp, email |
| Route | `/contact` |
| Data | Static links (`wa.me`, `mailto:`) |
| Tables | None |
| **Certainty** | High |

---

## Screen Count Summary

| Group | Count |
|-------|-------|
| Admin (in AdminLayout) | 16 unique pages (+ AdminAccounts wrapper) |
| Auth | 1 |
| Profile (no layout) | 2 |
| Public | 11 |
| **Total page files** | 29 |

---

## Data Source Summary by Screen

| Source | Screens |
|--------|---------|
| **Supabase live** | AdminContacts, AdminCandidates, Candidate360, AdminEmployers, AdminAccounts, Employer360, AdminJobs, CreateJobWizard, JobDetails, AdminApplications, InboxV2, EmployerProfile, CandidateProfile, Public jobs pages |
| **Mock only** | Dashboard, Inbox v1, ATSPipeline, SmartMatch |
| **Static** | Public marketing pages (employers, dental, contact) |

See [navigation.md](./navigation.md) for broken link inventory.
