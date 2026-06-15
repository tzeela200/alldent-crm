import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicJob } from '@/services/publicJobsService'
import { getJobImage } from '@/lib/publicJobUtils'

interface Props {
  job: PublicJob
  onClick?: () => void
}

export default function PublicJobCard({ job, onClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const image = getJobImage(job)

  const tags = [
    job.city_name,
    job.region_name,
    ...(Array.isArray(job.scope_names)
      ? job.scope_names
      : job.scope_names ? [job.scope_names] : []),
    job.required_experience_name,
  ].filter(Boolean) as string[]

  const hasLongExcerpt = (job.public_excerpt?.length ?? 0) > 120

  const inner = (
    <div
      className="w-full rounded-[24px] overflow-hidden bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      dir="rtl"
      style={{ fontFamily: 'Heebo, sans-serif' }}
    >
      {/* ── Image section ── */}
      <div className="relative w-full h-[260px] overflow-hidden">
        <img
          src={image}
          alt={job.job_title}
          className="w-full h-full object-cover block"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/images/fallback/default-dental.svg'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent">
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-white text-[18px] font-bold leading-tight">
              {job.job_title}
            </span>
            {job.job_role_name && (
              <span className="text-[#4DD9D9] text-[13px] font-medium">
                {job.job_role_name}
              </span>
            )}
          </div>
          <span className="bg-white/15 backdrop-blur-md text-white border border-white/35 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap shrink-0 mr-3">
            לפרטים
          </span>
        </div>
      </div>

      {/* ── Content section ── */}
      <div className="px-5 pt-5 pb-4 bg-white">
        {/* Job code + city */}
        <h3 className="text-[15px] font-bold text-[#111] mb-3 leading-snug text-right">
          {[job.job_code, job.city_name].filter(Boolean).join(' · ')}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="bg-[#f3f3f3] border border-[#e5e5e5] rounded-full px-3.5 py-1 text-[12px] text-[#444] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Excerpt */}
        {job.public_excerpt && (
          <p
            className={`text-[13.5px] text-[#555] leading-relaxed mb-3 text-right transition-all ${
              expanded ? '' : 'line-clamp-3'
            }`}
          >
            {job.public_excerpt}
          </p>
        )}

        {/* Toggle button — only if excerpt is long */}
        {hasLongExcerpt && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="block mx-auto text-[22px] text-[#888] leading-none transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            aria-label={expanded ? 'כווץ' : 'הרחב'}
          >
            ⌃
          </button>
        )}
      </div>
    </div>
  )

  if (onClick)
    return (
      <div onClick={onClick} className="cursor-pointer">
        {inner}
      </div>
    )

  return (
    <Link to={`/jobs/${job.job_code}`} className="block no-underline">
      {inner}
    </Link>
  )
}
