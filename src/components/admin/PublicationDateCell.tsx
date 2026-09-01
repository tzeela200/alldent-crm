/**
 * תא "פרסום אחרון" הניתן לעריכה — לרישום פרסום שנשלח **אישית**, לא דרך קמפיין.
 *
 * העריכה מתבצעת בתוך התא עצמו. רוחב העמודה קבוע בשני המצבים (תצוגה ועריכה)
 * כדי שהטבלה לא תזוז כשנכנסים לעריכה — הלקח מ-INC-3129.
 *
 * מה שנשמר הוא **אירוע אמיתי** בהיסטוריית הפרסומים, ולא רק תאריך על הרשומה.
 * ראו ההסבר המלא ב-useManualPublication.ts.
 */

import { useState } from 'react'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  useRecordManualPublication, useDeleteManualPublication, MANUAL_STATUS_OPTIONS,
} from '@/hooks/useManualPublication'
import { type DeliveryStatusCode } from '@/lib/fixPublications/deliveryStatus'

/** רוחב זהה בשני המצבים — אחרת הטבלה קופצת ברגע שנכנסים לעריכה */
export const PUBLICATION_DATE_CELL_WIDTH = '260px'

const INPUT_CLASS =
  'h-8 rounded-[8px] border border-[#D9D9D9] bg-white px-2 text-[12px] text-[#2D2D2D] outline-none focus:border-[#008080]'

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

interface Props {
  contactId: number
  phoneNorm: string | null
  lastSentAt: string | null
  lastStatus: string | null
  /** האם כבר קיים רישום ידני לאדם הזה — קובע אם מוצג כפתור המחיקה */
  hasManualRecord: boolean
}

export function PublicationDateCell({
  contactId, phoneNorm, lastSentAt, lastStatus, hasManualRecord,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<DeliveryStatusCode>('submitted')

  const record = useRecordManualPublication()
  const remove = useDeleteManualPublication()
  const busy = record.isPending || remove.isPending

  const open = () => {
    setDate(toDateInputValue(lastSentAt) || toDateInputValue(new Date().toISOString()))
    const known = MANUAL_STATUS_OPTIONS.find((o) => o.code === lastStatus)
    setStatus(known?.code ?? 'submitted')
    setEditing(true)
  }

  const save = () => {
    record.mutate(
      { contactId, phoneNorm, date, status, currentLastSent: lastSentAt },
      {
        onSuccess: (res) => {
          toast.success(
            res.replaced ? 'הרישום האישי עודכן.' : 'נרשם פרסום אישי.',
            {
              description: res.updatedSummary
                ? undefined
                : 'קיים פרסום מאוחר יותר, ולכן „פרסום אחרון" לא השתנה. הרישום נשמר בהיסטוריה.',
            },
          )
          setEditing(false)
        },
        onError: (err) => toast.error((err as Error).message),
      },
    )
  }

  const del = () => {
    if (!window.confirm('למחוק את הרישום האישי? אירועי קמפיין לא ימחקו.')) return
    remove.mutate(contactId, {
      onSuccess: () => { toast.success('הרישום האישי נמחק.'); setEditing(false) },
      onError: (err) => toast.error((err as Error).message),
    })
  }

  if (!editing) {
    return (
      <div
        className="group flex items-center gap-1.5"
        style={{ width: PUBLICATION_DATE_CELL_WIDTH }}
      >
        <span>{formatDate(lastSentAt)}</span>
        {hasManualRecord && (
          <span
            title="נרשם ידנית — פרסום אישי"
            className="rounded-full bg-[#E6F3F3] px-1.5 py-0.5 text-[10px] font-semibold text-[#008080]"
          >
            אישי
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); open() }}
          title="רישום פרסום אישי"
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
      style={{ width: PUBLICATION_DATE_CELL_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={busy}
        className={`${INPUT_CLASS} w-[122px]`}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as DeliveryStatusCode)}
        disabled={busy}
        className={`${INPUT_CLASS} w-[74px]`}
      >
        {MANUAL_STATUS_OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>{o.label}</option>
        ))}
      </select>
      <button
        type="button" onClick={save} disabled={busy || !date}
        title="שמירה"
        className="rounded-md p-1 text-[#0F7B6C] hover:bg-[#E6F3F3] disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      {hasManualRecord && (
        <button
          type="button" onClick={del} disabled={busy}
          title="מחיקת הרישום האישי"
          className="rounded-md p-1 text-[#D96C6C] hover:bg-red-50 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <button
        type="button" onClick={() => setEditing(false)} disabled={busy}
        title="ביטול"
        className="rounded-md p-1 text-[#6B6B6B] hover:bg-slate-100 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
