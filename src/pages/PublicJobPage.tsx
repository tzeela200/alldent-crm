import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SiteHeader } from '@/components/public/PublicHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import ApplyModal from '@/components/public/ApplyModal'
import { getPublicJobByCode } from '@/services/publicJobsService'
import type { PublicJob } from '@/services/publicJobsService'

export default function PublicJobPage() {
  const { jobCode } = useParams<{ jobCode: string }>()
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    if (!jobCode) return
    getPublicJobByCode(jobCode).then((data) => {
      setJob(data)
      setLoading(false)
    })
  }, [jobCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF6] flex items-center justify-center" style={{ fontFamily: 'Heebo, sans-serif' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#008080]" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#FAFAF6] flex items-center justify-center" style={{ fontFamily: 'Heebo, sans-serif' }}>
        <p className="text-gray-500 text-lg">המשרה לא נמצאה</p>
      </div>
    )
  }

  return (
    <div className="bg-[#FAFAF6] min-h-screen" dir="rtl" style={{ fontFamily: 'Heebo, sans-serif' }}>

      <SiteHeader />

      {/* HERO */}
      <section className="relative h-[420px] text-white overflow-hidden">
        {job.public_image_url ? (
          <img
            src={job.public_image_url}
            alt={job.job_title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#2D2D2D]" />
        )}
        <div className="absolute inset-0 bg-black/55 flex items-end p-8 md:p-12">
          <div className="text-right space-y-2">
            {job.job_role_name && (
              <span className="text-sm font-medium text-[#4DD9D9]">{job.job_role_name}</span>
            )}
            <h1 className="text-[30px] md:text-[38px] font-semibold leading-tight">
              {job.job_title}
            </h1>
            {(job.city_name || job.region_name) && (
              <p className="text-white/70 text-[15px]">
                {[job.city_name, job.region_name].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-white/40 text-[13px]">קוד משרה: {job.job_code}</p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-[28px] p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.05)] space-y-14">

          {/* SUMMARY GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
            <InfoCell label="עיר" value={job.city_name} />
            <InfoCell label="אזור" value={job.region_name} />
            <InfoCell label="היקף" value={job.scope_names} />
            <InfoCell label="ניסיון" value={job.required_experience_name} />
            <InfoCell label="שפות" value={job.required_languages} />
            <InfoCell label="מערכות" value={job.system_names} />
            <InfoCell label="ניידות" value={job.mobility_name} />
            <InfoCell label="מיסוי" value={job.tax_type_name} />
          </div>

          <Divider />

          {job.public_excerpt && (
            <TextSection title="תקציר">{job.public_excerpt}</TextSection>
          )}

          {job.job_description && (
            <>
              <Divider />
              <TextSection title="תיאור המשרה">{job.job_description}</TextSection>
            </>
          )}

          {job.job_requirements && (
            <>
              <Divider />
              <TextSection title="דרישות התפקיד">{job.job_requirements}</TextSection>
            </>
          )}

          {job.show_salary_public && (job.salary_expectation_monthly || job.salary_expectation_hourly) && (
            <>
              <Divider />
              <div className="text-right">
                <h2 className="text-[18px] font-semibold text-gray-900 mb-3">שכר</h2>
                <div className="flex flex-wrap gap-4">
                  {job.salary_expectation_monthly && (
                    <span className="bg-gray-50 rounded-xl px-5 py-3 text-[15px] font-medium text-gray-800">
                      {job.salary_expectation_monthly.toLocaleString()} ₪ / חודש
                    </span>
                  )}
                  {job.salary_expectation_hourly && (
                    <span className="bg-gray-50 rounded-xl px-5 py-3 text-[15px] font-medium text-gray-800">
                      {job.salary_expectation_hourly.toLocaleString()} ₪ / שעה
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <Divider />

          {/* PRIVACY */}
          <p className="text-[14px] text-gray-400 leading-relaxed text-right">
            כל המשרות באתר AllDent מוצגות באופן דיסקרטי.
            פרטי המעסיק יימסרו רק בהמשך התהליך.
          </p>

          {/* CTA */}
          <div className="flex justify-end">
            <button
              onClick={() => setApplyOpen(true)}
              className="px-8 py-3.5 bg-[#D97706] text-white rounded-full font-semibold text-[15px] shadow-[0_6px_16px_rgba(217,119,6,0.25)] hover:bg-[#B45309] hover:-translate-y-[1px] transition-all duration-200"
            >
              הגשת מועמדות
            </button>
          </div>

        </div>
      </section>

      <SiteFooter />

      <ApplyModal
        isOpen={applyOpen}
        jobCode={jobCode ?? ''}
        onClose={() => setApplyOpen(false)}
      />

    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="text-right">
      <p className="text-[12px] text-gray-400 mb-1">{label}</p>
      <p className="text-[15px] font-medium text-gray-900">{value}</p>
    </div>
  )
}

function TextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-right">
      <h2 className="text-[20px] font-semibold text-gray-900 mb-4">{title}</h2>
      <p className="text-[15px] text-gray-600 leading-[1.9] whitespace-pre-line">{children}</p>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100" />
}
