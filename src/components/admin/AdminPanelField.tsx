import type { ReactNode } from 'react'

// שדה אחיד לפאנל אדמין. עקרון מרכזי: הבלוק והכותרת נשארים באותו מקום
// במעבר צפייה↔עריכה/יצירה — רק תוכן ה-Value מתחלף.
// שדה שאין לו renderer לעריכה נשאר מוצג כ-read-only גם במצב edit/create,
// במקום להיעלם ולשנות את מבנה הפאנל.
interface AdminPanelFieldProps {
  label: string
  mode: 'view' | 'edit' | 'create'
  viewValue?: ReactNode
  editValue?: ReactNode
  htmlFor?: string
  helperText?: string
  error?: string
  disabled?: boolean
  /** שדה תופס שורה מלאה (למשל טקסט ארוך) */
  fullWidth?: boolean
  emptyLabel?: string
}

export function AdminPanelField({
  label,
  mode,
  viewValue,
  editValue,
  htmlFor,
  helperText,
  error,
  disabled,
  fullWidth,
  emptyLabel = '—',
}: AdminPanelFieldProps) {
  const isEmpty = viewValue == null || viewValue === ''
  const readOnlyValue = (
    <div className="text-[14px] font-medium text-[#2D2D2D]">
      {isEmpty ? <span className="text-[#9CA3AF]">{emptyLabel}</span> : viewValue}
    </div>
  )

  return (
    <div className={fullWidth ? 'sm:col-span-2' : undefined}>
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-semibold text-[#6B6B6B]">
        {label}
      </label>
      <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
        {mode === 'view' ? readOnlyValue : editValue ?? readOnlyValue}
      </div>
      {helperText && !error && <p className="mt-1 text-[12px] text-[#9CA3AF]">{helperText}</p>}
      {error && <p className="mt-1 text-[12px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  )
}
