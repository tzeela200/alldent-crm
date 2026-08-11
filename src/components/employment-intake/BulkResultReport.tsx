/**
 * §12.6 — דוח פעולה גורפת בעברית. מציג בדיוק מה קרה, כולל סיבה לכל
 * זהות שדולגה או נחסמה. פעולה חלקית לעולם אינה מוצגת כהצלחה כללית
 * (§12.7).
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { AdminBadge } from '@/components/admin/AdminBadge'
import type { BulkRunReport, BulkRunItemResult } from '@/hooks/useEmploymentIntakeBulk'

const OUTCOME_LABEL: Record<BulkRunItemResult['outcome'], string> = {
  succeeded: 'הצליחה',
  skipped: 'דולגה',
  blocked: 'חסומה',
  failed: 'נכשלה',
}

const OUTCOME_TONE: Record<BulkRunItemResult['outcome'], 'success' | 'neutral' | 'warning' | 'error'> = {
  succeeded: 'success',
  skipped: 'neutral',
  blocked: 'warning',
  failed: 'error',
}

interface Props {
  report: BulkRunReport | null
  onClose: () => void
}

export function BulkResultReport({ report, onClose }: Props) {
  if (!report) return null

  const total = report.succeeded + report.skipped + report.blocked + report.failed
  const isPartial = report.succeeded > 0 && report.succeeded < total
  const headline =
    report.succeeded === total
      ? `הפעולה בוצעה במלואה עבור ${report.succeeded} זהויות.`
      : isPartial
        ? `הפעולה בוצעה באופן חלקי: ${report.succeeded} הצליחו, ${report.skipped} דולגו, ${report.blocked} חסומות, ${report.failed} נכשלו.`
        : `לא בוצעה אף פעולה: ${report.skipped} דולגו, ${report.blocked} חסומות, ${report.failed} נכשלו.`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>דוח הפעולה הגורפת</DialogTitle>
        </DialogHeader>

        <p className="text-[14px] font-semibold text-[#2D2D2D]">{headline}</p>

        <div className="grid grid-cols-4 gap-2 text-center text-[13px]">
          <div className="rounded-[10px] border border-[#99D6D6] bg-[#E6F3F3] p-2">
            <div className="text-[18px] font-bold text-[#008080]">{report.succeeded}</div>
            הצליחו
          </div>
          <div className="rounded-[10px] border border-[#D9D9D9] bg-[#F3F4F6] p-2">
            <div className="text-[18px] font-bold text-[#6B6B6B]">{report.skipped}</div>
            דולגו
          </div>
          <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-2">
            <div className="text-[18px] font-bold text-[#E8A85C]">{report.blocked}</div>
            חסומות
          </div>
          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-2">
            <div className="text-[18px] font-bold text-[#DC2626]">{report.failed}</div>
            נכשלו
          </div>
        </div>

        <div className="space-y-1.5">
          {report.items.map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-3 rounded-[10px] border border-[#D9D9D9] px-3 py-2 text-[13px]">
              <div>
                <div className="font-semibold text-[#2D2D2D]">{item.displayName}</div>
                <div className="text-[12px] text-[#9CA3AF]">{item.occurrences} הופעות מקור</div>
                {item.reason && <div className="mt-0.5 text-[12px] text-[#6B6B6B]">{item.reason}</div>}
              </div>
              <AdminBadge label={OUTCOME_LABEL[item.outcome]} variant={OUTCOME_TONE[item.outcome]} />
            </div>
          ))}
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
