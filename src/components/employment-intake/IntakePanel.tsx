/** Side Sheet עסקי — פרטים ופעולות בלבד, ללא DB/Parser internals. */

import { useState } from 'react'
import { Ban, Building2, Check, Link as LinkIcon, Merge, Pencil, Send, UserPlus } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { ActionButton } from '@/components/layout/Shell'
import { formatPhone } from '@/lib/normalizePhone'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useIntakeActionHistory, useIntakeIdentityOccurrences } from '@/hooks/useEmploymentIntakePanel'
import {
  ACTION_RESULT_LABEL,
  ACTION_RESULT_TONE,
  ACTION_TYPE_LABEL,
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_TONE,
  DATABASE_STATE_LABEL,
  DATABASE_STATE_TONE,
  DETAILS_SENT_TYPE_LABEL,
  activeRequestLabel,
  computeDatabaseState,
} from '@/lib/employment-intake/labels'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'
import { IntakeCreateContactDialog } from '@/components/employment-intake/IntakeCreateContactDialog'
import { IntakeCreateAccountDialog } from '@/components/employment-intake/IntakeCreateAccountDialog'
import { IntakeConfirmActionDialog } from '@/components/employment-intake/IntakeConfirmActionDialog'
import { IntakeMergeDialog } from '@/components/employment-intake/IntakeMergeDialog'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

function ltr(value: string | null | undefined) {
  return value ? <span dir="ltr" className="inline-block [unicode-bidi:isolate]">{value}</span> : null
}

type DialogKind = 'create_contact' | 'create_account' | 'lead_status' | 'irrelevant' | 'link_account' | 'merge_contact' | 'merge_account' | null

interface Props {
  row: RowWithAction | null
  onClose: () => void
  onEdit?: (row: RowWithAction) => void
  onMarkDetailsSent?: (row: RowWithAction) => void
}

export function IntakePanel({ row, onClose, onEdit, onMarkDetailsSent }: Props) {
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null)
  const { data: appDicts } = useApplicationDicts()
  const { data: intakeDicts } = useEmploymentIntakeDicts()
  const history = useIntakeActionHistory(row?.canonical_contact_id ?? null, row?.identity_group_id ?? null)
  const occurrences = useIntakeIdentityOccurrences(row?.id ?? 0, row?.canonical_contact_id ?? null, row?.identity_group_id ?? null)

  if (!row) return null

  const state = computeDatabaseState(row)
  const existingContact = row.matched_contact
  const existingAccount = row.matched_account
  const identifiedName = existingContact?.display_name ?? existingAccount?.account_name ?? row.contact_name ?? row.org_name ?? row.sender_name ?? 'ללא שם'
  const mobile = row.phone ?? existingContact?.phone ?? existingAccount?.phone ?? null
  const isException = state === 'google_sync_exception'
  const needsIdentification = state === 'needs_identification'
  const canCreateContact = state === 'not_existing' && !isException && !needsIdentification && !!(row.phone || row.contact_name || row.sender_name)
  const canCreateAccount = state === 'not_existing' && !!row.org_name
  const statusId = existingContact?.social_status ?? row.proposed_social_status
  const statusLabel = statusId != null
    ? intakeDicts?.socialStatuses.find((s) => s.id === statusId)?.name ?? null
    : null

  const detailsLabel = row.content_type === 'job_seeker'
    ? 'סימון שנשלחו פרטים — חיפוש עבודה'
    : row.content_type === 'recruiter'
      ? 'סימון שנשלחו פרטים — תהליך גיוס'
      : 'סימון שנשלחו פרטים'

  const closeDialog = () => setActiveDialog(null)

  return (
    <>
      <SidePanel
        open
        onClose={onClose}
        width="max-w-[680px]"
        header={
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold text-[#2D2D2D]">{identifiedName}</h2>
                <p className="mt-1 text-[12px] text-[#6B6B6B]">{row.source_name ?? row.file_name ?? 'מקור לא צוין'} · {formatDateTime(row.source_published_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminBadge label={CONTENT_TYPE_LABEL[row.content_type]} variant={CONTENT_TYPE_TONE[row.content_type]} />
                <AdminBadge label={DATABASE_STATE_LABEL[state]} variant={DATABASE_STATE_TONE[state]} />
              </div>
            </div>
          </div>
        }
        summary={
          <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            <div><div className="text-[11px] text-[#9CA3AF]">שולח</div><div className="font-semibold">{row.sender_name ?? '—'}</div></div>
            <div><div className="text-[11px] text-[#9CA3AF]">נייד</div><div className="font-semibold">{mobile ? ltr(formatPhone(mobile)) : '—'}</div></div>
            <div><div className="text-[11px] text-[#9CA3AF]">תפקיד</div><div className="font-semibold">{row.role_id != null ? getDictLabel(appDicts?.roles, row.role_id) : (row.role_raw ?? '—')}</div></div>
            <div><div className="text-[11px] text-[#9CA3AF]">עיר</div><div className="font-semibold">{row.city_id != null ? getDictLabel(appDicts?.cities, row.city_id) : (row.city_raw ?? '—')}</div></div>
          </div>
        }
        footer={<AdminPanelActions mode="view" onClose={onClose} onEdit={onEdit ? () => onEdit(row) : undefined} />}
      >
        {(isException || needsIdentification) && (
          <div className={`mb-4 rounded-[14px] border p-3 text-[13px] ${isException ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]' : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'}`}>
            {isException
              ? 'השם מופיע בפורמט של איש קשר שמור ב-Google, אבל לא נמצאה הרשומה ב-Supabase. אין להקים אדם חדש אוטומטית; יש לזהות או לבדוק את הסנכרון.'
              : 'אין התאמה בטוחה. יש לזהות או לשייך את האדם לפני יצירה/עדכון.'}
          </div>
        )}

        <AdminPanelSection title="הודעת המקור">
          <AdminPanelField label="הטקסט המקורי" mode="view" fullWidth viewValue={<div className="whitespace-pre-wrap text-[13px] leading-6" dir="auto">{row.original_text}</div>} />
          <AdminPanelField label="שם השולח" mode="view" viewValue={row.sender_name} />
          <AdminPanelField label="מקור הקלט" mode="view" viewValue={row.source_name ?? row.file_name} />
          <AdminPanelField label="זמן הפרסום המקורי" mode="view" viewValue={formatDateTime(row.source_published_at)} />
          {row.context_text && <AdminPanelField label="הקשר שיחה" mode="view" fullWidth viewValue={<div className="whitespace-pre-wrap text-[13px]" dir="auto">{row.context_text}</div>} />}
        </AdminPanelSection>

        <AdminPanelSection title="מה זוהה">
          <AdminPanelField label="האדם / הארגון" mode="view" viewValue={identifiedName} />
          <AdminPanelField label="נייד" mode="view" viewValue={mobile ? ltr(formatPhone(mobile)) : null} />
          <AdminPanelField label="נייד נוסף" mode="view" viewValue={row.second_phone ? ltr(formatPhone(row.second_phone)) : null} />
          <AdminPanelField label="מייל" mode="view" viewValue={ltr(row.email ?? existingContact?.email ?? existingAccount?.email)} />
          <AdminPanelField label="תפקיד" mode="view" viewValue={row.role_id != null ? getDictLabel(appDicts?.roles, row.role_id) : row.role_raw} />
          <AdminPanelField label="עיר" mode="view" viewValue={row.city_id != null ? getDictLabel(appDicts?.cities, row.city_id) : row.city_raw} />
          <AdminPanelField label="אזור" mode="view" viewValue={row.region_id != null ? getDictLabel(appDicts?.regions, row.region_id) : null} />
          <AdminPanelField label="מצב הבקשה" mode="view" viewValue={activeRequestLabel(row.is_active_request)} />
          <AdminPanelField label="סטטוס טיפול" mode="view" viewValue={statusLabel} />
        </AdminPanelSection>

        {(existingContact || existingAccount || row.match_candidates.length > 1) && (
          <AdminPanelSection title="הרשומה הקיימת במאגר">
            {existingContact && <>
              <AdminPanelField label="איש קשר" mode="view" viewValue={existingContact.display_name} />
              <AdminPanelField label="נייד במאגר" mode="view" viewValue={existingContact.phone ? ltr(formatPhone(existingContact.phone)) : null} />
              <AdminPanelField label="תפקיד במאגר" mode="view" viewValue={existingContact.role != null ? getDictLabel(appDicts?.roles, existingContact.role) : null} />
              <AdminPanelField label="עיר במאגר" mode="view" viewValue={existingContact.city_id != null ? getDictLabel(appDicts?.cities, existingContact.city_id) : null} />
            </>}
            {existingAccount && <>
              <AdminPanelField label="ארגון" mode="view" viewValue={existingAccount.account_name} />
              <AdminPanelField label="נייד ארגון" mode="view" viewValue={existingAccount.phone ? ltr(formatPhone(existingAccount.phone)) : null} />
            </>}
            {row.match_candidates.length > 1 && (
              <AdminPanelField label="אפשרויות לזיהוי" mode="view" fullWidth viewValue={row.match_candidates.map((c) => c.label).join(' · ')} />
            )}
          </AdminPanelSection>
        )}

        <AdminPanelSection title="פעולות">
          <div className="col-span-full flex flex-wrap gap-2">
            {(needsIdentification || isException) && onEdit && (
              <ActionButton size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(row)}>זיהוי / שיוך רשומה</ActionButton>
            )}
            {canCreateContact && (
              <ActionButton size="sm" icon={UserPlus} onClick={() => setActiveDialog('create_contact')}>הקמת אדם</ActionButton>
            )}
            {canCreateAccount && (
              <ActionButton size="sm" icon={Building2} onClick={() => setActiveDialog('create_account')}>הקמת ארגון</ActionButton>
            )}
            {row.match_contact != null && row.proposed_social_status != null && (
              <ActionButton size="sm" icon={Check} onClick={() => setActiveDialog('lead_status')}>עדכון סטטוס טיפול</ActionButton>
            )}
            {row.content_type === 'irrelevant' && row.match_contact != null && (
              <ActionButton size="sm" variant="secondary" icon={Ban} onClick={() => setActiveDialog('irrelevant')}>סימון לא רלוונטי</ActionButton>
            )}
            {row.match_contact != null && row.match_account != null && (
              <ActionButton size="sm" variant="secondary" icon={LinkIcon} onClick={() => setActiveDialog('link_account')}>קישור לארגון</ActionButton>
            )}
            {row.match_contact != null && (
              <ActionButton size="sm" variant="secondary" icon={Merge} onClick={() => setActiveDialog('merge_contact')}>השוואה ועדכון שדות</ActionButton>
            )}
            {row.match_account != null && (
              <ActionButton size="sm" variant="secondary" icon={Merge} onClick={() => setActiveDialog('merge_account')}>השוואה ועדכון ארגון</ActionButton>
            )}
            {row.match_contact != null && onMarkDetailsSent && (row.content_type === 'job_seeker' || row.content_type === 'recruiter' || row.content_type === 'group_join') && (
              <ActionButton size="sm" variant="secondary" icon={Send} onClick={() => onMarkDetailsSent(row)}>{detailsLabel}</ActionButton>
            )}
          </div>
        </AdminPanelSection>

        <AdminPanelSection
          title="היסטוריית טיפול"
          isEmpty={!history.data || history.data.length === 0}
          emptyMessage={history.isLoading ? 'טוען…' : 'לא בוצעו עדיין פעולות עבור זהות זו.'}
        >
          {(history.data ?? []).map((a) => (
            <div key={a.action_id} className="col-span-2 flex items-center justify-between gap-2 rounded-[10px] bg-[#F9FAFB] px-3 py-2 text-[13px]">
              <div>
                <span className="font-semibold">{ACTION_TYPE_LABEL[a.action_type]}</span>
                {a.details_sent_type && <span className="text-[#6B6B6B]"> — {DETAILS_SENT_TYPE_LABEL[a.details_sent_type]}</span>}
                <div className="text-[11px] text-[#9CA3AF]">{formatDateTime(a.performed_at)} · {a.performed_by}</div>
              </div>
              <AdminBadge label={ACTION_RESULT_LABEL[a.result]} variant={ACTION_RESULT_TONE[a.result]} />
            </div>
          ))}
        </AdminPanelSection>

        {occurrences.data && occurrences.data.length > 0 && (
          <AdminPanelSection title="הופעות נוספות של אותה זהות">
            <div className="col-span-2 space-y-1.5">
              {occurrences.data.slice(0, 10).map((o) => (
                <div key={o.id} className="rounded-[9px] bg-[#F9FAFB] px-3 py-2 text-[12px]">
                  <div className="line-clamp-2" dir="auto">{o.original_text}</div>
                  <div className="mt-1 text-[#9CA3AF]">{o.source_name ?? '—'} · {formatDateTime(o.source_published_at)}</div>
                </div>
              ))}
            </div>
          </AdminPanelSection>
        )}
      </SidePanel>

      <IntakeCreateContactDialog row={activeDialog === 'create_contact' ? row : null} onClose={closeDialog} />
      <IntakeCreateAccountDialog row={activeDialog === 'create_account' ? row : null} onClose={closeDialog} />
      <IntakeConfirmActionDialog
        row={activeDialog === 'lead_status' || activeDialog === 'irrelevant' || activeDialog === 'link_account' ? row : null}
        kind={activeDialog === 'lead_status' || activeDialog === 'irrelevant' || activeDialog === 'link_account' ? activeDialog : null}
        onClose={closeDialog}
      />
      <IntakeMergeDialog
        row={activeDialog === 'merge_contact' || activeDialog === 'merge_account' ? row : null}
        target={activeDialog === 'merge_contact' ? 'contact' : activeDialog === 'merge_account' ? 'account' : null}
        targetId={activeDialog === 'merge_contact' ? (row.match_contact ?? null) : activeDialog === 'merge_account' ? (row.match_account ?? null) : null}
        onClose={closeDialog}
      />
    </>
  )
}
