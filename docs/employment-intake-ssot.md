# ALLDENT — SSOT מחייב
# מסך איתור מחפשי עבודה ומגייסים

**תאריך:** 13.08.2026  
**שם משתמש גלוי מחייב:** **איתור מחפשי עבודה ומגייסים**  
**שם טכני קיים:** `Employment Intake` / `employment-intake`  
**Route קיים:** `/admin/employment-intake`  
**סטטוס מסמך:** SSOT מוצרי/טכני מחייב למסך זה  

> המסך הזה **אינו Inbox 2**. אין לקרוא לו עוד "מסך קליטה" בתצוגה למשתמשת, במסמכי מוצר חדשים או בפרומפטים עתידיים. השם הטכני בקוד וב־Route יכול להישאר `employment-intake` כדי לא ליצור שינויי ארכיטקטורה מיותרים.

## סטטוס הטמעה בחבילה 13.08.2026

חבילת ההטמעה הנלווית למסמך זה מיישמת בקוד את שכבות הליבה הבאות ללא Migration חדש: זיהוי הודעות מערכת/הצטרפות/צירוף, Actor מול Target, פורמט Google Contact שמור, התאמה בטוחה והעשרה מ־Supabase, Table First, KPI עסקיים, בחירת עמודות, Sort, Filters, פאנל מקור והקשר עם Highlight, Side Sheet עסקי, השוואה ועדכון ברמת שדה, Audit לפעולות הכתיבה, Bulk Preview/Result, ושמירת Manual Override.

**אימות החבילה בסביבת ההכנה:** 23/23 קובצי TypeScript/TSX ששונו עברו בדיקת תחביר באמצעות TypeScript `transpileModule`. `npm run build` לא ניתן לאימות מלא בסביבת ההכנה משום שתלויות הפרויקט אינן מותקנות והסביבה אינה יכולה להשלים הורדה מה־npm registry; לכן Build/Typecheck ו־acceptance script הם שער קבלה מחייב בעת ההטמעה ב־repository האמיתי. אין לפרש זאת כ־Build שעבר או נכשל בקוד המוצר.

**לא בוצעו במסגרת הכנת החבילה:** כתיבה ל־Supabase, Migration, שינוי GOOGLE-01B/01C, Deploy/Publish או שינוי נתוני Production.


---

## 0. היררכיית אמת מחייבת למסך

בכל סתירה פועלים לפי הסדר הבא:

1. **Supabase החי** — schema, constraints, RPCs, `dict_*`, triggers ונתונים בפועל.
2. **מסמך SSOT זה** — מטרת המסך, UX, זרימה, פעולות וחוקים עסקיים.
3. **AllDent Design System** — צבעים, טיפוגרפיה, טבלאות, Side Sheet, states, responsive ונגישות.
4. **רכיבי AllDent המשותפים הקיימים בקוד** — אין לבנות רכיב מקומי חדש אם רכיב משותף מתאים.
5. **הקוד הקיים של המסך** — יש להתאים אותו ל־DB, ל־SSOT ול־Design System; לא להפוך drift קיים לכלל עסקי.
6. מסמכים היסטוריים/Legacy — חומר ייחוס בלבד.

**חוק:** אין להמציא ערכי DB. תפקיד, עיר, אזור, מקור, סוג ארגון, profile type, account status או social status מגיעים מ־Supabase החי.

---

# 1. מטרת המסך

המסך הוא מרכז עבודה תפעולי שמקבל טקסט או קובץ המכילים שיחות/הודעות ממקורות כגון WhatsApp, Facebook, קובצי CSV/XLSX או טקסט חופשי, וממיר אותם ליחידות עבודה עסקיות שניתן לזהות, להשוות למאגר AllDent ולטפל בהן בבטחה.

המסך נועד לענות על ארבע שאלות בלבד:

1. **מה קרה בהודעה?** — חיפוש עבודה, גיוס עובדים, הצטרפות לקבוצה, לא ברור או לא רלוונטי.
2. **מי האדם/הארגון הרלוונטי?** — Sender אינו תמיד ה־Target.
3. **האם הוא כבר קיים ב־Supabase?** — ואם כן, מי הרשומה הקנונית.
4. **מה הפעולה העסקית הנכונה עכשיו?** — יצירה, שיוך, עדכון, שינוי סטטוס, שליחת פרטים, דחייה או בדיקה.

המסך **אינו**:

- Inbox 2.
- מסך Debug של parser.
- תצוגת JSON/IDs/Hashes.
- מערכת שמבצעת merge לפי שם בלבד.
- מנגנון שיוצר Contact/Account אוטומטית ללא בדיקת כפילות והחלטה מתאימה.
- מערכת שמוחקת את טקסט המקור לאחר parsing.

---

# 2. עקרונות מוצר מחייבים

## 2.1 Table First

המסך הוא מסך אדמין תפעולי. ה־DNA שלו הוא:

**Header → KPI Strip → Search/Filters → Bulk Actions → Main Table → Side Sheet / Source Context → Dialogs/Toasts**.

לא לבנות אוסף כרטיסים גדולים שמחליפים את הטבלה. ה־KPI הם רצועת סיכום קומפקטית מעל הטבלה.

## 2.2 Supabase הוא מקור האמת העסקי

`employment_intake` הוא שכבת קליטה/עבודה והיסטוריה. הוא אינו מחליף את `contact` או `accounts`.

לאחר זיהוי רשומה קיימת:

- נתוני האדם/הארגון הקנוניים מגיעים מ־Supabase.
- ערכי dictionary מוצגים בשם, לא ב־ID.
- אם המשתמשת מאשרת עדכון — הערך המאושר נכתב לישות העסקית המתאימה דרך מנגנוני הכתיבה הקיימים.

## 2.3 המקור לעולם נשמר

`original_text` אינו משתנה בעקבות תיקון ידני, סיווג מחדש, התאמה או כתיבה ל־Contact/Account.

תיקון ידני נשמר בשכבה נפרדת (`manual_override`/פעולת Audit) ולא מוחק את מה שהגיע מהמקור.

## 2.4 עדיף "דורש בדיקה" מסיווג שגוי

אם אין בסיס מספיק:

- לא מנחשים.
- לא יוצרים רשומה.
- לא מבצעים merge.
- לא קובעים "קיים" על בסיס שם חלש בלבד.

---

# 3. מקור הנתונים והמבנה החי ב־Supabase

## 3.1 טבלאות הליבה של המסך

### `employment_intake`

הטבלה החיה כבר כוללת את שכבות המידע הדרושות למסך:

**מקור והקשר**
- `import_id`
- `source_type`
- `source_name`
- `file_name`
- `file_hash`
- `source_url`
- `source_seq`
- `source_message_id`
- `source_published_at`
- `ingested_at`
- `original_text`
- `normalized_text`
- `context_text`
- `context_seqs`
- `parent_seq`

**שולח וזהות שזוהתה**
- `sender_name`
- `sender_phone`
- `sender_phone_norm`
- `contact_name`
- `org_name`
- `phone`
- `phone_norm`
- `second_phone`
- `second_phone_norm`
- `email`
- `email_norm`
- `second_email`
- `second_email_norm`
- `facebook_id`
- `facebook_url`
- `facebook_url_norm`
- `facebook_name`
- `unassigned_phones`

**סיווג והבנה**
- `content_type`
- `is_active_request`
- `classify_reason`
- `evidence`
- `confidence_level`
- `needs_context`
- `role_raw`
- `role_id`
- `sub_role_ids`
- `city_raw`
- `city_id`
- `region_id`
- `manual_override`

**Matching והשוואה**
- `match_contact`
- `match_account`
- `match_field`
- `match_type`
- `match_candidates`
- `has_new_information`
- `suggested_updates`
- `identity_group_id`
- `canonical_contact_id`
- `identity_conflict`
- `identity_resolved_at`

**פעולה והיסטוריה**
- `proposed_social_status`
- `proposed_action`
- `last_action_id`
- `notes`
- `tags`
- `engine_version`
- `rules_version`
- `created_at`
- `updated_at`

### `employment_intake_action`

זו שכבת ה־Audit/Action הקיימת למסך. היא כוללת:

- `action_id`
- `anchor_key`
- `identity_group_id`
- `contact_id`
- `account_id`
- `action_type`
- `details_sent_type`
- `performed_at`
- `performed_by`
- `result`
- `error_message`
- `source_intake_ids`
- `occurrence_count`
- `applied_patch`
- `applied_before`
- `bulk_run_id`
- `idempotency_key`
- `created_at`

**מסקנה מחייבת:** אין ליצור טבלת Audit חדשה למסך לפני שמוכח שהמבנה הזה אינו מספיק.

---

# 4. ערכי מערכת אמיתיים מ־Supabase

## 4.1 `content_type` — constraint חי

הערכים היחידים המותרים כיום ב־DB:

| ערך טכני | תצוגה בעברית |
|---|---|
| `job_seeker` | מחפש/ת עבודה |
| `recruiter` | גיוס עובדים |
| `group_join` | מצטרף/ת חדש/ה |
| `irrelevant` | לא רלוונטי |
| `unclear` | דורש בדיקה |
| `unclassified` | טרם סווג |

**חוק מחייב:** `content_type` הוא שדה טכני פנימי לצורכי ה־Parser/מנוע הסיווג
בלבד. אין ליצור `dict_employment_intake_categories` או מילון קטגוריות חדש
כלשהו כדי "לתרגם" אותו — התרגום לעברית שבטבלה למעלה משמש רק לתווית "קטגוריה"
בטבלה/פאנל. **המצב העסקי בפועל והפעולות המוצעות (הקמת אדם, סימון סטטוס,
שליחת פרטים וכו') נגזרים מהערכים החיים של `dict_social_statuses` (§4.4)**,
לא מ־`content_type` לבדו. ראו את מנוע ההצעות (`proposals.ts`) והחוק המלא
בפרק 6 ("חוק מצטרפים מחייב").

## 4.2 `match_type` — constraint חי

| ערך טכני | שימוש פנימי | תצוגת "מצב במאגר" |
|---|---|---|
| `exact` | התאמה ודאית | קיים |
| `probable` | מועמד אפשרי | נדרש זיהוי |
| `ambiguous` | יותר מהתאמה אחת / סתירה | נדרש זיהוי |
| `none` | לא נמצאה התאמה | לא קיים, אלא אם חל חוק Google-format |

`match_type` הוא מידע פנימי. המשתמשת רואה מצב עסקי, לא את הקוד הטכני.

## 4.3 `confidence_level`

הערכים החיים: `high`, `medium`, `low`.

הם אינם עמודת ברירת מחדל בטבלה. אם מוצגים, רק בתוך Side Sheet / מידע מתקדם ובתווית עברית.

## 4.4 `dict_social_statuses` — ערכים חיים

| ID | ערך |
|---:|---|
| 1 | ליד חדש - חיפוש עבודה |
| 2 | ליד חדש - גיוס עובדים |
| 3 | ליד חדש - הצטרפות למאגר |
| 4 | נשלחו פרטים - תהליך גיוס |
| 5 | נשלחו פרטים - חיפוש עבודה |
| 6 | נשלחו פרטים - הצטרפות למאגר |
| 7 | קיים במאגר |
| 8 | פנייה במסנג'ר - טרם עניתי |
| 9 | פולואפ נדרש (Follow-up) |
| 10 | יש נייד להעביר למאגר |
| 11 | קיבל מענה כללי |
| 12 | לא רלוונטי |
| 13 | הסרה |
| 14 | חבר בפייסבוק |

**אין להמציא social statuses נוספים במסך.**

## 4.5 `dict_account_statuses` — ערכים חיים

| ID | ערך |
|---:|---|
| 1 | פוטנציאלי – לטיפול |
| 2 | נשלח קישור לתהליך גיוס |
| 3 | בטיפול – לחזור במועד |
| 4 | נשלח נדנוד / תזכורת |
| 5 | לא ענה / סינון |
| 6 | לא רלוונטי / סירב |
| 7 | מגייס פעיל (לקוח) |
| 8 | מגייס סגור (לקוח ישן) |
| 9 | ארגון דנטלי |
| 10 | ארגון חדש |
| 11 | מוזג / כפילות |

## 4.6 `dict_profile_types` — ערכים חיים

| ID | ערך |
|---:|---|
| 1 | מועמד |
| 2 | מעסיק |
| 3 | מגייס |
| 4 | אנשי קשר |
| 5 | עובד ארגון |

## 4.7 `dict_roles` — ערכים חיים

| ID | ערך |
|---:|---|
| 1 | רופא שיניים |
| 2 | מומחה אורתו |
| 3 | מומחה פריו |
| 4 | מומחה אנדו |
| 5 | מומחה כירורג |
| 6 | מומחה פדו |
| 7 | מומחה רפואת הפה |
| 8 | מומחה שיקום |
| 9 | סייעת רופא שיניים |
| 10 | שיננית |
| 11 | טכנאי/ית שיניים |
| 12 | מנהל/ת דנטלי |
| 13 | מזכירה דנטלית |
| 14 | עובד/ת דנטלי |
| 15 | מכירות |
| 16 | בעלים |
| 17 | רכש דנטלי |
| 18 | צילום דנטלי |

## 4.8 `dict_account_types` — ערכים חיים

| ID | ערך |
|---:|---|
| 1 | מרפאת שיניים |
| 2 | מרפאת מומחים |
| 3 | תאגיד |
| 4 | מעבדת שיניים |
| 5 | חברה דנטלית |
| 6 | מכון-צילום |
| 7 | מרפאה ניידת |
| 8 | מרכז דנטלי גריאטרי |
| 9 | מוסד לימודים |
| 10 | ספק ציוד דנטלי |
| 11 | יזם |
| 12 | קופת חולים ציבורית |
| 13 | רשת מרפאות |
| 14 | גיוס |
| 15 | אחר |

## 4.9 `dict_source_types` — מקור הקלט

| ID | ערך חי | תצוגה עסקית מומלצת |
|---:|---|---|
| 1 | Facebook Group | קבוצת Facebook |
| 2 | Facebook Page | דף Facebook |
| 3 | Facebook Profile | פרופיל Facebook |
| 4 | WhatsApp | WhatsApp |
| 5 | Google Contacts | Google Contacts |
| 6 | Excel | Excel |
| 7 | CSV | CSV |
| 8 | CRM | CRM |
| 9 | Email | Email |
| 10 | Fillout | Fillout |
| 11 | Manual | הזנה ידנית |
| 12 | Other | אחר |

הערך ב־DB נשאר כפי שהוא; התרגום הוא Label תצוגה בלבד.

## 4.10 `dict_sources` — מקור ברשומת Contact

| ID | ערך |
|---:|---|
| 1 | Google Contacts |
| 2 | טופס קורות חיים |
| 3 | טופס גיוס |
| 4 | WhatsApp |
| 5 | דרך פייסבוק |
| 6 | טופס אתר |
| 7 | אחר |

## 4.11 אזורים

`dict_regions` החי כולל 16 ערכים:

1. גוש-דן
2. דרום - מישור החוף
3. דרום נגב
4. השרון
5. ירושלים והסביבה
6. מרכז
7. צפון - אזור חדרה
8. צפון - אזור כרמיאל
9. צפון - אזור עכו
10. צפון - אזור רמת הגולן
11. צפון - גליל והעמקים
12. צפון - גליל עליון
13. צפון - חיפה וקריות
14. שפלה
15. תל-אביב
16. ארצי

ערים אינן hardcoded. הן נטענות מ־`dict_cities` ומשויכות לאזור לפי DB/RPC.

ערכי מערכת מוכרים שנבדקו:
- `388 = חיפה`, region `13`.
- `1172 = אולדנט`, region `16`.
- `1173 = כללי`, region `16`.

---

# 5. RPCs חיים שחובה למחזר

| RPC | חתימה חיה | שימוש |
|---|---|---|
| `normalize_il_mobile_phone` | `input_phone text → text` | נרמול נייד והשוואה |
| `resolve_city` | `input_city text → city_id, city_name, normalized_city_name, region_id, region_name, locality_type, match_type` | זיהוי עיר/אזור |
| `detect_role_from_text` | `p_text text → role_id, role_name, matched_alias, confidence, priority` | זיהוי תפקיד |
| `resolve_employment_identity` | `p_import_id uuid → jsonb` | קיבוץ זהויות/קונפליקטים בשכבת intake |

כל הארבעה הם `SECURITY INVOKER` במצב שנבדק.

**אסור לבנות normalize phone, city matcher או role dictionary מקביל אם ה־RPC הקיים נותן את התוצאה הדרושה.**

---

# 6. זרימת העבודה המלאה

## שלב A — העלאה / הדבקה

המשתמשת יכולה להעלות או להדביק:

- WhatsApp export.
- WhatsApp copy/paste.
- Facebook thread / טקסט Facebook.
- CSV/XLSX.
- טקסט רגיל.

המערכת שומרת:

- קובץ/מקור.
- סדר הודעות (`source_seq`).
- תאריך ושעת המקור כשקיימים.
- Sender.
- `original_text` ללא שינוי.

## שלב B — Parsing

ה־Parser מפרק את המקור להודעות. הוא אינו קובע לבדו את כל המציאות העסקית.

כל הודעה נשמרת עם Source Sequence כך שניתן לשחזר את השיחה ולנווט אליה.

## שלב C — סינון הודעות מערכת

### הודעות שנשמרות במקור אך אינן נכנסות לטבלת העבודה הראשית

דוגמאות:

- `ההודעה הזו נמחקה`
- `<המדיה לא נכללה>`
- `X יצא/ה`
- `X הסיר/ה את Y`
- סטיקר/GIF ללא משמעות עסקית

הן יכולות לקבל `content_type = irrelevant`, אך **אסור לאבד אותן מה־Source Context**.

### הודעות מערכת עסקיות שאסור לסנן

### חוק מצטרפים מחייב (עודכן — לא ליצור מילון קטגוריות חדש)

`content_type` (`job_seeker`/`recruiter`/`group_join`/...) הוא שדה טכני פנימי
לצורכי ה־Parser בלבד. **אסור להציג אותו כערך אנגלי גולמי למשתמשת בשום מקום
במסך.** המצב העסקי והפעולות המוצעות נגזרים מהערכים החיים של
`dict_social_statuses` (§4.4), לא מ־dictionary חדש שלא קיים ב־DB.

| מה מופיע בהודעת ההצטרפות | משמעות עסקית | מה המערכת עושה |
|---|---|---|
| `יוסי כהן שיננית חיפה` (פורמט Google — שם+תפקיד+עיר) | איש קשר שמור | מאתר ב־Supabase → `מצב במאגר = קיים`; אם לא נמצא למרות הפורמט → `חריג — איש קשר שמור אך לא נמצא ב-Supabase`, **לא** `לא קיים` ולא הצעת `הקמת אדם` |
| `יוסי כהן` (שם רגיל בלבד, לא פורמט Google) | חדש | `social_status = 3` ("ליד חדש - הצטרפות למאגר"); אם אין נייד בהודעה → אין הצעת פעולה אוטומטית, יש להשלים נייד לפני `הקמת איש קשר` |
| `+972 52-805-1911` | חדש | `social_status = 3`; בדיקת `phone_norm` מול Supabase כשער בטיחות מונע-כפילות; אם אכן לא נמצא → הצעת `הקמת איש קשר` |
| `דנה צירפה את יוסי כהן` | יוסי הוא החדש (Target), לא דנה (Actor) | אותו טיפול לפי יוסי, כאילו הוא זה שהצטרף — הבדיקה מול Supabase והצעת הפעולה תמיד על ה-Target |

**חשוב:** שם רגיל שלא בפורמט Google ושלא נמצא לו שום מועמד ב-Supabase הוא
**ליד חדש רגיל** (`לא קיים`), **לא** "נדרש זיהוי". "נדרש זיהוי" שמור למקרה
שבו מנוע ההתאמה עצמו מצא כמה מועמדים מתחרים או התאמה חלשה (`match_type`
`ambiguous`/`probable`) — לא לכל שם שאינו בפורמט Google. הבדיקה מול Supabase
היא תמיד שער בטיחות למניעת כפילות, לא שינוי של ההיגיון העסקי הזה.

#### הצטרפות במספר

`+972 52-805-1911 הצטרף/ה לקבוצה באמצעות קישור.`

פעולה:
1. חילוץ המספר.
2. RPC נרמול.
3. Lookup מול Supabase כשער בטיחות (מניעת כפילות).
4. `content_type = group_join` (טכני/parser בלבד).
5. `social_status = 3` אם חדש; אם נמצא ב-Supabase → `מצב במאגר = קיים`, `social_status = 7`.

#### הצטרפות בשם

`יוסי כהן הצטרף/ה לקבוצה באמצעות קישור.`

שם בלבד (שאינו בפורמט Google) אינו מספיק להתאמה אוטומטית ל-Contact קיים —
אך הוא **כן** מספיק כדי להיחשב ליד חדש רגיל (`social_status = 3`) אם מנוע
ההתאמה לא מצא שום מועמד. `נדרש זיהוי` מוצג רק כאשר יש בפועל כמה מועמדים
מתחרים או התאמה חלשה (`match_type` `ambiguous`/`probable`), לא כברירת מחדל
לכל שם לא-מאומת.

#### הצטרפות בפורמט Google Contact

`אושרת ביטון מזכירה לוד הצטרף/ה לקבוצה באמצעות קישור.`

זהו כלל עסקי מחייב:

**שם + תפקיד + עיר בפורמט השמור ב־Google = איש קשר שמור.**

המערכת מפרקת:
- שם: אושרת ביטון
- תפקיד: מזכירה דנטלית
- עיר: לוד

ואז מחפשת את הרשומה ב־Supabase.

- נמצא → `מצב במאגר = קיים`, `social_status = 7` ("קיים במאגר").
- לא נמצא למרות פורמט Google ברור → `חריג — איש קשר שמור אך לא נמצא ב-Supabase`.
- במצב החריג **לא** להציע `הקמת אדם`.

#### "צירף/ה את"

`דנה כהן צירפה את איריס אשד`

- Actor/Sender: דנה כהן.
- Target: איריס אשד.

מי שנבדק מול המאגר הוא ה־Target, ולפיו נקבעים `content_type`/`social_status`/
מצב במאגר — בדיוק כאילו ה־Target עצמו הוא זה שהצטרף.

`X הסיר/ה את Y` אינו שקול ל־`X צירף/ה את Y`.

## שלב D — חילוץ ישויות

מכל הודעה מחלצים לפי הצורך:

- Sender.
- Target / subject.
- ניידים.
- מיילים.
- Facebook name/id/url.
- תפקיד.
- עיר.
- ארגון.
- מועד פרסום.
- כוונה עסקית.

## שלב E — נרמול

- טלפון → `normalize_il_mobile_phone`.
- עיר → `resolve_city`.
- תפקיד → `detect_role_from_text`.
- Unicode Hebrew → NFC, רווחים, תווי בקרה; אין לשנות את הטקסט הגולמי.

## שלב F — סיווג כוונה

### חיפוש עבודה

דוגמאות:
- `אני מחפשת עבודה`
- `אני פנויה`
- `פנויה להחלפה`
- `מחפשת משמרת`
- `מעוניינת להוסיף משמרות`
- `אשמח להצעות`
- `פנויה מחר`

הקשר גוף ראשון חשוב.

### גיוס עובדים

דוגמאות:
- `דרושה סייעת`
- `מחפשים שיננית`
- `מרפאה מחפשת סייעת`
- `מי פנויה מחר?`
- `יש סייעת פנויה?`
- `צריך מישהי להחלפה`

### חוק נושא–מושא

- `סייעת מחפשת החלפה` → חיפוש עבודה.
- `מרפאה מחפשת סייעת` → גיוס עובדים.
- `אני פנויה` → חיפוש עבודה.
- `מי פנויה?` → גיוס עובדים.

### טקסט לא ברור

`כן`, `מחר`, `בחולון`, `גם אני`, `אפשר` וכו'.

אין לסווג בכוח. אם אין הקשר מספיק:

`content_type = unclear`, `needs_context = true`.

## שלב G — קביעת האדם הקובע

סדר העדיפות:

1. מספר/זהות מפורשת בגוף ההודעה ששייכת בבירור למושא הפעולה.
2. Target של הודעת מערכת (`צירף/ה את`, `הצטרף/ה`).
3. Sender כאשר אין Subject אחר ברור.

Sender נשמר תמיד גם כאשר Subject/Target אחר הוא האדם הקובע.

## שלב H — Matching מול Supabase

ראו פרק 8.

## שלב I — העשרת שורת העבודה מהישות הקנונית

אם נמצא Contact/Account קיים, אין להשאיר `נייד = —` רק משום שהמספר לא הופיע בגוף ההודעה.

לדוגמה:

טקסט: `שבוע טוב... דרושה סייעת...`  
Sender: `דר נפתלי חן * חולון`

אם Contact נמצא:

- שם בטבלה → הערך הקנוני מ־Supabase.
- נייד → מה־Contact.
- תפקיד → מה־Contact, אלא אם Side Sheet מציג פער לבחירה.
- עיר → מה־Contact, אלא אם Side Sheet מציג פער לבחירה.

## שלב J — החלטה ופעולה

המשתמשת מבצעת פעולה יחידה או Bulk Action. כל פעולה:

1. עוברת validation.
2. בודקת שוב duplicate/match לפני כתיבה.
3. כותבת דרך hook/mutation הקיים.
4. יוצרת Audit.
5. מחזירה Success/Error ברור.
6. מרעננת את הרשומה וה־KPI.

---

# 7. זיהוי Google Contact Format

## 7.1 חוק מחייב

אם Sender/Joiner/Target מוצג בפורמט שבו אנשי הקשר נשמרים ב־Google, לדוגמה:

- `אושרת ביטון מזכירה לוד`
- `נאווה רנון מנהלת קריות`
- `פיליפ ארנון דנטל כללי`
- `דר נפתלי חן * חולון`

המערכת מתייחסת לכך כ־**איש קשר שמור ב־Google**.

## 7.2 משמעות במסך

אין להציג `Expected Existing` למשתמשת.

המצבים הם:

- נמצא ב־Supabase → `קיים`.
- לא נמצא → `חריג — איש קשר שמור אך לא נמצא ב-Supabase`.

## 7.3 מה אסור

- לא ליצור Contact חדש אוטומטית.
- לא להציג "לא קיים" כאילו מדובר במספר חדש רגיל.
- לא לבצע merge לפי השם בלבד.

---

# 8. מנגנון התאמה והשוואה

## 8.1 עקרון

Matching משמש לזיהוי, לא להצדקת ניחוש.

## 8.2 התאמה בטוחה

עדיפות עסקית:

1. `phone_norm` מדויק.
2. מזהה social מדויק (Facebook ID/URL) כאשר הוא חד־משמעי ובטוח.
3. email מדויק כאשר הוא חד־משמעי.
4. קישור זהות קנוני/היסטורי קיים.
5. פורמט Google `שם + תפקיד + עיר` משמש signal חזק לאיתור הרשומה, אך אם החיפוש מחזיר כמה מועמדים — נדרש זיהוי.

## 8.3 שם בלבד

שם בלבד:

- יכול לפתוח רשימת מועמדים.
- אינו מספיק ל־merge.
- אינו מספיק ליצירה/עדכון אוטומטי של רשומה קיימת.
- אם יש יותר ממועמד אחד → `נדרש זיהוי`.

## 8.4 מצב במאגר — תצוגה עסקית

עמודת `מצב במאגר` מציגה רק:

1. **קיים** — התאמה ודאית ל־Contact/Account.
2. **לא קיים** — אין התאמה, ואין signal של Google-contact שמחייב חריג.
3. **נדרש זיהוי** — probable/ambiguous/שם בלבד/סתירת זהות.
4. **חריג — איש קשר שמור אך לא נמצא ב-Supabase** — Google-format ברור אך אין רשומת Supabase.

אין להציג בטבלה:

`exact`, `probable`, `ambiguous`, `none`, `match_contact`, `match_account`, `match_field`, `candidate_count`, `match_reason`.

---

# 9. בדיקת מספרים מול הייבוא

## 9.1 מקור המספר

יש לשמור הבחנה בין:

- `sender_phone`
- `phone` — המספר שזוהה כאיש הקשר הקובע
- `second_phone`
- `unassigned_phones`

## 9.2 נרמול

כל lookup של נייד עובר דרך:

`normalize_il_mobile_phone(input_phone)`.

הפלט החי הוא בפורמט `9725XXXXXXXX` או `NULL`.

## 9.3 lookup

לאחר נרמול:

- חיפוש מול `contact.phone_norm`.
- בדיקות משניות לפי מזהים מאושרים בלבד.
- אם exact → קיים.
- אם none → לא קיים, בכפוף לחוק Google-format.
- אם ambiguous → נדרש זיהוי.

## 9.4 יצירת Contact

לפני `הקמת אדם` חובה לבצע duplicate check חוזר בזמן הפעולה, לא להסתמך רק על תוצאת ה־preview.

אין להזין `phone_norm` ידנית ל־Contact אם trigger קנוני מייצר אותו; יש להזין `phone` דרך מנגנון הכתיבה הקיים ולאפשר ל־DB לאכוף את הכללים.

## 9.5 מספר בטקסט מול Sender

אם יש מספר בגוף הודעת גיוס, אין להניח שהוא שייך אוטומטית ל־Sender.

דוגמה:

Sender: `נאווה רנון מנהלת קריות`  
טקסט כולל: `054-393-2960`

יש לשמור את Sender בנפרד ולבדוק למי שייך המספר.

---

# 10. בחירת ערכים ברמת שדה

כאשר רשומת מקור זוהתה מול Contact/Account קיים ויש פער, Side Sheet מציג רק את השדות העסקיים שיש בהם הבדל או מידע חדש.

## 10.1 מבנה השוואה

| שדה | Supabase | הגיע מהמקור | בחירה |
|---|---|---|---|
| שם | הערך הקיים | הערך שנקלט | Supabase / מקור / ערך אחר |
| נייד | הערך הקיים | הערך שנקלט | Supabase / מקור / ערך אחר |
| מייל | הערך הקיים | הערך שנקלט | Supabase / מקור / ערך אחר |
| תפקיד | שם מילוני | זיהוי מהמקור | Supabase / מקור / ערך אחר |
| עיר | שם עיר | עיר מהמקור | Supabase / מקור / עיר אחרת |
| Facebook | ערך קיים | ערך חדש | Supabase / מקור / ערך אחר |

## 10.2 מידע חסר אינו "קונפליקט"

Supabase ריק + מקור מכיל ערך = `מידע חדש להשלמה`.

בחירה:

- להשלים מהמקור.
- להשאיר ריק.
- ערך אחר.

## 10.3 selectors

- עיר → `dict_cities` / `resolve_city`, עם region נגזר.
- תפקיד → `dict_roles` / `detect_role_from_text` וה־sub-role logic הקיים.
- סוג ארגון → `dict_account_types`.
- social status → `dict_social_statuses`.
- account status → `dict_account_statuses`.

אין dropdown מקומי hardcoded אם dictionary חי קיים.

## 10.4 שמירת החלטות

- תיקון parsed value נשמר ב־`manual_override`.
- כתיבה ל־Contact/Account נרשמת ב־`employment_intake_action` עם `applied_before` ו־`applied_patch`.
- `original_text` לא משתנה.

---

# 11. מבנה המסך — יעד מחייב

## 11.1 Header

כותרת:

**איתור מחפשי עבודה ומגייסים**

תיאור קצר:

`איתור מחפשי עבודה, מגייסים ומצטרפים חדשים מתוך שיחות וקבצים, התאמה למאגר AllDent והמשך טיפול.`

פעולה ראשית אחת בלבד:

**העלאת מקור / הוספת מקור** — CTA בצבע Amber בהתאם ל־Design System.

## 11.2 KPI Strip

KPI קומפקטיים, live/filtered בלבד, ללא trends דקורטיביים.

ברירת המחדל:

1. סה"כ הודעות רלוונטיות.
2. מחפשי עבודה.
3. מגייסים.
4. מצטרפים חדשים.
5. קיימים במאגר.
6. לא קיימים במאגר.
7. דורשים בדיקה/זיהוי.

לחיצה על KPI מפעילה filter מתאים.

אין להציג KPI טכניים כמו `identity groups`, `exact matches`, `engine version` או `hashes`.

## 11.3 Search + Filters

Search אחד מרכזי:

- שם Sender.
- אדם/ארגון שזוהה.
- נייד מנורמל.
- email.
- Facebook name כאשר העמודה/המקור רלוונטיים.

Filters:

- קטגוריה.
- מצב במאגר.
- סטטוס טיפול.
- תפקיד.
- אזור.
- עיר.
- מקור הקלט.
- דורש בדיקה.
- חדש/קיים.
- טווח תאריך פרסום מקורי.

## 11.4 Bulk Action Bar

מופיע רק כאשר יש selection.

ראו פרק 15.

## 11.5 Main Table

הטבלה היא ה־surface המרכזי של המסך.

### עמודות ברירת מחדל

1. Checkbox.
2. זמן הפרסום המקורי.
3. שם השולח.
4. האדם/הארגון שזוהה.
5. נייד.
6. קטגוריה.
7. תפקיד.
8. עיר.
9. מצב במאגר.
10. סטטוס טיפול.
11. פעולות.

### עמודה אופציונלית שימושית

- תקציר מקור של 1–2 שורות בלבד.

אין צורך להציג טקסט מקור ארוך בתוך תא כאשר Source Context קיים בצד.

## 11.6 בחירת עמודות

כפתור משותף: **בחירת עמודות**.

אפשרויות עסקיות נוספות:

- נייד נוסף.
- מייל.
- מייל נוסף.
- אזור.
- מקור הקלט.
- שם הקובץ/הקבוצה.
- זמן קליטה.
- שם Facebook.
- Facebook ID.
- Facebook URL.
- סטטוס social.
- הערות.

Facebook וזמן קליטה **אינם** ברירת מחדל.

אין להכניס לרשימת בחירת העמודות שדות Debug כגון `phone_norm`, hashes, IDs פנימיים או JSON.

## 11.7 Sorting

כל עמודה מתאימה משתמשת במנגנון המיון המשותף וחיצי עולה/יורד.

ברירת מחדל: זמן פרסום מקורי, חדש → ישן, אלא אם המשתמשת בחרה אחרת.

## 11.8 Pagination

שימוש ב־`AdminTablePagination` המשותף.

אין pagination מקומי נוסף.

---

# 12. Source Context — הקשר השיחה

## 12.1 Desktop

לאחר העלאת מקור, המסך יכול לעבוד ב־Split View:

- טבלה = האזור הראשי, כ־65–70%.
- Source Context = אזור צמוד, כ־30–35%.

הטבלה נשארת ה־surface הראשי.

## 12.2 לחיצה על שורה

בלחיצה על שורה:

1. השורה נבחרת.
2. מקור השיחה גולל אל `source_seq`/`source_message_id`.
3. ההודעה מסומנת בצהוב.
4. מוצגות הודעות קודמות/באות לפי context.
5. אם נדרש פירוט/פעולה — נפתח Side Sheet.

## 12.3 מקור אינו Debug

Source Context מציג את השיחה המקורית בלבד:

- תאריך/שעה.
- Sender.
- טקסט.
- הודעות סמוכות.

אין להציג שם `normalized_text`, JSON, hash או IDs.

## 12.4 Mobile/Tablet

Source Context הופך ל־Drawer/Sheet נגיש מכפתור `הצג מקור`.

---

# 13. Side Sheet — פרטי שורה והחלטה

ה־Side Sheet הוא ברירת המחדל לצפייה/פעולות על רשומה אחת.

## 13.1 Header

- שם האדם/הארגון שזוהה.
- קטגוריה.
- מצב במאגר.
- מקור עסקי.

## 13.2 מקטעים

### א. מקור
- Sender.
- זמן פרסום.
- טקסט מקור קצר + קישור/פעולה למיקום בפאנל המקור.

### ב. הזיהוי העסקי
- אדם/ארגון שזוהה.
- נייד.
- מייל.
- תפקיד.
- עיר/אזור.

### ג. מצב במאגר
- קיים / לא קיים / נדרש זיהוי / חריג.
- אם קיים: קישור לרשומה הקנונית.
- אם ambiguous: רשימת המועמדים לבחירה.

### ד. השוואת שדות
רק פערים ומידע חדש. לא dump של כל הרשומה.

### ה. פעולות
רק הפעולות הרלוונטיות למצב הנוכחי.

## 13.3 מידע טכני

אם נדרש Debug:

Accordion סגור בשם **מידע טכני**.

יכול להכיל:
- intake ID.
- match metadata.
- confidence.
- evidence.
- hashes.
- engine/rules version.

אינו פתוח כברירת מחדל ואינו חלק מה־workflow העסקי.

---

# 14. פעולות שורה — כללים ותוצאות

## 14.1 לא קיים + אדם

פעולה: **הקמת אדם**.

לפני ביצוע:
- duplicate check חוזר.
- phone/email/social validation.
- Preview של השדות שייווצרו.

אחרי הצלחה:
- נוצר Contact.
- רשומת intake מקושרת ל־Contact.
- `מצב במאגר = קיים`.
- Audit נכתב.
- אין ליצור שוב אותה ישות בפעולה חוזרת.

## 14.2 לא קיים + ארגון

פעולה: **הקמת ארגון**.

לפני ביצוע:
- Account duplicate check.
- בחירת `dict_account_types` אם נדרש.
- הצגת שדות שייווצרו.

אחרי הצלחה:
- נוצר Account.
- intake מקושר ל־Account.
- מצב במאגר מתעדכן.
- Audit נכתב.

## 14.3 קיים + חיפוש עבודה

המסך מציג:
- שם קנוני.
- נייד קנוני.
- Contact קיים.

פעולות עסקיות אפשריות מתוך הערכים החיים:

- **סמן כליד חדש חיפוש עבודה** → `dict_social_statuses.id = 1`.
- **שליחת הצעה לחיפוש עבודה** → לאחר הצלחת/אישור השליחה: `id = 5` (`נשלחו פרטים - חיפוש עבודה`).
- **פולואפ נדרש** → `id = 9`.
- **קיבל מענה כללי** → `id = 11`.
- **לא רלוונטי** → `id = 12`.
- **הסרה** → `id = 13`, כאשר זו פעולה עסקית מאושרת.

אין להמציא status חדש בשם דומה.

## 14.4 קיים + גיוס עובדים

ל־Contact/Recruiter:

- **סמן כליד חדש גיוס עובדים** → social status `2`.
- **נשלחו פרטים - תהליך גיוס** → social status `4`.
- **פולואפ נדרש** → `9`.
- **לא רלוונטי** → `12`.

אם הפעולה היא ברמת Account, משתמשים ב־`dict_account_statuses` ולא ב־social status של Contact.

דוגמאות Account:
- `פוטנציאלי – לטיפול` = 1.
- `נשלח קישור לתהליך גיוס` = 2.
- `בטיפול – לחזור במועד` = 3.
- `מגייס פעיל (לקוח)` = 7.

אין לערבב dictionary של Contact עם dictionary של Account.

## 14.5 מצטרף חדש

מצטרף אינו אוטומטית מחפש עבודה או מגייס.

פעולות (ראו הטבלה המלאה בפרק 6, "חוק מצטרפים מחייב"):

- קיים (נמצא ב-Supabase, כולל דרך פורמט Google) → `מצב במאגר = קיים`,
  `social_status = 7` ("קיים במאגר"). **לא** `social_status = 3`.
- חדש עם מספר → `social_status = 3` ("ליד חדש - הצטרפות למאגר") + הצעת
  `הקמת אדם`, אחרי בדיקת `phone_norm` כשער בטיחות מונע-כפילות.
- חדש בשם בלבד (לא פורמט Google) ואין לו שום מועמד תואם → `social_status = 3`,
  **בלי** הצעת פעולה אוטומטית — יש להשלים נייד לפני `הקמת אדם`. זהו ליד חדש
  רגיל, לא "נדרש זיהוי".
- שם עם כמה מועמדים מתחרים בפועל (`match_type` `ambiguous`/`probable`) →
  `זיהוי/שיוך`, לא יצירה אוטומטית (ראו 14.6).
- Google-format ולא נמצא → חריג לבדיקה, לא `הקמת אדם`.

## 14.6 נדרש זיהוי

פעולה:

- בחירת Contact קיים.
- בחירת Account קיים.
- תיקון Sender/Target אם parsing טעה.
- השלמת נייד/מייל כאשר המשתמשת יודעת את הערך.

אין create אוטומטי לפני סגירת אי־הוודאות.

## 14.7 לא רלוונטי

פעולה:

- סיווג `irrelevant`.
- לא ליצור ישות.
- לשמור מקור ו־Audit.

---

# 15. Bulk Actions

Bulk Actions פועלות **רק על selection מפורש**.

כל Bulk Action חייב Preview לפני commit ודוח תוצאה אחרי commit.

## 15.1 פעולות Bulk מותרות

### שינוי סטטוס

רק כאשר הישות היעד חד־משמעית וכל השורות מאותו סוג פעולה.

דוגמאות:
- סמן כליד חדש חיפוש עבודה.
- סמן כליד חדש גיוס עובדים.
- סמן פולואפ נדרש.
- סמן לא רלוונטי.

### הקמת אנשים

מותר רק על שורות שנבחרו ושעומדות בכל התנאים:

- `מצב במאגר = לא קיים`.
- יש מזהה מספיק ליצירה לפי חוקי Contact.
- אין `identity_conflict`.
- אין ambiguous match.
- duplicate check חוזר לפני כל INSERT.

שורה לא בטוחה → Skip, לא מפילה את כל ה־Bulk.

### הקמת ארגונים

אותו עיקרון: Preview + duplicate check + Skip לחריג.

### סיווג ידני קבוצתי

אפשר כאשר המשתמשת בחרה במפורש את השורות והקטגוריה.

### Export

Export מתייחס ל־filtered set לפי כלל מסכי האדמין, לא רק ל־current page, אם מנגנון הייצוא הקיים תומך בכך.

## 15.2 מה אסור ב־Bulk

- merge של זהויות ambiguous.
- overwrite של שדות סותרים בלי Preview/בחירת ערך.
- יצירה על בסיס שם בלבד.
- פעולה על כל התוצאות בלי selection כאשר הפעולה משנה נתונים.

## 15.3 דוח Bulk

בסיום:

- הצליחו.
- נכשלו.
- דולגו.
- סיבת Skip/Error לכל שורה.
- `bulk_run_id` אחד לכל ריצה.

---

# 16. Audit

כל שינוי עסקי חייב Audit.

## 16.1 חובה לשמור

- מי ביצע.
- מתי.
- אילו intake IDs היו מקור הפעולה.
- Contact/Account יעד.
- פעולה.
- ערך לפני.
- Patch שנכתב.
- תוצאה.
- שגיאה אם הייתה.
- Bulk run אם רלוונטי.
- idempotency key כאשר נדרש.

## 16.2 סוגי אירועים פנימיים

`employment_intake_action.action_type` הוא text חופשי, לא Dictionary. שמות event keys הם פנימיים ואינם מוצגים למשתמשת. יש להחזיק רשימה קנונית אחת בקוד ולא לפזר strings אקראיים בין components.

אירועים נדרשים ברמת משמעות:

- יצירת Contact.
- יצירת Account.
- שיוך לרשומה קיימת.
- עדכון רשומה קיימת.
- שינוי social/account status.
- תיקון סיווג ידני.
- תיקון שדה ידני.
- merge identity group.
- mark irrelevant.
- bulk action.

אין חובה לשנות schema כדי ליישם אותם.

---

# 17. תיקון ידני וזיכרון הבחירה

## 17.1 סיווג

אם המשתמשת משנה `content_type`, השינוי נשמר ב־`manual_override` ואינו נדרס ברענון/parse חוזר של אותה רשומה.

## 17.2 Sender/Target

אם המשתמשת מתקנת מי האדם הקובע, התיקון נשמר ומנגנון matching רץ מחדש על הזהות המתוקנת.

## 17.3 שדה עסקי

בחירת Supabase / מקור / ערך אחר נשמרת ב־manual override וב־Audit כאשר בוצעה כתיבה עסקית.

---

# 18. עמודות שאסור להציג במסך הראשי

כל אלה Backend/Debug בלבד:

- `id` / `lead_id` / `contact_id` / `account_id` כמספרים טכניים.
- `import_id`.
- `file_hash`.
- `content_hash`.
- `source_hash`.
- `phone_norm`.
- `sender_phone_norm`.
- `email_norm`.
- `facebook_url_norm`.
- `match_contact`.
- `match_account`.
- `match_field`.
- `match_type`.
- `match_candidates` raw JSON.
- `evidence` raw JSON.
- `suggested_updates` raw JSON.
- `identity_group_id`.
- `canonical_contact_id`.
- `engine_version`.
- `rules_version`.
- `created_at`/`updated_at` פנימיים.
- parser rule IDs.

הנתונים נשמרים לצורך מנגנון המערכת/Audit אך אינם עומס חזותי למשתמשת.

---

# 19. רכיבי AllDent משותפים — חובה למחזר

לפי מבנה הפרויקט הקיים, יש לבדוק ולהשתמש ברכיבים הבאים כאשר הם מתאימים:

## טבלה ואדמין

- `AdminTable`
- `AdminTablePagination`
- `AdminActionsMenu`
- `AdminCountPreview`
- `AdminPanelSection`
- `AdminPanelField`
- `AdminPanelActions`
- `StatusBadge`
- `RoleBadge`
- `RegionBadge`
- `SortableTh`

## בחירה / עריכה

- `CityRegionPicker`
- `RoleSubRolePicker`
- `DictionaryMultiSelect`
- `ContactPicker`
- `AccountPicker`
- `AccountPanel`
- `SidePanel`
- `dialog`

## קבצים / הודעות / common behavior

- `FileDropZone` אם קיים בגרסה העדכנית ומתאים.
- CSV/XLSX parser הקיים.
- Toast של `sonner`.
- normalize phone הקיים בצד UI רק לצורכי תצוגה/חיפוש; DB normalization נשאר קנוני ל־matching.

**חוק:** אין לבנות טבלה, pagination, status badge, dropdown או dialog מקומיים חדשים רק כדי "להתאים למסך", אם הרכיב המשותף נותן את ההתנהגות הדרושה.

---

# 20. Design System מחייב

## 20.1 צבעים

| Token | ערך | שימוש |
|---|---|---|
| Brand Teal | `#008080` | מותג, פוקוס, ניווט, אייקונים |
| Teal Deep | `#006D6D` | hover לטורקיז |
| Teal Mist | `#E6F3F3` | selected row / badge soft |
| CTA Amber | `#D97706` | **כפתור פעולה ראשי** |
| Amber Deep | `#B45309` | hover ל־CTA |
| Gold | `#D9A928` | VIP/הדגשה בלבד |
| BG Admin | `#F3F4F6` | רקע אדמין |
| Border | `#D9D9D9` | גבולות |
| Muted Text | `#6B6B6B` | labels / secondary |
| Charcoal | `#2D2D2D` | טקסט כהה / sidebar |
| Ink | `#0F0F10` | טקסט כהה מאוד |
| Paper | `#FAFAF7` | רקע ציבורי עדין, לא עיקר מסך האדמין |

**אזהרה מחייבת:** CTA ראשי הוא Amber `#D97706`. Teal אינו כפתור CTA ראשי כברירת מחדל.

## 20.2 טיפוגרפיה

- Heebo בלבד.
- RTL מלא.
- טקסט עסקי רגיל 14–16px.
- 13px רק למטא־דאטה צפוף.
- אין letter-spacing לעברית.

## 20.3 טבלה

- `AdminTable` משותף.
- Header דביק אם גובה המסך מצדיק.
- Hover עדין.
- Selected row ב־Teal Mist.
- שורות צפופות אך קריאות.
- מידע LTR (נייד, email, URL) עטוף `dir="ltr"` / `unicode-bidi:isolate`.
- פעולות קבועות ונגישות.

## 20.4 Side Sheet

- מיועד לצפייה/עריכה משנית.
- חלוקה לסקשנים.
- CTA אחד ברור.
- לא dump טכני.
- שדות ומידע שאינם נדרשים להחלטה נשארים מאחור.

## 20.5 Badges

- `rounded-full`.
- טקסט + צבע; לא צבע בלבד.
- status color מגיע מ־`statusColors.ts`/מנגנון המשותף, לא ממפה מקומית חדשה.

## 20.6 States

המסך חייב לכלול:

- Loading — skeleton עדיף על spinner במסך כבד.
- Empty — הסבר + CTA אחד.
- No Results — "לא נמצאו תוצאות לפי הסינון" + ניקוי פילטרים.
- Error — הודעה ברורה + Retry.
- Success — feedback קצר.
- Disabled — disabled חזותי ופונקציונלי.
- Pending — כפתור/שורה מציגים פעולה בתהליך.

---

# 21. RTL / BiDi מחייב

- `<html lang="he" dir="rtl">` / shell RTL קיים.
- Tailwind logical properties: `ms`, `me`, `ps`, `pe`, `start`, `end`, `border-s`, `border-e`.
- להימנע מ־`left/right/ml/mr/pl/pr` כשאין הצדקה.
- ניידים, email, URLs, IDs וקודים: `dir="ltr"` + isolate.
- חיצים/chevrons עם משמעות כיוונית צריכים להיבדק ב־RTL.
- טבלה, pagination ו־Side Sheet נבדקים ב־RTL אמיתי, לא רק יישור טקסט לימין.

---

# 22. KPI ומדדים — חוקים

- כל KPI מגיע מ־query אמיתי.
- KPI מגיבים לפילטרים אם המסך מציג filtered metrics.
- אין "trend" מזויף.
- אין KPI של שדה טכני שאינו מייצר פעולה עסקית.
- KPI לחיץ רק אם הוא משנה filter באופן צפוי.

---

# 23. צילום מצב מאומת — 11.08.2026

הנתונים הבאים הם Snapshot תפעולי בלבד, לא חוק עסקי:

- `employment_intake` פעיל: 1,963 שורות.
- `job_seeker`: 163.
- `recruiter`: 1,008.
- `unclear`: 792.
- `group_join`: 0 בזמן הבדיקה.
- `match_type exact`: 692.
- `match_type probable`: 1.
- `match_type ambiguous`: 21.
- `match_type none`: 1,249.
- `proposed_action=create_contact`: 676.
- `proposed_action=mark_lead_status`: 495.
- ללא `proposed_action`: 792.

ה־Snapshot מסביר את התצוגה הנוכחית אך אינו מגביל את המימוש העתידי.

---

# 24. מצבים עסקיים ותצוגה

## מחפש עבודה + קיים

שורה:
- שם + נייד מה־Contact.
- Category: מחפש/ת עבודה.
- מצב במאגר: קיים.
- Status: social status נוכחי.
- Actions: פעולות חיפוש עבודה בלבד.

## מגייס + קיים

שורה:
- Sender/Target מזוהה.
- נייד קנוני.
- Category: גיוס עובדים.
- מצב במאגר: קיים.
- Actions: גיוס בלבד.

## מספר חדש

- Category לפי הטקסט/אירוע.
- מצב במאגר: לא קיים.
- Action: הקמת אדם/ארגון לפי entity classification.

## שם בלבד

- מצב: נדרש זיהוי אם אין match בטוח.
- Action: זיהוי/שיוך.

## Google-format אך אין Supabase

- מצב: חריג — איש קשר שמור אך לא נמצא ב-Supabase.
- Action: בדיקת התאמה/סנכרון.
- אין create.

## הודעה לא ברורה

- Category: דורש בדיקה.
- Source Context נפתח/מודגש.
- לא מוצעות פעולות כתיבה עסקיות עד סגירת הסיווג.

---

# 25. Loading / Empty / Error / No Results

## Loading

Skeleton לטבלת השורות ו־KPI.

## Empty DB / אין מקור

טקסט:

`עדיין לא נטען מקור לבדיקה.`

CTA:

`העלאת מקור`.

## No Results

`לא נמצאו תוצאות לפי הסינון הנוכחי.`

פעולה:

`נקה סינון`.

## Error

- הודעה פשוטה.
- Retry.
- פרטי error טכניים לא נזרקים למסך הראשי.

---

# 26. פעולות כתיבה — Guardrails

1. אין write מתוך parser.
2. אין create על בסיס שם בלבד.
3. אין create כאשר יש match exact.
4. ambiguous → עצירה לבחירה.
5. duplicate check חוזר בזמן write.
6. write ל־Contact/Account דרך hooks/mutations קיימים.
7. region נגזר מעיר לפי מנגנון קיים; לא hardcode.
8. audit אחרי כל שינוי.
9. success מוצג רק לאחר תשובת DB מוצלחת.
10. לאחר success יש invalidation/refetch מתאים.
11. פעולה חוזרת מוגנת על ידי idempotency/repeat guard כאשר קיים.

---

# 27. ארכיטקטורת קוד מחייבת

## Page

`EmploymentIntakePage.tsx`

אחראי על:
- state של פילטרים/בחירה.
- layout.
- selected row.
- source pane.
- side sheet.

לא מכיל parser עסקי ולא RPC logic מפוזר.

## Components

תצוגה בלבד ככל האפשר:

- `IntakeTable`
- `IntakeFilters`
- `IntakeSummary`
- `IntakePanel`
- `IntakeRowEditor`
- `BulkActionBar`
- `BulkPreviewDialog`
- `BulkResultReport`
- `IntakeCreateContactDialog`
- `IntakeCreateAccountDialog`
- `IntakeMergeDialog`
- `IntakeConfirmActionDialog`

## Hooks

גישת Supabase, cache, mutations ו־orchestration:

- `useEmploymentIntake`
- `useEmploymentIntakeActions`
- `useEmploymentIntakeBulk`
- `useEmploymentIntakeIdentity`
- `useEmploymentIntakeMatching`
- `useEmploymentIntakeNormalize`
- `useEmploymentIntakePanel`
- `useEmploymentIntakeParse`
- `useEmploymentIntakePipeline`
- `useEmploymentIntakeRowEdit`
- `useEmploymentIntakeRows`

## Lib — לוגיקה טהורה

`src/lib/employment-intake/`:

- `context.ts`
- `contactSource.ts`
- `detailsSent.ts`
- `errors.ts`
- `extract.ts`
- `hashes.ts`
- `identity.ts`
- `labels.ts`
- `matching.ts`
- `mergeCompare.ts`
- `normalize.ts`
- `proposals.ts`
- `quickScan.ts`
- `repeatGuard.ts`
- `rules.ts`
- `sourceHash.ts`
- `parsers/*`

**Dependency Rule:** UI אינו מכיל חוקי parsing/matching hardcoded. Logic טהור אינו עושה render. DB access אינו מפוזר ב־components.

---

# 28. Tests מחייבים

ה־acceptance suite הקיים `scripts/employment-intake-acceptance.ts` יורחב, לא יוחלף במנגנון בדיקות מקביל ללא צורך.

מקרי חובה:

1. `+972 52-805-1911 הצטרף/ה לקבוצה באמצעות קישור` → group_join + normalize + lookup.
2. `אושרת ביטון מזכירה לוד הצטרפה` → Google-format → expected stored contact → אין create suggestion.
3. `איריס אשד הצטרפה` → name only → requires identification כשאין match בטוח.
4. `דנה צירפה את איריס אשד` → Target=איריס, Actor=דנה.
5. `אני פנויה מחר` → job_seeker.
6. `מי פנויה מחר?` → recruiter.
7. `מרפאה מחפשת סייעת` → recruiter.
8. `סייעת מחפשת החלפה` → job_seeker.
9. Sender `דר נפתלי חן * חולון`, ללא מספר בגוף → lookup קיים → נייד מגיע מ־Supabase.
10. `ההודעה הזו נמחקה` → irrelevant, נשמר מקור, לא מוצג בטבלת העבודה default.
11. `<המדיה לא נכללה>` → irrelevant, נשמר מקור.
12. `מחר` → unclear + needs_context.
13. Sender וטלפון בגוף שייכים לישויות שונות → לא מאחדים אוטומטית.
14. שם זהה עם כמה Contacts → ambiguous / נדרש זיהוי.
15. manual classification override נשאר אחרי refetch.
16. row click → source highlight.
17. column chooser → Facebook וזמן קליטה כבויים default אך זמינים.
18. sort asc/desc עובד.
19. Bulk create מדלג על ambiguous וממשיך עם בטוחים.
20. Audit נוצר לאחר write מוצלח.

---

# 29. קריטריוני קבלה — Definition of Done

המסך גמור רק כאשר כל הבאים מתקיימים:

1. השם הגלוי הוא `איתור מחפשי עבודה ומגייסים`.
2. Table-first בפועל.
3. KPI compact/live ולא טכניים.
4. `AdminTable` ו־`AdminTablePagination` ממוחזרים.
5. Search/Filters עובדים.
6. Column chooser עובד ושומר העדפה.
7. Sort עולה/יורד עובד.
8. Sender ו־Target נפרדים.
9. עמודת `נייד`, לא `טלפון`.
10. Facebook אינו default.
11. זמן קליטה אינו default.
12. מצב במאגר מוצג בעברית עסקית.
13. person/company existing מתעשר מ־Supabase.
14. Google-format מטופל לפי החוק המחייב.
15. joiners מטופלים.
16. `צירף/ה את` מטופל Target-first.
17. system messages לא רלוונטיות אינן בטבלת העבודה אך נשמרות במקור.
18. source context נשמר וניתן לניווט.
19. row click מסמן את ההודעה בצהוב.
20. unclear משתמש בהקשר ולא ניחוש.
21. field comparison מוצג רק כשיש שינוי/מידע חדש.
22. אפשר לבחור Supabase / מקור / ערך אחר.
23. Dictionary fields משתמשים ב־Supabase live.
24. actions תלויות מצב ולא מוצגות כרעש.
25. create person/account כולל duplicate guard.
26. Bulk actions כוללות Preview + Result report.
27. manual override נשמר.
28. Audit נכתב לכל שינוי.
29. אין חשיפה של JSON/IDs/hashes במסך הראשי.
30. RTL/BiDi תקין כולל נייד/email/URL.
31. צבעים וכפתורים תואמים Design System; CTA ראשי Amber.
32. Loading/Empty/No Results/Error/Success/Disabled/Pending קיימים.
33. Build/Typecheck עובר.
34. acceptance tests עוברים.
35. אין שינוי DB חדש אלא אם הוכח שחסר contract אמיתי.

---

# 30. מקור אמת לתיקון הקוד

בעת הטמעה, אין לשכתב את כל המסך. יש לבצע התאמה ממוקדת של הקוד הקיים אל החוזה במסמך זה:

1. Parsing/System messages/Joiners/Actor–Target.
2. Google Contact format.
3. Matching/Canonical enrichment.
4. Table/Filters/Column chooser/Sort/Pagination.
5. Source Context.
6. Side Sheet business-only.
7. Field-level decisions.
8. Contextual row actions.
9. Bulk preview/result.
10. Audit/manual override.
11. SSOT/tests.

---

# 31. מקורות שאומתו להכנת SSOT זה

- Supabase חי — project `AllDent_CRM_2026` (`urcdxdcyiedbdwegcebq`), נבדק 11.08.2026.
- `employment_intake` + `employment_intake_action` schema חי.
- `dict_roles`, `dict_account_types`, `dict_account_statuses`, `dict_social_statuses`, `dict_profile_types`, `dict_regions`, `dict_source_types`, `dict_sources` חיים.
- Constraints חיים של `content_type`, `match_type`, `confidence_level`.
- RPCs חיים: `normalize_il_mobile_phone`, `resolve_city`, `detect_role_from_text`, `resolve_employment_identity`.
- `ALLDENT_Design_System_Text_Readable_v2.pdf` / Design System v1.0.
- `ALLDENT_MASTER_SSOT_FINAL_PRODUCT_GRADE.md`.
- `docs/employment-intake-ssot.md` הקיים / תכנון Employment Intake.
- `project_tree.txt` העדכני עם רכיבי `employment-intake`, Hooks, shared admin components ו־acceptance script.
- WhatsApp Dental Recruitment Skill/SOP.
- Hebrew NLP Toolkit.
- Hebrew RTL Best Practices.
- Hebrew Tailwind Preset.
- Israeli Postgres Toolkit.
- Clean Architecture reference.

---

## שורת סיכום מחייבת

**המסך הוא שולחן עבודה עסקי לאיתור מחפשי עבודה, מגייסים ומצטרפים מתוך מקורות טקסטואליים; הוא חייב להציג מעט מידע נכון, להחזיק מאחור את כל הטכניקה, לזהות את האדם הנכון, להשוות אותו בזהירות ל־Supabase, ולאפשר פעולה בטוחה, ניתנת לביקורת ומתועדת.**
