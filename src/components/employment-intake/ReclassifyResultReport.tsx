/** דוח תוצאה לאחר "סווג מחדש" — אותו דפוס כמו BulkResultReport. */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import type { ReclassifyRunReport } from '@/hooks/useEmploymentIntakeReclassify'

interface Props {
  report: ReclassifyRunReport | null
  onClose: () => void
}

export function ReclassifyResultReport({ report, onClose }: Props) {
  if (!report) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>סיווג מחדש הושלם</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#99D6D6] bg-[#E6F3F3] p-4 text-center">
          <div className="text-[24px] font-bold text-[#008080]">{report.updated}</div>
          <div className="text-[13px] text-[#2D2D2D]">רשומות עודכנו בהצלחה</div>
        </div>

        <DialogFooter>
          <ActionButton variant="primary" onClick={onClose}>
            סגירה
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
