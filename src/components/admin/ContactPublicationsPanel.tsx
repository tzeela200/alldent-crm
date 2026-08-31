/**
 * "פרסומים שנשלחו" — כל הקמפיינים שהאדם הזה נכלל בהם, מהחדש לישן.
 *
 * בנוי בתבנית של ContactHistoryPanel (כרטיס מתקפל, מונה בגלולה, שלושה
 * מצבים נפרדים לטעינה/שגיאה/ריק) כדי שהשניים ייראו כמו זוג ולא כשני
 * רכיבים שנכתבו בנפרד.
 *
 * זה המקום היחיד שבו רואים בקשת הסרה — היא אינה משתקפת בשדה הסיכום.
 */

import { useState } from 'react'
import { AlertCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react'

import { useContactPublications } from '@/hooks/useContactPublications'
import { getDeliveryStatusMeta, getFailureCategoryLabel } from '@/lib/fixPublications/deliveryStatus'
import { outcomeOf, getOutcomeMeta } from '@/lib/fixPublications/deliveryOutcome'
import { StatusPill } from '@/components/layout/Shell'

function fmt(ts: string | null): string {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return ts }
}

export default function ContactPublicationsPanel({ contactId }: { contactId: number }) {
  const { data, isLoading, isError, error } = useContactPublications(contactId)
  const [open, setOpen] = useState(false)

  const rows = data?.rows ?? []
  const optedOut = rows.some((r) => r.failure_category === 'opt_out')

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-800">פרסומים שנשלחו</span>
          {rows.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{rows.length}</span>
          )}
          {optedOut && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
              ביקש להפסיק לקבל פרסום
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : isError ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error instanceof Error ? error.message : 'טעינת היסטוריית הפרסומים נכשלה'}</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400">האדם הזה מעולם לא נכלל בקמפיין פרסום.</p>
          ) : (
            <div className="space-y-3">
              {optedOut && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>ביקש להפסיק לקבל פרסום בוואטסאפ. אין לכלול אותו בקמפיינים נוספים.</span>
                </div>
              )}

              {data?.truncated && (
                <p className="text-xs text-slate-500">מוצגים 200 הפרסומים האחרונים בלבד.</p>
              )}

              {rows.map((row) => {
                const status = getDeliveryStatusMeta(row.delivery_status)
                const outcome = getOutcomeMeta(
                  outcomeOf(row.delivery_status, row.failure_category, row.delivery_status_raw),
                )
                const reason = getFailureCategoryLabel(row.failure_category)
                return (
                  <div key={row.recipient_id} className="rounded-lg border border-slate-100 p-3">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {row.campaign_name || row.source_file_name || 'קמפיין ללא שם'}
                      </span>
                      <span className="text-xs text-slate-500">{fmt(row.sent_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={outcome.label} variant={outcome.tone} />
                      <span className="text-xs text-slate-600">{status.label}</span>
                      {reason && <span className="text-xs text-slate-500">· {reason}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
