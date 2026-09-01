import { RefreshCw } from 'lucide-react'
import { googleAccountLabel } from '@/lib/inbox-v2-decisions'
import {
  useGoogleSyncStatus,
  israelDate,
  israelTime,
  type GoogleAccountSync,
} from '@/hooks/useGoogleSyncStatus'

/**
 * מחוון מצב הסנכרון מ-Google Contacts (INC-3125).
 *
 * יושב בכותרת המסך, ליד בורר העמודות, ובאותה תבנית `details/summary` —
 * צ'יפ קטן שנפתח לפירוט.
 *
 * הכרטיס מפריד בין שני דברים שהיו מעורבבים לתאריך אחד:
 *   סריקה — החשבון נקרא בהרצה
 *   תור    — נכנסה ממנו שורה לטיפול
 * חשבון יכול להיסרק כל שעתיים ובכל זאת לא להכניס כלום לתור, וזה תקין.
 * בלי ההפרדה הזו המסך נראה כאילו החשבון מת כבר שבוע.
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

/** חותמת מלאה: "היום 10:00" / "28.8.2026 08:00" / "—". */
function stamp(d: Date | null): string {
  return d ? `${israelDate(d)} ${israelTime(d)}` : '—'
}

function ModeBadge({ account }: { account: GoogleAccountSync }) {
  const recovery = account.mode === 'recovery'
  return (
    <span
      className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold ${
        recovery
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
      title={
        recovery
          ? 'קריאה מחדש של כל ספר הכתובות, עמוד אחד בכל הרצה'
          : 'סנכרון רגיל — רק מה שהשתנה'
      }
    >
      {recovery
        ? `Recovery${account.recoveryPage ? ` · עמוד ${account.recoveryPage}` : ''}`
        : 'Delta'}
    </span>
  )
}

function AccountRow({ account }: { account: GoogleAccountSync }) {
  return (
    <div className="px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-semibold text-[#2D2D2D]">
          {googleAccountLabel(account.key) ?? account.key}
        </span>
        <ModeBadge account={account} />
      </div>

      <dl className="space-y-0.5 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#9CA3AF]">סריקה אחרונה</dt>
          <dd className="font-medium text-[#2D2D2D]">{stamp(account.scannedAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#9CA3AF]">כניסה אחרונה לתור</dt>
          <dd className="text-[#6B6B6B]">
            {account.lastQueuedAt ? stamp(account.lastQueuedAt) : 'טרם נכנס מידע'}
          </dd>
        </div>
      </dl>
    </div>
  )
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
        className="absolute left-0 top-full z-30 mt-2 w-[21rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-md"
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
                <AccountRow key={a.key} account={a} />
              ))}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-[#9CA3AF]">
              סריקה = החשבון נקרא בהרצה. תור = מתי נכנסה ממנו שורה לטיפול.
              חשבון יכול להיסרק בלי להכניס דבר לתור.
            </p>
          </>
        )}
      </div>
    </details>
  )
}
