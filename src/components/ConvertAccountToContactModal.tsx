import { useMemo, useState } from 'react'
import { X, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DICT_PROFILE_TYPES } from '@/lib/dicts'

/**
 * "הפוך לאיש קשר ומזג לארגון"
 * Two-step, safe flow: Preview (read-only) → explicit confirm → execute.
 * Calls the server RPCs convert_account_to_contact_preview / _and_merge.
 * The server re-enforces every guardrail; this UI only collects the user's choices.
 */

type AccountLite = {
  account_id: number
  account_name: string | null
  account_status: number | null
}

interface PreviewReuseCandidate {
  contact_id: number
  name: string | null
  phone: string | null
  email: string | null
  account_link: number | null
  profile_type: number | null
  profile_type_name: string | null
  match_reasons: string[]
}

interface PreviewJob {
  job_code: string
  job_title: string | null
  rel_employer_contact: number | null
  rel_recruiter_contact: number | null
  employer_contact_empty: boolean
  employer_contact_conflict: boolean
}

interface PreviewData {
  source_exists: boolean
  source: {
    account_id: number
    account_name: string | null
    phone: string | null
    email: string | null
    city_id: number | null
    region_id: number | null
    account_type: number | null
    account_type_name: string | null
    account_status: number | null
    account_status_name: string | null
    phone_norm_calc: string | null
  } | null
  target: {
    account_id: number
    account_name: string | null
    account_type_name: string | null
    account_status_name: string | null
  } | null
  target_valid: boolean
  suggested_contact_name: string | null
  reuse_candidates: PreviewReuseCandidate[]
  requires_user_choice: boolean
  jobs: PreviewJob[]
  linked_contacts: { contact_id: number; name: string | null; phone: string | null }[]
  other_refs_counts: { applications: number; inbox: number; inbox_v2: number }
  action_plan: {
    contact: string
    jobs_to_move: number
    linked_contacts_to_move: number
    employer_contacts_to_fill: number
    employer_contacts_conflict: number
  }
}

// Profile types offered for the converted person: מעסיק / מגייס / אנשי קשר.
const ALLOWED_PROFILE_TYPES = DICT_PROFILE_TYPES.filter((p) => [2, 3, 4].includes(p.id))

const REASON_LABELS: Record<string, string> = {
  linked_account: 'מקושר לארגון',
  job_employer_contact: 'מעסיק במשרה',
  job_recruiter_contact: 'מגייס במשרה',
  field_match: 'התאמת טלפון/מייל/שם',
}

interface Props {
  source: AccountLite
  accounts: AccountLite[]
  onClose: () => void
  onDone: (summaryMessage: string) => void
}

export function ConvertAccountToContactModal({ source, accounts, onClose, onDone }: Props) {
  const [step, setStep] = useState<'select' | 'preview'>('select')
  const [targetSearch, setTargetSearch] = useState('')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // user choices for execute
  const [chosenContactId, setChosenContactId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [profileType, setProfileType] = useState<number>(2)
  const [setEmployerContact, setSetEmployerContact] = useState(false)
  const [overwriteEmployer, setOverwriteEmployer] = useState(false)
  const [executing, setExecuting] = useState(false)

  const targetOptions = useMemo(() => {
    const q = targetSearch.trim().toLowerCase()
    return accounts
      .filter((a) => a.account_id !== source.account_id && Number(a.account_status) !== 11)
      .filter((a) => (q ? (a.account_name ?? '').toLowerCase().includes(q) : true))
      .slice(0, 50)
  }, [accounts, source.account_id, targetSearch])

  const loadPreview = async () => {
    if (!targetId) return
    setLoadingPreview(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('convert_account_to_contact_preview', {
        p_source: source.account_id,
        p_target: targetId,
      })
      if (error) throw error
      const pv = data as unknown as PreviewData
      setPreview(pv)
      // initialise choices from preview
      setNewName(pv.suggested_contact_name ?? '')
      setChosenContactId(pv.requires_user_choice && pv.reuse_candidates[0] ? pv.reuse_candidates[0].contact_id : null)
      setSetEmployerContact(false)
      setOverwriteEmployer(false)
      setStep('preview')
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בטעינת התצוגה המקדימה')
    } finally {
      setLoadingPreview(false)
    }
  }

  const canConfirm = useMemo(() => {
    if (!preview || !targetId) return false
    if (preview.requires_user_choice) return chosenContactId != null
    return newName.trim().length > 0
  }, [preview, targetId, chosenContactId, newName])

  const execute = async () => {
    if (!preview || !targetId || !canConfirm) return
    setExecuting(true)
    setError(null)
    try {
      const params = {
        p_source: source.account_id,
        p_target: targetId,
        p_contact_id: preview.requires_user_choice ? chosenContactId : null,
        p_new_contact_name: preview.requires_user_choice ? null : newName.trim(),
        p_profile_type: profileType,
        p_set_employer_contact: setEmployerContact,
        p_overwrite_employer_contact: setEmployerContact && overwriteEmployer,
        p_confirm: true,
      }
      const { data, error } = await supabase.rpc('convert_account_to_contact_and_merge', params)
      if (error) throw error
      const r = data as any
      const msg =
        `הומר בהצלחה. איש קשר #${r.contact_id} ${r.contact_created ? '(נוצר)' : '(קיים)'}` +
        ` · ${r.jobs_moved} משרות הועברו` +
        (r.employer_contacts_filled ? ` · ${r.employer_contacts_filled} מעסיקים עודכנו` : '') +
        (r.employer_contacts_skipped ? ` · ${r.employer_contacts_skipped} דולגו` : '')
      onDone(msg)
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בביצוע ההמרה')
      setExecuting(false)
    }
  }

  const cardClass = 'rounded-xl border border-slate-200 bg-white p-3'
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-500'
  const selectClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]'

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4" dir="rtl">
      <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#2D2D2D]">הפוך לאיש קשר ומזג לארגון</h2>
            <p className="text-[12px] text-slate-500">
              ארגון מקור: <span className="font-semibold">{source.account_name ?? `#${source.account_id}`}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>ארגון יעד אמיתי (target)</label>
                <input
                  className={selectClass}
                  placeholder="חיפוש ארגון לפי שם..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
                {targetOptions.map((a) => (
                  <button
                    key={a.account_id}
                    type="button"
                    onClick={() => setTargetId(a.account_id)}
                    className={`block w-full rounded-lg px-3 py-2 text-right text-[13px] ${
                      targetId === a.account_id ? 'bg-[#E6F3F3] font-bold text-[#008080] ring-1 ring-[#008080]' : 'hover:bg-slate-50'
                    }`}
                  >
                    {a.account_name ?? `#${a.account_id}`} <span className="text-slate-400">#{a.account_id}</span>
                  </button>
                ))}
                {targetOptions.length === 0 && <p className="px-3 py-2 text-[13px] text-slate-400">אין תוצאות</p>}
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* source / target */}
              <div className="grid grid-cols-2 gap-3">
                <div className={cardClass}>
                  <div className={labelClass}>ארגון מקור (יסומן מוזג)</div>
                  <div className="text-[13px] font-bold text-[#2D2D2D]">{preview.source?.account_name}</div>
                  <div className="text-[12px] text-slate-500">{preview.source?.phone || '—'} · {preview.source?.email || '—'}</div>
                  <div className="text-[12px] text-slate-500">סטטוס: {preview.source?.account_status_name}</div>
                </div>
                <div className={cardClass}>
                  <div className={labelClass}>ארגון יעד</div>
                  <div className="text-[13px] font-bold text-[#2D2D2D]">{preview.target?.account_name}</div>
                  <div className="text-[12px] text-slate-500">{preview.target?.account_type_name}</div>
                  <div className="text-[12px] text-slate-500">סטטוס: {preview.target?.account_status_name}</div>
                </div>
              </div>

              {/* contact: choose existing OR create new */}
              {preview.requires_user_choice ? (
                <div className={cardClass}>
                  <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#2D2D2D]">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    נמצאו אנשי קשר קיימים — חובה לבחור אחד
                  </div>
                  <div className="space-y-1">
                    {preview.reuse_candidates.map((c) => (
                      <label
                        key={c.contact_id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                          chosenContactId === c.contact_id ? 'border-[#008080] bg-[#E6F3F3]' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reuse"
                          checked={chosenContactId === c.contact_id}
                          onChange={() => setChosenContactId(c.contact_id)}
                          className="mt-1 accent-[#008080]"
                        />
                        <span className="text-[13px]">
                          <span className="font-bold text-[#2D2D2D]">{c.name || `#${c.contact_id}`}</span>{' '}
                          <span className="text-slate-400">#{c.contact_id}</span>
                          <span className="block text-[12px] text-slate-500">{c.phone || '—'} · {c.email || '—'} · {c.profile_type_name || '—'}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {c.match_reasons.map((r) => REASON_LABELS[r] ?? r).join(' · ')}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cardClass}>
                  <label className={labelClass}>שם איש הקשר שייווצר (לעריכה ואישור)</label>
                  <input className={selectClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="לדוגמה: מרב קרמר" />
                  <p className="mt-1 text-[11px] text-slate-400">השם הוצע מתוך שם הארגון — ערכי אותו לשם אדם תקין.</p>
                </div>
              )}

              {/* profile type */}
              <div className={cardClass}>
                <label className={labelClass}>סוג פרופיל</label>
                <select className={selectClass} value={profileType} onChange={(e) => setProfileType(Number(e.target.value))}>
                  {ALLOWED_PROFILE_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* jobs */}
              {preview.jobs.length > 0 && (
                <div className={cardClass}>
                  <div className="mb-2 text-[13px] font-bold text-[#2D2D2D]">משרות שיועברו ליעד ({preview.jobs.length})</div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-[12px]">
                    {preview.jobs.map((j) => (
                      <li key={j.job_code} className="flex items-center justify-between gap-2">
                        <span className="truncate">{j.job_code} · {j.job_title || '—'}</span>
                        {j.employer_contact_conflict && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">מעסיק קיים</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 flex items-center gap-2 text-[12px] text-slate-600">
                    <input type="checkbox" checked={setEmployerContact} onChange={(e) => setSetEmployerContact(e.target.checked)} className="accent-[#008080]" />
                    עדכן איש קשר מעסיק במשרות שבהן הוא ריק
                  </label>
                  {setEmployerContact && preview.action_plan.employer_contacts_conflict > 0 && (
                    <label className="mt-1 flex items-center gap-2 text-[12px] text-red-600">
                      <input type="checkbox" checked={overwriteEmployer} onChange={(e) => setOverwriteEmployer(e.target.checked)} className="accent-red-600" />
                      דרוס איש קשר מעסיק קיים ({preview.action_plan.employer_contacts_conflict} משרות) — זהירות
                    </label>
                  )}
                </div>
              )}

              {/* refs + plan */}
              <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
                <div className={cardClass}>הגשות<br /><span className="font-bold">{preview.other_refs_counts.applications}</span></div>
                <div className={cardClass}>אנשי קשר<br /><span className="font-bold">{preview.action_plan.linked_contacts_to_move}</span></div>
                <div className={cardClass}>inbox<br /><span className="font-bold">{preview.other_refs_counts.inbox + preview.other_refs_counts.inbox_v2}</span></div>
              </div>
              <p className="text-[11px] text-slate-400">
                לא ישתנו: סטטוס משרה, סטטוס פרסום, עיר/אזור משרה. לא יימחקו רשומות. הארגון המקור יסומן "מוזג / כפילות".
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {step === 'preview' ? (
            <button type="button" onClick={() => setStep('select')} className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" /> בחירת יעד
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">ביטול</button>
            {step === 'select' && (
              <button
                type="button"
                disabled={!targetId || loadingPreview}
                onClick={loadPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-[#008080] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {loadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                הצג תצוגה מקדימה
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                disabled={!canConfirm || executing}
                onClick={execute}
                className="inline-flex items-center gap-2 rounded-xl bg-[#008080] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                אשר ובצע המרה
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConvertAccountToContactModal
