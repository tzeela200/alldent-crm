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
  const jobCode = slug ? slug.trim().toUpperCase() : ''

  let title = 'AllDent | השמה וגיוס למרפאות שיניים'
  let description =
    'חברת ההשמה המובילה בישראל לרפואת שיניים. משרות לרופאים, סייעות, שינניות, מזכירות ומנהלים.'
  let imageUrl = DEFAULT_IMAGE

  try {
    if (jobCode && jobCode !== 'NONE') {
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

  const canonical = `https://www.alldent.co.il/${jobCode && jobCode !== 'NONE' ? 'jobs/' + jobCode : ''}`
  const spaTarget = jobCode && jobCode !== 'NONE' ? '/jobs/' + jobCode : '/'

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
