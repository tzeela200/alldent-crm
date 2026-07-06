import React from 'react'
import { type LucideIcon } from 'lucide-react'

interface ShellProps {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
  actions?: React.ReactNode
}

export function Shell({ title, subtitle, icon: Icon, children, actions }: ShellProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F3F4F6] p-6 font-sans text-right text-[#2D2D2D]">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <header className="flex items-center justify-between rounded-[18px] bg-white p-5 border border-[#D9D9D9]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#008080] text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#2D2D2D]">{title}</h1>
              <p className="text-sm text-[#6B6B6B]">{subtitle}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

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
    <section className={`rounded-[18px] bg-white p-4 border border-[#D9D9D9] ${className}`}>
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
  default: 'bg-[#F3F4F6] text-[#6B6B6B] border-[#D9D9D9]',
  success: 'bg-[#E6F3F3] text-[#008080] border-[#99D6D6]',
  warning: 'bg-[#FDF3E7] text-[#E8A85C] border-[#F6D5A8]',
  danger:  'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  info:    'bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]',
  teal:    'bg-[#E6F3F3] text-[#008080] border-[#99D6D6]',
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
        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]"
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
        className="h-11 w-full rounded-full border border-[#D9D9D9] bg-white pr-10 pl-3 text-sm outline-none transition-colors focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
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
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#6B6B6B]">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#2D2D2D]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[#6B6B6B]">{description}</p>}
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
    neutral: 'text-[#6B6B6B]',
  }

  return (
    <div className="rounded-[18px] bg-white p-4 border border-[#D9D9D9]">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#6B6B6B]">{label}</div>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B6B6B]">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 text-3xl font-bold text-[#2D2D2D]">{value}</div>
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
    <div className="flex items-center justify-between border-t border-[#D9D9D9] px-4 py-3">
      <div className="text-sm text-[#6B6B6B]">
        עמוד {page + 1} מתוך {totalPages}
        {totalItems !== undefined && ` · ${totalItems} רשומות`}
      </div>
      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-full border border-[#D9D9D9] px-3 py-1.5 text-sm transition-colors hover:bg-[#F3F4F6] disabled:opacity-40"
        >
          הקודם
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-full border border-[#D9D9D9] px-3 py-1.5 text-sm transition-colors hover:bg-[#F3F4F6] disabled:opacity-40"
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
      className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080]"
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  icon?: LucideIcon
  disabled?: boolean
  size?: 'sm' | 'md'
}

const buttonVariants = {
  primary:   'bg-[#D97706] text-white hover:bg-[#B45309] shadow-sm',
  secondary: 'border border-[#D9D9D9] bg-white text-[#2D2D2D] hover:bg-[#F3F4F6]',
  ghost:     'text-[#6B6B6B] hover:bg-[#F3F4F6]',
  danger:    'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
  success:   'bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm',
}

export function ActionButton({ children, onClick, variant = 'secondary', icon: Icon, disabled, size = 'md' }: ActionButtonProps) {
  const sizeClasses = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-11 px-5 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-[14px] font-medium transition-all shadow-[4px_4px_8px_rgba(0,0,0,0.10)] hover:shadow-[2px_2px_4px_rgba(0,0,0,0.12)] disabled:opacity-50 ${buttonVariants[variant]} ${sizeClasses}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  )
}
