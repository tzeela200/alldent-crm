# אינטגרציית Google Contacts ↔ Supabase

תיקייה זו שומרת את חבילת מקור-האמת של סנכרון שלושת חשבונות Google Contacts מול Supabase.
המקור: `AllDent_Google_Supabase_Approval_Package_2026-07-26_2312.zip` (26.07.2026, 23:12 — Asia/Jerusalem).

## הקבצים

| קובץ | מה זה |
|---|---|
| [google-contacts-supabase-ssot.md](google-contacts-supabase-ssot.md) | מקור האמת המלא: שדות, נרמול, התאמה, זיכרון החלטות, שעות הרצה |
| [n8n-GOOGLE-01-update-prompt.md](n8n-GOOGLE-01-update-prompt.md) | הוראת הביצוע ל-Workflow `GOOGLE-01` ב-n8n |
| [sql/google-01-preflight.sql](sql/google-01-preflight.sql) | תוספת `second_phone`/`second_email` ל-`inbox_v2` — **כבר הורץ** |

קובץ ה-`.docx` שבחבילה המקורית לא הועתק — תוכנו זהה ל-`.md`.

## סטטוס ביצוע לפי סעיף 21 במסמך ה-SSOT

| דרישה | סטטוס |
|---|---|
| Supabase — `inbox_v2.second_phone` + `second_email` | ✅ **בוצע.** אומת חי 27.07.2026 |
| קוד AllDent — רכיב האישור של Inbox 2 לעשרת השדות | ✅ **בוצע ב-INC-3115** (27.07.2026) |
| n8n — בניית/עדכון `GOOGLE-01` | ❌ **טרם בוצע.** משימה נפרדת |

## חלוקת האחריות

```text
Google Contacts
   ↓
n8n (GOOGLE-01) — מבינה את מבנה Google, מפרקת שם/תפקיד/עיר, מנרמלת, מסווגת אדם/ארגון
   ↓
inbox_v2 — מקבלת שדות מוכנים
   ↓
מסך /admin/inbox-v2 — מציג השוואה ומאפשר לאשר או לדחות
   ↓
contact / accounts
   ↓
n8n — upsert ל-google_contact_links והחזרה לאותה רשומת Google
```

**המסך אינו מנתח Google, אינו מפצל שמות, אינו מזהה תפקיד/עיר/סוג רשומה, ואינו קורא ל-Google או ל-n8n.**
הוא צורך את מה ש-n8n כתבה ל-`inbox_v2` ומחזיר החלטה מאושרת.

## החלטות 27.07.2026 שנוספו מעל מסמך ה-SSOT

שתי החלטות מאוחרות שגוברות על נוסח המסמך המקורי, ושתיהן **דורשות עדכון מקביל ב-`GOOGLE-01`**:

### 1. השער תומך גם בארגונים

מסמך ה-SSOT (סעיף 5.3) ו-`docs/inbox-v2-ssot.md` קבעו שמיזוג ויצירת `accounts` לא ייבנו.
**ההחלטה הוחלפה:** מסך Inbox 2 יודע גם למזג לארגון קיים וגם ליצור ארגון חדש,
ו-`dict_inbox_action_types.id = 3` ("יצירת ארגון") בשימוש פעיל.

### 2. `parsed_payload.record_type` — תוספת מחייבת לחוזה

n8n חייבת לכתוב בשלב `Detect Record Type`:

```json
{ "record_type": "organization" }   // או "person"
```

* אין עמודה ייעודית ב-`inbox_v2` — הערך יושב ב-`parsed_payload` (jsonb קיים). **אין שינוי Schema.**
* **ערך חסר או לא תקין אינו מתפרש כאדם.** רשומה ללא התאמה וללא סיווג תקין נעצרת במסך
  במצב "סוג הרשומה לא נקבע" ודורשת הכרעה ידנית לפני יצירה.
* כל עוד `GOOGLE-01` לא מיישמת את זה, כל רשומה חדשה ללא התאמה תדרוש קליק הכרעה.

### 3. `google_contact_links` חייבת לתמוך בשתי הישויות

המפתח בשני המקרים הוא `(google_account_key, google_resource_name)`:

| אושר במסך | `contact_id` | `account_id` |
|---|---|---|
| אדם | מלא | `null` |
| ארגון | `null` | מלא |

בלי הענף השני, לרשומת ארגון אין מסלול חזרה לאותה רשומת Google וה-outbound לעולם לא ימצא אותה.

## מה המסך מבטיח (INC-3115)

* עשרה שדות מאושרים לאיש קשר, תשעה לארגון. **`full_name` / `first_name` / `last_name` / `region_id` /
  `license_no` לא נכתבים לעולם** — נאכף ב-whitelist סגורה ב-`src/lib/inbox-v2-merge.ts`.
* ברירת המחדל בכל שדה היא "דלג". דריסת ערך קיים דורשת אישור מפורש נוסף.
* אין ניתוב אוטומטי כשיש גם `match_contact` וגם `match_account` — נדרשת הכרעה.
* `merge_status = 3` אינו נקרא בשום מקום בקוד הרכיב (ה-RPC כותב 3 גם להתאמת ארגון בלבד).
* החלטות "נדחה / התעלמות / לא דנטלי" נשמרות בסטטוס ולא מוחקות את השורה,
  כדי ש-`source_unique_key` ישרוד וישמש כזיכרון ל-`Memory Gate`.
