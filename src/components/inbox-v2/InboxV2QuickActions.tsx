import { useState } from 'react'
import { Ban, CheckCircle2, Eye, EyeOff, Tag, XCircle } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import { toast } from 'sonner'

interface Props {
  selectedIds: number[]
  onClearSelection: () => void
}

/**
 * פעולות אצווה — מוצג בתוך משבצת ה-bulk של AdminTable (הספירה "N נבחרו" מגיעה משם).
 * הבחנה מחייבת (מקור אמת dict tables):
 *  - "סמן לאישור" = סטטוס (merge_status=5).
 *  - "לבדיקה" = פעולה (action_type=7) הנרשמת ביומן, ללא שינוי סטטוס.
 * כל פעולת אצווה נרשמת ב-inbox_merge_actions.
 */
export function InboxV2QuickActions({ selectedIds, onClearSelection }: Props) {
  const { bulkUpdateStatus, bulkAddTag, logAction } = useInboxV2Mutations()
  const { user } = useAuth()
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  const count = selectedIds.length
  const isPending = bulkUpdateStatus.isPending || bulkAddTag.isPending || logAction.isPending

  const logBulk = async (actionType: number | null, updates: Record<string, unknown>) => {
    await Promise.all(
      selectedIds.map((id) =>
        logAction.mutateAsync({
          lead_id: id,
          target_type: null,
          target_id: null,
          action_type: actionType,
          updates_applied: updates,
          approved_by: user?.email ?? null,
        })
      )
    )
  }

  // כישלון פעולת אצווה חייב להיראות. עד INC-3125 שתי הפעולות האלה לא היו
  // עטופות כלל, ולכן עדכון שנכשל לא הציג דבר — המשתמשת הניחה שהוא עבר.
  const setStatus = async (status: number, label: string, actionType: number | null) => {
    try {
      await bulkUpdateStatus.mutateAsync({ leadIds: selectedIds, status })
      await logBulk(actionType, { merge_status: status })
      toast.success(`${count} רשומות עודכנו ל-${label}`)
      onClearSelection()
    } catch (err) {
      toast.error(
        `עדכון ${count} הרשומות ל-${label} נכשל: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`
      )
    }
  }

  const flagForReview = async () => {
    // פעולה בלבד — לא משנה סטטוס (כך המילון מגדיר "סימון לבדיקה").
    try {
      await logBulk(INBOX_ACTION.FLAG_REVIEW, { flagged_for_review: true })
      toast.success(`${count} רשומות סומנו לבדיקה (ללא שינוי סטטוס)`)
      onClearSelection()
    } catch (err) {
      toast.error(
        `סימון ${count} הרשומות לבדיקה נכשל: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`
      )
    }
  }

  const doAddTag = async () => {
    if (!tagInput.trim()) return
    try {
      await bulkAddTag.mutateAsync({ leadIds: selectedIds, tag: tagInput.trim() })
      toast.success(`תגית "${tagInput.trim()}" נוספה ל-${count} רשומות`)
      setTagInput('')
      setShowTagInput(false)
      onClearSelection()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהוספת תגית')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <ActionButton
        variant="secondary"
        icon={CheckCircle2}
        size="sm"
        onClick={() => setStatus(5, 'ממתין לאישור', null)}
        disabled={isPending}
      >
        סמן לאישור
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={Eye}
        size="sm"
        onClick={flagForReview}
        disabled={isPending}
      >
        לבדיקה
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={XCircle}
        size="sm"
        onClick={() => setStatus(7, 'נדחה', INBOX_ACTION.REJECT)}
        disabled={isPending}
      >
        דחה
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={EyeOff}
        size="sm"
        onClick={() => setStatus(8, 'התעלמות', INBOX_ACTION.IGNORE)}
        disabled={isPending}
      >
        התעלם
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={Ban}
        size="sm"
        onClick={() => setStatus(9, 'לא דנטלי', null)}
        disabled={isPending}
      >
        לא דנטלי
      </ActionButton>

      {showTagInput ? (
        <div className="flex items-center gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="שם תגית..."
            className="h-8 w-32 rounded-lg border border-[#99D6D6] bg-white px-2 text-xs outline-none focus:border-[#008080]"
            onKeyDown={(e) => e.key === 'Enter' && doAddTag()}
            autoFocus
          />
          <ActionButton variant="primary" size="sm" onClick={doAddTag} disabled={isPending}>
            הוסף
          </ActionButton>
          <button
            onClick={() => setShowTagInput(false)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ביטול
          </button>
        </div>
      ) : (
        <ActionButton
          variant="secondary"
          icon={Tag}
          size="sm"
          onClick={() => setShowTagInput(true)}
          disabled={isPending}
        >
          הוסף תגית
        </ActionButton>
      )}

      <button
        onClick={onClearSelection}
        className="ms-auto text-xs font-medium text-[#008080] hover:text-[#006D6D]"
      >
        נקה בחירה
      </button>
    </div>
  )
}
