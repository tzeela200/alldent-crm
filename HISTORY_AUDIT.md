# History Audit — AllDent CRM
> מסמך אבחון בלבד. אין שינויי קוד.
> תאריך: 2026-06-29

## מקורות שיש לי גישה אליהם בפועל

| מקור | מה יש לי |
|---|---|
| Git log | 35 commits, 2026-06-10 עד 2026-06-29 — גישה מלאה |
| `git show --stat` | הורץ על 28 מתוך 35 commits |
| Memory files | 5 קבצים ב-`~/.claude/.../memory/` — גישה מלאה |
| `docs/plans/candidate-profile-system.md` | תוכנית מפורטת — גישה מלאה |
| `docs/plans/2026-06-15-website-migration-from-old-site.md` | קיים — לא נקרא בסשן זה |
| `docs/audit/` | **לא קיים** — נמחק ב-commit `cc7b700` (2026-06-23) |
| שיחות צ'אט | **אין גישה** |
| Supabase (live DB) | **אין גישה** — לא הרצתי queries |

---

## טבלת ההיסטוריה

| תאריך / מקור | נושא | החלטה / שינוי | קבצים ששונו (מ-git --stat) | DB/Supabase הושפע? | מסכים הושפעו | סטטוס אמינות | דורש אישור מחדש? |
|---|---|---|---|---|---|---|---|
| `3a9c16a` 2026-06-10 | Initial commit | בסיס הפרויקט | לא הורץ --stat | לא ידוע | כולם | נמוך | כן |
| `1cc077c` 2026-06-11 | Inbox + Applications | InboxV2 — 20 קבצים חדשים: `useApplicationMutations`, `useApplications`, `ApplicationDetailPanel`, `ApplicationFiltersBar`, `ManualCreateDialog`, `InboxV2*`, `inbox-v2-*.ts`, `types/inbox-v2.ts` | 20 קבצים (ראה --stat) | כן — טבלת `inbox_v2` (הנחה מהקבצים) | InboxV2Page, AdminApplicationsPage | **בינוני** — commit message "Update inbox and applications screens" | כן — לא ידוע מה בדיוק השתנה |
| `2709fd9` 2026-06-11 | Applications → Live Supabase | AdminApplicationsPage עוצב מחדש עם live data; `useApplications.ts`, `useApplicationMutations.ts`, `ApplicationDetailPanel`, `ApplicationFiltersBar`, `ManualCreateDialog`, `types/applications.ts` נוצרו | 8 קבצים | כן — טבלת `applications` (הנחה) | AdminApplicationsPage | **בינוני** — מבוסס git stat | כן — האם view מועשר או raw table? |
| `23a1af3` 2026-06-12 | backup | לא ידוע | לא הורץ --stat | לא ידוע | לא ידוע | נמוך | כן |
| `018e07e` 2026-06-12 | Design tokens — Shell.tsx | עדכון design tokens: `#F3F4F6`, `#D9D9D9`, `#2D2D2D`, `#6B6B6B`, `#008080` | `src/components/layout/Shell.tsx` | לא | כל Admin pages | **גבוה** — קוד נקרא ואומת | לא |
| `e85429c` 2026-06-13 | AdminBadge + statusColors | יצירת `AdminBadge` + `getAdminBadgeVariant` helper | `AdminBadge.tsx`, `statusColors.ts` | לא | כל Admin tables | **גבוה** — קוד נקרא ואומת | לא |
| `2c0fcef` 2026-06-13 | AdminTable | יצירת `AdminTable` generic עם sort + selection | `AdminTable.tsx` | לא | כל Admin tables | **גבוה** — קוד נקרא ואומת | לא |
| `84ee3f2` 2026-06-13 | AdminBadge ב-AdminJobsPage | שילוב AdminBadge | `AdminJobsPage.tsx` | לא | AdminJobsPage | **גבוה** | לא |
| `bedc2b0` 2026-06-14 | Public site expansion | יצירת role pages, employers pages, dental services, PublicHeader, SiteFooter, `publicRolePages.ts` | 30 קבצים | לא | כל עמודי Public | **גבוה** — git stat אומת | לא |
| `3dc4eb9` 2026-06-14 | Applications → Supabase (כתיבה) | חיבור `ApplyModal` + `AdminApplicationsPage` לנתונים אמיתיים; `useApplicationMutations.ts` | `ApplyModal.tsx`, `AdminApplicationsPage.tsx`, `useApplicationMutations.ts`, `useApplications.ts`, `useContact360.ts`, `types/applications.ts`, `ManualCreateDialog.tsx`, `Candidate360Page.tsx` | **כן** — כתיבה ל-`applications` | AdminApplicationsPage, ApplyModal, Candidate360Page | **גבוה** | לא |
| 6x commits `2026-06-15` design | Design sweep | `rounded-full → rounded-[6px]`, header standardization, table body unification, SortableTh fix | admin tables | לא | כל Admin tables | **גבוה** — commits ברורים | לא |
| `2b5be87` 2026-06-15 | PublicLaunchGate | יצירת `PublicLaunchGate` + `ComingSoonPage`; env flag `VITE_PUBLIC_SITE_LIVE` | `PublicLaunchGate.tsx`, `ComingSoonPage.tsx`, `App.tsx` | לא | כל Public pages | **גבוה** — קוד נקרא ואומת | לא |
| `b3dc4f5` 2026-06-15 | Vercel + docs | `vercel.json` + קבצי docs אנליזה + migration plan | `vercel.json`, `docs/site-analysis*.md`, `docs/plans/2026-06-15-*.md` | לא | — | גבוה | לא |
| `54454b2` 2026-06-15 | Supabase Auth (ראשון) | `AuthContext`, `LoginPage`, `AuthGuard` + protect `/admin`; package.json + supabase SDK | 16 קבצים כולל `AuthContext.tsx`, `LoginPage.tsx`, `AuthGuard.tsx`, `vercel.json` | **כן** — Supabase Auth service | כל `/admin` | **גבוה** — קוד נקרא ואומת | לא |
| `7b9f64d` 2026-06-16 | Supabase Auth (שני) | commit message זהה ל-`54454b2` | לא הורץ --stat | כן? | `/admin` | **נמוך** — שני commits עם message זהה | **כן — מה ההבדל בין 54454b2 ל-7b9f64d?** |
| `4a525a3` / `f7ff834` 2026-06-16 | update / update | לא ידוע | לא הורץ --stat | לא ידוע | לא ידוע | נמוך | כן |
| `db11c1e` 2026-06-17 | JobAIWriter | יצירת `JobAIWriter` component | `JobAIWriter.tsx`, `CreateJobWizardPage.tsx`, `JobDetailsPage.tsx` | כן? — Edge Function (הנחה) | CreateJobWizardPage, JobDetailsPage | **בינוני** | כן — האם Edge Function deployed? |
| `1ee9da2` + `22b7c98` 2026-06-17/18 | Job fixes bundle (x2) | commit message זהה — admin jobs, job details, create job, Employer360 links | לא הורץ --stat | כן? | AdminJobsPage, JobDetailsPage, Employer360Page | **נמוך** — שני commits זהים | כן |
| `105566f` 2026-06-18 | Fix empty arrays בsaveJob | שליחת `[]` במקום `null` לשדות array | commit message ציין `useApplicationMutations` — stat הראה `publicJobsService.ts` | **כן** — כתיבה ל-jobs | CreateJobWizardPage, JobDetailsPage | **גבוה** — commit ברור | לא |
| `921a283` 2026-06-18 | Fix dict_cities בAdminJobsPage | טעינת כל 1283 ערים עם pagination | `AdminJobsPage.tsx` (--stat אחד קובץ) | **כן** — `dict_cities` | AdminJobsPage | **גבוה** | לא |
| `cd7207f` 2026-06-18 | Fix contacts — stream 1000 | stream של 1000 contacts ראשונים | `AdminContactsPage.tsx` | כן | AdminContactsPage | **בינוני** — הוחלף ב-commit הבא? | כן |
| `118c0a6` 2026-06-18 | Server-side pagination contacts | פאגינציה צד שרת + KPI counts מדויקים | `AdminContactsPage.tsx` | **כן** | AdminContactsPage | **גבוה** | לא |
| `554a52c` 2026-06-18 | Real KPI counts by role/region | KPI אמיתיים | `AdminContactsPage.tsx` | **כן** | AdminContactsPage | **גבוה** | לא |
| `beed5f3` 2026-06-18 | RecruitmentRequestPage | טופס ציבורי + Employer360 link | `RecruitmentRequestPage.tsx`, `App.tsx`, `AdminEmployersPage.tsx` | לא ידוע | RecruitmentRequestPage, Employer360Page | **בינוני** | כן — האם הטופס שולח ל-Supabase? |
| `8a229c9` 2026-06-18 | Recruitment CTA | CTA בדפי employers | `EmployersBrandingPage.tsx`, `EmployersDiscreetPage.tsx` | לא | EmployersBrandingPage, EmployersDiscreetPage | גבוה | לא |
| `f88a68d` 2026-06-21 | Fix cities — 6 מסכים | queryKey `dict_cities-all` בכל המסכים | 6 קבצי דפים | **כן** — `dict_cities` | AdminContactsPage, AdminCandidatesPage, AdminEmployersPage, AdminJobsPage, CreateJobWizardPage, RecruitmentRequestPage | **גבוה** — git stat אומת | לא |
| `2816a60` 2026-06-21 | CityRegionPicker | shared combobox — החליף inline filters | `CityRegionPicker.tsx` (חדש) + 6 דפים | לא | 6 Admin pages | **גבוה** — קוד נקרא | לא |
| `23703a5` 2026-06-21 | RoleSubRolePicker | shared role+sub-role picker עם multi-select | `RoleSubRolePicker.tsx` (חדש) + 8 דפים | לא | 8 דפים | **גבוה** — קוד נקרא | לא |
| `c119de8` 2026-06-21 | ContactPicker | live search contacts by phone/name | `ContactPicker.tsx` (חדש) + 7 דפים | **כן** — live query ל-contacts | AdminEmployersPage, AdminJobsPage, CreateJobWizardPage + עוד | **גבוה** — קוד נקרא | לא |
| `f423b7a` 2026-06-21 | Job forms overhaul | recruiter picker, job_code suggest | `CreateJobWizardPage.tsx`, `JobDetailsPage.tsx`, `AdminJobsPage.tsx`, `PublicJobPage.tsx`, `publicJobsService.ts` | **כן** | CreateJobWizardPage, JobDetailsPage, PublicJobPage | בינוני | כן |
| `a13aeff` 2026-06-21 | SidePanel unified | `SidePanel.tsx` — unified לJobs/Employers/Contacts | `SidePanel.tsx` (חדש), `AdminContactsPage.tsx`, `AdminEmployersPage.tsx`, `AdminJobsPage.tsx` | לא | 3 Admin pages | **גבוה** — קוד נקרא | לא |
| `64a04ff` 2026-06-22 | Applications — new business model | שינוי מבנה Applications לפי מודל עסקי חדש | 8 קבצי applications | **כן** | AdminApplicationsPage | **גבוה** — commit ברור; תוכן לא נקרא | **כן — מה המודל העסקי החדש?** |
| `9180c97` 2026-06-22 | Applications board UX | role chips, sort, ManualCreateDialog overhaul | `ApplicationFiltersBar.tsx`, `ManualCreateDialog.tsx`, `useApplications.ts`, `AdminApplicationsPage.tsx`, `ATSPipelinePage.tsx`, `types/applications.ts` | **כן** | AdminApplicationsPage, ATSPipelinePage | **גבוה** | לא |
| `54f82c2` 2026-06-22 | Fix v_job_public — הסרת שדה | הסרת `work_schedule_text` מ-query על `v_job_public` | `publicJobsService.ts` | **כן** — view `v_job_public` | PublicJobsPage | **גבוה** — commit ברור | כן — האם `v_job_public` עדיין קיים? |
| `0fa4d9f` 2026-06-22 | Major UI overhaul | PublicHomePage, DentalAssetsPage, EmployerPages; `MergeRecordsModal`, `OrgContactPicker` נוצרו; `docs/audit/` נוצר | 26 קבצים + docs/audit/ | לא ישיר | PublicHomePage, DentalAssetsPage, Employers pages, AdminCandidatesPage, AdminEmployersPage | **גבוה** — git stat אומת | כן — docs/audit/ נמחק ב-commit הבא |
| `cc7b700` 2026-06-23 | Cross-system audit — docs נמחקים | **docs/audit/ נמחק** (6 קבצים ~1,500 שורות); ApplicationDetailPanel, ApplyModal, AdminEmployersPage, AdminJobsPage, PublicHomePage — overhaul | מחיקת `docs/audit/*.md` + 22 קבצי קוד | **כן** — mutations, `useApplicationDicts` | AdminApplicationsPage, AdminEmployersPage, AdminJobsPage, ApplyModal, PublicHomePage, DentalAssetsPage + עוד | **גבוה** — git stat אומת | **כן — מדוע נמחקו docs/audit? מה היה בהם?** |
| `d3ddf0b` 2026-06-23 | Unified review flow | "מאושר למאגר/ספאם" unified flow; employers board UX | `ApplicationDetailPanel.tsx`, `ManualCreateDialog.tsx`, `useApplicationMutations.ts`, `AdminApplicationsPage.tsx`, `AdminEmployersPage.tsx`, `JobDetailsPage.tsx`, `types/applications.ts` | **כן** — mutations ל-applications + contacts | AdminApplicationsPage, AdminEmployersPage, JobDetailsPage | **גבוה** | **כן — מה הסטטוסים? מה ה-flow?** |
| `c8eb3c1` 2026-06-29 | Fix PublicJobCard chevron | הסרת chevron לא עקבי בלי description | `PublicJobCard.tsx` | לא | PublicJobsPage | **גבוה** — קוד נקרא | לא |
| `a97e07e` 2026-06-29 | update — PublicJobPage | שינויים ב-PublicJobPage (26 ins, 4 del) | `PublicJobPage.tsx` | לא ידוע | PublicJobPage | **בינוני** — commit message "update" | כן |
| `docs/plans/candidate-profile-system.md` | Candidate Profile System | שלבים 0-6: Candidate360 ריסטרקצ'ר, `useCandidateProfile` hook, `CandidateProfilePage`, AI Writer, AI Scanner, PDF, personal link | `CandidateProfilePage.tsx`, `ProfileEditForm.tsx`, `useCandidateProfile.ts`, `AIProfileWriter.tsx`, `AIDocumentScanner.tsx` | **כן** — `contact.profile_token` עמודה; RPC `get_profile_by_token`; Edge Functions; RLS policies; `sub_role → bigint[]` | CandidateProfilePage, Candidate360Page | **גבוה** (plan קיים) — **לא ידוע** (האם הכל deployed) | **כן — Edge Functions קיימות? RLS ב-production?** |
| `memory/project_alldent_crm.md` (46 יום) | Project context | "כל 14 מסכים על Mock data" | — | — | כולם | **נמוך — מיושן** | **כן** |
| `memory/project_convert_account_to_contact.md` (2026-06-29) | Convert Account→Contact | RPCs, modal, constraint על execute | `ConvertAccountToContactModal.tsx`, `AdminEmployersPage.tsx` | **כן** — 2 RPCs, עמודות `merged_into_account_id`/`merged_at`, status 11 | AdminEmployersPage | **גבוה** — memory מאותו יום | כן — RPCs deployed? |

---

## 1. החלטות שכנראה עדיין תקפות
*(מבוססות על קוד שנקרא ואומת, commit ברור, ולא הוחלפו)*

1. **AdminBadge + statusColors כ-SSOT** — `e85429c`, קוד אומת
2. **AdminTable component** — `2c0fcef`, קוד אומת
3. **Shell.tsx design tokens** (`#F3F4F6`, `#D9D9D9`, `#008080` וכו') — `018e07e`, קוד אומת
4. **PublicLaunchGate + `VITE_PUBLIC_SITE_LIVE`** — `2b5be87`, קוד אומת
5. **Supabase Auth (AuthContext + AuthGuard + /admin protected)** — `54454b2`, קוד אומת
6. **CityRegionPicker — shared, לא ליצור חלופות** — `2816a60`, קוד אומת
7. **RoleSubRolePicker — shared, לא ליצור חלופות** — `23703a5`, קוד אומת
8. **ContactPicker — live search, לא bulk load** — `c119de8`, קוד אומת
9. **SidePanel — unified** — `a13aeff`, קוד אומת
10. **dict_cities — 1283 ערים, queryKey `dict_cities-all`** — `f88a68d`, אומת
11. **Applications: React Query + PAGE_SIZE=20** — `2709fd9`/`64a04ff`, קוד אומת
12. **InboxV2: React Query + PAGE_SIZE=20 + staleTime=30s** — `1cc077c`, קוד אומת
13. **account_status=11 = מוזג/כפילות** — memory + statusColors, אומת
14. **phone_norm UNIQUE NOT NULL** — types/index.ts, אומת
15. **job_code = TEXT (לא number)** — types/index.ts, אומת
16. **account.contact_link = legacy TEXT, לא FK** — types/index.ts, אומת
17. **Job array fields = `[]` לא `null`** — `105566f`
18. **rounded-[6px] לbadges (לא rounded-full)** — commits design 2026-06-15
19. **Convert Account→Contact: אסור execute ללא Preview + אישור per-case** — memory 2026-06-29

---

## 2. החלטות שדורשות אישור מחדש ממך

| # | שאלה | מקור הספק |
|---|---|---|
| 1 | "כל 14 מסכים על Mock" — מה באמת מצב ה-Mock היום? | memory 46 יום ישן vs קוד live |
| 2 | שני commits "Supabase Auth" זהים (`54454b2`, `7b9f64d`) — מה ההבדל? | git log |
| 3 | שלושה commits "update"/"backup" — מה קרה בהם? | `a97e07e`, `4a525a3`, `f7ff834`, `23a1af3` |
| 4 | מה "business model חדש" של Applications (`64a04ff`)? | commit message בלי פירוט |
| 5 | מה flow "מאושר למאגר/ספאם" (`d3ddf0b`)? אילו status IDs? | commit message בלי פירוט |
| 6 | docs/audit/ נמחד ב-`cc7b700` — מכוון? מה היה בו? | git log |
| 7 | Candidate Profile — Edge Functions `ai-profile-writer`, `ai-document-scanner` — deployed? | plan file vs Supabase (אין גישה) |
| 8 | RecruitmentRequestPage — האם הטופס שולח ל-Supabase? | לא נקרא |
| 9 | JobAIWriter (`db11c1e`) — האם Edge Function קיימת? | הנחה מהקבצים |
| 10 | `v_job_public` view — עדיין קיים ב-Supabase? אותו מבנה? | `54f82c2` מוכיח שהיה ב-2026-06-22 |
| 11 | Convert Account→Contact RPCs — deployed ואומתו מחוץ ל-rollback? | memory בלבד |
| 12 | `useApplications` מ-Mock ו-Live — מי מנצח? | שני hooks בשם זהה |
| 13 | `cd7207f` (stream 1000) הוחלף ב-`118c0a6` (server-side pagination) — מה הקוד הנוכחי? | שני commits בפער שעות |
| 14 | RPC `get_profile_by_token` — deployed? RLS על `contact` לפי `profile_token`? | plan file בלבד |

---

## 3. חוקים שחסרים לגמרי ממסמכי הזיכרון שלי

1. מה flow "מאושר למאגר / ספאם" — אילו status IDs, mutations, tables
2. מה "business model חדש" של Applications (`64a04ff`)
3. Schema של `inbox_v2` — מה העמודות, מה ה-status values
4. אילו Edge Functions קיימות ב-Supabase (לא רק שהקוד קורא להן)
5. אילו RLS policies קיימות ב-Supabase
6. מה פורמט DB Change Proposal — מוזכר בmemory, לא הוגדר
7. מה 12 הסעיפים של "output format" — מוזכר בmemory, לא ידוע
8. מה `MergeRecordsModal` עושה — נוצר ב-`0fa4d9f`, לא נקרא
9. מה `OrgContactPicker` עושה לעומת `ContactPicker` — שניהם קיימים
10. האם RecruitmentRequestPage חי (שולח data לDB)?

---

## 4. מקומות שבהם הזיכרון שלי ישן או לא מעודכן

| זיכרון / הנחה | ראיה שהוא ישן |
|---|---|
| "כל 14 מסכים על Mock" (memory 46 יום) | קוד: Contacts, Accounts, Applications, InboxV2, Employers — כולם Live Supabase |
| `docs/audit/` — 6 קבצי audit קיימים | נמחקו ב-`cc7b700` 2026-06-23 |
| "14 screens" | App.tsx מראה יותר — CandidateProfilePage, EmployerProfilePage, RecruitmentRequestPage, Employer360, Candidate360 — לא ספרתי אבל בוודאי מעל 14 |
| plan file שלב 6 סומן ⬜ | הערה בסיכום הזמנים אומרת הושלם (15 דקות) — סתירה פנימית בplan file עצמו |
| Contacts אין pagination | `118c0a6` 2026-06-18 מוסיף server-side pagination — ייתכן שהקוד שנקרא ב-`useSupabaseData.ts` ישן |

---

*מסמך אבחון בלבד. נוצר 2026-06-29.*
