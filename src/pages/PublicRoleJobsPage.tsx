import { useParams, Navigate } from 'react-router-dom'
import { JobCard } from '@/components/JobCard'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import { PageMediaHero } from '@/components/public/PageMediaHero'
import { getRolePage, getJobRoleName, type RolePageSlug } from '@/lib/publicRolePages'

export default function PublicRoleJobsPage() {
  const { role } = useParams<{ role: string }>()
  const rolePage = role ? getRolePage(role) : undefined

  if (!rolePage || !role) {
    return <Navigate to="/jobs" replace />
  }

  const jobRoleName = getJobRoleName(role as RolePageSlug)
  const { data: jobs, isLoading } = usePublicJobs({ role: jobRoleName })

  return (
    <div className="bg-[#FAFAF7] min-h-screen" dir="rtl">

      <PageMediaHero
        badge={rolePage.badge}
        title={rolePage.title}
        subtitle={rolePage.subtitle}
        image={rolePage.image}
        imageAlt={rolePage.imageAlt}
      />

      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
        <div className="bg-white rounded-[24px] p-5 md:p-8 shadow-sm border border-[#E0E0E0]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
            </div>
          ) : !jobs?.length ? (
            <p className="py-12 text-center text-[#6B6B6B]">לא נמצאו משרות בתחום זה</p>
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
