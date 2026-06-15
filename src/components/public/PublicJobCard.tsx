import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { PublicJob } from '@/services/publicJobsService'
import { getJobImage } from '@/lib/publicJobUtils'
import { roleColorFromName } from '@/lib/publicRolePages'

// ─── Card palette ─────────────────────────────────────────────────────────────
const C = {
  primary:      '#0A9393',
  imgRadius:    '18px',          // inner image border-radius
  cardRadius:   '24px',          // outer card border-radius
  contentBg:    '#EBEBED',       // slightly darker gray — better contrast
  tagBg:        '#FFFFFF',       // tag pill background (white on gray = clear)
  tagText:      '#1F2937',       // dark — clearly readable on white tag
  ctaBg:        'rgba(15,15,15,0.72)',
  descText:     '#1F2937',       // dark gray — readable on #EBEBED bg
  titleText:    '#111827',       // near-black
  shadow:       '0 4px 24px rgba(0,0,0,0.09)',
  hoverShadow:  '0 16px 48px rgba(0,0,0,0.14)',
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
  const roleColor = roleColorFromName(job.job_role_name)

  const tags = [
    job.city_name,
    ...(Array.isArray(job.scope_names)
      ? job.scope_names
      : job.scope_names ? [job.scope_names as string] : []),
    job.required_experience_name,
  ].filter(Boolean) as string[]

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
      {/* ── IMAGE — inset with padding + own border-radius ── */}
      <div style={{ padding: '10px 10px 0 10px' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: C.imgRadius,
            overflow: 'hidden',
            height: 230,
            background: '#1a1a1a',
          }}
        >
          <img
            src={image}
            alt={job.job_title ?? ''}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            onError={e => { e.currentTarget.src = '/images/fallback/default-dental.svg' }}
          />

          {/* Gradient — bottom-to-top */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)',
          }} />

          {/* CTA button — always visible, navigates to job detail */}
          <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
            <button
              onClick={e => {
                e.stopPropagation()
                if (job.job_code) navigate(`/jobs/${job.job_code}`)
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.ctaBg,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: '#fff',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Heebo, sans-serif',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              צפייה במשרה
            </button>
          </div>

          {/* Bottom-right (RTL = visual left): title + role */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '0 14px 14px' }}>
            {job.job_role_name && (
              <div style={{
                display: 'inline-block',
                background: roleColor,
                color: '#fff',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: 4,
                marginBottom: 5,
              }}>
                {job.job_role_name}
              </div>
            )}
            <h3 style={{
              color: '#fff',
              fontSize: 15,
              fontWeight: 900,
              lineHeight: 1.3,
              margin: 0,
              textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              maxWidth: '55%',
            }}>
              {job.job_title}
            </h3>
          </div>
        </div>
      </div>

      {/* ── CONTENT — light gray, inset, own radius ── */}
      <div style={{ padding: '8px 10px 0 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: C.contentBg,
          borderRadius: C.imgRadius,
          padding: '14px 16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Excerpt / title */}
          {job.public_excerpt && (
            <p style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: C.titleText,
              lineHeight: 1.45,
            }}>
              {job.public_excerpt}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((t, i) => (
                <span
                  key={i}
                  style={{
                    background: C.tagBg,
                    color: C.tagText,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {t}
                </span>
              ))}
              <span style={{
                background: C.primary,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
              }}>
                AllDent
              </span>
            </div>
          )}

          {/* Expanded description */}
          <AnimatePresence>
            {expanded && job.job_description && (
              <motion.p
                key="desc"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: C.descText,
                  lineHeight: 1.65,
                  overflow: 'hidden',
                }}
              >
                {job.job_description.slice(0, 240)}
                {job.job_description.length > 240 ? '...' : ''}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CHEVRON — collapse/expand ── */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v) }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 0 8px',
          color: '#9CA3AF',
          fontSize: 18,
          lineHeight: 1,
        }}
        aria-label={expanded ? 'סגור' : 'פתח'}
      >
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          style={{ display: 'inline-block' }}
        >
          ⌃
        </motion.span>
      </button>
    </motion.div>
  )

  if (onClick) return <div onClick={onClick} style={{ cursor: 'pointer' }}>{card}</div>
  return <div>{card}</div>
}
