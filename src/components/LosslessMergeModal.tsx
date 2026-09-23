/**
 * INC-3146 — חלון מיזוג שלא מאבד נתונים.
 *
 * מציג כל שדה שיש בו תוכן, מציע ברירת מחדל שלא מוחקת כלום, ומראה לפני
 * האישור מה בדיוק לא יישמר. הלוגיקה עצמה ב-`@/lib/lossless-merge`.
 *
 * רכיב כללי (לא ספציפי לאנשי קשר) — השדות, קבוצות הנייד/מייל ושדה ההערות
 * מגיעים כ-props, כדי שגם מיזוג ארגונים יוכל לעבור אליו בהמשך.
 */
import { useMemo, useState } from 'react'
import { Merge, Star, Trash2, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { ActionButton } from './layout/Shell'
import {
  POINT_ROLE_LABELS,
  analyzeField,
  buildMergePlan,
  collectPoints,
  defaultChoice,
  defaultPointRoles,
  isEmptyValue,
  resolveFieldValue,
  type ContactPointSlot,
  type FieldChoice,
  type LosslessMergeField,
  type MergeRecord,
  type PointRole,
} from '@/lib/lossless-merge'

interface Props {
  records: MergeRecord[]
  idField: string
  nameField: string
  fields: LosslessMergeField[]
  slots: ContactPointSlot[]
  overflowField: string
  onConfirm: (masterId: number, overrides: Record<string, unknown>) => Promise<void>
  onClose: () => void
  pending: boolean
  title?: string
}

const ROLE_ORDER: PointRole[] = ['primary', 'secondary', 'notes', 'drop']

export function LosslessMergeModal({
  records,
  idField,
  nameField,
  fields,
  slots,
  overflowField,
  onConfirm,
  onClose,
  pending,
  title = 'מיזוג רשומות',
}: Props) {
  const [masterId, setMasterId] = useState<number>(Number(records[0][idField]))
  // בחירות שהמשתמשת שינתה ידנית — נשמרות גם כשמחליפים מאסטר
  const [touchedChoices, setTouchedChoices] = useState<Record<string, FieldChoice>>({})
  const [touchedRoles, setTouchedRoles] = useState<Record<string, Record<string, PointRole>> | null>(null)
  const [showIdentical, setShowIdentical] = useState(false)
  const [confirmLoss, setConfirmLoss] = useState(false)

  const idOf = (r: MergeRecord) => Number(r[idField])
  const nameOf = (r: MergeRecord) => String(r[nameField] ?? '') || `#${idOf(r)}`

  const choices = useMemo(() => {
    const out: Record<string, FieldChoice | null> = {}
    for (const f of fields) out[f.key] = touchedChoices[f.key] ?? defaultChoice(records, idField, masterId, f)
    return out
  }, [fields, records, idField, masterId, touchedChoices])

  const pointsBySlot = useMemo(
    () => Object.fromEntries(slots.map((s) => [s.id, collectPoints(records, idField, masterId, s)])),
    [slots, records, idField, masterId],
  )

  const pointRoles = useMemo(() => {
    if (touchedRoles) return touchedRoles
    return Object.fromEntries(slots.map((s) => [s.id, defaultPointRoles(pointsBySlot[s.id], s, masterId)]))
  }, [touchedRoles, slots, pointsBySlot, masterId])

  const plan = useMemo(
    () => buildMergePlan({ records, idKey: idField, masterId, fields, slots, choices, pointRoles, overflowField }),
    [records, idField, masterId, fields, slots, choices, pointRoles, overflowField],
  )

  // שדות להצגה, לפי קבוצות. שדות ריקים בכל הרשומות לא מוצגים.
  const groups = useMemo(() => {
    const map = new Map<string, { field: LosslessMergeField; identical: boolean }[]>()
    for (const field of fields) {
      const a = analyzeField(records, idField, masterId, field)
      if (a.allEmpty) continue
      const list = map.get(field.group) ?? []
      list.push({ field, identical: a.identical })
      map.set(field.group, list)
    }
    return Array.from(map.entries())
  }, [fields, records, idField, masterId])

  const identicalCount = groups.reduce((n, [, list]) => n + list.filter((x) => x.identical).length, 0)
  const lossKey = plan.lost.map((l) => `${l.label}:${l.value}`).join('|')
  const needsLossConfirm = plan.lost.length > 0
  const canSubmit = !pending && plan.errors.length === 0 && (!needsLossConfirm || confirmLoss)

  const fmt = (field: LosslessMergeField, value: unknown) => {
    if (isEmptyValue(value)) return '—'
    if (field.format) return field.format(value)
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'כן' : 'לא'
    return String(value)
  }

  const setChoice = (key: string, choice: FieldChoice) => {
    setTouchedChoices((prev) => ({ ...prev, [key]: choice }))
    setConfirmLoss(false)
  }

  const setRole = (slotId: string, pointKey: string, role: PointRole) => {
    const next = { ...pointRoles, [slotId]: { ...pointRoles[slotId] } }
    // ראשי/נוסף הם מקום אחד — מי שהחזיק בו קודם עובר להערות, לא נמחק
    if (role === 'primary' || role === 'secondary') {
      for (const [k, r] of Object.entries(next[slotId])) if (r === role && k !== pointKey) next[slotId][k] = 'notes'
    }
    next[slotId][pointKey] = role
    setTouchedRoles(next)
    setConfirmLoss(false)
  }

  const orderedRecords = [...records].sort((a, b) => (idOf(a) === masterId ? -1 : idOf(b) === masterId ? 1 : 0))
  const masterRecord = records.find((r) => idOf(r) === masterId) ?? records[0]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
            <Merge className="h-5 w-5" />
          </div>
          <div className="flex-1 text-right">
            <div className="text-[18px] font-bold text-[#0F172A]">{title}</div>
            <div className="text-[13px] font-medium text-slate-500">
              מוצגים כל השדות שיש בהם תוכן. ברירת המחדל שומרת הכול — שני רק מה שצריך.
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* 1. בחירת מאסטר */}
          <section>
            <div className="mb-2 text-[12px] font-semibold text-slate-400">1. איזו רשומה נשארת במערכת</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))` }}>
              {records.map((rec) => {
                const id = idOf(rec)
                const isMaster = id === masterId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setMasterId(id); setConfirmLoss(false) }}
                    className={`rounded-2xl border-2 p-4 text-right transition ${isMaster ? 'border-[#008080] bg-[#F0FDFC]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-bold ${isMaster ? 'text-[#008080]' : 'text-slate-400'}`}>
                      {isMaster ? <><Star className="h-3 w-3 fill-current" /> נשארת</> : <><Trash2 className="h-3 w-3" /> תתמזג ותימחק</>}
                    </div>
                    <div className="text-[15px] font-bold text-[#0F172A]">{nameOf(rec)}</div>
                    <div className="mt-1 text-[12px] text-slate-500">מזהה: {id}</div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 2. נייד ומייל */}
          {slots.map((slot) => {
            const points = pointsBySlot[slot.id]
            if (!points.length) return null
            const roles = pointRoles[slot.id] ?? {}
            return (
              <section key={slot.id}>
                <div className="mb-2 text-[12px] font-semibold text-slate-400">
                  {slot.label} — לכל ערך בחרי לאן הוא נכנס
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-right text-[13px]">
                    <tbody className="divide-y divide-slate-100">
                      {points.map((p) => {
                        const err = roles[p.key] === 'primary' ? slot.primaryError?.(p.raw) : null
                        return (
                          <tr key={p.key}>
                            <td className="px-4 py-3 font-semibold text-[#0F172A]" dir="ltr" style={{ textAlign: 'right' }}>
                              {slot.format ? slot.format(p.raw) : p.raw}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-slate-500">
                              {p.sources.map((s) => {
                                const rec = records.find((r) => idOf(r) === s.recordId)
                                const where = s.field === slot.primaryKey ? 'ראשי' : 'נוסף'
                                return <div key={`${s.recordId}-${s.field}`}>{where} ב{rec ? nameOf(rec) : s.recordId}{s.recordId === masterId ? ' (נשארת)' : ''}</div>
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap justify-end gap-1">
                                {ROLE_ORDER.map((role) => {
                                  const active = roles[p.key] === role
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => setRole(slot.id, p.key, role)}
                                      className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${
                                        active
                                          ? role === 'drop' ? 'border-red-300 bg-red-50 text-red-700' : 'border-[#008080] bg-[#F0FDFC] text-[#008080]'
                                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                      }`}
                                    >
                                      {POINT_ROLE_LABELS[role]}
                                    </button>
                                  )
                                })}
                              </div>
                              {err && <div className="mt-1 text-[11px] font-semibold text-red-600">{err}</div>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}

          {/* 3. שאר השדות */}
          {groups.map(([group, list]) => {
            const visible = list.filter((x) => showIdentical || !x.identical)
            if (!visible.length) return null
            return (
              <section key={group}>
                <div className="mb-2 text-[12px] font-semibold text-slate-400">{group}</div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-right text-[13px]">
                    <thead className="bg-[#F9FAFB]">
                      <tr className="border-b border-slate-200">
                        <th className="w-[140px] px-4 py-2.5 text-[12px] font-semibold text-slate-500">שדה</th>
                        {orderedRecords.map((rec) => (
                          <th key={idOf(rec)} className={`px-4 py-2.5 text-[12px] font-semibold ${idOf(rec) === masterId ? 'text-[#008080]' : 'text-slate-500'}`}>
                            {idOf(rec) === masterId ? '⭐ ' : ''}{nameOf(rec)}
                          </th>
                        ))}
                        <th className="bg-slate-50 px-4 py-2.5 text-[12px] font-semibold text-slate-700">יישמר</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map(({ field, identical }) => {
                        const choice = choices[field.key]
                        const kind = field.kind ?? 'scalar'
                        const derived = field.derivedFrom
                          && !isEmptyValue(resolveFieldValue(records, idField, masterId, fields.find((f) => f.key === field.derivedFrom)!, choices[field.derivedFrom] ?? null))
                        const finalValue = resolveFieldValue(records, idField, masterId, field, choice)
                        return (
                          <tr key={field.key} className="align-top">
                            <td className="px-4 py-2.5 font-semibold text-slate-600">{field.label}</td>
                            {orderedRecords.map((rec) => {
                              const id = idOf(rec)
                              const val = fmt(field, rec[field.key])
                              if (identical || derived) {
                                return <td key={id} className="whitespace-pre-wrap break-words px-4 py-2.5 text-slate-500">{val}</td>
                              }
                              const isWinner = choice?.type === 'from' && choice.recordId === id
                              return (
                                <td key={id} className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => setChoice(field.key, { type: 'from', recordId: id })}
                                    className={`w-full whitespace-pre-wrap break-words rounded-xl px-3 py-1.5 text-right transition ${
                                      isWinner
                                        ? 'border border-[#008080] bg-[#F0FDFC] font-semibold text-[#008080]'
                                        : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                                    }`}
                                  >
                                    {isWinner && <Check className="mb-0.5 ml-1 inline h-3 w-3" />}
                                    {val}
                                  </button>
                                </td>
                              )
                            })}
                            <td className="bg-slate-50 px-4 py-2.5">
                              {derived ? (
                                <span className="text-[12px] text-slate-400">נקבע לפי העיר</span>
                              ) : (
                                <>
                                  <div className="whitespace-pre-wrap break-words font-semibold text-[#0F172A]">{fmt(field, finalValue)}</div>
                                  {!identical && kind !== 'scalar' && (
                                    <button
                                      type="button"
                                      onClick={() => setChoice(field.key, kind === 'array' ? { type: 'union' } : { type: 'concat' })}
                                      className={`mt-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${
                                        choice?.type === 'union' || choice?.type === 'concat'
                                          ? 'border-[#008080] bg-[#F0FDFC] text-[#008080]'
                                          : 'border-slate-200 text-slate-500 hover:bg-white'
                                      }`}
                                    >
                                      {kind === 'array' ? 'איחוד של כולם' : 'חיבור של כולם'}
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}

          {identicalCount > 0 && (
            <button
              type="button"
              onClick={() => setShowIdentical((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700"
            >
              {showIdentical ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showIdentical ? 'הסתר' : 'הצג'} {identicalCount} שדות זהים בכל הרשומות
            </button>
          )}

          {/* 4. סיכום */}
          <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px]">
            <div className="font-bold text-[#0F172A]">סיכום לפני מיזוג</div>
            {plan.movedToSecondary.map((m) => (
              <div key={`s-${m.label}-${m.value}`} className="text-slate-600">יעבור ל{m.label}: <span dir="ltr">{m.value}</span></div>
            ))}
            {plan.notesAppended.map((line) => (
              <div key={`n-${line}`} className="text-slate-600">יתווסף להערות: {line}</div>
            ))}
            {plan.lost.length === 0 ? (
              <div className="font-semibold text-[#008080]">שום ערך לא הולך לאיבוד.</div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <div className="mb-1 flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4" /> הערכים האלה לא יישמרו ברשומה:
                </div>
                <ul className="list-disc pr-5">
                  {plan.lost.map((l) => <li key={`${lossKey}-${l.label}-${l.value}`}>{l.label}: {l.value}</li>)}
                </ul>
                <label className="mt-2 flex cursor-pointer items-center gap-2 font-semibold">
                  <input type="checkbox" checked={confirmLoss} onChange={(e) => setConfirmLoss(e.target.checked)} />
                  מאשרת שהערכים האלה לא יישמרו
                </label>
              </div>
            )}
            {plan.errors.map((e) => (
              <div key={e} className="font-semibold text-red-600">{e}</div>
            ))}
            <div className="text-[12px] text-slate-500">
              הגשות, משרות, תגיות, היסטוריית פרסומים, חסימות, קישורי Google ו-Fix והיסטוריית השינויים עוברים לרשומה שנשארת.
              עותק מלא של כל רשומה שנמחקת נשמר בהיסטוריית השינויים.
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="text-[13px] text-slate-500">
            {records.length - 1} רשומות יתמזגו • נשארת: <span className="font-semibold text-[#0F172A]">{nameOf(masterRecord)}</span>
          </div>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={onClose}>ביטול</ActionButton>
            <ActionButton variant="primary" onClick={() => onConfirm(masterId, plan.overrides)} disabled={!canSubmit}>
              {pending ? 'ממזג...' : 'מזג ושמור'}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  )
}
