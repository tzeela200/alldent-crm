import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// סופר בקשות גיוס ציבוריות שעדיין בטיוטה (job.job_status=2) וטרם פורסמו.
// ברגע שמפרסמים משרה (job_status עובר ל-3) היא יוצאת מהספירה מעצמה —
// אין תלות ב-reviewed_at (זה נשאר audit trail בלבד ב-job_recruitment_intake).
// נשלף פעם אחת ומשותף בין AdminJobsPage לבין DashboardPage.
export function useReviewNeededJobsCount() {
  return useQuery({
    queryKey: ['recruitment-requests-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('job_recruitment_intake')
        .select('job_code, job!inner(job_status)', { count: 'exact', head: true })
        .eq('job.job_status', 2)
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
