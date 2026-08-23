/**
 * "סווג מחדש" — תצוגה מקדימה מקובצת לפי סוג השינוי, לא רשימה שטוחה של
 * כל רשומה בנפרד. באצווה של אלפי רשומות (שדרוג ראשוני), רשימה שטוחה עם
 * checkbox לכל שורה אינה ניתנת לסקירה אנושית — אי אפשר לגלול אלפי שורות
 * ולהחליט אחת-אחת. קיבוץ לפי "מה בדיוק השתנה" (group_join_status_fixed/
 * now_matched/now_hidden_system_noise/category_changed/field_updated)
 * מאפשר להחליט ברמת הקבוצה ("אני סומכת על 50 השינויים האלה כקבוצה") ועדיין
 * לפתוח קבוצה ולסמן/לבטל שורה בודדת בתוכה כשצריך.
 */

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { useCityIndex } from '@/hooks/useEmploymentIntakeNormalize'
import {
  buildReclassifyPreview,
  useRunReclassify,
  type ReclassifyScope,
  type ReclassifyPreview,
  type ReclassifyRowPlan,
  type ReclassifyRunReport,
} from '@/hooks/useEmploymentIntakeReclassify'
import { CONTENT_TYPE_LABEL, fieldLabel } from '@/lib/employment-intake/labels'
import { describeError } from '@/lib/employment-intake/errors'
import type { ReclassifyBucket } from '@/lib/employment-intake/reclassifyDiff'

const BUCKET_LABEL: Record<ReclassifyBucket, string> = {
  now_matched: 'נמצאה התאמה חדשה',
  now_hidden_system_noise: 'יוסתר כרעש מערכת',
  group_join_status_fixed: 'הצטרפות תוקנה',
  category_changed: 'קטגוריה השתנתה',
  field_updated: 'שדה עודכן',
  no_change: 'ללא שינוי',
}

const BUCKET_TONE: Record<ReclassifyBucket, 'success' | 'warning' | 'neutral' | 'info'> = {
  now_matched: 'success',
  now_hidden_system_noise: 'info',
  group_join_status_fixed: 'success',
  category_changed: 'info',
  field_updated: 'neutral',
  no_change: 'neutral',
}

/** סדר תצוגה: קבוצות קטנות/מעניינות קודם, "שדה עודכן" (בדרך כלל הכי גדולה) אחרונה. */
const BUCKET_ORDER: ReclassifyBucket[] = ['group_join_status_fixed', 'now_matched', 'now_hidden_system_noise', 'category_changed', 'field_updated']

/** קבוצה גדולה מזה לא מציגה checkbox לכל שורה — רק דוגמה + החלטה על הקבוצה כולה. */
const ROW_LIST_LIMIT = 300
const CONFIRM_TYPED_THRESHOLD = 200

function formatValue(field: string, value: unknown): string {
  if (value == null || value === '') return '(ריק)'
  if (field === 'content_type' && typeof value === 'string' && value in CONTENT_TYPE_LABEL) {
    return CONTENT_TYPE_LABEL[value as keyof typeof CONTENT_TYPE_LABEL]
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(ריק)'
  return String(value)
}

interface BucketGroup {
  bucket: ReclassifyBucket
  plans: ReclassifyRowPlan[]
}

interface Props {
  scope: ReclassifyScope | null
  onClose: () => void
  onDone: (report: ReclassifyRunReport) => void
}

export function ReclassifyPreviewDialog({ scope, onClose, onDone }: Props) {
  const { data: cityIndex } = useCityIndex()
  const runReclassify = useRunReclassify()

  const [preview, setPreview] = useState<ReclassifyPreview | null>(null)
  const [building, setBuilding] = useState(false)
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set())
  const [expandedBuckets, setExpandedBuckets] = useState<Set<ReclassifyBucket>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [confirmed, setConfirmed] = useState(false)
  const [typedCount, setTypedCount] = useState('')

  const groups: BucketGroup[] = useMemo(() => {
    if (!preview) return []
    const byBucket = new Map<ReclassifyBucket, ReclassifyRowPlan[]>()
    for (const plan of preview.plans) {
      const list = byBucket.get(plan.bucket) ?? []
      list.push(plan)
      byBucket.set(plan.bucket, list)
    }
    return BUCKET_ORDER.map((bucket) => ({ bucket, plans: byBucket.get(bucket) ?? [] })).filter((g) => g.plans.length > 0)
  }, [preview])

  if (!scope) return null

  async function handleBuildPreview() {
    if (!cityIndex) return
    setBuilding(true)
    try {
      const result = await buildReclassifyPreview(scope!, cityIndex)
      setPreview(result)
      setIncludedIds(new Set(result.plans.map((p) => p.rowId)))
      setExpandedBuckets(new Set())
      setConfirmed(false)
      setTypedCount('')
    } catch (err) {
      toast.error(describeError(err, 'בניית התצוגה המקדימה נכשלה'))
    } finally {
      setBuilding(false)
    }
  }

  function toggleRow(id: number) {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleRowExpand(id: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleBucketExpand(bucket: ReclassifyBucket) {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      return next
    })
  }

  function setGroupIncluded(group: BucketGroup, include: boolean) {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      for (const p of group.plans) {
        if (include) next.add(p.rowId)
        else next.delete(p.rowId)
      }
      return next
    })
  }

  function selectAll() {
    if (!preview) return
    setIncludedIds(new Set(preview.plans.map((p) => p.rowId)))
  }
  function selectNone() {
    setIncludedIds(new Set())
  }

  function handleRun() {
    if (!preview) return
    runReclassify.mutate(
      { plans: preview.plans, includedIds },
      {
        onSuccess: (report) => {
          onDone(report)
          onClose()
        },
      },
    )
  }

  const includedCount = includedIds.size
  const needsTypedConfirm = includedCount > CONFIRM_TYPED_THRESHOLD
  const typedConfirmOk = !needsTypedConfirm || typedCount.trim() === String(includedCount)
  const canRun = !!preview && confirmed && includedCount > 0 && typedConfirmOk && !runReclassify.isPending

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>סווג מחדש לפי הכללים העדכניים</DialogTitle>
        </DialogHeader>

        {!preview && (
          <p className="text-[13px] text-[#6B6B6B]">בודק רשומות קיימות מול הכללים העדכניים. שום דבר לא נכתב לפני שתאשרי, ושדה שנערך ידנית לא יידרס.</p>
        )}

        {!preview ? (
          <ActionButton variant="secondary" disabled={building || !cityIndex} onClick={handleBuildPreview}>
            {building ? 'סורק ומחשב…' : 'הצגת תצוגה מקדימה'}
          </ActionButton>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-1"><b>{preview.scanned}</b> נסרקו</span>
              <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-1"><b>{preview.eligible}</b> זכאיות</span>
              <span className="rounded-full border border-[#99D6D6] bg-[#E6F3F3] px-3 py-1 text-[#008080]"><b>{preview.plans.length}</b> ישתנו</span>
              <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-1"><b>{preview.buckets.no_change}</b> ללא שינוי</span>
            </div>

            {preview.plans.length === 0 ? (
              <p className="text-[13px] text-[#6B6B6B]">אין שינויים להציע — כל הרשומות הזכאיות כבר תואמות את הכללים העדכניים.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#2D2D2D]">{includedCount} מתוך {preview.plans.length} מסומנות לביצוע</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <button type="button" onClick={selectAll} className="text-[12px] font-semibold text-[#008080] hover:underline">סמני הכול</button>
                    <button type="button" onClick={selectNone} className="text-[12px] font-semibold text-[#6B6B6B] hover:underline">בטלי הכול</button>
                    <span className="text-[#D9D9D9]">|</span>
                    <button type="button" onClick={() => setExpandedBuckets(new Set(groups.map((g) => g.bucket)))} className="text-[12px] font-semibold text-[#008080] hover:underline">פתחי את כל הקבוצות</button>
                    <button type="button" onClick={() => setExpandedBuckets(new Set())} className="text-[12px] font-semibold text-[#6B6B6B] hover:underline">סגרי את כל הקבוצות</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {groups.map((group) => {
                    const isOpen = expandedBuckets.has(group.bucket)
                    const includedInGroup = group.plans.filter((p) => includedIds.has(p.rowId)).length
                    const allIncluded = includedInGroup === group.plans.length
                    const someIncluded = includedInGroup > 0 && !allIncluded
                    const showRowList = group.plans.length <= ROW_LIST_LIMIT

                    return (
                      <div key={group.bucket} className="rounded-[12px] border border-[#D9D9D9]">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F9FAFB] px-3 py-2.5">
                          <button type="button" onClick={() => toggleBucketExpand(group.bucket)} className="flex items-center gap-2 text-right">
                            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-[#9CA3AF]" /> : <ChevronLeft className="h-4 w-4 shrink-0 text-[#9CA3AF]" />}
                            <AdminBadge label={BUCKET_LABEL[group.bucket]} variant={BUCKET_TONE[group.bucket]} />
                            <span className="text-[13px] font-semibold text-[#2D2D2D]">{group.plans.length} רשומות</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-[#6B6B6B]">{includedInGroup}/{group.plans.length} מסומנות</span>
                            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2D2D2D]">
                              <input
                                type="checkbox"
                                checked={allIncluded}
                                ref={(el) => { if (el) el.indeterminate = someIncluded }}
                                onChange={(e) => setGroupIncluded(group, e.target.checked)}
                                className="h-4 w-4 accent-[#008080]"
                                aria-label={`כלול/י את כל קבוצת "${BUCKET_LABEL[group.bucket]}"`}
                              />
                              כל הקבוצה
                            </label>
                          </div>
                        </div>

                        {isOpen && !showRowList && (
                          <div className="border-t border-[#F3F4F6] px-3 py-2 text-[12px] text-[#6B6B6B]">
                            {group.plans.length} רשומות — יותר מדי להצגה בודדת. דוגמה מתוך הקבוצה:
                            <ul className="mt-1.5 space-y-1">
                              {group.plans.slice(0, 5).map((p) => (
                                <li key={p.rowId} className="truncate">· {p.originalText}</li>
                              ))}
                            </ul>
                            <div className="mt-1.5">ועוד {group.plans.length - 5} רשומות נוספות מאותו סוג. ההחלטה כאן היא על הקבוצה כולה — "כל הקבוצה" למעלה.</div>
                          </div>
                        )}

                        {isOpen && showRowList && (
                          <div className="space-y-1 border-t border-[#F3F4F6] p-2">
                            {group.plans.map((plan) => {
                              const isRowOpen = expandedRows.has(plan.rowId)
                              const isIncluded = includedIds.has(plan.rowId)
                              return (
                                <div key={plan.rowId} className={`rounded-[10px] border ${isIncluded ? 'border-[#D9D9D9]' : 'border-[#F3F4F6] opacity-60'}`}>
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={isIncluded}
                                      onChange={() => toggleRow(plan.rowId)}
                                      className="h-4 w-4 shrink-0 accent-[#008080]"
                                      aria-label={`כלול רשומה #${plan.rowId} בסיווג מחדש`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => toggleRowExpand(plan.rowId)}
                                      className="flex flex-1 items-center gap-2 overflow-hidden text-right text-[13px]"
                                    >
                                      {isRowOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-[#9CA3AF]" /> : <ChevronLeft className="h-4 w-4 shrink-0 text-[#9CA3AF]" />}
                                      <span className="truncate text-[#2D2D2D]">{plan.originalText}</span>
                                    </button>
                                  </div>
                                  {isRowOpen && (
                                    <ul className="space-y-1 border-t border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2 text-[12px]">
                                      {plan.touchedFields.filter((f) => f !== 'tags').map((field) => (
                                        <li key={field} className="flex items-center justify-between gap-2">
                                          <span className="text-[#6B6B6B]">{fieldLabel(field)}</span>
                                          <span className="text-[#2D2D2D]">
                                            {formatValue(field, plan.before[field])} ← <span className="font-semibold text-[#008080]">{formatValue(field, plan.after[field])}</span>
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
                  אני מאשרת ביצוע סיווג מחדש עבור {includedCount} רשומות
                </label>

                {needsTypedConfirm && (
                  <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-3 text-[13px] text-[#8A5A1F]">
                    <label className="flex flex-col gap-1.5">
                      זו פעולה על {includedCount} רשומות — הקלידי את המספר לאישור נוסף:
                      <input
                        value={typedCount}
                        onChange={(e) => setTypedCount(e.target.value)}
                        placeholder={String(includedCount)}
                        className="h-9 w-32 rounded-[8px] border border-[#D9D9D9] bg-white px-2 text-[13px]"
                        dir="ltr"
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" icon={PlayCircle} disabled={!canRun} onClick={handleRun}>
            {runReclassify.isPending ? 'מבצע…' : 'ביצוע סיווג מחדש'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
