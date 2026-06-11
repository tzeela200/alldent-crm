import { useState } from 'react'
import { JobCard } from '@/components/JobCard'
import { SiteHeader } from '@/components/public/PublicHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import { usePublicJobs, usePublicJobFilters } from '@/hooks/usePublicJobs'
import type { PublicJobFilters } from '@/services/publicJobsService'

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
    <div className="bg-[#FAFAF6] min-h-screen">

      <SiteHeader />

      {/* HERO */}
      <section className="bg-[#2D2D2D] text-white py-14">
        <div className="max-w-6xl mx-auto px-6 text-right">
          <h1 className="text-[32px] md:text-[40px] font-semibold mb-4">
            לוח משרות דנטלי
          </h1>
          <p className="text-white/70 mb-6">
            חפשו הזדמנויות בתחום הדנטלי בצורה פשוטה ונוחה
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי תפקיד, עיר..."
            className="px-5 py-3 rounded-full text-black w-full max-w-md outline-none"
          />
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto px-6 py-16">

        {/* FILTERS */}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-10 justify-end">
            <button
              onClick={() => setActiveRole(null)}
              className={`px-4 py-2 text-[14px] rounded-full border transition ${
                activeRole === null
                  ? 'bg-[#2D2D2D] text-white border-transparent'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              הכל
            </button>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-4 py-2 text-[14px] rounded-full border transition ${
                  activeRole === role
                    ? 'bg-[#2D2D2D] text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}

        {/* GRID */}
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
            </div>
          ) : !jobs?.length ? (
            <p className="py-12 text-center text-slate-400">לא נמצאו משרות</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <SiteFooter />

    </div>
  )
}
