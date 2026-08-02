# פרומפט ביצוע סופי — השלמת GOOGLE-01 ב־n8n

**מערכת:** AllDent  
**תאריך החלטות עדכני:** 02.08.2026  
**גרסת פרומפט:** 2 — לאחר אימות Claude Code ו־Supabase החי  
**מטרת המשימה:** לתקן ולהשלים את ה־Workflow הקיים ב־n8n עד למצב Draft מלא, תקין וניתן לבדיקה — ללא הרצה, ללא Publish וללא Activate.

---

## תפקידך

אתה סוכן ביצוע בדפדפן עבור n8n. עליך לעבוד בפועל בתוך חשבון n8n של AllDent ולעדכן את ה־Workflow הקיים בלבד.

אל תיצור מסמך תכנון חדש. אל תסכם מחדש את הדרישות. אל תציע ארכיטקטורה אחרת. בצע את התיקון וההשלמה בפועל לפי ההוראות הבאות.

---

## קבצים מצורפים ומקורות אמת

קרא לפני כל שינוי, לפי הסדר:

1. `AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.md` — מקור האמת העסקי והטכני הראשי, מתאריך 27.07.2026.
2. `GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation(1).json` — ה־Export העדכני של ה־Workflow הקיים, מתאריך 02.08.2026.
3. `GOOGLE_01_ACCEPTANCE_TEST_PLAN_HE_2026-07-27.md` — תוכנית הקבלה, מתאריך 27.07.2026.
4. `GOOGLE_01_DATA_CONTRACT_EXAMPLES_2026-07-27.json` — דוגמאות חוזה הנתונים, מתאריך 27.07.2026.

החלטות מפורשות בפרומפט זה מתאריך 02.08.2026 גוברות על ניסוחים מוקדמים יותר בכל מסמך קודם.

אל תשתמש בחבילת v1, ב־`AllDent_Google_Contacts_UPDATED_2026-07-27.zip`, בפרומפטים ישנים או בגרסאות ישנות של GOOGLE-01.

---

## מצב קיים שחייב להישמר

- Workflow קיים בשם המדויק: `GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation`.
- Workflow ID: `YDyYoFJHXYD1re2D`.
- המצב הנוכחי: `active=false`.
- קיימים כרגע 30 Nodes, אך ה־Workflow חלקי ושבור.
- אל תיצור Workflow נוסף.
- אל תשנה את שמו או את ה־ID שלו.
- אל תיגע ב־`FIX-01 — FIX Digital Realtime Receiver`.


### מצב קוד AllDent שאומת לאחר כתיבת המסמך

- חבילת v2 מותקנת ב־Repository וה־commits `d9ef08b` ו־`7b728f4` אומתו על `origin/main`.
- תיקוני שער האישור נשמרו ב־commit `11be1ad` ונדחפו.
- בדיקות הלוגיקה עומדות על `23/23` ו־Build ירוק.
- כלל no-downgrade נאכף כעת גם במסך: תפקיד מקצועי מדויק אינו מוחלף בתפקיד הכללי 14.
- לאחר הכרעת `match_conflict`, המסך משאיר יעד אחד בלבד; הדבר נדרש גם בגלל CHECK קשיח ב־DB.
- אימות ויזואלי/E2E עדיין לא בוצע.

### החלטה סופית לגבי `account_type`

- `account_type` אינו מגיע מ־Google ואסור לנחש או לסנכרן אותו אוטומטית.
- בעת `create_account` במסך Inbox, מותר למשתמשת לבחור אותו ידנית מתוך המילון.
- הבחירה ידנית ואופציונלית; אם לא נבחר ערך, הוא נשאר ריק.
- `account_type` אינו נשלח חזרה ל־Google ואינו נכלל בהשוואת inbound/outbound.

לפני שינוי:

1. פתח את GOOGLE-01 הקיים.
2. ודא שהוא לא פעיל.
3. הורד Export JSON כגיבוי לפני שינוי.
4. דווח לעצמך את מספר ה־Nodes, אך אל תעצור לצורך דוח ביניים.
5. המשך לעדכן את אותו Workflow.

---

## Credentials קיימים

השתמש רק ב־Credentials הבאים:

- `Google Contacts — Doctors`
- `Google Contacts — Workers`
- `Google Contacts — Dental Managers Orgs`
- `Supabase AllDent Server`

אל תפתח, תעתיק, תציג או תשנה Secret, Token או API Key.

אם Credential חסר או דורש Login מחדש, עצור רק בנקודה זו ובקש מהמשתמשת לבצע Login ו־2FA. אל תקליד פרטי התחברות.

---

## כללי בטיחות מחייבים

במשימה זו:

- אין `Execute workflow`.
- אין `Test workflow`.
- אין Full Sync.
- אין Publish.
- אין Activate.
- אין כתיבת נתוני בדיקה ל־Supabase.
- אין ליצור 3–4 שורות בדיקה לצורך אימות המסך במסגרת משימת Draft זו; E2E יתבצע רק לאחר בדיקת Export ובאישור נפרד.
- אין כתיבה ל־Google.
- אין שינוי Schema, RLS, RPC, Trigger, Dictionary או Migration.
- אין יצירה אוטומטית של אדם או ארגון במסלול inbound.
- אין כתיבה ישירה מ־Google אל `contact` או `accounts`.
- אין מחיקה של `contact` או `accounts`.
- אין שילוב FIX.

בנה Draft בלבד, שמור אותו וייצא JSON לאחר הבנייה.

---

## מצב Supabase שאומת בקריאה בלבד ב־02.08.2026

השתמש בשמות האמיתיים הבאים בלבד:

### מפתחות ושדות ליבה

- `contact.contact_id`
- `contact.role`
- `accounts.account_id`
- `accounts.account_name`
- `contact.updated_timestamp`
- `accounts.updated_timestamp`

אל תשתמש ב־`contact.id`, ב־`accounts.id` או ב־`contact.role_id`.

### פונקציות קיימות

- `normalize_il_mobile_phone(input_phone text)`
- `detect_role_from_text(p_text text)`
- `resolve_city(input_city text)`

### Inbox

- `source_type=5` הוא `Google Contacts`.
- `inbox_v2.source_unique_key` הוא UNIQUE בפני עצמו.
- Upsert חייב להשתמש ב־`on_conflict=source_unique_key`.
- סטטוסים:
  - 5 — ממתין לאישור
  - 6 — מוזג/אושר
  - 7 — נדחה
  - 8 — התעלמות
  - 9 — לא דנטלי
  - 11 — קיים במערכת, אך אינו סטטוס סגירה למסלול Google

### Google links

`google_contact_links` כולל:

- `contact_id`
- `account_id`
- `google_account_key`
- `google_resource_name`
- `etag`
- `payload_hash`
- `is_active`
- `last_synced_at`
- `raw_payload`

Constraint DB קשיח מחייב בדיוק אחד (`CHECK num_nonnulls(contact_id, account_id) = 1`):

- אדם: `contact_id` מלא ו־`account_id=null`
- ארגון: `contact_id=null` ו־`account_id` מלא

זה אינו רק כלל עסקי. ניסיון Upsert עם שניהם או בלי אף אחד ייכשל ב־DB. לכן מסלול `match_conflict` חייב להסתיים בהכרעה ידנית ליעד יחיד לפני יצירת link.

המפתח הייחודי הוא:

`(google_account_key, google_resource_name)`

### Triggers רלוונטיים

- טלפונים מנורמלים ב־DB.
- `region_id` נגזר מ־`city_id` ואינו נכתב עצמאית.
- יצירת contact מוסיפה פרופיל ברירת מחדל `אנשי קשר` בלבד.
- אין ליצור או לשנות `rel_contact_profiles` במסלול Google.
- `accounts.account_status` מקבל default `10` בעת יצירת ארגון מאושר.

---

# שלב א — תיקון ה־Workflow הקיים

תקן לפני כל הרחבה:

1. את כל Expressions השבורים ב־Start Sync Run וב־Load Last Successful Cursors.
2. ב־Start Sync Run דרוש `Prefer: return=representation`.
3. `Attach Sync Context` חייב לקחת `sync_run_id`, לא `id`, ולזרוק שגיאה אם חסר.
4. תקן את שמונת Code Nodes שאינם עוברים תחביר JavaScript:
   - Attach Sync Context
   - Map Doctors Raw
   - Map Workers Raw
   - Map Managers/Orgs Raw
   - Canonicalize Google Record
   - Deduplicate Within Record
   - Resolve Match State
   - Compare Selected Fields
5. חבר `People API — Workers` אל `Map Workers Raw`.
6. חבר את יציאת ההצלחה של `RPC — detect_role_from_text` להמשך; יציאת השגיאה חייבת להגיע ל־Log Sync Error.
7. חבר את יציאת ההצלחה של `Find Account Candidates` אל `Resolve Match State`; יציאת השגיאה ל־Log Sync Error.
8. שמור הקשר של כל רשומה לאורך כל RPC/HTTP, באמצעות correlation key יציב כגון `source_unique_key`. אסור להשתמש בתוצאה הראשונה של Role/City לכל הרשומות.
9. כל Node חיצוני משתמש ב־`Continue Using Error Output` ומנתב שגיאות ל־`Log Sync Error` לאחר שקיים `sync_run_id`.

---

# שלב ב — Triggers, Audit ו־Cursors

## Triggers

- `Schedule Trigger — 6 Daily Runs`
- Timezone: `Asia/Jerusalem`
- Cron: `0 8,10,12,14,16,18 * * *`
- `Manual Trigger — Sync Now Before Campaign`

שני ה־Triggers נכנסים לאותו Config ול־Start Sync Run.

## Start Sync Run

צור שורה ב־`integration_sync_runs` עם:

- `workflow_name`
- `source_system=google_contacts`
- `destination_system=supabase_google_contacts`
- `status=running`
- `started_at`
- מונים התחלתיים 0
- `cursor_before`
- metadata ללא Secrets

## Cursors

מבנה מחייב:

```json
{
  "google_doctors": {"sync_token": "..."},
  "google_workers": {"sync_token": "..."},
  "google_dental_managers_orgs": {"sync_token": "..."},
  "outbound_since": "..."
}
```

- `nextPageToken` משמש רק בזמן אותה ריצה.
- `nextSyncToken` נשמר רק לאחר שכל דפי אותו חשבון הסתיימו בהצלחה.
- ב־`EXPIRED_SYNC_TOKEN`, מסמנים Full Sync נדרש רק לחשבון שנכשל; אין להריץ אותו במשימת Draft זו.
- חשבונות אחרים ממשיכים והריצה יכולה להסתיים `partial`.

---

# שלב ג — שלוש זרועות Google

People API לכל חשבון:

`GET https://people.googleapis.com/v1/people/me/connections`

Parameters:

- `pageSize=1000`
- `requestSyncToken=true`
- `personFields=names,emailAddresses,phoneNumbers,organizations,metadata`
- `sources=READ_SOURCE_TYPE_CONTACT`
- `syncToken` רק אם קיים
- `pageToken` בכל דף המשך

שמור לכל רשומה:

- `google_account_key`
- `google_resource_name`
- `etag`
- `is_deleted`
- `raw_payload`
- `source_unique_key = google:<account_key>:<resource_name>`
- `field_sources` שמציין מאיזה שדה Google הגיע כל ערך, כדי להחזיר אותו לאותו מקום ב־outbound

---

# שלב ד — חוקי שלושת החשבונות

## 1. Doctors — `google_doctors`

### Inbound

- `names[0].givenName` נשמר בשלמותו ב־`display_name`.
- אין להסיר ממנו את ההתמחות.
- פורמט הרופא המחייב הוא `דר ` — האותיות דר ורווח. אין להמיר ל־ד״ר, ד"ר, ד'ר או ד.ר.
- אם קיימת התמחות בסוגריים, שלח את תוכן הסוגריים ל־`detect_role_from_text`.
- אם אין סוגריים, מותר לבדוק רק Aliases מקצועיים מאושרים מתוך `givenName`; אין סריקת Notes או שדות חופשיים אחרים.
- ללא התמחות מזוהה: תפקיד רופא שיניים.
- `familyName` הוא העיר.
- `middleName` משמש fallback לעיר רק כאשר `familyName` חסר.
- לעולם אין לכתוב את `familyName` אל `contact.last_name`.

### Outbound

שמור את שם האדם כפי שקיים ב־Google ושנה רק את סימון ההתמחות:

- רופא כללי → הסר רק סוגריים שמכילים Alias התמחות מקצועי מוכר.
- רופא שהפך למומחה → הוסף בסוף השם `(<התמחות>)`.
- מומחה שהחליף התמחות → החלף רק את תוכן סוגרי ההתמחות.
- אל תשנה `דר `, את שם האדם, כוכביות, רווחים או טקסט אחר.
- אל תמחק סוגריים שאינם מכילים Alias התמחות מוכר.
- העיר חוזרת ל־`familyName`.

Aliases תצוגה מאושרים להתמחויות:

- מומחה אורתו → `אורתו`
- מומחה פריו → `פריו`
- מומחה אנדו → `אנדו`
- מומחה כירורג → `כירורג`
- מומחה פדו → `פדו`
- מומחה רפואת הפה → `רפואת הפה`
- מומחה שיקום → `שיקום`

כל Alias חייב להתאים ל־Role הקנוני ב־Supabase.

## 2. Workers — `google_workers`

### Inbound

- `givenName` → `display_name`.
- `familyName` הוא הטקסט המקורי של תפקיד+עיר.
- שלח את כל `familyName` ל־`detect_role_from_text`.
- קבל `matched_alias`.
- הסר רק את המופע המדויק של `matched_alias` כדי לקבל `city_text_raw`.
- שלח את השארית ל־`resolve_city`.
- `middleName` הוא fallback מאושר בלבד.

`מועמדת` ו־`דנטל` הם Role Aliases לתפקיד 14 — `עובד/ת דנטלי`. הם אינם Profile Type ואינם יוצרים פרופיל מועמד.

### Outbound

אל תבנה מחדש את `familyName`.

- אם התפקיד לא השתנה, שמור את Alias התפקיד הקיים ואת כל הטקסט בדיוק.
- אם התפקיד השתנה, החלף רק את Alias התפקיד הישן, באותו מיקום, ב־Alias הקנוני של התפקיד החדש מתוך `dict_role_aliases` שבו `notes='canonical'`.
- שמור ללא שינוי את העיר, המפרידים, המקפים, הרווחים ושאר הטקסט.

דוגמה:

`מועמדת - אשדוד` → `סייעת - אשדוד`

כלל no-downgrade:

- Google=14 כללי ו־Supabase מכיל תפקיד מדויק יותר → אין שינוי ב־Supabase ואין Inbox רק בגלל זה.
- Google מכיל תפקיד מדויק יותר ו־Supabase=14 → פער אמיתי לאישור.
- תפקיד לא מזוהה אינו הופך אוטומטית ל־14.

## 3. Dental Managers Orgs — `google_dental_managers_orgs`

קבע תחילה `record_type`:

- Role Alias מקצועי ודאי → `person`.
- סימן ארגוני מפורש ללא סימן אדם סותר → `organization`.
- סתירה או מידע לא מספיק → `record_type=null`, מצב `unclassified`.

אסור להשתמש במילה `דנטל` לבדה כהוכחה לארגון, משום שהיא Alias פעיל של תפקיד אדם 14.

### Person

- משתמש בשדות האדם המאושרים.
- ב־outbound, כל ערך חוזר לאותו Google field שממנו נקרא לפי `field_sources`.
- אל תמציא מבנה חדש לתפקיד או לעיר.
- אם לא ניתן לקבוע את שדה המקור בביטחון, אל תכתוב את השדה; רשום שגיאת outbound ברמת הרשומה.

### Organization

- שם תצוגה → `accounts.account_name`.
- אין Role לארגון.
- אין כתיבה ל־contact.
- טלפון קווי ו־077 מותרים.

---

# שלב ה — Canonicalization

לכל רשומה החזר לפחות:

```json
{
  "google_account_key": "...",
  "google_resource_name": "people/...",
  "etag": "...",
  "is_deleted": false,
  "display_name": "...",
  "phone": null,
  "phone_norm": null,
  "second_phone": null,
  "second_phone_norm": null,
  "email": null,
  "second_email": null,
  "role_text_raw": null,
  "role_id": null,
  "role_name": null,
  "matched_role_alias": null,
  "city_text_raw": null,
  "city_id": null,
  "region_id": null,
  "facebook_name": null,
  "facebook_id": null,
  "facebook_url": null,
  "record_type": null,
  "field_sources": {},
  "raw_payload": {},
  "payload_hash": null,
  "source_unique_key": "google:<account>:<resource>"
}
```

## Phones

- כל מספר של אדם עובר `normalize_il_mobile_phone`.
- רק נייד ישראלי תקין יכול להיכנס ל־`contact.phone` או `contact.second_phone`.
- קווי, 077, חו״ל או לא תקין נשמרים ב־raw בלבד במסלול אדם.
- במסלול ארגון קווי ו־077 מותרים; `phone_norm` יכול להיות null.
- מספרים זהים לאחר נרמול נשמרים פעם אחת.

## Emails

- trim
- lowercase
- הסרת whitespace כולל zero-width
- בדיקת מבנה בסיסית
- שני מיילים זהים נשמרים פעם אחת
- ערך שקיים כבר בראשי או במשני אינו שינוי

## Facebook

הקונבנציה:

- `Organization Name` → `facebook_name`
- `Organization Title` → `facebook_id`
- `Organization Department` → `facebook_url`

יש לזהות לפי תוכן:

- URL → `facebook_url`
- ספרות בלבד → `facebook_id`
- טקסט אחר → `facebook_name`

אם ערך נמצא בשדה מקור לא צפוי, שמור את מקורו ב־`field_sources` והחזר אותו לאותו שדה ב־outbound. `facebook_id` נשאר string ב־n8n; אין `Number()` ואין `parseInt()`.

---

# שלב ו — Match ו־Compare

סדר הראיות:

1. קישור פעיל ב־`google_contact_links` לפי account+resource.
2. נייד תקין מול שני שדות הנייד של contact.
3. מייל מול שני שדות המייל.
4. `facebook_id`.
5. `facebook_url`.
6. התאמה חזקה של שם+תפקיד+עיר.
7. ארגון: קישור קיים או התאמה ארגונית חד־משמעית בלבד.

חפש ב־Supabase באמצעות השמות האמיתיים:

### Contact fields

- `contact_id`
- `display_name`
- `phone`
- `phone_norm`
- `second_phone`
- `email`
- `second_email`
- `role`
- `city_id`
- `facebook_name`
- `facebook_id`
- `facebook_url`

### Account fields

- `account_id`
- `account_name`
- `phone`
- `phone_norm`
- `second_phone`
- `email`
- `second_email`
- `city_id`
- `facebook_name`
- `facebook_id`
- `facebook_url`

תוצאות מותרות:

- `merge_contact`
- `merge_account`
- `match_conflict`
- `create_contact`
- `create_account`
- `unclassified`

אם יש גם contact וגם account — אין הכרעה אוטומטית.

השווה רק:

### Person

- `display_name`
- `phone`
- `second_phone`
- `email`
- `second_email`
- `role`
- `city_id`
- `facebook_name`
- `facebook_id`
- `facebook_url`

### Organization

- `account_name`
- `phone`
- `second_phone`
- `email`
- `second_email`
- `city_id`
- `facebook_name`
- `facebook_id`
- `facebook_url`

אל תשווה או תכתוב:

- `first_name`
- `last_name`
- `full_name`
- `license_no`
- `region_id` עצמאית
- `rel_contact_profiles`
- `contact.account_link`
- Labels, Notes, תמונות ושדות תפעוליים אחרים
- `account_type` אינו שדה סנכרון; מותר רק כבחירה ידנית אופציונלית במסך יצירת ארגון

---

# שלב ז — payload_hash ו־Memory Gate

חשב SHA-256 על אובייקט עסקי קנוני בסדר מפתחות קבוע.

אל תכלול:

- etag
- timestamps
- pageToken
- syncToken
- metadata טכני משתנה

לפני Upsert ל־Inbox, חפש לפי `source_unique_key`.

- סטטוס 7/8/9 + אותו `parsed_payload.google_payload_hash` → Skip ללא עדכון השורה.
- hash שונה → עדכן את אותה שורה והחזר `merge_status=5`.
- אין מחיקת שורות.
- אין יצירת שורת Inbox נוספת לאותה רשומת Google.

---

# שלב ח — No Difference ו־Inbox

## No Business Difference

- אין כתיבה עסקית ל־contact או accounts.
- אין Inbox.
- אם קיים link, עדכן metadata בלבד:
  - `etag`
  - `payload_hash`
  - `last_synced_at`
  - `raw_payload`
- אל תיצור link ריק.

## Needs Review

Upsert ל־:

`/inbox_v2?on_conflict=source_unique_key`

חובה לכלול:

- `source_type=5`
- `source_name=google_account_key`
- `source_unique_key`
- fields הקנוניים
- `temp_role` לאדם בלבד
- `temp_city_id`
- `temp_region_id` לתצוגה בלבד
- `match_contact`
- `match_account`
- `match_reason`
- `has_new_information`
- `suggested_updates` עם שדות שונים בלבד
- `raw_payload`
- `last_seen_at`
- `seen_count`
- `merge_status=5`
- `parsed_payload` עם:
  - `record_type`
  - `google_account_key`
  - `google_resource_name`
  - `google_payload_hash`
  - `etag`
  - `field_sources`
  - `normalization`
  - `role_detection`
  - `city_resolution`

כאשר אין סוג ודאי, אל תכתוב `person`; השאר `record_type` null והשתמש ב־`unclassified`.

---

# שלב ט — החלטות מאושרות וקישור

בכל ריצה טען שורות:

- `source_type=5`
- `merge_status=6`
- `source_unique_key` מתחיל `google:`

לכל שורה:

- `match_contact` בלבד → Upsert link עם `contact_id` ו־`account_id=null`.
- `match_account` בלבד → Upsert link עם `account_id` ו־`contact_id=null`.
- שניהם או אף אחד → Log Sync Error; אין link ואין outbound.

Upsert link לפי:

`on_conflict=google_account_key,google_resource_name`

לאחר מכן טען את הישות המאושרת ועדכן את אותה רשומת Google באותו חשבון.

---

# שלב י — Outbound מ־Supabase ל־Google

שינוי ישיר ב־AllDent/Supabase נחשב מאושר.

בחר רק:

- links פעילים
- entity עם `updated_timestamp > outbound_since`
- credential לפי `google_account_key`

כללים:

- עדכן אותו `google_resource_name` בלבד.
- השתמש ב־etag הנוכחי.
- אין יצירת Google resource חדש כאשר קיים link.
- אין מעבר בין חשבונות.
- שמור שדות Google שאינם בסקופ.
- כתוב רק שדות מאושרים.
- לאחר כתיבה עדכן link metadata.
- ערך null/ריק ב־Supabase אינו מוחק ערך קיים ב־Google. מחיקה תתבצע רק בעתיד באמצעות הוראת ניקוי מפורשת; אין הוראה כזו כיום.

### Field placement

- Doctors: display name ב־givenName; התמחות בתוך סוגריים לפי החוק; עיר ב־familyName.
- Workers: החלפת Alias בלבד בתוך familyName המקורי.
- Person בחשבון השלישי: אותו source field שנשמר ב־field_sources.
- Organization: שם, טלפונים, מיילים, עיר ו־Facebook בלבד; אין Role.
- Facebook: החזר לאותו Organization field; אם לא היה מקור קודם, השתמש בקונבנציה Name/Title/Department.

לאחר update:

- `etag`
- `payload_hash`
- `last_synced_at`
- `raw_payload`

כך נמנעת לולאת echo.

---

# שלב יא — מחיקה ב־Google

כאשר `metadata.deleted=true`:

- עדכן `google_contact_links.is_active=false`.
- אין מחיקת contact.
- אין מחיקת account.
- אין Inbox רק עקב המחיקה.
- אין outbound לקישור לא פעיל.

---

# שלב יב — Finalization ושגיאות

חובה להוסיף ולהשלים:

- `Load Approved Google Inbox Decisions`
- `Resolve Approved Target Entity`
- `Upsert Link From Approved Decision`
- `Load Supabase Outbound Changes`
- `Route By Google Account Key`
- `Build Google Update Payload`
- `Update Same Google Resource`
- `Update Link Metadata After Write`
- `Save Successful Cursors`
- `Finish Sync Run`
- `Log Sync Error`
- `Mark Sync Run Partial/Failed`

`integration_sync_runs.status` מקבל רק:

- running
- success
- partial
- failed
- skipped

ב־Finish Sync Run שמור:

- `finished_at`
- מוני received/created/updated/skipped/failed
- `cursor_before`
- `cursor_after`
- metadata לפי חשבון ושלב

ב־integration_sync_errors שמור:

- `sync_run_id`
- `source_record_key`
- `error_type`
- `error_message`
- `http_status` אם קיים
- `retry_count`
- `raw_payload`

שגיאת רשומה אחת אינה מפילה חשבונות אחרים. אין לנסות Log ללא `sync_run_id`.

---

# בדיקת Draft ללא הרצה

לפני סיום, עבור ידנית על הקנבס וודא:

1. `active=false`.
2. שני Triggers בלבד.
3. Cron ו־Timezone נכונים.
4. שלושה Credentials נפרדים ל־Google.
5. אין Node של FIX.
6. אין Secret גלוי.
7. אין Node מנותק.
8. כל success output מחובר למסלול ההצלחה וכל error output ל־Log.
9. קיימת Pagination לכל חשבון.
10. קיימים Cursors נפרדים.
11. קיימים person, organization, unclassified ו־match_conflict.
12. אין כתיבה ישירה ל־contact/accounts במסלול inbound.
13. קיים Memory Gate אמיתי לפני Inbox.
14. קיים מסלול החלטות מאושרות.
15. קיים Outbound מלא לשלושת החשבונות.
16. קיים טיפול ב־deleted.
17. קיימים Audit, Finalization ו־partial/failed.
18. לא בוצעו Execute, Test, Publish או Activate.

שמור את ה־Draft והורד Export JSON חדש.

---

# דוח חובה בסיום

החזר דוח קצר ומדויק בלבד:

1. Workflow name ו־ID.
2. עודכן Workflow קיים, לא נוצר חדש.
3. `active=false`.
4. מספר Nodes סופי.
5. רשימת Nodes לפי שלבים.
6. Credential לכל זרוע.
7. Cron ו־Timezone.
8. Pagination ו־cursor schema.
9. אישור תיקון 8 Code Nodes והחיבורים השבורים.
10. אישור מיפוי Supabase בשמות האמיתיים.
11. אישור חוקי Doctors, Workers ו־Managers/Orgs.
12. אישור Memory Gate, approved decisions, links ו־outbound.
13. אישור error paths ו־Audit.
14. אישור מפורש שלא נגעת ב־FIX-01.
15. אישור מפורש שלא הרצת, לא פרסמת, לא הפעלת ולא כתבת נתוני אמת.
16. חסמים שנותרו לפני Test, אם קיימים.
17. צרף Export JSON החדש.

אל תתחיל Test. אל תפעיל את ה־Workflow. עצור לאחר מסירת ה־Export והדוח.
