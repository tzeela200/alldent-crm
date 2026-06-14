import { useState } from 'react'
import { JobCard } from '@/components/JobCard'
import { usePublicJobs, usePublicJobFilters } from '@/hooks/usePublicJobs'
import type { PublicJobFilters } from '@/services/publicJobsService'
import { PageMediaHero } from '@/components/public/PageMediaHero'

export default function PublicJobsPage() {
  const [search, setSearch] = useState('')
  const [activeRole, setActiveRole] = useState<string | null>(null)

  const filters: PublicJobFilters = {
    search: search || undefined,
    role: activeRole ?? undefined,
  }

  const { data: jobs, isLoading } = usePublicJobs(filters)
  const { roles } = usePublicJobFilters(jobs)

  return (
    <div className="bg-[#FAFAF7] min-h-screen" dir="rtl">

      <PageMediaHero
        badge="לוח משרות דנטלי"
        title="לוח משרות דנטלי"
        subtitle="כל המשרות בעולם הדנטל במקום אחד — רופאים, מומחים, שינניות, סייעות, מזכירות, ניהול וטכנאים."
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="לוח משרות דנטלי AllDent"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי תפקיד, עיר..."
          className="px-5 py-3 rounded-full text-[#0F0F10] border border-[#D9D9D9] bg-white outline-none focus:border-[#008080] transition-colors text-[14px] w-full sm:max-w-xs min-h-[44px]"
          aria-label="חיפוש משרות"
        />
      </PageMediaHero>

      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16">

        {/* ROLE FILTERS */}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-end">
            <button
              onClick={() => setActiveRole(null)}
              className={`px-4 py-2 text-[13px] font-medium rounded-full border transition min-h-[44px] ${
                activeRole === null
                  ? 'bg-[#0F0F10] text-white border-transparent'
                  : 'bg-white text-[#6B6B6B] border-[#D9D9D9] hover:bg-[#F4F5F4]'
              }`}
            >
              הכל
            </button>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-4 py-2 text-[13px] font-medium rounded-full border transition min-h-[44px] ${
                  activeRole === role
                    ? 'bg-[#0F0F10] text-white border-transparent'
                    : 'bg-white text-[#6B6B6B] border-[#D9D9D9] hover:bg-[#F4F5F4]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}

        {/* JOB GRID */}
        <div className="bg-white rounded-[24px] p-5 md:p-8 shadow-sm border border-[#E0E0E0]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
            </div>
          ) : !jobs?.length ? (
            <p className="py-12 text-center text-[#6B6B6B]">לא נמצאו משרות</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard
                  key={job.job_code}
                  public_image_url={job.public_image_url ?? ''}
                  job_code={job.job_code}
                  job_title={job.job_title}
                  public_excerpt={job.public_excerpt ?? ''}
                  job_role_name={job.job_role_name ?? ''}
                  city_name={job.city_name ?? ''}
                  job_url={job.job_url ?? `/jobs/${job.job_code}`}
                />
              ))}
            </div>
          )}
        </div>

      </section>
    </div>
  )
}
