import { Link } from 'react-router-dom'
import { ArrowUpLeft, MapPin } from 'lucide-react'
import type { PublicJob } from '@/services/publicJobsService'
import { getJobImage, formatPublishDate } from '@/lib/publicJobUtils'

interface Props {
  job: PublicJob
  onClick?: () => void
}

export default function PublicJobCard({ job, onClick }: Props) {
  const image = getJobImage(job)
  const date = formatPublishDate(job.last_publish_date)

  const inner = (
    <article
      className="group relative aspect-[3/4] rounded-[28px] overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 ease-out-expo hover:-translate-y-1"
      onClick={onClick}
    >
      {/* Background image — clean, no overlay */}
      <img
        src={image}
        alt={job.job_title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.08]"
        loading="lazy"
        onError={(e) => { e.currentTarget.src = '/images/fallback/default-dental.svg' }}
      />

      {/* Subtle gradient — only at bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />

      {/* Top-right: job code badge */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-ink text-[10.5px] font-mono font-bold tracking-[0.1em] px-3 py-1.5 rounded-full shadow-md">
        {job.job_code}
      </div>

      {/* Top-left: date (subtle) */}
      {date && (
        <div className="absolute top-4 left-4 bg-ink/40 backdrop-blur-md text-white/90 text-[10px] font-mono font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full">
          {date}
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
        {/* Categories (small caps) */}
        <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-gold mb-2.5">
          {[job.job_role_name, job.scope_names].filter(Boolean).join(' · ')}
        </p>

        {/* Title */}
        <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] mb-3 line-clamp-2 drop-shadow-md">
          {job.job_title}
        </h3>

        {/* Location */}
        {(job.city_name || job.region_name) && (
          <div className="flex items-center gap-1.5 text-[12px] text-white/80 mb-4">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            <span>{[job.city_name, job.region_name].filter(Boolean).join(' · ')}</span>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 border-t border-white/20 flex items-center justify-between">
          {job.salary_expectation_hourly && (
            <span className="text-gold font-mono font-bold text-[12px]">₪{job.salary_expectation_hourly}/שעה</span>
          )}
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.18em] uppercase text-white group-hover:gap-3 transition-all duration-300 mr-auto">
            לפרטים
            <ArrowUpLeft className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  )

  if (onClick) return inner
  return <Link to={`/jobs/${job.job_code}`} className="block h-full">{inner}</Link>
}
