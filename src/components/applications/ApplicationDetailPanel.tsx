import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, FileText, UserRound, Briefcase } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { useApplicationRow } from '@/hooks/useApplications'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { whatsappLink, formatPhone } from '@/lib/normalizePhone'
import { openApplicationCv, applicationHasCv } from '@/lib/cv'
import { formatDate } from '@/lib/timeAgo'
import { toast } from 'sonner'
import type { Contact, Account, Job } from '@/types'

// פאנל הגשה — קנוני: SidePanel + AdminPanelSection/Field/Actions + StatusBadge.
// עריכה: מצב view/edit אחד עם שמירה אחת (במקום 3 כפתורי "שמור" נפרדים),
// ו-isDirty שמונע איבוד שינויים בסגירה.
// check_status = שער אישור ברמת אדם — נשאר בכפתורי פעולה ייעודיים ולא ב-select
// חופשי, בהתאם למודל הזהות (ראו project_person_identity_model).

interface Props {
  applicationId: number
  onClose: () => void
}

const editInput =
  'w-full rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#008080]'

interface EditableFields {
  application_status: string
  check_status: string
  follow_up_date: string
  internal_notes: string
}

/**
 * "מאושר למאגר" ו-"ספאם" הם שער אישור ברמת אדם — הם יוצרים/מקשרים איש קשר
 * או מארכבים, ולכן מטופלים בכפתורי פעולה ייעודיים ולא כערך ב-select.
 * שאר ערכי המילון (ממתין לבדיקה / בבדיקה מול המועמד) הם סימון פנימי ונשארים
 * ניתנים לעריכה רגילה.
 */
const GATE_CHECK_STATUS_NAMES = ['מאושר למאגר', 'ספאם']

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
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)

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

  const initial: EditableFields = useMemo(
    () => ({
      application_status: row?.application_status != null ? String(row.application_status) : '',
      check_status: row?.check_status != null ? String(row.check_status) : '',
      follow_up_date: row?.follow_up_date ? String(row.follow_up_date).slice(0, 10) : '',
      internal_notes: row?.internal_notes ?? '',
    }),
    [row],
  )
  const [draft, setDraft] = useState<EditableFields>(initial)

  const isDirty = mode === 'edit' && JSON.stringify(draft) !== JSON.stringify(initial)

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

  const startEdit = () => {
    setDraft(initial)
    setMode('edit')
  }
  const cancelEdit = () => {
    setDraft(initial)
    setMode('view')
  }

  // שמירה אחת לכל השדות שהשתנו. כשל משאיר את מצב העריכה פתוח עם הטקסט —
  // ולא מאפס את הטופס — כדי שלא ייאבד מה שהוקלד.
  const save = async () => {
    if (!row) return
    const updates: Record<string, unknown> = {}
    if (draft.application_status !== initial.application_status)
      updates.application_status = draft.application_status ? Number(draft.application_status) : null
    if (draft.check_status !== initial.check_status)
      updates.check_status = draft.check_status ? Number(draft.check_status) : null
    if (draft.follow_up_date !== initial.follow_up_date)
      updates.follow_up_date = draft.follow_up_date || null
    if (draft.internal_notes !== initial.internal_notes)
      updates.internal_notes = draft.internal_notes || null

    if (Object.keys(updates).length === 0) {
      setMode('view')
      return
    }

    setSaving(true)
    try {
      await updateApplication.mutateAsync({
        applicationId: row.application_id,
        updates: updates as any,
        jobCode: row.job_code,
      })
      toast.success('ההגשה עודכנה')
      setMode('view')
    } catch {
      // ה-mutation כבר הציג toast עם השגיאה; נשארים במצב עריכה.
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !row) {
    return (
      <SidePanel
        open
        onClose={onClose}
        header={<div className="px-5 py-4 text-[15px] font-bold text-[#2D2D2D]">פרטי הגשה</div>}
      >
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F3F4F6] border-t-[#008080]" />
        </div>
      </SidePanel>
    )
  }

  const phone = row.candidate_phone
  const inRegistry = row.candidate_link != null

  const header = (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#2D2D2D]">{row.candidate_name ?? 'ללא שם'}</h2>
          <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
            הגשה #{row.application_id} · {formatDate(row.submission_date)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge statusType="application" statusId={row.application_status} />
          {row.check_status != null && (
            <StatusBadge statusType="check" statusId={row.check_status} />
          )}
        </div>
      </div>

      {/* קישורים מהירים */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <a
            href={whatsappLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[#E7F7EE] px-3 py-1.5 text-[12px] font-semibold text-[#128C7E] transition hover:bg-[#D5F0E2]"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            dir="ltr"
            className="flex items-center gap-1.5 rounded-lg bg-[#F3F4F6] px-3 py-1.5 text-[12px] font-semibold text-[#6B6B6B] transition hover:bg-[#E5E7EB]"
          >
            <Phone className="h-3.5 w-3.5" />
            {formatPhone(phone)}
          </a>
        )}
        {applicationHasCv(row) && (
          <button
            type="button"
            onClick={() => openApplicationCv(row)}
            className="flex items-center gap-1.5 rounded-lg bg-[#EFF6FF] px-3 py-1.5 text-[12px] font-semibold text-[#3B82F6] transition hover:bg-[#DBEAFE]"
          >
            <FileText className="h-3.5 w-3.5" />
            פתח קו"ח
          </button>
        )}
        {row.candidate_link && (
          <a
            href={`/admin/candidates/${row.candidate_link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[#E6F3F3] px-3 py-1.5 text-[12px] font-semibold text-[#008080] transition hover:bg-[#CCE7E7]"
          >
            <UserRound className="h-3.5 w-3.5" />
            כרטיס מועמד
          </a>
        )}
        {row.job_code && (
          <a
            href={`/admin/jobs/${row.job_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[#F5F0FF] px-3 py-1.5 text-[12px] font-semibold text-[#7C3AED] transition hover:bg-[#EDE4FF]"
          >
            <Briefcase className="h-3.5 w-3.5" />
            פרטי משרה
          </a>
        )}
      </div>
    </div>
  )

  const footer = (
    <AdminPanelActions
      mode={mode}
      onClose={onClose}
      onEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSave={save}
      saving={saving}
      primaryAction={
        row.candidate_link
          ? {
              label: 'כרטיס מועמד',
              onClick: () => navigate(`/admin/candidates/${row.candidate_link}`),
            }
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
      isDirty={isDirty}
      confirmCloseMessage="יש שינויים שלא נשמרו בהגשה. לסגור בכל זאת?"
    >
      {/* פרטי הגשה */}
      <AdminPanelSection title="פרטי הגשה">
        <AdminPanelField label="שם מועמד" mode="view" viewValue={row.candidate_name} />
        <AdminPanelField
          label="נייד"
          mode="view"
          viewValue={phone ? <span dir="ltr">{formatPhone(phone)}</span> : null}
        />
        <AdminPanelField
          label="אימייל"
          mode="view"
          viewValue={row.candidate_email ? <span dir="ltr">{row.candidate_email}</span> : null}
        />
        <AdminPanelField label="תאריך הגשה" mode="view" viewValue={formatDate(row.submission_date)} />
        <AdminPanelField label="קוד משרה" mode="view" viewValue={row.job_code} />
        <AdminPanelField label="ארגון" mode="view" viewValue={row.account_name} />
        <AdminPanelField
          label="תפקיד משרה"
          mode="view"
          viewValue={
            row.job_role ? <RoleBadge roleId={row.job_role_id ?? job?.job_role} label={row.job_role} /> : null
          }
        />
        <AdminPanelField label="עיר משרה" mode="view" viewValue={row.job_city} />
        <AdminPanelField
          label="אזור משרה"
          mode="view"
          viewValue={
            row.job_region ? <RegionBadge regionId={row.job_region_id} label={row.job_region} /> : null
          }
        />
        <AdminPanelField label="שם טופס" mode="view" viewValue={row.form_title} />
        <AdminPanelField
          label="מקור"
          mode="view"
          viewValue={getDictLabel(dicts?.sources, row.source)}
        />
        <AdminPanelField
          label="מצב במאגר"
          mode="view"
          viewValue={inRegistry ? 'קיים במאגר' : 'חדש למאגר'}
        />
      </AdminPanelSection>

      {/* שדות ניתנים לעריכה */}
      <AdminPanelSection title="מעקב וסטטוס">
        <AdminPanelField
          label="סטטוס הגשה"
          mode={mode}
          viewValue={<StatusBadge statusType="application" statusId={row.application_status} />}
          editValue={
            <select
              dir="rtl"
              className={editInput}
              value={draft.application_status}
              onChange={(e) => setDraft({ ...draft, application_status: e.target.value })}
            >
              <option value="">לא הוגדר</option>
              {(dicts?.applicationStatuses ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          }
        />
        <AdminPanelField
          label="סטטוס בדיקה"
          mode={mode}
          viewValue={
            row.check_status != null ? (
              <StatusBadge statusType="check" statusId={row.check_status} />
            ) : null
          }
          helperText={
            mode === 'edit' ? 'אישור למאגר וסימון ספאם מתבצעים בכפתורי הפעולה' : undefined
          }
          editValue={
            <select
              dir="rtl"
              className={editInput}
              value={draft.check_status}
              onChange={(e) => setDraft({ ...draft, check_status: e.target.value })}
            >
              <option value="">לא הוגדר</option>
              {(dicts?.checkStatuses ?? [])
                // ערכי השער נשלטים בכפתורים בלבד — אבל אם זה הערך הנוכחי,
                // הוא נשאר ברשימה כדי שהתצוגה לא תיפול ל-"לא הוגדר".
                .filter(
                  (s) =>
                    !GATE_CHECK_STATUS_NAMES.includes(s.name) ||
                    String(s.id) === initial.check_status,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          }
        />
        <AdminPanelField
          label="תאריך פעולה הבאה"
          mode={mode}
          viewValue={row.follow_up_date ? formatDate(row.follow_up_date) : null}
          editValue={
            <input
              type="date"
              className={editInput}
              value={draft.follow_up_date}
              onChange={(e) => setDraft({ ...draft, follow_up_date: e.target.value })}
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
              className={`${editInput} resize-none`}
              placeholder="הערה פנימית לצוות..."
              value={draft.internal_notes}
              onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}
            />
          }
        />
        {row.candidate_notes && (
          <AdminPanelField label="הערות מועמד" mode="view" fullWidth viewValue={row.candidate_notes} />
        )}
        {row.cv_link && !isValidUrl(row.cv_link) && (
          <AdminPanelField
            label="אזהרה"
            mode="view"
            fullWidth
            viewValue={<span className="text-[#DC2626]">⚠ קישור קו"ח אינו תקני</span>}
          />
        )}
      </AdminPanelSection>

      {/* שער בדיקה — רק כשהמועמד עוד לא במאגר */}
      {!inRegistry && (
        <AdminPanelSection title="החלטת בדיקה">
          <div className="sm:col-span-2">
            <div className="rounded-lg bg-[#FDF3E7] p-3 text-[13px] text-[#92400E]">
              מועמד זה טרם קיים במאגר — נדרשת בדיקה
              {row.check_status != null && (
                <span className="mt-0.5 block text-[12px]">
                  סטטוס נוכחי: {checkStatusName(row.check_status) ?? '—'}
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={approveToRegistry}
                disabled={createContactFromApplication.isPending || markSpam.isPending}
                className="flex-1 rounded-full bg-[#008080] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#006D6D] disabled:opacity-60"
              >
                {createContactFromApplication.isPending ? 'מאשר…' : 'מאושר למאגר ←'}
              </button>
              <button
                type="button"
                onClick={handleSpam}
                disabled={createContactFromApplication.isPending || markSpam.isPending}
                className="rounded-full border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[13px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2] disabled:opacity-60"
              >
                {markSpam.isPending ? 'מסמן…' : 'ספאם / לא רלוונטי'}
              </button>
            </div>
          </div>
        </AdminPanelSection>
      )}

      {/* פרטי מועמד מהמאגר */}
      {contact && (
        <AdminPanelSection title="פרטי מועמד (מאגר)">
          <AdminPanelField
            label="שם מלא"
            mode="view"
            viewValue={contact.full_name ?? contact.display_name}
          />
          <AdminPanelField
            label="נייד"
            mode="view"
            viewValue={contact.phone ? <span dir="ltr">{formatPhone(contact.phone)}</span> : null}
          />
          <AdminPanelField
            label="אימייל"
            mode="view"
            viewValue={contact.email ? <span dir="ltr">{contact.email}</span> : null}
          />
          <AdminPanelField label={'עם קו"ח'} mode="view" viewValue={contact.has_cv ? 'כן' : 'לא'} />
          <AdminPanelField
            label="סטטוס תעסוקה"
            mode="view"
            viewValue={getDictLabel(dicts?.workStatuses, contact.work_status)}
          />
          <AdminPanelField
            label="זמינות"
            mode="view"
            // contact.availability נמחקה מה-DB (יוני 2026) ותמיד undefined —
            // candidate_availability_ids היא העמודה הקנונית (INC-3116).
            viewValue={getDictLabel(dicts?.availabilities, contact.candidate_availability_ids?.[0])}
          />
          <AdminPanelField
            label="תפקיד מועמד"
            mode="view"
            viewValue={
              contact.role != null ? (
                <RoleBadge roleId={contact.role} label={getDictLabel(dicts?.roles, contact.role)} />
              ) : null
            }
          />
          <AdminPanelField
            label="עיר מועמד"
            mode="view"
            viewValue={getDictLabel(dicts?.cities, contact.city_id)}
          />
          <AdminPanelField
            label="אזור מועמד"
            mode="view"
            viewValue={
              contact.region_id != null ? (
                <RegionBadge
                  regionId={contact.region_id}
                  label={getDictLabel(dicts?.regions, contact.region_id)}
                />
              ) : null
            }
          />
          {contact.cv_link && isValidUrl(contact.cv_link) && (
            <AdminPanelField
              label={'קו"ח במאגר'}
              mode="view"
              fullWidth
              viewValue={
                <a
                  href={contact.cv_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#3B82F6] hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  קו"ח עדכני במאגר
                </a>
              }
            />
          )}
        </AdminPanelSection>
      )}

      {/* פרטי משרה */}
      {job && (
        <AdminPanelSection title="פרטי משרה">
          <AdminPanelField label="קוד משרה" mode="view" viewValue={job.job_code} />
          <AdminPanelField label="כותרת משרה" mode="view" viewValue={job.job_title} />
          <AdminPanelField
            label="סטטוס משרה"
            mode="view"
            viewValue={<StatusBadge statusType="job" statusId={job.job_status} />}
          />
          <AdminPanelField
            label="תפקיד משרה"
            mode="view"
            viewValue={
              job.job_role != null ? (
                <RoleBadge roleId={job.job_role} label={getDictLabel(dicts?.roles, job.job_role)} />
              ) : null
            }
          />
          <AdminPanelField
            label="עיר משרה"
            mode="view"
            viewValue={getDictLabel(dicts?.cities, job.city_id)}
          />
          <AdminPanelField
            label="אזור משרה"
            mode="view"
            viewValue={
              job.region_id != null ? (
                <RegionBadge
                  regionId={job.region_id}
                  label={getDictLabel(dicts?.regions, job.region_id)}
                />
              ) : null
            }
          />
          <AdminPanelField
            label="ניסיון נדרש"
            mode="view"
            viewValue={job.required_experience != null ? String(job.required_experience) : null}
          />
          <AdminPanelField
            label="שפות"
            mode="view"
            viewValue={
              Array.isArray(job.required_languages)
                ? (job.required_languages as number[])
                    .map((id) => getDictLabel(dicts?.languages, id))
                    .filter((v) => v !== '—')
                    .join(', ') || null
                : job.required_languages != null
                  ? getDictLabel(dicts?.languages, job.required_languages as unknown as number)
                  : null
            }
          />
          {job.job_status !== 3 && job.job_status != null && (
            <AdminPanelField
              label="שימי לב"
              mode="view"
              fullWidth
              viewValue={<span className="text-[#B45309]">⚠ המשרה אינה פעילה כרגע</span>}
            />
          )}
          {job.job_description && (
            <AdminPanelField
              label="תיאור משרה"
              mode="view"
              fullWidth
              viewValue={
                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#F8F9FA] p-3 text-[13px] text-[#2D2D2D]">
                  {job.job_description}
                </div>
              }
            />
          )}
        </AdminPanelSection>
      )}

      {/* פרטי ארגון */}
      {account && (
        <AdminPanelSection title="פרטי ארגון">
          <AdminPanelField label="שם ארגון" mode="view" viewValue={account.account_name} />
          <AdminPanelField
            label="טלפון"
            mode="view"
            viewValue={account.phone ? <span dir="ltr">{formatPhone(account.phone)}</span> : null}
          />
          <AdminPanelField
            label="אימייל"
            mode="view"
            viewValue={account.email ? <span dir="ltr">{account.email}</span> : null}
          />
          {row.account_link && (
            <AdminPanelField
              label="פרופיל"
              mode="view"
              viewValue={
                <a
                  href={`/admin/accounts/${row.account_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#7C3AED] hover:underline"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  פרופיל 360 מעסיק
                </a>
              }
            />
          )}
        </AdminPanelSection>
      )}
    </SidePanel>
  )
}
