import { createClient } from '@supabase/supabase-js'

// Vercel serverless function that returns Open Graph meta tags for social crawlers
// (WhatsApp, Facebook, LinkedIn, Twitter, …). It is reached ONLY for crawler
// user-agents via a `has` header condition in vercel.json — real users are never
// routed here, so there is no redirect loop. Reads from v_job_public, which only
// exposes truly public jobs (job_status=3 AND public_status=3).

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
)

// תמונת ברירת המחדל של המותג — משמשת גם את דף הבית (/) וגם כל נתיב ללא תמונה ייעודית
const DEFAULT_IMAGE = 'https://www.alldent.co.il/share-default.jpg'
const SITE_NAME = 'AllDent'

// עמודי קטגוריית תפקיד ציבוריים (/jobs/{slug}) — תמונת שיתוף ייעודית לכל תפקיד.
// slugs תואמים ל-ALL_ROLE_SLUGS ב-src/lib/publicRolePages.ts
const ROLE_OG = {
  dentists: {
    title: 'משרות לרופאי שיניים | AllDent',
    description: 'לוח משרות ייעודי לרופאי ורופאות שיניים במרפאות פרטיות, רשתות ומרכזים דנטליים.',
    image: 'https://www.alldent.co.il/images/jobs-og/dentists.jpg',
  },
  specialists: {
    title: 'משרות לרופאים מומחים | AllDent',
    description: 'משרות לרופאים מומחים בתחומי אנדודונטיה, פריודונטיה, אורתודונטיה, שיקום ועוד.',
    image: 'https://www.alldent.co.il/images/jobs-og/specialists.jpg',
  },
  hygienists: {
    title: 'משרות לשינניות | AllDent',
    description: 'לוח משרות לשינניות במרפאות שיניים ברחבי הארץ, במשרה מלאה או חלקית.',
    image: 'https://www.alldent.co.il/images/jobs-og/hygienists.jpg',
  },
  assistants: {
    title: 'משרות לסייעות שיניים | AllDent',
    description: 'משרות לסייעות שיניים במרפאות פרטיות, רשתות, מומחים ומרכזים דנטליים.',
    image: 'https://www.alldent.co.il/images/jobs-og/assistants.jpg',
  },
  secretaries: {
    title: 'משרות למזכירות רפואיות | AllDent',
    description: 'משרות למזכירות דנטליות, אדמיניסטרציה וקבלה במרפאות שיניים.',
    image: 'https://www.alldent.co.il/images/jobs-og/secretaries.jpg',
  },
  'management-sales': {
    title: 'משרות לניהול ומכירות | AllDent',
    description: 'משרות ניהול, תפעול, שירות ומכירות במרפאות שיניים ורשתות דנטליות.',
    image: 'https://www.alldent.co.il/images/jobs-og/management-sales.jpg',
  },
  technicians: {
    title: 'משרות לטכנאי שיניים | AllDent',
    description: 'משרות לטכנאי וטכנאיות שיניים במעבדות, מרפאות וחברות דנטליות.',
    image: 'https://www.alldent.co.il/images/jobs-og/technicians.jpg',
  },
}

// דפי מסלול נוספים (לא תפקידים) — כל אחד עם נתיב קבוע משלו
const PAGE_OG = {
  jobs: {
    path: '/jobs',
    title: 'משרות דנטליות | AllDent',
    description:
      'לוח המשרות של AllDent — מרפאות שיניים, סקטור פרטי, בפריסה ארצית. משרות לרופאים, סייעות, שינניות, מזכירות וטכנאים.',
    image: 'https://www.alldent.co.il/images/jobs-og/jobs.jpg',
  },
  employers: {
    path: '/employers',
    title: 'AllDent Employers | גיוס עובדים בעולם הדנטל',
    description: 'מערכת HR ופלטפורמת גיוס ותעסוקה שנבנתה במיוחד לענף הדנטלי — התאמה רב-ממדית ושני מסלולי גיוס לבחירה.',
    image: 'https://www.alldent.co.il/images/jobs-og/employers.jpg',
  },
  'employers-branding': {
    path: '/employers/branding',
    title: 'מיתוג מעסיקים | AllDent',
    description: 'מסלול גיוס שמציג את המרפאה, הצוות וסביבת העבודה שלכם — אסטרטגיית גיוס עם ערך.',
    image: 'https://www.alldent.co.il/images/jobs-og/employers-branding.png',
  },
  'employers-discreet': {
    path: '/employers/discreet',
    title: 'גיוס אישי ודיסקרטי | AllDent',
    description: 'שירות סינון מועמדים, דיסקרטיות ומיקוד — בלי לחשוף את שם המרפאה בשלב הראשוני.',
    image: 'https://www.alldent.co.il/images/jobs-og/employers-discreet.png',
  },
  // INC-3151 — רשימת הקורסים והתוכניות
  'dental-solutions': {
    path: '/dental-solutions',
    title: 'שירותים, קורסים ותוכניות | AllDent',
    description:
      'הכשרות, תוכניות לימוד ושירותים מקצועיים לאנשי הדנטל — מהגופים המובילים בענף.',
    image: DEFAULT_IMAGE,
  },
  // INC-3130 — לוח הנכסים
  'dental-assets': {
    path: '/dental-assets',
    title: 'HOME DENT | נכסים דנטליים למכירה והשכרה',
    description:
      'מרפאות שיניים, חדרי טיפול, מעבדות והזדמנויות עסקיות בעולם הדנטל — מכירה, השכרה, שותפויות והעברת פעילות.',
    image: DEFAULT_IMAGE,
  },
}

// INC-3151 — פרסומים וקורסים.
// ⚠️ api/ רץ כפונקציית Node ואינו עובר דרך Vite, ולכן אינו יכול לייבא
//    את src/content/dentalSolutions.ts (TypeScript). המטא-דאטה לבוטים
//    משוכפלת כאן במכוון. בהוספת פרסום חדש יש לעדכן את שני המקומות —
//    אחרת הדף יעבוד אבל השיתוף יציג preview גנרי.
const SOLUTION_OG = {
  'maccabident-hygiene-program': {
    title:
      'תואר ראשון והכשרה בשיננות במימון מלא | מכבידנט × אוניברסיטת אריאל',
    description:
      'תוכנית ראשונה מסוגה בישראל: תואר ראשון בניהול מערכות בריאות יחד עם הכשרה לרישיון שיננות של משרד הבריאות — במימון מלא. בשיתוף מכבי, מכבידנט ואוניברסיטת אריאל.',
    image: 'https://www.alldent.co.il/images/solutions/maccabident-hygiene-program.jpg',
    name: 'תואר ראשון והכשרה בשיננות – במימון מלא',
    provider: 'מכבידנט',
    mode: 'onsite',
  },
}

// בריחת תווים כדי שכותרת/תיאור לא ישברו את תגיות ה-meta ולא יאפשרו הזרקה
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  const pageKey = typeof req.query.page === 'string' ? req.query.page.trim() : ''
  // INC-3130 — קוד נכס HOME DENT. נקרא רק מ-v_dental_asset_public, ולכן
  // נכס שפג או שהוסר לא מחזיר preview ישן אלא נופל לברירת המחדל.
  const assetCode =
    typeof req.query.asset === 'string' ? req.query.asset.trim().toUpperCase() : ''
  // INC-3151 — slug של פרסום/קורס
  const solutionSlug =
    typeof req.query.solution === 'string' ? req.query.solution.trim().toLowerCase() : ''
  const solution = solutionSlug ? SOLUTION_OG[solutionSlug] : undefined
  const jobCode = slug ? slug.trim().toUpperCase() : ''
  const rolePage = slug ? ROLE_OG[slug.trim()] : undefined
  const pageEntry = pageKey ? PAGE_OG[pageKey] : undefined

  let title = 'AllDent | הבית המקצועי של אנשי הדנטל בישראל'
  let description =
    'קריירה, קהילה, למידה והתפתחות מקצועית — הכל בפלטפורמה אחת לאנשי הדנטל בישראל.'
  let imageUrl = DEFAULT_IMAGE

  if (solution) {
    title = solution.title
    description = solution.description
    imageUrl = solution.image
  } else if (pageEntry) {
    title = pageEntry.title
    description = pageEntry.description
    imageUrl = pageEntry.image
  } else if (rolePage) {
    title = rolePage.title
    description = rolePage.description
    imageUrl = rolePage.image
  }

  try {
    if (assetCode && /^HD\d{4,}$/.test(assetCode)) {
      const { data: asset, error } = await supabase
        .from('v_dental_asset_public')
        .select('public_page')
        .eq('asset_code', assetCode)
        .maybeSingle()

      const seo = asset?.public_page?.seo
      if (!error && asset) {
        title = `${assetCode} · ${seo?.og_title || asset.public_page?.title || 'נכס דנטלי'} | HOME DENT`
        description =
          seo?.og_description ||
          asset.public_page?.description ||
          'נכס דנטלי בלוח HOME DENT של AllDent. לפרטים המלאים היכנסו לאתר.'
        // og_image הוא נתיב בדלי האחסון הציבורי, לא URL מלא
        if (seo?.og_image) {
          const { data: pub } = supabase.storage
            .from('dental-assets-public')
            .getPublicUrl(seo.og_image)
          if (pub?.publicUrl) imageUrl = pub.publicUrl
        }
      }
    }
  } catch {
    // בכשל — נשארים עם ברירות המחדל של המותג
  }

  try {
    if (!assetCode && !pageEntry && !rolePage && jobCode && jobCode !== 'NONE') {
      const { data: job, error } = await supabase
        .from('v_job_public')
        .select('job_title, public_excerpt, public_image_url')
        .eq('job_code', jobCode)
        .maybeSingle()

      if (!error && job) {
        // קוד המשרה ראשון בכותרת — כך הוא נשאר גלוי גם כשוואטסאפ קוטע כותרות ארוכות,
        // ומאפשר לזהות משרה מתוך הצ'אט בלי להיכנס ללינק. התמונה לא מושפעת.
        title = `${jobCode} · ${job.job_title || 'משרה'} | AllDent`
        description =
          job.public_excerpt || 'לפרטים המלאים והגשת מועמדות למשרה, היכנסו לאתר AllDent.'
        if (job.public_image_url) imageUrl = job.public_image_url
      }
    }
  } catch {
    // בכשל — נשארים עם ברירות המחדל של המותג
  }

  const relativePath = solution
    ? '/dental-solutions/' + solutionSlug
    : assetCode && /^HD\d{4,}$/.test(assetCode)
    ? '/dental-assets/' + assetCode
    : pageEntry
    ? pageEntry.path
    : rolePage
      ? '/jobs/' + slug.trim()
      : jobCode && jobCode !== 'NONE'
        ? '/jobs/' + jobCode
        : '/'
  const canonical = `https://www.alldent.co.il${relativePath}`

  /**
   * INC-3151 — נתונים מובנים לפרסום/קורס.
   * ⚠️ מוזרק כאן ולא ברכיב React: מנועי החיפוש ובוטי הרשתות אינם
   *    מריצים JavaScript של SPA, ולכן JSON-LD שנוסף אחרי הטעינה לא
   *    נקרא. אותה סיבה בדיוק שבגללה הפונקציה הזו קיימת.
   * JSON.stringify מבריח " ו-\ ; מחליפים גם < כדי שלא ייסגר התג.
   */
  let jsonLd = ''
  if (solution) {
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Course',
          name: solution.name,
          description: solution.description,
          inLanguage: 'he-IL',
          url: canonical,
          image: solution.image,
          provider: {
            '@type': 'Organization',
            name: solution.provider,
          },
          isAccessibleForFree: true,
          offers: {
            '@type': 'Offer',
            category: 'Fully funded',
            price: 0,
            priceCurrency: 'ILS',
            availability: 'https://schema.org/LimitedAvailability',
            url: canonical,
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: solution.mode,
            inLanguage: 'he-IL',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'AllDent', item: 'https://www.alldent.co.il/' },
            { '@type': 'ListItem', position: 2, name: 'שירותים, קורסים ותוכניות', item: 'https://www.alldent.co.il/dental-solutions' },
            { '@type': 'ListItem', position: 3, name: solution.name, item: canonical },
          ],
        },
        {
          '@type': 'WebPage',
          url: canonical,
          name: solution.title,
          inLanguage: 'he-IL',
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', 'h2'],
          },
        },
      ],
    }
    jsonLd =
      '<script type="application/ld+json">' +
      JSON.stringify(graph).replace(/</g, '\u003c') +
      '</' + 'script>'
  }
  const spaTarget = relativePath

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />

  <link rel="canonical" href="${esc(canonical)}" />
${jsonLd}
  <!-- רשת ביטחון: אם בן-אדם (ולא בוט) מגיע לכאן, נעביר אותו לאתר הרגיל -->
  <script>window.location.replace(${JSON.stringify(spaTarget)});</script>
</head>
<body>
  <p>טוען את הפרטים ומעביר אותך לאתר AllDent…</p>
  <a href="${esc(spaTarget)}">המשך לאתר</a>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}
