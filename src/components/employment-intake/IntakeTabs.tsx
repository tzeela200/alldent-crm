/**
 * INC-3129 — חמש רשימות העבודה מהמפרט של המשתמשת
 * (whatsapp-dental-recruitment): מחפשי עבודה · מגייסים · מצטרפים חדשים ·
 * מאגר מספרים · לא סווג.
 *
 * הספירה בכל לשונית היא **אנשים**, לא הודעות — זה כל ההבדל בין מספר
 * שאפשר לעבוד לפיו לבין "מגייסים 991" שספר הודעות ולא אמר כלום.
 */

import { INTAKE_TAB_ORDER, INTAKE_TAB_LABEL, type IntakeTab } from '@/lib/employment-intake/personRows'

interface Props {
  value: IntakeTab
  counts: Record<IntakeTab, number> | undefined
  onChange: (tab: IntakeTab) => void
}

export function IntakeTabs({ value, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#E5E7EB]" role="tablist">
      {INTAKE_TAB_ORDER.map((tab) => {
        const active = tab === value
        const count = counts?.[tab]
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] transition-colors ${
              active
                ? 'border-[#008080] font-semibold text-[#008080]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#2D2D2D]'
            }`}
          >
            {INTAKE_TAB_LABEL[tab]}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                active ? 'bg-[#E6F3F3] text-[#008080]' : 'bg-[#F3F4F6] text-[#6B6B6B]'
              }`}
            >
              {count ?? '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
