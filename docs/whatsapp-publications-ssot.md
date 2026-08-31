# פרסומי WhatsApp — מקור אמת יחיד (SSOT)

עודכן: 31/08/2026

המסך: `/admin/fix-publications` → [AdminFixPublicationsPage.tsx](../src/pages/AdminFixPublicationsPage.tsx)
שכבת הנתונים: [useFixPublications.ts](../src/hooks/useFixPublications.ts)
פרסור הקובץ: [campaignParser.ts](../src/lib/fixPublications/campaignParser.ts)
מיפוי סטטוסים: [deliveryStatus.ts](../src/lib/fixPublications/deliveryStatus.ts)

---

## 1. מה המסך עושה ומה הוא לא עושה

**עושה:** קולט דוח תוצאות קמפיין שמיוצא מ-Fix Digital, מתאים כל שורה לרשומה
ב-Supabase לפי נייד מנורמל, שומר את האירוע בהיסטוריה, ומעדכן שני שדות
סיכום ברשומה הראשית.

**לא עושה:** לא שולח הודעות, לא מסנכרן API מול Fix, ולא יוצר / מאחד / מוחק
אנשי קשר או ארגונים. דוח Fix מעדכן **אך ורק** נתוני פרסום ושליחה — לעולם
לא שם, אימייל, תפקיד, עיר, אזור, סטטוס תעסוקתי, פרופיל או נתוני מקצוע.

---

## 2. הסכמה בפועל ב-Supabase

> ⚠️ הסכמה החיה שונה מהמסמך המקורי של המסך (יולי 2026). קובץ ה-Migration
> `20260720_whatsapp_publications.sql` **מעולם לא הורץ** ותיאר טבלאות אחרות
> מאלה שקיימות. הוא הוסר מהריפו ב-31/08/2026 כדי שלא יטעה. מה שכתוב כאן
> הוא מה שאומת מול המסד החי.

### `whatsapp_campaigns`

| עמודה | טיפוס | הערות |
|---|---|---|
| `campaign_id` | bigint | PK, **GENERATED ALWAYS AS IDENTITY** — אין להכניס ידנית |
| `external_campaign_id` | text | **UNIQUE**. המפתח הדטרמיניסטי שלנו: `fix:<תווית מנורמלת>` |
| `campaign_name` | text | תווית לתצוגה |
| `process_name` | text | ה-`process` השכיח בשורות הקמפיין |
| `source_type` | text | NOT NULL, default `'fix_digital'` |
| `source_file_name` | text | שם הקובץ שהועלה בפועל |
| `started_at` / `completed_at` | timestamptz | מוקדם/מאוחר מבין מועדי השליחה |
| `status` | text | לא בשימוש — אין ערכים מוסכמים, ולכן לא ממציאים |
| `total_recipients`, `submitted_count`, `delivered_count`, `read_count`, `failed_count` | int | NOT NULL default 0. מחושבים מחדש מהטבלה אחרי כל קליטה |
| `raw_payload` | jsonb | **NOT NULL** default `'{}'` |

### `whatsapp_campaign_recipients`

| עמודה | טיפוס | הערות |
|---|---|---|
| `recipient_id` | bigint | PK, **GENERATED ALWAYS AS IDENTITY** |
| `campaign_id` | bigint | FK → campaigns, ON DELETE CASCADE |
| `contact_id` / `account_id` | bigint | FK, ON DELETE SET NULL |
| `fix_contact_link_id` | bigint | FK → `fix_contact_links`. לא בשימוש בקליטה מקובץ |
| `fixdigital_id` | text | מזהה הרשומה ב-Fix. אינו מגיע בדוח תוצאות |
| `phone_norm` | text | הנייד המנורמל — בסיס ההתאמה |
| `delivery_status_raw` | text | ה-`sending_status` המקורי, ללא שינוי |
| `delivery_status` | text | NOT NULL, קוד מנורמל (ראו §5) |
| `failure_category` | text | `device` / `rate_limit` / `blocked` / `provider` / `other` |
| `failure_message` | text | טקסט ה-Rejected המלא |
| `sent_at` | timestamptz | מ-`sending_time` |
| `delivered_at` / `read_at` | timestamptz | **תמיד NULL** — הדוח לא מוסר אותם |
| `source_unique_key` | text | **NOT NULL UNIQUE (גלובלי, לא לכל קמפיין)** |
| `raw_payload` | jsonb | **NOT NULL** default `'{}'` |

**אילוצים חיים שחייבים לכבד:**

```
whatsapp_campaign_recipients_one_entity_chk   CHECK (num_nonnulls(contact_id, account_id) <= 1)
whatsapp_campaign_recipients_identifier_chk   CHECK (num_nonnulls(fix_contact_link_id, fixdigital_id, phone_norm) >= 1)
whatsapp_campaign_recipients_status_chk       CHECK (delivery_status IN (...))
```

`one_entity_chk` הוא הסיבה ששורה לעולם אינה משויכת גם לאיש קשר וגם לארגון.
`identifier_chk` הוא הסיבה ששורה בלי נייד תקין אינה נשמרת כלל.

**RLS:** `Authenticated users full access` — ALL / authenticated / `true`.
פער ידוע ומתועד: אין תפקידי אדמין בצד ה-DB. הקשחה נדרשת ברוחב האדמין.

### עמודות שאינן קיימות — והחלופה

`phone_raw`, `full_name_raw`, `fix_status_raw`, `fix_process_raw`, `email_raw`,
`fix_lead_number`, `fix_file_code`, `match_result`, `source_row_number` —
**אין בטבלה**. הקוד הקודם פנה אליהן ולכן המסך החזיר
`column whatsapp_campaign_recipients.phone_raw does not exist`.

הערכים האלה נשמרים בתוך `raw_payload` תחת המפתח `_alldent`:

```jsonc
{
  "...": "שורת המקור המלאה כפי שהתקבלה, עם הכותרות המקוריות שלה",
  "_alldent": {
    "full_name": "...", "email": "...", "phone_raw": "...",
    "fix_status": "...", "fix_process": "...",
    "source_file": "רופאים מאי.csv", "source_row": "42", "record_number": "17",
    "match": "matched_contact | matched_account | ambiguous_match | not_found | invalid_phone | missing_phone",
    "imported_at": "2026-08-31T..."
  }
}
```

שורת המקור עצמה נשמרת ללא שינוי; הבלוק רק מתווסף לצידה. המסך קורא ממנו
דרך `auditOf(row)`, והמיון והחיפוש לפי שם נעשים על
`raw_payload->_alldent->>full_name` (נתמך ב-PostgREST, אומת מול ה-API החי).

**כך לא נדרש שום שינוי סכמה.**

### שדות הסיכום בטבלאות הליבה

| טבלה | תאריך | סטטוס |
|---|---|---|
| `contact` | `whatsapp_campaign_last_sent` | `whatsapp_last_delivery_status` |
| `accounts` | `whatsapp_last_sent` | `whatsapp_last_delivery_status` |

אלה שדות Cache. **מקור האמת להיסטוריה הוא `whatsapp_campaign_recipients`.**

---

## 3. זיהוי קמפיין וזיהוי שורה

### קמפיין

`external_campaign_id = fix:<תווית מנורמלת>` כאשר התווית היא, לפי סדר:

1. הערך בעמודה **"קובץ מקור"** (`source_file`) — הקובץ המאוחד
2. שם הגיליון, בחוברת מרובת גיליונות
3. שם הקובץ שהועלה

קובץ מאוחד שמכיל 12 דוחות ייקלט כ-**12 קמפיינים נפרדים**, לא כאחד ענק.
דוח FIX רגיל בלי עמודת מקור — הקובץ עצמו הוא הקמפיין.

מכיוון שהמפתח דטרמיניסטי, העלאה חוזרת מזהה את הקמפיין הקיים ולא יוצרת כפילות.

### שורה

```
source_unique_key = fix:<קמפיין>|<אסימון שורה>|<נייד או nophone>
```

* אסימון השורה = `r<שורת מקור>` כשקיימת העמודה, אחרת `i<מיקום בגיליון>`.
* הקמפיין חייב להיכנס למפתח כי `source_unique_key` הוא UNIQUE **גלובלי**.
* מספר השורה חייב להיכנס כי אותו אדם יכול להופיע פעמיים באותו דוח — שני
  אירועים נפרדים שאין לאחד.
* הנייד נכנס כדי שייצוא מחדש שבו הסדר השתנה לא ידרוס שורה של אדם אחר.

---

## 4. כללי הכתיבה

| כלל | מימוש |
|---|---|
| היסטוריה לא נמחקת | רק `INSERT` של שורות חדשות. אירוע קיים אינו נמחק ואינו מוחלף |
| קליטה חוזרת אינה מכפילה | שורה שמפתחה כבר קיים — מדולגת, ונספרת כ"כבר קיימות" |
| סטטוס מתקדם, לא נסוג | ייצוא מחדש מעדכן `delivered → read` בלבד. `read` לא יוחלף ב-`delivered` |
| אין יצירת רשומות | נייד שלא נמצא נשמר בלי `contact_id`/`account_id` ונספר ב"לא נמצאו במאגר" |
| אין הכרעה בכפילות | נייד בשתי רשומות → נשמר בלי שיוך, מסומן `ambiguous_match`, מדווח למשתמשת |
| דוח ישן לא דורס חדש | שדה הסיכום מתעדכן רק אם `sent_at` החדש מאוחר מהקיים |
| אין המצאת תאריכים | `delivered_at` / `read_at` נשארים NULL |
| כשל חלקי לא מפיל הכל | כישלון במנה מתועד ב-`errors` ומוצג; שאר המנות ממשיכות |

### עדכון שדות הסיכום — מקובץ לעדכון אחד

העדכון מקובץ לפי (מועד, סטטוס) ומבוצע ב-`UPDATE ... IN (...)` אחד לכל קבוצה.
בדוח אחיד שבו כל השורות נשלחו באותה שעה, 5,500 עדכונים הופכים ל-~9 בקשות.

> ⚠️ **תופעת לוואי ידועה:** `trg_log_contact_changes` (BEFORE UPDATE על
> `contact`) כותב שורה ל-`contact_profile_history` על כל שינוי, כולל שינוי
> של שדות ה-WhatsApp. ייבוא של 5,500 אנשי קשר ייצור ~5,500 שורות היסטוריה
> ורעש במסך ההיסטוריה של המועמד. פתרון אפשרי (דורש אישור Supabase נפרד):
> להוסיף את שתי העמודות לרשימת ה-ignore בטריגר, לצד `updated_timestamp`
> ו-`phone_norm`.

---

## 5. מיפוי סטטוס השליחה

`sending_status` המקורי נשמר תמיד ב-`delivery_status_raw` ואינו משתנה.
במקביל הוא ממופה ל-`delivery_status` לפי הערכים שה-CHECK החי מתיר:

| `sending_status` מ-Fix | קוד | תווית |
|---|---|---|
| `Read` | `read` | נקרא |
| `Delivered` | `delivered` | נמסר |
| `Submited` / `Submitted` | `submitted` | נשלח |
| `Rejected … Not suitable device` / `… undeliverable` | `failed_device` | נכשל – מכשיר לא מתאים |
| `Rejected … Auto-limiting` | `failed_rate_limit` | נכשל – הגבלת ספק |
| `Rejected … Message Blocked by Provider` | `failed_blocked` | נכשל – נחסם |
| `Rejected … provider error` | `failed_provider` | נכשל – שגיאת ספק |
| כל `Rejected` אחר | `failed_other` | נכשל – סיבה אחרת |
| `None` / ריק / לא מוכר | `no_status` | ללא סטטוס |

ההתאמה היא substring על טקסט מנורמל, כי Fix משנה את נוסח ה-Rejected בין דוחות.

---

## 6. מבנה הקובץ הנתמך

כותרות נקראות בעברית ובאנגלית, ומנורמלות לפני ההשוואה (הסרת גרש, מרכאות,
BOM, תווי כיווניות וכיווץ רווחים) — `מס׳ רשומה` ו-`מס' רשומה` זהים.

| שדה | כותרות מזוהות |
|---|---|
| שם | `fullname`, `full name`, `name`, `שם`, `שם מלא` |
| אימייל | `email`, `e-mail`, `אימייל`, `מייל`, `דואל` |
| טלפון | `phone`, `mobile`, `tel`, `טלפון`, `נייד` |
| תהליך | `process`, `תהליך` |
| סטטוס לקוח | `status`, `סטטוס`, `סטטוס לקוח` |
| מועד שליחה | `sending_time`, `מועד שליחה`, `תאריך שליחה`, `שעת שליחה` |
| סטטוס שליחה | `sending_status`, `סטטוס שליחה` |
| מס׳ רשומה | `record_number`, `מס׳ רשומה`, `מספר רשומה` |
| קובץ מקור | `source_file`, `קובץ מקור` |
| שורת מקור | `source_row`, `שורת מקור` |

**חובה:** טלפון + סטטוס שליחה. בלעדיהן הקובץ נדחה בהודעה מפורשת.

נתמכים CSV, XLSX ו-XLS. בחוברת Excel נקראים **כל** הגיליונות, לא רק הראשון.

`sending_time` מפורש כזמן מקומי (`2026-07-16 20:42` וגם `16/07/2026 20:42`)
כדי שהיום לא יזלוג בהמרה ל-UTC.

---

## 7. ההתאמה למאגר

לפי **נייד מנורמל בלבד**. אין התאמה לפי שם ואין לפי אימייל.

הנרמול נעשה ב-`normalizeIlMobile` — פורט מדויק של פונקציית ה-DB
`public.normalize_il_mobile_phone`. נייד שאינו `9725XXXXXXXX` נדחה
(`invalid_phone`) ולא נשמר.

חיפוש בשתי הטבלאות: `contact` ואז `accounts`. התוצאות האפשריות:

* נמצא באחת בלבד → משויך
* נמצא בשתיהן, או פעמיים באותה טבלה → `ambiguous_match`, ללא שיוך
* לא נמצא → `not_found`, נשמר בלי שיוך

---

## 8. בדיקות קבלה

`scratchpad/parser-check.ts` (מחוץ לריפו) מריץ 45 בדיקות על הפרסר:
מיפוי כותרות עברית/אנגלית, כל תשעת הסטטוסים, תאריכים, פיצול קובץ מאוחד
לקמפיינים, דטרמיניזם של המפתחות, חוברת מרובת גיליונות ודחיית קובץ לא מתאים.
כולן עברו ב-31/08/2026.

בנוסף אומת מול המסד החי, בתוך טרנזקציה שהוחזרה לאחור, שה-payload המדויק
שהקוד בונה עובר את כל האילוצים (`one_entity_chk`, `identifier_chk`,
`status_chk`, `source_unique_key`, `raw_payload NOT NULL`).

---

## 9. איך מבצעים את הייבוא הראשון

1. להיכנס למסך **פרסומי WhatsApp** ולוודא התחברות (RLS דורשת `authenticated`).
2. **קליטת דוח קמפיין** → לגרור את הקובץ המאוחד. שום דבר לא נשמר בשלב הזה.
3. לקרוא את התקציר: שורות בקובץ, קמפיינים שזוהו, נמצאו/לא נמצאו במאגר,
   כבר קיימות, שורות בעייתיות.
4. לבדוק את טבלת **"קמפיינים שזוהו בקובץ"** — כל שורה בה תיצור קמפיין נפרד.
   אם התוויות לא נראות נכון, זו הנקודה לעצור ולתקן את עמודת "קובץ מקור".
5. **מומלץ:** להריץ קודם קובץ אחד קטן (דוח בודד), לוודא את התוצאה במסך,
   ורק אז את הקובץ המלא.
6. **אשרי וקלטי** → בסיום מוצגת הודעה עם מה נקלט ומה עודכן. אם מנה נכשלה,
   הפירוט מוצג במסך והשאר נשמר.
7. המסך מתרענן לבד — אין צורך ב-refresh ידני.
