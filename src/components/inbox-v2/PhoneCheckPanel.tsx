import { useState } from 'react'
import { Search, ShieldCheck, UserPlus, X, Loader2 } from 'lucide-react'
import { Toolbar, ActionButton } from '@/components/layout/Shell'
import { AdminBadge, type AdminBadgeVariant } from '@/components/admin/AdminBadge'
import { useInboxPhoneCheck, summarize, type PhoneCheckResult, type PhoneCheckStatus } from '@/hooks/useInboxPhoneCheck'
import { useContactMutations } from '@/hooks/useContactMutations'
import { formatPhone } from '@/lib/normalizePhone'
import { toast } from 'sonner'

/**
 * בדיקת מספרים (INC-3125).
 *
 * ⚠ שלב הבדיקה הוא **קריאה בלבד** — אין כתיבה ל-Inbox, ל-Batch או ל-Audit.
 * זו בדיוק ההבחנה מול תיבת ההדבקה של הייבוא, שכותבת מיד למסד.
 *
 * המטרה היא דו-כיוונית: לא רק "מי כבר קיים", אלא בעיקר **מי לא קיים** —
 * ומשם מסלול מפורש להוספה למאגר. ההוספה לעולם אינה אוטומטית: היא
 * דורשת לחיצה, שם, ואישור.
 */

const STATUS_META: Record<PhoneCheckStatus, { label: string; variant: AdminBadgeVariant }> = {
  found: { label: 'קיים במאגר', variant: 'success' },
  new: { label: 'לא קיים — ניתן להוסיף', variant: 'teal' },
  invalid: { label: 'מספר לא תקין', variant: 'error' },
}

const ROW_BG: Record<PhoneCheckStatus, string> = {
  found: 'bg-[#F0FDF4]',
  new: 'bg-[#E6F3F3]',
  invalid: 'bg-[#FEF2F2]',
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
              הבדיקה היא קריאה בלבד — שום מספר לא נשמר, לא נוצרת רשומה ולא נרשמת פעולה.
              הוספה למאגר מתבצעת רק בלחיצה מפורשת על מספר שלא נמצא.
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              הדביקו מספרי טלפון — שורה לכל מספר, או מופרדים בפסיק
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              dir="ltr"
              placeholder={'0501234567\n052-765-4321\n+972541112222'}
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
              {isChecking ? 'בודק...' : 'בדוק מספרים'}
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

          {summary.duplicatesInInput > 0 && (
            <div className="rounded-[10px] bg-[#FFFBEB] px-4 py-2 text-[12px] text-[#92400E]">
              {summary.duplicatesInInput} מספרים חוזרים ברשימה שהודבקה — נבדקו פעם אחת.
            </div>
          )}

          <div className="space-y-2">
            {results.map((r) => {
              const meta = STATUS_META[r.status]
              return (
                <div
                  key={r.index}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-4 py-3 text-[13px] ${ROW_BG[r.status]}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#2D2D2D]" dir="ltr">
                      {r.normalized ? formatPhone(r.normalized) : r.raw}
                    </span>
                    <AdminBadge label={meta.label} variant={meta.variant} />
                  </div>

                  <div className="flex items-center gap-3">
                    {r.status === 'found' && (
                      <span className="text-[12px] text-[#6B6B6B]">
                        {r.matches.map((m) => (
                          <span key={`${m.kind}-${m.id}`} className="me-2">
                            <span className="text-[#9CA3AF]">
                              {m.kind === 'contact' ? 'איש קשר' : 'ארגון'}
                              {m.field === 'secondary' ? ' (נייד נוסף)' : ''}:{' '}
                            </span>
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

      {addingFor && (
        <QuickCreateContactDialog
          phone={addingFor.normalized!}
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

/**
 * הוספה מהירה של איש קשר ממספר שלא נמצא.
 * מינימום שדות במכוון — שם ונייד. שאר הפרופיל מושלם בכרטיס המועמד.
 * `phone_norm` והאזור נגזרים בטריגרים של הטבלה ואינם נשלחים מכאן.
 */
function QuickCreateContactDialog({
  phone,
  onClose,
  onCreated,
}: {
  phone: string
  onClose: () => void
  onCreated: () => void
}) {
  const { insertContact } = useContactMutations()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    const displayName = name.trim()
    if (!displayName) {
      toast.error('שם הוא שדה חובה')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await insertContact({ display_name: displayName, phone })
      if (error) throw new Error(error.message)
      toast.success(`נוצר איש קשר חדש (#${data?.contact_id})`)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת איש קשר')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-md items-center justify-center p-4">
        <div className="w-full rounded-2xl bg-white shadow-2xl" dir="rtl">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#008080]" />
              <h2 className="text-base font-bold text-[#2D2D2D]">הוספת איש קשר חדש</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-[#6B6B6B]">נייד</label>
              <div
                className="h-10 rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FA] px-3 text-sm leading-10 text-[#6B6B6B]"
                dir="ltr"
              >
                {formatPhone(phone)}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-[#6B6B6B]">שם מלא *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
              />
            </div>

            <p className="rounded-[10px] bg-[#F8F9FA] px-3 py-2 text-[12px] text-[#6B6B6B]">
              השם נשמר כפי שהוזן ואינו מפוצל לשם פרטי ומשפחה. שאר הפרטים מושלמים
              בכרטיס איש הקשר.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
            <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
              ביטול
            </button>
            <ActionButton variant="primary" icon={UserPlus} onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? 'שומר...' : 'צור איש קשר'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}
