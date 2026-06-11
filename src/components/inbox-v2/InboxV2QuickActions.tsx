import { useState } from 'react'
import { Ban, CheckCircle2, Eye, EyeOff, Tag, XCircle } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Mutations } from '@/hooks/useInboxV2'
import { toast } from 'sonner'

interface Props {
  selectedIds: number[]
  onClearSelection: () => void
}

export function InboxV2QuickActions({ selectedIds, onClearSelection }: Props) {
  const { bulkUpdateStatus, bulkAddTag } = useInboxV2Mutations()
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  const count = selectedIds.length

  const doAction = async (status: number, label: string) => {
    await bulkUpdateStatus.mutateAsync({ leadIds: selectedIds, status })
    toast.success(`${count} רשומות עודכנו ל-${label}`)
    onClearSelection()
  }

  const doAddTag = async () => {
    if (!tagInput.trim()) return
    await bulkAddTag.mutateAsync({ leadIds: selectedIds, tag: tagInput.trim() })
    toast.success(`תגית "${tagInput.trim()}" נוספה ל-${count} רשומות`)
    setTagInput('')
    setShowTagInput(false)
    onClearSelection()
  }

  const isPending = bulkUpdateStatus.isPending || bulkAddTag.isPending

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-teal-50 p-3 ring-1 ring-teal-200">
      <span className="text-sm font-semibold text-teal-800">{count} רשומות נבחרו</span>
      <div className="mx-1 h-5 w-px bg-teal-200" />

      <ActionButton
        variant="secondary"
        icon={CheckCircle2}
        size="sm"
        onClick={() => doAction(5, 'ממתין לאישור')}
        disabled={isPending}
      >
        אשר
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={XCircle}
        size="sm"
        onClick={() => doAction(7, 'נדחה')}
        disabled={isPending}
      >
        דחה
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={EyeOff}
        size="sm"
        onClick={() => doAction(8, 'התעלמות')}
        disabled={isPending}
      >
        התעלם
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={Ban}
        size="sm"
        onClick={() => doAction(9, 'לא דנטלי')}
        disabled={isPending}
      >
        לא דנטלי
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={Eye}
        size="sm"
        onClick={() => doAction(5, 'סימון לבדיקה')}
        disabled={isPending}
      >
        לבדיקה
      </ActionButton>

      <div className="mx-1 h-5 w-px bg-teal-200" />

      {showTagInput ? (
        <div className="flex items-center gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="שם תגית..."
            className="h-8 w-32 rounded-lg border border-teal-300 bg-white px-2 text-xs outline-none focus:border-teal-500"
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

      <div className="mr-auto">
        <button
          onClick={onClearSelection}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          נקה בחירה
        </button>
      </div>
    </div>
  )
}
