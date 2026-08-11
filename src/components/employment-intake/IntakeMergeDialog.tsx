/**
 * §3.5 פעולה 10 — מיזוג מידע חדש לרשומה קיימת. בחירה פר-שדה, ברירת מחדל
 * מסומנת רק לשדות ריקים; דריסת ערך קיים דורשת סימון מפורש (עקבי עם §5.2
 * כלל 3 שחל גם על עריכת שדה משותף גורפת).
 */

import { useEffect, useState } from 'react'
import { Merge } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import {
  useContactCompareData,
  useAccountCompareData,
  useMergeContactFields,
  useMergeAccountFields,
} from '@/hooks/useEmploymentIntakeActions'
import { computeContactMergeDiff, computeAccountMergeDiff, type MergeFieldDiff } from '@/lib/employment-intake/mergeCompare'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

interface Props {
  row: RowWithAction | null
  target: 'contact' | 'account' | null
  targetId: number | null
  onClose: () => void
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '(ריק)'
  return String(v)
}

export function IntakeMergeDialog({ row, target, targetId, onClose }: Props) {
  const contactData = useContactCompareData(target === 'contact' ? targetId : null)
  const accountData = useAccountCompareData(target === 'account' ? targetId : null)
  const mergeContact = useMergeContactFields()
  const mergeAccount = useMergeAccountFields()

  const diffs: MergeFieldDiff[] =
    row && target === 'contact' && contactData.data
      ? computeContactMergeDiff(row, contactData.data)
      : row && target === 'account' && accountData.data
        ? computeAccountMergeDiff(row, accountData.data)
        : []

  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    setChecked(new Set(diffs.filter((d) => d.fillsEmpty).map((d) => d.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id, target, targetId, contactData.data, accountData.data])

  if (!row || !target || targetId == null) return null

  const confirmedRow = row
  const confirmedId = targetId

  const isLoading = target === 'contact' ? contactData.isLoading : accountData.isLoading
  const isPending = mergeContact.isPending || mergeAccount.isPending

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleSave() {
    const patch: Record<string, unknown> = {}
    for (const d of diffs) if (checked.has(d.key)) patch[d.key] = d.incoming
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    if (target === 'contact') {
      mergeContact.mutate({ row: confirmedRow, contactId: confirmedId, patch }, { onSuccess: onClose })
    } else {
      mergeAccount.mutate({ row: confirmedRow, accountId: confirmedId, patch }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>מיזוג מידע ל{target === 'contact' ? 'איש הקשר' : 'ארגון'} הקיים</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-[13px] text-[#6B6B6B]">טוען נתונים…</p>
        ) : diffs.length === 0 ? (
          <p className="text-[13px] text-[#6B6B6B]">אין מידע חדש למיזוג — כל השדות שחולצו כבר תואמים לרשומה הקיימת.</p>
        ) : (
          <div className="space-y-2">
            {diffs.map((d) => (
              <label key={d.key} className="flex items-start gap-3 rounded-[10px] border border-[#D9D9D9] p-3">
                <input type="checkbox" checked={checked.has(d.key)} onChange={() => toggle(d.key)} className="mt-1 h-4 w-4 accent-[#008080]" />
                <div className="text-[13px]">
                  <div className="font-semibold text-[#2D2D2D]">{d.label}</div>
                  <div className="text-[#6B6B6B]">
                    {formatValue(d.current)} ← <span className="font-semibold text-[#008080]">{formatValue(d.incoming)}</span>
                  </div>
                  {!d.fillsEmpty && <div className="text-[12px] text-[#D97706]">⚠ יחליף ערך קיים</div>}
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" icon={Merge} disabled={diffs.length === 0 || isPending} onClick={handleSave}>
            {isPending ? 'ממזג…' : 'מיזוג השדות שנבחרו'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
