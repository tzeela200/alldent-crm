import { AdminBadge, type AdminBadgeVariant } from '@/components/admin/AdminBadge'
import { describeMergeResult, type ChoiceId, type ComparisonStatus, type FieldComparison, type MergeResultTone } from '@/lib/inbox-v2-merge'

/**
 * שורת השוואה אחת בשער האישור:
 * שם השדה · מה יש אצלנו · מה הגיע מגוגל · **מה יישמר אחרי האישור**.
 *
 * העמודה הרביעית היא העיקר: בלעדיה המשתמשת רואה שתי אפשרויות וצריכה
 * לדמיין את התוצאה. היא מתעדכנת חי לפי הבחירה.
 *
 * רכיב תצוגה טהור — כל ההחלטות מגיעות מ-inbox-v2-merge.ts.
 * אינו מייבא דבר מ-MergeRecordsModal (מיזוג כפילויות) — אין מחיקה ואין העברת קשרים.
 */

const STATUS_META: Record<ComparisonStatus, { label: string; variant: AdminBadgeVariant }> = {
  none: { label: '', variant: 'neutral' },
  same: { label: 'זהה', variant: 'neutral' },
  complete: { label: 'השלמת מידע חסר', variant: 'teal' },
  diff: { label: 'פער', variant: 'error' },
  unresolved: { label: 'מידע לא מזוהה', variant: 'amber' },
}

const ROW_BG: Record<ComparisonStatus, string> = {
  none: 'bg-[#F8F9FA]',
  same: 'bg-[#F8F9FA]',
  complete: 'bg-[#E6F3F3]',
  diff: 'bg-[#FEF2F2]',
  unresolved: 'bg-[#FFFBEB]',
}

/** צבע עמודת התוצאה — ירוק כשמשהו נכנס, אפור כשלא, אדום כשחסום. */
const RESULT_TONE: Record<MergeResultTone, string> = {
  unchanged: 'text-[#9CA3AF]',
  new: 'text-[#008080] font-semibold',
  replaced: 'text-[#008080] font-semibold',
  elsewhere: 'text-[#008080] font-semibold',
  blocked: 'text-[#B45309] font-semibold',
}

interface Props {
  comparison: FieldComparison
  choice: ChoiceId
  onChoiceChange: (choice: ChoiceId) => void
  overwriteConfirmed: boolean
  onOverwriteConfirmChange: (confirmed: boolean) => void
}

export function FieldComparisonRow({
  comparison,
  choice,
  onChoiceChange,
  overwriteConfirmed,
  onOverwriteConfirmChange,
}: Props) {
  const meta = STATUS_META[comparison.status]
  const needsOverwriteConfirm = comparison.options.some((o) => o.requiresOverwriteConfirm)
  const result = describeMergeResult(comparison, choice)
  const isSame = comparison.status === 'same'

  return (
    <div
      className={`grid grid-cols-1 gap-2 rounded-[10px] px-3 py-2 text-[13px] sm:grid-cols-[1fr_1fr_1fr_1.4fr] sm:items-start ${
        ROW_BG[comparison.status]
      } ${isSame ? 'opacity-60' : ''}`}
    >
      <div className="space-y-1">
        <div className="font-semibold text-[#2D2D2D]">{comparison.label}</div>
        {meta.label && <AdminBadge label={meta.label} variant={meta.variant} />}
      </div>

      <div>
        <div className="text-[11px] text-[#9CA3AF]">יש אצלנו</div>
        <div className="text-[12px] text-[#6B6B6B]" dir="auto">
          {comparison.existingLabel ?? <span className="text-[#D9D9D9]">(ריק)</span>}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-[#9CA3AF]">הגיע מגוגל</div>
        <div className="text-[12px] text-[#6B6B6B]" dir="auto">
          {comparison.incomingLabel ?? <span className="text-[#D9D9D9]">(ריק)</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div>
          <div className="text-[11px] text-[#9CA3AF]">אחרי האישור</div>
          <div className={`text-[12px] ${RESULT_TONE[result.tone]}`} dir="auto">
            {result.tone === 'unchanged' && !isSame ? 'ללא שינוי' : result.value}
          </div>
          {result.note && <div className="text-[11px] text-[#9CA3AF]">{result.note}</div>}
        </div>

        {!isSame && (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {comparison.options.map((option) => {
                const locked = !!option.requiresOverwriteConfirm && !overwriteConfirmed
                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-1 text-[11px] ${locked ? 'opacity-40' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`cmp-${comparison.key}`}
                      checked={choice === option.id}
                      disabled={locked}
                      onChange={() => onChoiceChange(option.id)}
                      className="h-3 w-3 accent-[#008080]"
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>

            {comparison.blockedReason && (
              <span className="text-[11px] font-medium text-[#B45309]">
                ⚠️ {comparison.blockedReason}
              </span>
            )}

            {needsOverwriteConfirm && (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]">
                <input
                  type="checkbox"
                  checked={overwriteConfirmed}
                  onChange={(e) => onOverwriteConfirmChange(e.target.checked)}
                  className="h-3 w-3 accent-[#DC2626]"
                />
                אני מאשרת דריסת ערך קיים
              </label>
            )}
          </>
        )}
      </div>
    </div>
  )
}
