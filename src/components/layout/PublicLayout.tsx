import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '@/components/public/PublicHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import SocialShare from '@/components/public/SocialShare'

function isPublicJobDetailsPath(pathname: string): boolean {
  const match = pathname.match(/^\/jobs\/([^/]+)\/?$/)
  if (!match?.[1]) return false

  try {
    const slug = decodeURIComponent(match[1]).trim()
    return /^[A-Z]{2,5}\d{1,5}$/i.test(slug)
  } catch {
    return false
  }
}

export default function PublicLayout() {
  const { pathname } = useLocation()
  const isJobDetailsPage = isPublicJobDetailsPath(pathname)

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

      <SocialShare elevatedOnMobile={isJobDetailsPage} />
    </div>
  )
}