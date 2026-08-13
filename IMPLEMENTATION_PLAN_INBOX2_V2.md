# תוכנית ביצוע מעודכנת — "שינוי ויבוא רשומות" (Inbox V2)

תאריך: 2026-08-12
מצב: **תוכנית בלבד — לא בוצע שום שינוי בקוד או ב-Supabase.** ממשיך את [PREFLIGHT_REPORT.md](PREFLIGHT_REPORT.md) לאחר קבלת הבהרות והכרעות מהמשתמשת.
Working tree עדיין נקי; stash `INC-3119-3120` לא נגעתי בו.

הבדיקה הנוספת בשלב זה כללה קריאת גוף מלא של `match_inbox_row`, `match_inbox_batch`, `apply_inbox_merge_decision`, `merge_contacts`, `merge_accounts`, סכימת `accounts`/`contact` המלאה, וכל קבצי ה-TS הרלוונטיים (`inbox-v2-merge.ts`, `inbox-v2-decisions.ts`, `inbox-v2-dicts.ts`, `useInboxFieldDecisions.ts`, `MergePanel.tsx`, `CreateAccountFromLeadDialog.tsx`, `InboxV2QuickActions.tsx`) — קריאה בלבד, שום דבר לא שונה.

---

## 1. תיקונים טכניים מאומתים (מאושרים לביצוע)

### 1.1 — C1: מקור המילון (`dict_source_types` במקום `dict_sources`)

מאומת חי: `inbox_v2.source_type` ו-`inbox_import_batches.source_type` הם FK אמיתי ל-`dict_source_types` (12 שורות: Facebook Group=1, Facebook Page=2, Facebook Profile=3, WhatsApp=4, **Google Contacts=5, Excel=6, CSV=7**, CRM=8, Email=9, Fillout=10, **Manual=11**, Other=12). `dict_sources` הוא מילון אחר לגמרי (7 שורות, בשימוש ב-`contact.source`/`accounts` — לא קשור ל-Inbox 2).

תבנית קיימת בפרויקט לחיקוי מדויק: `src/hooks/useEmploymentIntake.ts:22-39` (`useEmploymentIntakeDicts`) — טוען `dict_source_types` חי דרך React Query, `staleTime: 10*60_000`, ללא `supabase.from()` ברכיבי UI. זו הארכיטקטורה הקיימת שיש להשתמש בה.

**מה משתנה בפועל**: `src/lib/inbox-v2-dicts.ts:19-32` — מחיקת הקבוע המוקשח `SOURCE_TYPES` והחלפתו ב-hook חדש (`useInboxV2SourceTypes` או תוספת ל-hook דיקטים קיים) שטוען מ-`dict_source_types` בפועל. שלושת מקומות הצריכה (`InboxV2Filters.tsx:55`, `UploadZone.tsx:74`, `InboxV2Table.tsx`, `InboxV2RowDetail.tsx`) יעברו מ-import קבוע ל-hook.

אין יצירת ערכי מקור חדשים — כל 4 הערכים הדרושים (Google Contacts/Excel/CSV/Manual) כבר קיימים.

### 1.2 — C2: אחידות `target_type` (`account` ביחיד — קנוני)

מאומת חי: **הקוד כבר עקבי** — כל נתיבי הכתיבה הקיימים (`CreateFromLeadDialog.tsx:143`, `CreateAccountFromLeadDialog.tsx:135`, `apply_inbox_merge_decision`'s פנימי, `inbox_field_decisions_target_type_check`) כבר משתמשים ב-`'account'`/`'contact'` ביחיד. **הבעיה היחידה היא ב-constraint אחד בלבד**: `inbox_merge_actions_target_type_check` מגביל ל-`ARRAY['contact','accounts']` (רבים, שגוי). אין אף שורה קיימת עם `'accounts'` (אומת: 0 שורות) — המיגרציה בטוחה, אין impact על נתונים.

**המיגרציה**: `ALTER TABLE inbox_merge_actions DROP CONSTRAINT inbox_merge_actions_target_type_check; ALTER TABLE inbox_merge_actions ADD CONSTRAINT inbox_merge_actions_target_type_check CHECK (target_type = ANY (ARRAY['contact','account']));` — **שינוי DB בלבד, אין שינוי קוד נדרש** לתיקון הזה עצמו (הקוד כבר שולח את הערך הנכון).

---

## 2. יכולות חדשות שאושרו

| יכולת | מקור אישור | תיאור קצר |
|---|---|---|
| מעבר אוטומטי ל`קיים במערכת` (merge_status=11) | תיקון #1 | התאמה ודאית + אין דיף אמיתי + אין סתירה ⇒ נסגר אוטומטית, לא נשאר בתור |
| ספירת Accounts בסיכום Batch | תיקון #2 | `match_inbox_batch` יספור גם `match_account IS NOT NULL` כ-Matched |
| יישור Diff/Suggested/Whitelist | תיקון #3 | הסרת `full_name`/`linkedin_url` מ-`suggested_updates` (לא כתיבים), הרחבת הבדיקה לשדות שכן כתיבים אך היום לא נבדקים |
| Field Decisions לכל מקור | תיקון #4 | Manual/Excel/CSV/עתידיים — לא רק Google |
| תווית מקור אמת ב-UI | תיקון #5 | הסרת "הגיע מגוגל"/"קבל מ-Google" הקשיחים |
| בדיקת מספרים דו-כיוונית (קיים/לא קיים) | הבהרה מוצרית | לא רק "מי קיים" — גם "מי לא קיים" עם מסלול המשך ליצירה |
| השלמת מידע לרשומה קיימת (phone/second_phone, email/second_email) | הבהרה מוצרית | תשתית זו **כבר קיימת ועובדת** ב-`buildPhone`/`buildEmail` (`inbox-v2-merge.ts:401-496`) — "שמור כנוסף" עם דדופ׳ אוטומטי. לא נדרש בנייה, רק לוודא כיסוי מלא ב-UI |
| היקף "מיזוג" מוגבל לעדכון רשומה קיימת בלבד | הבהרה מוצרית | תואם למימוש הקיים בפועל (`MergePanel` כבר עושה בדיוק את זה, לא True Merge) — **אין שינוי נדרש**, רק אישור שזה הכיוון הנכון |

---

## 3. רכיבים קיימים שיעברו הרחבה — לא בנייה מחדש

| רכיב/קובץ | מצב | מה יורחב |
|---|---|---|
| `src/lib/inbox-v2-merge.ts` (Diff engine) | קיים, איכותי | הרחבת `buildComparisons`/הלוגיקה המקבילה ב-SQL (לא שינוי API) |
| `AdminTable`, `SidePanel`, `AdminBadge`, `AdminPanelSection/Field` | קיימים, בשימוש מלא | ללא שינוי מבני — המשך שימוש |
| `MergePanel.tsx` | קיים, "עדכון רשומה קיימת" בדיוק לפי ההבהרה המוצרית | הסרת טקסט "הגיע מגוגל" הקשיח, חיבור למקור אמת דינמי |
| `CreateFromLeadDialog.tsx` / `CreateAccountFromLeadDialog.tsx` | קיימים, תואמים לכלל אי-פיצול שם | ללא שינוי מבני; ייתכן חיבור מנתיב "לא נמצא" של בדיקת מספרים |
| `inbox-v2-decisions.ts` / `useInboxFieldDecisions.ts` | קיימים, לוגיקת Google תקינה | הרחבה למקור גנרי (לא שכתוב) — Google נשאר כפי שהוא |
| `UploadZone.tsx` | קיים, כותב מייד ל-DB | **לא הרכיב הנכון ל"בדיקת מספרים"** — יישאר לייבוא קובץ בלבד; בדיקת מספרים תהיה זרימה חדשה נפרדת (ראה §9 החלטות פתוחות) |
| `inbox-v2-parser.ts` | קיים | תיקון C4 בלבד (הסרת פיצול שם אוטומטי), שאר הפרסר נשאר |

---

## 4. מיפוי מלא — Matching ל-Contact

### 4.1 המצב הקיים (`match_inbox_row`, גוף מלא נקרא)

סדר עדיפות נוכחי (עצירה בהתאמה ראשונה):

| עדיפות | שדה | confidence | matched_by |
|---|---|---|---|
| 1 | `phone_norm = phone_norm` | 95 | phone_norm |
| 2 | `lower(email) = lower(email)` | 90 | email |
| 3 | `facebook_id = facebook_id` | 88 | facebook_id |
| 4 | `facebook_url = facebook_url` | 85 | facebook_url |
| 5 | `(full_name/display_name) + role + city_id` | 70 | name_role_city |
| 6 | `(full_name/display_name) + role` | 55 | name_role |
| 7 | `(full_name/display_name) + city_id` | 45 | name_city |

לאחר התאמה: בדיקת "מידע חדש" **קיימת רק לענף Contact**, ורק על 6 שדות: `email`, `facebook_url`, `facebook_id`, `full_name` (⚠ לא כתיב), `city_id`, `linkedin_url` (⚠ לא כתיב) — ולא בודקת בכלל `phone`/`second_phone`/`second_email`/`facebook_name`/`role` (שכן כתיבים). זהו בדיוק קונפליקט C3.

`merge_status` נקבע *רק* לפי דרגת confidence (`>=80→3, >=40→4, >0→2`) — **לא לוקח בחשבון `has_new_information`**, ולכן גם התאמה מושלמת-לגמרי (confidence=95, אין שום דיף) נשארת ב-status=3 ("התאמה חזקה") ולא עוברת ל-11.

### 4.2 התיקון המוצע (לאישור לפני מימוש)

1. **יישור שדות הדיף** לרשימת `CONTACT_MERGE_FIELDS` המדויקת מ-`inbox-v2-merge.ts` (10 שדות: display_name, phone+second_phone, email+second_email, role, city_id, facebook_name/id/url) — במקום 6 השדות החלקיים/השגויים הנוכחיים.
2. **קביעת `merge_status=11`** ("קיים במערכת") כאשר: `v_contact_id is not null AND v_confidence >= 80 AND v_has_new_info = false AND no role_conflict`.
3. שאר הכללים (>=80 עם דיף → 3, 40-79 → 4) נשארים כפי שהם.

⚠ הערה: ההשוואה המדויקת (כולל "אותו מספר בשני שדות = לא דיף", "התפקיד הכללי 14 לא מוריד ערך מדויק") **קיימת רק ב-TS** (`inbox-v2-merge.ts`) ולא ב-SQL. שכפול מלא שלה ב-PL/pgSQL הוא כפילות לוגיקה — חלופה: להשאיר את ה-RPC עם זיהוי "יש דיף בכלל" גס יותר (worse-case: false positive שמשאיר רשומה בתור טיפול גם כשאין צורך — לא מסוכן), ואת ההחלטה הסופית "אין באמת דיף" להשאיר ל-UI ברגע הפתיחה. **זו נקודת החלטה** — ראה §9.

---

## 5. מיפוי מלא — Matching ל-Account

### 5.1 עמודות `accounts` הרלוונטיות (שמות מדויקים, אומתו חי — לא ניחוש)

| מאפיין שביקשת | עמודה בפועל | טיפוס | הערה |
|---|---|---|---|
| שם ארגון | `account_name` | text NOT NULL | |
| נייד/טלפון | `phone`, `second_phone` | text | |
| ח.פ. | **`bus_id`** | text | ⚠ אין עמודה בשם מפורש "ח.פ" — `bus_id` הוא המועמד היחיד. אומת בנתונים: 20/1104 שורות מלאות, 19 מתוכן בפורמט 8-9 ספרות (תואם ח.פ ישראלי). **דורש אישורך** שזו אכן העמודה הנכונה לפני שימוש כמזהה חזק |
| מייל | `email`, `second_email` | text | |
| עיר | `city_id` | bigint | FK לאותו מילון ערים כמו contact |
| Facebook ID | `facebook_id` | text (⚠ לא bigint כמו ב-contact) | |
| Facebook URL | `facebook_url` | text | |
| Facebook Name | `facebook_name` | text | |

### 5.2 המצב הקיים (`match_inbox_row`, ענף Account)

רץ **רק אם לא נמצא Contact**. שתי בדיקות בלבד, כל אחת עצמאית ומספיקה לבד:

```
IF phone_norm: accounts.phone = lead.phone OR accounts.phone = lead.phone_norm  → confidence 85
ELSE IF email: lower(accounts.email) = lower(lead.email)                        → confidence 80
```

**לא נבדק כלל**: `bus_id`, `facebook_id`, `facebook_url`, `facebook_name`, `account_name`, `city_id`. אין שילוב סימנים. **אין גם חישוב `has_new_information`/`suggested_updates` לענף הזה בכלל** — ריק תמיד, ולכן ארגון שנמצא אף פעם לא יכול להגיע ל"קיים במערכת" גם לו יתווסף התיקון בסעיף 4.2.

### 5.3 הצעת כללי התאמה חדשים (⚠ לא מאושר — ממתין להכרעתך המפורשת, לפי בקשתך המפורשת שלא לנחש)

עקרונות שהגדרת: שם בלבד לא מספיק; נייד/מייל לבדם לא כלל אוטומטי מספיק; ח.פ. זהה (כשקיים ומאומת) הוא מזהה חזק; Facebook ID זהה הוא מזהה חזק; Facebook URL/Name תומכים; סתירה = לא ממזגים אוטומטית.

**הצעה לדיון** (מבנה, לא החלטה סופית):

| דרגה | תנאי | confidence מוצע |
|---|---|---|
| מזהה חזק בודד | `bus_id` זהה (שני הצדדים לא ריקים, מנורמל) | 90 |
| מזהה חזק בודד | `facebook_id` זהה | 88 |
| שילוב | `account_name` מנורמל זהה **וגם** (`phone` תואם **או** `city_id` תואם) | 70 |
| שילוב | `facebook_url` זהה **וגם** `account_name` דומה | 65 |
| תומך בלבד — לא מספיק לבד | `phone` בלבד / `email` בלבד / `account_name` בלבד | לא ממזג — מציג כ"התאמה חלקית, דורשת בדיקה" |
| סתירה | נמצאו 2+ מועמדים שונים עם מזהים חזקים סותרים | לא ממזג — מסומן לבדיקה ידנית |

**נקודות שדורשות את הכרעתך לפני מימוש** (§9): ספי confidence מדויקים, מה קורה כשיש התאמת `phone`+`account_name` אך `bus_id` שונה (סתירה מוחלטת חוסמת, או phone+name מנצח?), האם `email`/`phone` לבד עדיין מייצרים "המתנה לבדיקה" (confidence נמוך) או נעלמים כליל מהמיון האוטומטי.

---

## 6. Migrations נדרשות — רשימה מלאה עם סיבה

| # | Migration | סיבה | תלוי באישור |
|---|---|---|---|
| M1 | `inbox_merge_actions_target_type_check`: `'accounts'`→`'account'` | C2 — תיקון constraint שגוי, 0 שורות מושפעות | **מאושר** (§1.2) |
| M2 | `inbox_field_decisions`: `google_account_key`/`google_resource_name` → NULLABLE; הוספת עמודות זהות גנרית (`source_type bigint FK dict_source_types`, `source_unique_key text`); הרחבת `selected_source` CHECK להוסיף `'incoming'` (תוך שמירת `'google'` לתאימות); עדכון unique constraint לכסות את שני המסלולים | תיקון #4 — Field Decisions ל-Manual/Excel/CSV. טבלה ריקה כרגע (0 שורות) — הזדמנות למיגרציה נקייה בלי backfill | ⚠ מבנה מוצע, דורש אישור פרטני (Supabase approval נפרד) |
| M3 | `apply_inbox_merge_decision`: הסרת התנאי `if google_account_key is not null and google_resource_name is not null`, קבלת פרמטרים גנריים (`p_source_type`, `p_source_unique_key`), שמירת החלטה בכל מקרה שיש זהות כלשהי (Google או גנרי) | תיקון #4 — היום ההחלטה נשמרת רק ל-Google | תלוי ב-M2 |
| M4 | `match_inbox_row`: יישור שדות has_new_information ל-`CONTACT_MERGE_FIELDS`/`ACCOUNT_MERGE_FIELDS`; קביעת `merge_status=11` בהתאמה ודאית+ללא דיף; הרחבת בדיקת דיף לענף Account | תיקונים #1, #3 | ⚠ דורש הכרעה על עומק הכפילות מול TS (§4.2) |
| M5 | `match_inbox_row` (ענף Account): שילוב `bus_id`/`facebook_id`/`account_name`+`phone`/`city_id` לפי כללים סופיים | הבהרה מוצרית — זיהוי ארגון | ⚠ **לא מתחילים — ממתין לכללים סופיים** (§5.3, §9) |
| M6 | `match_inbox_batch`: `v_matched` יכלול גם `match_account IS NOT NULL` | תיקון #2 | תלוי ב-M4 (סדר ביצוע, לא תלות טכנית קשיחה) |
| M7 | RPC חדש לבדיקת מספרים מרוכזת (read-only, set-based) | הבהרה מוצרית — Phase B | ⚠ עיצוב בלבד בשלב זה, לא לבנות עדיין |

כל Migration תובא עם `pg_get_functiondef`/`pg_get_constraintdef` של המצב ה"לפני" שמור מראש לצורך rollback, כנדרש ב-CLAUDE.md.

---

## 7. שינויים בקוד — לפי קבצים (לביצוע לאחר אישור, לא כעת)

| קובץ | שינוי |
|---|---|
| `src/lib/inbox-v2-dicts.ts` | הסרת `SOURCE_TYPES` המוקשח |
| `src/hooks/useInboxV2*.ts` (או קובץ דיקטים ייעודי חדש, בהשראת `useEmploymentIntake.ts`) | hook חדש לטעינת `dict_source_types` חי |
| `src/components/inbox-v2/InboxV2Filters.tsx`, `UploadZone.tsx`, `InboxV2Table.tsx`, `InboxV2RowDetail.tsx` | מעבר מ-`SOURCE_TYPES` הסטטי ל-hook |
| `src/lib/inbox-v2-merge.ts` | הסרת טקסט "קבל מ-Google" הקשיח (6 מופעים) → תווית דינמית לפי `row.source_type`/`source_name` |
| `src/components/inbox-v2/MergePanel.tsx`, `FieldComparisonRow.tsx` | הסרת "הגיע מגוגל" הקשיח → תווית דינמית |
| `src/lib/inbox-v2-parser.ts:126-133` | הסרת פיצול `display_name`→`first_name`/`last_name` אוטומטי (C4) |
| `src/lib/inbox-v2-decisions.ts`, `src/hooks/useInboxFieldDecisions.ts` | הרחבה למקור גנרי (מבנה תלוי ב-M2/M3) |
| `src/types/inbox-v2.ts` | טיפוסים חדשים אם נוספים שדות ל-`inbox_field_decisions` |

אין קבצים חדשים מתוכננים בשלב זה מעבר לאלה (לא בונים Phase B/H/I כרכיבים חדשים כרגע — זה מחוץ להיקף הסיבוב הזה לפי בקשתך "לא להתחיל את מלוא ההטמעה").

---

## 8. Acceptance Criteria מעודכנים

1. **C1**: `InboxV2Filters`/`UploadZone` מציגים בדיוק את 12 הערכים החיים מ-`dict_source_types`, לא רשימה מוקשחת. שינוי ערך/הוספת ערך ב-DB משתקף מיידית ללא build.
2. **C2**: יצירת פעולת audit על ארגון (`target_type='account'`) מצליחה ולא נכשלת על ה-constraint. `select count(*) from inbox_merge_actions where target_type='account'` > 0 אחרי מיזוג/יצירת ארגון ראשון.
3. **תיקון #1**: רשומת Inbox עם התאמה ודאית לאיש קשר קיים וללא שום דיף בשדות הכתיבים מגיעה ל-`merge_status=11` אוטומטית אחרי `match_inbox_row`, ואינה מופיעה בתור "ממתין לטיפול" כברירת מחדל.
4. **תיקון #2**: `match_inbox_batch` על batch עם N שורות שהתאימו לארגונים בלבד (ללא contact) מחזיר `matched=N`, לא `new=N`.
5. **תיקון #3**: כל שדה שמופיע ב-`suggested_updates` הוא שדה שגם ניתן לכתיבה בפועל דרך `apply_inbox_merge_decision`. אין `full_name`/`linkedin_url` (או כל שדה לא-כתיב) ב-diff.
6. **תיקון #4**: שורת Inbox ממקור Excel/CSV/Manual שעברה החלטת שדה יוצרת שורה ב-`inbox_field_decisions` (בדוק: `select count(*) from inbox_field_decisions where source_type is not null`). קונפליקט Google קיים ממשיך לעבוד בדיוק כפי שעבד (רגרסיה: לבדוק שורת Google אמיתית לפני ואחרי).
7. **תיקון #5**: אין המחרוזת "גוגל"/"Google" קשיחה ב-`MergePanel`/`FieldComparisonRow` עבור שורה ממקור Excel — התווית מציגה "Excel" בפועל.
8. **בדיקת מספרים** (כשייבנה, לא בסבב הזה): מספר קיים → מציג שם רשומה קיימת, אין INSERT ל-`inbox_v2`/`inbox_import_batches`. מספר לא קיים → מוצג כ"פוטנציאל חדש", אין יצירת Contact אוטומטית, יש נתיב מפורש להמשך ליצירה. מספר לא תקין → הודעת ולידציה, אין רשומה.
9. **Account matching** (כשייבנה, לא בסבב הזה): לפי הכללים הסופיים שיאושרו ב-§9 — לא לפני כן.
10. **רגרסיה**: כל תרחישי `06_ACCEPTANCE_TESTS_HE.md` שכבר עוברים היום (Create Contact, Create Account, Merge קיים) ממשיכים לעבור ללא שינוי התנהגות.

---

## 9. החלטות מוצר פתוחות (OPEN — לא מוכרעות, לא מיושמות)

1. **C7 — "סימון לבדיקה"**: נשאר כפי שהוא (action-log בלבד, ללא שינוי `merge_status`). **לא נוגעים.**
2. **כללי התאמת Account הסופיים** (§5.3): ספים מדויקים, טיפול בסתירות, סטטוס לתומכים-בלבד (phone/email לבד).
3. **זהות עמודת ח.פ.**: אישור ש-`accounts.bus_id` הוא אכן ח.פ/מספר עסק (מאומת פורמטית, לא סמנטית מהמשתמשת).
4. **עומק שכפול לוגיקת הדיף ב-SQL** (§4.2): דיף גס ב-RPC (עם "ספק לטובת התור") מול שכפול מדויק של כל כללי ה-TS (role generic exception, dedup טלפון/מייל) בתוך `match_inbox_row`.
5. **מבנה מדויק של M2** (§6): שמות עמודות סופיים ל-Field Decisions הגנרי, ומנגנון ה-unique constraint המשולב.
6. תזמון: אילו Migrations (M1 בלבד? M1+M2+M3? הכול) לאשר באותו סבב Supabase approval, ואילו להשאיר לסבב נפרד.

---

ממתין לאישורך על הסעיפים הפתוחים לפני כל DDL/DML או שינוי קוד.
