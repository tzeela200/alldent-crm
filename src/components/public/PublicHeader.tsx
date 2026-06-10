import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Phone, ArrowLeft } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'בית', end: true },
  { to: '/jobs', label: 'משרות' },
  { to: '/for-clinics', label: 'למרפאות' },
  { to: '/services', label: 'שירותים' },
  { to: '/contact', label: 'צור קשר' },
]

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out-expo ${
        scrolled
          ? 'bg-[rgba(15,15,16,0.85)] backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Phone (mobile) */}
          <a
            href="tel:+972533959003"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white"
            aria-label="התקשר"
          >
            <Phone className="h-4 w-4" />
          </a>

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0 group">
            <img
              src="/images/logo.png"
              alt="AllDent"
              className="h-10 md:h-11 w-auto brightness-0 invert transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `nav-link px-4 py-2 text-[13.5px] font-medium tracking-wide transition-colors ${
                    isActive ? 'text-teal is-active' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/jobs"
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-ink text-[13px] font-black hover:bg-gold-warm transition-all duration-300 hover:gap-3"
            >
              הגשת מועמדות
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="תפריט"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-ink-2 border-t border-white/[0.06] px-5 py-4 flex flex-col gap-1 animate-reveal-up">
          {navLinks.map((link, i) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                  isActive ? 'bg-white/5 text-teal' : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/jobs"
            className="mt-3 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gold text-ink text-base font-black"
          >
            הגשת מועמדות
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      )}
    </header>
  )
}
