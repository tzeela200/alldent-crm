import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface AdminColumn<T = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (row: T, index: number) => React.ReactNode
}

interface AdminTableProps<T = Record<string, unknown>> {
  columns: AdminColumn<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  selectedIds?: string[]
  onSelectId?: (id: string) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function AdminTable<T = Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  selectedIds,
  onSelectId,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  emptyMessage = 'אין נתונים להצגה',
}: AdminTableProps<T>) {
  const hasSelect = !!onSelectId
  const colSpan = columns.length + (hasSelect ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#D9D9D9] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-[14px]">
          <thead>
            <tr className="border-b border-[#D9D9D9] bg-[#F3F4F6]">
              {hasSelect && <th className="w-10 px-3 py-3" />}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] whitespace-nowrap${
                    col.sortable ? ' cursor-pointer select-none hover:text-[#2D2D2D]' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-[#D9D9D9] border-t-[#008080]" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-[#6B6B6B]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const id = String(row[keyField])
                const isSelected = selectedIds?.includes(id)
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`h-12 transition-colors${onRowClick ? ' cursor-pointer' : ''}${
                      isSelected ? ' bg-[#E6F3F3]' : ' hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {hasSelect && (
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => onSelectId?.(id)}
                          className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 text-[#2D2D2D]">
                        {col.render
                          ? col.render(row, idx)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
