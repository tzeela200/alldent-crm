/** לשונית "תוצאות" — שורת KPI (§3.3). */

import { KPICard } from '@/components/layout/Shell'
import { useEmploymentIntakeSummary } from '@/hooks/useEmploymentIntakeRows'

export function IntakeSummary() {
  const { data, isLoading } = useEmploymentIntakeSummary()
  const v = (n: number | undefined) => (isLoading ? '…' : (n ?? 0))

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <KPICard label="סה״כ הודעות" value={v(data?.total)} />
      <KPICard label="מחפשי עבודה" value={v(data?.jobSeekers)} />
      <KPICard label="מגייסים" value={v(data?.recruiters)} />
      <KPICard label="הצטרפות לקבוצה" value={v(data?.groupJoin)} />
      <KPICard label="לא ברור" value={v(data?.unclear)} />
      <KPICard label="לא רלוונטי" value={v(data?.irrelevant)} />
      <KPICard label="זהויות ייחודיות" value={v(data?.uniqueIdentities)} />
      <KPICard label="קיימים במאגר" value={v(data?.existing)} />
      <KPICard label="חדשים להקמה" value={v(data?.newRecords)} />
      <KPICard label="כבר טופלו בעבר" value={v(data?.alreadyHandled)} />
    </div>
  )
}
