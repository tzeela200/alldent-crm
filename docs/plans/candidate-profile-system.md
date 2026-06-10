# AllDent Candidate Profile System — תוכנית הטמעה

> **מצב:** בביצוע | **התחלה:** 2026-06-05 | **הערכת סיום:** 2026-06-07

---

## מטרה

היום: מועמד שולח קו"ח → מעבירים ל-AI חיצוני → HTML → PDF → שולחים לו. **20 דקות למועמד.**

אחרי: מועמד מקבל לינק אישי → ממלא/מעלה מסמך → AI סורק ומטמיע → פרופיל מוכן → PDF בלחיצה. **אפס סיבובים.**

---

## סטאק

| כלי | תפקיד |
|---|---|
| React + TypeScript + Vite | ממשק |
| Supabase (טבלת `contact`) | בסיס נתונים |
| Supabase Edge Functions | שרת AI (מפתח מוגן) |
| Anthropic Claude API | סריקת מסמכים + שדרוג תוכן |
| TanStack Query | ניהול נתונים |
| Tailwind CSS | עיצוב |
| window.print() | ייצוא PDF |

---

## מעקב שלבים

### שלב 0 — הכנת סביבה
- [x] בדיקה שהאפליקציה עולה
- [x] בדיקת שדות בטבלת contact — **כל השדות קיימים**
- [x] הוספת `profile_token` לטבלת contact
- [x] הוספת `genders` ל-dict system
- [x] RLS policy — anon read על כל טבלאות dict
- [x] `sub_role` שונה ל-`bigint[]` (בחירה מרובה)

**זמן בפועל:** ~60 דקות | **סטטוס:** ✅ הושלם

---

### שלב 1 — ריסטרקצ'ר מסך 360
**קובץ:** `src/pages/Candidate360Page.tsx`

מבנה טאבים הוחלף ב-3 sections עם sticky headers בגלילה:
1. פרטים ויצירת קשר (סיכום תפעולי, הגשות, משרות מומלצות)
2. DNA מקצועי (תפקיד, תנאים, השכלה)
3. CRM ותפעול (זהות, ארגון, CRM, תגיות, מטאדאטה)

- [x] הסרת Tabs/TabsList/TabsTrigger/TabsContent
- [x] 3 sections עם sticky header טורקיז
- [x] כפתור scroll-to-top
- [x] build עובר, אין שגיאות
- [x] אימות בדפדפן — כל הנתונים מוצגים

**זמן בפועל:** ~15 דקות | **סטטוס:** ✅ הושלם

---

### שלב 2 — Hook ציבורי (SSOT)
**קובץ חדש:** `src/hooks/useCandidateProfile.ts`

Hook שמגדיר פעם אחת אילו שדות ציבוריים (נראים למועמד) ואילו אדמין בלבד.

- [x] הגדרת `CANDIDATE_PUBLIC_FIELDS` — 41 שדות ציבוריים
- [x] טיפוס `CandidatePublicFields` — Pick מתוך ContactRow
- [x] `fetchCandidateProfile(contactId)` — SELECT רק שדות ציבוריים
- [x] `updateCandidateProfile(contactId, fields)` — UPDATE עם סינון שדות אדמין
- [x] `useCandidateProfile(contactId)` — useQuery hook
- [x] `useUpdateCandidateProfile(contactId)` — useMutation hook
- [x] build עובר

**זמן בפועל:** 10 דקות | **סטטוס:** ✅ הושלם

---

### שלב 3 — עמוד פרופיל מועמד
**קבצים חדשים:**
- `src/pages/CandidateProfilePage.tsx`
- `src/components/candidate/ProfileEditForm.tsx`

**קובץ משתנה:** `src/App.tsx` — route `/candidate/:contactId`

עיצוב Enhancv-style:
- [x] Hero section — שם, תפקיד, תת-תפקיד, מטא, progress circle, כפתורי פעולה
- [x] עמודה ראשית: פרופיל מקצועי, ניסיון תעסוקתי, השכלה
- [x] עמודה צדדית: כישורים, זמינות והעדפות, מסמכים
- [x] ProfileEditForm — עריכה inline לכל שדה
- [x] Placeholder dialogs ל-AI Writer ו-Scanner
- [x] Print styles (@media print) עם footer AllDent
- [x] Route `/candidate/:contactId` + `/profile/:token` מחוץ ל-AdminLayout
- [x] build + אימות בדפדפן — נתונים אמיתיים מ-Supabase

**זמן בפועל:** 20 דקות | **סטטוס:** ✅ הושלם

---

### שלב 3.5 — AI Writer (שדרוג פרופיל)
**קובץ חדש:** `src/components/candidate/AIProfileWriter.tsx`
**Supabase:** Edge Function `ai-profile-writer`

מועמד כותב טקסט חופשי → AI מנסח פרופיל מקצועי → preview לפני/אחרי → שמירה.

- [ ] Edge Function ב-Supabase (מחזיק API key בצד שרת)
- [ ] UI: idle → loading → preview → apply
- [ ] Preview: השוואה לפני/אחרי עם checkboxes
- [ ] שמירה דרך updateCandidateProfile
- [ ] החלפת placeholder dialog ב-CandidateProfilePage
- [ ] build + אימות

**הערכת זמן:** 60 דקות | **סטטוס:** ⬜ ממתין

---

### שלב 4 — AI Scanner (סריקת מסמכים)
**קובץ חדש:** `src/components/candidate/AIDocumentScanner.tsx`
**Supabase:** Edge Function `ai-document-scanner`

קובץ PDF/תמונה/טקסט → AI מזהה שדות → preview עם checkboxes → שמירה.

- [ ] Edge Function ב-Supabase
- [ ] תמיכה ב-.pdf, .txt, .jpg, .png (ללא .docx — דורש parser)
- [ ] קריאת קובץ: FileReader (base64 לתמונות, טקסט לשאר)
- [ ] Preview: שדה | ערך נוכחי | ערך מוצע | checkbox
- [ ] שמירה דרך updateCandidateProfile
- [ ] החלפת placeholder dialog
- [ ] build + אימות

**הערכת זמן:** 60 דקות | **סטטוס:** ⬜ ממתין

---

### שלב 5 — PDF Export
**קובץ:** `src/pages/CandidateProfilePage.tsx`

שיפור @media print שנוצר בשלב 3:
- [x] הסתרת כפתורים, nav, sidebar (className="no-print")
- [x] A4 portrait, margins, שמירת צבעים
- [x] break-inside: avoid על cards
- [x] Footer AllDent קבוע
- [x] מוטמע כחלק משלב 3

**זמן בפועל:** 0 דקות (נכלל בשלב 3) | **סטטוס:** ✅ הושלם

---

### שלב 6 — לינק אישי למועמד
**קבצים משתנים:**
- `src/hooks/useCandidateProfile.ts` — fetch by token
- `src/pages/CandidateProfilePage.tsx` — תמיכה ב-`/profile/:token`
- `src/pages/Candidate360Page.tsx` — כפתור "שלח לינק"
- `src/App.tsx` — route `/profile/:token`

**Supabase:** RLS policy — anon SELECT על contact לפי profile_token

- [x] `fetchCandidateProfileByToken(token)` — RPC `get_profile_by_token` (SECURITY DEFINER)
- [x] `useCandidateProfileByToken(token)` hook
- [x] CandidateProfilePage תומך בשני מצבים (admin by ID / public by token)
- [x] כפתור "שלח לינק למועמד" ב-360 → clipboard + toast
- [x] RPC function `get_profile_by_token` — anon-safe, מחזיר רק לפי token
- [x] Route `/profile/:token` + `/candidate/:contactId` מחוץ ל-AdminLayout (נוסף בשלב 3)
- [x] build עובר

**הערכת זמן:** 30 דקות | **סטטוס:** ⬜ ממתין

---

## סיכום זמנים

| שלב | תוכן | הערכה | בפועל | סטטוס |
|---|---|---|---|---|
| 0 | הכנת סביבה + DB | 60 דק | 60 דק | ✅ |
| 1 | ריסטרקצ'ר 360 | 30 דק | 15 דק | ✅ |
| 2 | Hook ציבורי | 20 דק | 10 דק | ✅ |
| 3 | עמוד פרופיל | 90 דק | 20 דק | ✅ |
| 3.5 | AI Writer | 60 דק | 15 דק | ✅ |
| 4 | AI Scanner | 60 דק | 15 דק | ✅ |
| 5 | PDF Export | 20 דק | 0 (נכלל ב-3) | ✅ |
| 6 | לינק אישי | 30 דק | 15 דק | ✅ |
| | **סה"כ** | **355 דק** | **150 דק** | ✅ **הושלם** |

---

## תיקונים שנוספו ביחס לתוכנית המקורית

1. **API Key מוגן** — Edge Functions במקום חשיפה בפרונט
2. **ללא .docx** — FileReader לא תומך, רק pdf/txt/images
3. **sub_role = bigint[]** — בחירה מרובה, כבר בוצע
4. **RLS לטבלאות dict** — anon read, כבר בוצע
5. **סינון role→sub_role, region→city** — כבר ממומש בטופס /contacts/new
6. **profile_token** — עמודה נוספה כבר

---

## מה נשאר לעתיד (לא בתוכנית הזו)

- העלאת תמונת פרופיל ל-Supabase Storage
- אבטחת לינק אישי (magic link / OTP)
- תמיכה ב-.docx (דורש ספריית parser)
- סינון role/sub_role + region/city בכל מסכי המערכת (hook מרכזי)
- קורות חיים בשני עמודים
