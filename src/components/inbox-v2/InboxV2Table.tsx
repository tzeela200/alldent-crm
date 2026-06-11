import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { StatusPill } from '@/components/layout/Shell'
import { INBOX_STATUSES, getDictName, inboxStatusVariant } from '@/lib/inbox-v2-dicts'
import type { InboxV2Row } from '@/types/inbox-v2'

type SortKey = 'created_at' | 'display_name' | 'match_confidence' | 'merge_status'

interface Props {
  rows: InboxV2Row[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onRowClick: (leadId: number) => void
}

export function InboxV2Table({ rows, selectedIds, onSelectionChange, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    switch (sortKey) {
      case 'display_name':
        return dir * (a.display_name ?? '').localeCompare(b.display_name ?? '', 'he')
      case 'match_confidence':
        return dir * ((a.match_confidence ?? 0) - (b.match_confidence ?? 0))
      case 'merge_status':
        return dir * ((a.merge_status ?? 0) - (b.merge_status ?? 0))
      default:
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
  })

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.lead_id))

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !rows.find((r) => r.lead_id === id)))
    } else {
      const pageIds = rows.map((r) => r.lead_id)
      onSelectionChange([...new Set([...selectedIds, ...pageIds])])
    }
  }

  const toggleOne = (id: number) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    )
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="cursor-pointer select-none px-3 py-2 hover:text-teal-600"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === field ? 'text-teal-600' : 'text-slate-300'}`}
        />
      </span>
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-right text-xs font-medium text-slate-500">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </th>
            <SortHeader label="סטטוס" field="merge_status" />
            <SortHeader label="שם" field="display_name" />
            <th className="px-3 py-2">טלפון</th>
            <th className="px-3 py-2">אימייל</th>
            <th className="px-3 py-2">מקור</th>
            <SortHeader label="ביטחון" field="match_confidence" />
            <th className="px-3 py-2">התאמה</th>
            <th className="px-3 py-2">מידע חדש</th>
            <th className="px-3 py-2">תגיות</th>
            <SortHeader label="תאריך" field="created_at" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isSelected = selectedIds.includes(row.lead_id)
            return (
              <tr
                key={row.lead_id}
                className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                  isSelected ? 'bg-teal-50/50' : ''
                }`}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(row.lead_id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <StatusPill
                    label={getDictName(INBOX_STATUSES, row.merge_status)}
                    variant={inboxStatusVariant[row.merge_status ?? 1] ?? 'default'}
                  />
                </td>
                <td
                  className="cursor-pointer px-3 py-2 font-medium text-slate-900 hover:text-teal-700"
                  onClick={() => onRowClick(row.lead_id)}
                >
                  {row.display_name ?? '—'}
                  {row.seen_count > 1 && (
                    <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
                      {row.seen_count}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600" dir="ltr">
                  {row.phone ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600" dir="ltr">
                  {row.email ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{row.source_name ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.match_confidence != null ? (
                    <span
                      className={`text-xs font-semibold ${
                        row.match_confidence >= 80
                          ? 'text-emerald-600'
                          : row.match_confidence >= 40
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {row.match_confidence}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.match_contact
                    ? `#${row.match_contact}`
                    : row.match_account
                      ? `ארגון #${row.match_account}`
                      : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.has_new_information && (
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                      title="יש מידע חדש"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {row.tags.length > 2 && (
                      <span className="text-[10px] text-slate-400">+{row.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {new Date(row.created_at).toLocaleDateString('he-IL')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
