import React, { type ReactNode } from 'react'
import { SortableTh } from '@/components/ui/SortableTh'

export interface AdminColumn<T = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  minWidth?: string
  /** מונע שבירת שורה — לשימוש בטלפון/נייד/קוד משרה */
  nowrap?: boolean
  /** מחלקות נוספות לתא הנתונים */
  cellClassName?: string
  /** מחלקות נוספות לכותרת עמודה שאינה ממוינת */
  headerClassName?: string
  render?: (row: T, index: number) => React.ReactNode
}

interface AdminTableProps<T = Record<string, unknown>> {
  columns: AdminColumn<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  selectedIds?: string[]
  onSelectId?: (id: string) => void
  /** בחירת כל הרשומות המוצגות בעמוד הנוכחי */
  allSelected?: boolean
  someSelected?: boolean
  onSelectAll?: () => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  isLoading?: boolean
  /** true כאשר ריק בגלל חיפוש/פילטר פעיל — הודעה שונה מ-emptyMessage הגנרי */
  hasActiveFilter?: boolean
  emptyMessage?: string
  noResultsMessage?: string
  /** הודעת שגיאה — אם קיימת, מוצגת במקום שורות הנתונים */
  error?: string
  /** משבצת Bulk actions — מוצגת מעל הטבלה כשיש selectedIds */
  bulkActions?: ReactNode
  /** משבצת פאג'ינציה — מוצגת מתחת לטבלה (למשל AdminTablePagination) */
  pagination?: ReactNode
  /** כותרת דביקה כשהטבלה בתוך container גליל גבוה */
  stickyHeader?: boolean
  /** רוחב מינימלי לטבלאות עם הרבה עמודות */
  minWidth?: string
  /** התאמת שורה למסך מסוים בלי לשכפל את מבנה הטבלה */
  rowClassName?: (row: T) => string | undefined
}

export function AdminTable<T = Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  selectedIds,
  onSelectId,
  allSelected,
  someSelected,
  onSelectAll,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  hasActiveFilter,
  emptyMessage = 'אין נתונים להצגה',
  noResultsMessage = 'לא נמצאו תוצאות התואמות את החיפוש',
  error,
  bulkActions,
  pagination,
  stickyHeader,
  minWidth,
  rowClassName,
}: AdminTableProps<T>) {
  const hasSelect = !!onSelectId
  const colSpan = columns.length + (hasSelect ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#D9D9D9] bg-white">
      {bulkActions && selectedIds && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#D9D9D9] bg-[#E6F3F3] px-4 py-2.5 text-[13px]" dir="rtl">
          <span className="font-semibold text-[#008080]">{selectedIds.length} נבחרו</span>
          {bulkActions}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-[14px]" style={minWidth ? { minWidth } : undefined}>
          <thead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
            <tr className="border-b border-[#D9D9D9] bg-[#F3F4F6]">
              {hasSelect && (
                <th className="w-10 px-3 py-3">
                  {onSelectAll && (
                    <input
                      type="checkbox"
                      aria-label="בחירת כל הרשומות בעמוד"
                      checked={!!allSelected}
                      ref={(node) => {
                        if (node) node.indeterminate = !!someSelected && !allSelected
                      }}
                      onChange={onSelectAll}
                      className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]"
                    />
                  )}
                </th>
              )}
              {columns.map((col) =>
                col.sortable && onSort ? (
                  <SortableTh
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    sortBy={sortKey ?? null}
                    sortDir={sortDir ?? 'asc'}
                    onSort={onSort}
                    className="text-[14px] font-semibold text-[#6B6B6B]"
                  />
                ) : (
                  <th
                    key={col.key}
                    style={{
                      ...(col.width ? { width: col.width } : {}),
                      ...(col.minWidth ? { minWidth: col.minWidth } : {}),
                    }}
                    className={`whitespace-nowrap px-3 py-3 text-[14px] font-semibold text-[#6B6B6B] ${col.headerClassName ?? ''}`}
                  >
                    {col.label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {error ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-[#DC2626]">
                  {error}
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-0">
                  <div className="space-y-0">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex h-12 items-center gap-3 border-b border-[#F3F4F6] px-3 last:border-b-0">
                        {columns.map((col) => (
                          <div key={col.key} className="h-3 flex-1 animate-pulse rounded bg-[#F3F4F6]" />
                        ))}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-[#6B6B6B]">
                  {hasActiveFilter ? noResultsMessage : emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const id = String(row[keyField])
                const isSelected = selectedIds?.includes(id)
                const customRowClass = rowClassName?.(row) ?? ''
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`h-12 transition-colors${onRowClick ? ' cursor-pointer' : ''}${
                      isSelected ? ' bg-[#E6F3F3]' : ' hover:bg-[#F9FAFB]'
                    } ${customRowClass}`}
                  >
                    {hasSelect && (
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`בחירת רשומה ${id}`}
                          checked={!!isSelected}
                          onChange={() => onSelectId?.(id)}
                          className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 text-[#2D2D2D]${col.nowrap ? ' whitespace-nowrap' : ''} ${col.cellClassName ?? ''}`}
                      >
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
      {pagination}
    </div>
  )
}
