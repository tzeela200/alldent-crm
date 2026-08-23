import { RefreshCw } from 'lucide-react'
import { googleAccountLabel } from '@/lib/inbox-v2-decisions'
import {
  useGoogleSyncStatus,
  israelDate,
  israelTime,
} from '@/hooks/useGoogleSyncStatus'

/**
 * מחוון מצב הסנכרון מ-Google Contacts (INC-3125).
 *
 * יושב בכותרת המסך, ליד בורר העמודות, ובאותה תבנית `details/summary` —
 * צ'יפ קטן שנפתח לפירוט. עונה על שאלה אחת: תור ריק הוא "אין שינויים"
 * או "הסנכרון לא הביא כלום"?
 *
 * הכיוון הנכנס בלבד (Google → Supabase). כל הזמנים בשעון ישראל.
 * שמות החשבונות מ-`googleAccountLabel` הקיים — אין כאן מיפוי משלנו.
 */

const DOT: Record<string, string> = {
  success: 'bg-[#10B981]',
  partial: 'bg-[#F59E0B]',
  failed: 'bg-[#EF4444]',
}

const STATUS_TEXT: Record<string, string> = {
  success: 'תקין',
  partial: 'חלקי',
  failed: 'נכשל',
}

export function GoogleSyncStatusCard() {
  const { data, isLoading, error } = useGoogleSyncStatus()

  const dot = error
    ? 'bg-[#EF4444]'
    : isLoading || !data?.status
      ? 'bg-slate-300'
      : (DOT[data.status] ?? 'bg-slate-300')

  return (
    <details className="relative">
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
        title="מצב הסנכרון מ-Google Contacts"
      >
        <RefreshCw className="h-4 w-4" />
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {isLoading ? 'סנכרון…' : data?.lastRunAt ? `סנכרון ${israelTime(data.lastRunAt)}` : 'סנכרון'}
      </summary>

      <div
        className="absolute left-0 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-md"
        dir="rtl"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-900">סנכרון Google</span>
          <span className="text-[11px] text-[#9CA3AF]">נכנס בלבד</span>
        </div>

        {error ? (
          <p className="py-2 text-[12px] font-medium text-[#B42318]">
            {error instanceof Error ? error.message : 'טעינת מצב הסנכרון נכשלה'}
          </p>
        ) : isLoading ? (
          <p className="py-2 text-[12px] text-slate-400">טוען…</p>
        ) : !data?.lastRunAt ? (
          <p className="py-2 text-[12px] text-slate-400">אין עדיין נתוני סנכרון.</p>
        ) : (
          <>
            <p className="mb-2 text-[12px] text-[#6B6B6B]">
              הרצה אחרונה <strong className="text-[#2D2D2D]">{israelTime(data.lastRunAt)}</strong>
              {data.status && <> · {STATUS_TEXT[data.status] ?? data.status}</>}
              {data.nextRunLabel && (
                <span className="text-[#9CA3AF]"> · הבאה {data.nextRunLabel}</span>
              )}
            </p>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {data.accounts.map((a) => (
                <div key={a.key} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-[12px] font-medium text-[#2D2D2D]">
                    {googleAccountLabel(a.key) ?? a.key}
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    {a.lastRowAt
                      ? `${israelDate(a.lastRowAt)} ${israelTime(a.lastRowAt)}`
                      : 'טרם נכנס מידע'}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-[#9CA3AF]">
              התאריך שליד כל חשבון הוא מתי נכנס ממנו מידע לאחרונה.
            </p>
          </>
        )}
      </div>
    </details>
  )
}
