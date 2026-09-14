/**
 * תא "מצב" במאגר לפי פרסום — מציג את ההחלטה, ומאפשר לסמן „חסום" ידנית.
 *
 * רק החסימה נבחרת ידנית. "הגיע", "נכשל" ו"מעולם לא נשלח" נגזרים מדוחות פיקס
 * ומהתאריך, ולכן אינם מוצעים כאן — שינוי שלהם הוא דרך עמודת "פרסום אחרון".
 *
 * רוחב התא קבוע בשני המצבים כדי שהטבלה לא תזוז בכניסה לעריכה (לקח INC-3129).
 */

import { useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

import { StatusPill } from '@/components/layout/Shell'
import {
  getOutcomeMeta, blockReasonOf, BLOCK_REASON_LABELS, isRemovedFromPublishing,
  type DeliveryOutcome,
} from '@/lib/fixPublications/deliveryOutcome'
import { usePublicationBlock } from '@/hooks/usePublicationBlock'

export const PUBLICATION_OUTCOME_CELL_WIDTH = '230px'

type Choice = 'block' | 'unblock'

interface Props {
  contactId: number
  outcome: DeliveryOutcome
  lastStatus: string | null
  socialStatus: number | null
  isOptedOut: boolean
}

export function PublicationOutcomeCell({
  contactId, outcome, lastStatus, socialStatus, isOptedOut,
}: Props) {
  const [editing, setEditing] = useState(false)
  const removed = isRemovedFromPublishing(socialStatus)
  const [choice, setChoice] = useState<Choice>(removed ? 'unblock' : 'block')
  const { block, unblock } = usePublicationBlock()
  const busy = block.isPending || unblock.isPending

  const meta = getOutcomeMeta(outcome)
  const reason = outcome === 'do_not_send'
    ? blockReasonOf({ isOptedOut, lastStatus, socialStatus })
    : null
  const label = reason ? `${meta.label} · ${BLOCK_REASON_LABELS[reason]}` : meta.label

  // חסימה שנגזרת מפיקס בלי סימון „הסרה" — אין שדה לבטל
  const derivedOnly = outcome === 'do_not_send' && !removed

  const open = () => { setChoice(removed ? 'unblock' : 'block'); setEditing(true) }

  const save = () => {
    if (choice === 'block') {
      if (removed) { setEditing(false); return }
      block.mutate(contactId, {
        onSuccess: () => { toast.success('הרשומה סומנה חסומה לפרסום.'); setEditing(false) },
        onError: (err) => toast.error(`הסימון נכשל: ${(err as Error).message}`),
      })
      return
    }
    if (!removed) { setEditing(false); return }
    unblock.mutate(contactId, {
      onSuccess: (res) => {
        toast.success(
          res.restored != null
            ? 'החסימה בוטלה וסטטוס הפנייה הקודם שוחזר.'
            : 'החסימה בוטלה.',
          derivedOnly || lastStatus === 'failed_device'
            ? { description: 'שימי לב: לפי פיקס אין וואטסאפ על המספר, ולכן הרשומה עדיין תוצג כחסומה.' }
            : undefined,
        )
        setEditing(false)
      },
      onError: (err) => toast.error(`הביטול נכשל: ${(err as Error).message}`),
    })
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-1.5" style={{ width: PUBLICATION_OUTCOME_CELL_WIDTH }}>
        <span title={meta.description}><StatusPill label={label} variant={meta.tone} /></span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); open() }}
          title="סימון חסימה לפרסום"
          className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5 text-[#008080]" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1"
      style={{ width: PUBLICATION_OUTCOME_CELL_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value as Choice)}
        disabled={busy}
        className="h-8 flex-1 rounded-[8px] border border-[#D9D9D9] bg-white px-2 text-[12px] text-[#2D2D2D] outline-none focus:border-[#008080]"
      >
        <option value="block">חסום — הוסר מפרסום</option>
        <option value="unblock" disabled={!removed}>
          {removed ? 'בטלי חסימה' : 'בטלי חסימה (לא סומנה ידנית)'}
        </option>
      </select>
      <button
        type="button" onClick={save} disabled={busy} title="שמירה"
        className="rounded-md p-1 text-[#0F7B6C] hover:bg-[#E6F3F3] disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button" onClick={() => setEditing(false)} disabled={busy} title="ביטול"
        className="rounded-md p-1 text-[#6B6B6B] hover:bg-slate-100 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
