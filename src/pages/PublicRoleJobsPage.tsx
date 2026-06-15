import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PublicJobCard from '@/components/public/PublicJobCard'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import { getRolePage, type RolePageSlug, PUBLIC_ROLE_PAGES } from '@/lib/publicRolePages'

const ALL_ROLE_NAV = [
  { slug: 'dentists',    label: 'רופאי שיניים' },
  { slug: 'specialists', label: 'מומחים' },
  { slug: 'hygienists',  label: 'שיננית' },
  { slug: 'assistants',  label: 'סייעת' },
  { slug: 'secretaries', label: 'מזכירות' },
  { slug: 'managers',    label: 'ניהול' },
  { slug: 'technicians', label: 'טכנאי שיניים' },
] as const

function RoleNavPill({
  label, color, isActive, onClick,
}: { label: string; color: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? color : '#2D2D2D',
        backgroundImage: isActive ? 'none' : 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 55%)',
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'Heebo, sans-serif',
        cursor: 'pointer',
        boxShadow: isActive
          ? `0 2px 0 color-mix(in srgb, ${color} 55%, #000 45%)`
          : '0 5px 0 rgba(0,0,0,0.42)',
        transform: isActive ? 'translateY(3px)' : 'translateY(0)',
        transition: 'all 0.12s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export default function PublicRoleJobsPage() {
  const { role } = useParams<{ role: string }>()
  const navigate = useNavigate()
  const rolePage = role ? getRolePage(role) : undefined

  if (!rolePage || !role) return <Navigate to="/jobs" replace />

  const { data: jobs, isLoading } = usePublicJobs({ role: rolePage.searchRoot })
  const total = jobs?.length ?? 0

  return (
    <div dir="rtl" style={{ fontFamily: 'Heebo, sans-serif', background: '#fff', minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden flex flex-col items-center text-center px-6 py-14 md:py-20"
        style={{ background: '#2D2D2D', minHeight: 300 }}
      >
        {/* Role color accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: rolePage.color,
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: rolePage.color, color: '#fff',
            borderRadius: 999, padding: '4px 14px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            marginBottom: 18,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
            לוח משרות דנטלי
          </div>

          <h1 style={{
            color: '#fff', fontWeight: 900, margin: '0 0 10px',
            fontSize: 'clamp(28px, 4.5vw, 52px)',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {rolePage.title}
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto 20px',
            fontSize: 'clamp(14px, 1.8vw, 17px)', lineHeight: 1.6,
          }}>
            {rolePage.subtitle}
          </p>

          {!isLoading && total > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              <span style={{ color: rolePage.color, fontWeight: 800, fontSize: 20 }}>{total}</span>
              {' '}משרות פתוחות
            </div>
          )}
        </motion.div>
      </section>

      {/* ── ROLE NAVIGATION BAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '16px 16px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/jobs')}
            style={{
              background: '#2D2D2D',
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 55%)',
              color: '#fff', border: 'none', borderRadius: 999,
              padding: '9px 18px', fontSize: 13, fontWeight: 700,
              fontFamily: 'Heebo, sans-serif', cursor: 'pointer',
              boxShadow: '0 5px 0 rgba(0,0,0,0.42)',
              outline: 'none', whiteSpace: 'nowrap',
            }}
          >
            הכל
          </button>
          {ALL_ROLE_NAV.map(r => (
            <RoleNavPill
              key={r.slug}
              label={r.label}
              color={PUBLIC_ROLE_PAGES[r.slug].color}
              isActive={r.slug === role}
              onClick={() => navigate(`/jobs/role/${r.slug}`)}
            />
          ))}
        </div>
      </div>

      {/* ── JOB GRID ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 96px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid ${rolePage.color}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : !jobs?.length ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF', fontSize: 16 }}>
            לא נמצאו משרות בתחום זה
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job, i) => (
              <PublicJobCard key={job.job_code} job={job} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
