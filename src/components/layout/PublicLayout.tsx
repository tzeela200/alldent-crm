import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SiteHeader } from '@/components/public/PublicHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import SocialShare from '@/components/public/SocialShare'

export default function PublicLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-paper font-sans text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <SocialShare />
    </div>
  )
}
