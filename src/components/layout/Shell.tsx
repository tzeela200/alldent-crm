import React from 'react'
import { type LucideIcon } from 'lucide-react'

// =====================================================
// Shell — Layout עקבי לכל 14 המסכים
// מבוסס על ה-pattern מ-alldent_14_screens_links
// RTL, Heebo, Teal, Cards מעוגלים
// =====================================================

interface ShellProps {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
  actions?: React.ReactNode
}

export function Shell({ title, subtitle, icon: Icon, children, actions }: ShellProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F9FAFB] p-6 font-sans text-right text-slate-900">
      <div className="mx-auto max-w-[1700px] space-y-4">
        {/* Page Header */}
        <header className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}

// Card / Section wrapper
interface ToolbarProps {
  children: React.ReactNode
  className?: string
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  )
}

// Status Badge
interface StatusPillProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'
}

const pillVariants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-sky-100 text-sky-800 border-sky-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
}

export function StatusPill({ label, variant = 'default' }: StatusPillProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${pillVariants[variant]}`}>
      {label}
    </span>
  )
}

// Search Bar
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'חיפוש...' }: SearchBarProps) {
  return (
    <div className="relative min-w-[260px] flex-1">
      <svg
        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      />
    </div>
  )
}

// Empty State
interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// KPI Card
interface KPICardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export function KPICard({ label, value, icon: Icon, trend, trendValue }: KPICardProps) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    neutral: 'text-slate-500',
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{label}</div>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {trend && trendValue && (
        <div className={`mt-1 text-xs ${trendColors[trend]}`}>{trendValue}</div>
      )}
    </div>
  )
}

// Pagination
interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
}

export function Pagination({ page, totalPages, onPageChange, totalItems }: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <div className="text-sm text-slate-500">
        עמוד {page + 1} מתוך {totalPages}
        {totalItems !== undefined && ` · ${totalItems} רשומות`}
      </div>
      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          הקודם
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          הבא
        </button>
      </div>
    </div>
  )
}

// Select Filter
interface SelectFilterProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}

export function SelectFilter({ value, onChange, options, placeholder }: SelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-teal-500"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// Action Button
interface ActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: LucideIcon
  disabled?: boolean
  size?: 'sm' | 'md'
}

const buttonVariants = {
  primary: 'bg-amber-500 text-white hover:bg-amber-600',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}

export function ActionButton({ children, onClick, variant = 'secondary', icon: Icon, disabled, size = 'md' }: ActionButtonProps) {
  const sizeClasses = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-11 px-4 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${buttonVariants[variant]} ${sizeClasses}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  )
}
