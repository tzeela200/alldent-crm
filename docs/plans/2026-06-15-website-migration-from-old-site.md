# תוכנית הטמעה — מעבר מהאתר הישן לאתר החדש

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להעביר את כל התוכן הרלוונטי מהאתר הישן (Wix export) לפרויקט alldent-crm, תוך החלטה מדויקת מה לקחת ומה לא.

**Architecture:** הפרויקט החדש בנוי React + Vite + Supabase + Tailwind. יש בו כבר עמודים ציבוריים, CRM פנימי, ו-98 משרות פעילות ב-Supabase. הריבוי הגדול של העבודה הוא **מילוי תוכן** לעמודים קיימים ו**הוספת 3 עמודים חסרים**.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase, React Router v6, Framer Motion

---

## 📋 החלטות ראשיות: מה לקחת ומה לא

### ✅ מה כבר קיים — לא צריך להעביר

| נכס | מצב | הערה |
|---|---|---|
| **98 משרות פעילות** | ✅ בסופאבייס | הועברו כבר מה-RSS. לא נוגעים. |
| **תמונות למשרות** | ✅ על CDN של Wix | `image_url` ב-DB מפנה לשם. לא צריך העברה. |
| **תמונות hero** | ✅ `/public/images/page-heroes/` | 7 תמונות לפי תפקיד — כבר קיימות. |
| **תמונות מקצועות** | ✅ `/public/images/professions/` | 7 תמונות — כבר קיימות. |
| **לוגו** | ✅ `/public/images/logo.png` | קיים. |
| **עמודי משרות** | ✅ Built | `/jobs`, `/jobs/:code`, `/jobs/role/:role` |
| **עמוד הבית** | ✅ Built | `PublicHomePage.tsx` |

### ❌ מה לא לקחת מהאתר הישן

| נכס | סיבה |
|---|---|
| CSS / JS / גופנים (`/Style`, `/Scripts`) | פרויקט React/Tailwind — לא רלוונטי בכלל |
| 776 התמונות ב-`/Resources/images/` | רובן מיותרות. ספציפיות שנצטרך — מפורטות בתוכנית |
| קבצי HTML של Wix (`/Pages/**/index.html`) | לא ניתן לשימוש ישיר — נמיר תוכן טקסט בלבד |
| עמודי RSS / בלוג | המשרות כבר ב-Supabase |
| עמודי לחצנות ישנות (`clinicsale-1..6`, `dr-*`, `omer`, `cobi`, ...) | עמודים ייחודיים שאין להם מקבילה בפרויקט |

### 🔄 מה לקחת — תוכן טקסט מעמודים ספציפיים

| עמוד ישן | נתיב חדש | סטטוס |
|---|---|---|
| Dental-job-Employers | `/employers` | ✅ קיים, **צריך מילוי תוכן** |
| Employer-Branding | `/employers/branding` | ✅ קיים, **צריך מילוי תוכן** |
| מסלול גיוס דיסקרטי | `/employers/discreet` | ✅ קיים, **צריך מילוי תוכן** |
| home-dent | `/dental-assets` | ✅ קיים, **צריך מילוי תוכן** |
| copy-of-חנות-דנטלית | `/dental-shop` | ✅ קיים, **צריך מילוי תוכן** |
| כיתה דנטלית — ערוץ פתוח | `/class-dental` | ✅ קיים, **צריך מילוי תוכן** |
| פיתוח קריירה ומשאבי אנוש | `/career` | ❌ **חסר — צריך ליצור** |
| שירותיים ובעלי מקצוע עסקיים | `/services` | ❌ **חסר — צריך ליצור** |
| הצטרפות למאגר הדנטלי | `/join` | ❌ **חסר — צריך ליצור** |
| צור קשר | `/contact` | ✅ קיים, **לוודא שלם** |

---

## מיפוי קבצים

**קבצים שייווצרו:**
- `src/pages/CareerPage.tsx` — פיתוח קריירה ומשאבי אנוש
- `src/pages/ServicesPage.tsx` — שירותיים ובעלי מקצוע עסקיים
- `src/pages/JoinDatabasePage.tsx` — הצטרפות למאגר הדנטלי

**קבצים שישתנו:**
- `src/App.tsx` — הוספת 3 נתיבים חדשים
- `src/pages/EmployersPage.tsx` — מילוי תוכן
- `src/pages/EmployersBrandingPage.tsx` — מילוי תוכן + מחירים
- `src/pages/EmployersDiscreetPage.tsx` — מילוי תוכן
- `src/pages/DentalAssetsPage.tsx` — מילוי תוכן
- `src/pages/DentalShopPage.tsx` — מילוי תוכן
- `src/pages/ClassDentalPage.tsx` — מילוי תוכן
- `src/components/layout/PublicHeader.tsx` / `SiteFooter.tsx` — הוספת קישורים חדשים

---

## Task 1: מילוי תוכן — עמוד מעסיקים `/employers`

**קבצים:**
- Modify: `src/pages/EmployersPage.tsx`

**תוכן לקחת מהעמוד הישן `Dental-job-Employers`:**

- [ ] פתח `src/pages/EmployersPage.tsx` וודא שמופיע התוכן הבא:

**כותרת:** "כל אנשי המקצוע הדנטליים במקום אחד"

**הסבר:**
> המערכת מאפשרת לכם לפתוח בקשה אונליין דרך הנייד והמחשב. המועמדים שבמאגר הם בעלי תפקיד דנטלי עם הסמכות מתאימות.
> המאגר כולל: רופאי שיניים, מומחים, מזכירות רפואיות, סייעות רופא שיניים, טכנאות שיניים, שינניות, ניהול דנטלי ורכש.

**איך זה עובד (3 שלבים):**
1. פתח בקשה אונליין — ספרי לנו על המרפאה ועל המשרה
2. פרסום ב-Facebook, אתר אינטרנט, דיוור מייל, WhatsApp ישיר למועמדים
3. מועמדים מגישים מועמדות אונליין ועונים על שאלות מותאמות

**2 CTA:**
- "מסלול מיתוג מעסיקים" → `/employers/branding`
- "מסלול גיוס דיסקרטי" → `/employers/discreet`

- [ ] שמור קובץ + בדוק ויזואלית בדפדפן (`npm run dev` → http://localhost:5173/employers)

- [ ] Commit:
```bash
git add src/pages/EmployersPage.tsx
git commit -m "content: populate employers page from old site"
```

---

## Task 2: מילוי תוכן — מסלול מיתוג מעסיקים `/employers/branding`

**קבצים:**
- Modify: `src/pages/EmployersBrandingPage.tsx`

**תוכן מהעמוד הישן `Employer-Branding`:**

- [ ] ודאי שהעמוד מכיל:

**מה זה מיתוג מעסיקים:**
> בונים עבורכם "דף משרה עיצובי" מותאם. הדף כולל: תמונות מרפאה וצוות, אג'נדה, סוגי טיפולים, סרטון אישי, קישור לאתר/Facebook/LinkedIn, כתובת + ניווט, פרטי קשר.

**תנאי פרסום:**
> - פרסום תוך 3 ימי עסקים מיום הבקשה
> - פרסום עד 60 יום או עד הודעה על סיום המשרה
> - פרסום ב: רשתות חברתיות, אתרי דרושים, Facebook, אתר Alldent, דיוור WhatsApp אישי
> - לפני פרסום — אישורך על עיצוב הדף

**מחיר:**
> 2,000 ₪ + מע"מ (תשלום חד פעמי לפרסום משרה אחת)
> ניתן לשלם ב: Bit, כרטיס אשראי, Paybox, העברה בנקאית

- [ ] CTA "שלחי בקשה" → `/contact` (או WhatsApp)

- [ ] בדוק ויזואלית ב-`/employers/branding`

- [ ] Commit:
```bash
git add src/pages/EmployersBrandingPage.tsx
git commit -m "content: populate employer branding page with pricing"
```

---

## Task 3: מילוי תוכן — מסלול גיוס דיסקרטי `/employers/discreet`

**קבצים:**
- Modify: `src/pages/EmployersDiscreetPage.tsx`

**תוכן:**

- [ ] ודאי שהעמוד מסביר:
> גיוס ללא פרסום פומבי — פנייה ישירה למועמדים רלוונטיים מהמאגר בלבד. מתאים למרפאות שרוצות שמירה על פרטיות בתהליך הגיוס.

- [ ] CTA: "פנו אלינו לפרטים" → `/contact`

- [ ] Commit:
```bash
git add src/pages/EmployersDiscreetPage.tsx
git commit -m "content: populate discreet recruitment page"
```

---

## Task 4: מילוי תוכן — נכסים דנטליים `/dental-assets`

**קבצים:**
- Modify: `src/pages/DentalAssetsPage.tsx`

**תוכן מהעמוד הישן `home-dent`:**

- [ ] **כותרת:** "HOME DENT — נכסים דנטליים"
- [ ] **תת-כותרת:** "לוח פרסום נכסים דנטליים, מרפאות ומעבדות שיניים בפריסה ארצית"

**נכסים לדוגמה (מהעמוד הישן):**
1. חדר טיפול להשכרה — מרפאה מודרנית במערב ראשון-לציון (השכרה למומחים: פריודונטיה, אנדודונטיה, רפואת הפה)
2. מרפאת ד"ר בלן — תל אביב: 200 מ"ר, 3 חדרי טיפול, ציוד דימות, מעבדה פנימית + תשתית הרדמה כללית. למכירה.
3. מרפאת ד"ר רן שייט — נתניה: 27 שנות מוניטין. למכירה.
4. מרפאת השיניים ד"ר אמנון שני — גבעתיים: השכרת חדר פרימיום.

- [ ] CTA "רוצה לפרסם נכס" → `/contact`

- [ ] Commit:
```bash
git add src/pages/DentalAssetsPage.tsx
git commit -m "content: populate dental assets page"
```

---

## Task 5: מילוי תוכן — חנות דנטלית `/dental-shop`

**קבצים:**
- Modify: `src/pages/DentalShopPage.tsx`

**תוכן:**

- [ ] **כותרת:** "חנות דנטלית מקצועית"
- [ ] **תת-כותרת:** "מסחר מקוון לציוד רפואי, ציוד יד 2, ומיתוג מרפאות"
- [ ] **קטגוריה:** ביגוד מתכלה (חלוק ניילון רפואי, חלוק סקוטש לבן, כיסוי ראש, ערדליים)

**הערה חשובה:** אם החנות לא פעילה עדיין — שים כפתור "בקרוב" + טופס הרשמה להודעה.

- [ ] Commit:
```bash
git add src/pages/DentalShopPage.tsx
git commit -m "content: populate dental shop page"
```

---

## Task 6: מילוי תוכן — כיתה דנטלית `/class-dental`

**קבצים:**
- Modify: `src/pages/ClassDentalPage.tsx`

**תוכן מהעמוד הישן:**

- [ ] **כותרת:** "כיתה דנטלית — ערוץ פתוח"
- [ ] **סאב:** "קהילה דנטלית לומדת"
- [ ] **תיאור:**
> מערכת שיתוף מידע מקצועי שיתופי קליני: סרטוני וידיאו, הרצאות, מאמרים, פרוצדורות, מכשור חדש — רופאים לסייעות, רופאים לרופאים, רופאים לטכנאים. פודקאסטים, מחקרים, כל תוכן מקצועי.
> Alldent מאמינה בידע ולמידה כמפתח להתפתחות אישית.

- [ ] קישור לערוץ WhatsApp: `https://whatsapp.com/channel/0029VbAzFBc5Ejxz7zArAv0X`

- [ ] Commit:
```bash
git add src/pages/ClassDentalPage.tsx
git commit -m "content: populate class dental page"
```

---

## Task 7: עמוד חדש — פיתוח קריירה `/career`

**קבצים:**
- Create: `src/pages/CareerPage.tsx`
- Modify: `src/App.tsx`

**תוכן מהעמוד הישן `פיתוח-קריירה-ומשאבי-אנוש`:**

- [ ] צור `src/pages/CareerPage.tsx`:

```tsx
import { FileText, ExternalLink } from 'lucide-react'
import PageMediaHero from '@/components/public/PageMediaHero'
import RevealOnScroll from '@/components/public/RevealOnScroll'

const HR_FORMS = [
  { title: 'טופס תנאי שכר לעובד חדש', description: 'טופס מלא לקביעת תנאי שכר בגיוס עובד חדש' },
  { title: 'טופס זימון לשימוע', description: 'הליך שימוע תקין לפי דיני עבודה' },
  { title: 'תשובה שלילית למועמד', description: 'מכתב דחייה מנומס ומקצועי' },
]

export default function CareerPage() {
  return (
    <div dir="rtl">
      <PageMediaHero
        title="פיתוח קריירה ומשאבי אנוש"
        subtitle="מידע ותוכן רלוונטי לעובד ולמעסיק בענף הדנטלי"
        badge="Alldent"
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="פיתוח קריירה"
      />

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <RevealOnScroll>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">נגישות מלאה למידע</h2>
          <p className="mb-10 max-w-2xl text-gray-600 leading-relaxed">
            מידע בתחומי משאבי אנוש הכוללים הערכת עובדים, פיתוח קריירה, שימור עובדים,
            דיני עבודה, טפסים לעובד ולמעסיק וכל מידע רלוונטי וחדשני בתחום.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <h3 className="mb-6 text-xl font-semibold text-gray-800">טפסים לעובד ולמעסיק</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HR_FORMS.map((form) => (
              <div key={form.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <FileText className="mb-3 h-6 w-6 text-teal-600" />
                <h4 className="mb-1 font-semibold text-gray-900">{form.title}</h4>
                <p className="text-sm text-gray-500">{form.description}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.2}>
          <div className="mt-10">
            <a
              href="https://bit.ly/42eroOk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 transition"
            >
              <ExternalLink className="h-4 w-4" />
              קורות חיים אונליין
            </a>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  )
}
```

- [ ] הוסף ל-`src/App.tsx` בתוך ה-`<Route element={<PublicLayout />}>`:
```tsx
import CareerPage from '@/pages/CareerPage'
// ...
<Route path="/career" element={<CareerPage />} />
```

- [ ] Commit:
```bash
git add src/pages/CareerPage.tsx src/App.tsx
git commit -m "feat: add career/HR page"
```

---

## Task 8: עמוד חדש — שירותיים עסקיים `/services`

**קבצים:**
- Create: `src/pages/ServicesPage.tsx`
- Modify: `src/App.tsx`

**תוכן מהעמוד הישן `בעלי-מקצוע--שירותיים`:**

- [ ] צור `src/pages/ServicesPage.tsx`:

```tsx
import PageMediaHero from '@/components/public/PageMediaHero'
import RevealOnScroll from '@/components/public/RevealOnScroll'
import { Link } from 'react-router-dom'

const SERVICE_CATEGORIES = [
  { title: 'עורכי דין לרשלנות רפואית', description: 'ייעוץ משפטי מתמחה לתחום הדנטלי' },
  { title: 'שירותי מעבדה', description: 'מעבדות שיניים ושירותי מעבדה מקצועיים' },
  { title: 'גורמי מימון עסקיים', description: 'פתרונות מימון למרפאות ועסקים דנטליים' },
  { title: 'שיווק ומכירות', description: 'שירותי שיווק ייעודיים לענף הדנטלי' },
  { title: 'צלמי וידיאו', description: 'צילום ותוכן ויזואלי לרשתות ולאתר' },
]

export default function ServicesPage() {
  return (
    <div dir="rtl">
      <PageMediaHero
        title="שירותיים ובעלי מקצוע עסקיים"
        subtitle="כל ספקי השירות לענף הדנטלי — במקום אחד"
        badge="DENT SERVICES"
        image="/images/page-heroes/managers.jpg"
        imageAlt="שירותים עסקיים דנטליים"
      />

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <RevealOnScroll>
          <p className="mb-10 max-w-2xl text-gray-600 leading-relaxed">
            מערכת קשרים עסקית — האקוסיסטם הדנטלי. כל ספקי השירות בעלי עניין לענף
            הדנטלי, על מנת לייעל תהליכים ולרתום את בעלי העניין לטובת יעדים משותפים.
          </p>
        </RevealOnScroll>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((s, i) => (
            <RevealOnScroll key={s.title} delay={i * 0.07}>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <h3 className="mb-2 font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.3}>
          <div className="mt-12 rounded-2xl bg-gray-50 p-8 text-center">
            <p className="mb-4 text-gray-700">רוצה להופיע ברשימה?</p>
            <Link
              to="/contact"
              className="inline-flex rounded-full bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 transition"
            >
              צרי קשר
            </Link>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  )
}
```

- [ ] הוסף ל-`src/App.tsx`:
```tsx
import ServicesPage from '@/pages/ServicesPage'
// ...
<Route path="/services" element={<ServicesPage />} />
```

- [ ] Commit:
```bash
git add src/pages/ServicesPage.tsx src/App.tsx
git commit -m "feat: add dental services directory page"
```

---

## Task 9: עמוד חדש — הצטרפות למאגר `/join`

**קבצים:**
- Create: `src/pages/JoinDatabasePage.tsx`
- Modify: `src/App.tsx`

**תוכן מהעמוד הישן `הצטרפות-למאגר-הדנטלי`:**

- [ ] צור `src/pages/JoinDatabasePage.tsx`:

```tsx
import { useState } from 'react'
import PageMediaHero from '@/components/public/PageMediaHero'
import RevealOnScroll from '@/components/public/RevealOnScroll'

export default function JoinDatabasePage() {
  const [sent, setSent] = useState(false)

  return (
    <div dir="rtl">
      <PageMediaHero
        title="הצטרפות למאגר הדנטלי"
        subtitle="מאגר הדנטל הארצי — הצטרפי לפלטפורמה המקצועית של אנשי הדנטל בישראל"
        badge="Alldent"
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="הצטרפות למאגר"
      />

      <section className="mx-auto max-w-lg px-5 py-16 md:px-8">
        <RevealOnScroll>
          {sent ? (
            <div className="rounded-2xl bg-teal-50 p-8 text-center text-teal-800">
              <p className="text-xl font-semibold">תודה שנרשמת למערכת Alldent!</p>
              <p className="mt-2 text-sm">ניצור עמך קשר בהקדם.</p>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => { e.preventDefault(); setSent(true) }}
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">אימייל *</label>
                <input type="email" required className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">נייד *</label>
                <input type="tel" required className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">תפקיד / התמחות</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 transition"
              >
                הצטרפי למאגר
              </button>
            </form>
          )}
        </RevealOnScroll>
      </section>
    </div>
  )
}
```

- [ ] הוסף ל-`src/App.tsx`:
```tsx
import JoinDatabasePage from '@/pages/JoinDatabasePage'
// ...
<Route path="/join" element={<JoinDatabasePage />} />
```

- [ ] Commit:
```bash
git add src/pages/JoinDatabasePage.tsx src/App.tsx
git commit -m "feat: add join dental database page"
```

---

## Task 10: עדכון ניווט (Header + Footer)

**קבצים:**
- Modify: `src/components/layout/PublicHeader.tsx`
- Modify: `src/components/public/SiteFooter.tsx`

**מטרה:** להוסיף קישורים לעמודים החדשים.

- [ ] פתח `PublicHeader.tsx` — הוסף לתפריט:
```
/career      → פיתוח קריירה
/services    → שירותים לענף
```

- [ ] פתח `SiteFooter.tsx` — הוסף:
```
/join        → הצטרפות למאגר
/career      → פיתוח קריירה
/services    → שירותים עסקיים
```

- [ ] בדוק שכל הקישורים בניווט עובדים ב-desktop ו-mobile.

- [ ] Commit:
```bash
git add src/components/layout/PublicHeader.tsx src/components/public/SiteFooter.tsx
git commit -m "nav: add new pages to header and footer"
```

---

## Task 11: URL Redirects — מהאתר הישן לחדש

**מטרה:** שמירה על SEO — כתובות ישנות מ-Wix ימשיכו לעבוד.

**עמודים ישנים → חדשים:**

| כתובת ישנה | כתובת חדשה |
|---|---|
| `/dentjob` | `/jobs` |
| `/dental-assistant-job` | `/jobs/role/assistants` |
| `/Dental-secretary` | `/jobs/role/secretaries` |
| `/hygiene-job` | `/jobs/role/hygienists` |
| `/job.dentists` | `/jobs/role/dentists` |
| `/Dental-techniques` | `/jobs/role/technicians` |
| `/clinic-manager-job` | `/jobs/role/managers` |
| `/Dental-job-Employers` | `/employers` |
| `/Employer-Branding` | `/employers/branding` |
| `/home-dent` | `/dental-assets` |
| `/:jobCode` (as85, doc86...) | `/jobs/:jobCode` |

- [ ] הוסף ל-`src/App.tsx` redirects:

```tsx
import { Navigate } from 'react-router-dom'

// בתוך PublicLayout routes — הוסף בסוף:
<Route path="/dentjob" element={<Navigate to="/jobs" replace />} />
<Route path="/dental-assistant-job" element={<Navigate to="/jobs/role/assistants" replace />} />
<Route path="/Dental-secretary" element={<Navigate to="/jobs/role/secretaries" replace />} />
<Route path="/hygiene-job" element={<Navigate to="/jobs/role/hygienists" replace />} />
<Route path="/job.dentists" element={<Navigate to="/jobs/role/dentists" replace />} />
<Route path="/Dental-techniques" element={<Navigate to="/jobs/role/technicians" replace />} />
<Route path="/clinic-manager-job" element={<Navigate to="/jobs/role/managers" replace />} />
<Route path="/Dental-job-Employers" element={<Navigate to="/employers" replace />} />
<Route path="/Employer-Branding" element={<Navigate to="/employers/branding" replace />} />
<Route path="/home-dent" element={<Navigate to="/dental-assets" replace />} />
```

- [ ] Commit:
```bash
git add src/App.tsx
git commit -m "feat: add SEO redirects from old site URLs"
```

---

## Task 12: בדיקה ויזואלית סופית

- [ ] הרץ `npm run dev`
- [ ] עבור על כל הנתיבים ובדוק:
  - [ ] `/` — עמוד הבית
  - [ ] `/jobs` — לוח משרות
  - [ ] `/jobs/as85` — משרה ספציפית
  - [ ] `/jobs/role/assistants` — לפי תפקיד
  - [ ] `/employers` — מעסיקים
  - [ ] `/employers/branding` — מיתוג + מחיר
  - [ ] `/employers/discreet` — גיוס דיסקרטי
  - [ ] `/dental-assets` — נכסים דנטליים
  - [ ] `/dental-shop` — חנות
  - [ ] `/class-dental` — כיתה דנטלית
  - [ ] `/career` — קריירה ומשאבי אנוש (חדש)
  - [ ] `/services` — שירותיים עסקיים (חדש)
  - [ ] `/join` — הצטרפות למאגר (חדש)
  - [ ] `/contact` — צור קשר
  - [ ] Redirect: `/dentjob` → `/jobs`
  - [ ] Redirect: `/Dental-job-Employers` → `/employers`

- [ ] Commit סופי:
```bash
git add .
git commit -m "chore: visual QA pass complete"
```

---

## סיכום — מה הועבר, מה לא

| נכס | החלטה | סיבה |
|---|---|---|
| 98 משרות מה-RSS | לא הועברו — כבר בסופאבייס | ✅ |
| תמונות למשרות (CDN) | לא הועברו — URL ב-DB | ✅ |
| CSS/JS/גופנים של Wix | לא הועברו — לא רלוונטי | ✅ |
| 776 תמונות | לא הועברו — hero images קיימות | ✅ |
| תוכן טקסט מ-9 עמודים | הועבר לקומפוננטות React | ✅ |
| 3 עמודים חסרים | נוצרו חדשים | ✅ |
| URL redirects | הוספו | ✅ |
