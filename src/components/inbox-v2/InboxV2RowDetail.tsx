import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  GitMerge,
  UserPlus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  XCircle,
  EyeOff,
  Ban,
  Eye,
} from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminActionsMenu } from '@/components/admin/AdminActionsMenu'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useInboxV2Matching } from '@/hooks/useInboxV2Matching'
import {
  INBOX_STATUSES,
  MANUAL_INBOX_STATUSES,
  SOURCE_TYPES,
  getDictName,
  inboxStatusAdminVariant,
  deriveMatchResult,
  INBOX_ACTION,
} from '@/lib/inbox-v2-dicts'
import { normalizePhone, formatPhone } from '@/lib/normalizePhone'
import { toast } from 'sonner'
import type { InboxV2Row } from '@/types/inbox-v2'

interface Props {
  leadId: number
  onClose: () => void
  onOpenMerge: (leadId: number) => void
  onOpenCreate: (leadId: number) => void
}

type EditForm = {
  display_name: string
  first_name: string
  last_name: string
  phone: string
  email: string
  facebook_name: string
  facebook_id: string
  facebook_url: string
  linkedin_url: string
  notes: string
  merge_status: number
  tags: string
}

function toForm(row: InboxV2Row): EditForm {
  return {
    display_name: row.display_name ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    facebook_name: row.facebook_name ?? '',
    facebook_id: row.facebook_id ?? '',
    facebook_url: row.facebook_url ?? '',
    linkedin_url: row.linkedin_url ?? '',
    notes: row.notes ?? '',
    merge_status: row.merge_status ?? 1,
    tags: row.tags.join(', '),
  }
}

const inputCls =
  'w-full rounded-[10px] border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] text-[#2D2D2D] outline-none focus:border-[#008080]'

export function InboxV2RowDetail({ leadId, onClose, onOpenMerge, onOpenCreate }: Props) {
  const { data: row, isLoading } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { matchRow } = useInboxV2Matching()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (row && !isEditing) setForm(toForm(row))
  }, [row, isEditing])

  const dirty = useMemo(() => {
    if (!row || !form) return false
    return JSON.stringify(form) !== JSON.stringify(toForm(row))
  }, [form, row])

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const requestClose = () => {
    setIsEditing(false)
    onClose()
  }

  const setStatus = async (status: number, label: string, actionType: number | null) => {
    await updateRow.mutateAsync({ leadId, updates: { merge_status: status } })
    await logAction.mutateAsync({
      lead_id: leadId,
      target_type: null,
      target_id: null,
      action_type: actionType,
      updates_applied: { merge_status: status },
      approved_by: null,
    })
    toast.success(`סטטוס עודכן ל-${label}`)
  }

  const flagForReview = async () => {
    await logAction.mutateAsync({
      lead_id: leadId,
      target_type: null,
      target_id: null,
      action_type: INBOX_ACTION.FLAG_REVIEW,
      updates_applied: { flagged_for_review: true },
      approved_by: null,
    })
    toast.success('סומן לבדיקה (ללא שינוי סטטוס)')
  }

  // שמירת עריכה — מעדכנת inbox_v2 בלבד. אין נגיעה ב-contact/accounts.
  const handleSave = async () => {
    if (!form || !row) return
    setSaving(true)
    try {
      const updates: Partial<InboxV2Row> = {
        display_name: form.display_name.trim() || null,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        facebook_name: form.facebook_name.trim() || null,
        facebook_id: form.facebook_id.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        notes: form.notes.trim() || null,
        merge_status: form.merge_status,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }
      if ((form.phone.trim() || null) !== row.phone) {
        updates.phone_norm = form.phone.trim() ? normalizePhone(form.phone) : null
      }
      await updateRow.mutateAsync({ leadId, updates })
      toast.success('הרשומה עודכנה')
      setIsEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const mode = isEditing ? 'edit' : 'view'
  const match = row ? deriveMatchResult(row) : null
  const suggestedEntries = row?.suggested_updates ? Object.entries(row.suggested_updates) : []

  const header = (
    <div className="px-5 py-4">
      {isLoading || !row ? (
        <h2 className="text-[16px] font-bold text-[#2D2D2D]">טוען…</h2>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold text-[#2D2D2D]">
              {row.display_name ?? 'ללא שם'}
            </h2>
            <div className="flex items-center gap-1.5">
              <AdminBadge
                label={getDictName(INBOX_STATUSES, row.merge_status)}
                variant={inboxStatusAdminVariant[row.merge_status ?? 1] ?? 'neutral'}
              />
              {match && <AdminBadge label={match.label} variant={match.variant} />}
            </div>
          </div>
          <p className="mt-1 text-[12px] text-[#9CA3AF]">
            #{row.lead_id} · {getDictName(SOURCE_TYPES, row.source_type)}
            {row.source_name ? ` · ${row.source_name}` : ''}
          </p>
        </>
      )}
    </div>
  )

  const footer = row ? (
    <AdminPanelActions
      mode={mode}
      onClose={requestClose}
      onEdit={() => setIsEditing(true)}
      onCancelEdit={() => {
        setIsEditing(false)
        setForm(toForm(row))
      }}
      onSave={handleSave}
      saving={saving}
      saveLabel="שמור ל-Inbox"
    />
  ) : undefined

  return (
    <SidePanel
      open
      onClose={requestClose}
      header={header}
      footer={footer}
      isDirty={isEditing && dirty}
      confirmCloseMessage="יש שינויים שלא נשמרו ברשומת ה-Inbox. לסגור בכל זאת?"
    >
      {isLoading || !row || !form ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
        </div>
      ) : (
        <>
          {/* גיליון החלטה — פעולות בשער */}
          {!isEditing && (
            <AdminPanelSection title="החלטה בשער">
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                {row.match_contact ? (
                  <button
                    type="button"
                    onClick={() => onOpenMerge(leadId)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#008080] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#006D6D]"
                  >
                    <GitMerge className="h-4 w-4" />
                    אשר התאמה
                  </button>
                ) : (
                  <span
                    title="אין איש קשר תואם — צרי איש קשר חדש או הריצי התאמה"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#9CA3AF]"
                  >
                    <GitMerge className="h-4 w-4" />
                    אין התאמה לאישור
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenCreate(leadId)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#008080] px-4 py-2 text-[13px] font-semibold text-[#008080] transition hover:bg-[#E6F3F3]"
                >
                  <UserPlus className="h-4 w-4" />
                  צור איש קשר חדש
                </button>
                <AdminActionsMenu
                  ariaLabel="פעולות נוספות"
                  pending={updateRow.isPending || logAction.isPending}
                  items={[
                    {
                      key: 'flag',
                      icon: <Eye className="h-4 w-4" />,
                      label: 'סמן לבדיקה',
                      onClick: flagForReview,
                    },
                    {
                      key: 'reject',
                      icon: <XCircle className="h-4 w-4" />,
                      label: 'דחה',
                      onClick: () => setStatus(7, 'נדחה', INBOX_ACTION.REJECT),
                      separatorBefore: true,
                    },
                    {
                      key: 'ignore',
                      icon: <EyeOff className="h-4 w-4" />,
                      label: 'התעלם',
                      onClick: () => setStatus(8, 'התעלמות', INBOX_ACTION.IGNORE),
                    },
                    {
                      key: 'non-dental',
                      icon: <Ban className="h-4 w-4" />,
                      label: 'לא דנטלי',
                      onClick: () => setStatus(9, 'לא דנטלי', null),
                    },
                  ]}
                />
                <span className="ms-auto inline-flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  עדכון ליבה רק דרך הפעולות כאן
                </span>
              </div>
            </AdminPanelSection>
          )}

          {/* נתונים שנקלטו */}
          <AdminPanelSection title="נתונים שנקלטו">
            <AdminPanelField
              label="שם תצוגה"
              mode={mode}
              viewValue={row.display_name}
              editValue={
                <input
                  className={inputCls}
                  value={form.display_name}
                  onChange={(e) => set('display_name', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="נייד"
              mode={mode}
              viewValue={row.phone ? formatPhone(row.phone) : null}
              editValue={
                <input
                  className={inputCls}
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="שם פרטי"
              mode={mode}
              viewValue={row.first_name}
              editValue={
                <input
                  className={inputCls}
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="שם משפחה"
              mode={mode}
              viewValue={row.last_name}
              editValue={
                <input
                  className={inputCls}
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="אימייל"
              mode={mode}
              viewValue={row.email}
              editValue={
                <input
                  className={inputCls}
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="שם פייסבוק"
              mode={mode}
              viewValue={row.facebook_name}
              editValue={
                <input
                  className={inputCls}
                  value={form.facebook_name}
                  onChange={(e) => set('facebook_name', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="Facebook ID"
              mode={mode}
              viewValue={row.facebook_id}
              editValue={
                <input
                  className={inputCls}
                  dir="ltr"
                  value={form.facebook_id}
                  onChange={(e) => set('facebook_id', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="Facebook URL"
              mode={mode}
              viewValue={row.facebook_url}
              editValue={
                <input
                  className={inputCls}
                  dir="ltr"
                  value={form.facebook_url}
                  onChange={(e) => set('facebook_url', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="LinkedIn"
              mode={mode}
              viewValue={row.linkedin_url}
              editValue={
                <input
                  className={inputCls}
                  dir="ltr"
                  value={form.linkedin_url}
                  onChange={(e) => set('linkedin_url', e.target.value)}
                />
              }
            />
            <AdminPanelField
              label="סטטוס טיפול"
              mode={mode}
              viewValue={getDictName(INBOX_STATUSES, row.merge_status)}
              editValue={
                <select
                  className={inputCls}
                  value={form.merge_status}
                  onChange={(e) => set('merge_status', Number(e.target.value))}
                >
                  {MANUAL_INBOX_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              }
            />
            <AdminPanelField
              label="תגיות (מופרד בפסיק)"
              mode={mode}
              fullWidth
              viewValue={row.tags.length ? row.tags.join(', ') : null}
              editValue={
                <input
                  className={inputCls}
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                />
              }
            />
          </AdminPanelSection>

          {/* התאמה */}
          <AdminPanelSection title="התאמה לרשומה קיימת">
            <div className="sm:col-span-2">
              {row.match_confidence != null && row.match_confidence > 0 ? (
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-[#6B6B6B]">רמת ביטחון</span>
                    <span
                      className={`font-bold ${
                        row.match_confidence >= 80
                          ? 'text-[#008080]'
                          : row.match_confidence >= 40
                            ? 'text-[#D97706]'
                            : 'text-[#9CA3AF]'
                      }`}
                    >
                      {row.match_confidence}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className={`h-full rounded-full ${
                        row.match_confidence >= 80
                          ? 'bg-[#008080]'
                          : row.match_confidence >= 40
                            ? 'bg-[#D97706]'
                            : 'bg-[#D9D9D9]'
                      }`}
                      style={{ width: `${row.match_confidence}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-[13px] text-[#9CA3AF]">לא נמצאה התאמה</p>
              )}
            </div>
            <AdminPanelField label="תוצאת התאמה" mode="view" viewValue={match?.label} />
            <AdminPanelField label="סיבת התאמה" mode="view" viewValue={row.match_reason} />
            <AdminPanelField label="שיטת התאמה" mode="view" viewValue={row.matched_by} />
            <AdminPanelField
              label="התאמה ל"
              mode="view"
              viewValue={
                row.match_contact
                  ? `איש קשר #${row.match_contact}`
                  : row.match_account
                    ? `ארגון #${row.match_account}`
                    : null
              }
            />
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => matchRow.mutate(leadId)}
                disabled={matchRow.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-semibold text-[#6B6B6B] transition hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${matchRow.isPending ? 'animate-spin' : ''}`} />
                {matchRow.isPending ? 'מנתח…' : 'הרץ התאמה מחדש'}
              </button>
            </div>
          </AdminPanelSection>

          {/* מידע חדש וסתירות */}
          {suggestedEntries.length > 0 && (
            <AdminPanelSection title="מידע חדש וסתירות">
              <div className="sm:col-span-2 space-y-1">
                {suggestedEntries.map(([key, update]) => {
                  const isConflict = update?.conflict
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-[12px] ${
                        isConflict ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#E6F3F3] text-[#008080]'
                      }`}
                    >
                      <span className="font-semibold">{key}</span>
                      <span dir="ltr">
                        {update?.current != null ? String(update.current) : '(ריק)'} →{' '}
                        {String(update?.incoming ?? '')}
                        {isConflict && ' ⚠️'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </AdminPanelSection>
          )}

          {/* היסטוריית הופעות */}
          <AdminPanelSection title="היסטוריית הופעות">
            <AdminPanelField label="מספר הופעות" mode="view" viewValue={row.seen_count} />
            <AdminPanelField
              label="נראה לאחרונה"
              mode="view"
              viewValue={
                row.last_seen_at ? new Date(row.last_seen_at).toLocaleString('he-IL') : null
              }
            />
            <AdminPanelField
              label="נקלט"
              mode="view"
              viewValue={new Date(row.created_at).toLocaleString('he-IL')}
            />
            <AdminPanelField
              label="עודכן"
              mode="view"
              viewValue={new Date(row.updated_at).toLocaleString('he-IL')}
            />
          </AdminPanelSection>

          {/* הערות */}
          <AdminPanelSection title="הערות">
            <AdminPanelField
              label="הערות"
              mode={mode}
              fullWidth
              viewValue={row.notes}
              editValue={
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="הוסף הערות…"
                />
              }
            />
          </AdminPanelSection>

          {/* נתונים גולמיים */}
          <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] hover:text-[#6B6B6B]"
            >
              {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              נתונים גולמיים / שדות לא ממופים (JSON)
            </button>
            {showRaw && (
              <pre
                className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[10px] leading-relaxed text-[#6B6B6B]"
                dir="ltr"
              >
                {JSON.stringify(row.raw_payload, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </SidePanel>
  )
}
