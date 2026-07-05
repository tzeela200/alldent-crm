import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc'

interface SortableThProps {
  label: string
  sortKey: string
  sortBy: string | null
  sortDir: SortDir
  onSort: (key: string) => void
  className?: string
}

/**
 * Clickable table header with sort arrows. Shared component — click toggles
 * sort on `sortKey`; the parent owns `sortBy`/`sortDir` state.
 */
export function SortableTh({ label, sortKey, sortBy, sortDir, onSort, className }: SortableThProps) {
  const active = sortBy === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={cn('cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:bg-slate-100', className)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className={cn('flex flex-col', active ? 'text-[#008080]' : 'text-slate-400')}>
          <ChevronUp className={cn('h-3 w-3 -mb-1', active && sortDir === 'asc' ? 'text-[#008080]' : 'text-slate-300')} />
          <ChevronDown className={cn('h-3 w-3', active && sortDir === 'desc' ? 'text-[#008080]' : 'text-slate-300')} />
        </span>
      </span>
    </th>
  )
}

export default SortableTh
