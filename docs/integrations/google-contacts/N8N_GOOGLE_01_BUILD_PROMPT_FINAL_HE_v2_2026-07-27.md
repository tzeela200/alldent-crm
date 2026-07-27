# הוראת בנייה סופית ל־n8n — GOOGLE-01

**גרסה:** 2.0  
**תאריך:** 27.07.2026  
**מסמך מקור אמת:** `AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.md`  

## המשימה

צור Workflow חדש בשם:

`GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation`

ה־Workflow מטפל רק בשלושת חשבונות Google Contacts, Supabase ו־Inbox 2. אין לשלב שום Node, Webhook, שדה או טבלה של FIX Digital.

## מצב קיים שחייב להישמר

- Supabase מוכן; אין Migration.
- `inbox_v2.second_phone`, `second_email` ו־UNIQUE על `source_unique_key` קיימים.
- `google_contact_links` תומכת ב־`contact_id` או `account_id`, בדיוק אחד מהם.
- `INC-3115` נבנה בקוד AllDent לפי דוח הביצוע, אך לא לבצע בו שינוי מתוך n8n.
- `מועמדת` ו־`דנטל` מזוהים ב־`detect_role_from_text()` כ־`role_id=14`.

## כללי עצירה מחייבים

- אין Execute.
- אין Full Sync.
- אין Publish.
- אין Activate.
- אין כתיבה ל־Google.
- אין כתיבת נתוני בדיקה ל־Supabase.
- אין שינוי Schema, RLS, RPC, Trigger או Dictionary.
- אין יצירת אדם או ארגון אוטומטית.
- אין כתיבה ישירה ל־`contact` או `accounts` במסלול inbound.
- עצור לאחר בניית Draft והחזר דוח.

## Credentials

1. `Google Contacts — Doctors`.
2. `Google Contacts — Workers`.
3. `Google Contacts — Dental Managers Orgs`.
4. `Supabase AllDent Server` — קיים; אל תציג או תשנה את הסוד.

Google credentials צריכים Contacts read/write scope. בדוח כתוב רק שם credential, לא token.

## Triggers

### Schedule

- Timezone: `Asia/Jerusalem`.
- Cron: `0 8,10,12,14,16,18 * * *`.

### Manual

`Manual Trigger — Sync Now Before Campaign`.

שני ה־Triggers נכנסים לאותו Config/Start.

## Config

הגדר ללא secrets גלויים:

```json
{
  "workflow_name": "GOOGLE-01 — Google Contacts ↔ Supabase Reconciliation",
  "supabase_rest_url": "https://urcdxdcyiedbdwegcebq.supabase.co/rest/v1",
  "source_type": 5,
  "timezone": "Asia/Jerusalem",
  "account_keys": [
    "google_doctors",
    "google_workers",
    "google_dental_managers_orgs"
  ]
}
```

## מבנה Nodes מחייב

1. `Schedule Trigger — 6 Daily Runs`.
2. `Manual Trigger — Sync Now Before Campaign`.
3. `Config`.
4. `Start Sync Run`.
5. `Attach Sync Context`.
6. `Load Last Successful Cursors`.
7. `Set Account — Doctors`.
8. `People API — Doctors`.
9. `Process Doctors Pagination`.
10. `Set Account — Workers`.
11. `People API — Workers`.
12. `Process Workers Pagination`.
13. `Set Account — Dental Managers Orgs`.
14. `People API — Dental Managers Orgs`.
15. `Process Managers Orgs Pagination`.
16. `Canonicalize Google Record`.
17. `Deduplicate Within Record`.
18. `Detect Record Type`.
19. `Detect Role RPC`.
20. `Resolve City RPC`.
21. `Find Existing Google Link`.
22. `Find Contact Candidates`.
23. `Find Account Candidates`.
24. `Resolve Match State`.
25. `Compare Selected Fields Only`.
26. `Memory Gate`.
27. `IF — No Business Difference`.
28. `Upsert Google Link Metadata Only`.
29. `IF — Needs Review`.
30. `Upsert inbox_v2`.
31. `Load Approved Google Inbox Decisions`.
32. `Resolve Approved Target Entity`.
33. `Upsert Link From Approved Decision`.
34. `Load Supabase Outbound Changes`.
35. `Route By Google Account Key`.
36. `Build Google Update Payload`.
37. `Update Same Google Resource`.
38. `Update Link Metadata After Write`.
39. `Save Successful Cursors`.
40. `Finish Sync Run`.
41. `Log Sync Error`.
42. `Mark Sync Run Partial/Failed`.
43. `Respond/End` אם נדרש לסיום ידני; אין Webhook.

מותר לפצל Nodes טכניים, אך אסור להשמיט שלב לוגי.

## People API

Endpoint:

`GET https://people.googleapis.com/v1/people/me/connections`

Parameters קבועים בכל דף:

- `pageSize=1000`.
- `requestSyncToken=true`.
- `personFields=names,emailAddresses,phoneNumbers,organizations,metadata`.
- `sources=READ_SOURCE_TYPE_CONTACT`.
- `syncToken` רק כאשר קיים cursor לחשבון.
- `pageToken` בזמן pagination.

שמור `nextSyncToken` רק לאחר שסיימת את כל הדפים של החשבון בהצלחה.

ב־`EXPIRED_SYNC_TOKEN`, סמן Full Sync נדרש רק לחשבון שנכשל. בשלב Draft אל תריץ אותו.

## Canonical record

החזר לכל רשומה:

```json
{
  "google_account_key": "google_workers",
  "google_resource_name": "people/abc",
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
  "role_id": null,
  "role_name": null,
  "matched_role_alias": null,
  "city_text_raw": "...",
  "city_id": null,
  "region_id": null,
  "facebook_name": "...",
  "facebook_id": "...",
  "facebook_url": "...",
  "record_type": null,
  "raw_payload": {},
  "payload_hash": "...",
  "source_unique_key": "google:google_workers:people/abc"
}
```

`payload_hash` מחושב SHA-256 על אובייקט עסקי קנוני, אחרי נרמול ובסדר מפתחות קבוע. אל תכלול etag, timestamps, page/sync token או raw metadata.

## פענוח שלושת החשבונות

### Doctors

- `givenName` → `display_name`.
- התמחות בסוגריים → `role_text_raw`.
- רופא ללא התמחות → תפקיד רופא שיניים לפי המילון.
- `familyName` → `city_text_raw`.
- `middleName` fallback בלבד.

### Workers

- `givenName` → `display_name`.
- `familyName` → תפקיד+עיר.
- RPC `detect_role_from_text`.
- הסר את `matched_alias` בלבד; השארית → עיר.

### Dental Managers Orgs

קבע סוג לפני בחירת מסלול:

- Role alias מקצועי ודאי → `person`.
- Organization keyword/alias ודאי ללא אות סותר → `organization`.
- סתירה או חוסר ודאות → `record_type=null`.

כתוב ל־`parsed_payload.record_type` רק `person` או `organization`. אין fallback ל־person.

## RPCs

### Phone

`POST /rpc/normalize_il_mobile_phone`

```json
{"input_phone":"{{$json.phone}}"}
```

- אדם: רק תוצאה קנונית תקינה יכולה להיכתב ל־phone/second_phone.
- ארגון: קווי/077 נשמרים כערך נקי, גם כאשר phone_norm NULL.

### Role

`POST /rpc/detect_role_from_text`

```json
{"p_text":"{{$json.role_text_raw}}"}
```

- אין תוצאה → role_id NULL.
- אין יצירת role.
- `מועמדת`/`דנטל` חייבים לחזור 14.
- תפקיד קיים מדויק יותר אינו מוחלף אוטומטית ב־14.

### City

`POST /rpc/resolve_city`

```json
{"input_city":"{{$json.city_text_raw}}"}
```

אין מפת ערים בקוד. אין יצירת עיר. `region_id` נשמר לצורכי Audit/Inbox בלבד; ה־DB גוזר אותו מהעיר בעת עדכון הישות.

## Deduplicate

- phone1/phone2 זהים אחרי נרמול/ניקוי → second null.
- email1/email2 זהים אחרי ניקוי → second null.
- השווה כל incoming phone/email מול שני שדות היעד.
- ערך שנמצא באחד מהם הוא `same`, לא שינוי ולא Inbox.

## Facebook

מתוך organizations:

- URL → `facebook_url`.
- digits only → `facebook_id`.
- text → `facebook_name`.

`facebook_id` נשאר string ב־n8n. אין Number/parseInt בשום מסלול.

## Match state

חפש קודם link לפי account+resource.

לאחר מכן חפש candidates בשדות המאושרים בלבד.

החזר אחד מ:

- `merge_contact`.
- `merge_account`.
- `match_conflict` — גם contact וגם account.
- `create_contact` — אין match ו־record_type=person.
- `create_account` — אין match ו־record_type=organization.
- `unclassified` — אין match וסוג חסר/לא תקין.

אין שימוש ב־merge_status כדי לקבוע entity.

## Compare selected fields

### Contact

`display_name`, `phone`, `second_phone`, `email`, `second_email`, `role`, `city_id`, `facebook_name`, `facebook_id`, `facebook_url`.

### Account

`account_name`, `phone`, `second_phone`, `email`, `second_email`, `city_id`, `facebook_name`, `facebook_id`, `facebook_url`.

אסור לכלול `first_name`, `last_name`, `full_name`, `license_no`, `region_id` עצמאי, account_status או שדות תפעוליים.

## Memory Gate

חפש `inbox_v2` לפי `source_unique_key`.

- merge_status 7/8/9 + אותו `parsed_payload.google_payload_hash` → skip; אל תיגע בשורה.
- hash שונה → upsert אותה שורה ו־merge_status=5.
- אל תמחק שורות.

## Upsert Inbox

Endpoint:

`POST /inbox_v2?on_conflict=source_unique_key`

Header:

`Prefer: resolution=merge-duplicates,return=representation`

Body חייב לכלול:

```json
{
  "source_type": 5,
  "source_name": "google_workers",
  "source_unique_key": "google:google_workers:people/abc",
  "display_name": "...",
  "phone": "...",
  "phone_norm": "...",
  "second_phone": "...",
  "email": "...",
  "second_email": "...",
  "facebook_name": "...",
  "facebook_id": "...",
  "facebook_url": "...",
  "temp_role": 14,
  "temp_city_id": 123,
  "temp_region_id": 5,
  "match_contact": null,
  "match_account": null,
  "match_reason": "unclassified",
  "has_new_information": true,
  "merge_status": 5,
  "raw_payload": {},
  "parsed_payload": {
    "record_type": "person",
    "google_account_key": "google_workers",
    "google_resource_name": "people/abc",
    "google_payload_hash": "...",
    "etag": "...",
    "field_sources": {},
    "normalization": {},
    "role_detection": {},
    "city_resolution": {}
  },
  "suggested_updates": {},
  "last_seen_at": "{{$now.toISO()}}"
}
```

כאשר record_type לא ידוע, אל תכתוב `person`; השאר null/ללא key והשתמש ב־match_reason `unclassified`.

## Approved decisions

שלוף שורות Google עם:

- `source_type=5`.
- `merge_status=6`.
- source_unique_key מתחיל `google:`.

לכל שורה:

- match_contact בלבד → upsert link עם contact_id ו־account_id null.
- match_account בלבד → upsert link עם account_id ו־contact_id null.
- שניהם/אף אחד → error; אל תכתוב link.

Upsert link לפי `on_conflict=google_account_key,google_resource_name`.

לאחר link, טען את הישות ועדכן את אותה רשומת Google עם credential מתאים. אין יצירת resource חדש.

## No business difference

- אין Inbox.
- אם link קיים: עדכן etag/payload_hash/last_synced_at/raw_payload בלבד.
- אם אין link ואין entity ודאי: אין ליצור link ריק; route review/unclassified.

## Outbound

טען contact/accounts מקושרים שהשתנו אחרי outbound cursor.

- update same resource.
- preserve unselected fields.
- credential by account key.
- use etag.
- role+city to familyName only per account structure.
- no region/license/name splitting.
- account has no role.

לאחר write, עדכן link metadata.

## Deletion

metadata.deleted=true → set link is_active=false. אין מחיקת entity ואין Inbox רק עקב מחיקה.

## Cursors

`cursor_before`/`cursor_after`:

```json
{
  "google_doctors": {"sync_token":"..."},
  "google_workers": {"sync_token":"..."},
  "google_dental_managers_orgs": {"sync_token":"..."},
  "outbound_since":"..."
}
```

שמור token חדש רק לחשבון שהושלם. status partial אם חלק הצליח.

## Audit and errors

Start run ב־`integration_sync_runs` עם status running ו־Prefer return=representation.

`Attach Sync Context` חייב לזרוק שגיאה אם אין sync_run_id.

כל HTTP/Google node משתמש `Continue Using Error Output`.

אחרי sync_run_id:

`Log Sync Error → Mark Partial/Failed → continue/end`.

Statuses מותרים בלבד: running/success/partial/failed/skipped.

## דוח חובה בסיום Draft

החזר:

1. Workflow name + ID.
2. active=false ואישור שלא הופעל.
3. מספר Nodes ושמות מדויקים.
4. connections graph לפי מסלול.
5. credential name לכל זרוע.
6. cron/timezone.
7. People API params.
8. cursor schema.
9. canonical JSON.
10. record type logic.
11. person/account field maps.
12. match states כולל unclassified/conflict.
13. Memory Gate.
14. approved decision/link contract.
15. outbound behavior.
16. error paths.
17. אישור שלא בוצעו Execute/Publish/Activate/DB test writes.
18. רשימת חסמים לפני test.

אין להתחיל Test ללא אישור חדש.
