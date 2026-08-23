import { RefreshCw } from 'lucide-react'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { googleAccountLabel } from '@/lib/inbox-v2-decisions'
import {
  useGoogleSyncStatus,
  israelDate,
  israelTime,
} from '@/hooks/useGoogleSyncStatus'

/**
 * חלון מצב הסנכרון מ-Google Contacts (INC-3125).
 *
 * עונה על שאלה אחת: מתי הסנכרון רץ ומה נכנס מכל חשבון. בלי זה, תור ריק
 * יכול להיות "אין שינויים" או "הסנכרון לא הביא כלום" — ואי אפשר להבדיל.
 *
 * הכיוון הנכנס בלבד (Google → Supabase). כל הזמנים בשעון ישראל.
 * שמות החשבונות מגיעים מ-`googleAccountLabel` הקיים — אין כאן מיפוי משלנו.
 */
export function GoogleSyncStatusCard() {
  const { data, isLoading, error } = useGoogleSyncStatus()

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-4 text-[12px] text-slate-400 shadow-sm ring-1 ring-slate-200">
        טוען מצב סנכרון…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[#FEF2F2] p-4 text-[12px] font-medium text-[#B42318] ring-1 ring-[#FECDCA]">
        {error instanceof Error ? error.message : 'טעינת מצב הסנכרון נכשלה'}
      </div>
    )
  }

  if (!data?.lastRunAt) {
    return (
      <div className="rounded-2xl bg-white p-4 text-[12px] text-slate-400 shadow-sm ring-1 ring-slate-200">
        אין עדיין נתוני סנכרון מ-Google.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#008080]" />
          <span className="text-[13px] font-bold text-[#2D2D2D]">סנכרון Google</span>
          <span className="text-[11px] text-[#9CA3AF]">נכנס בלבד</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          <span>
            הרצה אחרונה <strong className="text-[#2D2D2D]">{israelTime(data.lastRunAt)}</strong>
          </span>
          {data.nextRunLabel && <span className="text-[#9CA3AF]">· הבאה {data.nextRunLabel}</span>}
          {data.status && (
            <AdminBadge
              label={data.status === 'success' ? 'תקין' : data.status === 'partial' ? 'חלקי' : 'נכשל'}
              variant={data.status === 'success' ? 'success' : data.status === 'partial' ? 'amber' : 'error'}
            />
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {data.accounts.map((a) => (
          <div
            key={a.key}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px]"
          >
            <span className="font-medium text-[#2D2D2D]">
              {googleAccountLabel(a.key) ?? a.key}
            </span>
            <span className="text-[#6B6B6B]">
              <span className="text-[#9CA3AF]">מידע אחרון שנכנס: </span>
              {a.lastRowAt
                ? `${israelDate(a.lastRowAt)} ${israelTime(a.lastRowAt)}`
                : 'טרם נכנס מידע'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
