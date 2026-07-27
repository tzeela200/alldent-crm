# Changelog — חבילת Google v1 → v2

**תאריך:** 27.07.2026  
**גרסת בסיס:** 26.07.2026 23:12  

## שינויים עיקריים

1. `inbox_v2.second_phone` ו־`second_email` אינם עוד "טרם בוצע" — הם קיימים ואומתו.
2. רכיב Inbox 2 אינו עוד "טרם בוצע" — `INC-3115` בוצע לפי דוח, עם 21/21 ו־Build, אך ללא commit/push/E2E.
3. נוסף מסלול ארגון מלא: merge/create/update ל־`accounts`.
4. `parsed_payload.record_type` הוא חוזה מחייב של n8n.
5. בוטל fallback של record_type חסר ל־person; נוסף `unclassified`.
6. בוטלה עדיפות אוטומטית לאדם כאשר קיימת גם התאמת ארגון; נוסף `match_conflict`.
7. `google_contact_links` הורחב מפורשות לארגונים: account_id או contact_id, בדיוק אחד.
8. נוסף שלב n8n לטיפול בהחלטות Inbox מאושרות וליצירת הקישור לאחר אישור.
9. `facebook_id` בארגון נשאר numeric-only אף שהעמודה text.
10. קו נייח/077 חסום לאדם אך מותר לארגון.
11. הובהר ש־`מועמדת` ו־`דנטל` הם role aliases ל־14 במסלול Google, ולא profile type.
12. הובהר כלל no-downgrade מתפקיד מדויק ל־14.
13. נוסף outbound לארגונים, לא רק לאנשי קשר.
14. preflight הוחלף מ־DDL מוצע ל־SQL read-only.
15. הורחבו בדיקות הקבלה ל־record type, conflict, organization link, E2E, tokens ו־audit.
16. סטטוס n8n תוקן: `GOOGLE-01` טרם נבנה בפועל.
17. נוסף איסור מפורש על ערבוב FIX Digital.
