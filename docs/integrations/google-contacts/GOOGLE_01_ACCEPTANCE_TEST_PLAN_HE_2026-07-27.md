# תוכנית בדיקות קבלה — GOOGLE-01

**תאריך:** 27.07.2026  
**כלל:** אין להפעיל את כל הבדיקות ברצף. כל Test דורש אישור מפורש של הרשומה והכתיבה הצפויה.  

## שלב A — בדיקת Draft ללא הרצה

- Workflow בשם המדויק.
- `active=false`.
- שני Triggers בלבד: Schedule + Manual.
- cron/timezone נכונים.
- שלושה credentials נפרדים.
- אין Node של FIX.
- אין secret גלוי.
- כל HTTP/Google node עם Error Output.
- אין DDL או SQL write לשינוי schema.

## שלב B — בדיקות לוגיקה ללא כתיבת אמת

1. Canonicalization של אדם.
2. Canonicalization של ארגון.
3. payload hash יציב כאשר etag בלבד משתנה.
4. נייד כפול בפורמטים שונים.
5. מייל כפול.
6. `מועמדת אשדוד` → role 14 + city remainder.
7. `דנטל אשדוד` → role 14 + city remainder.
8. Alias מדויק יותר מנצח Alias כללי.
9. role unknown נשאר null.
10. city unknown נשאר null.
11. `record_type` חסר → unclassified.
12. שתי התאמות → match_conflict.
13. Facebook numeric long נשאר string.

## שלב C — Test inbound מבוקר

התחל ברשומה אחת בלבד וב־Test execution, ללא Activate.

### C1. רשומה קיימת וזהה

צפוי:

- sync run אחד.
- אין Inbox חדש.
- metadata link בלבד.
- אין שינוי עסקי.

### C2. פער שדה אחד באדם

צפוי:

- שורת Inbox אחת לפי source_unique_key.
- merge_status 5.
- suggested_updates כולל רק שדה אחד.
- אין שינוי ב־contact.

### C3. ארגון עם קו נייח

צפוי:

- record_type organization.
- קו נשמר ב־Inbox.
- אינו נשלח ל־contact.
- route create_account/merge_account.

### C4. unclassified

צפוי:

- אין create button אוטומטי.
- סיבת כניסה ברורה.

### C5. match conflict

צפוי:

- שני targets מוצגים.
- אין עדיפות אוטומטית.

## שלב D — Memory Gate

1. קבע שורה test כ־8 או 9.
2. הרץ שוב עם אותו hash.
3. ודא שאין שינוי בשורה ואין פתיחה מחדש.
4. שנה שדה עסקי אחד במקור.
5. ודא אותה שורה חוזרת ל־5, ללא duplicate.

## שלב E — אישור ו־link

### אדם

- אשר ב־Inbox.
- ודא `merge_status=6` ו־match_contact.
- הרץ GOOGLE-01.
- ודא link עם contact_id בלבד.
- ודא עדכון אותה Google resource.

### ארגון

- אשר ב־Inbox.
- ודא `merge_status=6` ו־match_account.
- ודא link עם account_id בלבד.
- ודא עדכון אותה Google resource.

## שלב F — Outbound

- שנה שדה אחד ישירות ב־Supabase.
- הרץ ידנית.
- ודא שרק אותו שדה נכתב לאותה רשומת Google.
- ודא שאין רשומה חדשה ואין מעבר חשבון.
- ודא metadata link עודכן.

## שלב G — token, partial ו־error

- סימולציית token expired לחשבון אחד בלבד.
- ודא שהאחרים ממשיכים.
- ודא status partial.
- ודא token חדש נשמר רק לחשבון שהושלם.
- סימולציית שגיאת רשומה; ודא `integration_sync_errors`.

## שלב H — תנאי הפעלה

Publish/Activate מותר רק כאשר:

- כל בדיקות Draft עברו.
- לפחות אדם אחד וארגון אחד עברו E2E.
- Memory Gate עבר.
- outbound עבר.
- מחיקה ב־Google נבדקה ללא מחיקת Supabase.
- audit נבדק.
- התקבל אישור מפורש של צאלה.
