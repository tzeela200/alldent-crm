# INC-3134 — הרשאות EXECUTE אנונימיות על פונקציות אדמין

**תאריך:** 2026-08-30
**פרויקט Supabase:** `urcdxdcyiedbdwegcebq` (AllDent_CRM_2026)
**סטטוס:** ✅ **בוצע ואומת.** חוב שנותר מתועד בסעיף 6.
**מקור הגילוי:** סריקת Security Advisor במהלך [INC-3133](INC-3133-unauthorized-auth-accounts.md).

---

## 1. הממצא

חמש פונקציות `SECURITY DEFINER` היו ניתנות להפעלה על ידי תפקיד `anon` — כלומר
**מכל מקום באינטרנט, בלי חשבון ובלי סיסמה**, דרך `POST /rest/v1/rpc/<name>`.

`SECURITY DEFINER` פירושו שהפונקציה רצה בהרשאות היוצר ו**עוקפת RLS לחלוטין**.

| פונקציה | מה היא עושה | חומרה |
|---|---|---|
| `merge_contacts(bigint, bigint)` | ממזגת שני אנשי קשר — **מוחקת רשומה** | 🔴 |
| `convert_account_to_contact_and_merge(...)` | ממירה ארגון לאיש קשר וממזגת | 🔴 |
| `sync_account_status_from_jobs(bigint)` | משנה סטטוס ארגון | 🟠 |
| `find_contact_id_by_phone(text)` | "האם המספר הזה במאגר?" — אורקל חיפוש | 🟠 |
| `find_account_by_name(text)` | חיפוש חופשי ב-1,106 ארגונים | 🟠 |

> **הערה חשובה:** מסלול זה **אינו עובר דרך התחברות כלל**. סגירת ההרשמה העצמית
> ב-INC-3133 לא הגנה עליו. שתי החשיפות בלתי תלויות.

## 2. סיבת השורש — לא באג שנכתב

זו **ברירת המחדל של Supabase/PostgreSQL**: פונקציה חדשה בסכמת `public` נוצרת עם
`EXECUTE` ל-`PUBLIC`, ו-Supabase מוסיפה גם הרשאות ל-`anon`/`authenticated`.
איש לא הוסיף את ההרשאה בכוונה — היא נדבקת לכל פונקציה שנוצרת.

⇒ **כל פונקציה חדשה שתיווצר תיוולד עם אותה בעיה** עד שישונו ברירות המחדל (סעיף 6).

## 3. אימות לפני השינוי — למה זה נקבע כבטוח

### 3.1 האתר הציבורי — כל קריאות ה-RPC

| פונקציה | קובץ |
|---|---|
| `submit_public_application` | `components/public/ApplyModal.tsx` |
| `submit_public_recruitment_request` | `hooks/useRecruitmentRequestMutations.ts` |
| `submit_public_dental_asset` | `hooks/useDentalAssetSubmission.ts` |
| `submit_dental_asset_inquiry` | `services/publicDentalAssetsService.ts` |
| `get_candidate_messages_by_token`, `submit_candidate_message` | `components/candidate/CandidateMessagesBox.tsx` |
| `update_profile_by_token` | `hooks/useCandidateProfile.ts` |

**חפיפה עם חמש הפונקציות שתוקנו: אפס.**

### 3.2 זרימת n8n GOOGLE-01

לפי [N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2](../integrations/google-contacts/N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2_2026-07-27.md)
(שורות 210/221/234) הזרימה קוראת לשלוש פונקציות בלבד:
`normalize_il_mobile_phone` · `detect_role_from_text` · `resolve_city`

ה-Credential הוא `Supabase AllDent Server`. בנוסף — `service_role` מחזיק `EXECUTE`
על שלושתן, וה-Revoke אינו נוגע בו. **הזרימה אינה מושפעת בשני התרחישים.**

### 3.3 צרכנים פנימיים ב-DB

סריקת `pg_proc.prosrc`: רק `trg_sync_account_status_from_jobs` קורא ל-`sync_account_status_from_jobs`.
טריגר אינו נבדק מול הרשאת הקורא ⇒ ממשיך לעבוד.
ל-`find_contact_id_by_phone` ו-`find_account_by_name` **אין צרכן כלל** — לא בקוד, לא ב-DB,
לא ב-n8n. שרידים מתהליך שהוחלף ב-`resolve_employment_identity` ו-`match_inbox_batch`.

## 4. ⚠️ מלכודת שהתגלתה בביצוע — `success` שאינו הצלחה

**ההרצה הראשונה החזירה `success: true` ועבדה רק על פונקציה אחת מתוך חמש.**

```sql
revoke execute on function ... from anon;   -- ❌ לא הועיל על 4 מתוך 5
```

הסיבה נראית ב-`pg_proc.proacl`. הרשומה `=X/postgres` — סימן שוויון ללא שם לפניו —
פירושה **`PUBLIC`**:

| פונקציה | ACL לפני | מדוע |
|---|---|---|
| `merge_contacts` | `postgres=X \| authenticated=X \| service_role=X \| anon=X` | ל-`anon` הרשאה **מפורשת** ⇒ ה-revoke עבד |
| 4 הנותרות | **`=X`** `\| postgres=X \| authenticated=X \| service_role=X` | ל-`anon` **אין** הרשאה משלה — היא יורשת מ-`PUBLIC` |

`REVOKE ... FROM anon` הסיר הרשאה שלא הייתה קיימת. זו פעולה חוקית, ולכן PostgreSQL
החזיר הצלחה מבלי לשנות דבר.

> **לקח לשימור:** ב-Supabase, `revoke ... from anon` אינו מספיק. חובה לבדוק
> `pg_proc.proacl` ולחפש `=X`, ולאמת עם `has_function_privilege` **אחרי** ההרצה.
> `success: true` אינו הוכחה.

## 5. מה בוצע בפועל

**Migration 1** — `inc3134_revoke_anon_execute_on_admin_functions` (חלקי, כמוסבר בסעיף 4):
הסיר `anon` משתי חתימות `merge_contacts`.

**Migration 2** — `inc3134_revoke_public_execute_on_admin_functions`:

```sql
revoke execute on function public.convert_account_to_contact_and_merge(
  bigint, bigint, bigint, text, bigint, boolean, boolean, boolean) from public;
revoke execute on function public.find_contact_id_by_phone(text) from public;
revoke execute on function public.find_account_by_name(text) from public;
revoke execute on function public.sync_account_status_from_jobs(bigint) from public;
```

הסרת `PUBLIC` בטוחה כאן משום ש-`postgres`, `authenticated` ו-`service_role`
מחזיקים הרשאות **מפורשות** בנפרד.

### אימות לאחר הביצוע

| פונקציה | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `merge_contacts` (שתי חתימות) | ❌ false | ✅ true | ✅ true |
| `convert_account_to_contact_and_merge` | ❌ false | ✅ true | ✅ true |
| `find_contact_id_by_phone` | ❌ false | ✅ true | ✅ true |
| `find_account_by_name` | ❌ false | ✅ true | ✅ true |
| `sync_account_status_from_jobs` | ❌ false | ✅ true | ✅ true |

**ללא רגרסיה:** כל `submit_public_*`, `update_profile_by_token`,
`get_candidate_messages_by_token`, `submit_candidate_message` ושלוש ה-RPC של n8n —
`anon = true` ללא שינוי.

**הערת אגב:** `preview_dental_asset` היא `anon=false` וכך תקין — היא פונקציית אדמין;
הציבורי קורא מ-`v_dental_asset_public`. מצב זה קדם לשינוי.

### שחזור (אם יידרש)

```sql
grant execute on function public.find_contact_id_by_phone(text) to authenticated;
-- וכו'. שחזור ל-PUBLIC אינו מומלץ.
```

## 6. חוב פתוח — לא נכלל בכוונה

| # | פריט | הערה |
|---|---|---|
| 1 | **`ALTER DEFAULT PRIVILEGES`** — למנוע הישנות בפונקציות עתידיות | ⚠️ בלעדיו הבעיה תחזור |
| 2 | 11 פונקציות `SECURITY DEFINER` נוספות פתוחות ל-`anon` | רובן טפסים ציבוריים לגיטימיים — דורש בדיקה אחת-אחת |
| 3 | 32 פונקציות `SECURITY DEFINER` פתוחות ל-`authenticated` | רלוונטי רק אם ייווצרו משתמשים לא-אדמין |
| 4 | `v_job_public` מוגדרת `SECURITY DEFINER` (רמת ERROR ב-Advisor) | ייתכן שבכוונה — דורש בדיקת תלויות |
| 5 | **Leaked Password Protection כבוי** | הדלקה בממשק: Authentication → Attack Protection |
| 6 | `function_search_path_mutable` על 3 פונקציות | המשך ל-[project_db_hardening](../../README.md) |

**סעיף 1 הוא הקריטי:** ללא שינוי ברירות המחדל, כל פונקציה חדשה תיווצר פתוחה ל-`PUBLIC`.

## 7. סטטוס

**האירוע סגור לגבי חמש הפונקציות שזוהו.** תוקן ואומת על בסיס הראיות ואימות Supabase.

**החוב בסעיף 6 פתוח** ודורש החלטה נפרדת.
