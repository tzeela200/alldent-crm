import { Check } from 'lucide-react'
import { CompactValueEditor } from '@/components/inbox-v2/CompactValueEditor'
import {
  describeMergeResult,
  type ChoiceId,
  type FieldComparison,
} from '@/lib/inbox-v2-merge'

/**
 * שורת השוואה אחת — **באותה תבנית של `MergeRecordsModal`** (INC-3125):
 * שדה · מה קיים אצלנו · מה הגיע · תוצאה סופית.
 *
 * הבחירה היא **לחיצה על הערך עצמו**, לא רדיו ולא תיבת אישור נוספת.
 * הלחיצה היא המעשה המפורש, ועמודת "תוצאה סופית" מראה בדיוק מה יישמר —
 * אותו דפוס בדיוק של מסך מיזוג הרשומות, כדי שלא יהיו שתי שפות במערכת.
 *
 * אפשרויות נוספות (שמירה כשדה משני, קידום ערך קיים, ערך אחר) יורדות
 * לשורה קטנה מתחת לערך הנכנס — קיימות כשצריך, לא מתחרות על תשומת הלב.
 */

interface Props {
  comparison: FieldComparison
  choice: ChoiceId
  onChoiceChange: (choice: ChoiceId) => void
  manualValue?: unknown
  onManualValueChange?: (value: unknown) => void
  /** מסומן כשדורש הכרעה ולא נבחר בו דבר */
  needsDecision?: boolean
  /** שם המקור בפועל ("Excel" / "Google Contacts" / ...) */
  sourceLabel?: string
}

const EMPTY = <span className="text-slate-300">—</span>

export function FieldComparisonRow({
  comparison,
  choice,
  onChoiceChange,
  manualValue,
  onManualValueChange,
  needsDecision,
}: Props) {
  const isAuto = comparison.status === 'auto'
  // נמחק במקור: אין ערך נכנס להציג, אבל כן יש החלטה — לשמור או למחוק.
  const isRemoved = comparison.status === 'removed'
  const isBlocked = comparison.status === 'unresolved'
  const isManual = choice === 'manual'
  const result = describeMergeResult(comparison, choice, manualValue)

  // אפשרויות מעבר ל"קיים" / "נכנס" — מוצגות רק כשהן באמת רלוונטיות.
  const extras = comparison.options.filter(
    (o) => o.id === 'secondary' || o.id === 'redirect' || o.id === 'existing_secondary'
  )

  const cell = (
    selected: boolean,
    value: React.ReactNode,
    onClick: (() => void) | null,
    dimmed = false
  ) => {
    if (!onClick) {
      return <span className={dimmed ? 'text-slate-400' : 'text-slate-600'}>{value}</span>
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-xl px-3 py-2 text-right transition ${
          selected
            ? 'border border-[#008080] bg-[#F0FDFC] font-semibold text-[#008080]'
            : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
        }`}
      >
        {selected && <Check className="mb-0.5 ml-1 inline h-3 w-3" />}
        {value}
      </button>
    )
  }

  return (
    <tr className={`hover:bg-slate-50/50 ${needsDecision ? 'bg-[#FFFBEB]' : ''}`}>
      <td className="px-4 py-3 align-top font-semibold text-slate-600">
        {comparison.label}
        {isAuto && (
          <div className="mt-0.5 text-[11px] font-normal text-[#00696B]">הוכרע אוטומטית</div>
        )}
        {isRemoved && (
          <div className="mt-0.5 text-[11px] font-normal text-[#B45309]">נמחק במקור</div>
        )}
        {needsDecision && (
          <div className="mt-0.5 text-[11px] font-normal text-[#B45309]">נדרשת בחירה</div>
        )}
      </td>

      {/* קיים אצלנו */}
      <td className="px-4 py-3 align-top" dir="auto">
        {cell(
          !isAuto && choice === 'existing',
          comparison.existingLabel ?? EMPTY,
          isAuto || comparison.existingLabel == null ? null : () => onChoiceChange('existing'),
          isAuto
        )}
      </td>

      {/* הגיע מהמקור */}
      <td className="px-4 py-3 align-top" dir="auto">
        {isRemoved
          ? cell(choice === 'incoming', <span className="text-[#B45309]">מחק גם אצלנו</span>,
                 () => onChoiceChange('incoming'))
          : cell(
              !isAuto && choice === 'incoming',
              comparison.incomingLabel ?? EMPTY,
              isAuto || isBlocked || comparison.incomingLabel == null
                ? null
                : () => onChoiceChange('incoming'),
              isAuto
            )}

        {isBlocked && comparison.blockedReason && (
          <div className="mt-1 px-3 text-[11px] text-[#B45309]">{comparison.blockedReason}</div>
        )}

        {(extras.length > 0 || onManualValueChange) && !isAuto && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-3">
            {extras.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onChoiceChange(o.id)}
                className={`text-[11px] underline-offset-2 transition hover:underline ${
                  choice === o.id ? 'font-semibold text-[#008080]' : 'text-slate-400'
                }`}
              >
                {o.label}
              </button>
            ))}
            {onManualValueChange && !isBlocked && (
              <button
                type="button"
                onClick={() => onChoiceChange('manual')}
                className={`text-[11px] underline-offset-2 transition hover:underline ${
                  isManual ? 'font-semibold text-[#008080]' : 'text-slate-400'
                }`}
              >
                ערך אחר
              </button>
            )}
          </div>
        )}

        {isManual && onManualValueChange && (
          <div className="mt-1 px-3">
            <CompactValueEditor
              kind={comparison.kind}
              value={manualValue}
              onChange={onManualValueChange}
            />
          </div>
        )}
      </td>

      {/* תוצאה סופית */}
      <td className="bg-slate-50 px-4 py-3 align-top" dir="auto">
        <span className="font-semibold text-[#0F172A]">{result.value}</span>
        {result.note && <div className="mt-0.5 text-[11px] font-normal text-slate-400">{result.note}</div>}
      </td>
    </tr>
  )
}
