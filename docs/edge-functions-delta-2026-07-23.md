# Edge Functions — Delta מול חבילת Contact 360 (22.07.2026)

**תאריך:** 23.07.2026
**פרויקט Supabase:** `urcdxdcyiedbdwegcebq` (AllDent_CRM_2026)
**סטטוס:** הקוד עודכן **מקומית בלבד**. לא בוצעה פריסה.

חבילת Contact 360 כללה קוד מקור לשתי Edge Functions. הקוד הושווה מול הגרסאות
הפרוסות בפועל לפני כל שינוי. מסמך זה מתעד את ההשוואה ואת מה שהוחלט לאמץ.

---

## מי קורא לכל פונקציה היום

| פונקציה | צרכנים |
|---|---|
| `ai-document-scanner` | `src/components/candidate/AIDocumentScanner.tsx:79` (מסך המועמד, מצב token) · `src/components/contact/CvUploadCard.tsx` (חדש — Contact 360, מצב אדמין) |
| `ai-profile-writer` | `src/components/candidate/AIProfileWriter.tsx:48` (מסך המועמד) · `src/components/contact/CvUploadCard.tsx` (חדש — Contact 360) |

`ai-job-description` אינו חלק מ-Contact 360 ולא נגענו בו.

## Secrets ו-הרשאות

שתי הפונקציות פרוסות עם `verify_jwt: false`, ולכן שכבת ההרשאה היחידה היא
`authorized()` בתוך הקוד: `profile_token` מול טבלת `contact` (מסלול המועמד), או
JWT תקף מול `auth.getUser()` (מסלול האדמין). זה מחייב את ה-Secrets
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` ו-`anthropic_api_key`.

---

## `ai-document-scanner` — פרוס: version 9, ACTIVE

| היבט | גרסה פרוסה | גרסת החבילה | הוכרע |
|---|---|---|---|
| הרשאה | `authorized()` (token או JWT) | **הוסרה לחלוטין** | **נשמרה הפרוסה.** הסרה, יחד עם `verify_jwt:false`, הופכת את הפונקציה ל-proxy פתוח למפתח Anthropic. |
| מודל | `claude-sonnet-5` | `claude-sonnet-4-20250514` | נשמרה הפרוסה |
| PDF | `{type:"image", media_type:"application/pdf"}` — **ה-API דוחה** | `{type:"document", …}` | **אומץ מהחבילה.** זה הפער התפקודי היחיד. |
| תמונות | `type:"image"` | זהה | ללא שינוי |
| `fileName` | לא התקבל | נשלח ומשולב בפרומפט | אומץ (תוספת לא-שוברת) |
| פלט `languages` | `string \| null` | `string[]` | **נשמרה הפרוסה** — ראה "סיכון שנמנע" למטה |
| פרומפט | מרשה `personal_summary` "שיווקי" | אוסר המצאת עובדות | אומץ **רק** סעיף איסור-ההמצאה. מבנה הפלט לא שונה. |
| `stripEmpty` | קיים | לא קיים | נשמר הפרוס |

**סיכון שנמנע:** `AIDocumentScanner.tsx:87` מחיל את מפתחות התשובה **ישירות** על שדות
המועמד. שינוי `languages` ממחרוזת למערך מחרוזות היה נכתב אל `contact.languages`
שהיא `int8[]` — כישלון כתיבה או הפרת הטריגר `validate_contact_languages_scope_arrays`.
`CvUploadCard` החדש מטפל בשני המבנים דרך `splitLanguages`, ולכן אין צורך בשינוי.

**מה עדיין דורש פריסה:** בלוק ה-PDF. עד לפריסה, סריקת PDF מ-Contact 360 תיכשל
עם `Anthropic error: 400`. סריקת DOCX, TXT ותמונות עובדת מול הפונקציה הפרוסה כמות שהיא.

---

## `ai-profile-writer` — פרוס: version 4, ACTIVE

גרסת החבילה מסירה את `authorized()` ומורידה את המודל ל-`claude-sonnet-4-20250514`.
מעבר לכך — **אפס הפרש תפקודי**.

**הוכרע: לא לשנות דבר.** הקובץ ב-repo הוא תיעוד מדויק של הקוד הפרוס.
**לא נדרשת פריסה.**

---

## מה לא שונה

Schema, RLS, RPC, Triggers, Routes, `package.json`, `package-lock.json`, נתוני production.
ה-AI מציע בלבד ונשמר רק ל-`contact` אחרי אישור אדמין מפורש; אינו נוגע ב-`applications`,
`application_status`, `check_status` או `source`. ערכי עיר ושפה נשמרים רק אחרי התאמה
למילוני Supabase.
