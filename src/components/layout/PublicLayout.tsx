import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '@/components/public/PublicHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import SocialShare from '@/components/public/SocialShare'
import { isJobCodeSlug } from '@/lib/publicJobUtils'

function isPublicJobDetailsPath(pathname: string): boolean {
  const match = pathname.match(/^\/jobs\/([^/]+)\/?$/)
  if (!match?.[1]) return false

  try {
    const slug = decodeURIComponent(match[1]).trim()
    return isJobCodeSlug(slug)
  } catch {
    return false
  }
}

/**
 * INC-3130 — דף נכס HOME DENT. יש בו סרגל CTA דביק במובייל, ולכן
 * כפתורי השיתוף מורמים כדי שלא יישבו עליו.
 * ⚠️ הפוטר כאן **לא** מוסתר, בשונה מדף המשרה: ההדר והפוטר זהים
 * לשאר האתר. הסרגל הוא sticky בתוך העמוד ולכן נעצר לפני הפוטר.
 */
function isDentalAssetDetailsPath(pathname: string): boolean {
  const match = pathname.match(/^\/dental-assets\/([^/]+)\/?$/)
  if (!match?.[1]) return false
  try {
    return /^HD\d{4,}$/i.test(decodeURIComponent(match[1]).trim())
  } catch {
    return false
  }
}

export default function PublicLayout() {
  const { pathname } = useLocation()
  const isJobDetailsPage = isPublicJobDetailsPath(pathname)
  const isAssetDetailsPage = isDentalAssetDetailsPath(pathname)

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div
      dir="rtl"
      lang="he"
      className="min-h-screen bg-paper font-sans text-ink flex flex-col"
    >
      <SiteHeader />

      <main className="flex-1">
        <Outlet />
      </main>

      {isJobDetailsPage ? (
        <div className="hidden md:block">
          <SiteFooter />
        </div>
      ) : (
        <SiteFooter />
      )}

      <SocialShare elevatedOnMobile={isJobDetailsPage || isAssetDetailsPage} />
    </div>
  )
}