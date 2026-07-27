# אינטגרציית Google Contacts ↔ Supabase

**גרסה פעילה: 2.0 (27.07.2026).** מקור: `AllDent_Google_Supabase_Approval_Package_FINAL_2026-07-27.zip`.

חבילה זו **מחליפה** את חבילת 26.07.2026 23:12 ואת כל נוסחי Google הקודמים.
קבצי v1 הוסרו מהתיקייה כדי שלא יהיה מקור אמת כפול.

> קובץ זה (`README.md`) הוא **אינדקס של ה-repo בלבד** ואינו חלק מהחבילה החתומה.
> נקודת הכניסה הרשמית לקריאה היא [`README_FIRST_HE_2026-07-27.md`](README_FIRST_HE_2026-07-27.md).

## תוכן החבילה

| קובץ | תפקיד |
|---|---|
| [README_FIRST_HE_2026-07-27.md](README_FIRST_HE_2026-07-27.md) | **התחל כאן** — מצב ביצוע וסדר שימוש מחייב |
| [AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.md](AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.md) | מסמך מקור האמת המלא |
| `AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.docx` | אותו SSOT לקריאה ואישור |
| [N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2_2026-07-27.md](N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2_2026-07-27.md) | **הפרומפט המחייב** לבניית `GOOGLE-01` ב-n8n |
| [GOOGLE_01_DATA_CONTRACT_EXAMPLES_2026-07-27.json](GOOGLE_01_DATA_CONTRACT_EXAMPLES_2026-07-27.json) | דוגמאות חוזה לאדם, ארגון, Inbox וקישור |
| [GOOGLE_01_ACCEPTANCE_TEST_PLAN_HE_2026-07-27.md](GOOGLE_01_ACCEPTANCE_TEST_PLAN_HE_2026-07-27.md) | תרחישי בדיקה לפני הפעלה |
| [GOOGLE_01_SUPABASE_READ_ONLY_PREFLIGHT_VERIFIED_2026-07-27.sql](GOOGLE_01_SUPABASE_READ_ONLY_PREFLIGHT_VERIFIED_2026-07-27.sql) | בדיקות Supabase **לקריאה בלבד** — אין DDL |
| [INC_3115_IMPLEMENTATION_STATUS_HE_2026-07-27.md](INC_3115_IMPLEMENTATION_STATUS_HE_2026-07-27.md) | מצב רכיב האישור בקוד AllDent |
| [CHANGELOG_GOOGLE_PACKAGE_v1_to_v2_2026-07-27.md](CHANGELOG_GOOGLE_PACKAGE_v1_to_v2_2026-07-27.md) | 17 השינויים מול v1 |
| [MANIFEST_SHA256.txt](MANIFEST_SHA256.txt) | חתימות SHA-256 |

**הקבצים נשמרו בדיוק כפי שנמסרו, ללא עריכה** — כדי שהמניפסט יישאר בר-אימות:

```bash
cd docs/integrations/google-contacts && sha256sum -c MANIFEST_SHA256.txt
```

אומת ב-27.07.2026: **9/9 OK**.

## ⚠️ עדכון אחד למסמך הסטטוס

`INC_3115_IMPLEMENTATION_STATUS_HE_2026-07-27.md` נכתב לפני שמירת העבודה, ולכן מציין
"לא בוצע commit / לא בוצע push". **זה כבר לא נכון:**

| | מצב עדכני |
|---|---|
| commit | ✅ `d9ef08b` — INC-3115 |
| push | ✅ `main → origin/main` |
| נתוני בדיקה ב-Supabase | ❌ לא הוכנסו (מכוון) |
| אימות ויזואלי / E2E | ❌ טרם בוצע |
| `GOOGLE-01` ב-n8n | ❌ טרם נבנה |

הקובץ עצמו לא נערך — עריכה הייתה שוברת את חתימת ה-SHA-256.

## חלוקת האחריות

```text
Google Contacts
   ↓
n8n (GOOGLE-01) — מפענחת את מבנה Google, מנרמלת, מסווגת אדם/ארגון   ← טרם נבנה
   ↓
inbox_v2 — מקבלת שדות מוכנים
   ↓
/admin/inbox-v2 — משווה ומאפשרת אישור או דחייה                      ← בוצע (INC-3115)
   ↓
contact / accounts
   ↓
n8n — upsert ל-google_contact_links והחזרה לאותה רשומת Google        ← טרם נבנה
```

**המסך אינו מנתח Google, אינו מפצל שמות, אינו מזהה תפקיד/עיר/סוג רשומה, ואינו קורא ל-Google או ל-n8n.**

## שלוש הנקודות שהמסך מחכה להן מ-`GOOGLE-01`

1. **`parsed_payload.record_type`** = `'organization'` / `'person'`. חסר או לא תקין ⇒ הרשומה
   נעצרת כ-`unclassified` ודורשת הכרעה ידנית. אין fallback ל-`person`.
2. **`google_contact_links`** עם **בדיוק אחד** מ-`contact_id` / `account_id`, לפי הישות שאושרה.
   בלי זה אין לארגונים מסלול חזרה ל-Google.
3. **`Memory Gate`** שמכבד `merge_status` 7/8/9 יחד עם `payload_hash` — כדי לא לפתוח מחדש
   החלטות "נדחה / התעלמות / לא דנטלי".

## מה השער מבטיח (INC-3115, commit `d9ef08b`)

* 10 שדות לאיש קשר, 9 לארגון. `full_name` / `first_name` / `last_name` / `region_id` /
  `license_no` **לא נכתבים לעולם** — whitelist סגורה ב-`src/lib/inbox-v2-merge.ts`.
* ברירת מחדל "דלג" בכל שדה; דריסת ערך קיים דורשת אישור מפורש נוסף.
* `merge_status` **לא נקרא** בשום ענף ניתוב (ה-RPC כותב 3 גם להתאמת ארגון בלבד).
* התאמה כפולה (אדם + ארגון) ⇒ `match_conflict`, בחירה מפורשת, בלי ניצחון אוטומטי לאדם.
* `facebook_id` — ספרות בלבד בשתי הישויות, מועבר כמחרוזת (`Number()` מאבד דיוק).
* קו נייח/077 חסום לאיש קשר (הטריגר זורק חריגה), מותר לארגון.
* החלטות סגורות שומרות את השורה ואת `source_unique_key` עבור ה-`Memory Gate`.

SSOT של המסך עצמו: [docs/inbox-v2-ssot.md](../../inbox-v2-ssot.md).
