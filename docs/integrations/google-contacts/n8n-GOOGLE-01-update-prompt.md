# הוראת ביצוע מלאה ל־n8n — GOOGLE-01

**תאריך ושעה:** 26.07.2026, 23:12 — Asia/Jerusalem  
**מסמך מקור אמת:** `google-contacts-supabase-ssot.md`

---

## ⚠️ תוספות מחייבות מ־27.07.2026 (INC-3115) — גוברות על הנוסח שלהלן

מסך האישור של Inbox 2 נבנה ופרוס. הוא צורך שני שדות שהמפרט המקורי לא הגדיר,
ובלעדיהם ה־Workflow לא ישלים את המעגל.

### א. `Detect Record Type` חייב לכתוב `parsed_payload.record_type`

```json
{ "record_type": "organization" }
```

ערכים תקינים: **`"organization"` או `"person"` בלבד**.

* אין עמודה ייעודית — הערך נכנס ל־`parsed_payload` (jsonb קיים). אין שינוי Schema.
* **ערך חסר, `null` או כל מחרוזת אחרת אינם מתפרשים כאדם.** רשומה ללא התאמה וללא סיווג
  תקין נעצרת במסך במצב "סוג הרשומה לא נקבע" ודורשת הכרעה ידנית לפני יצירה.
* כל עוד זה לא מיושם, **כל רשומה חדשה ללא התאמה תדרוש קליק הכרעה ידני**.

### ב. `Upsert Google Link` חייב לתמוך בשתי הישויות

מסך האישור יודע ליצור ולעדכן גם **ארגונים** (`accounts`), ולא רק אנשי קשר.
המפתח לשני המקרים זהה: `(google_account_key, google_resource_name)`.

| מה אושר במסך | `contact_id` | `account_id` |
|---|---|---|
| אדם (מיזוג או יצירה) | מלא | **`null`** |
| ארגון (מיזוג או יצירה) | **`null`** | מלא |

ניתן לזהות מה אושר מתוך `inbox_merge_actions.target_type` (`'contact'` / `'account'`)
ו־`target_id`, או מ־`inbox_v2.match_contact` / `match_account` לאחר האישור.

**בלי הענף השני, לרשומת ארגון אין מסלול חזרה לאותה רשומת Google** — הקישור לא נוצר
וה־outbound לעולם לא ימצא אותה.

### ג. `action_type = 3` ("יצירת ארגון") נמצא בשימוש פעיל

המפרט המקורי סימן אותו כלא בשימוש. זה כבר לא נכון.

---

## המשימה

צור Workflow חדש בשם:

`GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation`

עבוד אך ורק לפי מסמך ה־SSOT המצורף. אין לשלב FIX, Fillout או Facebook ישיר.

## כללי עצירה

- אין ללחוץ Publish.
- אין להפעיל Activate.
- אין להריץ Full Sync.
- אין לכתוב ל־`contact` מתוך Google inbound.
- אין ליצור אנשי קשר, תפקידים או ערים אוטומטית.
- אין למחוק נתונים.
- עצור כאשר ה־Workflow בנוי, שמור כ־Draft והחזר דוח מפורט.

## Credentials נדרשים

1. `Google Contacts — Doctors`
2. `Google Contacts — Workers`
3. `Google Contacts — Dental Managers Orgs`
4. `Supabase AllDent Server` — קיים; אין להציג או לשנות את המפתח.

כל Google credential חייב Scope של Contacts לקריאה ולעדכון.

## Triggers

### 1. Schedule Trigger — 6 Daily Runs

- Timezone: `Asia/Jerusalem`
- Cron: `0 8,10,12,14,16,18 * * *`

### 2. Manual Trigger — Sync Now Before Campaign

שני ה־Triggers מתחברים לאותו Node פתיחה.

## שם המפתחות לשלושת החשבונות

- `google_doctors`
- `google_workers`
- `google_dental_managers_orgs`

## People API

השתמש ב־HTTP Request עם Google OAuth credential המתאים לכל חשבון, כדי לתמוך במפורש ב־`syncToken` וב־pagination.

Endpoint:

`GET https://people.googleapis.com/v1/people/me/connections`

Query parameters קבועים:

- `pageSize=1000`
- `requestSyncToken=true`
- `personFields=names,emailAddresses,phoneNumbers,organizations,metadata`
- `sources=READ_SOURCE_TYPE_CONTACT`

בהרצה אינקרמנטלית הוסף `syncToken`. בעת pagination הוסף `pageToken` ושמור את כל שאר הפרמטרים זהים.

ב־`EXPIRED_SYNC_TOKEN` בצע Full Sync רק לחשבון שנכשל; בשלב הבנייה הנוכחי אל תריץ אותו.

## מבנה ה־Workflow

1. `Start Sync Run`
2. `Load Last Successful Cursors`
3. `Set Account — Doctors`
4. `People API — Doctors`
5. `Process Doctors Pages`
6. `Set Account — Workers`
7. `People API — Workers`
8. `Process Workers Pages`
9. `Set Account — Dental Managers Orgs`
10. `People API — Dental Managers Orgs`
11. `Process Third Account Pages`
12. `Canonicalize Google Record`
13. `Deduplicate Within Record`
14. `Detect Record Type`
15. `Detect Role RPC`
16. `Resolve City RPC`
17. `Find Existing Google Link`
18. `Find Contact Candidates`
19. `Compare Selected Fields Only`
20. `Memory Gate`
21. `IF — No Difference`
22. `Upsert Google Link Metadata`
23. `IF — Needs Review`
24. `Upsert inbox_v2`
25. `Load Supabase Outbound Changes`
26. `Route By Google Account Key`
27. `Update Google Contact — Same Resource`
28. `Update Google Link Metadata After Write`
29. `Finish Sync Run`
30. `Log Sync Error`
31. `Mark Sync Run Partial/Failed`

## Canonicalize Google Record

החזר לכל פריט JSON במבנה:

```json
{
  "google_account_key": "google_workers",
  "google_resource_name": "people/...",
  "etag": "...",
  "is_deleted": false,
  "display_name": "...",
  "phone": "...",
  "phone_norm": "...",
  "second_phone": "...",
  "second_phone_norm": "...",
  "email": "...",
  "second_email": "...",
  "role_text_raw": "...",
  "role_source_field": "familyName",
  "city_text_raw": "...",
  "city_source_field": "familyName",
  "facebook_name": "...",
  "facebook_id": "...",
  "facebook_url": "...",
  "raw_payload": {},
  "payload_hash": "..."
}
```

### ניידים

- שלח כל נייד ל־RPC `normalize_il_mobile_phone`.
- אם נייד 1 ונייד 2 מתנרמלים לאותו ערך, אפס את השני.
- מספר שאינו נייד ישראלי תקין אינו משמש להתאמה; שמור אותו ב־raw בלבד.

### מיילים

- הסר כל whitespace לרבות zero-width.
- lowercase.
- אם מייל 1 ומייל 2 זהים, אפס את השני.

### Facebook

מתוך Organization Name/Title/Department:

- URL → `facebook_url`
- מספר בלבד → `facebook_id`
- טקסט אחר → `facebook_name`, אם עדיין ריק

## פענוח לפי חשבון

### Doctors

- `givenName` → `display_name`
- התמחות בסוגריים → `role_text_raw`
- אם אין התמחות אך זו רשומת רופא → "רופא שיניים"
- `familyName` → `city_text_raw`
- `middleName` רק fallback מאושר

### Workers

- `givenName` → `display_name`
- `familyName` → טקסט תפקיד+עיר
- שלח את הטקסט ל־`detect_role_from_text()`
- השתמש ב־`matched_alias` להסרת התפקיד; השארית היא עיר

### Third account

- קבע אדם או ארגון לפני פענוח תפקיד.
- ארגון אינו מקבל `contact.role="ארגון"`.

## RPCs

### Normalize Phone

`POST /rest/v1/rpc/normalize_il_mobile_phone`

Body:

```json
{"input_phone":"{$json.phone}"}
```

### Detect Role

`POST /rest/v1/rpc/detect_role_from_text`

Body:

```json
{"p_text":"{$json.role_text_raw}"}
```

- אין תוצאה: `unknown_role`.
- אין יצירת תפקיד חדש.
- `מועמדת` ו־`דנטל` חייבים לחזור כ־`עובד/ת דנטלי`.

### Resolve City

`POST /rest/v1/rpc/resolve_city`

Body:

```json
{"input_city":"{$json.city_text_raw}"}
```

השתמש ב־`city_id` ו־`region_id` שהוחזרו. אין מפת ערים בתוך Code node.

## מפתח קבוע וזיכרון

`source_unique_key`:

`google:<google_account_key>:<google_resource_name>`

לפני Upsert Inbox:

1. חפש רשומה קיימת לפי המפתח.
2. קרא `merge_status` ואת `parsed_payload.google_payload_hash`.
3. סטטוס 7/8/9 + hash זהה → Skip.
4. hash השתנה → עדכן אותה רשומה, `merge_status=5`, אל תיצור חדשה.

## השוואת שדות בלבד

השווה רק:

- `display_name`
- `phone`/`phone_norm`
- `second_phone`
- `email`
- `second_email`
- `role`
- `city_id`
- `facebook_name`
- `facebook_id`
- `facebook_url`

אל תשווה ואל תעדכן:

- `first_name`
- `last_name`
- `full_name`
- `license_no`
- `region_id` כערך עצמאי

## Upsert inbox_v2

Endpoint:

`POST /rest/v1/inbox_v2?on_conflict=source_unique_key`

Headers:

- `Prefer: resolution=merge-duplicates,return=representation`

מפה:

- `source_type=5`
- `source_name=google_account_key`
- `source_unique_key`
- `display_name`
- `phone`
- `phone_norm`
- `second_phone`
- `email`
- `second_email`
- `facebook_name`
- `facebook_id`
- `facebook_url`
- `temp_role=role_id`
- `temp_city_id=city_id`
- `temp_region_id=region_id`
- `match_contact`
- `match_reason`
- `has_new_information=true`
- `merge_status=5`
- `raw_payload`
- `parsed_payload` כולל `google_payload_hash`, מקורות השדות ותוצאת הנרמול
- `suggested_updates` רק לשדות שונים
- `last_seen_at=now()`

## No Difference

- אין Upsert ל־Inbox.
- Upsert ל־`google_contact_links` בלבד.
- שמור account key, resource name, etag, payload hash, last synced, raw payload וקישור entity אם ודאי.

## Outbound Supabase → Google

שלוף רק `contact` מקושר שה־`updated_timestamp` שלו מאוחר מה־cursor האחרון.

לכל `google_contact_links.is_active=true`:

- השתמש ב־credential המתאים ל־`google_account_key`.
- עדכן את אותו `google_resource_name`.
- השתמש ב־etag הנוכחי.
- אל תעביר בין חשבונות ואל תיצור רשומה חדשה אם יש קישור.
- שמור Alias תפקיד קיים אם הוא עדיין ממפה לאותו role_id.
- Workers: כתוב role label + city אל familyName.
- Doctors: כתוב city אל familyName ושמור את מיקום התפקיד הקיים; אל תבנה מחדש את שם האדם ללא צורך.
- אל תכתוב region כשדה נפרד.
- אל תכתוב license number.

לאחר כתיבה, עדכן `google_contact_links.etag`, `payload_hash`, `last_synced_at`, `raw_payload`.

## מחיקה

אם `metadata.deleted=true`:

- עדכן `google_contact_links.is_active=false`.
- אל תמחק `contact` או `accounts`.

## Audit

`integration_sync_runs.status` משתמש רק ב:

- running
- success
- partial
- failed
- skipped

`cursor_before` ו־`cursor_after` הם JSON לפי שלושת החשבונות.

כל שגיאת רשומה נרשמת ב־`integration_sync_errors` עם `sync_run_id`, `source_record_key`, `error_type`, `error_message`, `raw_payload`.

## דוח חובה בסיום הבנייה

החזר:

1. שם ו־ID של ה־Workflow.
2. מספר Nodes.
3. רשימת Nodes מדויקת.
4. איזה credential מחובר לכל זרוע.
5. ה־cron וה־timezone.
6. מבנה cursor_before/cursor_after.
7. מיפוי inbound ו־outbound לכל חשבון.
8. אישור שכל השדות הלא־נבחרים אינם מעודכנים.
9. אישור שאין Publish/Activate/Execution.
10. רשימת חסמים שנותרו לפני Test.
