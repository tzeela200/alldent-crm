# Rule Inventory — AllDent CRM
> מסמך אבחון בלבד. אין שינויי קוד.
> תאריך: 2026-06-29 | מודל: claude-sonnet-4-6

---

## A. חוקי Auth & גישה

---

### A-1 — כל נתיב Admin מוגן על ידי Supabase Auth

**מה החוק אומר:**
כל route תחת `/admin/*` עטוף ב-`AuthGuard`. אם אין session פעיל ב-Supabase, המשתמש מנותב ל-`/login`.

**איפה הוא נמצא:**
- `src/App.tsx` — `<Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>`
- `src/components/auth/AuthGuard.tsx` — בודק `user` מ-`useAuth()`
- `src/contexts/AuthContext.tsx` — `supabase.auth.signInWithPassword` + `onAuthStateChange`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל 14 מסכי ה-Admin

**יישום כפול:** לא — נקודה אחת של אכיפה (AuthGuard)

**סתירה memory/קוד/Supabase:** אין סתירה

**מידע חסר:** אין הרשאות בתוך Admin (כל משתמש רשאי לכל מסך). לא ידוע אם יש roles בטבלת Supabase auth.users או בטבלה נפרדת.

---

### A-2 — Public Site מוסתר עד להשקה דרך env flag

**מה החוק אומר:**
אתר ציבורי מוצג רק אם `VITE_PUBLIC_SITE_LIVE=true`. אחרת מוצג `ComingSoonPage`. Admin ולוגין תמיד נגישים.

**איפה הוא נמצא:**
- `src/components/public/PublicLaunchGate.tsx` — `import.meta.env.VITE_PUBLIC_SITE_LIVE`
- `src/App.tsx` — `<PublicLaunchGate>` עוטף את כל הנתיבים

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל הנתיבים הציבוריים (`/`, `/jobs`, `/employers` וכו')

**יישום כפול:** לא — נקודה אחת

**סתירה:** אין

**מידע חסר:** מה ערך ה-flag בסביבת production כיום? לא ידוע.

---

### A-3 — אין הרשאות רמה שנייה בתוך Admin

**מה החוק אומר:**
כל משתמש מחובר רואה ויכול לבצע הכל בתוך `/admin`. אין super-admin / read-only / recruiter בקוד.

**איפה הוא נמצא:**
- `AuthContext.tsx` — מחזיר רק `user` (boolean existence), לא role
- `AuthGuard.tsx` — בודק רק `!!user`

**סטטוס:** ודאי ברמת הקוד הנוכחי

**על אילו מסכים משפיע:** כל מסכי Admin

**יישום כפול:** —

**סתירה:** ייתכן שב-Supabase RLS יש הגדרות permission. לא ידוע.

**מידע חסר:** האם יש Row Level Security בטבלאות Supabase? האם יש תוכנית לרמות הרשאה עתידיות?

---

## B. חוקי Data Layer — מי מביא נתונים מאיפה

---

### B-1 — Contacts ו-Accounts: Live Supabase (ללא React Query)

**מה החוק אומר:**
`useContacts`, `useContact`, `useCandidates`, `useAccounts` — כולם שולחים queries ישירות ל-Supabase עם `useEffect` + `useState`. אין React Query, אין cache, אין pagination בצד הלקוח.

**איפה הוא נמצא:**
- `src/hooks/useSupabaseData.ts` — raw `useEffect` / `useState`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminContactsPage, AdminCandidatesPage, Candidate360Page, AdminAccountsPage, AdminEmployersPage

**יישום כפול:** `useContacts` מביא הכל ו-`useCandidates` מסנן בזיכרון (`filter` על client side)

**סתירה:** `useApplications` ו-`useInboxV2` משתמשים ב-React Query + pagination. אין אחידות בגישה.

**מידע חסר:** מה מגבלת ה-rows ב-`useContacts` ו-`useAccounts`? אין `.limit()` בקוד. עלול להחזיר אלפי רשומות.

---

### B-2 — Applications: React Query + Pagination (PAGE_SIZE=20)

**מה החוק אומר:**
הגשות נטענות דרך `useQuery` של React Query עם pagination של 20 שורות לעמוד. יש sort ו-filters צד שרת.

**איפה הוא נמצא:**
- `src/hooks/useApplications.ts` — `useQuery`, `APPLICATIONS_PAGE_SIZE = 20`
- טבלת Supabase: `applications` (view מועשר, לא raw table — ניתן לsearch על שדות join כגון `candidate_name`, `account_name`)

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminApplicationsPage, ATSPipelinePage

**יישום כפול:** אין

**סתירה:** הקוד שולח `.or('candidate_name.ilike...')` — שם שאינו עמודה של טבלת `applications` גולמית. מעיד שקיים view מועשר. שם הטבלה/view האמיתי לא אומת.

**מידע חסר:** שם ה-view בסיסי שמקנן applications? האם זה view או materialized view?

---

### B-3 — InboxV2: React Query + Pagination (PAGE_SIZE=20) + staleTime=30s

**מה החוק אומר:**
`inbox_v2` נטען דרך React Query. Cache חי 30 שניות. Pagination 20 שורות. Sort: `created_at DESC`.

**איפה הוא נמצא:**
- `src/hooks/useInboxV2.ts` — `staleTime: 30_000`
- טבלת Supabase: `inbox_v2`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** InboxV2Page

**יישום כפול:** אין

**סתירה:** אין

**מידע חסר:** מה ההבדל בין `inbox` (v1) ל-`inbox_v2`? v1 עדיין רץ על Mock.

---

### B-4 — Jobs, SmartMatch, InboxV1, Dicts: עדיין Mock

**מה החוק אומר:**
`useJobs`, `useJob`, `useInbox`, `useSmartMatch`, `useDicts`, `useDictName`, `useMockMutations` — כולם re-exported מ-`useMockData.ts` ב-`useSupabaseData.ts`.

**איפה הוא נמצא:**
- `src/hooks/useSupabaseData.ts` שורות 10-19: `export { useDicts, useDictName, useJobs, useJob, useApplications, useInbox, useSmartMatch, useMockMutations } from '@/hooks/useMockData'`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminJobsPage, JobDetailsPage, SmartMatchPage, InboxPage (v1), כל מסך שמשתמש ב-Dict dropdown

**יישום כפול:** —

**סתירה:** `useApplications` מ-Mock מיוצא מ-`useSupabaseData` אך גם קיים `src/hooks/useApplications.ts` Live. לא ברור איזה מיוצא בפועל מכיוון שהשמות זהים — עלולה להיות collision.

**מידע חסר:** מי מ-import אותם? כל דף צריך לבדוק ממי הוא מייבא.

---

### B-5 — AdminEmployersPage: React Query ישיר (לא Hook)

**מה החוק אומר:**
`AdminEmployersPage` לא משתמש ב-`useAccounts` hook — הוא מריץ `useQuery` ישירות מהדף, עם לוגיקת enrich מורכבת (join עם contacts, jobs, applications).

**איפה הוא נמצא:**
- `src/pages/AdminEmployersPage.tsx` — `useQuery`, `useQueryClient` מיובאים ישירות

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminEmployersPage בלבד

**יישום כפול:** כן — לוגיקת fetch של accounts קיימת גם ב-`useAccounts` ב-`useSupabaseData.ts`. שני מנגנונים שונים לאותו entity.

**סתירה:** `useAccounts` מחזיר `Account[]` flat. `AdminEmployersPage` בונה `EnrichedAccount` עם joins. זה לא inconsistency בהכרח אבל אומר שאין single source of truth לנתוני accounts-with-context.

**מידע חסר:** האם `AdminAccountsPage` משתמש ב-`useAccounts`? לא בדקתי.

---

## C. חוקי Phone / Identity

---

### C-1 — phone_norm הוא המזהה הייחודי של Contact

**מה החוק אומר:**
`contact.phone_norm` הוא UNIQUE NOT NULL בבסיס הנתונים. פורמט: `972XXXXXXXXX` (ללא מקף, עם קידומת ארצית, ללא +). זהו המפתח למניעת כפילויות.

**איפה הוא נמצא:**
- `src/types/index.ts` — `phone_norm: string // UNIQUE NOT NULL`
- Supabase טבלת `contact` — constraint ברמת DB
- `memory/project_convert_account_to_contact.md` — "normalize_il_mobile_phone() בDB"

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל מסך שיוצר/ממזג Contact

**יישום כפול:** כן — `src/lib/normalizePhone.ts` עושה נרמול בצד הלקוח, אך מחזיר `05XXXXXXXX` (ללא 972). הפורמט שונה מה-DB. יש פונקציית DB `normalize_il_mobile_phone()` שמייצרת `972XXXXXXXXX`.

**סתירה:** `normalizePhone()` בקוד → `05XXXXXXXX`. DB trigger → `972XXXXXXXXX`. אם הקוד שולח `05X` ל-DB, ה-trigger מנרמל ל-`972X` — או שהטריגר לא פועל על insert ישיר מהקוד.

**מידע חסר:** האם הטריגר מופעל ב-BEFORE INSERT/UPDATE? האם `normalizePhone` משמש ל-search בלבד, או גם ל-write?

---

### C-2 — Contact חייב phone OR email OR facebook

**מה החוק אומר:**
ל-contact יש טריגר שמחייב לפחות אחד משלושה: phone, email, facebook_url. INSERT/UPDATE ב-contact בלי אחד מהם ייכשל.

**איפה הוא נמצא:**
- Supabase טבלת `contact` — טריגר DB (שם הטריגר לא ידוע לי)
- `memory/project_convert_account_to_contact.md`

**סטטוס:** ודאי (Supabase), לא מיושם בקוד Frontend

**על אילו מסכים משפיע:** כל מסך שיוצר/עורך Contact

**יישום כפול:** לא — רק ברמת DB

**סתירה:** קוד הFrontend לא מאמת זאת לפני שליחה — validation ב-UI לא ידוע.

**מידע חסר:** שם הטריגר המדויק. האם יש validation בקוד לפני שליחה?

---

## D. חוקי Status

---

### D-1 — statusColors.ts הוא SSOT לסטטוסים וצבעיהם

**מה החוק אומר:**
כל label, bg, text של כל status מוגדר ב-`src/lib/statusColors.ts`. אין להגדיר inline. פונקציות `getStatusBadge` ו-`getAdminBadgeVariant` הן ה-API.

**איפה הוא נמצא:**
- `src/lib/statusColors.ts`

**סטטוס:** הנחת עבודה (לא מוגדרת בכתב, אבל נראה שכך משתמשים בו)

**על אילו מסכים משפיע:** כל מסך Admin עם badges

**יישום כפול:** `AdminEmployersPage.tsx` מכיל פונקציה מקומית `getEmployerStatusBadge` — כלומר לא כולם עוברים דרך SSOT.

**סתירה:** קיים inline status rendering ב-`AdminEmployersPage`. זה סותר את החוק.

**מידע חסר:** האם זה חריג מכוון, או drift?

---

### D-2 — account_status=11 מסתיר את ה-account מרשימת ברירת מחדל

**מה החוק אומר:**
Account שמוזג (status=11, 'מוזג / כפילות') לא מופיע בברירת מחדל ב-`AdminEmployersPage` ו-`AdminAccountsPage`. נראה רק אם מסננים אליו במפורש.

**איפה הוא נמצא:**
- `src/lib/statusColors.ts` — הגדרת status 11
- `AdminEmployersPage.tsx` — filter שמדיר status 11 (הנחה, לא אומת בקריאה זו)
- Supabase: `dict_account_statuses` id=11

**סטטוס:** ודאי מצד DB + statusColors. הנחה לגבי ה-filter בפועל בדפים.

**על אילו מסכים משפיע:** AdminEmployersPage, AdminAccountsPage

**יישום כפול:** —

**סתירה:** לא אומת שה-filter אכן קיים בקוד הדפים.

**מידע חסר:** האם ה-query ב-`AdminEmployersPage` מוציא `account_status != 11` כברירת מחדל? לא קראתי את כל הדף.

---

### D-3 — Applications "Active" = לא [5,10,13,14,15]

**מה החוק אומר:**
`active_apps_only` filter מוציא applications שה-status שלהן הוא 5 (נדחה?), 10 (ביטל), 13 (ארכיון), 14 (מועמד במאגר), 15 (הושמה).

**איפה הוא נמצא:**
- `src/hooks/useApplications.ts` שורה 59: `.not('application_status', 'in', '(5,10,13,14,15)')`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminApplicationsPage

**יישום כפול:** אין

**סתירה:** status 5 ב-`applicationStatusColors` = 'ראיון תואם', לא "נדחה". status 9 = 'נדחה'. המספרים שנחשבים "closed" (5,10,13,14,15) לא תואמים ישיר את labels — status 5 נחשב "closed" אבל נקרא "ראיון תואם". זה מבלבל.

**מידע חסר:** מה ה-business logic מאחורי הבחירה בדיוק את status IDs 5,10,13,14,15 כ-"closed"?

---

### D-4 — Applications "Closed" = [5,13,14,15]

**מה החוק אומר:**
`closed_apps_only` מסנן ל-status שב-`[5,13,14,15]` בלבד (לא 10).

**איפה הוא נמצא:**
- `src/hooks/useApplications.ts` שורה 61

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminApplicationsPage

**סתירה:** `active_apps_only` מוציא 5 גם, אבל `closed_apps_only` כולל 5. כלומר status=5 נחשב גם לא-active וגם closed. status=10 (ביטל) מוצא מ-active אבל לא נכלל ב-closed. הגדרות אינן משלימות.

**מידע חסר:** זה באג? עיצוב מכוון? נדרש אישור.

---

## E. חוקי UI / Design System

---

### E-1 — Shell הוא wrapper לכל מסכי Admin

**מה החוק אומר:**
`Shell` מ-`src/components/layout/Shell.tsx` הוא container סטנדרטי: header עם icon + title + subtitle + actions, background `bg-[#F3F4F6]`, RTL, `max-w-[1700px]`. כולם שומרים על אותו layout.

**איפה הוא נמצא:**
- `src/components/layout/Shell.tsx`
- `src/pages/AdminEmployersPage.tsx` (מיובא Shell, Toolbar, SearchBar, ActionButton, Pagination, EmptyState)

**סטטוס:** הנחת עבודה — לא ידוע כמה מסכים משתמשים בו

**על אילו מסכים משפיע:** לא ידוע (AdminEmployersPage לפחות)

**יישום כפול:** גם `AdminLayout.tsx` קיים. לא ברור מה ההבדל בתפקיד.

**סתירה:** Shell הוא layout content-area. AdminLayout הוא app shell (sidebar + nav). ייתכן שניהם נדרשים בהיררכיה — לא ודאי.

**מידע חסר:** כמה מסכים משתמשים ב-Shell? האם זה standard מחייב?

---

### E-2 — צבע ראשי: Teal (#008080)

**מה החוק אומר:**
הצבע הראשי של המערכת הוא `#008080` (teal). משמש לאיקונים, focus rings, borders פעילים, כפתורים ראשיים בחלק מהמקומות.

**איפה הוא נמצא:**
- `Shell.tsx` — icon container: `bg-[#008080]`
- `Shell.tsx` — SearchBar focus: `focus:border-[#008080]`
- `AuthGuard.tsx` — spinner: `border-teal-600`
- `statusColors.ts` — teal variant

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל מסכי Admin

**יישום כפול:** חלקית — `#008080` כ-hex literal וגם `teal-600` כ-Tailwind class. לא אחיד.

**סתירה:** CTA buttons ב-`ActionButton`: `primary` = `bg-[#D97706]` (amber/orange), לא teal. ייתכן שיש שתי "primary" שונות.

**מידע חסר:** מה primary CTA color רשמי? teal או amber?

---

### E-3 — RTL מלא, text-right, dir="rtl"

**מה החוק אומר:**
כל ממשק Admin הוא RTL. `Shell` מגדיר `dir="rtl"`. ניווט, טבלאות, טפסים — הכל align right.

**איפה הוא נמצא:**
- `Shell.tsx` — `dir="rtl" ... text-right`
- `AdminTable.tsx` — `text-right`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל מסכי Admin

**יישום כפול:** —

**סתירה:** אין

**מידע חסר:** האם ממשקים ציבוריים גם RTL? לא נבדק.

---

### E-4 — Design tokens: border-radius, border-color, bg

**מה החוק אומר:**
Cards וsections: `rounded-[18px]`, `border border-[#D9D9D9]`, `bg-white`.
Header rows בטבלאות: `bg-[#F3F4F6]`.
Page background: `bg-[#F3F4F6]`.
Text ראשי: `text-[#2D2D2D]`.
Text משני: `text-[#6B6B6B]`.

**איפה הוא נמצא:**
- `Shell.tsx`, `AdminTable.tsx`, `Shell.tsx` KPICard

**סטטוס:** ודאי (נראה עקבי בקבצים שנקראו)

**על אילו מסכים משפיע:** כל מסכי Admin

**יישום כפול:** —

**סתירה:** לא ידוע אם קיים `tailwind.config.ts` שמגדיר tokens רשמית, או שאלו הם magic strings מפוזרים.

**מידע חסר:** האם קיים design token מרכזי ב-Tailwind config?

---

### E-5 — Pagination: עמוד-בסיס-0, 20 פריטים לעמוד

**מה החוק אומר:**
Pagination בממשק: עמוד 0 = ראשון. `Shell.tsx` מציג "עמוד {page+1} מתוך {totalPages}". `PAGE_SIZE=20` ב-AdminEmployersPage וב-InboxV2.

**איפה הוא נמצא:**
- `Shell.tsx` — `Pagination` component
- `AdminEmployersPage.tsx` — `const PAGE_SIZE = 20`
- `src/hooks/useInboxV2.ts` — `const PAGE_SIZE = 20`
- `src/hooks/useApplications.ts` — `APPLICATIONS_PAGE_SIZE = 20`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminEmployersPage, InboxV2Page, AdminApplicationsPage

**יישום כפול:** PAGE_SIZE מוגדר בשלושה מקומות נפרדים (לא קבוע גלובלי)

**סתירה:** Contacts ו-Accounts אין להם pagination (מביאים הכל)

**מידע חסר:** האם Contacts/Accounts יגדלו מספיק כדי שהיעדר pagination יהיה בעיה?

---

## F. חוקי Entity — Business Logic

---

### F-1 — Account.contact_link הוא legacy ואינו FK קנוני

**מה החוק אומר:**
`accounts.contact_link` הוא `TEXT` ישן — לא FK אמיתי ל-contact. ה-FK הקנוני הוא `contact.account_link → accounts.account_id`.

**איפה הוא נמצא:**
- `src/types/index.ts` — `contact_link: string | null // legacy TEXT — NOT canonical FK`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** כל מסך שמציג "איש קשר ראשי" של ארגון

**יישום כפול:** `AdminEmployersPage` בונה `linkedContacts` על ידי join: contacts שה-`account_link` שלהם מצביע על ה-account. זה שימוש בכיוון הנכון.

**סתירה:** `EmployerDraft` (בתוך AdminEmployersPage) כולל `contact_link: string | null` — האם form עורך את השדה הלגאסי?

**מידע חסר:** האם יש migration plan להסיר `contact_link` הלגאסי?

---

### F-2 — Job.job_code הוא TEXT, לא number

**מה החוק אומר:**
מפתח ראשי של משרה הוא TEXT בפורמט `[A-Z]{2,5}\d{1,5}` (לדוג' `DEN123`). URL: `/admin/jobs/:code`.

**איפה הוא נמצא:**
- `src/types/index.ts` — `job_code: string // PK — TEXT`
- `src/App.tsx` — `LegacyJobRedirect` normalizes to uppercase

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminJobsPage, JobDetailsPage, AdminApplicationsPage (FK)

**יישום כפול:** —

**סתירה:** `src/types/index.ts` מציין `job_sub_role: number | null // FK → dict_sub_roles (bigint ב-DB)` — הערה מציינת bigint ב-DB אבל TypeScript number. לא ישיר סתירה אבל שווה לציין.

**מידע חסר:** —

---

### F-3 — Contact.profile_type — display בלבד; M:N אמיתי ב-rel_contact_profiles

**מה החוק אומר:**
`contact.profile_type` הוא שדה display שמכיל ערך יחיד. ה-M:N האמיתי (מועמד / מגייס / מעסיק / ...) נמצא ב-`rel_contact_profiles`. שינוי בשדה אחד לא מתעדכן אוטומטית בשני.

**איפה הוא נמצא:**
- `src/types/index.ts` — `profile_type: number | null // → dict_profile_types (display only)`
- `memory/project_convert_account_to_contact.md`

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminContactsPage, Candidate360Page, כל form עריכת Contact

**יישום כפול:** שני מיקומים שמייצגים אותו concept

**סתירה:** `useCandidates` מסנן ב: `c.availability != null || c.profile_type === 1` — כלומר profile_type=1 נחשב "מועמד". אבל rel_contact_profiles הוא ה-M:N. ייתכן שfilter זה מיושן.

**מידע חסר:** מה `profile_type=1` בדיוק? האם rel_contact_profiles נוצר בעת כל insert/update?

---

### F-4 — Convert Account→Contact: אסור execute ללא Preview + אישור

**מה החוק אומר:**
לפני הרצת `convert_account_to_contact_and_merge`, חובה להריץ `convert_account_to_contact_preview` ולהציג תוצאות למשתמש. המשתמש חייב לאשר per-case. אסור execute אוטומטי.

**איפה הוא נמצא:**
- `src/components/ConvertAccountToContactModal.tsx`
- Supabase RPCs: `convert_account_to_contact_preview`, `convert_account_to_contact_and_merge`
- `memory/project_convert_account_to_contact.md`

**סטטוס:** ודאי — הן כחוק עבודה והן כ-UX בקוד

**על אילו מסכים משפיע:** AdminEmployersPage בלבד (כרגע)

**יישום כפול:** —

**סתירה:** אין

**מידע חסר:** —

---

### F-5 — אין מחיקה פיזית — רק soft-mark

**מה החוק אומר:**
לפחות ב-Accounts: מיזוג = soft-mark ל-status 11, לא DELETE. לא ידוע אם זה כלל גלובלי לכל entities.

**איפה הוא נמצא:**
- `memory/project_convert_account_to_contact.md` — "soft-marks source status 11, never deletes"
- Supabase: עמודות `merged_into_account_id`, `merged_at`

**סטטוס:** ודאי לAccounts. לא ידוע לContacts, Jobs, Applications.

**על אילו מסכים משפיע:** AdminEmployersPage, AdminAccountsPage

**יישום כפול:** —

**סתירה:** לא ידוע

**מידע חסר:** האם יש soft-delete גם ל-Contacts? ל-Jobs? ל-Applications?

---

### F-6 — ACTIVE_JOB_STATUS_ID=3, ACTIVE_RECRUITER_STATUS_ID=7, OLD_RECRUITER_STATUS_ID=8

**מה החוק אומר:**
קבועים עסקיים המוגדרים ב-`AdminEmployersPage`:
- משרה פעילה = job_status=3
- מגייס פעיל = account_status=7
- מגייס ישן = account_status=8
- "EMPLOYER" = status 7 או 8

**איפה הוא נמצא:**
- `src/pages/AdminEmployersPage.tsx` שורות 153-156

**סטטוס:** ודאי (קוד)

**על אילו מסכים משפיע:** AdminEmployersPage

**יישום כפול:** `jobStatusColors` מגדיר status=3 כ-'פעילה' — תואם. `accountStatusColors` מגדיר 7='פעיל', 8='פעיל - VIP' — תואם (אך `OLD_RECRUITER` ← 'פעיל - VIP' זה מבלבל).

**סתירה:** קבוע נקרא `OLD_RECRUITER_STATUS_ID=8` אבל statusColors מגדיר 8 כ-'פעיל - VIP'. הפרשנות שונה.

**מידע חסר:** מה ההגדרה הנכונה של status=8? "מגייס ישן" או "VIP"?

---

## G. חוקי Async / State Management

---

### G-1 — אין global state manager (Redux/Zustand/Jotai)

**מה החוק אומר:**
State נמצא בתוך components דרך hooks. אין store גלובלי מעבר ל-`AuthContext`.

**איפה הוא נמצא:**
- `src/contexts/AuthContext.tsx` — Context יחיד שמצאתי
- כל hooks משתמשים ב-`useState` + `useEffect` או React Query

**סטטוס:** הנחת עבודה (לא ראיתי Zustand/Redux imports)

**על אילו מסכים משפיע:** כולם

**יישום כפול:** —

**סתירה:** אין

**מידע חסר:** האם React Query נחשב "global state"? האם יש Context נוסף שלא ראיתי?

---

### G-2 — שני async patterns שונים: raw useEffect vs. React Query

**מה החוק אומר:**
Contacts/Accounts: `useEffect` + `useState` + cancelled flag. Applications/InboxV2: React Query (`useQuery`). אין בחירה עקבית.

**איפה הוא נמצא:**
- `useSupabaseData.ts` — raw useEffect
- `useApplications.ts` — React Query
- `useInboxV2.ts` — React Query
- `AdminEmployersPage.tsx` — React Query ישיר בדף

**סטטוס:** ודאי (סתירה מוכחת)

**על אילו מסכים משפיע:** כולם

**סתירה:** עצמה — אין כלל אחיד.

**מידע חסר:** מה ה-pattern המועדף קדימה?

---

## H. חוקי Routing

---

### H-1 — /admin/accounts/:id ו-/admin/employers/:id — אותו component

**מה החוק אומר:**
שני נתיבים שונים מנווטים ל-`Employer360Page`. `AdminAccountsPage` ו-`AdminEmployersPage` הם שני views שונים לאותו entity (Account).

**איפה הוא נמצא:**
- `src/App.tsx` שורות 128-131

**סטטוס:** ודאי

**על אילו מסכים משפיע:** AdminAccountsPage, AdminEmployersPage, Employer360Page

**יישום כפול:** כן — שני entry points לאותו 360 view

**סתירה:** אין

**מידע חסר:** מה ההבדל העסקי בין "accounts" ל-"employers" כ-Admin views?

---

### H-2 — Legacy URL redirects לנתיבים חדשים

**מה החוק אומר:**
URLs ישנים מהאתר הקודם (`/dentjob`, `/job.dentists`, `/hygiene-job` וכו') מנותבים ל-URLs חדשים (`/jobs`, `/jobs/dentists`, `/jobs/hygienists`).

**איפה הוא נמצא:**
- `src/App.tsx` שורות 148-156

**סטטוס:** ודאי

**על אילו מסכים משפיע:** Public — SEO / backward compatibility

**יישום כפול:** —

**סתירה:** אין

**מידע חסר:** —

---

## I. חוקי Workflow (Claude ↔ User)

---

### I-1 — Plan Before Code

**מה החוק אומר:** כתיבת תוכנית + אישור לפני כל עריכת קוד. פורמלי: plan file + ExitPlanMode.

**מקור:** `memory/feedback_plan_before_code.md`

**סטטוס:** כלל מחייב (אינסטרוקציית משתמש)

**סתירה עם I-2:** ראה I-3.

---

### I-2 — Explain Before Acting

**מה החוק אומר:** הסבר בשיחה מה ישתנה לפני כל עריכה, וחכה לאישור — גם ללא plan file פורמלי.

**מקור:** `memory/feedback_transparency.md`

**סטטוס:** כלל מחייב (אינסטרוקציית משתמש)

**סתירה עם I-1:** לא ברור מה גובר — plan file פורמלי, או הסבר בשיחה.

---

### I-3 — Push אוטומטי אחרי כל commit

**מה החוק אומר:** `git push` ללא שאלה אחרי כל `git commit`.

**מקור:** `memory/feedback_always_push.md`

**סטטוס:** כלל מחייב (אינסטרוקציית משתמש)

**סתירה עם system defaults:** System prompt אומר לאשר פעולות שמשפיעות על shared systems. Push הוא פעולה כזו.

---

### I-4 — עבודה screen-by-screen, לא broad refactor

**מה החוק אומר:** שינויים מבוצעים בדף אחד בכל פעם. אסור refactor שנוגע בהרבה מסכים ביחד.

**מקור:** `memory/project_alldent_crm.md`

**סטטוס:** כלל מחייב

---

### I-5 — DB Change Proposal לפני שינוי Schema

**מה החוק אומר:** כל שינוי ב-Supabase schema (טבלה, עמודה, RPC, trigger) דורש הצעה בכתב לפני ביצוע.

**מקור:** `memory/project_alldent_crm.md`

**סטטוס:** כלל מחייב

**מידע חסר:** מה הפורמט הנדרש של DB Change Proposal? לא הוגדר לי.

---

## Rule Conflicts — סתירות

> **אין לפתור. רק לדווח.**

| # | חוק A | חוק B | הסתירה |
|---|---|---|---|
| RC-1 | I-1: Plan file פורמלי + ExitPlanMode | I-2: הסבר בשיחה + אישור | לא ברור אם שניהם נדרשים תמיד, או מי גובר |
| RC-2 | I-3: Push אוטומטי | System: אשר לפני push | User instruction מבטל default — אבל scope לא מוגדר |
| RC-3 | B-1: Contacts ב-useEffect ללא limit | B-2: Applications ב-React Query + pagination | שתי גישות async שונות לאותו סוג בעיה |
| RC-4 | D-3: active_apps = לא [5,10,13,14,15] | D-4: closed_apps = [5,13,14,15] | status=5 ו-status=10 לא עקביים בין שני הfilters |
| RC-5 | F-6: OLD_RECRUITER_STATUS_ID=8 | statusColors: status=8 = 'פעיל - VIP' | קבוע נקרא "ישן" אבל הlabel אומר "VIP" |
| RC-6 | C-1: phone_norm בDB = `972XXXXXXXXX` | C-1: `normalizePhone()` בקוד = `05XXXXXXXX` | פורמטים שונים בין קוד ל-DB |
| RC-7 | D-1: statusColors SSOT לכל badges | D-1: AdminEmployersPage יש `getEmployerStatusBadge` מקומי | שני מנגנונים לאותו תפקיד |
| RC-8 | B-4: `useApplications` מיוצא מ-Mock ב-useSupabaseData | B-2: `src/hooks/useApplications.ts` Live hook קיים | שם זהה, שני hooks שונים — import collision אפשרי |

---

*מסמך אבחון בלבד. נוצר 2026-06-29.*
