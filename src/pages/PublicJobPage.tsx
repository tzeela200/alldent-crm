import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import ApplyModal from '@/components/public/ApplyModal'
import { getPublicJobByCode } from '@/services/publicJobsService'
import type { PublicJob } from '@/services/publicJobsService'

type DetailItem = {
  label: string
  value: string
}

export default function PublicJobPage() {
  const { slug: jobCode } = useParams<{ slug: string }>()
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    if (!jobCode) {
      setLoading(false)
      setJob(null)
      return
    }

    let active = true
    setLoading(true)
    setError(false)
    setImgLoaded(false)

    getPublicJobByCode(jobCode)
      .then((data) => {
        if (!active) return
        setJob(data)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setJob(null)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [jobCode])

  const details = useMemo(() => buildDetails(job), [job])

  if (loading) return <PageSpinner />
  if (error) return <JobNotFound title="לא הצלחנו לטעון את המשרה" />
  if (!job) return <JobNotFound title="המשרה לא נמצאה" />

  const locationText = [job.city_name, job.region_name].filter(Boolean).join(' · ')
  const hasMainContent = Boolean(job.public_excerpt || job.job_description || job.description_image_url || job.job_requirements)

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAFAF7] pb-24 text-[#0F0F10]"
      style={{ fontFamily: 'Heebo, Assistant, Noto Sans Hebrew, sans-serif' }}
    >
      <JobHero
        job={job}
        locationText={locationText}
        imgLoaded={imgLoaded}
        onImageLoad={() => setImgLoaded(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <JobDetailsPanel job={job} details={details} onApply={() => setApplyOpen(true)} />
          </aside>

          <article className="min-w-0 space-y-4">
            {job.public_excerpt && (
              <section className="rounded-xl border border-[#D9D9D9] bg-white px-5 py-4 shadow-sm md:px-6">
                <h2 className="mb-2 text-[14px] font-bold text-[#008080]">תקציר המשרה</h2>
                <MarkdownContent>{job.public_excerpt}</MarkdownContent>
              </section>
            )}

            {(job.job_description || job.description_image_url) && (
              <ContentSection title="תיאור המשרה">
                {job.job_description && <MarkdownContent>{job.job_description}</MarkdownContent>}
                {job.description_image_url && (
                  <JobDescriptionImage
                    src={job.description_image_url}
                    alt={job.job_title}
                    hasText={Boolean(job.job_description)}
                  />
                )}
              </ContentSection>
            )}

            {job.job_requirements && (
              <ContentSection title="דרישות התפקיד">
                <MarkdownContent>{job.job_requirements}</MarkdownContent>
              </ContentSection>
            )}

            {!hasMainContent && (
              <section className="rounded-xl border border-[#D9D9D9] bg-white px-6 py-9 text-center shadow-sm">
                <p className="text-sm text-[#6B6B6B]">פרטים נוספים יתקבלו בפנייה לתפקיד.</p>
              </section>
            )}

            <p className="border-t border-[#D9D9D9] pt-4 text-sm leading-7 text-[#6B6B6B]">
              כל המשרות באתר AllDent מוצגות באופן דיסקרטי. פרטי המעסיק יימסרו רק בהמשך התהליך ולא מוצגים באתר הציבורי.
            </p>
          </article>
        </div>
      </main>

      <JobMobileApplyBar job={job} locationText={locationText} onApply={() => setApplyOpen(true)} />

      <ApplyModal
        isOpen={applyOpen}
        jobCode={jobCode ?? ''}
        onClose={() => setApplyOpen(false)}
      />
    </div>
  )
}

function JobHero({
  job,
  locationText,
  imgLoaded,
  onImageLoad,
}: {
  job: PublicJob
  locationText: string
  imgLoaded: boolean
  onImageLoad: () => void
}) {
  return (
    <section className="relative isolate min-h-[220px] overflow-hidden bg-[#2D2D2D] text-white md:min-h-[270px]">
      {job.public_image_url ? (
        <img
          src={job.public_image_url}
          alt={job.job_title ?? ''}
          onLoad={onImageLoad}
          className="absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 0.55 : 0 }}
        />
      ) : (
        <div className="absolute inset-0 -z-20 bg-[#2D2D2D]" />
      )}

      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#008080]/60 via-[#2D2D2D]/62 to-[#0F0F10]/55" />

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-5">
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
          <Link to="/jobs" className="text-sm font-bold text-white/80 transition-colors hover:text-white">
            ← חזרה ללוח המשרות
          </Link>
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-base font-extrabold text-white md:text-lg">
            קוד משרה: {job.job_code}
          </span>
        </div>

        <div className="max-w-3xl">
          {job.job_role_name && (
            <p className="mb-2 text-[13px] font-bold text-[#E6F3F3]">{job.job_role_name}</p>
          )}

          <h1 className="max-w-3xl text-[26px] font-extrabold leading-[1.25] md:text-[40px] md:leading-[1.22]">
            {job.job_title}
          </h1>

          {locationText && (
            <p className="mt-2 text-[14px] font-medium text-white/75 md:text-[15px]">{locationText}</p>
          )}

        </div>
      </div>
    </section>
  )
}

function JobDetailsPanel({
  job,
  details,
  onApply,
}: {
  job: PublicJob
  details: DetailItem[]
  onApply: () => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#D9D9D9] bg-white shadow-sm">
      <div className="border-b border-[#D9D9D9] px-5 py-4">
        <p className="mb-1 text-xs font-extrabold text-[#008080]">פרטי המשרה</p>
        <h2 className="text-[15px] font-extrabold leading-6 text-[#0F0F10]">{job.job_title}</h2>
      </div>

      <dl className="divide-y divide-[#D9D9D9] px-5">
        {details.map((item) => (
          <DetailRow key={item.label} label={item.label} value={item.value} />
        ))}
      </dl>

      <div className="hidden px-5 pb-5 pt-4 md:block">
        <button
          onClick={onApply}
          className="w-full rounded-full bg-[#D97706] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#B45309] focus:outline-none focus:ring-4 focus:ring-[#D97706]/25 active:scale-[0.98]"
        >
          הגשת מועמדות
        </button>
      </div>
    </section>
  )
}

function DetailRow({ label, value }: DetailItem) {
  return (
    <div className="py-3 text-right">
      <dt className="mb-1 text-[12px] font-semibold text-[#6B6B6B]">{label}</dt>
      <dd className="text-[14px] font-semibold leading-6 text-[#0F0F10]">{value}</dd>
    </div>
  )
}

function JobDescriptionImage({ src, alt, hasText }: { src: string; alt: string; hasText: boolean }) {
  return (
    <figure className={hasText ? 'mt-5 border-t border-[#D9D9D9] pt-5' : ''}>
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        {/*
          התמונה מוצגת בגודלה המקורי (w-auto/h-auto) ושומרת על הפרופורציה שלה.
          max-w-full הוא ההגבלה היחידה — כדי שתמונה רחבה לא תיחתך בנייד.
        */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="mx-auto h-auto w-auto max-w-full rounded-xl border border-[#D9D9D9]"
        />
      </a>
      <figcaption className="mt-2 text-center text-xs text-[#6B6B6B]">לחצו על התמונה לצפייה בגודל מלא</figcaption>
    </figure>
  )
}

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#D9D9D9] bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
      <h2 className="mb-3 border-r-4 border-[#008080] pr-3 text-[18px] font-extrabold leading-7 text-[#0F0F10]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function normalizeBulletText(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()

      // שורה שמתחילה ב-• הופכת לפריט רשימה תקני
      if (trimmed.startsWith('•')) {
        return `- ${trimmed.slice(1).trim()}`
      }

      // שורה ריקה נשארת ריקה (שומרת על מעבר פסקה)
      if (trimmed.length === 0) {
        return ''
      }

      // כל שורה אחרת מקבלת "hard line break" של Markdown (שני רווחים בסוף),
      // כך שירידת שורה רגילה באדמין תישמר בדיוק כמו שהיא נכתבה,
      // בלי קשר אם יש בה נקודה, פסיק, או כלום
      return `${line.trimEnd()}  `
    })
    .join('\n')
}

function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-7 text-[#2D2D2D] md:text-[16px] md:leading-8">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="mb-2 mt-4 text-[18px] font-extrabold leading-7 text-[#0F0F10]">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 mt-4 text-[17px] font-extrabold leading-7 text-[#0F0F10]">{children}</h3>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-[16px] font-extrabold leading-7 text-[#0F0F10]">{children}</h3>,
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pr-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pr-5">{children}</ol>,
          li: ({ children }) => <li className="pr-1 marker:text-[#008080]">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-[#0F0F10]">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} className="font-bold text-[#008080] underline underline-offset-4">
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-[#D9D9D9]" />,
        }}
      >
        {normalizeBulletText(children)}
      </ReactMarkdown>
    </div>
  )
}

function JobMobileApplyBar({
  job,
  locationText,
  onApply,
}: {
  job: PublicJob
  locationText: string
  onApply: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#D9D9D9] bg-white/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#0F0F10]">{job.job_title}</p>
        {locationText && <p className="truncate text-xs text-[#6B6B6B]">{locationText}</p>}
      </div>
      <button
        onClick={onApply}
        className="shrink-0 rounded-full bg-[#D97706] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#B45309] active:scale-[0.98]"
      >
        הגשה
      </button>
    </div>
  )
}

function JobNotFound({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6" dir="rtl">
      <div className="text-center" style={{ fontFamily: 'Heebo, Assistant, Noto Sans Hebrew, sans-serif' }}>
        <p className="mb-2 text-xl font-bold text-[#0F0F10]">{title}</p>
        <Link to="/jobs" className="text-sm font-bold text-[#008080] transition-colors hover:text-[#006D6D]">
          חזרה ללוח המשרות
        </Link>
      </div>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF7]">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#D9D9D9] border-t-[#008080]" />
    </div>
  )
}

function buildDetails(job: PublicJob | null): DetailItem[] {
  if (!job) return []

  return [
    { label: 'קוד משרה', value: job.job_code },
    { label: 'תפקיד', value: job.job_role_name ?? '' },
    {
      label: 'תת־תפקיד',
      value: Array.isArray(job.job_sub_role_names) ? job.job_sub_role_names.join(', ') : '',
    },
    { label: 'עיר משרה', value: job.city_name ?? '' },
    { label: 'אזור', value: job.region_name ?? '' },
    {
      label: 'היקף משרה',
      value: Array.isArray(job.scope_names)
        ? job.scope_names.join(', ')
        : job.scope_names
          ? String(job.scope_names)
          : '',
    },
    { label: 'ימים ושעות', value: job.work_schedule_text ?? '' },
    { label: 'ניסיון נדרש', value: job.required_experience_name ?? '' },
    {
      label: 'שפות נדרשות',
      value: Array.isArray(job.required_languages_names) ? job.required_languages_names.join(', ') : '',
    },
    {
      label: 'מערכות',
      value: Array.isArray(job.system_names) ? job.system_names.join(', ') : '',
    },
    { label: 'ניידות', value: job.mobility_name ?? '' },
    { label: 'סוג העסקה', value: job.tax_type_name ?? '' },
    {
      label: 'סוג שכר',
      value: Array.isArray(job.salary_type_names) ? job.salary_type_names.join(', ') : '',
    },
    {
      label: 'שכר',
      value: job.show_salary_public
        ? [
            job.salary_expectation_monthly ? `₪${job.salary_expectation_monthly.toLocaleString()} / חודש` : '',
            job.salary_expectation_hourly ? `₪${job.salary_expectation_hourly.toLocaleString()} / שעה` : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : '',
    },
  ].filter((item) => item.value.trim().length > 0)
}
