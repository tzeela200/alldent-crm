import type { ReactNode } from 'react'

// שדה אחיד לפאנל אדמין. עקרון מרכזי: הבלוק והכותרת נשארים באותו מקום
// במעבר צפייה↔עריכה — רק תוכן ה-Value מתחלף (viewValue מול editValue).
// ה-caller אחראי על ה-input/select בפועל (editValue) ועל הפורמט בתצוגה
// (viewValue) — Field רק אוכף Label/ריווח/שגיאה/מצב-ריק אחידים.
interface AdminPanelFieldProps {
  label: string
  mode: 'view' | 'edit'
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
  const isEmptyView = mode === 'view' && (viewValue == null || viewValue === '')

  return (
    <div className={fullWidth ? 'sm:col-span-2' : undefined}>
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-semibold text-[#6B6B6B]">
        {label}
      </label>
      <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
        {mode === 'view' ? (
          <div className="text-[14px] font-medium text-[#2D2D2D]">
            {isEmptyView ? <span className="text-[#9CA3AF]">{emptyLabel}</span> : viewValue}
          </div>
        ) : (
          editValue
        )}
      </div>
      {helperText && !error && <p className="mt-1 text-[12px] text-[#9CA3AF]">{helperText}</p>}
      {error && <p className="mt-1 text-[12px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  )
}
