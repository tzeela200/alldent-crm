import { useState } from 'react'
import { Merge, Star, Trash2, Check } from 'lucide-react'
import { ActionButton } from './layout/Shell'

export interface MergeField<T> {
  key: keyof T
  label: string
  format?: (val: unknown) => string
}

interface Props<T extends Record<string, unknown>> {
  records: T[]
  idField: keyof T
  nameField: keyof T
  displayFields: MergeField<T>[]
  onConfirm: (masterId: number, overrides: Record<string, unknown>) => Promise<void>
  onClose: () => void
  pending: boolean
  title?: string
}

export function MergeRecordsModal<T extends Record<string, unknown>>({
  records,
  idField,
  nameField,
  displayFields,
  onConfirm,
  onClose,
  pending,
  title = 'מיזוג רשומות',
}: Props<T>) {
  const [masterId, setMasterId] = useState<number>(Number(records[0][idField]))
  // fieldWinners: key → record index (which record's value wins)
  const [fieldWinners, setFieldWinners] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const f of displayFields) {
      initial[String(f.key)] = 0 // default: first record (will be master by default)
    }
    return initial
  })

  const masterIndex = records.findIndex((r) => Number(r[idField]) === masterId)

  const fmt = (field: MergeField<T>, val: unknown) => {
    if (val === null || val === undefined || val === '') return '—'
    if (field.format) return field.format(val)
    return String(val)
  }

  const allValuesEqual = (field: MergeField<T>) => {
    const vals = records.map((r) => r[field.key])
    return vals.every((v) => String(v ?? '') === String(vals[0] ?? ''))
  }

  const handleConfirm = async () => {
    const overrides: Record<string, unknown> = {}
    for (const f of displayFields) {
      const winnerIdx = fieldWinners[String(f.key)]
      const winnerRecord = records[winnerIdx]
      const masterRecord = records[masterIndex]
      // only send override if winner is NOT the master record
      if (winnerIdx !== masterIndex) {
        overrides[String(f.key)] = winnerRecord[f.key]
      } else {
        // include master's value so RPC sets it explicitly (handles case where master field is empty but we want to keep it)
        const val = masterRecord[f.key]
        if (val !== null && val !== undefined && val !== '') {
          overrides[String(f.key)] = val
        }
      }
    }
    await onConfirm(masterId, overrides)
  }

  const masterRecord = records[masterIndex] ?? records[0]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
            <Merge className="h-5 w-5" />
          </div>
          <div className="flex-1 text-right">
            <div className="text-[18px] font-bold text-[#0F172A]">{title}</div>
            <div className="text-[13px] font-medium text-slate-500">
              בחרו רשומת מאסטר ואת הערך המנצח בכל שדה
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Master selection cards */}
          <div className="mb-5">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              בחרו רשומת מאסטר — תישמר במערכת
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))` }}
            >
              {records.map((rec, idx) => {
                const id = Number(rec[idField])
                const isMaster = id === masterId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMasterId(id)
                      // reset field winners to new master index
                      const newIdx = idx
                      setFieldWinners((prev) => {
                        const updated = { ...prev }
                        for (const f of displayFields) {
                          if (updated[String(f.key)] === masterIndex) {
                            updated[String(f.key)] = newIdx
                          }
                        }
                        return updated
                      })
                    }}
                    className={`rounded-2xl border-2 p-4 text-right transition ${
                      isMaster
                        ? 'border-[#008080] bg-[#F0FDFC]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${
                        isMaster ? 'text-[#008080]' : 'text-slate-400'
                      }`}
                    >
                      {isMaster ? (
                        <><Star className="h-3 w-3 fill-current" /> מאסטר — תישמר</>
                      ) : (
                        <><Trash2 className="h-3 w-3" /> כפולה — תימחק</>
                      )}
                    </div>
                    <div className="text-[15px] font-bold text-[#0F172A]">
                      {String(rec[nameField] ?? '—')}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      ID: {id}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Field comparison table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-right text-[13px]">
              <thead className="bg-[#F9FAFB]">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-[12px] font-semibold text-slate-500 w-[120px]">שדה</th>
                  {records.map((rec, idx) => {
                    const id = Number(rec[idField])
                    const isMaster = id === masterId
                    return (
                      <th
                        key={id}
                        className={`px-4 py-3 text-[12px] font-semibold ${isMaster ? 'text-[#008080]' : 'text-slate-500'}`}
                      >
                        {isMaster ? '⭐ מאסטר' : `כפולה ${idx + 1}`}
                        <div className="text-[11px] font-normal opacity-60">{String(rec[nameField] ?? '')}</div>
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 text-[12px] font-semibold text-slate-700 bg-slate-50">תוצאה סופית</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayFields.map((field) => {
                  const equal = allValuesEqual(field)
                  const winnerIdx = fieldWinners[String(field.key)]
                  const winnerVal = fmt(field, records[winnerIdx]?.[field.key])

                  return (
                    <tr key={String(field.key)} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-600">{field.label}</td>
                      {records.map((rec, idx) => {
                        const val = fmt(field, rec[field.key])
                        const isWinner = !equal && winnerIdx === idx
                        if (equal) {
                          return (
                            <td key={idx} className="px-4 py-3 text-slate-500">
                              {val}
                            </td>
                          )
                        }
                        return (
                          <td key={idx} className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setFieldWinners((prev) => ({ ...prev, [String(field.key)]: idx }))
                              }
                              className={`w-full rounded-xl px-3 py-2 text-right transition ${
                                isWinner
                                  ? 'border border-[#008080] bg-[#F0FDFC] font-semibold text-[#008080]'
                                  : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                              }`}
                            >
                              {isWinner && <Check className="mb-0.5 mr-1 inline h-3 w-3" />}
                              {val}
                            </button>
                          </td>
                        )
                      })}
                      <td className="bg-slate-50 px-4 py-3">
                        {equal ? (
                          <span className="text-slate-400">{fmt(field, records[0][field.key])}</span>
                        ) : (
                          <span className="font-semibold text-[#0F172A]">{winnerVal}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Info note */}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
            כל הרשומות המקושרות (משרות, הגשות, תגיות) יועברו לרשומת המאסטר. הכפולות יימחקו לצמיתות.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="text-[13px] text-slate-500">
            {records.length - 1} רשומות יימחקו • מאסטר: <span className="font-semibold text-[#0F172A]">{String(masterRecord[nameField] ?? masterId)}</span>
          </div>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={onClose}>ביטול</ActionButton>
            <ActionButton variant="primary" onClick={handleConfirm} disabled={pending}>
              {pending ? 'ממזג...' : `מזג ושמור — "${String(masterRecord[nameField] ?? masterId)}"`}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  )
}
