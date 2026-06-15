# ניתוח מלא: אתר ישן + פרויקט חדש
**תאריך:** 15.6.2026  
**מטרה:** מיפוי מה קיים, מה עובד, מה שבור, ומה לבנות.

---

## חלק א׳ — האתר הישן (Wix Export)

### מבנה התיקייה
```
צאלה אלקבץ Alldent-קבצי עיצוב/
├── blog.rss          ← 105 משרות (כבר ב-Supabase)
├── Pages/desktop/    ← 63 תיקיות דפים
├── Resources/images/ ← 776 תמונות (329 ייחודיות)
├── Resources/files/  ← ~980 קבצי פונט (לא רלוונטי)
├── Scripts/          ← JavaScript של Wix (לא רלוונטי)
└── Style/            ← CSS ישן של Wix (לא רלוונטי)
```

---

### מפת הניווט של האתר הישן

מהניתוח של קבצי ה-HTML עולה שהניווט הראשי היה:

| פריט תפריט | תת-פריטים |
|---|---|
| **בית** | — |
| **עובדים - משרות דנטליות** | (דף ישיר) |
| **לוח משרות** | שינניות / רופאים ומומחים / טכנאות שיניים / ניהוליות / מזכירות / סייעות |
| **מעסיקים - גיוס עובדים** | מסלול מיתוג מעסיקים / מסלול גיוס דיסקרטי |
| **הום דנט - נכסים** | (דף ישיר - קליניקות למכירה) |
| **כיתה דנטלית - ערוץ פתוח** | פיתוח קריירה ומשאבי אנוש |

---

### כל 63 הדפים — מיון לקטגוריות

#### 🟢 דפי ליבה — תואמים לפרויקט החדש

| דף ישן | URL ישן | ה-URL החדש | מצב |
|---|---|---|---|
| home | /home | / | ✅ קיים + בנוי |
| dentjob | /dentjob | /jobs | ✅ קיים אבל יש באג |
| הצעות-עבודה--משרות | /הצעות-עבודה--משרות | /jobs | ✅ אותו דף |
| עבודות | /עבודות | /jobs | ✅ אותו דף |
| hygiene-job | /hygiene-job | /jobs/role/hygienists | ✅ קיים |
| job.dentists | /job.dentists | /jobs/role/dentists | ✅ קיים |
| Dental-techniques | /Dental-techniques | /jobs/role/technicians | ✅ קיים |
| clinic-manager-job | /clinic-manager-job | /jobs/role/managers | ✅ קיים |
| Dental-secretary | /Dental-secretary | /jobs/role/secretaries | ✅ קיים |
| dental-assistant-job | /dental-assistant-job | /jobs/role/assistants | ✅ קיים |
| Dental-job-Employers | /Dental-job-Employers | /employers | ✅ קיים |
| Employer-Branding | /Employer-Branding | /employers/branding | ⚠️ קיים — חסר תוכן |
| מסלול-גיוס-דיסקרטי | /מסלול-גיוס-דיסקרטי | /employers/discreet | ⚠️ קיים — חסר תוכן |
| home-dent | /home-dent | /dental-assets | ⚠️ קיים — "coming soon" |
| copy-of-חנות-דנטלית | /חנות-דנטלית | /dental-shop | ⚠️ קיים — "coming soon" |
| כיתה-דנטלית--ערוץ-פתוח | /כיתה-דנטלית | /class-dental | ⚠️ קיים — "coming soon" |
| צור-קשר | /צור-קשר | /contact | ✅ קיים |

#### 🔵 דפים שצריך להוסיף לפרויקט החדש

| דף ישן | תוכן | איפה בפרויקט החדש |
|---|---|---|
| **פיתוח-קריירה-ומשאבי-אנוש** | תת-דף של "כיתה דנטלית" — HR, פיתוח קריירה | /class-dental/career (תת-דף) |
| **הצטרפות-למאגר-הדנטלי** | הצטרפות של אנשי מקצוע למאגר | /join (דף חדש) |
| **גיוס-עובדים--שאלת-גיוס** | שאלון גיוס למעסיקים | /employers/questionnaire |
| **מסלולי-גיוס** | דף מחירים/מסלולים לגיוס | /employers (חלק מהדף) |
| **בעלי-מקצוע--שירותיים** | שירותיים/שירותים לאנשי מקצוע | /services (דף חדש) |
| **שירותיים-עסקיים-1** | שירותים עסקיים (גרסה נוספת) | /services |
| **dent-marketing** | שירות פרסום מוצרים/קורסים — 600₪+מע״מ | /services (סעיף) |
| **dent-terms** | תנאי פרסום נכסי דנטל — 500₪+מע״מ | /dental-assets (סעיף) |

#### 🔴 דפים שלא צריך להעביר

| דף ישן | סיבה |
|---|---|
| Jerusalem / Sharon / north / south / centeral | מסוננים כיום ע״י Supabase — אין צורך בדפים נפרדים |
| Sharon-clinic / assistant-lam | משרות ספציפיות מהעבר — לא רלוונטי |
| arc-ortho / scanner.itero / hanit-clinic | שותפים חיצוניים — לא Alldent |
| dr-asaf / dr-efi / cobi / omer / lam | פרופילי רופאים ספציפיים — לא רלוונטי |
| get-vibit | שירות שיווק צד-שלישי — רק קישור חיצוני |
| home-dent-point | כפילות של home-dent |
| דף-נחיתה--בסיס | תבנית פנימית — לא דף אמיתי |
| מספר-וואטאפ-חדש | דף הפניה ל-WhatsApp — לא נחוץ |
| 5f07963faeb542ed8c04658727549778 | דף פנימי/טסט לא ידוע |
| קוד-קופון | פונקציה נוכחית בפרויקט החדש? אפשר להוסיף בהמשך |

---

### תוכן שניתן לשימוש מהאתר הישן

#### 1. משרות (RSS blog.rss)
- **105 פוסטים**, 98 פעילים, כבר ב-Supabase
- שדות: כותרת, תיאור מפורט, תמונה (Wix CDN), תאריך, תגיות (תפקיד/עיר/אזור/היקף)
- **כל הצבצים כבר עלו לסופרבייס** — אין מה להעביר ידנית
- הבעיה: `job_url` מצביע לאלדנט הישן. צריך לעדכן.

#### 2. תמונות (776 קבצים)
- **תמונות רלוונטיות לשימוש בפרויקט:**
  - ✅ תמונות קליניקות למכירה (`clinicsale-X`) → לדף dental-assets
  - ✅ תמונות מוצרים (ערדליים, חלוקים, כיסויי ראש) → לדף dental-shop
  - ✅ תמונות פרופסיות (רופאים, שינניות, סייעות) → חלקן כבר ב-Supabase CDN
  - ✅ לוגו לבן/צבעוני → כבר קיים ב-`/public/images/logo.png`
- **תמונות שלא צריך:**
  - פרופילי רופאים ספציפיים, שותפים חיצוניים
  - תמונות של דפים שלא מעבירים

#### 3. תוכן טקסט לדפים

**EmployersBrandingPage** (חסר תוכן כרגע):
- מה היה: הסבר על מסלול מיתוג מעסיקים, תוצרים שמקבלים, מחיר 2,000₪+מע״מ, תקופת 60 ימים
- מה לעשות: להוסיף סקציה עם מה כלול, איך זה עובד + CTA

**EmployersDiscreetPage** (חסר תוכן כרגע):
- מה היה: הסבר על גיוס ללא פרסום, שיקול דעת מלא
- מה לעשות: להוסיף הסבר + יתרונות + CTA

**DentalAssetsPage** (coming soon):
- מה היה: 6 קליניקות פעילות למכירה/השכרה (`clinicsale-1` עד `clinicsale-6`), תנאי פרסום (dent-terms — 500₪+מע״מ)
- מה לעשות: לטעון ממסד נתונים (כדאי להוסיף טבלת `dental_assets` ל-Supabase) עם כרטיסים

**DentalShopPage** (coming soon):
- מה היה: קטגוריות — ערדליים, חלוקים, כיסויי ראש, ציוד דנטלי חד-פעמי. מחיר פרסום מוצר 600₪+מע״מ (dent-marketing)
- מה לעשות: להפוך לדף שמציג מוצרים (אם יש מלאי) או לדף פנייה לספקים

**ClassDentalPage** (coming soon):
- מה היה: "כיתה דנטלית - ערוץ פתוח" = תוכן מקצועי, HR, פיתוח קריירה, קורסים
- מה לעשות: דף hub עם קישורים לתוכן

---

## חלק ב׳ — הפרויקט החדש (alldent-crm)

### ארכיטקטורה
- React 18 + TypeScript + Vite + Tailwind CSS
- React Router v6 (SPA)
- Supabase (PostgreSQL + Row Level Security)
- TanStack Query (caching)
- Framer Motion (אנימציות)
- שתי פריסות: PublicLayout + AdminLayout

---

### מצב כל הדפים הציבוריים

| נתיב | קומפוננטה | מצב | הערות |
|---|---|---|---|
| `/` | PublicHomePage | ✅ בנוי ומלא | Hero, carousel, counters, recent jobs |
| `/jobs` | PublicJobsPage | 🔴 **באג קריטי** | משתמש ב-`JobCard` הישן — מוביל לאתר הישן! |
| `/jobs/:jobCode` | PublicJobPage | ✅ בנוי ומלא | מידע מלא, מפרט, כפתור הגשה |
| `/jobs/role/:role` | PublicRoleJobsPage | 🔴 **באג קריטי** | גם כן משתמש ב-`JobCard` הישן |
| `/employers` | EmployersPage | ✅ בנוי | יש תוכן, קישורים לתת-דפים |
| `/employers/branding` | EmployersBrandingPage | ⚠️ שלד | Hero בלבד + כפתור WhatsApp |
| `/employers/discreet` | EmployersDiscreetPage | ⚠️ שלד | Hero בלבד + כפתור WhatsApp |
| `/dental-shop` | DentalShopPage | ⚠️ coming soon | |
| `/dental-assets` | DentalAssetsPage | ⚠️ coming soon | |
| `/class-dental` | ClassDentalPage | ⚠️ coming soon | |
| `/contact` | ContactPage | ✅ בנוי | WhatsApp + email |

---

### באגים קריטיים שצריך לתקן לפני כל דבר אחר

#### 🔴 באג 1: JobCard מוביל לאתר הישן
**קבצים:**
- `src/pages/PublicJobsPage.tsx` — משתמש ב-`JobCard` הישן
- `src/pages/PublicRoleJobsPage.tsx` — גם כן

**הבעיה:** `JobCard` פותח `job_url` שמצביע ל-`alldent.co.il` הישן.  
**הפתרון:** להחליף את `<JobCard>` ב-`<PublicJobCard>` — הקומפוננטה החדשה **כבר קיימת** ב-`src/components/public/PublicJobCard.tsx` ומשתמשת ב-`<Link to={/jobs/${job.job_code}}>`.

```tsx
// לפני (שגוי):
import { JobCard } from '@/components/JobCard';
<JobCard {...job} />

// אחרי (נכון):
import { PublicJobCard } from '@/components/public/PublicJobCard';
<PublicJobCard job={job} />
```

#### 🔴 באג 2: job_url בסופרבייס מצביע לאתר הישן
**טבלה:** `jobs` (ו-view `v_job_public`)  
**שדה:** `job_url` — ערכים כמו `https://www.alldent.co.il/משרות/כותרת-משרה`  
**הפתרון:**  
אפשרות א׳ — עדכן בסופרבייס (SQL):
```sql
UPDATE jobs SET job_url = '/jobs/' || job_code WHERE job_url LIKE '%alldent.co.il%';
```
אפשרות ב׳ — תתעלם מ-`job_url` ותשתמש תמיד ב-`job_code` (עדיף ארכיטקטונית).

#### ⚠️ בעיה 3: public_excerpt ריק לרוב המשרות
**הסבר:** ה-RSS היה לו רק `description`. השדה `public_excerpt` ב-Supabase ריק לרוב המשרות.  
**הפתרון:** מילוי אוטומטי — חתוך את 150 התווים הראשונים מ-`job_description`:
```sql
UPDATE jobs 
SET public_excerpt = LEFT(job_description, 150) || '...' 
WHERE public_excerpt IS NULL AND job_description IS NOT NULL;
```

---

### מבנה מלא של קבצי הפרויקט

#### Services & Hooks (ה"מוח" של הפרויקט)
```
src/services/publicJobsService.ts  ← קריאות ל-Supabase view v_job_public
src/hooks/usePublicJobs.ts          ← TanStack Query hooks
src/lib/publicJobUtils.ts           ← עזרי formatDate, getJobImage, buildShareText
src/lib/publicRolePages.ts          ← קונפיג 7 דפי תפקיד (hero image, badge, text)
src/lib/roles.ts                    ← הגדרת 7 תפקידים (slug, label, description)
src/lib/supabase.ts                 ← חיבור Supabase עם env vars
```

#### Layout & Navigation
```
src/components/layout/PublicLayout.tsx      ← SiteHeader + Outlet + SiteFooter, dir="rtl"
src/components/public/PublicHeader.tsx      ← SiteHeader + NAV_ITEMS (dropdown menus)
src/components/public/SiteFooter.tsx        ← שימוש ב-NAV_ITEMS
```

#### Components
```
src/components/JobCard.tsx               ← ישן, מוביל לאתר ישן, צריך לבטל שימוש
src/components/public/PublicJobCard.tsx  ← חדש, Link פנימי, fallback SVG
src/components/public/PublicJobSkeleton.tsx
src/components/public/ApplyModal.tsx     ← מודל הגשת מועמדות
src/components/ui/PageMediaHero.tsx      ← hero עם תמונה
src/components/ui/AnimatedCounter.tsx
src/components/ui/Marquee.tsx
src/components/ui/MagneticButton.tsx
src/components/ui/RevealOnScroll.tsx
```

#### Images (public/images/)
```
/images/logo.png + logo-teal.png        ← לוגו
/images/page-heroes/*.jpg               ← 7 תמונות hero לדפי תפקיד
/images/professions/*.jpg               ← 7 תמונות תפקיד
/images/fallback/*.svg                  ← 8 SVG fallbacks לכרטיסי משרה
/images/jobs/jobs-board-cover.jpg       ← hero ללוח משרות
```

#### Deployment
```
vercel.json    ← ✅ נוצר — rewrite כל /* → /index.html (פותר 404)
.env.local     ← gitignored — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

---

## חלק ג׳ — תמונה מלאה: מה לבנות

### Phase 0 — תיקוני באגים (דחוף, לפני Deploy)

1. **החלף JobCard ב-PublicJobCard** ב-PublicJobsPage ו-PublicRoleJobsPage
2. **עדכן job_url** בסופרבייס (SQL)
3. **מלא public_excerpt** בסופרבייס (SQL)
4. **Push vercel.json** ל-GitHub (כבר נוצר)

---

### Phase 1 — העלאה לאוויר (Deployment)

1. Push כל הקבצים ל-GitHub (כולל vercel.json)
2. חיבור Vercel לריפוזיטורי GitHub
3. הגדרת Environment Variables ב-Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. חיבור דומיין alldent.co.il:
   - ב-Vercel: הוסף Custom Domain
   - ב-DNS: שנה A record → Vercel IP (76.76.21.21) + CNAME www → cname.vercel-dns.com

---

### Phase 2 — תוכן לדפים קיימים (שלד)

#### EmployersBrandingPage
תוכן לבנות:
- הסבר קצר על המסלול
- רשימת מה כלול: כרטיס מעסיק מקצועי, פרסום משרות, נוכחות ברשת
- מחיר: 2,000₪+מע״מ / 60 יום
- CTA ל-WhatsApp

#### EmployersDiscreetPage
תוכן לבנות:
- הסבר: גיוס ללא פרסום פומבי, שיקול דעת מלא
- איך זה עובד: Alldent מגייסת מהמאגר הפנימי בשם המעסיק
- CTA ל-WhatsApp

#### DentalAssetsPage
תוכן לבנות:
- הסבר על הפלטפורמה לנכסים
- רשת קליניקות (אפשר למשוך מהאתר הישן: clinicsale-1 עד 6)
- תנאי פרסום: 500₪+מע״מ (מ-dent-terms)
- כפתור "פרסם נכס"

#### ClassDentalPage
תוכן לבנות:
- הסבר על "ערוץ פתוח" — תוכן מקצועי לענף הדנטלי
- קישורים לתת-קטגוריות: פיתוח קריירה, קורסים, HR

#### DentalShopPage
תוכן לבנות:
- קטגוריות מוצרים (ערדליים, חלוקים, כיסויי ראש, ציוד חד-פעמי)
- מידע ליצרנים/ספקים — שירות פרסום 600₪+מע״מ (מ-dent-marketing)

---

### Phase 3 — דפים חדשים

| נתיב | מה לבנות | עדיפות |
|---|---|---|
| `/join` | הצטרפות למאגר הדנטלי — טופס לאנשי מקצוע | גבוהה |
| `/employers/questionnaire` | שאלון גיוס ראשוני למעסיקים | גבוהה |
| `/class-dental/career` | פיתוח קריירה ומשאבי אנוש | בינונית |
| `/services` | שירותים לבעלי מקצוע (dent-marketing, dent-terms) | בינונית |

---

### Phase 4 — שיפורי SEO ו-Redirects

ה-URL הישן ← ה-URL החדש (להגדיר ב-vercel.json):
```json
{
  "redirects": [
    { "source": "/dentjob", "destination": "/jobs", "permanent": true },
    { "source": "/home", "destination": "/", "permanent": true },
    { "source": "/hygiene-job", "destination": "/jobs/role/hygienists", "permanent": true },
    { "source": "/job.dentists", "destination": "/jobs/role/dentists", "permanent": true },
    { "source": "/Dental-techniques", "destination": "/jobs/role/technicians", "permanent": true },
    { "source": "/clinic-manager-job", "destination": "/jobs/role/managers", "permanent": true },
    { "source": "/Dental-secretary", "destination": "/jobs/role/secretaries", "permanent": true },
    { "source": "/dental-assistant-job", "destination": "/jobs/role/assistants", "permanent": true },
    { "source": "/Dental-job-Employers", "destination": "/employers", "permanent": true },
    { "source": "/Employer-Branding", "destination": "/employers/branding", "permanent": true },
    { "source": "/home-dent", "destination": "/dental-assets", "permanent": true }
  ]
}
```

---

## סיכום — סדר עדיפויות

### עכשיו (לפני שאתר עולה לאוויר):
1. 🔴 תקן JobCard → PublicJobCard בשני הדפים
2. 🔴 עדכן job_url ב-Supabase (SQL)
3. 🔴 מלא public_excerpt ב-Supabase (SQL)
4. 🔴 Push ל-GitHub (כולל vercel.json)
5. 🔴 הגדר Vercel + Env vars + חיבור דומיין

### אחרי שהאתר עלה:
6. ⚠️ תוכן לדפי מעסיקים (branding + discreet)
7. ⚠️ תוכן לדפי dental-assets + dental-shop + class-dental
8. ⚠️ Redirects מה-URL הישן לחדש
9. ⬜ דפי /join ו-/employers/questionnaire

### בהמשך:
10. ⬜ /services — שירותים לבעלי מקצוע
11. ⬜ /class-dental/career — פיתוח קריירה
12. ⬜ הוספת קליניקות למכירה לסופרבייס (dental_assets)
