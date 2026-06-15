import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, Briefcase } from 'lucide-react'

type NavChild = { label: string; to: string }
type NavItem = { label: string; to: string; children?: NavChild[] }

export const NAV_ITEMS: NavItem[] = [
  { label: 'בית', to: '/' },
  {
    label: 'קריירה',
    to: '/jobs',
    children: [
      { label: 'כל המשרות', to: '/jobs' },
      { label: 'רופאי שיניים', to: '/jobs/role/dentists' },
      { label: 'מומחים', to: '/jobs/role/specialists' },
      { label: 'שינניות', to: '/jobs/role/hygienists' },
      { label: 'סייעות', to: '/jobs/role/assistants' },
      { label: 'מזכירות', to: '/jobs/role/secretaries' },
      { label: 'ניהול מרפאה', to: '/jobs/role/managers' },
      { label: 'טכנאי שיניים', to: '/jobs/role/technicians' },
    ],
  },
  {
    label: 'מעסיקים',
    to: '/employers',
    children: [
      { label: 'גיוס עובדים', to: '/employers' },
      { label: 'גיוס דיסקרטי', to: '/employers/discreet' },
      { label: 'מיתוג מעסיקים', to: '/employers/branding' },
    ],
  },
  {
    label: 'שירותים דנטליים',
    to: '/dental-shop',
    children: [
      { label: 'חנות דנטלית', to: '/dental-shop' },
      { label: 'נכסים דנטליים', to: '/dental-assets' },
      { label: 'כיתה דנטלית', to: '/class-dental' },
    ],
  },
  { label: 'צור קשר', to: '/contact' },
]

// ─── Desktop dropdown ─────────────────────────────────────────────
function DropdownItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { pathname } = useLocation()
  const isActive =
    pathname === item.to || item.children?.some((c) => pathname === c.to)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          'flex items-center gap-1 px-3 py-2 text-[14px] font-medium rounded-lg transition-colors',
          isActive
            ? 'text-[#008080]'
            : 'text-[#2D2D2D] hover:text-[#008080] hover:bg-[#008080]/5',
        ].join(' ')}
      >
        {item.label}
        <ChevronDown
          className={[
            'h-3.5 w-3.5 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 min-w-[180px] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1.5 z-50"
          style={{ paddingTop: '10px', marginTop: '-2px' }}
          role="menu"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.children?.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13.5px] text-[#2D2D2D] hover:bg-[#008080]/5 hover:text-[#008080] transition-colors text-right"
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
        isActive
          ? 'text-[#008080]'
          : 'text-[#2D2D2D] hover:text-[#008080] hover:bg-[#008080]/5',
      ].join(' ')}
    >
      {item.label}
    </Link>
  )
}

// ─── Mobile accordion item ────────────────────────────────────────
function MobileNavItem({
  item,
  onClose,
}: {
  item: NavItem
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { pathname } = useLocation()
  const isActive =
    pathname === item.to || item.children?.some((c) => pathname === c.to)

  if (!item.children) {
    return (
      <Link
        to={item.to}
        onClick={onClose}
        className={[
          'flex items-center justify-between py-3.5 text-[17px] font-medium border-b border-[#F1F2F4] transition-colors',
          isActive ? 'text-[#008080]' : 'text-[#2D2D2D] hover:text-[#008080]',
        ].join(' ')}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div className="border-b border-[#F1F2F4]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={[
          'flex w-full items-center justify-between py-3.5 text-[17px] font-medium transition-colors',
          isActive ? 'text-[#008080]' : 'text-[#2D2D2D]',
        ].join(' ')}
      >
        {item.label}
        <ChevronDown
          className={['h-4 w-4 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="flex flex-col pr-4 pb-2">
          {item.children.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              onClick={onClose}
              className="py-2.5 text-[15px] text-[#2D2D2D]/70 hover:text-[#008080] transition-colors border-b border-[#F1F2F4] last:border-0"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main header ──────────────────────────────────────────────────
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]/80"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">

          {/* LOGO */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="AllDent — דף הבית">
            <img src="/images/logo.png" alt="AllDent" className="h-9 w-auto" />
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1" aria-label="ניווט ראשי">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <DropdownItem key={item.to} item={item} />
              ) : (
                <NavLink key={item.to} item={item} />
              )
            )}
          </nav>

          {/* CTA + HAMBURGER */}
          <div className="flex items-center gap-2">
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#D97706] text-white text-[13.5px] font-bold rounded-[16px] shadow-[6px_6px_12px_rgba(0,0,0,0.12)] hover:bg-[#B45309] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.16)] transition-all duration-200"
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              חפש משרה
            </Link>
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

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          dir="rtl"
          role="dialog"
          aria-label="תפריט ניווט"
          className="fixed inset-0 top-16 z-30 bg-white flex flex-col md:hidden overflow-y-auto"
        >
          <nav className="flex flex-col px-5 pt-4 pb-6" aria-label="ניווט מובייל">
            {NAV_ITEMS.map((item) => (
              <MobileNavItem key={item.to} item={item} onClose={() => setMobileOpen(false)} />
            ))}
          </nav>

          <div className="px-5 pb-8 mt-auto">
            <Link
              to="/jobs"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#D97706] text-white text-[15px] font-bold rounded-[20px] shadow-[6px_6px_12px_rgba(0,0,0,0.12)] hover:bg-[#B45309] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.16)] transition-all duration-200 min-h-[44px]"
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
