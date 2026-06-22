# Status Flows

**Audit date:** 2026-06-17  
**Sources:** `src/mocks/dicts.ts`, `src/hooks/useApplicationMutations.ts`, `src/pages/ATSPipelinePage.tsx`, `src/pages/AdminApplicationsPage.tsx`, `src/lib/statusColors.ts`, `src/types/inbox-v2.ts`.

---

## Overview

Statuses in AllDent are **numeric IDs** mapped to Hebrew labels via `dict_*` tables (live) or mock dict arrays (fallback). Multiple subsystems use overlapping ID spaces — **mock labels and production mutation constants do not always align**.

---

## 1. Application Status (`application_status`)

### Live mutation semantics

**Source:** `useApplicationMutations.ts`

| ID | Code constant / comment | Side effect |
|----|-------------------------|-------------|
| `12` | `HIRE_STATUS` — comment: **"השמה (התקבל)"** | Updates `job.job_status = 5` ("מאוישת") |
| `15` | `ARCHIVE_STATUS` — comment: **"לא דנטלי - ארכיון"** | Archive handling in mutations |

**KPI mappings** (`useApplications.ts`):

| KPI | Filter |
|-----|--------|
| waitingHandling | status IN `[1, 2]` |
| advanced | status IN `[6, 7, 8]` |
| hires | status `= 12` |
| waitingEmployer | status `= 9` |
| archived | status `= 13` |

**AdminApplicationsPage KPI chips** (set filters): statuses `1`, `2`, `7`, `12`, `9`, `13`.

**Certainty:** High (from code)

### Mock dict labels (`mockApplicationStatuses`)

| ID | Mock label |
|----|------------|
| 1 | חדש |
| 2 | בבדיקה |
| 3 | רלוונטי |
| 4 | נשלח למעסיק |
| 5 | ראיון תואם |
| 6 | בתהליך |
| 7 | ממתין לתגובה |
| 8 | התקבל |
| 9 | נדחה |
| 10 | ביטל |
| 11 | לא רלוונטי |
| 12 | **לא ענה** |
| 13 | ארכיון |
| 14 | מועמד במאגר |
| 15 | **הושמה** |

**Critical inconsistency:** In mocks, ID `12` = "לא ענה" and ID `15` = "הושמה". In `useApplicationMutations`, ID `12` = hire trigger. **Live `dict_application_statuses` in Supabase is authoritative** — not read in this audit.

**Certainty:** High for inconsistency existing in repo; **Low** for live dict content.

---

### ATS Pipeline columns (`ATSPipelinePage`)

**Data source:** Mock `useApplications` — status changes are **local state only** (simulated delay, no Supabase write).

**Column → status IDs:**

| Column key | Title (HE) | Status IDs |
|------------|------------|------------|
| new | חדש | 1 |
| screening | סינון ראשוני | 2, 3 |
| in_progress | בטיפול | 4 |
| sent_to_employer | הועבר למעסיק | 5, 6 |
| interview | ראיון | 7, 8 |
| feedback | משוב | 9, 10 |
| trial | חפיפה / ניסיון | 11 |
| closed | השמה / סגירה | 12, 13, 14, 15 |

**Adjacent transition policy** (`ADJACENT_STATUS_POLICY`):

Linear progression with branches; closing statuses `{12,13,14,15}` require confirm dialog. From status `11` can go to `12`. Statuses `13`, `14`, `15` can revert to `12`.

**On status 12 in pipeline UI:** Toast says hire should also set `job_status = 5` — **not auto-applied** in pipeline (unlike AdminApplications mutations).

**Certainty:** High

---

### Admin Applications (live Supabase)

**Mutations:** `updateApplication`, `bulkUpdateStatus`, `bulkUpdateCheckStatus`, `bulkAssign`, `bulkSetFollowUp`, `createApplication`, `createContactFromApplication`, promote to inbox_v2, archive.

**Hire flow:** Explicit save of `application_status = 12` → triggers `job.job_status = 5`.

**Certainty:** High

---

## 2. Check Status (`check_status`)

### Mock dict (`mockCheckStatuses`)

| ID | Label |
|----|-------|
| 1 | ממתין לבדיקה |
| 2 | נבדק - תקין |
| 3 | נבדק - בעייתי |
| 4 | לא רלוונטי |

**Used on:** `contact.check_status`, `applications.check_status`.

**Candidate360:** Can update `contact.check_status` via Supabase.

**AdminApplications:** Bulk update check status.

**ATSPipeline:** Local-only check status changes (mock).

**Live dict:** `dict_check_statuses` queried in hooks.

**Certainty:** High

---

## 3. Job Status (`job_status`)

### Mock dict (`mockJobStatuses`)

| ID | Label |
|----|-------|
| 1 | טיוטה |
| 2 | ממתינה לאישור |
| 3 | פעילה |
| 4 | הקפאה |
| 5 | סגורה |
| 6 | אוישה |
| 7 | פורסמה |
| 8 | בוטלה |
| 9 | ארכיון |

**Mutation mapping:** Hire sets `job_status = 5` (comment: "מאוישת") — mock label for 5 is "סגורה", for 6 is "אוישה".

**CreateJobWizard:** New jobs inserted with `job_status: 1` (draft).

**AdminJobsPage / JobDetailsPage:** Update `job_status` via Supabase.

**Certainty:** High for IDs used in code; **Medium** for label alignment with live dict.

---

## 4. Account Status (`account_status`)

### Mock dict (`mockAccountStatuses`)

| ID | Label |
|----|-------|
| 1 | פוטנציאלי |
| 2 | מגייס פעיל |
| 3 | הקפאה |
| 4 | עזב |
| 5 | לטיפול |
| 6 | לא רלוונטי |
| 7 | פעיל |
| 8 | פעיל - VIP |

**Used by:** AdminEmployers/AdminAccounts filters, KPIs, sheet edit; EmployerProfile updates.

**Live dict:** `dict_account_statuses`.

**Certainty:** High

---

## 5. Account Type (`account_type`)

Mock IDs 1–10 (מרפאה פרטית, רשת, קופ"ח, …). Used in employer/account filters and forms.

**Certainty:** High

---

## 6. Contact Availability / Profile

- **`availability`** → `dict_availability` — candidate "seeking work" signal; used in AdminCandidates filter logic.
- **`profile_type`** → `dict_profile_types` — distinguishes מועמד / מגייס / איש גיוס / etc.
- **`source`** → `dict_sources` — lead origin.

**AdminCandidates definition (code):** Contacts with `rel_contact_profiles` or availability/profile filters — reads Supabase.

**Certainty:** Medium

---

## 7. Inbox V2 Merge Status (`merge_status`)

**Source:** `inbox_v2` table, `InboxV2Filters.status` filters on `merge_status`.

Specific ID → label mapping in `src/lib/inbox-v2-dicts.ts` (not fully enumerated here).

**Flow (conceptual):** Upload batch → parse → match to contact/account → merge or create → audit in `inbox_merge_actions`.

**Certainty:** Medium

---

## 8. Inbox V1 (Mock) — Open State

**InboxPage** uses string filters: `open` / `handled` / `spam` on mock lead fields — not the same schema as inbox_v2.

**Certainty:** High

---

## Status Change Matrix by Screen

| Screen | application_status | check_status | job_status | account_status | Persists to DB? |
|--------|-------------------|--------------|------------|----------------|-----------------|
| AdminApplications | Yes (bulk + single) | Yes | Yes (via hire=12) | No | **Yes** |
| ATSPipeline | Yes (UI policy) | Yes | No (toast only) | No | **No** (mock local) |
| Candidate360 | Yes (insert new app) | Yes (contact) | No | No | **Yes** |
| SmartMatch | Yes (local mock create) | No | No | No | **No** |
| AdminJobs / JobDetails | No | No | Yes | No | **Yes** |
| AdminEmployers | No | No | No | Yes | **Yes** |
| InboxV2 | No | No | No | No | merge_status / row updates |

---

## End-to-End Flow (Conceptual)

```
Lead (inbox_v2 or mock inbox)
    → merge/create → contact
    → optional: application (manual, form, SmartMatch, Candidate360)
    → application_status pipeline (AdminApplications live / ATS mock)
    → hire (status 12) → job_status 5
```

**Certainty:** Medium — exact business rules for each entry point not fully specified in code comments.

---

## Items Requiring Live Dict Validation

1. Full list and Hebrew labels in `dict_application_statuses` (resolve 12/15 mismatch).
2. Full list in `dict_job_statuses` (resolve 5 vs 6 "filled" semantics).
3. Whether `applications` status 13 = archive matches UI KPI "ארכיון".
4. Inbox v2 `merge_status` enum values.

See [open-questions.md](./open-questions.md).
