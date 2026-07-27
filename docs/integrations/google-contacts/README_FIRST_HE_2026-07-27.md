# חבילת אישור וביצוע סופית — Google Contacts ↔ Supabase

**מערכת:** AllDent  
**גרסה:** 2.0  
**תאריך:** 27.07.2026  
**סקופ בלעדי:** שלושת חשבונות Google Contacts מול Supabase ו־Inbox 2.  

## מטרת החבילה

חבילה זו מחליפה את `AllDent_Google_Supabase_Approval_Package_2026-07-26_2312` ואת כל נוסחי Google הקודמים. היא מאחדת:

- החלטות העסקיות שאושרו לגבי הסנכרון הדו־כיווני;
- מצב Supabase שאומת חי ב־27.07.2026;
- תיקוני מסלול האדם/הארגון;
- תיקוני `unclassified` ו־`match_conflict`;
- חוזה `google_contact_links` לאדם ולארגון;
- מצב ביצוע רכיב האישור `INC-3115`;
- פרומפט סופי לבניית `GOOGLE-01` ב־n8n;
- בדיקות קבלה לפני הפעלה.

## מצב ביצוע נכון לתאריך החבילה

| רכיב | מצב |
|---|---|
| תשתית Supabase | קיימת ואומתה חי; אין Migration נדרש מתוך חבילה זו |
| `inbox_v2.second_phone` / `second_email` | קיימים |
| `inbox_v2.source_unique_key` | UNIQUE |
| Aliases `מועמדת` ו־`דנטל` | פעילים ומחזירים `role_id=14` — עובד/ת דנטלי |
| רכיב אישור Inbox 2 — `INC-3115` | בוצע לפי דוח Claude Code; Build ירוק ו־21/21 בדיקות לוגיקה עברו |
| Commit / Push של `INC-3115` | לא בוצעו לפי דוח הביצוע שנמסר |
| אימות ויזואלי / E2E של `INC-3115` | טרם בוצע |
| Workflow `GOOGLE-01` ב־n8n | טרם נבנה בפועל |
| חיבור שלושת Google OAuth credentials | טרם בוצע |
| Full Sync / Test Sync | לא בוצעו |
| Publish / Activate | אסורים עד מעבר בדיקות הקבלה ואישור מפורש |

## סדר שימוש מחייב

1. לקרוא את מסמך ה־SSOT ב־DOCX או Markdown.
2. לשמור את עבודת `INC-3115` ב־Git לאחר בדיקת diff, בלי נתוני בדיקה ובלי שינויי Supabase.
3. למסור ל־AI של n8n רק את `N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2_2026-07-27.md` יחד עם ה־SSOT.
4. לבנות את ה־Workflow כטיוטה בלבד. אין Execute, Publish או Activate.
5. לעבור על דוח הבנייה מול `GOOGLE_01_ACCEPTANCE_TEST_PLAN_HE_2026-07-27.md`.
6. לבצע Test מבוקר רק לאחר אישור מפורש של רשומות הבדיקה והכתיבות הצפויות.

## תוכן החבילה

| קובץ | תפקיד |
|---|---|
| `AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.docx` | מסמך מקור אמת מלא לקריאה ואישור |
| `AllDent_Google_Contacts_Supabase_SSOT_FINAL_HE_v2_2026-07-27.md` | אותו SSOT בפורמט טכני |
| `N8N_GOOGLE_01_BUILD_PROMPT_FINAL_HE_v2_2026-07-27.md` | הוראת בנייה מלאה ל־n8n |
| `INC_3115_IMPLEMENTATION_STATUS_HE_2026-07-27.md` | מצב רכיב האישור שכבר בוצע בקוד AllDent |
| `GOOGLE_01_ACCEPTANCE_TEST_PLAN_HE_2026-07-27.md` | תרחישי בדיקה לפני הפעלה |
| `GOOGLE_01_SUPABASE_READ_ONLY_PREFLIGHT_VERIFIED_2026-07-27.sql` | בדיקות Supabase לקריאה בלבד; ללא DDL |
| `GOOGLE_01_DATA_CONTRACT_EXAMPLES_2026-07-27.json` | דוגמאות חוזה נתונים לאדם, ארגון ו־Inbox |
| `CHANGELOG_GOOGLE_PACKAGE_v1_to_v2_2026-07-27.md` | כל השינויים מול חבילת 26.07.2026 |
| `MANIFEST_SHA256.txt` | רשימת קבצים וחתימות SHA-256 |

## כללי בטיחות

- אין קשר לחבילת FIX Digital ואין לערבב Workflows, Webhooks, טבלאות או שדות של FIX.
- אין כתיבה ישירה מ־Google אל `contact` או `accounts` לפני החלטת Inbox, למעט metadata טכני בקישור קיים.
- אין יצירת אדם או ארגון אוטומטית במסלול inbound.
- אין מחיקה של `contact` או `accounts` עקב מחיקה ב־Google.
- אין שינוי Schema, RLS, RPC, Trigger או מילון מתוך n8n.
- אין לחשוף מפתחות, tokens או credentials בדוח.
