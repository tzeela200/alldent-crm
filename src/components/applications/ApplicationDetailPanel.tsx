import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Phone, FileText, MessageCircle, UserRound, Briefcase } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useApplicationRow } from '@/hooks/useApplications'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { whatsappLink } from '@/lib/normalizePhone'
import { formatDate } from '@/lib/timeAgo'
import { applicationStatusColors, checkStatusColors, jobStatusColors, getStatusBadge } from '@/lib/statusColors'
import { toast } from 'sonner'
import type { Contact, Account, Job } from '@/types'

interface Props {
  applicationId: number
  onClose: () => void
}

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function ApplicationDetailPanel({ applicationId, onClose }: Props) {
  const navigate = useNavigate()
  const { data: row, isLoading } = useApplicationRow(applicationId)
  const { data: dicts } = useApplicationDicts()
  const { updateApplication, createContactFromApplication, markSpam } = useApplicationMutations()
  const [editingNotes, setEditingNotes] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')
  const [appStatus, setAppStatus] = useState<number | ''>('')
  const [checkStatus, setCheckStatus] = useState<number | ''>('')
  const [followUpDate, setFollowUpDate] = useState('')

  const { data: contact } = useQuery({
    queryKey: ['contact', row?.candidate_link],
    queryFn: async () => {
      if (!row?.candidate_link) return null
      const { data } = await supabase
        .from('contact')
        .select('*')
        .eq('contact_id', row.candidate_link)
        .single()
      return data as Contact | null
    },
    enabled: !!row?.candidate_link,
    staleTime: 60_000,
  })

  const { data: job } = useQuery({
    queryKey: ['job', row?.job_code],
    queryFn: async () => {
      if (!row?.job_code) return null
      const { data } = await supabase
        .from('job')
        .select('*')
        .eq('job_code', row.job_code)
        .single()
      return data as Job | null
    },
    enabled: !!row?.job_code,
    staleTime: 60_000,
  })

  const accountId = row?.account_link ?? (job as any)?.account_link
  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      if (!accountId) return null
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('account_id', accountId)
        .single()
      return data as Account | null
    },
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const saveField = async (
    field: string,
    value: unknown,
    label: string,
    jobCodeOverride?: string | null
  ) => {
    await updateApplication.mutateAsync({
      applicationId: row!.application_id,
      updates: { [field]: value } as any,
      jobCode: jobCodeOverride ?? row?.job_code,
    })
    toast.success(`${label} עודכן`)
  }

  // ── Unified review flow (check_status is the single source of truth) ──────
  // "מאושר למאגר" → create + link contact, navigate to its card.
  // "ספאם" → archive + exclude from counts. Other values → plain field update.
  const checkStatusName = (id: number | null | undefined) =>
    dicts?.checkStatuses?.find((s) => s.id === id)?.name ?? null

  const approveToRegistry = () => {
    if (!row) return
    createContactFromApplication.mutate(row, {
      onSuccess: (contactId) => navigate(`/admin/candidates/${contactId}`),
    })
  }

  const handleSpam = () => {
    if (!row) return
    markSpam.mutate(row)
  }

  const handleCheckStatusSave = (value: number) => {
    const name = checkStatusName(value)
    if (name === 'מאושר למאגר') {
      if (!row?.candidate_link) return approveToRegistry()
      return saveField('check_status', value, 'סטטוס בדיקה')
    }
    if (name === 'ספאם') return handleSpam()
    return saveField('check_status', value, 'סטטוס בדיקה')
  }

  if (isLoading || !row) {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      </PanelShell>
    )
  }

  const appBadge = getStatusBadge(applicationStatusColors, row.application_status)
  const checkBadge = getStatusBadge(checkStatusColors, row.check_status)
  const appStatusLabel =
    getDictLabel(dicts?.applicationStatuses, row.application_status) || appBadge.label
  const checkStatusLabel =
    getDictLabel(dicts?.checkStatuses, row.check_status) || checkBadge.label

  const jobStatusBadge = job?.job_status ? getStatusBadge(jobStatusColors, job.job_status) : null

  return (
    <PanelShell onClose={onClose}>
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {row.candidate_name ?? 'ללא שם'}
            </h2>
            <p className="text-xs text-slate-500">
              הגשה #{row.application_id} · {formatDate(row.submission_date)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${appBadge.bg} ${appBadge.text}`}
            >
              {appStatusLabel}
            </span>
            {row.check_status != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${checkBadge.bg} ${checkBadge.text}`}
              >
                {checkStatusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          {row.candidate_phone && (
            <a
              href={whatsappLink(row.candidate_phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </a>
          )}
          {row.candidate_phone && (
            <a
              href={`tel:${row.candidate_phone}`}
              className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <Phone className="h-3 w-3" />
              {row.candidate_phone}
            </a>
          )}
          {isValidUrl(row.cv_link) && (
            <a
              href={row.cv_link!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-3 w-3" />
              פתח קו"ח
            </a>
          )}
          {row.candidate_link && (
            <a
              href={`/admin/candidates/${row.candidate_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
            >
              <UserRound className="h-3 w-3" />
              כרטיס מועמד
            </a>
          )}
          {row.job_code && (
            <a
              href={`/admin/jobs?job=${row.job_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
            >
              <Briefcase className="h-3 w-3" />
              פרטי משרה
            </a>
          )}
        </div>
      </div>

      {/* Application snapshot */}
      <Section title="פרטי הגשה">
        <FieldGrid>
          <Field label="שם מועמד" value={row.candidate_name} />
          <Field label="נייד" value={row.candidate_phone} dir="ltr" />
          <Field label="אימייל" value={row.candidate_email} dir="ltr" />
          <Field label="תאריך הגשה" value={formatDate(row.submission_date)} />
          <Field label="קוד משרה" value={row.job_code} />
          <Field label="ארגון" value={row.account_name} />
          <Field label="תפקיד משרה" value={row.job_role} />
          <Field label="עיר משרה" value={row.job_city} />
          <Field label="אזור משרה" value={row.job_region} />
          <Field label="שם טופס" value={row.form_title} />
          <Field label="מקור" value={getDictLabel(dicts?.sources, row.source)} />
          <Field label="תאריך פעולה הבאה" value={formatDate(row.follow_up_date)} />
        </FieldGrid>
        {row.candidate_notes && (
          <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <span className="font-medium">הערות מועמד: </span>
            {row.candidate_notes}
          </div>
        )}
        {row.cv_link && !isValidUrl(row.cv_link) && (
          <p className="mt-1 text-xs text-red-500">⚠ קישור קו"ח אינו תקני</p>
        )}
      </Section>

      {/* Inline edits */}
      <Section title="עדכון שדות">
        <div className="space-y-3">
          {/* application_status */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500">סטטוס הגשה</label>
              <select
                dir="rtl"
                value={appStatus !== '' ? String(appStatus) : String(row.application_status ?? '')}
                onChange={(e) => setAppStatus(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">בחר...</option>
                {(dicts?.applicationStatuses ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <ActionButton
              variant="primary"
              size="sm"
              onClick={() =>
                appStatus !== '' &&
                saveField('application_status', Number(appStatus), 'סטטוס הגשה')
              }
              disabled={appStatus === '' || updateApplication.isPending}
            >
              שמור
            </ActionButton>
          </div>

          {/* check_status */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500">סטטוס בדיקה</label>
              <select
                dir="rtl"
                value={checkStatus !== '' ? String(checkStatus) : String(row.check_status ?? '')}
                onChange={(e) => setCheckStatus(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">בחר...</option>
                {(dicts?.checkStatuses ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => checkStatus !== '' && handleCheckStatusSave(Number(checkStatus))}
              disabled={
                checkStatus === '' ||
                updateApplication.isPending ||
                createContactFromApplication.isPending ||
                markSpam.isPending
              }
            >
              שמור
            </ActionButton>
          </div>

          {/* follow_up_date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500">תאריך פעולה הבאה</label>
              <input
                type="date"
                value={followUpDate !== '' ? followUpDate : (row.follow_up_date?.slice(0, 10) ?? '')}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => saveField('follow_up_date', followUpDate || null, 'תאריך פעולה הבאה')}
              disabled={updateApplication.isPending}
            >
              שמור
            </ActionButton>
          </div>
        </div>
      </Section>

      {/* Internal notes */}
      <Section title="הערות פנימיות">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
              placeholder="הוסף הערות פנימיות..."
            />
            <div className="flex gap-2">
              <ActionButton
                variant="primary"
                size="sm"
                onClick={async () => {
                  await saveField('internal_notes', internalNotes || null, 'הערות')
                  setEditingNotes(false)
                }}
                disabled={updateApplication.isPending}
              >
                שמור
              </ActionButton>
              <button
                onClick={() => setEditingNotes(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              setInternalNotes(row.internal_notes ?? '')
              setEditingNotes(true)
            }}
            className="min-h-[48px] cursor-pointer rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 hover:border-teal-400 hover:bg-teal-50/30"
          >
            {row.internal_notes || <span className="text-slate-400">לחץ להוספת הערה...</span>}
          </div>
        )}
      </Section>

      {/* החלטת בדיקה / פעולות המשך */}
      {!row.candidate_link && (
        <Section title="החלטת בדיקה">
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            מועמד זה טרם קיים במאגר — נדרשת בדיקה
            {row.check_status != null && (
              <span className="block text-xs text-amber-600">
                סטטוס נוכחי: {checkStatusName(row.check_status) ?? '—'}
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={approveToRegistry}
              disabled={createContactFromApplication.isPending || markSpam.isPending}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {createContactFromApplication.isPending ? 'מאשר...' : 'מאושר למאגר ←'}
            </button>
            <button
              onClick={handleSpam}
              disabled={createContactFromApplication.isPending || markSpam.isPending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {markSpam.isPending ? 'מסמן...' : 'ספאם / לא רלוונטי'}
            </button>
          </div>
        </Section>
      )}
      {row.candidate_link && (
        <Section title="פעולות המשך">
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/candidates/${row.candidate_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
            >
              <UserRound className="h-3 w-3" />
              פתח לעריכה
            </a>
            {row.account_link && (
              <a
                href={`/admin/accounts/${row.account_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
              >
                <Briefcase className="h-3 w-3" />
                פרופיל 360 מעסיק
              </a>
            )}
            <a
              href={`/admin/candidates/${row.candidate_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-3 w-3" />
              המשך השלמת פרופיל
            </a>
          </div>
        </Section>
      )}

      {/* Live contact data */}
      {contact && (
        <Section title="פרטי מועמד (מאגר)">
          <FieldGrid>
            <Field label="שם מלא" value={contact.full_name ?? contact.display_name} />
            <Field label="נייד" value={contact.phone} dir="ltr" />
            <Field label="אימייל" value={contact.email} dir="ltr" />
            <Field label={'עם קו"ח'} value={contact.has_cv ? 'כן' : 'לא'} />
            <Field
              label="סטטוס תעסוקה"
              value={getDictLabel(dicts?.workStatuses, contact.work_status)}
            />
            <Field
              label="זמינות"
              value={getDictLabel(dicts?.availabilities, contact.availability)}
            />
            <Field
              label="תפקיד מועמד"
              value={getDictLabel(dicts?.roles, contact.role)}
            />
            <Field
              label="עיר מועמד"
              value={getDictLabel(dicts?.cities, contact.city_id)}
            />
            <Field
              label="אזור מועמד"
              value={getDictLabel(dicts?.regions, contact.region_id)}
            />
          </FieldGrid>
          {contact.cv_link && isValidUrl(contact.cv_link) && (
            <a
              href={contact.cv_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <FileText className="h-3 w-3" />
              קו"ח עדכני במאגר
            </a>
          )}
        </Section>
      )}

      {/* Job data */}
      {job && (
        <Section title="פרטי משרה">
          <FieldGrid>
            <Field label="קוד משרה" value={job.job_code} />
            <Field label="כותרת משרה" value={job.job_title} />
            <Field
              label="סטטוס משרה"
              value={jobStatusBadge?.label ?? getDictLabel(dicts?.jobStatuses, job.job_status)}
            />
            <Field
              label="תפקיד משרה"
              value={getDictLabel(dicts?.roles, job.job_role)}
            />
            <Field
              label="עיר משרה"
              value={getDictLabel(dicts?.cities, job.city_id)}
            />
            <Field
              label="אזור משרה"
              value={getDictLabel(dicts?.regions, job.region_id)}
            />
            <Field label="ניסיון נדרש" value={job.required_experience != null ? String(job.required_experience) : undefined} />
            <Field
              label="שפות"
              value={
                Array.isArray(job.required_languages)
                  ? (job.required_languages as number[])
                      .map((id) => getDictLabel(dicts?.languages, id))
                      .filter((v) => v !== '—')
                      .join(', ') || '—'
                  : job.required_languages != null
                    ? getDictLabel(dicts?.languages, job.required_languages as unknown as number)
                    : undefined
              }
            />
          </FieldGrid>
          {job.job_status !== 3 && job.job_status != null && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ המשרה אינה פעילה כרגע
            </div>
          )}
          {job.job_description && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {job.job_description}
            </div>
          )}
        </Section>
      )}

      {/* Account data */}
      {account && (
        <Section title="פרטי ארגון">
          <FieldGrid>
            <Field label="שם ארגון" value={account.account_name} />
            <Field label="טלפון" value={account.phone} dir="ltr" />
            <Field label="אימייל" value={account.email} dir="ltr" />
          </FieldGrid>
        </Section>
      )}
    </PanelShell>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────

function PanelShell({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-[520px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">פרטי הגשה</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
      {children}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function Field({
  label,
  value,
  dir,
}: {
  label: string
  value: string | null | undefined
  dir?: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className={`text-sm ${value ? 'text-slate-700' : 'text-slate-300'}`} dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  )
}
