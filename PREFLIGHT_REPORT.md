# PREFLIGHT_REPORT — "שינוי ויבוא רשומות" על גבי Inbox V2

תאריך: 2026-08-12
סוג: Preflight בלבד (Step 0). **לא בוצע שום שינוי בקוד, ב-Supabase או בנתונים.**

## Baseline

| | |
|---|---|
| Repo | `C:\Users\Allbi\alldent-crm` |
| Branch | `main` |
| HEAD | `3a503c9` — "INC-3123: זיכרון החלטות שדה ב-Inbox 2 + כתיבה עקבית אחת" (2026-08-11) |
| Working tree | **נקי** — עבודת INC-3119/3120 (Employment Intake / Applications) הוסטה לפני תחילת החקירה: `stash@{0}: "INC-3119-3120 Employment Intake + Applications WIP - stashed 2026-08-12 23:20 before Inbox2 work"` — לא נמחק, לא נדרס |
| Supabase project | `urcdxdcyiedbdwegcebq` (AllDent_CRM_2026), ACTIVE_HEALTHY, Postgres 17.6 |
| שיטת בדיקה | קריאה בלבד: קוד ב-repo + סכימה חיה ב-Supabase (`list_tables`, `execute_sql` על מטא-דאטה/constraints, `pg_proc`). **לא נפתח דפדפן/dev server** — אין ראיות Console/Network/ריצה בפועל בדוח הזה |

---

## A. המימוש הקיים בפועל של Inbox V2

Route: `/admin/inbox-v2` → `src/App.tsx:151` → `InboxV2Page`. כותרת עמוד וניווט עדיין "מרכז טריאז' נתונים" / "טריאז' נתונים" — **לא הוחלף** עדיין ל"שינוי ויבוא רשומות" (`src/pages/InboxV2Page.tsx:105`, `src/components/layout/AppSidebar.tsx:37`).

קבצים קיימים (חלקם תואמים לשמות שהחבילה מניחה, חלקם שקולים פונקציונלית בשם אחר):

- עמוד: `src/pages/InboxV2Page.tsx`
- Hooks: `src/hooks/useInboxV2.ts`, `useInboxV2Upload.ts`, `useInboxV2Matching.ts`, `useInboxFieldDecisions.ts`
- Parser: `src/lib/inbox-v2-parser.ts`
- לוגיקת דומיין (diff/routing/decisions): `src/lib/inbox-v2-merge.ts`, `src/lib/inbox-v2-decisions.ts`, `src/lib/inbox-v2-dicts.ts`
- רכיבים: `InboxV2Table`, `InboxV2RowDetail` (=RowDetail/SideSheet), `MergePanel`, `CreateFromLeadDialog`, `CreateAccountFromLeadDialog`, `UploadZone`, `InboxV2Filters`, `InboxV2QuickActions` (=Bulk bar), `CompactValueEditor`, `FieldComparisonRow`, `AIChatPanel` (מנוטרל, "בקרוב")
- רכיבי אדמין משותפים בשימוש בפועל: `AdminTable`, `AdminBadge`, `AdminPanelSection/Field/Actions`, `AdminActionsMenu`, `AdminTablePagination`, `SidePanel` — דרישת שימוש חוזר (§34) כבר מקוימת ברובה
- נורמליזציית טלפון: `src/lib/normalizePhone.ts` — תואם בדיוק לפונקציית ה-DB `normalize_il_mobile_phone(text)`

**לא קיים בשום מקום ב-repo**: `PhoneCheckPanel`/`PhoneCheckResultsTable`, `ImportWizard`/`ImportPreview`/`ImportColumnMapper`/`ImportValidationSummary`, `BatchHistoryPanel`, טאבים נפרדים (`InboxWorkspaceTabs`).

---

## B. אובייקטים חיים ב-Supabase — מצב מדויק

| אובייקט | קיים? | הערה |
|---|---|---|
| `inbox_v2` | כן | 39 עמודות, אינדקסים על `import_batch_id`/`merge_status`/`phone_norm`/`source_unique_key` (unique) |
| `inbox_import_batches` | כן | |
| `inbox_merge_actions` | כן | **`target_type` CHECK מאפשר `'contact'`/`'accounts'` (רבים)** |
| `inbox_field_decisions` | כן, **0 שורות** | ייעודי ל-Google בלבד: `google_account_key`/`google_resource_name` **NOT NULL**; `target_type` CHECK מאפשר `'contact'`/`'account'` (יחיד); `selected_source` CHECK מאפשר רק `'supabase'/'google'/'manual'` — **אין ערך `'incoming'`** |
| `dict_inbox_statuses` | כן, 11 שורות | תואם 1:1 למה שהחבילה מצפה |
| `dict_inbox_action_types` | כן, 8 שורות | תואם 1:1 |
| `dict_sources` | כן, 7 שורות | **זו לא הטבלה שהחבילה חושבת שהיא** — ראה קונפליקט C1 |
| `dict_source_types` | כן, 12 שורות | **זו טבלת ה-FK האמיתית** של `inbox_v2.source_type`/`inbox_import_batches.source_type`; לא מוזכרת בחבילה בכלל |
| `contact`, `accounts` | כן | |
| `match_inbox_row(bigint)`, `match_inbox_batch(bigint)` | כן | רק חתימה נבדקה, **גוף הפונקציה לא נקרא** — ראה "לא נבדק" בהמשך |
| `apply_inbox_merge_decision(...)` | כן | גוף מלא נקרא — ראה קונפליקט C2, C3 |
| `merge_contacts`, `merge_accounts` | כן | קיימות, **לא נקראות משום מקום תחת `inbox-v2`** |
| Bulk phone-lookup RPC | **לא קיים** | חיפוש ב-`pg_proc` על כל וריאציות שם אפשריות — אפס תוצאות |

RLS: 4 טבלאות ה-`inbox_*` — RLS מופעל, policy יחיד `ALL`/`qual=true` ל-`authenticated` בכל אחת (כלומר כל משתמש מחובר, לא מוגבל אדמין — תואם למודל הקיים באפליקציה, לא שינוי).

עובדות נתונים חיות שאומתו (לא רק דווחו בחבילה):
- `inbox_merge_actions` עם `action_type IS NULL`: **39** שורות — תואם לטענת החבילה.
- `inbox_import_batches` עם `file_type='paste' AND source_type IS NULL`: **2** שורות.
- `inbox_field_decisions`: **0** שורות כרגע.
- `inbox_v2.source_type`: `{5 (Google Contacts): 23, null: 52}` — **100% מהנתונים הקיימים הם Google בלבד**.
- `inbox_merge_actions.target_type`: `{'contact': 6, null: 51}` — **אפס שורות `'accounts'`** (ראה C2 — זה לא מקרי).
- טענת "53/73 שורות עם has_new_information=false" מהחבילה — **לא אומתה מחדש הפעם**, יש לסמן כלא-מאושרת.

---

## C. ניתוח פערים לפי שלב (Implementation Plan A–L)

| שלב | מצב | ראיה |
|---|---|---|
| **A — Contracts/sources** | חלקי | מילון מקורות **מוקשח ב-TS** (`inbox-v2-dicts.ts:19-32`), לא נקרא מ-DB; מתאים היום ל-`dict_source_types` במקרה, לא בעיצוב. כותרת/ניווט לא הוחלפו לשם המוצרי |
| **B — בדיקת מספרים (Read-only)** | **לא קיים** | אין RPC, אין רכיב ייעודי. תיבת ה-Paste היחידה הקיימת (`UploadZone`) **כותבת ל-DB מיידית** — הפוך מהדרישה |
| **C — Query ראשי** | קיים | `useInboxV2Rows` עם pagination/filter/sort בצד שרת; מציג `#id` מספרי במקום שם אנושי מלא (חלקי) |
| **D — Diff Engine** | קיים, בהיקף שונה | `buildComparisons`/`buildOne` ב-`inbox-v2-merge.ts:326-633` — מכסה בדיוק את כללי "ריק≠מחיקה", "זהה-אחרי-נורמליזציה≠דיף" עבור 10 שדות Contact / 9 שדות Account בלבד |
| **E — סטטוס/disposition** | חלקי, מנגנון שונה מההנחה | `resolveInboxRoute`/`deriveMatchResult` מיישמים היגיון ברמת UI; קיים `merge_status=11` ("קיים במערכת") במילון אך **שום קוד לא כותב אליו בפועל**. גוף `match_inbox_row`/`match_inbox_batch` **לא נבדק** — פתוח |
| **F — Field Decisions + Apply** | ל-Google בלבד | `apply_inbox_merge_decision` עובד נכון בטרנזקציה יחידה, אך שומר החלטות שדה **רק אם** יש `google_account_key`+`google_resource_name` — ל-Excel/CSV/Manual ההחלטות **נעלמות בשקט** (מאומת מקריאת גוף הפונקציה) |
| **G — Create flows** | קיים | `CreateFromLeadDialog`/`CreateAccountFromLeadDialog` — מילונים בלבד, אישור, audit, קישור חזרה ל-Inbox row |
| **H — True Merge (כפילויות ליבה)** | **לא קיים** | `merge_contacts`/`merge_accounts` קיימות אך לא נקראות מ-`inbox-v2`; `MergePanel` ממזג שורת-Inbox לרשומת-ליבה קיימת — **תכונה שונה מבנית** ממה שדורש שלב H |
| **I — ייבוא קובץ (Wizard)** | **לא קיים כמפורט** | הזרימה הקיימת: בחירה/הדבקה → **הכנסה מיידית ל-DB** (batches + rows בצ'אנקים של 100) → הפעלת matching אוטומטית. **אין שלב Preview, אין מיפוי עמודות, אין validation summary, ואין שער אישור לפני כתיבה** — הפוך מהדרישה |
| **J — טבלה + Side Sheet + Bulk** | ברובו קיים | `InboxV2Table`+`AdminTable`, בורר עמודות (localStorage), bulk bar (`InboxV2QuickActions`), Side Sheet (`InboxV2RowDetail`). **אין 4 טאבים נפרדים** — הכל במסך שטוח אחד |
| **K — Audit/History** | חלקי | כל נתיב mutation כותב ל-`inbox_merge_actions`. **אין Batch History panel**; היסטוריה בתוך ה-Side Sheet מוגבלת לשדות טכניים, לא timeline פעולות |
| **L — Hardening** | חלקי | הגנת double-submit קיימת (`disabled`). **אין בדיקת stale-target** ב-`apply_inbox_merge_decision`. Idempotency נאכף ברמת DB (`UNIQUE` על `source_unique_key`) אך לא ברמת אפליקציה |

---

## D. קונפליקטים הדורשים החלטת מוצר — CONFLICT

**C1 — החבילה מפנה לטבלה הלא-נכונה.** המסמכים (00_README, 01_MASTER_SPEC §6.1, 05_DB §1-2) מנחים לקרוא מ-`dict_sources`. בפועל ה-FK האמיתי של `inbox_v2.source_type`/`inbox_import_batches.source_type` הוא **`dict_source_types`** (12 שורות: Excel, CSV, Manual, Google Contacts ועוד — כולל בדיוק את הערכים שהחבילה צריכה, במזהים 6/7/11/5 בהתאמה). `dict_sources` היא מילון שונה ולא קשור. **אין צורך ביצירת ערכים חדשים — רק חיבור לטבלה הנכונה, וקריאה חיה במקום קוד מוקשח.**

**C2 — באג production חי, קודם למשימה הזו: אי-התאמת `target_type` בין `inbox_merge_actions` ('accounts', רבים) ל-`apply_inbox_merge_decision`/`inbox_field_decisions` ('account', יחיד).** כאשר `apply_inbox_merge_decision` מנסה לכתוב audit על מיזוג/עדכון **ארגון**, היא שולחת `'account'` (יחיד) לטבלה שמקבלת רק `'contact'`/`'accounts'` (רבים) — ה-INSERT נכשל, כל הטרנזקציה (כולל עדכון הליבה, decisions, וסטטוס) מתבטלת. אותו דבר ב-`CreateAccountFromLeadDialog.tsx:135`. **אומת בנתונים חיים**: `inbox_merge_actions.target_type` = `{contact: 6, null: 51}` — **אפס שורות 'accounts' אף פעם**, מה שמתאים בדיוק לתקלה שמתרחשת בשקט מאחורי הודעת שגיאה גנרית. **זה חוסם היום כל "מיזוג לארגון"/"עדכון ארגון קיים" דרך MergePanel הקיים, בנפרד לגמרי מהתכונה החדשה.**

**C3 — `inbox_field_decisions` בנוי אך ורק סביב Google; ל-Excel/CSV/Manual החלטות נעלמות בשקט (לא נשמרות עם ערכי Google מזויפים — פשוט לא נשמרות כלל).** מאושר גם בסכימה וגם בגוף הפונקציה. כיוון התיקון שהחבילה מציעה (§Migration B — הפיכת שדות Google ל-nullable + מפתח החלטה גנרי) פונה לפער אמיתי ומאומת.

**C4 — הפרסר מפצל שם חופשי ל-first_name/last_name אוטומטית**, מנוגד לכלל §7.1 של החבילה עצמה ("אין לפצל שם חופשי ללא מקור אמין") — `inbox-v2-parser.ts:126-133`. יש כאן סתירה פנימית קיימת בין הפרסר (מפצל) לבין `CreateFromLeadDialog` (מסרב לפצל) — לא נוצרה על ידי החבילה, אך משפיעה ישירות אם Diff Engine יורחב לשדות שם.

**C5 — `MergePanel` מציג טקסט קבוע "הגיע מגוגל"** (ותוויות "קבל מ-Google" ב-6+ מקומות ב-`inbox-v2-merge.ts`) ללא תלות במקור בפועל. היום לא נראה כי 100% מהנתונים החיים הם Google — אך זה חוסם מבני ברגע שמקור לא-Google יגיע ל-MergePanel, כנדרש ע"י §15/Acceptance D05-D06.

**C6 — "בדיקת מספרים" מתנגשת בשם/במיקום עם רכיב כתיבה קיים.** תיבת ה-Paste הקיימת ב-`UploadZone` היא נתיב כתיבה, לא read-only. אין כיום קוד שאפשר "לתייג מחדש" ל-Phone Check — נדרש מימוש חדש אמיתי, ורצוי הפרדה ויזואלית ברורה משמירה על בלבול.

**C7 — "סימון לבדיקה" (bulk/single) לא משנה `merge_status`, בניגוד למטריצת הפעולות של `03_DATA_STATE_ACTION_RULES_HE.md` §3.** בפועל (`InboxV2QuickActions.tsx`, `InboxV2RowDetail.tsx`) זו פעולת audit-log בלבד, בכוונה מפורשת (הפרדת "סטטוס" ו"action log" לשני צירים, מאז INC-3108). דורש הכרעה מפורשת לפני נגיעה בשלב E/L.

---

## E. אובייקטי DB חסרים (אושר שאינם קיימים)

1. **RPC לבדיקת טלפונים מרוכזת (bulk phone-lookup)** — לא קיים בשום צורה; לא קיימת גם שאילתה set-based ברמת ה-hooks.
2. **סכימת `inbox_field_decisions` גנרית (לא-Google)** — לא קיימת (ראה C3).
3. **אחידות `target_type` בין `inbox_merge_actions` ל-`inbox_field_decisions`/RPC** — לא רק חסרה, **שגויה בפועל וחוסמת כבר עכשיו** (C2) — מומלץ לטפל בעדיפות גבוהה מהתכונה החדשה עצמה.

**לא חסר**, בניגוד לרושם אפשרי מקריאת החבילה: `dict_source_types` כבר מכסה את כל הערכים הנדרשים (Excel/CSV/Manual/Google Contacts) — **אין צורך בערכי מילון חדשים**, רק חיבור לטבלה הנכונה.

---

## F. ערכי מילון חיים לשימוש (ללא המצאת IDs חדשים)

- `dict_inbox_statuses` — 11 שורות, תואם 1:1 ל-§6.2
- `dict_inbox_action_types` — 8 שורות, תואם 1:1 ל-§6.3
- `dict_source_types` (**לא `dict_sources`**) — 12 שורות: Google Contacts=5, Excel=6, CSV=7, Manual=11 ועוד
- `inbox_field_decisions_selected_source_check` — כרגע רק `'supabase'/'google'/'manual'`; ערך `'incoming'` הגנרי **אינו חוקי עדיין** — ידרוש שינוי constraint אם התכונה תלויה בו

---

## לא נבדק / לא ידוע — פתוח

- **גוף** `match_inbox_row`/`match_inbox_batch` — רק החתימה נקראה. זו השאלה הקריטית ביותר לשלב E: האם matching כבר קובע `merge_status=11` לשורות זהות-לחלוטין, או שכל ההיגיון הזה קיים רק ב-UI (`deriveMatchResult`)? נדרשת בדיקה ממוקדת לפני תכנון שלב E.
- טענת "53/73 שורות has_new_information=false" מהחבילה — לא אומתה מחדש הפעם.
- אין ראיות Console/Network/ריצה בפועל — Preflight זה סטטי בלבד, כנדרש.

---

## סיכום למשתמשת

התשתית הקיימת קרובה ברוב הנקודות המבניות (Diff engine, shared components, audit trail, create flows) — אך שלושה חלקים מרכזיים בחבילה **לא קיימים כלל היום**: בדיקת מספרים read-only (B), אשף ייבוא עם שער אישור (I), ומיזוג-ליבה אמיתי בין כפילויות (H). בנוסף, התגלה **באג production קיים וחוסם** (C2 — אי-התאמת target_type) שאינו קשור לתכונה החדשה אך חוסם כבר עכשיו מיזוג/עדכון ארגונים, וכדאי לשקול תיקון נפרד ומהיר לו.

אין המלצה על הטמעה בדוח הזה — ממתין לאישורך.

---

**עדכון 2026-08-12**: המשתמשת אישרה C1 ו-C2 עם תיקונים, וסיפקה הבהרות מוצריות נוספות (bulk phone check דו-כיווני, היקף מיזוג מצומצם ל"עדכון רשומה קיימת", כללי זיהוי ארגון). התוכנית המעודכנת המלאה, כולל מיפוי שדות Matching מדויק ל-Contact ול-Account (שמות עמודות אמיתיים ב-`accounts`), רשימת Migrations, ו-Acceptance Criteria — ראו [IMPLEMENTATION_PLAN_INBOX2_V2.md](IMPLEMENTATION_PLAN_INBOX2_V2.md). עדיין לא בוצע שום שינוי בקוד או ב-Supabase.
