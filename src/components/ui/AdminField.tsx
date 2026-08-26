/**
 * ערכת השדות המשותפת של האדמין.
 *
 * ⚠️ למה הקובץ הזה קיים: 27 קבצים בפרויקט מממשים שדה קלט מקומית, כל אחד
 * עם וריאציה קלה משלו (rounded-xl מול rounded-[10px], h-11 מול py-2,
 * טבעת פוקוס ‎#E6F3F3 מול ‎#008080/15). זה בדיוק מה שגורם למסכים להיראות
 * כאוסף עמודים ולא כמערכת אחת.
 *
 * הטוקנים כאן נלקחו מ-AdminJobsPage ומ-JobDetailsPage, שהם הרפרנס
 * העיצובי של האדמין — לא הומצאו כאן:
 *   כרטיס  rounded-[18px] border-[#D9D9D9] bg-white shadow-sm
 *   קלט    h-11 rounded-xl border-[#D9D9D9] focus:border-[#008080]
 *          focus:ring-2 focus:ring-[#E6F3F3]
 *   תווית  12px font-semibold ‎#6B6B6B   ערך 14px ‎#2D2D2D
 *   פעולה  ‎#008080 → hover ‎#006D6D
 *
 * מסך חדש משתמש בזה. אין לממש שדה קלט מקומית.
 */
import type { ReactNode } from 'react'

export const ADMIN_INPUT =
  'h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium text-[#2D2D2D] ' +
  'outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3] ' +
  'disabled:bg-[#F5F5F5] disabled:text-[#9CA3AF]'

export const ADMIN_TEXTAREA =
  'w-full rounded-xl border border-[#D9D9D9] bg-white px-3 py-2.5 text-[14px] leading-6 text-[#2D2D2D] ' +
  'outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3] resize-y'

export const ADMIN_CARD = 'rounded-[18px] border border-[#D9D9D9] bg-white shadow-sm'

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1 block text-[12px] font-semibold text-[#6B6B6B]">
      {children}
      {hint && <span className="ms-1.5 font-normal text-[#9CA3AF]">{hint}</span>}
    </span>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  full,
  disabled,
  dir,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  type?: string
  full?: boolean
  disabled?: boolean
  dir?: 'rtl' | 'ltr'
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input
        type={type}
        dir={dir}
        className={ADMIN_INPUT}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/** מספר. ריק מחזיר null כדי שהעמודה תישאר NULL ולא 0. */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  step = '1',
  min = '0',
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  hint?: string
  step?: string
  min?: string
}) {
  return (
    <label className="block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        className={ADMIN_INPUT}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = '— ללא —',
  hint,
  full,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: ReadonlyArray<{ value: string; label: string }>
  placeholder?: string
  hint?: string
  full?: boolean
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <select className={ADMIN_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
  placeholder?: string
}) {
  return (
    <label className="block sm:col-span-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <textarea
        rows={rows}
        className={ADMIN_TEXTAREA}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function CheckField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-3 py-2.5 transition hover:border-[#008080]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#008080]"
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-[#2D2D2D]">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-5 text-[#9CA3AF]">{hint}</span>}
      </span>
    </label>
  )
}

/** רשימת מלל קצרה — Highlights, תגיות, יתרונות. */
export function StringListField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  hint?: string
  placeholder?: string
}) {
  const items = value.length ? value : ['']
  const clean = (arr: string[]) => arr.filter((x) => x.trim() !== '')
  return (
    <div className="sm:col-span-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={ADMIN_INPUT}
              value={item}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
            />
            <button
              type="button"
              onClick={() => onChange(clean(items.filter((_, j) => j !== i)))}
              className="shrink-0 rounded-xl border border-[#D9D9D9] px-3 text-[13px] font-semibold text-[#6B6B6B] transition hover:border-[#DC2626] hover:text-[#DC2626]"
            >
              הסרה
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...clean(items), ''])}
        className="mt-2 text-[13px] font-semibold text-[#008080] hover:underline"
      >
        + הוספת שורה
      </button>
    </div>
  )
}

/** כרטיס מקטע בתוך מסך אדמין. אותם טוקנים כמו הכרטיסים ב-AdminJobsPage. */
export function AdminCard({
  title,
  description,
  action,
  children,
  grid = true,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  grid?: boolean
}) {
  return (
    <section className={`mb-4 p-5 last:mb-0 ${ADMIN_CARD}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-[#2D2D2D]">{title}</h3>
          {description && (
            <p className="mt-1 text-[12.5px] leading-5 text-[#6B6B6B]">{description}</p>
          )}
        </div>
        {action}
      </div>
      {grid ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}
