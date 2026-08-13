/** KPI עסקיים בלבד — Table First, בלי כרטיסי Debug. */

import { KPICard } from '@/components/layout/Shell'
import { useEmploymentIntakeSummary } from '@/hooks/useEmploymentIntakeRows'

export function IntakeSummary() {
  const { data, isLoading } = useEmploymentIntakeSummary()
  const v = (n: number | undefined) => (isLoading ? '…' : (n ?? 0))

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <KPICard label="סה״כ רלוונטי" value={v(data?.total)} />
      <KPICard label="מחפשי עבודה" value={v(data?.jobSeekers)} />
      <KPICard label="מגייסים" value={v(data?.recruiters)} />
      <KPICard label="הצטרפו / צורפו" value={v(data?.groupJoin)} />
      <KPICard label="קיימים במאגר" value={v(data?.existing)} />
      <KPICard label="לא קיימים במאגר" value={v(data?.notExisting)} />
      <KPICard label="דורשים בדיקה" value={v(data?.needsReview)} />
    </div>
  )
}
