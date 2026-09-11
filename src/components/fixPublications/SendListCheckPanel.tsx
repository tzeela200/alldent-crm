/**
 * „בדיקת רשימה" — מדביקים מספרי נייד, ומקבלים תשובה אחת: אפשר לשלוח או לא.
 *
 * המסך אינו כותב דבר. הוא עונה על שאלה שנשאלת לפני כל קמפיין:
 * האם יש ברשימה מספר שאסור לשלוח אליו — מי שביקש הסרה, או מי שאין לו וואטסאפ.
 *
 * פסק הדין מוצג למעלה בגדול, כי זו כל מטרת המסך. הטבלה היא הפירוט.
 */

import { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Loader2, RotateCcw, Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { Toolbar, ActionButton, StatusPill, KPICard } from '@/components/layout/Shell'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { formatPhone } from '@/lib/normalizePhone'
import { DELIVERY_OUTCOMES } from '@/lib/fixPublications/deliveryOutcome'
import { useSendListCheck } from '@/hooks/useSendListCheck'
import {
  summarizeSendList, SEND_VERDICTS, type SendListRow,
} from '@/lib/fixPublications/sendListVerdict'

/** סדר התצוגה: מה שדורש תשומת לב קודם */
const VERDICT_ORDER: Record<SendListRow['verdict'], number> = {
  blocked: 0, invalid: 1, duplicate: 2, ok: 3,
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function SendListCheckPanel() {
  const [input, setInput] = useState('')
  const { rows, isChecking, error, check, reset } = useSendListCheck()

  const summary = useMemo(() => (rows ? summarizeSendList(rows) : null), [rows])

  const sortedRows = useMemo(() => {
    if (!rows) return []
    return [...rows].sort(
      (a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || a.index - b.index,
    )
  }, [rows])

  const clearAll = () => {
    setInput('')
    reset()
  }

  const copyClean = async () => {
    if (!rows) return
    const clean = rows
      .filter((r) => r.verdict === 'ok')
      .map((r) => formatPhone(r.normalized) || r.normalized)
      .filter(Boolean)
    if (!clean.length) {
      toast.warning('אין מספרים תקינים לשליחה ברשימה הזו.')
      return
    }
    try {
      await navigator.clipboard.writeText(clean.join('\n'))
      toast.success(`${clean.length.toLocaleString('he-IL')} מספרים הועתקו.`)
    } catch {
      toast.error('ההעתקה נכשלה. אפשר לסמן את הטבלה ולהעתיק ידנית.')
    }
  }

  const columns: AdminColumn<SendListRow>[] = [
    {
      key: 'phone', label: 'נייד', nowrap: true, minWidth: '130px',
      render: (row) => (row.normalized
        ? formatPhone(row.normalized)
        : <span className="text-[#6B6B6B]">{row.raw}</span>),
    },
    {
      key: 'verdict', label: 'תוצאה', nowrap: true, minWidth: '130px',
      render: (row) => {
        const meta = SEND_VERDICTS[row.verdict]
        return (
          <span className="inline-flex items-center gap-1.5">
            {row.verdict === 'blocked' && (
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-[#D96C6C]" />
            )}
            <StatusPill label={meta.label} variant={meta.tone} />
          </span>
        )
      },
    },
    {
      key: 'reason', label: 'הסיבה', minWidth: '260px',
      render: (row) => (row.reason
        ? <span className={row.permanentBlock ? 'font-semibold text-[#D96C6C]' : 'text-[#2D2D2D]'}>
            {row.reason}
          </span>
        : <span className="text-[#6B6B6B]">—</span>),
    },
    {
      key: 'name', label: 'במאגר', minWidth: '180px',
      render: (row) => {
        if (!row.matches.length) {
          return <span className="text-[#6B6B6B]">לא נמצא</span>
        }
        const first = row.matches[0]
        return (
          <span title={row.matches.map((m) => m.name).join(' · ')}>
            {first.name}
            {row.matches.length > 1 && (
              <span className="text-[#6B6B6B]"> +{row.matches.length - 1}</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'outcome', label: 'מצב שליחה', nowrap: true,
      render: (row) => (row.outcome
        ? DELIVERY_OUTCOMES[row.outcome].label
        : <span className="text-[#6B6B6B]">—</span>),
    },
    {
      key: 'lastSentAt', label: 'פרסום אחרון', nowrap: true,
      render: (row) => formatDate(row.lastSentAt),
    },
  ]

  return (
    <div className="space-y-4">
      <Toolbar className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#2D2D2D]">בדיקת רשימה לפני שליחה</h2>
          <p className="mt-0.5 text-[13px] text-[#6B6B6B]">
            הדביקי מספרי נייד — שורה לכל מספר, או מופרדים בפסיקים. הבדיקה תגיד
            אם כולם תקינים, ותסמן מי שאסור לשלוח אליו. שום דבר לא נשמר.
          </p>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          dir="ltr"
          placeholder={'050-1234567\n0527654321\n054 111 2222'}
          className="w-full rounded-[14px] border border-[#D9D9D9] bg-white p-3 text-sm text-[#2D2D2D] outline-none transition-colors focus:border-[#008080]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            variant="primary" icon={isChecking ? Loader2 : Search}
            onClick={() => check(input)} disabled={isChecking || !input.trim()}
          >
            {isChecking ? 'בודק...' : 'בדוק את הרשימה'}
          </ActionButton>
          {(rows || input) && (
            <ActionButton variant="ghost" icon={RotateCcw} onClick={clearAll} disabled={isChecking}>
              נקה
            </ActionButton>
          )}
          {rows && summary && summary.ok > 0 && (
            <ActionButton variant="secondary" icon={Copy} onClick={copyClean}>
              העתקת {summary.ok.toLocaleString('he-IL')} המספרים התקינים
            </ActionButton>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Toolbar>

      {rows && summary && (
        <>
          <VerdictBanner summary={summary} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard label="מספרים ברשימה" value={summary.total.toLocaleString('he-IL')} />
            <KPICard
              label="תקינים לשליחה"
              value={summary.ok.toLocaleString('he-IL')}
              hint={summary.knownInDatabase ? `${summary.knownInDatabase} מהם במאגר` : undefined}
            />
            <KPICard
              label="אסורים לשליחה"
              value={summary.blocked.toLocaleString('he-IL')}
              hint={
                summary.blocked
                  ? `${summary.optedOut} ביקשו הסרה · ${summary.noDevice} ללא וואטסאפ`
                  : undefined
              }
            />
            <KPICard
              label="נייד לא תקין"
              value={summary.invalid.toLocaleString('he-IL')}
              hint={summary.duplicates ? `ועוד ${summary.duplicates} כפולים ברשימה` : undefined}
            />
          </div>

          <AdminTable<SendListRow>
            columns={columns}
            data={sortedRows}
            keyField="index"
            emptyMessage="אין מספרים להצגה"
            minWidth="950px"
            rowClassName={(row) => (row.verdict === 'blocked' ? 'bg-red-50/60' : undefined)}
          />
        </>
      )}
    </div>
  )
}

/**
 * פסק הדין — התשובה שהמשתמשת באה בשבילה.
 * ירוק = אפשר לשלוח. אדום = יש מספרים שאסור, וכמה מכל סוג.
 */
function VerdictBanner({ summary }: { summary: ReturnType<typeof summarizeSendList> }) {
  if (summary.blocked > 0) {
    return (
      <Toolbar className="border-r-4 !border-r-[#D96C6C]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#D96C6C]" />
          <div className="space-y-1">
            <p className="text-[16px] font-bold text-[#D96C6C]">
              {summary.blocked === 1
                ? 'מספר אחד ברשימה אסור לשליחה'
                : `${summary.blocked.toLocaleString('he-IL')} מספרים ברשימה אסורים לשליחה`}
            </p>
            <ul className="list-inside list-disc text-sm text-[#2D2D2D]">
              {summary.optedOut > 0 && (
                <li>
                  <strong>{summary.optedOut}</strong> ביקשו להפסיק לקבל פרסום —
                  אין לשלוח אליהם שוב.
                </li>
              )}
              {summary.noDevice > 0 && (
                <li>
                  <strong>{summary.noDevice}</strong> ללא וואטסאפ על המספר —
                  ההודעה לא תגיע אליהם.
                </li>
              )}
            </ul>
            <p className="text-sm text-[#6B6B6B]">
              שאר {summary.ok.toLocaleString('he-IL')} המספרים תקינים לשליחה.
            </p>
          </div>
        </div>
      </Toolbar>
    )
  }

  if (summary.invalid > 0) {
    return (
      <Toolbar className="border-r-4 !border-r-[#E8A85C]">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#E8A85C]" />
          <div className="space-y-1">
            <p className="text-[16px] font-bold text-[#2D2D2D]">
              אין מספרים אסורים — אבל {summary.invalid.toLocaleString('he-IL')} אינם ניידים תקינים
            </p>
            <p className="text-sm text-[#6B6B6B]">
              {summary.ok.toLocaleString('he-IL')} מספרים תקינים לשליחה.
            </p>
          </div>
        </div>
      </Toolbar>
    )
  }

  return (
    <Toolbar className="border-r-4 !border-r-[#0F7B6C]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#0F7B6C]" />
        <div>
          <p className="text-[16px] font-bold text-[#0F7B6C]">
            הרשימה תקינה — כל {summary.ok.toLocaleString('he-IL')} המספרים ניתנים לשליחה
          </p>
          <p className="text-sm text-[#6B6B6B]">
            אין ברשימה מי שביקש הסרה ואין מספר ללא וואטסאפ.
          </p>
        </div>
      </div>
    </Toolbar>
  )
}

export default SendListCheckPanel
