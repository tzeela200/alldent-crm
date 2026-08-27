import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { PublicJob } from '@/services/publicJobsService'
import { getJobImage } from '@/lib/publicJobUtils'
import { roleColorFromName } from '@/lib/publicRolePages'
import { getRoleColor } from '@/lib/roleColors'

const C = {
  primary:     '#0A9393',
  imgRadius:   '18px',
  cardRadius:  '24px',
  contentBg:   '#EBEBED',
  tagText:     '#1F2937',
  ctaBg:       'rgba(15,15,15,0.72)',
  descText:    '#1F2937',
  titleText:   '#111827',
  shadow:      '0 4px 24px rgba(0,0,0,0.09)',
  hoverShadow: '0 16px 48px rgba(0,0,0,0.14)',
}

interface Props {
  job: PublicJob
  onClick?: () => void
  index?: number
}

export default function PublicJobCard({ job, onClick, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const image = getJobImage(job)
  // צבע לפי role_id (SSOT) — לא לפי שם, כי "סייעת רופא שיניים" מכיל "רופא"
  // והיה נצבע בטעות כרופא. נפילה לשם רק כשאין role_id.
  const roleColor = job.job_role != null ? getRoleColor(job.job_role).solid : roleColorFromName(job.job_role_name)

  const excerpt = job.public_excerpt || (job.job_description ? job.job_description.slice(0, 260) + (job.job_description.length > 260 ? '...' : '') : null)

  const publishedDate = job.published_at
    ? new Date(job.published_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      dir="rtl"
      style={{
        background: '#fff',
        borderRadius: C.cardRadius,
        boxShadow: C.shadow,
        fontFamily: 'Heebo, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
      whileHover={{ y: -6, boxShadow: C.hoverShadow }}
    >
      {/* IMAGE */}
      <div style={{ padding: '10px 10px 0 10px' }}>
        <div style={{ position: 'relative', borderRadius: C.imgRadius, overflow: 'hidden', height: 230, background: '#1a1a1a' }}>
          <img
            src={image}
            alt={job.job_title ?? ''}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            onError={e => { e.currentTarget.src = '/images/fallback/default-dental.svg' }}
          />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }} />

          {/* CTA */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 2 }}>
            <button
              onClick={e => { e.stopPropagation(); if (job.job_code) navigate(`/jobs/${job.job_code}`) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.ctaBg, backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.16)', color: '#fff',
                borderRadius: 999, padding: '7px 14px', fontSize: 12,
                fontWeight: 700, fontFamily: 'Heebo, sans-serif', whiteSpace: 'nowrap', cursor: 'pointer',
              }}
            >
              צפייה במשרה
            </button>
          </div>

          {/* Title + role badge */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '0 14px 14px' }}>
            {job.job_role_name && (
              <div style={{ display: 'inline-block', background: roleColor, color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4, marginBottom: 5 }}>
                {job.job_role_name}
              </div>
            )}
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, lineHeight: 1.5, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.4)', maxWidth: '55%' }}>
              {job.job_title}
            </h3>
          </div>
        </div>
      </div>

      {/* CONTENT — gray area: date + tags always visible */}
      <div style={{ padding: '8px 10px 0 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: C.contentBg, borderRadius: C.imgRadius, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {publishedDate && (
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>פורסם: {publishedDate}</p>
          )}

          {/* Tags: job_code colored by role, city in white, AllDent in teal */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {job.job_code && (
              <span style={{ background: roleColor, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                {job.job_code}
              </span>
            )}
            {job.city_name && (
              <span style={{ background: '#fff', color: C.tagText, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                {job.city_name}
              </span>
            )}
            <span style={{ background: C.primary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
              AllDent
            </span>
          </div>

          {/* Expandable excerpt */}
          <AnimatePresence>
            {expanded && excerpt && (
              <motion.p
                key="excerpt"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.titleText, lineHeight: 1.5, overflow: 'hidden' }}
              >
                {excerpt}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CHEVRON — always shown */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 0 8px', color: '#9CA3AF', fontSize: 18, lineHeight: 1,
        }}
        aria-label={expanded ? 'סגור' : 'פתח'}
      >
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ display: 'inline-block' }}>
          ⌃
        </motion.span>
      </button>
    </motion.div>
  )

  if (onClick) return <div onClick={onClick} style={{ cursor: 'pointer' }}>{card}</div>
  return <div>{card}</div>
}
