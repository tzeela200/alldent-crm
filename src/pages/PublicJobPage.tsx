import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import ApplyModal from '@/components/public/ApplyModal'
import { getPublicJobByCode } from '@/services/publicJobsService'
import type { PublicJob } from '@/services/publicJobsService'

/* ─── Markdown prose styles injected once ────────────────── */
const PROSE_STYLE = `
  .job-prose { direction: rtl; text-align: right; }
  .job-prose h1,.job-prose h2,.job-prose h3 {
    font-family:'Heebo',sans-serif; font-weight:700;
    color:#0F0F10; margin-top:1.5em; margin-bottom:.5em;
    line-height:1.35;
  }
  .job-prose h1 { font-size:1.35rem; }
  .job-prose h2 { font-size:1.15rem; }
  .job-prose h3 { font-size:1rem; }
  .job-prose p  { margin:.65em 0; }
  .job-prose ul,.job-prose ol { padding-inline-end:1.4em; margin:.65em 0; }
  .job-prose li { margin:.3em 0; }
  .job-prose li::marker { color:#008080; }
  .job-prose strong { font-weight:700; color:#0F0F10; }
  .job-prose em { font-style:italic; }
  .job-prose a  { color:#008080; text-decoration:underline; }
  .job-prose hr { border:none; border-top:1px solid #E5E7EB; margin:1.5em 0; }
`

export default function PublicJobPage() {
  const { slug: jobCode } = useParams<{ slug: string }>()
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    if (!jobCode) return
    getPublicJobByCode(jobCode).then((data) => {
      setJob(data)
      setLoading(false)
    })
  }, [jobCode])

  if (loading) return <PageSpinner />

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]" dir="rtl">
      <p className="text-[#6B6B6B] text-lg" style={{ fontFamily: 'Heebo,sans-serif' }}>המשרה לא נמצאה</p>
    </div>
  )

  const chips = [
    job.city_name && { label: '📍', value: job.city_name },
    job.region_name && { label: 'אזור', value: job.region_name },
    job.required_experience_name && { label: 'ניסיון', value: job.required_experience_name },
    ...(Array.isArray(job.scope_names)
      ? job.scope_names.map(s => ({ label: 'היקף', value: s }))
      : job.scope_names ? [{ label: 'היקף', value: job.scope_names as string }] : []),
    job.mobility_name && { label: 'ניידות', value: job.mobility_name },
    job.tax_type_name && { label: 'מיסוי', value: job.tax_type_name },
    ...(Array.isArray(job.system_names) && job.system_names.length
      ? [{ label: 'מערכת', value: job.system_names.join(', ') }]
      : []),
    ...(Array.isArray(job.required_languages) && job.required_languages.length
      ? [{ label: 'שפות', value: job.required_languages.join(', ') }]
      : []),
  ].filter(Boolean) as { label: string; value: string }[]

  const hasContent = !!(job.job_description || job.job_requirements)

  return (
    <div
      className="bg-[#FAFAF7] min-h-screen pb-28"
      dir="rtl"
      style={{ fontFamily: 'Heebo,sans-serif' }}
    >
      <style>{PROSE_STYLE}</style>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: 480 }}>
        {/* Image */}
        {job.public_image_url ? (
          <img
            src={job.public_image_url}
            alt={job.job_title ?? ''}
            onLoad={() => setImgLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#1A2A28]" />
        )}

        {/* Gradient overlay — two layers for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-e from-black/30 to-transparent" />

        {/* Back link */}
        <Link
          to="/jobs"
          className="absolute top-6 end-6 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors z-10"
        >
          <span>← חזרה ללוח</span>
        </Link>

        {/* Title block — bottom of hero */}
        <div className="relative flex flex-col justify-end h-full px-6 md:px-14 pb-10 pt-24">
          {job.job_role_name && (
            <span className="text-[#4DD9D9] text-[13px] font-semibold tracking-wide uppercase mb-2">
              {job.job_role_name}
            </span>
          )}
          <h1 className="text-white font-black leading-tight text-[28px] md:text-[42px] max-w-3xl" style={{ letterSpacing: '-0.02em' }}>
            {job.job_title}
          </h1>
          {(job.city_name || job.region_name) && (
            <p className="text-white/60 text-[14px] mt-2">
              {[job.city_name, job.region_name].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Salary badge in hero */}
          {job.show_salary_public && (job.salary_expectation_monthly || job.salary_expectation_hourly) && (
            <div className="flex gap-3 mt-4">
              {job.salary_expectation_monthly && (
                <span className="inline-flex items-center gap-1 bg-[#D9A928]/20 border border-[#D9A928]/50 text-[#FDD76A] rounded-full px-4 py-1.5 text-[13px] font-bold">
                  ₪{job.salary_expectation_monthly.toLocaleString()} / חודש
                </span>
              )}
              {job.salary_expectation_hourly && (
                <span className="inline-flex items-center gap-1 bg-[#D9A928]/20 border border-[#D9A928]/50 text-[#FDD76A] rounded-full px-4 py-1.5 text-[13px] font-bold">
                  ₪{job.salary_expectation_hourly.toLocaleString()} / שעה
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CHIPS BAR ─────────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="bg-white border-b border-[#E5E7EB] px-4 overflow-x-auto">
          <div className="flex gap-0 max-w-4xl mx-auto min-w-max">
            {chips.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 px-5 py-4 border-e border-[#E5E7EB] last:border-e-0 shrink-0">
                <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{c.label}</span>
                <span className="text-[14px] text-[#0F0F10] font-semibold">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-10">

        {/* Excerpt / summary */}
        {job.public_excerpt && (
          <div className="bg-[#E6F7F7] border border-[#008080]/20 rounded-2xl px-6 py-5">
            <p className="text-[15px] text-[#006D6D] font-medium leading-relaxed text-right">
              {job.public_excerpt}
            </p>
          </div>
        )}

        {/* Description */}
        {job.job_description && (
          <ContentSection title="תיאור המשרה">
            <div className="job-prose text-[15px] text-[#374151] leading-[1.85]">
              <ReactMarkdown>{job.job_description}</ReactMarkdown>
            </div>
          </ContentSection>
        )}

        {/* Requirements */}
        {job.job_requirements && (
          <ContentSection title="דרישות התפקיד">
            <div className="job-prose text-[15px] text-[#374151] leading-[1.85]">
              <ReactMarkdown>{job.job_requirements}</ReactMarkdown>
            </div>
          </ContentSection>
        )}

        {/* Empty state */}
        {!hasContent && !job.public_excerpt && (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#E5E7EB]">
            <p className="text-[#9CA3AF] text-[15px]">פרטים נוספים יתקבלו בפנייה לתפקיד</p>
          </div>
        )}

        {/* Discretion note */}
        <p className="text-[13px] text-[#9CA3AF] leading-relaxed text-right px-1">
          כל המשרות באתר AllDent מוצגות באופן דיסקרטי. פרטי המעסיק יימסרו רק בהמשך התהליך.
        </p>

        {/* Job code */}
        <p className="text-[12px] text-[#C4C4C4] text-end">קוד משרה: {job.job_code}</p>

      </div>

      {/* ── STICKY BOTTOM CTA ─────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-4 md:hidden">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0F0F10] truncate">{job.job_title}</p>
          {job.city_name && <p className="text-[12px] text-[#6B6B6B]">{job.city_name}</p>}
        </div>
        <button
          onClick={() => setApplyOpen(true)}
          className="shrink-0 bg-[#008080] text-white rounded-full px-6 py-2.5 text-[14px] font-bold hover:bg-[#006D6D] transition-colors active:scale-95"
        >
          הגשת מועמדות
        </button>
      </div>

      {/* Desktop CTA — inside content */}
      <div className="hidden md:flex max-w-4xl mx-auto px-4 md:px-8 pb-16 justify-end">
        <button
          onClick={() => setApplyOpen(true)}
          className="bg-[#008080] text-white rounded-full px-10 py-3.5 text-[15px] font-bold hover:bg-[#006D6D] transition-colors shadow-lg shadow-[#008080]/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#008080]/25 active:scale-95"
        >
          הגשת מועמדות
        </button>
      </div>

      <ApplyModal
        isOpen={applyOpen}
        jobCode={jobCode ?? ''}
        onClose={() => setApplyOpen(false)}
      />
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
        <div className="w-1 h-5 bg-[#008080] rounded-full" />
        <h2 className="text-[16px] font-bold text-[#0F0F10]">{title}</h2>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#008080]" />
    </div>
  )
}
