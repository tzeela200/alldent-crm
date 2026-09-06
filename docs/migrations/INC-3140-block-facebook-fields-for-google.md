# INC-3140 — חסימת שדות Facebook בהשוואת Google → Inbox

**הורץ ב-Supabase: 06.09.2026** · פרויקט `urcdxdcyiedbdwegcebq`
**אושר:** "מאשרת שינוי Supabase עבור INC-3140 לפי ה-Migration שהוצג."
+ "מאשרת תיקון קוד עבור INC-3140 לפי התוכנית שהוצגה."

> ⚠ המסמך מתעד מיגרציה **שכבר הורצה**. אינו הוכחה למצב החי —
> לאימות יש לשאול את המסד.

## הבעיה

**Google לא מספק נתוני Facebook.** ה-People API מחזיר בדיוק:
`etag · names · metadata · phoneNumbers · resourceName · organizations ·
emailAddresses` — ותו לא.

מה שהגיע אלינו כ"שם Facebook" הוא בפועל שדה ה-**Organization**.
אומת: **92 מתוך 96** השורות שנשאו `facebook_name` החזיקו בדיוק את
`raw_payload.organizations[0].name`; לארבע הנותרות אין ארגון כלל.

השדה אינו אמין — הוא נושא שמות של אנשים אחרים. דוגמאות חיות מהתור,
שבכולן **הערך שאצלנו היה נכון** ואישור היה מוחק אותו:

| הרשומה | אצלנו (תעתיק נכון) | הוצע להחליף ל־ |
|---|---|---|
| קומיל דז'נייב | Komil Djaniyev | `Katya` |
| אנעאם | Inaam | `Esti` |
| אומניאתיק לן תעג'ז אללה | Amniyatik Lan Tajeza Allah | `Ortal Khaimov` |
| ענבל כהן | Inbal Cohen | `Inbar Aesthetics` |
| גפן מנשה | Gefen Menashe | `Diana` |

**29 מתוך 37 השורות הפתוחות בתור היו רק זה** — 78% רעש, ומלכודת
שכל אישור בה הורס מידע תקין.

## מה השתנה

**SQL** — `public.inbox_compute_diff`. נוסף משתנה `v_is_google` ובלוק
אחד מיד אחרי בניית `v_defs`:

```sql
v_is_google := lower(coalesce(v_lead_j->>'source_unique_key','')) LIKE 'google%';

IF v_is_google THEN
  SELECT coalesce(jsonb_agg(d), '[]'::jsonb) INTO v_defs
  FROM jsonb_array_elements(v_defs) d
  WHERE d->>'key' NOT IN ('facebook_name','facebook_id','facebook_url');
END IF;
```

**TS** — `src/lib/inbox-v2-merge.ts`: `isGoogleSourced()` ו-
`isFieldBlockedForSource()`, ו-`buildComparisons` מסננת בעזרתן.

⚠ **שני המראות חייבים להישאר זהים.** אחרת הטבלה תספור פער שהפאנל לא
מציג — בדיוק הסתירה שהמסך סבל ממנה ב-INC-3125.

`google%` תופס גם `google_outbound:` ו-`google_create_missing:`.
מקורות אחרים (ייבוא מפייסבוק אמיתי) אינם מושפעים.

## אימות

| בדיקה | תוצאה |
|---|---|
| שורת Google עם פער Facebook בלבד (345–349, 168) | הפער נעלם · `has_new=false` · `needs_review=false` ⇒ סטטוס 11 ✓ |
| שורה עם פער אמיתי + Facebook (176) | `display_name,facebook_name` ⟵ `display_name` ✓ |
| שורה עם 5 פערים (177) | `city_id,display_name,email` — שלושת האמיתיים שרדו ✓ |
| **נגד**: אותה שורה עם מקור `excel_import` | `facebook_name` חזר להשוואה ✓ |
| **נגד**: שורה בסטטוס 8 ("התעלמות") | נשארה 8 — ההחלטה לא נפתחה מחדש ✓ |

## Rollback

הסרת המשתנה `v_is_google` והבלוק, והסרת המסנן ב-`buildComparisons`.
אין שינוי סכמה להחזיר.

## מה זה לא פותר

**זו חסימת נזק, לא ריפוי.** ההסטה בשדה Organization בצד Google נמשכת,
והשורש הוא במיפוי של GOOGLE-01B (n8n — לא נגענו).

**שורות שכבר בתור** אינן משתנות מעצמן. ניקוי שלהן נעשה בלחיצה על
"נתח מחדש את התור" במסך — ביד המשתמשת, לא נגיעה שלנו בנתוני ייצור.

**123 רשומות** ב-`contact` נושאות ערך Facebook שמשותף עם רשומה אחרת
שאין לה מילה משותפת בשם (91 מ-08.06, 31 מ-11.08). רשימה מלאה נמסרה
למשתמשת. תיקונן דורש אישור תיקון נתונים נפרד, ורצוי אחרי תיקון בגוגל
עצמה — אחרת הסנכרון הבא יחזיר את הערך.
