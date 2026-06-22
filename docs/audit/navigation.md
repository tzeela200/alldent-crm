# Navigation Map

**Audit date:** 2026-06-17  
**Source:** `src/App.tsx`, `AppSidebar.tsx`, `PublicHeader.tsx`, page-level `Link` / `navigate` usage.

---

## Route Tree (Registered Routes)

**Certainty:** High — from `App.tsx`

### Public (wrapped in `PublicLayout`)

| Path | Page | Notes |
|------|------|-------|
| `/` | `PublicHomePage` | Gated by `PublicLaunchGate` |
| `/jobs` | `PublicJobsPage` | |
| `/jobs/role/:role` | `PublicRoleJobsPage` | Must be registered before `/jobs/:jobCode` |
| `/jobs/:jobCode` | `PublicJobPage` | |
| `/employers` | `EmployersPage` | |
| `/employers/discreet` | `EmployersDiscreetPage` | |
| `/employers/branding` | `EmployersBrandingPage` | |
| `/dental-shop` | `DentalShopPage` | |
| `/dental-assets` | `DentalAssetsPage` | |
| `/class-dental` | `ClassDentalPage` | |
| `/contact` | `ContactPage` | |

### Auth

| Path | Page |
|------|------|
| `/login` | `LoginPage` → on success navigates to `/admin` |

### Profile (no layout wrapper)

| Path | Page |
|------|------|
| `/candidate/:contactId` | `CandidateProfilePage` |
| `/profile/:token` | `CandidateProfilePage` (token lookup) |
| `/employer-profile/:id` | `EmployerProfilePage` |

### Admin (wrapped in `AuthGuard` + `AdminLayout`)

Base prefix: **`/admin`**

| Path | Page | Alias / duplicate |
|------|------|-------------------|
| `/admin` | `DashboardPage` | index route |
| `/admin/dashboard` | `DashboardPage` | alias |
| `/admin/inbox` | `InboxPage` | mock v1 |
| `/admin/inbox-v2` | `InboxV2Page` | Supabase triage |
| `/admin/contacts` | `AdminContactsPage` | |
| `/admin/contacts/:contactId` | `Candidate360Page` | |
| `/admin/candidates` | `AdminCandidatesPage` | |
| `/admin/candidates/:id` | `Candidate360Page` | same component as contacts/:id |
| `/admin/accounts` | `AdminAccountsPage` | wrapper → `AdminEmployersPage` |
| `/admin/accounts/:id` | `Employer360Page` | |
| `/admin/employers` | `AdminEmployersPage` | |
| `/admin/employers/:id` | `Employer360Page` | |
| `/admin/jobs` | `AdminJobsPage` | |
| `/admin/jobs/new` | `CreateJobWizardPage` | |
| `/admin/jobs/:code` | `JobDetailsPage` | |
| `/admin/applications` | `AdminApplicationsPage` | |
| `/admin/pipeline` | `ATSPipelinePage` | |
| `/admin/ats` | `ATSPipelinePage` | alias |
| `/admin/smart-match` | `SmartMatchPage` | |

### Routes NOT registered (but linked from UI)

| Linked path | Linked from | Certainty |
|-------------|-------------|-----------|
| `/admin/settings` | `AppSidebar` footer | High |
| `/admin/contacts/new` | `AdminContactsPage` navigate | High |
| `/jobs/new?account_id=…` | `Employer360Page` | High — missing `/admin` prefix |
| `/jobs/:code` (admin context) | `Employer360Page` | High — resolves to **public** job page |
| `/contacts`, `/contacts/:id` | `Employer360Page`, `Candidate360Page` | High — no top-level admin alias |
| `/accounts`, `/accounts/:id` | `Employer360Page`, `Candidate360Page` | High |
| `/applications`, `/pipeline`, `/jobs`, `/inbox`, `/smart-match` (no `/admin`) | `DashboardPage` KPI + quick actions | High |

---

## Admin Sidebar Navigation

**Source:** `AppSidebar.tsx`  
**Certainty:** High

| Label (HE) | NavLink target | Badge |
|------------|----------------|-------|
| מרכז שליטה | `/admin` | — |
| לידים / פניות | `/admin/inbox` | hardcoded `3` |
| טריאז' נתונים | `/admin/inbox-v2` | — |
| ניהול מאגר | `/admin/contacts` | — |
| מועמדים | `/admin/candidates` | — |
| כל הארגונים | `/admin/accounts` | — |
| מעסיקים | `/admin/employers` | — |
| משרות | `/admin/jobs` | — |
| הגשות | `/admin/applications` | — |
| צינור גיוס | `/admin/pipeline` | — |
| שידוך חכם | `/admin/smart-match` | — |
| הגדרות | `/admin/settings` | **no route** |

**Note:** Sidebar does not expose `/admin/ats` alias; uses `/admin/pipeline` only.

---

## Public Header Navigation

**Source:** `PublicHeader.tsx` → `NAV_ITEMS`  
**Certainty:** High

Top-level: בית, קריירה (→ `/jobs` + role subpages), מעסיקים, הום דנט, כיתה דנטלית, צור קשר.

Role slugs (examples): `dentists`, `specialists`, `hygienists`, `assistants`, `secretaries`, `managers`, `technicians`.

---

## PublicLaunchGate — Private Route Allowlist

When `VITE_PUBLIC_SITE_LIVE !== "true"`, only these path prefixes bypass Coming Soon:

- `/admin`
- `/login`
- `/auth`
- `/dashboard`

**Gap:** Profile routes (`/candidate/…`, `/profile/…`, `/employer-profile/…`) are **not** in allowlist — may show Coming Soon during pre-launch.

**Certainty:** High

---

## Cross-Screen Navigation Patterns

### Correct admin patterns (observed)

`JobDetailsPage` uses full `/admin/…` paths:

- `/admin/smart-match?job=…`
- `/admin/ats?job=…`
- `/admin/applications?job=…`
- `/admin/accounts/:id`
- `/admin/candidates/:id`

**Certainty:** High

### Legacy / inconsistent patterns (observed)

| From | Target pattern | Issue |
|------|----------------|-------|
| `DashboardPage` | `/jobs`, `/applications`, `/contacts`, `/pipeline` | Missing `/admin` prefix |
| `Employer360Page` | `/contacts/:id`, `/jobs/:code`, `/applications` | Missing `/admin` prefix |
| `Candidate360Page` | `/contacts`, `/accounts/:id` | Missing `/admin` prefix |
| `ATSPipelinePage` | `/applications` | Missing `/admin` prefix |
| `EmployerProfilePage` | `/admin/accounts` | Correct |

**Certainty:** High

### Query-string deep links (intent)

| Screen | Query params (observed in code or links) | Handler verified? |
|--------|------------------------------------------|-------------------|
| `SmartMatchPage` | `?job=` via `useSearchParams` | Medium — partial |
| `JobDetailsPage` links | `?job=` on ATS/applications | Medium |
| `DashboardPage` KPIs | `?status=`, `?date=`, `?pending=`, etc. | **Low** — links exist; filter wiring not fully audited |
| `CreateJobWizardPage` / Employer360 | `?account_id=` on `/jobs/new` | **Low** — Employer360 links wrong path |

---

## Route Aliases Summary

| Canonical | Alias | Page |
|-----------|-------|------|
| `/admin/pipeline` | `/admin/ats` | `ATSPipelinePage` |
| `/admin` | `/admin/dashboard` | `DashboardPage` |
| `/admin/contacts/:id` | `/admin/candidates/:id` | `Candidate360Page` |
| `/admin/accounts/:id` | `/admin/employers/:id` | `Employer360Page` |

**Historical note:** Older audit (Apr 2026) reported missing `/ats` and `/accounts/:id` aliases at root level. Current code nests all admin routes under `/admin/*`.

**Certainty:** High for current `App.tsx`

---

## Navigation Targets Matrix (Admin Core)

| Source screen | Common targets |
|---------------|----------------|
| Dashboard | jobs, applications, contacts, accounts, inbox, pipeline, smart-match (mostly **without** `/admin`) |
| AdminJobs | `/admin/jobs/new` |
| JobDetails | accounts 360, candidates 360, ATS, applications, smart-match |
| Employer360 | employer-profile, jobs (broken paths), contacts (broken), applications (broken) |
| Candidate360 | accounts (broken path), `/admin/contacts/:id` after create |
| AdminApplications | detail panel → contact/job lookups (components) |
| ATSPipeline | `/applications` (broken path) |
| Login | `/admin` |

See [screens.md](./screens.md) for per-screen detail.
