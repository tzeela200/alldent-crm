import { ChevronRight, ChevronLeft } from 'lucide-react'

// פאג'ינציה אחידה לכל טבלאות האדמין. RTL: "הבא" מצביע שמאלה (עמוד גבוה יותר),
// "הקודם" ימינה — לפי כיוון קריאה טבעי.
interface AdminTablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function AdminTablePagination({ page, pageSize, total, onPageChange }: AdminTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between border-t border-[#D9D9D9] bg-white px-4 py-3 text-[13px] text-[#6B6B6B]" dir="rtl">
      <span>
        מציג {from}–{to} מתוך {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="עמוד קודם"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D9D9D9] text-[#6B6B6B] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="px-2 font-semibold text-[#2D2D2D]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="עמוד הבא"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D9D9D9] text-[#6B6B6B] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
