/**
 * דיאלוג אישור גנרי לשלוש פעולות הליבה הפשוטות (§5.1): עדכון סטטוס ליד,
 * סימון לא רלוונטי, קישור לארגון. כולן דורשות checkbox אישור מפורש ומציגות
 * את הטקסט המקורי — לא ניתן לאשר בלעדיו (§3.6 כלל חוסם).
 */

import { useState } from 'react'
import { Check, LinkIcon, Ban } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useMarkLeadStatus, useMarkIrrelevant, useLinkContactToAccount } from '@/hooks/useEmploymentIntakeActions'
import { warningOrgEmployeeProfile, errorAlreadyHandled } from '@/lib/employment-intake/labels'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

export type ConfirmActionKind = 'lead_status' | 'irrelevant' | 'link_account'

interface Props {
  row: RowWithAction | null
  kind: ConfirmActionKind | null
  onClose: () => void
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

export function IntakeConfirmActionDialog({ row, kind, onClose }: Props) {
  const { data: dicts } = useEmploymentIntakeDicts()
  const markLeadStatus = useMarkLeadStatus()
  const markIrrelevant = useMarkIrrelevant()
  const linkAccount = useLinkContactToAccount()

  const [confirmed, setConfirmed] = useState(false)
  const [includeWorkStatus, setIncludeWorkStatus] = useState(false)
  const [alreadyDoneWarning, setAlreadyDoneWarning] = useState<{ at: string | null; by: string | null } | null>(null)

  if (!row || !kind) return null

  const statusLabel = dicts?.socialStatuses.find((s) => s.id === row.proposed_social_status)?.name ?? 'הסטטוס המוצע'
  const showWorkStatusOption = kind === 'lead_status' && row.content_type === 'job_seeker' && row.is_active_request !== false
  const isPending = markLeadStatus.isPending || markIrrelevant.isPending || linkAccount.isPending

  function handleConfirm(force = false) {
    if (!row || !kind) return
    if (kind === 'lead_status') {
      if (row.proposed_social_status == null) return
      markLeadStatus.mutate(
        { row, statusId: row.proposed_social_status, statusLabel, includeWorkStatus, force },
        {
          onSuccess: (result) => {
            if (result.alreadyDone) setAlreadyDoneWarning({ at: result.lastActionAt, by: result.lastActionBy })
            else onClose()
          },
        },
      )
    } else if (kind === 'irrelevant') {
      markIrrelevant.mutate({ row }, { onSuccess: onClose })
    } else if (kind === 'link_account') {
      if (row.match_contact == null || row.match_account == null) return
      linkAccount.mutate({ row, contactId: row.match_contact, accountId: row.match_account }, { onSuccess: onClose })
    }
  }

  const title = kind === 'lead_status' ? 'עדכון סטטוס ליד' : kind === 'irrelevant' ? 'סימון לא רלוונטי' : 'קישור לארגון'

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#D9D9D9] bg-[#F9FAFB] p-3 text-[13px] text-[#6B6B6B]">{row.original_text}</div>

        {kind === 'lead_status' && (
          <>
            <p className="text-[14px] text-[#2D2D2D]">
              הסטטוס יעודכן ל־<span className="font-semibold">{statusLabel}</span>.
            </p>
            {showWorkStatusOption && (
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
                <input type="checkbox" checked={includeWorkStatus} onChange={(e) => setIncludeWorkStatus(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
                סימון גם כ"מחפש/ת עבודה פעיל/ה" (סטטוס עבודה)
              </label>
            )}
            {alreadyDoneWarning && (
              <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-3 text-[13px] text-[#8A5A1F]">
                {errorAlreadyHandled(formatDateTime(alreadyDoneWarning.at), alreadyDoneWarning.by ?? '—')}
                <div className="mt-2">
                  <ActionButton variant="secondary" size="sm" onClick={() => handleConfirm(true)} disabled={isPending}>
                    לבצע בכל זאת
                  </ActionButton>
                </div>
              </div>
            )}
          </>
        )}

        {kind === 'irrelevant' && <p className="text-[14px] text-[#2D2D2D]">הרשומה תסומן כלא רלוונטית (סטטוס ליד 12).</p>}

        {kind === 'link_account' && (
          <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-3 text-[13px] text-[#8A5A1F]">{warningOrgEmployeeProfile()}</div>
        )}

        <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
          אני מאשרת את הפעולה
        </label>

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={kind === 'irrelevant' ? Ban : kind === 'link_account' ? LinkIcon : Check}
            disabled={!confirmed || isPending || !!alreadyDoneWarning}
            onClick={() => handleConfirm(false)}
          >
            {isPending ? 'מבצע…' : 'אישור וביצוע'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
