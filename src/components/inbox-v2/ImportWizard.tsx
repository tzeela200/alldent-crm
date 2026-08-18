import { useState, useMemo, useRef } from 'react'
import { FileSpreadsheet, ShieldAlert, Check, Loader2, ArrowLeft, Upload } from 'lucide-react'
import { Toolbar, SelectFilter, ActionButton } from '@/components/layout/Shell'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { useInboxV2SourceTypes } from '@/hooks/useInboxV2SourceTypes'
import { useInboxImportCommit, type PreparedRow } from '@/hooks/useInboxImportCommit'
import { lookupPhonesByNorm, type PhoneMatch } from '@/hooks/useInboxPhoneCheck'
import {
  parseExcelFile,
  parseCsvFile,
  parsePastedText,
  detectFileType,
  detectMapping,
  applyMapping,
  IMPORT_TARGET_FIELDS,
  type RawRow,
} from '@/lib/inbox-v2-parser'
import { normalizeIlMobile, formatPhone } from '@/lib/normalizePhone'
import { toast } from 'sonner'

/**
 * אשף ייבוא CSV/XLSX (INC-3125).
 *
 * ⚠ הכלל המחייב: **אין שום כתיבה למסד לפני שלב האישור.**
 * ניתוח הקובץ, המיפוי והוולידציה רצים כולם בדפדפן; זיהוי "קיים/חדש"
 * הוא קריאה בלבד. רק לחיצה על "אשר וייבא" כותבת.
 *
 * הזרימה הקודמת כתבה batch ושורות מיד עם בחירת הקובץ — כלומר קובץ שגוי
 * כבר היה במסד לפני שמישהו ראה מה יש בו, ולא הייתה שום דרך לבטל.
 *
 * זיהוי הקיימים משתמש ב-`lookupPhonesByNorm` — אותה פונקציה של מסך
 * בדיקת המספרים, כדי ששני המסכים לא יתנו תשובות שונות לאותו מספר.
 */

type Step = 'file' | 'mapping' | 'review' | 'done'

interface RowState {
  index: number
  raw: RawRow
  parsed: Record<string, unknown>
  phoneNorm: string | null
  /** בעיות שחוסמות ייבוא של השורה */
  errors: string[]
  matches: PhoneMatch[]
  duplicateInFile: boolean
}

const STEP_LABEL: Record<Exclude<Step, 'done'>, string> = {
  file: '1 · בחירת קובץ',
  mapping: '2 · מיפוי עמודות',
  review: '3 · בדיקה ואישור',
}

export function ImportWizard() {
  const { data: sourceTypes } = useInboxV2SourceTypes()
  const { commit, isCommitting, progress } = useInboxImportCommit()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('file')
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('')
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<RowState[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const reset = () => {
    setStep('file')
    setFileName('')
    setRawRows([])
    setHeaders([])
    setMapping({})
    setRows([])
    setConfirmed(false)
  }

  // ── שלב 1: ניתוח הקובץ — בדפדפן בלבד ──────────────────────────────
  const handleFile = async (file: File) => {
    const type = detectFileType(file)
    if (type === 'unknown') {
      toast.error('סוג קובץ לא נתמך. יש להעלות Excel (.xlsx/.xls) או CSV.')
      return
    }
    setAnalyzing(true)
    try {
      const parsed = type === 'excel' ? await parseExcelFile(file) : await parseCsvFile(file)
      if (!parsed.length) {
        toast.error('לא נמצאו שורות בקובץ')
        return
      }
      const cols = [...new Set(parsed.flatMap((r) => Object.keys(r)))]
      setFileName(file.name)
      setFileType(type)
      setRawRows(parsed)
      setHeaders(cols)
      setMapping(detectMapping(cols))
      setStep('mapping')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ')
    } finally {
      setAnalyzing(false)
    }
  }

  const handlePaste = () => {
    const parsed = parsePastedText(pasteText)
    if (!parsed.length) {
      toast.error('לא זוהו רשומות בטקסט שהודבק')
      return
    }
    const cols = [...new Set(parsed.flatMap((r) => Object.keys(r)))]
    setFileName('הדבקה ידנית')
    setFileType('paste')
    setRawRows(parsed)
    setHeaders(cols)
    setMapping(detectMapping(cols))
    setStep('mapping')
  }

  // ── שלב 2→3: ולידציה + זיהוי קיימים — קריאה בלבד ──────────────────
  const runValidation = async () => {
    setAnalyzing(true)
    try {
      const prepared: RowState[] = rawRows.map((raw, index) => {
        const parsed = applyMapping(raw, mapping)
        const rawPhone = (parsed.phone as string) || ''
        const phoneNorm = rawPhone ? normalizeIlMobile(rawPhone) : null
        const errors: string[] = []
        if (!parsed.display_name && !parsed.first_name && !parsed.last_name) {
          errors.push('אין שם')
        }
        if (rawPhone && !phoneNorm) errors.push('נייד לא תקין')
        if (!rawPhone && !parsed.email) errors.push('אין נייד ואין אימייל')
        return { index, raw, parsed, phoneNorm, errors, matches: [], duplicateInFile: false }
      })

      // כפילויות בתוך הקובץ עצמו — מסומנות, לא נחסמות
      const seen = new Set<string>()
      for (const r of prepared) {
        if (!r.phoneNorm) continue
        if (seen.has(r.phoneNorm)) r.duplicateInFile = true
        else seen.add(r.phoneNorm)
      }

      const byNorm = await lookupPhonesByNorm(
        prepared.filter((r) => r.phoneNorm).map((r) => r.phoneNorm!)
      )
      for (const r of prepared) {
        if (r.phoneNorm) r.matches = byNorm.get(r.phoneNorm) ?? []
      }

      setRows(prepared)
      setStep('review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בבדיקת הנתונים')
    } finally {
      setAnalyzing(false)
    }
  }

  const summary = useMemo(() => {
    const invalid = rows.filter((r) => r.errors.length > 0)
    const importable = rows.filter((r) => r.errors.length === 0)
    return {
      total: rows.length,
      existing: importable.filter((r) => r.matches.length > 0).length,
      fresh: importable.filter((r) => r.matches.length === 0).length,
      invalid: invalid.length,
      duplicates: rows.filter((r) => r.duplicateInFile).length,
      importable: importable.length,
    }
  }, [rows])

  const handleCommit = async () => {
    const toImport: PreparedRow[] = rows
      .filter((r) => r.errors.length === 0)
      .map((r) => ({ parsed: r.parsed, raw: r.raw }))

    if (!toImport.length) {
      toast.error('אין שורות תקינות לייבוא')
      return
    }
    try {
      await commit(
        toImport,
        {
          source_type: sourceType ? Number(sourceType) : null,
          source_name: sourceName || null,
          default_role: null,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        } as never,
        fileName,
        fileType
      )
      toast.success(`יובאו ${toImport.length} רשומות והורצה התאמה`)
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בייבוא')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* מחוון שלבים */}
      {step !== 'done' && (
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(STEP_LABEL) as Exclude<Step, 'done'>[]).map((s) => (
            <span
              key={s}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                step === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {STEP_LABEL[s]}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-[10px] border border-[#99D6D6] bg-[#E6F3F3] px-4 py-3 text-[12px] text-[#00696B]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          שום נתון לא נכתב למאגר עד שתאשרי בשלב האחרון. ניתן לחזור אחורה או לבטל בכל שלב.
        </span>
      </div>

      {/* ── שלב 1 ─────────────────────────────────────────────── */}
      {step === 'file' && (
        <Toolbar>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 transition-colors hover:border-teal-400 hover:bg-teal-50/50"
          >
            {analyzing ? (
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-slate-400" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {analyzing ? 'מנתח את הקובץ...' : 'בחרו קובץ Excel או CSV'}
            </p>
            <p className="text-xs text-slate-400">הקובץ נקרא בדפדפן בלבד ואינו נשלח לשום מקום בשלב זה</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
            className="hidden"
          />

          {/* הדבקה — עוברת דרך אותו שער אישור בדיוק. עד INC-3125 היא
              כתבה למסד מיד עם הלחיצה, בלי Preview ובלי אפשרות לבטל. */}
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <label className="text-xs font-medium text-slate-500">או הדביקו רשימה</label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              dir="rtl"
              placeholder="שם, טלפון, אימייל — שורה לכל רשומה"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none placeholder:text-slate-300 focus:border-teal-500"
            />
            <ActionButton
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={handlePaste}
              disabled={analyzing || !pasteText.trim()}
            >
              נתח הדבקה
            </ActionButton>
          </div>
        </Toolbar>
      )}

      {/* ── שלב 2 ─────────────────────────────────────────────── */}
      {step === 'mapping' && (
        <Toolbar>
          <div className="space-y-4">
            <div className="text-[13px] text-[#6B6B6B]">
              נמצאו <strong>{rawRows.length}</strong> שורות ו-<strong>{headers.length}</strong> עמודות
              בקובץ <strong>{fileName}</strong>. התאימו כל עמודה לשדה במערכת; עמודה ללא שיוך תישמר
              במידע הגולמי בלבד.
            </div>

            <div className="grid gap-2">
              {headers.map((h) => (
                <div
                  key={h}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[#F8F9FA] px-3 py-2"
                >
                  <span className="text-[13px] font-semibold text-[#2D2D2D]" dir="auto">
                    {h}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9CA3AF]" dir="auto">
                      דוגמה: {String(rawRows[0]?.[h] ?? '—').slice(0, 30)}
                    </span>
                    <select
                      value={mapping[h] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                      className="h-9 rounded-[10px] border border-[#D9D9D9] bg-white px-2 text-[13px] outline-none focus:border-[#008080]"
                    >
                      <option value="">— לא מיובא —</option>
                      {IMPORT_TARGET_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button onClick={reset} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
                ביטול
              </button>
              <ActionButton variant="primary" icon={ArrowLeft} onClick={runValidation} disabled={analyzing}>
                {analyzing ? 'בודק...' : 'המשך לבדיקה'}
              </ActionButton>
            </div>
          </div>
        </Toolbar>
      )}

      {/* ── שלב 3 ─────────────────────────────────────────────── */}
      {step === 'review' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="שורות בקובץ" value={summary.total} />
            <StatCard label="קיימות במאגר" value={summary.existing} tone="success" />
            <StatCard label="חדשות" value={summary.fresh} tone="teal" />
            <StatCard label="לא תקינות — לא ייובאו" value={summary.invalid} tone="error" />
          </div>

          {summary.duplicates > 0 && (
            <div className="rounded-[10px] bg-[#FFFBEB] px-4 py-2 text-[12px] text-[#92400E]">
              {summary.duplicates} שורות מכילות נייד שחוזר בתוך הקובץ עצמו.
            </div>
          )}

          <Toolbar>
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">סוג מקור</label>
                <SelectFilter
                  value={sourceType}
                  onChange={setSourceType}
                  options={(sourceTypes ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
                  placeholder="בחר מקור..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">שם מקור</label>
                <input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="לדוגמה: רשימת מועמדות פברואר"
                  className="h-11 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">תגיות (מופרדות בפסיק)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="h-11 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="max-h-[420px] space-y-1.5 overflow-y-auto">
              {rows.slice(0, 200).map((r) => {
                const blocked = r.errors.length > 0
                const exists = r.matches.length > 0
                return (
                  <div
                    key={r.index}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[12px] ${
                      blocked ? 'bg-[#FEF2F2]' : exists ? 'bg-[#F0FDF4]' : 'bg-[#E6F3F3]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#2D2D2D]" dir="auto">
                        {(r.parsed.display_name as string) || '(ללא שם)'}
                      </span>
                      {r.phoneNorm && (
                        <span className="text-[#6B6B6B]" dir="ltr">
                          {formatPhone(r.phoneNorm)}
                        </span>
                      )}
                      {r.duplicateInFile && <AdminBadge label="חוזר בקובץ" variant="amber" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {blocked ? (
                        <span className="font-medium text-[#B42318]">{r.errors.join(' · ')}</span>
                      ) : exists ? (
                        <span className="text-[#166534]">
                          קיים: {r.matches.map((m) => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-[#00696B]">רשומה חדשה</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {rows.length > 200 && (
                <div className="py-2 text-center text-[12px] text-[#9CA3AF]">
                  מוצגות 200 השורות הראשונות מתוך {rows.length}. הייבוא יכלול את כולן.
                </div>
              )}
            </div>
          </Toolbar>

          <Toolbar>
            <div className="space-y-3">
              <p className="text-[13px] text-[#6B6B6B]">
                ייובאו <strong>{summary.importable}</strong> שורות. שורות שאינן תקינות לא ייובאו.
                רשומות שכבר קיימות ייכנסו לתור ההכרעה להשלמת מידע — לא תיווצר כפילות.
              </p>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-[#008080]"
                />
                אני מאשרת ייבוא של {summary.importable} רשומות
              </label>

              {progress && (
                <p className="text-[12px] text-[#6B6B6B]">
                  {progress.phase === 'inserting'
                    ? `מייבא ${progress.current} מתוך ${progress.total}...`
                    : progress.phase === 'matching'
                      ? 'מריץ התאמה מול המאגר...'
                      : 'הושלם'}
                </p>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('mapping')}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  חזרה למיפוי
                </button>
                <ActionButton
                  variant="primary"
                  icon={Upload}
                  onClick={handleCommit}
                  disabled={!confirmed || isCommitting || summary.importable === 0}
                >
                  {isCommitting ? 'מייבא...' : 'אשר וייבא'}
                </ActionButton>
              </div>
            </div>
          </Toolbar>
        </>
      )}

      {/* ── סיום ──────────────────────────────────────────────── */}
      {step === 'done' && (
        <Toolbar>
          <div className="flex flex-col items-center gap-3 py-8">
            <Check className="h-10 w-10 text-[#008080]" />
            <p className="text-[15px] font-semibold text-[#2D2D2D]">הייבוא הושלם</p>
            <p className="text-[13px] text-[#6B6B6B]">
              הרשומות נקלטו והורצה עליהן התאמה. מה שדורש הכרעה ממתין בלשונית "שינויים שהגיעו".
            </p>
            <ActionButton variant="secondary" icon={Upload} onClick={reset}>
              ייבוא קובץ נוסף
            </ActionButton>
          </div>
        </Toolbar>
      )}
    </div>
  )
}

function StatCard({
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
