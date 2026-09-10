import type { PublicJob } from '@/services/publicJobsService'

// role_id → fallback image path (static assets in /public/images/fallback/)
const ROLE_IMAGES: Record<number, string> = {
  1: '/images/fallback/dental-assistant.svg',
  2: '/images/fallback/dentist.svg',
  3: '/images/fallback/hygienist.svg',
  4: '/images/fallback/receptionist.svg',
  5: '/images/fallback/clinic-manager.svg',
  6: '/images/fallback/dental-tech.svg',
  7: '/images/fallback/sales.svg',
}
const DEFAULT_FALLBACK = '/images/fallback/default-dental.svg'

export function getRoleImageFallback(roleId: number | null | undefined): string {
  if (roleId && ROLE_IMAGES[roleId]) return ROLE_IMAGES[roleId]
  return DEFAULT_FALLBACK
}

export function getJobImage(job: PublicJob): string {
  if (job.public_image_url?.trim()) return job.public_image_url
  return getRoleImageFallback(job.job_role)
}

export function extractJobTeaser(description: string | null | undefined, maxChars = 110): string {
  if (!description) return ''
  const clean = description.replace(/[#*]/g, '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxChars) return clean
  const cut = clean.lastIndexOf(' ', maxChars)
  return clean.slice(0, cut > 60 ? cut : maxChars) + '...'
}

// Teal theme per role (all use same brand palette)
export function getRoleTheme(_roleId: number | null | undefined): { badge: string; accent: string } {
  return {
    badge: 'bg-primary-50 text-primary-700',
    accent: 'text-primary-600',
  }
}

export function formatPublishDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export function buildShareText(job: PublicJob, baseUrl: string): string {
  return `משרה: ${job.job_title} [${job.job_code}]\n${baseUrl}/jobs/${job.job_code}`
}

/** Canonical public job URL, computed from the job code — never read from job.job_url. */
export function buildPublicJobUrl(jobCode: string): string {
  return `https://www.alldent.co.il/jobs/${jobCode}`
}

/**
 * INC-3142 — האם ה-slug בכתובת נראה כמו קוד משרה.
 *
 * זהו שומר: נתיב שאינו עומד בו נופל ל-404 **בלי** לפנות ל-Supabase, כדי
 * שלא ניתן יהיה לסרוק את הלוח בכתובות מומצאות.
 *
 * התבנית הקודמת דרשה ספרות (`^[A-Z]{2,5}\d{1,5}$`), כי כל הקודים נוצרו
 * אוטומטית מ-`dict_roles.job_code_prefix` + מספר רץ (DOC9002, MITOG7).
 * קוד שנקבע ידנית ואינו נגמר בספרה — כמו DENTUP למשרה עם דף מיתוג —
 * הוא תקין באותה מידה, ולכן הספרות אופציונליות ואורך האותיות אינו חסום ל-5.
 *
 * ⚠️ הפונקציה הזו היא המקור היחיד לתבנית. היא הייתה משוכפלת בשלושה קבצים,
 * וזה בדיוק מה שגרם לכך ש-DENTUP החזירה 404 אחרי שכבר פורסמה.
 */
export function isJobCodeSlug(value: string): boolean {
  return /^[A-Z][A-Z0-9]{1,15}$/.test(value.trim().toUpperCase())
}
