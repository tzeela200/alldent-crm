/**
 * תא "סטטוס שליחה" הניתן לעריכה.
 *
 * מאפשר לתקן ידנית מה שפיקס דיווח — בלי למחוק את מה שהוא דיווח. הערך
 * המקורי נשאר ב-`delivery_status_raw`, והתיקון מסומן בתגית „ידני" עם
 * הערך הקודם ב-tooltip.
 *
 * רוחב התא קבוע בשני המצבים כדי שהטבלה לא תזוז בכניסה לעריכה (לקח INC-3129).
 */

import { useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

import { StatusPill } from '@/components/layout/Shell'
import {
  DELIVERY_STATUS_ORDER, getDeliveryStatusMeta,
  type DeliveryStatusCode, type DeliveryTone,
} from '@/lib/fixPublications/deliveryStatus'
import { useOverrideDeliveryStatus } from '@/hooks/useOverrideDeliveryStatus'

/** רוחב זהה בתצוגה ובעריכה — אחרת הטבלה קופצת */
export const DELIVERY_STATUS_CELL_WIDTH = '250px'

const TONE_TO_PILL: Record<DeliveryTone, 'success' | 'warning' | 'danger' | 'default'> = {
  success: 'success', warning: 'warning', danger: 'danger', default: 'default',
}

interface Props {
  recipientId: number
  contactId: number | null
  campaignId: number
  status: DeliveryStatusCode
  /** הערך המקורי מפיקס — מוצג ב-tooltip ולעולם אינו משתנה */
  rawStatus: string | null
  /** הסטטוס שהיה לפני תיקון ידני, אם היה כזה */
  overriddenFrom: string | null
}

export function DeliveryStatusCell({
  recipientId, contactId, campaignId, status, rawStatus, overriddenFrom,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DeliveryStatusCode>(status)
  const override = useOverrideDeliveryStatus()

  const meta = getDeliveryStatusMeta(status)

  const open = () => { setDraft(status); setEditing(true) }

  const save = () => {
    override.mutate(
      { recipientId, contactId, campaignId, currentStatus: status, nextStatus: draft, rawStatus },
      {
        onSuccess: (res) => {
          if (res.changed) toast.success('הסטטוס עודכן. הערך המקורי מפיקס נשמר.')
          setEditing(false)
        },
        onError: (err) => toast.error(`העדכון נכשל: ${(err as Error).message}`),
      },
    )
  }

  if (!editing) {
    const tooltip = [
      rawStatus ? `הערך מפיקס: ${rawStatus}` : null,
      overriddenFrom ? `שונה ידנית מ־${getDeliveryStatusMeta(overriddenFrom).label}` : null,
    ].filter(Boolean).join(' · ')

    return (
      <div
        className="group flex items-center gap-1.5"
        style={{ width: DELIVERY_STATUS_CELL_WIDTH }}
      >
        <span title={tooltip || undefined}>
          <StatusPill label={meta.label} variant={TONE_TO_PILL[meta.tone]} />
        </span>
        {overriddenFrom && (
          <span
            title={tooltip}
            className="rounded-full bg-[#E6F3F3] px-1.5 py-0.5 text-[10px] font-semibold text-[#008080]"
          >
            ידני
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); open() }}
          title="תיקון הסטטוס"
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
      style={{ width: DELIVERY_STATUS_CELL_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value as DeliveryStatusCode)}
        disabled={override.isPending}
        className="h-8 flex-1 rounded-[8px] border border-[#D9D9D9] bg-white px-2 text-[12px] text-[#2D2D2D] outline-none focus:border-[#008080]"
      >
        {DELIVERY_STATUS_ORDER.map((code) => (
          <option key={code} value={code}>{getDeliveryStatusMeta(code).label}</option>
        ))}
      </select>
      <button
        type="button" onClick={save} disabled={override.isPending}
        title="שמירה"
        className="rounded-md p-1 text-[#0F7B6C] hover:bg-[#E6F3F3] disabled:opacity-40"
      >
        {override.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button" onClick={() => setEditing(false)} disabled={override.isPending}
        title="ביטול"
        className="rounded-md p-1 text-[#6B6B6B] hover:bg-slate-100 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
