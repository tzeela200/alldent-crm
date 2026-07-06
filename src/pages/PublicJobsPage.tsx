import { useState, useEffect, useRef } from 'react'
import { motion, useInView, animate, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import PublicJobCard from '@/components/public/PublicJobCard'
import RegionNav from '@/components/public/RegionNav'
import { TextCascade } from '@/components/ui/TextCascade'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import type { PublicJobFilters } from '@/services/publicJobsService'

// ─── Brand palette ───────────────────────────────────────────────────────────
const BRAND_COLORS = {
  primary:      '#0A9393',
  primaryLight: '#E0F2F1',
  heroBg:       '#2D2D2D',
  heroSubtext:  'rgba(255,255,255,0.70)',
  heroDivider:  'rgba(255,255,255,0.20)',
  secondary:    '#2D2D2D',
  background:   '#FFFFFF',
  white:        '#FFFFFF',
}

// ─── Fixed 7 filter categories — מנווטות לדפים ייעודיים ─────────────────────
const FIXED_FILTERS = [
  { label: 'מומחים',        filterValue: 'מומח',   slug: 'specialists', color: '#086df4' },
  { label: 'רופאי שיניים',  filterValue: 'רופא',   slug: 'dentists',    color: '#0cc0df' },
  { label: 'שיננית',        filterValue: 'שינ',    slug: 'hygienists',  color: '#d10383' },
  { label: 'סייעת',         filterValue: 'סייע',   slug: 'assistants',  color: '#774196' },
  { label: 'מזכירות',       filterValue: 'מזכיר',  slug: 'secretaries', color: '#076911' },
  { label: 'ניהול',         filterValue: 'ניהול',  slug: 'management-sales', color: '#ff751f' },
  { label: 'טכנאי שיניים',  filterValue: 'טכנא',  slug: 'technicians', color: '#d4a800' },
]

// ─── Cycling roles in hero ────────────────────────────────────────────────────
const HERO_ROLES = [
  { key: 'dentists',    he: 'רופאים',  color: '#0cc0df' },
  { key: 'specialists', he: 'מומחים',  color: '#086df4' },
  { key: 'hygienists',  he: 'שינניות', color: '#d10383' },
  { key: 'assistants',  he: 'סייעות',  color: '#774196' },
  { key: 'secretaries', he: 'מזכירות', color: '#076911' },
  { key: 'managers',    he: 'ניהול',   color: '#ff751f' },
  { key: 'technicians', he: 'טכנאים',  color: '#c8a000' },
]

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView || !ref.current) return
    const ctrl = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v) + suffix },
    })
    return () => ctrl.stop()
  }, [inView, to, suffix])
  return <span ref={ref}>0{suffix}</span>
}

// ─── Cycling role — plain fade, no TextCascade ───────────────────────────────
function CyclingRole() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const role = HERO_ROLES[idx]
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % HERO_ROLES.length); setVisible(true) }, 340)
    }, 3000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{
      display: 'inline-block',
      minWidth: '4.5ch',
      color: role.color,
      fontWeight: 900,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.28s ease',
    }}>
      {role.he}
    </span>
  )
}

// ─── 3-D dark pill button — navigates to role page ───────────────────────────
function FilterPill({
  label, color, onClick,
}: {
  label: string; color: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const bg = hovered ? color : BRAND_COLORS.secondary

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        backgroundImage: hovered ? 'none' : 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 55%)',
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'Heebo, sans-serif',
        cursor: 'pointer',
        boxShadow: hovered
          ? `0 2px 0 color-mix(in srgb, ${bg} 55%, #000 45%)`
          : '0 5px 0 rgba(0,0,0,0.42)',
        transform: hovered ? 'translateY(3px)' : 'translateY(0)',
        transition: 'background 0.14s ease, box-shadow 0.12s ease, transform 0.1s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PublicJobsPage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filters: PublicJobFilters = { search: search || undefined }
  const { data: jobs, isLoading } = usePublicJobs(filters)
  const totalJobs = jobs?.length ?? 0

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{ fontFamily: 'Heebo, sans-serif', background: BRAND_COLORS.background }}
    >
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: 340, background: BRAND_COLORS.heroBg }}
      >
        <div className="relative flex flex-col items-center text-center px-6 py-14 md:py-20">

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="text-white font-black leading-tight mb-3"
            style={{
              fontSize: 'clamp(34px, 5.5vw, 62px)',
              letterSpacing: '-0.025em',
              fontFamily: 'Heebo, sans-serif',
            }}
          >
            הצעות עבודה מקצועיות
          </motion.h1>

          {/* DENTAL JOB — LTR to prevent reversal, Nunito round font */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            dir="ltr"
            className="mb-7"
            style={{
              fontSize: 'clamp(18px, 2.4vw, 28px)',
              letterSpacing: '0.28em',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            <TextCascade
              text="DENTAL JOB"
              color={BRAND_COLORS.primary}
              accent={BRAND_COLORS.primaryLight}
              stagger={90}
              duration={580}
            />
          </motion.div>

          {/* Subtitle — לוח משרות דנטלי + cycling role */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6 }}
            className="flex flex-wrap items-baseline justify-center gap-x-2 mb-8"
            style={{
              fontSize: 'clamp(17px, 2.2vw, 23px)',
              lineHeight: 1.5,
              fontFamily: 'Heebo, sans-serif',
            }}
          >
            <span style={{ color: BRAND_COLORS.white, fontWeight: 600 }}>
              לוח משרות דנטלי
            </span>
            <span style={{ color: BRAND_COLORS.heroDivider, fontSize: '0.85em', fontWeight: 300 }}>|</span>
            <span style={{ color: BRAND_COLORS.heroSubtext, fontWeight: 400 }}>לתפקיד</span>
            <CyclingRole />
            <span style={{ color: BRAND_COLORS.heroSubtext, fontWeight: 400 }}>בפריסה ארצית</span>
          </motion.div>

          {/* Stats */}
          {!isLoading && totalJobs > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex items-center gap-6 mb-8"
            >
              {[
                { value: <Counter to={totalJobs} suffix="+" />, label: 'משרות פתוחות' },
                { value: <Counter to={FIXED_FILTERS.length} />, label: 'תחומים' },
                { value: '24/7', label: 'מתעדכן' },
              ].map((stat, i, arr) => (
                <div key={i} className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-black" style={{ fontSize: 26, color: '#fff', lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND_COLORS.heroSubtext, letterSpacing: '0.06em', marginTop: 4 }}>
                      {stat.label}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 1, height: 28, background: BRAND_COLORS.heroDivider }} />
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.78 }}
            className="relative w-full"
            style={{ maxWidth: 360 }}
          >
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי תפקיד, עיר..."
              dir="rtl"
              className="w-full py-3.5 rounded-full text-gray-900 text-[14px] outline-none"
              style={{
                paddingRight: '1.25rem',
                paddingLeft: '3rem',
                background: BRAND_COLORS.white,
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                fontFamily: 'Heebo, sans-serif',
                transition: 'box-shadow 0.2s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.primaryLight}, 0 4px 12px rgba(0,0,0,0.1)`
              }}
              onBlur={e => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'
              }}
            />
            <span className="absolute top-1/2 -translate-y-1/2" style={{ left: '1rem', color: BRAND_COLORS.primary, fontSize: 16 }}>
              🔍
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── FILTER BAR — navigates to role-specific pages ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-2.5 justify-center items-center">
          {FIXED_FILTERS.map(f => (
            <FilterPill
              key={f.filterValue}
              label={f.label}
              color={f.color}
              onClick={() => navigate(`/jobs/${f.slug}`)}
            />
          ))}
        </div>
      </div>

      {/* ── REGION NAV — סייעות ומזכירות לפי אזור ── */}
      <RegionNav />

      {/* ── JOB GRID ── */}
      <section className="mx-auto px-4 md:px-8 pb-32 pt-8" style={{ maxWidth: 1200 }}>
        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: 'rgba(10,147,147,0.2)' }} />
              <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: BRAND_COLORS.primary }} />
            </div>
          </div>
        ) : !jobs?.length ? (
          <div className="text-center py-32">
            <p className="text-gray-500 text-lg" style={{ fontFamily: 'Heebo, sans-serif' }}>לא נמצאו משרות</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, i) => (
                <PublicJobCard key={job.job_code} job={job} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </section>
    </div>
  )
}
