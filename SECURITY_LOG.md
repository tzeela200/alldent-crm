# יומן אבטחה — AllDent CRM

תיעוד פעולות אבטחה משמעותיות. הרשומה החדשה ביותר למעלה.

---

## 05/07/2026 — הקשחת RLS: סגירת חשיפת anon ב-accounts ו-contact

**הממצא (חמור):** לטבלאות `accounts` ו-`contact` היו מדיניות RLS פתוחות ל-anon (מבקר לא מחובר) עם `qual=true`:
- `accounts`: anon יכל לקרוא את כל 966 הארגונים (כולל `notes`, `billing_email`, `all_applicants_names`), לעדכן וליצור.
- `contact`: anon יכל לקרוא את כל ה-PII של המועמדים, **ולעדכן כל איש קשר** — עקיפה של אבטחת הטוקן.

**התיקון (2 שלבים, DDL על prod):**
- **שלב 1 — כתיבה:** DROP `allow_update_accounts_anon`, `allow_insert_accounts_anon`, `allow_update_contact_anon`, `allow_insert_contact_anon_authenticated`. (מחוברים נשמרים ע"י policy "Authenticated users..."; זרימות ציבוריות עוברות RPCs SECURITY DEFINER.)
- **שלב 2 — קריאה:** DROP `allow_select_accounts_anon`, `allow_select_contact_anon`. הותאמו 2 הדפים הציבוריים היחידים שקראו ישירות: `RecruitmentRequestPage` (הוסר חיפוש accounts/contact — השיוך נעשה בצד אדמין), ו-`EmployerProfilePage` (הועבר מאחורי `AuthGuard` — הציג נתונים פנימיים). נשמרה `Public profile by token` הממוקדת (דורשת טוקן).

**אימות:** סימולציית anon → `accounts=0, contact=0` (לפני: 966 + כל המועמדים). `get_advisors`: החורים נסגרו; שאר הרשאות ה-anon הן טבלאות `dict_*` בלבד (לגיטימי — מילונים לא-רגישים לטפסים ציבוריים).

**עיקרון:** להביא את accounts/contact לדפוס של `job`/`applications` — אין גישת anon ישירה; ציבורי רק דרך RPC מבוקר.

---

## 05/07/2026 — פרופיל מועמד עצמי (עריכה, AI, היסטוריה, הודעות)

הקשר: בניית תצוגת קורות-חיים למועמד עם עריכה מלאה, כלי AI, היסטוריית גרסאות ותיבת הודעות. כל התוספות נשמרו **בתוך** גבול האבטחה של התיקון המקורי `c16dd6c` (self-edit מאובטח בטוקן).

**1. גבול ההרשאות של הטוקן — נשמר**
- ה-RPC `update_profile_by_token` הורחב בשדות מועמד חדשים בלבד. שדות admin נשארו חסומים: `check_status`, `notes`, `source`, `account_link`, `profile_type`, `social_status`, ועוד.
- ✅ נבדק: ניסיון לשנות `check_status`/`notes` דרך הטוקן → נחסם (הערכים נשארו null).

**2. טבלאות חדשות עם RLS**
- `contact_profile_history` — SELECT רק ל-authenticated (admin). מועמד (anon) לא קורא.
- `contact_messages` — גישה מלאה רק ל-authenticated. מועמד ניגש רק לשיחה שלו דרך RPC; לא רואה שיחות של מועמדים אחרים.

**3. RPCs מאובטחים בטוקן (SECURITY DEFINER)**
- `get_candidate_messages_by_token`, `submit_candidate_message` — מאמתים טוקן בשרת, מחזירים רק נתוני אותו מועמד.

**4. אבטחת Storage**
- Buckets: `candidate-photos` (public read), `candidate-cvs` (private).
- העלאות דרך edge functions (`upload-profile-photo`, `upload-candidate-cv`) שמאמתים טוקן בשרת — anon לא כותב ל-Storage ישירות.

**5. הקשחת נקודות ה-AI (תוספת מרכזית)**
- `ai-document-scanner`, `ai-profile-writer` היו `verify_jwt:false` (פתוחים לאינטרנט — סיכון ניצול/עלות).
- נוסף אימות in-function: מותר רק עם `contact.profile_token` תקין בגוף הבקשה, או JWT של admin מחובר; אחרת → **403**.
- ✅ נבדק: קריאה ללא הרשאה → 403 בשתי הפונקציות.

**6. תיעוד מקור שינויים**
- ה-trigger `log_contact_changes` רושם `source` לכל שינוי: `admin` (JWT) / `candidate` (טוקן/anon) / `system`.

**7. ניקוי** — נמחקה רשומת בדיקה זמנית שנוצרה לצורך אימות (`contact_id` 60100).

> הערה: אובייקטי ה-DB (טבלאות/RPC/triggers) וה-edge functions חיים ב-Supabase ואינם ב-repo.
