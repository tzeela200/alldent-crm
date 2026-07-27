# SSOT סופי ומעודכן — Google Contacts מול Supabase

**מערכת:** AllDent  
**גרסה:** 2.0 — מקור אמת לבנייה ולבדיקות  
**תאריך:** 27.07.2026  
**סקופ:** Google Contacts ↔ Supabase ↔ Inbox 2 בלבד  

> מסמך זה מחליף את גרסה 1.0 מ־26.07.2026 ואת כל מסמכי Google הקודמים. החלטות מאוחרות של צאלה והמצב שאומת חי ב־Supabase גוברים על סקריפטים, Excel, מסמכי מיפוי ונוסחים ישנים.

---

## 1. מטרת התהליך

לסנכרן שלושה חשבונות Google Contacts עם Supabase כך ש־Supabase יהיה מקור האמת העסקי, בלי לאבד מידע, בלי ליצור כפילויות, בלי להציף את Inbox 2 ובלי לדרוס מידע קיים ללא החלטה.

הכיוון הוא **דו־כיווני מבוקר**:

```text
Google Contacts
  → n8n: שליפה, נרמול, סיווג והשוואה
  → Inbox 2: רק כאשר נדרשת החלטה
  → contact או accounts לאחר אישור
  → n8n מקשר ומעדכן את אותה רשומת Google באותו חשבון

AllDent / Supabase
  → שינוי ישיר נחשב מאושר
  → n8n מעדכן כל רשומת Google פעילה שמקושרת לאותה ישות
```

אין עדכון חופשי בין המערכות. Google אינה מקור אמת עסקי. שינוי עסקי שונה מ־Google עובר שער החלטה. שינוי שבוצע ישירות ב־AllDent/Supabase כבר מאושר ואינו דורש Inbox נוסף.

---

## 2. המערכות והאחריות

| מערכת | אחריות |
|---|---|
| Google Contacts | מקור תפעולי לזיהוי שיחות ולמידע הקיים בשלושה חשבונות |
| Supabase | מקור האמת המאושר של AllDent |
| n8n | People API, cursors, נרמול, סיווג אדם/ארגון, זיהוי תפקיד ועיר, התאמה, Memory Gate, Inbox, קישורים, outbound ותיעוד |
| Inbox 2 (`inbox_v2`) | שער החלטה לפער, רשומה חדשה, סיווג חסר, התאמה לא ודאית או סתירה |
| קוד AllDent — `INC-3115` | תצוגת השוואה ואישור לאדם או לארגון; אינו מנתח Google ואינו קורא ל־n8n |
| `google_contact_links` | קישור טכני קבוע בין Google resource לבין אדם או ארגון אחד בלבד |
| `integration_sync_runs` / `integration_sync_errors` | Audit של כל ריצה ושגיאה |

**מחוץ לסקופ:** FIX Digital, Fillout, Facebook API ישיר, מספרי רישיון, קמפיינים וכל מערכת אחרת. נתוני Facebook המצויים בתוך Google Contacts כן נכללים בשדות שנבחרו.

---

## 3. מצב מערכת מאומת ב־27.07.2026

### 3.1 Supabase

- `inbox_v2.second_phone text` קיים.
- `inbox_v2.second_email text` קיים.
- `inbox_v2.source_unique_key` מוגדר UNIQUE.
- `source_type=5` הוא `Google Contacts`.
- `inbox_v2.match_contact` מקושר ל־`contact.contact_id`.
- `inbox_v2.match_account` מקושר ל־`accounts.account_id`.
- `google_contact_links` כולל `contact_id` ו־`account_id`.
- Constraint חי מחייב `num_nonnulls(contact_id, account_id) = 1`.
- UNIQUE חי על `(google_account_key, google_resource_name)`.
- `contact.facebook_id` הוא `bigint`.
- `accounts.facebook_id` הוא `text`.
- `accounts.account_name` הוא שדה החובה היחיד ליצירה.
- `accounts.account_status` מקבל default `10` — "ארגון חדש".
- `integration_sync_runs.status` מקבל רק: `running`, `success`, `partial`, `failed`, `skipped`.

### 3.2 פונקציות ומילונים

- `normalize_il_mobile_phone(input_phone text) → text`.
- `detect_role_from_text(p_text text)` מחזירה `role_id`, `role_name`, `matched_alias`, `confidence`, `priority`.
- `resolve_city(input_city text)` מחזירה `city_id`, `region_id`, שמות וסוג התאמה.
- Alias `מועמדת` פעיל, priority 40, ומחזיר `role_id=14` — `עובד/ת דנטלי`.
- Alias `דנטל` פעיל, priority 20, ומחזיר `role_id=14` — `עובד/ת דנטלי`.

### 3.3 טריגרים רלוונטיים

- `contact`: נרמול נייד; מספר לא־נייד בשדה `phone` עלול להפיל כתיבה.
- `accounts`: נרמול טלפון אינו זורק חריגה; קו נייח ו־077 מותרים, ו־`phone_norm` יכול להישאר NULL.
- `contact` ו־`accounts`: `region_id` נגזר מ־`city_id`; אין לכתוב אזור באופן עצמאי.

### 3.4 קוד AllDent

לפי דוח ביצוע `INC-3115`:

- רכיב האישור הורחב לאדם ולארגון.
- נוספו `unclassified` ו־`match_conflict`.
- 21/21 בדיקות לוגיקה עברו ו־Build עבר.
- לא בוצעו commit, push, נתוני בדיקה או אימות ויזואלי/E2E.
- אין לראות בדוח זה הוכחת deployment; זהו סטטוס ביצוע מקומי כפי שנמסר.

### 3.5 n8n

`GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation` טרם נבנה בפועל. אין Workflow JSON מאושר, לא חוברו credentials ולא בוצעה הרצה.

---

## 4. שלושת חשבונות Google

| מפתח לוגי | סוג החשבון | פענוח עיקרי |
|---|---|---|
| `google_doctors` | רופאי שיניים ומומחים | `givenName` הוא שם תצוגה; `familyName` הוא עיר; התמחות עשויה להופיע בסוגריים בשם |
| `google_workers` | עובדים דנטליים | `givenName` הוא שם תצוגה; `familyName` מכיל Alias תפקיד ולאחריו עיר |
| `google_dental_managers_orgs` | מנהלים, עובדים וארגונים | תחילה קובעים `person` או `organization`; אין fallback שקט |

כל מפתח מקושר ל־Google OAuth credential נפרד. אין להעביר רשומה בין חשבונות.

---

## 5. השדות היחידים שנבחרו

### 5.1 איש קשר — `contact`

| מידע עסקי | מקור Google | יעד Supabase | כלל |
|---|---|---|---|
| שם תצוגה | `names[0].givenName` | `contact.display_name` | נשמר כיחידה אחת |
| נייד ראשי | `phoneNumbers[0]` | `contact.phone` | נייד ישראלי תקין בלבד |
| נייד נוסף | `phoneNumbers[1]` | `contact.second_phone` | נייד ישראלי תקין ושונה בלבד |
| מייל ראשי | `emailAddresses[0]` | `contact.email` | lowercase וניקוי whitespace |
| מייל נוסף | `emailAddresses[1]` | `contact.second_email` | רק אם שונה |
| תפקיד | לפי מבנה החשבון | `contact.role` | `dict_roles.id` בלבד |
| עיר | לפי מבנה החשבון | `contact.city_id` | `resolve_city()` בלבד |
| שם Facebook | `organizations` לפי סוג הערך | `contact.facebook_name` | טקסט שאינו URL ואינו מספר |
| מזהה Facebook | `organizations` לפי סוג הערך | `contact.facebook_id` | ספרות בלבד; אין `Number()` ב־JavaScript |
| קישור Facebook | `organizations` לפי סוג הערך | `contact.facebook_url` | URL תקין |

### 5.2 ארגון — `accounts`

| מידע עסקי | מקור Google | יעד Supabase | כלל |
|---|---|---|---|
| שם ארגון | שם התצוגה של הרשומה | `accounts.account_name` | חובה ביצירת ארגון |
| טלפון ראשי | `phoneNumbers[0]` | `accounts.phone` | נייד, קווי או 077 מותרים |
| טלפון נוסף | `phoneNumbers[1]` | `accounts.second_phone` | כפילות פנימית מוסרת |
| מייל ראשי | `emailAddresses[0]` | `accounts.email` | lowercase וניקוי whitespace |
| מייל נוסף | `emailAddresses[1]` | `accounts.second_email` | רק אם שונה |
| עיר | לפי מבנה החשבון | `accounts.city_id` | `resolve_city()` בלבד |
| שם Facebook | `organizations` לפי סוג הערך | `accounts.facebook_name` | טקסט |
| מזהה Facebook | `organizations` לפי סוג הערך | `accounts.facebook_id` | ספרות בלבד אף שהעמודה text |
| קישור Facebook | `organizations` לפי סוג הערך | `accounts.facebook_url` | URL תקין |

`account_status` אינו נשלח; default 10 מופעל. `account_type` אינו מנוחש על ידי n8n; במסך הוא בחירה אופציונלית ממילון בלבד.

### 5.3 שדות שאסור לסנכרן או לכתוב בתהליך זה

- `first_name`, `last_name`, `full_name`.
- `license_no`.
- `region_id` כערך עצמאי.
- Labels, תמונות, הערות ושדות מותאמים אחרים.
- שדות תפעוליים של `accounts`, לרבות `account_status`, `merged_into_account_id`, `bus_id`, ספירות וקישורים.
- `contact.account_link` או `rel_contact_profiles`.

`Google familyName` אינו שם משפחה במבנה AllDent ולעולם אינו נכתב ל־`contact.last_name`.

---

## 6. פענוח לפי חשבון

### 6.1 רופאים

1. `givenName` → `display_name`.
2. התמחות בסוגריים נשלחת ל־`detect_role_from_text()`.
3. כאשר הרשומה היא רופא ואין התמחות מזוהה: תפקיד רופא שיניים לפי המילון.
4. `familyName` → `city_text_raw` → `resolve_city()`.
5. `middleName` הוא fallback בלבד כאשר המקור הראשי חסר.
6. אין סריקה חופשית של הערות או של כל הרשומה.

### 6.2 עובדים

1. `givenName` → `display_name`.
2. `familyName` → טקסט תפקיד+עיר.
3. `detect_role_from_text()` מחזירה את Alias התפקיד הארוך/העדיף.
4. מסירים רק את `matched_alias` שזוהה.
5. השארית → `city_text_raw` → `resolve_city()`.
6. `middleName` הוא fallback מאושר בלבד.

### 6.3 החשבון השלישי — אדם או ארגון

`Detect Record Type` חייב להחזיר:

- `parsed_payload.record_type = "person"`; או
- `parsed_payload.record_type = "organization"`.

כלל שמרני:

- Alias מקצועי ודאי של אדם → `person`.
- מילת סוג ארגון מפורשת ומאושרת, ללא אות אדם סותר → `organization`.
- אותות סותרים או מידע לא מספיק → אין ערך תקין; הרשומה היא `unclassified` במסך.

המסך אינו מנחש. ערך חסר או שונה מ־`person`/`organization` אינו הופך אוטומטית לאדם.

ארגון אינו מקבל `contact.role="ארגון"` ואינו נכתב ל־`contact`.

---

## 7. תפקידים ו־Aliases

מקור האמת:

- `dict_roles`.
- `dict_role_aliases`.
- `detect_role_from_text(p_text)`.

n8n אינה מחזיקה רשימת תפקידים עצמאית ואינה יוצרת תפקיד.

### מיפויים מיוחדים מאושרים

| טקסט Google | תפקיד קנוני | התנהגות |
|---|---|---|
| `מועמדת` | `role_id=14` — עובד/ת דנטלי | אין Inbox רק בגלל הניסוח |
| `דנטל` | `role_id=14` — עובד/ת דנטלי | אין Inbox רק בגלל הניסוח |

הערכים נמצאים באותו slot שבו מופיעים תפקידים כמו סייעת, שיננית ומנהלת. אין לפרש אותם כפרופיל מועמד במסלול זה.

### שמירת תפקיד מדויק

כאשר Google מחזירה ערך כללי שממופה ל־14 וב־Supabase קיים תפקיד מקצועי מדויק יותר:

- אין להוריד את התפקיד המדויק.
- אין ליצור פער רק כדי להחליף מדויק בכללי.
- השינוי מסווג `same/no-op` מבחינה עסקית.

כאשר Google מחזירה תפקיד מדויק יותר וב־Supabase קיים 14, זהו פער אמיתי המוצג לאישור.

תפקיד לא מזוהה אינו ממופה אוטומטית ל־14.

---

## 8. עיר ואזור

1. כל טקסט עיר עובר `resolve_city(input_city)`.
2. רק `city_id` קנוני נשמר.
3. `region_id` נגזר בטריגר מ־`city_id`.
4. אין מפת ערים בתוך Code node.
5. אין יצירת עיר או Alias חדש מתוך n8n.
6. עיר לא מזוהה נשמרת ב־raw/parsed ועוברת לבדיקה כשהרשומה רלוונטית.
7. אין לכתוב `temp_region_id` או `region_id` כהחלטה עצמאית; ניתן לשמור את האזור שהוחזר לצורכי תצוגה/Audit בלבד.

---

## 9. ניידים וטלפונים

### 9.1 אדם

- כל ערך נשלח ל־`normalize_il_mobile_phone()`.
- מפתח קנוני: `9725XXXXXXXX`.
- רק נייד ישראלי תקין יכול להיכתב ל־`contact.phone` או `contact.second_phone`.
- קווי, 077, חו״ל או לא תקין נשמרים ב־`raw_payload` בלבד במסלול אדם.
- ערך שמנורמל לזהה לנייד הראשי או הנוסף ב־Supabase אינו שינוי.

### 9.2 ארגון

- קו נייח ו־077 מותרים ב־`accounts.phone`/`second_phone`.
- `phone_norm` עשוי להיות NULL ואינו כשל.
- התאמה אוטומטית לארגון לא תתבצע על סמך טקסט טלפון עמום; קישור קיים או התאמה חד־משמעית נדרשים, אחרת Inbox.

### 9.3 דדופליקציה פנימית

- נייד/טלפון 1 ו־2 זהים לאחר ניקוי → שומרים פעם אחת.
- אין Inbox ואין כתיבה כפולה רק בגלל פורמט שונה.
- אין מצב שבו אותו ערך נשמר גם בראשי וגם במשני.

---

## 10. מיילים

1. trim והסרת כל whitespace, לרבות zero-width.
2. lowercase.
3. בדיקת מבנה בסיסית.
4. השוואה מול שני שדות המייל של הישות.
5. מייל 1 ו־2 זהים → שומרים פעם אחת.
6. ערך שכבר קיים בראשי או במשני אינו פער.

---

## 11. Facebook

הערכים עשויים להופיע ב־Organization Name/Title/Department:

- URL תקין → `facebook_url`.
- ספרות בלבד → `facebook_id`.
- טקסט אחר → `facebook_name`.

כללי חובה:

- `facebook_id` של אדם עובר כמחרוזת ספרות ל־PostgREST; אין `Number()` או `parseInt()` בגלל דיוק.
- גם בארגון מתקבלים ל־`facebook_id` רק ספרות, אף שהעמודה text.
- URL או טקסט שהגיעו בשדה לא נכון יכולים להיות מוצעים לשדה הנכון רק בהחלטה מפורשת במסך ורק אם היעד ריק.
- כל המקור נשמר ב־`raw_payload`.

---

## 12. קישור Google קבוע

מפתח הקישור:

```text
(google_account_key, google_resource_name)
```

הוא UNIQUE ב־Supabase.

לכל קישור חייבת להיות ישות אחת בלבד:

### אדם

```json
{
  "contact_id": 123,
  "account_id": null
}
```

### ארגון

```json
{
  "contact_id": null,
  "account_id": 456
}
```

נשמרים גם:

- `etag`.
- `payload_hash`.
- `is_active`.
- `last_synced_at`.
- `raw_payload`.

אותו אדם או ארגון יכול להיות מקושר לכמה רשומות Google בחשבונות שונים. אין להעביר קישור בין חשבונות ואין ליצור קישור עם שתי ישויות.

---

## 13. זיהוי והתאמה

סדר הראיות:

1. קישור פעיל ב־`google_contact_links`.
2. נייד תקין מול שני שדות הנייד של אדם.
3. מייל מול שני שדות המייל.
4. `facebook_id`.
5. `facebook_url`.
6. התאמה חזקה של שם תצוגה + תפקיד + עיר.
7. בארגון: קישור קיים או התאמה ארגונית חד־משמעית לפי השדות המאושרים.

### תוצאות אפשריות

| מצב | תוצאה |
|---|---|
| `match_contact` בלבד | `merge_contact` |
| `match_account` בלבד | `merge_account` |
| שניהם קיימים | `match_conflict`; אין עדיפות אוטומטית |
| אין התאמות + `record_type=person` | `create_contact` במסך לאחר אישור בלבד |
| אין התאמות + `record_type=organization` | `create_account` במסך לאחר אישור בלבד |
| אין התאמות + סוג חסר/לא תקין | `unclassified`; אין פעולת יצירה |

אין להסתמך על `merge_status` כדי לקבוע אדם/ארגון. בפרט, אין לפרש `merge_status=3` כסוג ישות.

---

## 14. מתי אין Inbox

- כל השדות שנבחרו זהים לאחר נרמול.
- כפילות פנימית בניידים/טלפונים או במיילים.
- ערך קיים בשדה הראשי או המשני.
- `מועמדת`/`דנטל` כבר ממופים ל־14 ואין פער אמיתי.
- ב־Supabase קיים תפקיד מדויק יותר מ־14 ו־Google מחזירה ערך כללי.
- השתנה רק `etag`, מועד או metadata טכני.
- החלטת 7/8/9 קיימת וה־business payload hash לא השתנה.

במצב זה מעדכנים metadata בקישור קיים בלבד. אין כתיבה עסקית.

---

## 15. מתי נוצר או מתעדכן Inbox

- אין קישור ואין התאמה ודאית.
- נמצא אדם או ארגון אך קיים פער באחד השדות שנבחרו.
- `record_type` חסר או לא תקין.
- יש גם `match_contact` וגם `match_account`.
- תפקיד או עיר אינם מזוהים.
- כמה מועמדים אפשריים.
- רשומה ללא נייד מכילה מזהה שימושי אחר.
- הרשומה עשויה להיות לא דנטלית.

`source_unique_key`:

```text
google:<google_account_key>:<google_resource_name>
```

Upsert תמיד לפי המפתח הזה; אין ליצור שורת Inbox נוספת לאותה רשומת Google.

---

## 16. חוזה `inbox_v2`

### שדות ישירים

- `source_type = 5`.
- `source_name = google_account_key`.
- `source_unique_key`.
- `display_name`.
- `phone`, `phone_norm`, `second_phone`.
- `email`, `second_email`.
- `facebook_name`, `facebook_id`, `facebook_url`.
- `temp_role = role_id` לאדם בלבד.
- `temp_city_id = city_id`.
- `temp_region_id = region_id` לצורכי תצוגה בלבד.
- `match_contact`, `match_account`.
- `match_confidence`, `matched_by`, `match_reason` כאשר קיימים.
- `has_new_information`.
- `suggested_updates` — רק שדות שונים.
- `raw_payload` — מקור מלא.
- `last_seen_at`, `seen_count`.

### `parsed_payload` — חובה

```json
{
  "record_type": "person",
  "google_account_key": "google_workers",
  "google_resource_name": "people/abc",
  "google_payload_hash": "sha256...",
  "etag": "...",
  "field_sources": {},
  "normalization": {},
  "role_detection": {},
  "city_resolution": {}
}
```

`record_type` הוא `person` או `organization` בלבד. כאשר לא ניתן לקבוע, לא נכתב ערך תקין והמסך מציג `unclassified`.

### סטטוסים

- 5 — ממתין לאישור.
- 6 — מוזג/אושר.
- 7 — נדחה.
- 8 — התעלמות.
- 9 — לא דנטלי.

11 — קיים במערכת אינו משמש כסטטוס סגירה של אישור Google, משום שהוא מוגדר פתוח במסך הקיים.

---

## 17. Memory Gate

`payload_hash` מחושב רק מן השדות העסקיים הקנוניים שנבחרו, לאחר נרמול ובסדר קבוע. הוא אינו כולל `etag`, timestamps, page tokens או metadata משתנה.

לפני upsert ל־Inbox:

1. חפש `source_unique_key`.
2. קרא `merge_status` ו־`parsed_payload.google_payload_hash`.
3. סטטוס 7/8/9 + hash זהה → Skip בלי לעדכן את השורה.
4. hash שונה → עדכן את אותה שורה, קבע `merge_status=5`, שמור את ה־hash החדש והצג לבדיקה.
5. אין מחיקה של שורת Inbox סגורה.

רשומה ללא מזהה שימושי יכולה להישמר כ־skip טכני ב־Audit; אין להציף Inbox בכל ריצה.

---

## 18. אישור Inbox והמשך n8n

המסך מסיים את תפקידו לאחר:

- עדכון `contact` או `accounts` בהתאם לבחירות;
- `merge_status=6`;
- `match_contact` או `match_account`;
- רישום ב־`inbox_merge_actions`.

`GOOGLE-01` חייב בכל ריצה לאתר החלטות Google שאושרו ושטרם מיוצגות בקישור נכון:

1. קרא שורות `source_type=5`, `merge_status=6` עם `source_unique_key` של Google.
2. חלץ `google_account_key` ו־`google_resource_name` מ־`parsed_payload` או מן המפתח.
3. אם `match_contact` קיים בלבד — upsert קישור אדם.
4. אם `match_account` קיים בלבד — upsert קישור ארגון.
5. אם שניהם או אף אחד — Log error; אין קישור ואין outbound.
6. טען את הישות המאושרת ועדכן את אותה רשומת Google באותו חשבון.
7. עדכן `etag`, `payload_hash`, `last_synced_at`, `raw_payload` בקישור.

המסך אינו כותב ל־`google_contact_links` ואינו קורא ל־Google.

---

## 19. Outbound מ־Supabase ל־Google

שינוי ישיר ב־AllDent/Supabase נחשב מאושר.

### בחירת רשומות

- קישורים פעילים בלבד.
- `contact.updated_timestamp` או `accounts.updated_timestamp` מאוחרים מה־cursor האחרון של outbound.
- כל קישור מעובד עם credential לפי `google_account_key`.

### כללים

- אותו `google_resource_name`; אין יצירת עותק כאשר קיים קישור.
- שימוש ב־etag הנוכחי.
- אין העברה בין חשבונות.
- מעדכנים רק שדות שנבחרו.
- משמרים שדות Google שאינם בסקופ.
- Alias תפקיד קיים נשמר אם עדיין ממפה לאותו `role_id`.
- Workers: תפקיד + עיר חוזרים ל־`familyName` במבנה המקור.
- Doctors: עיר חוזרת ל־`familyName`; אין בנייה מחדש של שם האדם.
- Organization: אין תפקיד; שם, טלפונים, מיילים, עיר ו־Facebook בלבד.
- אין כתיבת אזור או רישיון.

שינוי מ־Google שאושר במסך וחזר ל־Google אינו צריך ליצור לולאה: `payload_hash` ו־`last_synced_at` בקישור מונעים טיפול חוזר באותו תוכן.

---

## 20. מחיקה ב־Google

כאשר `metadata.deleted=true`:

- `google_contact_links.is_active=false`.
- אין מחיקה של `contact` או `accounts`.
- אין יצירת Inbox רק עקב המחיקה.
- הנתונים העסקיים נשמרים.

---

## 21. שעות והרצות

Timezone: `Asia/Jerusalem`.

- 08:00
- 10:00
- 12:00
- 14:00
- 16:00
- 18:00

Cron:

```text
0 8,10,12,14,16,18 * * *
```

Trigger ידני: `Sync Now Before Campaign` / `סנכרן עכשיו לפני קמפיין`.

כל execution מטפל בשלושת החשבונות בסדר קבוע. אין שלושה Workflows נפרדים.

---

## 22. People API ו־cursors

Endpoint:

```text
GET https://people.googleapis.com/v1/people/me/connections
```

Query parameters:

- `pageSize=1000`.
- `requestSyncToken=true`.
- `personFields=names,emailAddresses,phoneNumbers,organizations,metadata`.
- `sources=READ_SOURCE_TYPE_CONTACT`.
- `syncToken` בהרצה אינקרמנטלית.
- `pageToken` בזמן pagination בלבד.

`nextPageToken` הוא זמני בתוך execution. `nextSyncToken` נשמר רק אחרי סיום מוצלח של כל דפי החשבון.

מבנה cursor:

```json
{
  "google_doctors": {"sync_token":"..."},
  "google_workers": {"sync_token":"..."},
  "google_dental_managers_orgs": {"sync_token":"..."},
  "outbound_since":"2026-07-27T00:00:00Z"
}
```

ב־`EXPIRED_SYNC_TOKEN`:

- Full Sync מחדש לחשבון שנכשל בלבד.
- אין איפוס tokens של החשבונות האחרים.
- ריצה יכולה להסתיים `partial`.
- אין לשמור token חדש לחשבון שלא הושלם.

---

## 23. Workflow `GOOGLE-01`

**שם:** `GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation`

### שלבים לוגיים

1. Schedule Trigger.
2. Manual Trigger.
3. Config ללא secrets גלויים.
4. Start Sync Run.
5. Attach Sync Context.
6. Load Last Successful Cursors.
7. Process Doctors Account.
8. Process Workers Account.
9. Process Managers/Organizations Account.
10. Canonicalize Google Record.
11. Deduplicate Within Record.
12. Detect Record Type.
13. Detect Role RPC.
14. Resolve City RPC.
15. Find Existing Google Link.
16. Find Contact Candidates.
17. Find Account Candidates.
18. Resolve Match State.
19. Compare Selected Fields Only.
20. Memory Gate.
21. No Difference → Link Metadata Only.
22. Needs Review → Upsert `inbox_v2`.
23. Load Approved Inbox Decisions.
24. Upsert Link From Approved Decision.
25. Load Outbound Entity Changes.
26. Route By Google Account Key.
27. Update Same Google Resource.
28. Update Link Metadata.
29. Save Successful Cursors.
30. Finish Sync Run.
31. Log Sync Error.
32. Mark Partial/Failed.

### כללי שגיאות

- כל Node חיצוני: `Continue Using Error Output`.
- שגיאת רשומה אחת נרשמת ואינה מפילה חשבונות אחרים.
- כשל לפני יצירת `sync_run_id` מחזיר כשל Audit ואינו מנסה Log ללא מזהה.
- כשל לאחר `sync_run_id` נרשם ב־`integration_sync_errors` ומעדכן את הריצה.
- אין fallback למזהה ריצה ריק.

---

## 24. Audit

### `integration_sync_runs`

- `workflow_name`.
- `source_system=google_contacts`.
- `destination_system=supabase_google_contacts`.
- `started_at`, `finished_at`.
- `status` מתוך הערכים המאושרים בלבד.
- מוני received/created/updated/skipped/failed.
- `cursor_before`, `cursor_after`.
- metadata לפי חשבון ושלב.

### `integration_sync_errors`

- `sync_run_id`.
- `source_record_key`.
- `error_type`.
- `error_message`.
- `http_status` כאשר קיים.
- `retry_count`.
- `raw_payload`.

אין להציג credentials, access tokens או refresh tokens ב־Audit.

---

## 25. מצב רכיב האישור `INC-3115`

לפי הדוח שנמסר:

- 10 שדות לאדם ו־9 לארגון.
- `SidePanel` להשוואה.
- דדופליקציה של ניידים ומיילים.
- חסימת קווי/077 במסלול אדם ומתן אפשרות במסלול ארגון.
- `facebook_id` בלי אובדן דיוק.
- `unclassified` ו־`match_conflict`.
- יצירת ארגון עם default status.
- `approved_by` נרשם.
- 21/21 בדיקות ו־Build ירוק.

נותרו:

- Commit ו־push לאחר בדיקת diff.
- אימות ויזואלי.
- E2E מול נתוני Google מבוקרים.
- בניית `GOOGLE-01`.

---

## 26. בדיקות קבלה לפני Publish/Activate

1. רשומה זהה — metadata בלבד.
2. נייד כפול בפורמט שונה — פעם אחת.
3. מייל כפול — פעם אחת.
4. `מועמדת` → 14 בלי Inbox מיותר.
5. `דנטל` → 14 בלי Inbox מיותר.
6. תפקיד מדויק ב־Supabase מול 14 ב־Google — אין downgrade.
7. תפקיד מדויק ב־Google מול 14 ב־Supabase — Inbox.
8. תפקיד לא מזוהה — Inbox אחד.
9. עיר לא מזוהה — אין ניחוש.
10. אדם עם קווי/077 — raw בלבד.
11. ארגון עם קווי/077 — מותר לאישור.
12. רשומה ללא נייד ועם מייל — נבדקת.
13. ללא מזהה שימושי — skip בלי הצפה.
14. `record_type` חסר — `unclassified`.
15. שתי התאמות — `match_conflict`.
16. match_account בלבד — מסלול ארגון.
17. יצירת ארגון — `account_status=10` ב־DB.
18. אישור אדם — קישור עם `contact_id` בלבד.
19. אישור ארגון — קישור עם `account_id` בלבד.
20. 7/8/9 + hash זהה — לא נפתח מחדש.
21. hash שונה — אותה שורה נפתחת מחדש.
22. שינוי ישיר באדם — חוזר לכל קישורי Google הפעילים שלו.
23. שינוי ישיר בארגון — חוזר לכל קישורי Google הפעילים שלו.
24. מחיקה ב־Google — link inactive בלבד.
25. token שפג בחשבון אחד — Full Sync רק בו.
26. כשל רשומה — error audit וריצה partial/failed.
27. אין כתיבה לשדות אסורים.
28. אין Publish/Activate לפני אישור מפורש.

---

## 27. כללי עצירה ובטיחות

בשלב הבנייה:

- אין Execute workflow.
- אין Full Sync.
- אין Publish.
- אין Activate.
- אין הכנסת שורות בדיקה ל־Supabase.
- אין כתיבה ל־Google.
- אין שינויי Schema/RLS/RPC/Trigger/Dictionary.
- אין שילוב FIX.

הבונה עוצר לאחר יצירת Draft ומחזיר דוח מלא. Test מבוצע רק באישור נפרד שמפרט את הרשומה, הכתיבות והטבלאות.

---

## 28. החלטות סופיות

1. Supabase הוא מקור האמת.
2. הסנכרון דו־כיווני ומבוקר.
3. Google inbound אינו כותב עסקית ללא החלטת Inbox.
4. אדם וארגון הם שני מסלולים מלאים.
5. סוג רשומה חסר אינו אדם.
6. התאמת אדם וארגון יחד אינה מוכרעת אוטומטית.
7. קישור Google מכיל אדם או ארגון, לעולם לא שניהם.
8. `מועמדת` ו־`דנטל` ממופים ל־14.
9. תפקיד מדויק אינו מוחלף בערך כללי.
10. Family Name אינו last_name.
11. אין רישיון במסלול Google.
12. אזור נגזר מעיר.
13. קו נייח אסור לאדם ומותר לארגון.
14. זיכרון hash מונע משימות חוזרות.
15. אין מחיקה אוטומטית.
16. שש הרצות ביום והרצה ידנית.
17. Workflow אחד מטפל בשלושת החשבונות.
18. FIX אינו חלק מהחבילה.

---

## 29. מקורות החבילה

- חבילת Google מ־26.07.2026 שהוכנה לפרויקט.
- מסמך התוכנית `INC-3115` שהועלה ב־27.07.2026.
- דוח הביצוע של Claude Code שנמסר בשיחה.
- בדיקות read-only חיות של Supabase ב־27.07.2026.
- מסמכי מיפוי Google והסקריפט הקיים — להבנת מבנה המקור בלבד, בכפוף להחלטות המאוחרות במסמך זה.
