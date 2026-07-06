import { useParams, Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PublicJobCard from '@/components/public/PublicJobCard'
import RegionNav from '@/components/public/RegionNav'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import { getRegionPage, AREA_ROLE_IDS } from '@/lib/publicRegionPages'

// עמוד אזור ציבורי: מאחד סייעות (role 9) ומזכירות (role 13) באזור אחד.
// המשרות מעורבבות יחד לפי המיון הציבורי הקיים; תג התפקיד בכרטיס מזהה כל אחת.
export default function PublicRegionJobsPage() {
  const { slug } = useParams<{ slug: string }>()
  const decodedSlug = slug ? decodeURIComponent(slug) : undefined

  const region = decodedSlug ? getRegionPage(decodedSlug) : undefined
  if (!region || !decodedSlug) return <Navigate to="/jobs" replace />

  const { data: jobs, isLoading } = usePublicJobs({
    roleIds: [...AREA_ROLE_IDS],
    regionIds: region.regionIds,
  })
  const total = jobs?.length ?? 0

  return (
    <div dir="rtl" style={{ fontFamily: 'Heebo, sans-serif', background: '#fff', minHeight: '100vh' }}>

      {/* ── HERO — בצבע האזור ── */}
      <section
        className="relative overflow-hidden flex flex-col items-center text-center px-6 py-14 md:py-20"
        style={{ background: '#2D2D2D', minHeight: 300 }}
      >
        {/* Region color accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: region.color }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: region.color, color: '#fff',
            borderRadius: 999, padding: '4px 14px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            marginBottom: 18,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
            {region.badge}
          </div>

          <h1 style={{
            color: '#fff', fontWeight: 900, margin: '0 0 10px',
            fontSize: 'clamp(26px, 4.2vw, 48px)',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {region.title}
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.65)', maxWidth: 560, margin: '0 auto 20px',
            fontSize: 'clamp(14px, 1.8vw, 17px)', lineHeight: 1.6,
          }}>
            {region.subtitle}
          </p>

          {!isLoading && total > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              <span style={{ color: region.color, fontWeight: 800, fontSize: 20 }}>{total}</span>
              {' '}משרות פתוחות
            </div>
          )}
        </motion.div>
      </section>

      {/* ── REGION NAVIGATION ── */}
      <RegionNav activeSlug={region.slug} />

      {/* ── JOB GRID ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 96px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid ${region.color}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : !jobs?.length ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              אין כרגע משרות סייעות או מזכירות באזור {region.name}.
            </p>
            <Link
              to="/jobs"
              style={{ color: region.color, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}
            >
              לכל המשרות ←
            </Link>
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
