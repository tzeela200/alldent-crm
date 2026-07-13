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

// תמונת ברירת המחדל של המותג — עדכני לתמונה שתבחרי (למשל /share-default.jpg)
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
  const jobCode = slug ? slug.trim().toUpperCase() : ''
  const rolePage = slug ? ROLE_OG[slug.trim()] : undefined
  const pageEntry = pageKey ? PAGE_OG[pageKey] : undefined

  let title = 'AllDent | השמה וגיוס למרפאות שיניים'
  let description =
    'חברת ההשמה המובילה בישראל לרפואת שיניים. משרות לרופאים, סייעות, שינניות, מזכירות ומנהלים.'
  let imageUrl = DEFAULT_IMAGE

  if (pageEntry) {
    title = pageEntry.title
    description = pageEntry.description
    imageUrl = pageEntry.image
  } else if (rolePage) {
    title = rolePage.title
    description = rolePage.description
    imageUrl = rolePage.image
  }

  try {
    if (!pageEntry && !rolePage && jobCode && jobCode !== 'NONE') {
      const { data: job, error } = await supabase
        .from('v_job_public')
        .select('job_title, public_excerpt, public_image_url')
        .eq('job_code', jobCode)
        .maybeSingle()

      if (!error && job) {
        title = `${job.job_title || 'משרה'} | AllDent`
        description =
          job.public_excerpt || 'לפרטים המלאים והגשת מועמדות למשרה, היכנסו לאתר AllDent.'
        if (job.public_image_url) imageUrl = job.public_image_url
      }
    }
  } catch {
    // בכשל — נשארים עם ברירות המחדל של המותג
  }

  const relativePath = pageEntry
    ? pageEntry.path
    : rolePage
      ? '/jobs/' + slug.trim()
      : jobCode && jobCode !== 'NONE'
        ? '/jobs/' + jobCode
        : '/'
  const canonical = `https://www.alldent.co.il${relativePath}`
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
