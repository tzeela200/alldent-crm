# אימות פרומפט הביצוע ל-`GOOGLE-01` — 02.08.2026

מאמת את `GOOGLE-01_FINAL_EXECUTION_PROMPT_2026-08-02_v2.md` מול **Supabase החי**
(פרויקט `urcdxdcyiedbdwegcebq`), בקריאה בלבד.

נבדקו רק הטענות שהפרומפט מורה ל-n8n להסתמך עליהן בפועל — שמות פונקציות, שמות עמודות,
אילוצים וערכי מילון. **טענות על מצב ה-Workflow ב-n8n (30 Nodes, 8 Code Nodes שבורים,
ID `YDyYoFJHXYD1re2D`) לא נבדקו — אין גישה ל-n8n מכאן.**

## ✅ אומת ונמצא מדויק

### חתימות RPC — תואמות לתו

| הפרומפט | בפועל |
|---|---|
| `normalize_il_mobile_phone(input_phone text)` | ✅ מחזירה `text` |
| `detect_role_from_text(p_text text)` | ✅ מחזירה `TABLE(role_id, role_name, matched_alias, confidence, priority)` |
| `resolve_city(input_city text)` | ✅ מחזירה `TABLE(city_id, city_name, normalized_city_name, region_id, region_name, locality_type, match_type)` |

`detect_role_from_text` אכן מחזירה `matched_alias` — הבסיס לכלל "הסר רק את המופע המדויק"
של Workers (שלב ד/2). `resolve_city` מחזירה גם `region_id`, כנדרש ל-`temp_region_id`.

### אילוצים ושמות עמודות

- `google_contact_links_one_entity_chk :: CHECK (num_nonnulls(contact_id, account_id) = 1)` ✅
- `google_contact_links_account_resource_key :: UNIQUE (google_account_key, google_resource_name)` ✅
- `inbox_v2.source_unique_key` — UNIQUE ✅
- `contact.contact_id` · `contact.role` · `accounts.account_id` · `accounts.account_name` ✅
- `contact.updated_timestamp` · `accounts.updated_timestamp` ✅
- `accounts.account_status` default `10` ✅

### `dict_role_aliases`

העמודה `notes` קיימת, ו-`notes='canonical'` הוא ערך אמיתי בשימוש ✅

| Alias | role_id | הערה ב-DB |
|---|---|---|
| `מועמדת` | 14 | *"map to עובד/ת דנטלי unless a more specific alias wins"* |
| `דנטל` | 14 | *"map to עובד/ת דנטלי unless a more specific alias wins"* |

כלל ה-no-downgrade **כבר מקודד בנתונים עצמם**, לא רק במסמכים.

Aliases ההתמחות בשלב ד/1 — **כל השבעה נכונים**:
`אורתו`→2 · `פריו`→3 · `אנדו`→4 · `כירורג`→5 · `פדו`→6 · `רפואת הפה`→7 · `שיקום`→8

---

## ⚠️ פער אחד שנמצא — שני תפקידים ללא Alias קנוני

שלב ד/2 (Workers Outbound) מורה:

> "החלף רק את Alias התפקיד הישן... ב-Alias הקנוני של התפקיד החדש מתוך `dict_role_aliases`
> שבו `notes='canonical'`"

בפועל: **16 תפקידים** מתוך **18** מחזיקים Alias קנוני. שניים חסרים:

| role_id | שם |
|---|---|
| 15 | מכירות |
| 16 | בעלים |

**המשמעות:** אם תאושר רשומת Workers שתפקידה 15 או 16, ה-lookup יחזיר ריק ו-n8n
תכתוב `undefined` ל-`familyName` של Google או תיפול — **תלוי איך נכתב הקוד**.

**מה נדרש:** הפרומפט חייב להורות ל-n8n **לא לכתוב** כאשר אין Alias קנוני, אלא לרשום
`integration_sync_errors` ולהשאיר את `familyName` ללא שינוי. זו התנהגות בטוחה שתואמת
את הכלל הקיים בשלב ד/3: *"אם לא ניתן לקבוע את שדה המקור בביטחון, אל תכתוב את השדה;
רשום שגיאת outbound ברמת הרשומה."*

לחלופין — להוסיף Alias קנוני לשני התפקידים. **זה שינוי Dictionary ב-Supabase ודורש
אישור נפרד; לא בוצע.**

בפועל הסיכון נמוך: "מכירות" ו"בעלים" אינם תפקידים אופייניים לחשבון העובדים. אבל
מספיק רשומה אחת כדי לפגוע ברשומת Google אמיתית.

---

## מצב קוד AllDent שהפרומפט מצטט (שורות 44–58) — נכון

| טענה בפרומפט | מצב |
|---|---|
| `d9ef08b`, `7b728f4` על `origin/main` | ✅ אומת |
| תיקוני השער ב-`11be1ad` | ✅ נדחף |
| 23/23 ו-Build ירוק | ✅ |
| no-downgrade נאכף במסך | ✅ `GENERIC_ROLE_ID` ב-`src/lib/inbox-v2-merge.ts` |
| `match_conflict` מותיר יעד אחד | ✅ `MergePanel.handleMerge` |
| אימות ויזואלי/E2E | ❌ טרם — נכון |
| `account_type` ידני ואופציונלי, לא מסונכרן | ✅ תואם למימוש |
