export type AdminBadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'purple' | 'amber' | 'teal'

interface AdminBadgeProps {
  label: string
  variant?: AdminBadgeVariant
}

const variants: Record<AdminBadgeVariant, string> = {
  success: 'bg-[#E6F3F3] text-[#008080] border-[#99D6D6]',
  warning: 'bg-[#FDF3E7] text-[#E8A85C] border-[#F6D5A8]',
  error:   'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  neutral: 'bg-[#F3F4F6] text-[#6B6B6B] border-[#D9D9D9]',
  info:    'bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]',
  purple:  'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
  amber:   'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  teal:    'bg-[#E6F3F3] text-[#008080] border-[#99D6D6]',
}

export function AdminBadge({ label, variant = 'neutral' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex rounded-[6px] border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${variants[variant]}`}>
      {label}
    </span>
  )
}
