/**
 * §5.2 — שלוש משפחות הפעולות הגורפות. ההגבלה הישנה ("פעולה גורפת אחת
 * בלבד") בוטלה. הסרגל עצמו אינו מבצע דבר: כל כפתור פותח Preview שדורש
 * אישור מפורש לפני כתיבה כלשהי.
 */

import { CheckCircle2, Send, PencilLine } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import type { BulkFamily } from '@/hooks/useEmploymentIntakeBulk'

interface Props {
  onOpen: (family: BulkFamily) => void
  disabled?: boolean
}

export function BulkActionBar({ onOpen, disabled }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton size="sm" icon={CheckCircle2} disabled={disabled} onClick={() => onOpen('lead_status')}>
        עדכון סטטוס ליד
      </ActionButton>
      <ActionButton size="sm" icon={Send} disabled={disabled} onClick={() => onOpen('details_sent')}>
        סימון שנשלחו פרטים
      </ActionButton>
      <ActionButton size="sm" icon={PencilLine} disabled={disabled} onClick={() => onOpen('update_field')}>
        עריכת שדה משותף
      </ActionButton>
    </div>
  )
}
