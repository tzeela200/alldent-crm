import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, Briefcase } from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'בית', to: '/' },
  { label: 'לוח משרות', to: '/jobs' },
  {
    label: 'מעסיקים',
    to: '/employers',
    children: [
      { label: 'פרסום משרה', to: '/post-job' },
      { label: 'גיוס מועמדים', to: '/employers' },
      { label: 'תוכניות גיוס', to: '/business-services' },
    ],
  },
  { label: 'שירותים', to: '/business-services' },
  { label: 'צור קשר', to: '/contact' },
] as const

type NavItem = {
  label: string
  to: string
  children?: readonly { label: string; to: string }[]
}

function DropdownItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const isActive = pathname === item.to || item.children?.some((c) => pathname === c.to)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          'flex items-center gap-1 px-3 py-2 text-[14px] font-medium rounded-lg transition-colors',
          isActive ? 'text-teal' : 'text-[#2D2D2D] hover:text-teal hover:bg-teal/5',
        ].join(' ')}
      >
        {item.label}
        <ChevronDown
          className={['h-3.5 w-3.5 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-48 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1.5 z-50"
          role="menu"
        >
          {item.children?.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13.5px] text-[#2D2D2D] hover:bg-teal/5 hover:text-teal transition-colors text-right"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function NavLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const isActive = pathname === item.to

  return (
    <Link
      to={item.to}
      className={[
        'px-3 py-2 text-[14px] font-medium rounded-lg transition-colors',
        isActive ? 'text-teal' : 'text-[#2D2D2D] hover:text-teal hover:bg-teal/5',
      ].join(' ')}
    >
      {item.label}
    </Link>
  )
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]/80"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">

          {/* LOGO — right in RTL */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="AllDent — דף הבית">
            <img src="/images/logo.png" alt="AllDent" className="h-9 w-auto" />
          </Link>

          {/* DESKTOP NAV — center */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="ניווט ראשי"
          >
            {(NAV_ITEMS as readonly NavItem[]).map((item) =>
              item.children ? (
                <DropdownItem key={item.to} item={item} />
              ) : (
                <NavLink key={item.to} item={item} />
              )
            )}
          </nav>

          {/* CTA + MOBILE TOGGLE — left in RTL */}
          <div className="flex items-center gap-2">
            {/* CTA — desktop only */}
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#D97706] text-white text-[13.5px] font-bold rounded-xl hover:bg-[#B45309] transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              חפש משרה
            </Link>

            {/* MOBILE HAMBURGER */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'סגור תפריט' : 'פתח תפריט'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-[#E5E7EB] text-[#2D2D2D] hover:bg-[#F4F5F4] transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE MENU PANEL */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          dir="rtl"
          role="dialog"
          aria-label="תפריט ניווט"
          className="fixed inset-0 top-16 z-30 bg-white flex flex-col md:hidden overflow-y-auto"
        >
          <nav className="flex flex-col px-5 pt-6 pb-10 gap-1" aria-label="ניווט מובייל">
            {(NAV_ITEMS as readonly NavItem[]).map((item) => (
              <div key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between py-3.5 text-[17px] font-medium text-[#2D2D2D] border-b border-[#F1F2F4] hover:text-teal transition-colors"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="flex flex-col pr-4 pb-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className="py-2.5 text-[15px] text-[#2D2D2D]/70 hover:text-teal transition-colors border-b border-[#F1F2F4]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile CTA */}
          <div className="px-5 pb-8 mt-auto">
            <Link
              to="/jobs"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#D97706] text-white text-[15px] font-bold rounded-2xl hover:bg-[#B45309] transition-colors"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              חפש משרה עכשיו
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
