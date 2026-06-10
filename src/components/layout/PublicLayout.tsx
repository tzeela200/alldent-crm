import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Mail, Phone, MessageCircle, ArrowLeft } from 'lucide-react'
import PublicHeader from '@/components/public/PublicHeader'

export default function PublicLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-paper font-sans text-ink flex flex-col">
      <PublicHeader />
      <main className="flex-1 pt-[72px]">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

function PublicFooter() {
  return (
    <footer className="bg-ink text-white/60 mt-0">
      {/* Big CTA top */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-end">
            <div>
              <p className="text-gold text-[11px] font-mono tracking-[0.3em] uppercase mb-4">Let's connect</p>
              <h2 className="font-display text-white text-[40px] md:text-[64px] leading-[0.95]">
                מוכנים<br />
                <span className="text-teal italic">להתחבר</span>?
              </h2>
            </div>
            <div className="space-y-4 text-base">
              <a href="mailto:alldent.job@gmail.com" className="group flex items-center gap-3 text-white hover:text-teal transition-colors">
                <Mail className="h-4 w-4 text-teal" />
                <span dir="ltr" className="font-mono text-lg">alldent.job@gmail.com</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="tel:+972533959003" className="group flex items-center gap-3 text-white hover:text-teal transition-colors">
                <Phone className="h-4 w-4 text-teal" />
                <span dir="ltr" className="font-mono text-lg">053-3959003</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="https://wa.me/972533959003" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 text-white hover:text-[#25D366] transition-colors">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span className="font-mono text-lg">WhatsApp</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer body */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <img src="/images/logo.png" alt="AllDent" className="h-10 w-auto brightness-0 invert mb-5" />
            <p className="text-[14px] leading-relaxed text-white/50 max-w-md">
              פלטפורמת גיוס, השמה ולוח משרות לענף הדנטלי בישראל. משרות אנונימיות ודיסקרטיות במרפאות, מעבדות וחברות דנטליות.
            </p>
            <p className="text-[11px] font-mono tracking-widest text-gold mt-5">Maximizing dental potential</p>
          </div>

          {/* Nav */}
          <div className="md:col-span-3">
            <h4 className="text-[11px] font-mono tracking-[0.25em] text-white/40 uppercase mb-4">ניווט</h4>
            <ul className="space-y-2.5 text-[14px]">
              <li><Link to="/" className="hover:text-teal transition-colors">בית</Link></li>
              <li><Link to="/jobs" className="hover:text-teal transition-colors">משרות דנטליות</Link></li>
              <li><Link to="/for-clinics" className="hover:text-teal transition-colors">למרפאות</Link></li>
              <li><Link to="/services" className="hover:text-teal transition-colors">שירותים</Link></li>
            </ul>
          </div>

          {/* Brands */}
          <div className="md:col-span-4">
            <h4 className="text-[11px] font-mono tracking-[0.25em] text-white/40 uppercase mb-4">המותגים שלנו</h4>
            <ul className="space-y-2.5 text-[14px]">
              <li className="text-white/80">Home Dent</li>
              <li className="text-white/80">Dental Services</li>
              <li className="text-white/80">Class Dental</li>
              <li className="text-white/80">Dental Shop</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-white/30">© 2026 AllDent · All rights reserved</p>
          <p className="text-[11px] font-mono text-white/30">Built for the dental community</p>
        </div>
      </div>
    </footer>
  )
}
