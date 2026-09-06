import { useState } from 'react'
import { Search, ShieldCheck, UserPlus, Loader2, Mail, Phone } from 'lucide-react'
import { Toolbar, ActionButton } from '@/components/layout/Shell'
import { AdminBadge, type AdminBadgeVariant } from '@/components/admin/AdminBadge'
import {
  useInboxPhoneCheck,
  summarize,
  type PhoneCheckResult,
  type PhoneCheckStatus,
} from '@/hooks/useInboxPhoneCheck'
import { formatPhone } from '@/lib/normalizePhone'
import { CreateFromLeadDialog } from '@/components/inbox-v2/CreateFromLeadDialog'

/**
 * בדיקת נייד ומייל (INC-3125, הורחב ל-מייל ב-INC-3139).
 *
 * ⚠ שלב הבדיקה הוא **קריאה בלבד** — אין כתיבה ל-Inbox, ל-Batch או ל-Audit.
 * זו בדיוק ההבחנה מול תיבת ההדבקה של הייבוא, שכותבת מיד למסד.
 *
 * המטרה היא דו-כיוונית: לא רק "מי כבר קיים", אלא בעיקר **מי לא קיים** —
 * ומשם מסלול מפורש להוספה למאגר. ההוספה לעולם אינה אוטומטית: היא
 * דורשת לחיצה, שם, ואישור.
 *
 * הרשימה יכולה להיות מעורבת. שורה שיש בה `@` נבדקת כמייל, כל השאר כנייד —
 * אין מתג ואין לשונית נפרדת, כדי שאפשר יהיה להדביק רשימה כפי שהיא.
 */

const STATUS_META: Record<PhoneCheckStatus, { label: string; variant: AdminBadgeVariant }> = {
  found: { label: 'קיים במאגר', variant: 'success' },
  new: { label: 'לא קיים — ניתן להוסיף', variant: 'teal' },
  invalid: { label: 'ערך לא תקין', variant: 'error' },
}

const ROW_BG: Record<PhoneCheckStatus, string> = {
  found: 'bg-[#F0FDF4]',
  new: 'bg-[#E6F3F3]',
  invalid: 'bg-[#FEF2F2]',
}

/** "נייד נוסף" / "מייל נוסף" — לפי מה שנבדק, לא לפי מה שנמצא. */
function matchLabel(r: PhoneCheckResult, field: 'primary' | 'secondary', kind: 'contact' | 'account') {
  const entity = kind === 'contact' ? 'איש קשר' : 'ארגון'
  if (field === 'primary') return entity
  return `${entity} (${r.kind === 'email' ? 'מייל נוסף' : 'נייד נוסף'})`
}

export function PhoneCheckPanel() {
  const [text, setText] = useState('')
  const { results, isChecking, error, check, reset } = useInboxPhoneCheck()
  const [addingFor, setAddingFor] = useState<PhoneCheckResult | null>(null)

  const summary = results ? summarize(results) : null

  return (
    <div className="space-y-4" dir="rtl">
      <Toolbar>
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-[10px] bg-[#F0FDF4] px-3 py-2 text-[12px] text-[#166534]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              הבדיקה היא קריאה בלבד — שום ערך לא נשמר, לא נוצרת רשומה ולא נרשמת פעולה.
              הוספה למאגר מתבצעת רק בלחיצה מפורשת על ערך שלא נמצא.
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              הדביקו ניידים ומיילים — שורה לכל ערך, או מופרדים בפסיק. אפשר לערבב.
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              dir="ltr"
              placeholder={'0501234567\n052-765-4321\ndana@example.com\n+972541112222'}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition-colors placeholder:text-slate-300 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              variant="primary"
              icon={Search}
              onClick={() => check(text)}
              disabled={isChecking || !text.trim()}
            >
              {isChecking ? 'בודק...' : 'בדוק מול המאגר'}
            </ActionButton>
            {results && (
              <button
                onClick={() => {
                  reset()
                  setText('')
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                נקה
              </button>
            )}
          </div>
        </div>
      </Toolbar>

      {error && (
        <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#B42318]">
          {error}
        </div>
      )}

      {isChecking && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          בודק מול המאגר...
        </div>
      )}

      {summary && results && !isChecking && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="נבדקו" value={summary.total} />
            <SummaryCard label="קיימים במאגר" value={summary.found} tone="success" />
            <SummaryCard label="לא קיימים" value={summary.isNew} tone="teal" />
            <SummaryCard label="לא תקינים" value={summary.invalid} tone="error" />
          </div>

          {summary.phones > 0 && summary.emails > 0 && (
            <div className="text-[12px] text-[#9CA3AF]">
              מתוכם {summary.phones} ניידים ו-{summary.emails} מיילים.
            </div>
          )}

          {summary.duplicatesInInput > 0 && (
            <div className="rounded-[10px] bg-[#FFFBEB] px-4 py-2 text-[12px] text-[#92400E]">
              {summary.duplicatesInInput} ערכים חוזרים ברשימה שהודבקה — נבדקו פעם אחת.
            </div>
          )}

          <div className="space-y-2">
            {results.map((r) => {
              const meta = STATUS_META[r.status]
              const Icon = r.kind === 'email' ? Mail : Phone
              return (
                <div
                  key={r.index}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-4 py-3 text-[13px] ${ROW_BG[r.status]}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                    <span className="font-semibold text-[#2D2D2D]" dir="ltr">
                      {r.kind === 'phone' && r.normalized ? formatPhone(r.normalized) : (r.normalized ?? r.raw)}
                    </span>
                    <AdminBadge label={meta.label} variant={meta.variant} />
                  </div>

                  <div className="flex items-center gap-3">
                    {r.status === 'found' && (
                      <span className="text-[12px] text-[#6B6B6B]">
                        {r.matches.map((m) => (
                          <span key={`${m.kind}-${m.id}-${m.field}`} className="me-2">
                            <span className="text-[#9CA3AF]">{matchLabel(r, m.field, m.kind)}: </span>
                            {m.name}
                          </span>
                        ))}
                      </span>
                    )}

                    {r.status === 'invalid' && (
                      <span className="text-[12px] text-[#B42318]">{r.invalidReason}</span>
                    )}

                    {r.status === 'new' && (
                      <ActionButton variant="secondary" icon={UserPlus} size="sm" onClick={() => setAddingFor(r)}>
                        הוסף למאגר
                      </ActionButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* אותו טופס יצירת איש קשר של המערכת, עם הערך שנבדק כערך פתיחה —
          ולא טופס מקוצר משלנו (INC-3125). */}
      {addingFor && (
        <CreateFromLeadDialog
          prefill={
            addingFor.kind === 'email'
              ? { email: addingFor.normalized }
              : { phone: addingFor.normalized }
          }
          onClose={() => setAddingFor(null)}
          onCreated={() => {
            // הרשומה נוצרה — הבדיקה מורצת מחדש כדי שהשורה תשקף את המצב האמיתי
            setAddingFor(null)
            void check(text)
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'teal' | 'error'
}) {
  const color =
    tone === 'success'
      ? 'text-[#166534]'
      : tone === 'teal'
        ? 'text-[#00696B]'
        : tone === 'error'
          ? 'text-[#B42318]'
          : 'text-[#2D2D2D]'
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-[12px] text-[#9CA3AF]">{label}</div>
      <div className={`mt-1 text-[22px] font-bold ${color}`}>{value}</div>
    </div>
  )
}
