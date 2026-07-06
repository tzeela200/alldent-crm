// תג סטטוס אחיד לכל המערכת.
// - statusType מבטיח שמזהה זהה במילונים שונים (משרה/הגשה/ארגון/בדיקה/פרסום)
//   לא יקבל תווית או צבע שגויים.
// - Label מגיע מהמילון החי (useStatusDict); צבע ממפה מרכזית לפי id.
//   נופל ל-Label הקשיח מ-statusColors רק בזמן טעינה / כשאין רשומה במילון.
import { getStatusColorClasses, type StatusType } from '@/lib/statusColors'
import { useStatusDict } from '@/hooks/useStatusDict'

interface StatusBadgeProps {
  statusType: StatusType
  statusId: number | null | undefined
  /** Label מפורש (למשל כשכבר קיים ברשומה) — עוקף את המילון החי */
  label?: string
}

export function StatusBadge({ statusType, statusId, label }: StatusBadgeProps) {
  const { data: dict } = useStatusDict(statusType)
  const { bg, text, fallbackLabel } = getStatusColorClasses(statusType, statusId)

  const resolved =
    label ??
    (statusId != null ? dict?.get(Number(statusId)) : undefined) ??
    fallbackLabel

  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${bg} ${text}`}
    >
      {resolved}
    </span>
  )
}
