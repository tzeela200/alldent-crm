/**
 * השוואה ועדכון ברמת שדה: הקיים ב-Supabase / הערך מהמקור / ערך אחר.
 * ברירת מחדל: מידע חדש לשדה ריק נבחר; קונפליקט אמיתי נשאר על Supabase
 * עד שהמשתמשת מחליטה במפורש. אין דריסה שקטה.
 */

import { useEffect, useMemo, useState } from 'react'
import { Merge } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import {
  useContactCompareData,
  useAccountCompareData,
  useMergeContactFields,
  useMergeAccountFields,
} from '@/hooks/useEmploymentIntakeActions'
import { computeContactMergeDiff, computeAccountMergeDiff, type MergeFieldDiff } from '@/lib/employment-intake/mergeCompare'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

type Choice = 'supabase' | 'incoming' | 'manual'

interface Props {
  row: RowWithAction | null
  target: 'contact' | 'account' | null
  targetId: number | null
  onClose: () => void
}

function isDictionaryField(key: string) {
  return key === 'role' || key === 'city_id'
}

function isLtrField(key: string) {
  return key.includes('phone') || key.includes('email') || key.includes('facebook')
}

export function IntakeMergeDialog({ row, target, targetId, onClose }: Props) {
  const { data: appDicts } = useApplicationDicts()
  const contactData = useContactCompareData(target === 'contact' ? targetId : null)
  const accountData = useAccountCompareData(target === 'account' ? targetId : null)
  const mergeContact = useMergeContactFields()
  const mergeAccount = useMergeAccountFields()

  const diffs: MergeFieldDiff[] = useMemo(() => (
    row && target === 'contact' && contactData.data
      ? computeContactMergeDiff(row, contactData.data)
      : row && target === 'account' && accountData.data
        ? computeAccountMergeDiff(row, accountData.data)
        : []
  ), [row, target, contactData.data, accountData.data])

  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [manualValues, setManualValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const next: Record<string, Choice> = {}
    for (const d of diffs) next[d.key] = d.fillsEmpty ? 'incoming' : 'supabase'
    setChoices(next)
    setManualValues({})
  }, [row?.id, target, targetId, diffs])

  if (!row || !target || targetId == null) return null

  const isLoading = target === 'contact' ? contactData.isLoading : accountData.isLoading
  const isPending = mergeContact.isPending || mergeAccount.isPending

  function displayValue(key: string, value: unknown): string {
    if (value == null || value === '') return 'ריק'
    if (key === 'role' && typeof value === 'number') return getDictLabel(appDicts?.roles, value)
    if (key === 'city_id' && typeof value === 'number') return getDictLabel(appDicts?.cities, value)
    return String(value)
  }

  function manualEditor(diff: MergeFieldDiff) {
    const value = manualValues[diff.key] ?? ''
    if (diff.key === 'role') {
      return (
        <select
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => setManualValues((m) => ({ ...m, [diff.key]: e.target.value ? Number(e.target.value) : null }))}
          className="mt-2 h-9 w-full rounded-[9px] border border-[#D9D9D9] bg-white px-2 text-[13px] outline-none focus:border-[#008080]"
        >
          <option value="">בחרי תפקיד…</option>
          {(appDicts?.roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )
    }
    if (diff.key === 'city_id') {
      return (
        <select
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => setManualValues((m) => ({ ...m, [diff.key]: e.target.value ? Number(e.target.value) : null }))}
          className="mt-2 h-9 w-full rounded-[9px] border border-[#D9D9D9] bg-white px-2 text-[13px] outline-none focus:border-[#008080]"
        >
          <option value="">בחרי עיר…</option>
          {(appDicts?.cities ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )
    }
    return (
      <input
        value={String(value ?? '')}
        dir={isLtrField(diff.key) ? 'ltr' : 'auto'}
        onChange={(e) => setManualValues((m) => ({ ...m, [diff.key]: e.target.value }))}
        placeholder="הקלידי ערך נכון"
        className="mt-2 h-9 w-full rounded-[9px] border border-[#D9D9D9] bg-white px-2 text-[13px] outline-none focus:border-[#008080]"
      />
    )
  }

  function handleSave() {
    if (!row || targetId == null) return
    const patch: Record<string, unknown> = {}
    const before: Record<string, unknown> = {}

    for (const diff of diffs) {
      const choice = choices[diff.key] ?? 'supabase'
      if (choice === 'supabase') continue
      const nextValue = choice === 'incoming' ? diff.incoming : manualValues[diff.key]
      if (nextValue == null || nextValue === '') continue
      patch[diff.key] = nextValue
      before[diff.key] = diff.current
    }

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    if (target === 'contact') {
      mergeContact.mutate({ row, contactId: targetId, patch, before }, { onSuccess: onClose })
    } else {
      mergeAccount.mutate({ row, accountId: targetId, patch, before }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>השוואה ועדכון {target === 'contact' ? 'איש קשר' : 'ארגון'}</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#D9D9D9] bg-[#F9FAFB] p-3 text-[13px] text-[#6B6B6B]">
          בחרי את הערך הנכון לכל שדה. שדה ריק ב-Supabase מקבל כברירת מחדל את המידע החדש; קונפליקט אינו נדרס בלי בחירה מפורשת.
        </div>

        {isLoading ? (
          <p className="py-4 text-[13px] text-[#6B6B6B]">טוען נתונים…</p>
        ) : diffs.length === 0 ? (
          <p className="py-4 text-[13px] text-[#6B6B6B]">אין שדות שונים לעדכון.</p>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-[#D9D9D9]">
            <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-0 border-b border-[#D9D9D9] bg-[#F3F4F6] text-[12px] font-bold text-[#6B6B6B]">
              <div className="p-3">שדה</div>
              <div className="p-3">Supabase</div>
              <div className="p-3">מהמקור</div>
              <div className="p-3">הבחירה שלי</div>
            </div>
            {diffs.map((diff) => {
              const choice = choices[diff.key] ?? 'supabase'
              return (
                <div key={diff.key} className="grid grid-cols-[140px_1fr_1fr_1fr] border-b border-[#F3F4F6] text-[13px] last:border-b-0">
                  <div className="p-3 font-semibold text-[#2D2D2D]">{diff.label}</div>
                  <label className={`cursor-pointer p-3 ${choice === 'supabase' ? 'bg-[#E6F3F3]' : ''}`}>
                    <div className="flex items-start gap-2">
                      <input type="radio" name={`choice-${diff.key}`} checked={choice === 'supabase'} onChange={() => setChoices((c) => ({ ...c, [diff.key]: 'supabase' }))} className="mt-0.5 accent-[#008080]" />
                      <span dir={isLtrField(diff.key) ? 'ltr' : 'auto'}>{displayValue(diff.key, diff.current)}</span>
                    </div>
                  </label>
                  <label className={`cursor-pointer p-3 ${choice === 'incoming' ? 'bg-[#FFF7E8]' : ''}`}>
                    <div className="flex items-start gap-2">
                      <input type="radio" name={`choice-${diff.key}`} checked={choice === 'incoming'} onChange={() => setChoices((c) => ({ ...c, [diff.key]: 'incoming' }))} className="mt-0.5 accent-[#D97706]" />
                      <span dir={isLtrField(diff.key) ? 'ltr' : 'auto'}>{displayValue(diff.key, diff.incoming)}</span>
                    </div>
                    {diff.fillsEmpty && <div className="mt-1 text-[11px] text-[#008080]">השלמת מידע חסר</div>}
                  </label>
                  <div className={`p-3 ${choice === 'manual' ? 'bg-[#FFFBEB]' : ''}`}>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input type="radio" name={`choice-${diff.key}`} checked={choice === 'manual'} onChange={() => setChoices((c) => ({ ...c, [diff.key]: 'manual' }))} className="mt-0.5 accent-[#D97706]" />
                      <span>ערך אחר</span>
                    </label>
                    {choice === 'manual' && manualEditor(diff)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>ביטול</ActionButton>
          <ActionButton variant="primary" icon={Merge} disabled={diffs.length === 0 || isPending} onClick={handleSave}>
            {isPending ? 'שומר…' : 'שמור בחירות ועדכן'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
