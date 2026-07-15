import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Ban, MessageCircle, FileText, Briefcase } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { DICT_SUB_ROLES } from '@/lib/dicts'
import { applicationStatusColors, checkStatusColors, getStatusBadge } from '@/lib/statusColors'
import { openApplicationCv, applicationHasCv } from '@/lib/cv'
import { formatDate, timeAgo } from '@/lib/timeAgo'
import type { DictItem } from '@/types'

// פאנל צינור גיוס — קנוני (SidePanel + AdminPanelSection/Field/Actions), עברית מלאה.
// check_status מטופל בכפתורי פעולה קנוניים (אשר למאגר / סמן כספאם), לא select נאיבי —
// כי הוא שער אישור ברמת אדם. ראה project_person_identity_model.
// אזור/עיר = תצוגה בלבד (snapshot מיקום המשרה); תפקיד/תת-תפקיד נפתרים מהמשרה המקושרת.

const editInput =
  'w-full rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#008080]'

type SoftFields = {
  follow_up_date: string
  internal_notes: string
  candidate_notes: string
  assigned_to: string
}

function dictName(list: DictItem[], id: number | null | undefined): string {
  if (id == null) return '—'
  return list.find((d) => Number(d.id) === Number(id))?.name ?? '—'
}

function subRoleNames(value: unknown): string {
  const ids = Array.isArray(value) ? value.map(Number) : value != null ? [Number(value)] : []
  const names = ids
    .map((id) => DICT_SUB_ROLES.find((r) => Number(r.id) === id)?.name ?? '')
    .filter(Boolean)
  return names.length ? names.join(' · ') : '—'
}

interface PipelinePanelProps {
  row: any
  job: any | null
  regions: DictItem[]
  cities: DictItem[]
  roles: DictItem[]
  applicationStatuses: DictItem[]
  onClose: () => void
  /** מעברי סטטוס חוקיים (adjacency policy מחושב בהורה) */
  nextStatusOptions: number[]
  onStatusChange: (next: number) => void
  updatingStatus: boolean
  onApproveToPool: () => void
  onMarkSpam: () => void
  busyAction: boolean
  onSaveFields: (patch: Partial<SoftFields>) => Promise<void>
  savingFields: boolean
}

export default function PipelinePanel({
  row,
  job,
  regions,
  cities,
  roles,
  applicationStatuses,
  onClose,
  nextStatusOptions,
  onStatusChange,
  updatingStatus,
  onApproveToPool,
  onMarkSpam,
  busyAction,
  onSaveFields,
  savingFields,
}: PipelinePanelProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  const initial: SoftFields = useMemo(
    () => ({
      follow_up_date: row.follow_up_date ? String(row.follow_up_date).slice(0, 10) : '',
      internal_notes: row.internal_notes ?? '',
      candidate_notes: row.candidate_notes ?? '',
      assigned_to: row.assigned_to ?? '',
    }),
    [row],
  )
  const [draft, setDraft] = useState<SoftFields>(initial)

  const isDirty = mode === 'edit' && JSON.stringify(draft) !== JSON.stringify(initial)

  const appLabel = dictName(applicationStatuses, Number(row.application_status ?? 0))
  const appColor = getStatusBadge(applicationStatusColors, Number(row.application_status ?? 0))
  const checkId = Number(row.check_status ?? 0)
  const checkColor = getStatusBadge(checkStatusColors, checkId)

  // מקורות מהמשרה המקושרת (applications מחזיק רק טקסט לתפקיד)
  const roleId = job?.job_role ?? null
  const roleLabel = roleId != null ? dictName(roles, roleId) : row.job_role ?? '—'
  const regionId = row.job_region_id ?? job?.region_id ?? null
  const cityId = row.job_city_id ?? job?.city_id ?? null

  const inPool = row.candidate_link != null
  const isSpam = checkId === 2

  const startEdit = () => {
    setDraft(initial)
    setMode('edit')
  }
  const cancelEdit = () => {
    setDraft(initial)
    setMode('view')
  }
  const save = async () => {
    const patch: Partial<SoftFields> = {}
    if (draft.follow_up_date !== initial.follow_up_date)
      patch.follow_up_date = draft.follow_up_date || (null as any)
    if (draft.internal_notes !== initial.internal_notes) patch.internal_notes = draft.internal_notes
    if (draft.candidate_notes !== initial.candidate_notes)
      patch.candidate_notes = draft.candidate_notes
    if (draft.assigned_to !== initial.assigned_to) patch.assigned_to = draft.assigned_to
    await onSaveFields(patch)
    setMode('view')
  }

  const waDigits = String(row.candidate_phone ?? '').replace(/\D/g, '')

  const header = (
    <div className="flex items-start justify-between px-5 py-4">
      <div>
        <h3 className="text-[18px] font-bold text-[#2D2D2D]">
          {row.candidate_name ?? 'מועמד ללא שם'}
        </h3>
        <p className="mt-0.5 text-[13px] text-[#6B6B6B]">
          {row.job_code ?? '—'} · {roleLabel}
        </p>
      </div>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${appColor.bg} ${appColor.text}`}
      >
        {appLabel}
      </span>
    </div>
  )

  const footer = (
    <AdminPanelActions
      mode={mode}
      onClose={onClose}
      onEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSave={save}
      saving={savingFields}
      primaryAction={
        row.candidate_link
          ? { label: 'מסך 360', onClick: () => navigate(`/admin/candidates/${row.candidate_link}`) }
          : undefined
      }
    />
  )

  return (
    <SidePanel
      open
      onClose={onClose}
      header={header}
      footer={footer}
      width="max-w-[620px]"
      isDirty={isDirty}
    >
      {/* ── סיכום מועמד ── */}
      <AdminPanelSection title="סיכום מועמד">
        <AdminPanelField label="שם מועמד" mode="view" viewValue={row.candidate_name} />
        <AdminPanelField label="נייד" mode="view" viewValue={row.candidate_phone} />
        <AdminPanelField label="אימייל" mode="view" viewValue={row.candidate_email} />
        <AdminPanelField
          label="מאגר"
          mode="view"
          viewValue={inPool ? 'קיים במאגר' : 'חדש – ממתין לבדיקה'}
        />
      </AdminPanelSection>

      {/* ── סיכום משרה ── */}
      <AdminPanelSection title="סיכום משרה">
        <AdminPanelField label="קוד משרה" mode="view" viewValue={row.job_code} />
        <AdminPanelField
          label="תפקיד"
          mode="view"
          viewValue={
            roleId != null ? <RoleBadge roleId={Number(roleId)} label={roleLabel} /> : roleLabel
          }
        />
        <AdminPanelField label="תת-תפקיד" mode="view" viewValue={subRoleNames(job?.job_sub_role)} />
        <AdminPanelField
          label="אזור"
          mode="view"
          viewValue={<RegionBadge regionId={regionId} label={dictName(regions, regionId)} />}
        />
        <AdminPanelField label="עיר" mode="view" viewValue={dictName(cities, cityId)} />
        <AdminPanelField
          label="תאריך הגשה"
          mode="view"
          viewValue={formatDate(row.submission_date)}
        />
      </AdminPanelSection>

      {/* ── סיכום מעסיק ── */}
      <AdminPanelSection title="סיכום מעסיק">
        <AdminPanelField label="ארגון" mode="view" viewValue={row.account_name} />
        <AdminPanelField label="נוצר" mode="view" viewValue={formatDate(row.created_timestamp)} />
        <AdminPanelField label="עודכן" mode="view" viewValue={timeAgo(row.updated_timestamp)} />
      </AdminPanelSection>

      {/* ── סטטוס הגשה (שינוי מיידי לפי מעברים חוקיים) ── */}
      <AdminPanelSection title="סטטוס הגשה">
        <div className="sm:col-span-2">
          <span
            className={`mb-2 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${appColor.bg} ${appColor.text}`}
          >
            {appLabel}
          </span>
          <select
            dir="rtl"
            value=""
            onChange={(e) => {
              const value = Number(e.target.value)
              if (value) onStatusChange(value)
            }}
            disabled={updatingStatus || nextStatusOptions.length === 0}
            className={`${editInput} mt-1 disabled:cursor-not-allowed disabled:bg-[#F3F4F6]`}
          >
            <option value="">קידום סטטוס…</option>
            {nextStatusOptions.map((statusId) => (
              <option key={statusId} value={statusId}>
                {dictName(applicationStatuses, statusId)}
              </option>
            ))}
          </select>
        </div>
      </AdminPanelSection>

      {/* ── סטטוס בדיקה (כפתורי פעולה קנוניים — לא select) ── */}
      <AdminPanelSection title="סטטוס בדיקה">
        <div className="sm:col-span-2 space-y-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${checkColor.bg} ${checkColor.text}`}
          >
            {checkColor.label}
          </span>
          <div className="flex flex-wrap gap-2">
            {!inPool && (
              <button
                type="button"
                onClick={onApproveToPool}
                disabled={busyAction}
                className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#006D6D] disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> אשר למאגר
              </button>
            )}
            {!isSpam && (
              <button
                type="button"
                onClick={onMarkSpam}
                disabled={busyAction}
                className="inline-flex items-center gap-2 rounded-full border border-[#DC2626] px-4 py-2 text-[13px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:opacity-60"
              >
                <Ban className="h-4 w-4" /> סמן כספאם
              </button>
            )}
          </div>
          <p className="text-[12px] text-[#9CA3AF]">
            אישור למאגר יוצר/מקשר כרטיס מועמד. שום נתון לא נמחק.
          </p>
        </div>
      </AdminPanelSection>

      {/* ── קורות חיים ── */}
      <AdminPanelSection title="קורות חיים">
        <div className="sm:col-span-2">
          {applicationHasCv(row) ? (
            <button
              type="button"
              onClick={() => openApplicationCv(row)}
              className="inline-flex items-center gap-2 rounded-full border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]"
            >
              <FileText className="h-4 w-4" /> פתיחת קורות חיים
            </button>
          ) : (
            <div className="rounded-xl bg-[#FFF7ED] p-3 text-[13px] font-medium text-[#B45309]">
              חסר קו"ח לפני ראיון / שליחה למעסיק
            </div>
          )}
        </div>
      </AdminPanelSection>

      {/* ── ניהול (שדות ניתנים לעריכה) ── */}
      <AdminPanelSection title="ניהול ומעקב">
        <AdminPanelField
          label="תאריך פעולה הבאה"
          mode={mode}
          viewValue={initial.follow_up_date ? formatDate(row.follow_up_date) : ''}
          editValue={
            <input
              type="date"
              value={draft.follow_up_date}
              onChange={(e) => setDraft((d) => ({ ...d, follow_up_date: e.target.value }))}
              className={editInput}
            />
          }
        />
        <AdminPanelField
          label="אחראי/ת"
          mode={mode}
          viewValue={row.assigned_to}
          editValue={
            <input
              type="text"
              value={draft.assigned_to}
              onChange={(e) => setDraft((d) => ({ ...d, assigned_to: e.target.value }))}
              className={editInput}
            />
          }
        />
        <AdminPanelField
          label="הערות מועמד"
          mode={mode}
          fullWidth
          viewValue={row.candidate_notes}
          editValue={
            <textarea
              rows={3}
              value={draft.candidate_notes}
              onChange={(e) => setDraft((d) => ({ ...d, candidate_notes: e.target.value }))}
              className={editInput}
            />
          }
        />
        <AdminPanelField
          label="הערות פנימיות"
          mode={mode}
          fullWidth
          viewValue={row.internal_notes}
          editValue={
            <textarea
              rows={3}
              value={draft.internal_notes}
              onChange={(e) => setDraft((d) => ({ ...d, internal_notes: e.target.value }))}
              className={editInput}
            />
          }
        />
      </AdminPanelSection>

      {/* ── פעולות ── */}
      <AdminPanelSection title="פעולות">
        <div className="sm:col-span-2 grid grid-cols-1 gap-2">
          <a
            href={waDigits ? `https://wa.me/${waDigits}` : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!waDigits}
            className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6] ${
              !waDigits ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <MessageCircle className="h-4 w-4" /> וואטסאפ
          </a>
          <button
            type="button"
            onClick={() => row.job_code && navigate(`/admin/jobs/${row.job_code}`)}
            disabled={!row.job_code}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6] disabled:opacity-50"
          >
            <Briefcase className="h-4 w-4" /> פתיחת משרה
          </button>
        </div>
      </AdminPanelSection>

      {/* ── ציר זמן ── */}
      <AdminPanelSection title="ציר זמן">
        <AdminPanelField label="נוצר" mode="view" viewValue={formatDate(row.created_timestamp)} />
        <AdminPanelField label="הוגש" mode="view" viewValue={formatDate(row.submission_date)} />
        <AdminPanelField
          label="עודכן לאחרונה"
          mode="view"
          viewValue={timeAgo(row.updated_timestamp)}
        />
      </AdminPanelSection>
    </SidePanel>
  )
}
