# AllDent CRM — System Overview

**Audit date:** 2026-06-17  
**Scope:** Documentation only — derived from source code in `src/` (excluding `node_modules`, `dist`, `build`, `coverage`).  
**Live Supabase introspection:** Not performed in this audit session. Database details are inferred from TypeScript types, hooks, and `.from()` calls.

---

## What This System Is

AllDent CRM/ATS is a **React + TypeScript + Vite** web application for Israeli dental staffing operations. It combines:

1. **Internal admin CRM/ATS** — contacts, organizations, jobs, applications, pipeline, smart matching, inbox triage.
2. **Public marketing/jobs site** — Hebrew RTL pages for job seekers and employers (gated behind launch flag).

**Certainty:** High

---

## Technology Stack

| Layer | Technology | Certainty |
|-------|------------|-----------|
| UI | React 18, TypeScript | High |
| Build | Vite 5 | High |
| Routing | React Router v6 | High |
| Styling | Tailwind CSS, Radix UI primitives | High |
| Data fetching | TanStack React Query (partial), custom hooks | High |
| Backend | Supabase (Postgres + Auth) via `@supabase/supabase-js` | High |
| Forms / validation | react-hook-form, zod (where used) | Medium |
| Drag-and-drop | `@hello-pangea/dnd` (ATS pipeline UI) | High |
| Charts | recharts (Dashboard) | Medium |

**Environment variables (observed):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_LIVE` — when not `"true"`, public routes show Coming Soon (except admin/login)

**Certainty:** High (from `src/lib/supabase.ts`, `PublicLaunchGate.tsx`)

---

## Architecture — High Level

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (RTL, Hebrew)                    │
├──────────────────────────┬──────────────────────────────────┤
│   Public Site            │   Admin CRM (/admin/*)           │
│   PublicLayout           │   AdminLayout + AuthGuard          │
│   usePublicJobs          │   Mixed data layer (see below)     │
└──────────────────────────┴──────────────────────────────────┘
                              │
                              ▼
                    Supabase Client (anon key)
                    Auth: signInWithPassword
                              │
                              ▼
              Postgres tables + dict_* + views
              (live schema — not fully verified here)
```

**Certainty:** High

---

## Core Business Entities (Canonical Model)

Per project rules and `src/types/index.ts`:

| Entity | Table | Business key | Role |
|--------|-------|--------------|------|
| Person | `contact` | `phone_norm` (unique) | Candidate, recruiter, employer contact, employee — one row per person |
| Organization | `accounts` | `bus_id` / `account_id` | Clinic, employer, customer |
| Job | `job` | `job_code` (TEXT PK) | Job opening |
| Application | `applications` | Logical: `job_code` + `phone_norm` | Links person ↔ job |
| Inbox (intake) | `inbox_v2`, legacy mock `inbox` | Lead quarantine — not source of truth | Triage before merge to `contact` |

**Views (not write targets):**

- AdminEmployers / AdminAccounts are **views over `accounts`**, not separate tables.
- AdminCandidates is a **view over `contact`** (filtered by profile/availability).
- Candidate360 / Employer360 are **360° views**, not separate entities.

**Certainty:** High (types + `.cursorrules`)

---

## Data Layer — Hybrid State

The system is **mid-migration** from mocks to Supabase. Observed patterns:

### Supabase-connected (live reads/writes)

- `AdminContactsPage`, `AdminCandidatesPage`, `Candidate360Page`
- `AdminEmployersPage` / `AdminAccountsPage` (wrapper)
- `Employer360Page`, `EmployerProfilePage`
- `AdminJobsPage`, `CreateJobWizardPage`, `JobDetailsPage`
- `AdminApplicationsPage` (+ mutations via `useApplicationMutations`)
- `InboxV2Page` (+ upload/matching hooks)
- `CandidateProfilePage` (public token profile)
- `usePublicJobs` → `v_job_public` view

**Certainty:** High (grep on `supabase.from`)

### Mock-driven (`@/mocks/data`, `@/mocks/dicts`, `useMockData`)

- `DashboardPage`
- `InboxPage` (v1 — direct mock imports)
- `ATSPipelinePage`
- `SmartMatchPage`

**Certainty:** High

### Adapter file

- `src/hooks/useSupabaseData.ts` — live hooks for `contact` / `accounts`; **re-exports** mock hooks for jobs, applications, inbox, dicts, smart match.

**Certainty:** High

### Static dict fallback

- `src/lib/dicts.ts` — hardcoded SSOT-aligned dict arrays (roles, sub_roles, etc.) used in some screens alongside Supabase dict reads.

**Certainty:** High

---

## Authentication & Access Control

| Route group | Protection | Mechanism |
|-------------|------------|-----------|
| `/admin/*` | Auth required | `AuthGuard` → redirect to `/login` if no Supabase session |
| `/login` | Public | Email/password via `supabase.auth.signInWithPassword` |
| Public routes | Launch gate | `PublicLaunchGate` — Coming Soon unless `VITE_PUBLIC_SITE_LIVE=true` |
| `/candidate/:contactId`, `/profile/:token`, `/employer-profile/:id` | No AuthGuard in `App.tsx` | Profile pages accessible by URL/token |

**RLS policies:** Not verified in this audit. Assumed enforced at Supabase level.

**Certainty:** High for routing/auth wiring; **Low** for RLS behavior without live DB read.

---

## UI / Design System

- **RTL mandatory**, Hebrew labels, font Heebo (per project rules).
- Primary `#008080`, accent `#D97706`, cards white, enterprise CRM density.
- Shared admin shell: `Shell`, `Toolbar`, `KPICard`, `AppSidebar`.

**Certainty:** High

---

## Application Structure (Key Directories)

| Path | Purpose |
|------|---------|
| `src/pages/` | Route-level screens (29 files) |
| `src/components/` | UI, layout, domain panels (applications, inbox-v2, public) |
| `src/hooks/` | Data hooks (Supabase + mock) |
| `src/mocks/` | Demo/fallback data and dicts |
| `src/types/` | Canonical TypeScript models |
| `src/lib/` | Supabase client, dicts, utilities |
| `src/contexts/` | Auth context |
| `src/services/` | e.g. `publicJobsService.ts` |

**No `supabase/migrations/` folder** in repository at audit time.

**Certainty:** High

---

## Known Cross-Cutting Issues (Documented, Not Fixed)

1. **Dashboard deep links** use paths without `/admin` prefix (e.g. `/jobs`, `/contacts`) — likely broken vs current route tree.
2. **Employer360 / Candidate360** contain links to `/contacts`, `/accounts`, `/jobs` without `/admin` prefix.
3. **Sidebar** links to `/admin/settings` — no matching route in `App.tsx`.
4. **Dual inbox systems:** `InboxPage` (mock v1) vs `InboxV2Page` (Supabase).
5. **Status ID semantics** differ between mocks and production mutation code (see `status-flows.md`).

**Certainty:** High (from `App.tsx` + grep on `Link to=`)

---

## Related Audit Files

- [screens.md](./screens.md) — per-screen inventory
- [navigation.md](./navigation.md) — route map and link graph
- [database.md](./database.md) — tables and relationships (code-derived)
- [status-flows.md](./status-flows.md) — status dictionaries and transitions
- [open-questions.md](./open-questions.md) — items requiring human validation
