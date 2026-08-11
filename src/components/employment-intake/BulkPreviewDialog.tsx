/**
 * §4.5 + §5.2 — Preview מלא לפני כל פעולה גורפת, ואישור מפורש אחריו.
 *
 * חמשת הנתונים הנדרשים מוצגים תמיד: מספר ההופעות שנבחרו · מספר הזהויות
 * הייחודיות · מספר הפעולות שיבוצעו בפועל · כמה כבר קיבלו את הפעולה ·
 * ההופעות המקושרות לכל זהות (רשימה נפתחת).
 */

import { useState } from 'react'
import { ChevronDown, ChevronLeft, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { useApplicationDicts } from '@/hooks/useApplicationDicts'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import {
  buildBulkPreview,
  useRunBulkAction,
  type BulkActionSpec,
  type BulkFamily,
  type BulkPreview,
  type BulkIdentityPlan,
  type BulkRunReport,
} from '@/hooks/useEmploymentIntakeBulk'
import { DETAILS_SENT_TYPE_LABEL } from '@/lib/employment-intake/labels'
import { describeError } from '@/lib/employment-intake/errors'
import type { DetailsSentType } from '@/types/employment-intake'

const FAMILY_TITLE: Record<BulkFamily, string> = {
  lead_status: 'עדכון סטטוס ליד — פעולה גורפת',
  details_sent: 'סימון שנשלחו פרטים — פעולה גורפת',
  update_field: 'עריכת שדה משותף — פעולה גורפת',
}

/** משפחה א׳ מוגבלת לשלושת סטטוסי "ליד חדש" בלבד (§5.2, §10). */
const LEAD_STATUS_IDS = [1, 2, 3]
const DETAILS_TYPES: DetailsSentType[] = ['job_seeking', 'recruiting', 'pool_join']

const STATUS_TONE: Record<BulkIdentityPlan['status'], 'success' | 'neutral' | 'warning' | 'info'> = {
  will_run: 'success',
  already_done: 'info',
  no_change: 'neutral',
  blocked: 'warning',
}
const STATUS_LABEL: Record<BulkIdentityPlan['status'], string> = {
  will_run: 'תבוצע',
  already_done: 'כבר טופלה',
  no_change: 'ללא שינוי',
  blocked: 'חסומה',
}

function fieldClass() {
  return 'h-10 w-full rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]'
}

interface Props {
  family: BulkFamily | null
  selectedIds: number[]
  onClose: () => void
  onDone: (report: BulkRunReport) => void
}

export function BulkPreviewDialog({ family, selectedIds, onClose, onDone }: Props) {
  const { data: dicts } = useEmploymentIntakeDicts()
  const { data: appDicts } = useApplicationDicts()
  const runBulk = useRunBulkAction()

  const [leadStatusId, setLeadStatusId] = useState<number | null>(null)
  const [detailsSentType, setDetailsSentType] = useState<DetailsSentType | ''>('')
  const [alsoUpdateAccount, setAlsoUpdateAccount] = useState(false)
  const [sharedFieldName, setSharedFieldName] = useState<'role' | 'city_id' | 'source'>('role')
  const [sharedFieldValue, setSharedFieldValue] = useState<number | null>(null)
  const [overwriteExisting, setOverwriteExisting] = useState(false)

  const [preview, setPreview] = useState<BulkPreview | null>(null)
  const [building, setBuilding] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState(false)

  if (!family) return null

  const spec: BulkActionSpec = {
    family,
    leadStatusId: leadStatusId ?? undefined,
    detailsSentType: detailsSentType || undefined,
    alsoUpdateAccount,
    sharedField:
      family === 'update_field' ? { field: sharedFieldName, value: sharedFieldValue, overwriteExisting } : undefined,
  }

  const configReady =
    family === 'lead_status'
      ? leadStatusId != null
      : family === 'details_sent'
        ? !!detailsSentType
        : sharedFieldValue != null

  async function handleBuildPreview() {
    setBuilding(true)
    try {
      const result = await buildBulkPreview(selectedIds, spec)
      setPreview(result)
      setConfirmed(false)
    } catch (err) {
      toast.error(describeError(err, 'בניית התצוגה המקדימה נכשלה'))
    } finally {
      setBuilding(false)
    }
  }

  function handleRun() {
    if (!preview) return
    runBulk.mutate(
      { preview, spec },
      {
        onSuccess: (report) => {
          onDone(report)
          onClose()
        },
        onError: (err: unknown) => toast.error(describeError(err, 'ביצוע הפעולה הגורפת נכשל')),
      },
    )
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // כל שינוי בהגדרות מבטל Preview קיים — אסור לאשר תצוגה שאינה תואמת להגדרה
  function resetPreview() {
    setPreview(null)
    setConfirmed(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{FAMILY_TITLE[family]}</DialogTitle>
        </DialogHeader>

        {/* ── הגדרת הפעולה ─────────────────────────────────────── */}
        {family === 'lead_status' && (
          <select
            className={fieldClass()}
            value={leadStatusId ?? ''}
            onChange={(e) => {
              setLeadStatusId(e.target.value ? Number(e.target.value) : null)
              resetPreview()
            }}
          >
            <option value="">בחרי סטטוס ליד…</option>
            {(dicts?.socialStatuses ?? [])
              .filter((s) => LEAD_STATUS_IDS.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        )}

        {family === 'details_sent' && (
          <>
            <select
              className={fieldClass()}
              value={detailsSentType}
              onChange={(e) => {
                setDetailsSentType(e.target.value as DetailsSentType | '')
                resetPreview()
              }}
            >
              <option value="">בחרי את סוג הפרטים שנשלחו…</option>
              {DETAILS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DETAILS_SENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-3 text-[13px] text-[#8A5A1F]">
              המערכת אינה שולחת הודעות. סימון זה מתעד שהפרטים כבר נשלחו בפועל, ומעדכן את מועד יצירת הקשר האחרון.
            </div>
            {detailsSentType === 'recruiting' && (
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
                <input
                  type="checkbox"
                  checked={alsoUpdateAccount}
                  onChange={(e) => {
                    setAlsoUpdateAccount(e.target.checked)
                    resetPreview()
                  }}
                  className="h-4 w-4 accent-[#008080]"
                />
                לעדכן גם את הארגון המקושר (מועד קשר אחרון + "פוטנציאלי – לטיפול")
              </label>
            )}
          </>
        )}

        {family === 'update_field' && (
          <>
            <select
              className={fieldClass()}
              value={sharedFieldName}
              onChange={(e) => {
                setSharedFieldName(e.target.value as 'role' | 'city_id' | 'source')
                setSharedFieldValue(null)
                resetPreview()
              }}
            >
              <option value="role">תפקיד</option>
              <option value="city_id">עיר</option>
              <option value="source">מקור</option>
            </select>

            {sharedFieldName === 'role' && (
              <RoleSubRolePicker
                variant="edit"
                roleId={sharedFieldValue}
                subRoleIds={[]}
                onRoleChange={(id) => {
                  setSharedFieldValue(id)
                  resetPreview()
                }}
                onSubRoleChange={() => {}}
              />
            )}
            {sharedFieldName === 'city_id' && (
              <CityRegionPicker
                variant="edit"
                cityId={sharedFieldValue}
                regionId={null}
                onCityChange={(id) => {
                  setSharedFieldValue(id)
                  resetPreview()
                }}
                onRegionChange={() => {}}
              />
            )}
            {sharedFieldName === 'source' && (
              <select
                className={fieldClass()}
                value={sharedFieldValue ?? ''}
                onChange={(e) => {
                  setSharedFieldValue(e.target.value ? Number(e.target.value) : null)
                  resetPreview()
                }}
              >
                <option value="">בחרי מקור…</option>
                {(appDicts?.sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => {
                  setOverwriteExisting(e.target.checked)
                  resetPreview()
                }}
                className="h-4 w-4 accent-[#008080]"
              />
              לדרוס גם ערכים קיימים (ברירת המחדל: מילוי שדות ריקים בלבד)
            </label>
          </>
        )}

        {/* ── Preview ──────────────────────────────────────────── */}
        {!preview ? (
          <ActionButton variant="secondary" disabled={!configReady || building} onClick={handleBuildPreview}>
            {building ? 'מחשב תצוגה מקדימה…' : 'הצגת תצוגה מקדימה'}
          </ActionButton>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2 text-center text-[12px]">
              <div className="rounded-[10px] border border-[#D9D9D9] bg-white p-2">
                <div className="text-[18px] font-bold text-[#2D2D2D]">{preview.occurrences}</div>
                הופעות נבחרו
              </div>
              <div className="rounded-[10px] border border-[#D9D9D9] bg-white p-2">
                <div className="text-[18px] font-bold text-[#2D2D2D]">{preview.identities}</div>
                זהויות ייחודיות
              </div>
              <div className="rounded-[10px] border border-[#99D6D6] bg-[#E6F3F3] p-2">
                <div className="text-[18px] font-bold text-[#008080]">{preview.toUpdate}</div>
                פעולות יבוצעו
              </div>
              <div className="rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] p-2">
                <div className="text-[18px] font-bold text-[#3B82F6]">{preview.alreadyHandled}</div>
                כבר טופלו
              </div>
              <div className="rounded-[10px] border border-[#F6D5A8] bg-[#FDF3E7] p-2">
                <div className="text-[18px] font-bold text-[#E8A85C]">{preview.blocked + preview.skipped}</div>
                דולגו / חסומות
              </div>
            </div>

            <div className="space-y-1.5">
              {preview.plans.map((plan) => {
                const isOpen = expanded.has(plan.key)
                return (
                  <div key={plan.key} className="rounded-[10px] border border-[#D9D9D9]">
                    <button
                      type="button"
                      onClick={() => toggleExpand(plan.key)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-[13px]"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-[#9CA3AF]" /> : <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" />}
                        <div>
                          <div className="font-semibold text-[#2D2D2D]">{plan.displayName}</div>
                          <div className="text-[12px] text-[#9CA3AF]">{plan.rows.length} הופעות מקור</div>
                        </div>
                      </div>
                      <AdminBadge label={STATUS_LABEL[plan.status]} variant={STATUS_TONE[plan.status]} />
                    </button>
                    {plan.reason && <div className="border-t border-[#F3F4F6] px-3 py-1.5 text-[12px] text-[#6B6B6B]">{plan.reason}</div>}
                    {isOpen && (
                      <ul className="space-y-1 border-t border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2 text-[12px]">
                        {plan.rows.map((r) => (
                          <li key={r.id} className="flex items-start justify-between gap-2">
                            <span className="truncate text-[#2D2D2D]">{r.original_text}</span>
                            <span className="shrink-0 text-[#9CA3AF]">
                              {r.source_name ?? '—'} · {new Date(r.ingested_at).toLocaleDateString('he-IL')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>

            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
              אני מאשרת ביצוע הפעולה עבור {preview.toUpdate} זהויות
            </label>
          </>
        )}

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={PlayCircle}
            disabled={!preview || !confirmed || preview.toUpdate === 0 || runBulk.isPending}
            onClick={handleRun}
          >
            {runBulk.isPending ? 'מבצע…' : 'ביצוע הפעולה'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
