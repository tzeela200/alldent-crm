/**
 * פאנל הפירוט (§3.6) — צפייה בלבד. ארבעה מקטעים + היסטוריית פעולות:
 * א. המקור  ב. מה המערכת הבינה  ג. תוצאת ההתאמה (+ כל הופעות הזהות)
 * ד. הפעולה המוצעת  ה. היסטוריית הפעולות.
 * כלל חוסם (§3.6): אין אישור פעולה כשהטקסט המקורי אינו מוצג — כאן הוא
 * תמיד מוצג ראשון, מלא וללא שינוי.
 */

import { useState } from 'react'
import { UserPlus, Building2, Check, Ban, LinkIcon, Merge, Send } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { ActionButton } from '@/components/layout/Shell'
import { formatPhone } from '@/lib/normalizePhone'
import { computeMatchStatus } from '@/lib/employment-intake/matching'
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_TONE,
  MATCH_STATUS_LABEL,
  MATCH_TYPE_LABEL,
  CONFIDENCE_LABEL,
  ACTION_TYPE_LABEL,
  DETAILS_SENT_TYPE_LABEL,
  ACTION_RESULT_LABEL,
  ACTION_RESULT_TONE,
  activeRequestLabel,
  fieldLabel,
} from '@/lib/employment-intake/labels'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useContactCompareData, useAccountCompareData } from '@/hooks/useEmploymentIntakeActions'
import { useIntakeActionHistory, useIntakeIdentityOccurrences } from '@/hooks/useEmploymentIntakePanel'
import { IntakeCreateContactDialog } from '@/components/employment-intake/IntakeCreateContactDialog'
import { IntakeCreateAccountDialog } from '@/components/employment-intake/IntakeCreateAccountDialog'
import { IntakeConfirmActionDialog, type ConfirmActionKind } from '@/components/employment-intake/IntakeConfirmActionDialog'
import { IntakeMergeDialog } from '@/components/employment-intake/IntakeMergeDialog'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

type ActiveDialog = 'create_contact' | 'create_account' | 'merge_contact' | 'merge_account' | ConfirmActionKind | null

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

interface Props {
  row: RowWithAction | null
  onClose: () => void
  /**
   * "נשלחו פרטים" (§6, שלב 13) מתבצע דרך אותו מנוע של הפעולה הגורפת, גם
   * לשורה בודדת — כך מובטח שפעולה אחת נרשמת לכל זהות ומקושרת לכל
   * ההופעות שלה, ולא נוצר מסלול כתיבה שני עם סמנטיקה שונה.
   */
  onMarkDetailsSent?: (row: RowWithAction) => void
}

export function IntakePanel({ row, onClose, onMarkDetailsSent }: Props) {
  const history = useIntakeActionHistory(row?.canonical_contact_id ?? null, row?.identity_group_id ?? null)
  const occurrences = useIntakeIdentityOccurrences(row?.id ?? -1, row?.canonical_contact_id ?? null, row?.identity_group_id ?? null)
  const { data: appDicts } = useApplicationDicts()
  const { data: intakeDicts } = useEmploymentIntakeDicts()
  // §12.1 אוסר להציג contact_id/account_id/social_status גולמיים — התצוגה
  // תמיד בשם, ולכן נשלפים שמות הישויות שהותאמו.
  const matchedContact = useContactCompareData(row?.match_contact ?? null)
  const matchedAccount = useAccountCompareData(row?.match_account ?? null)
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const closeDialog = () => setActiveDialog(null)

  return (
    <>
    <SidePanel
      open={!!row}
      onClose={onClose}
      width="max-w-[720px]"
      header={
        <div className="px-5 py-4">
          <h2 className="text-[16px] font-bold text-[#2D2D2D]">פירוט ההודעה</h2>
          {row && <p className="mt-0.5 text-[13px] text-[#6B6B6B]">התקבלה {formatDateTime(row.ingested_at)}</p>}
        </div>
      }
    >
      {row && (
        <>
          <AdminPanelSection title="א. המקור">
            <AdminPanelField
              label="הטקסט המקורי"
              mode="view"
              fullWidth
              viewValue={<div className="whitespace-pre-wrap text-[14px]">{row.original_text}</div>}
            />
            {row.context_text && (
              <AdminPanelField
                label="הודעות ההקשר שחוברו"
                mode="view"
                fullWidth
                viewValue={<div className="whitespace-pre-wrap text-[13px] text-[#6B6B6B]">{row.context_text}</div>}
              />
            )}
            <AdminPanelField label="שולח" mode="view" viewValue={row.sender_name} />
            <AdminPanelField label="טלפון השולח" mode="view" viewValue={row.sender_phone ? formatPhone(row.sender_phone) : null} />
            <AdminPanelField label="מקור" mode="view" viewValue={row.source_name} />
            <AdminPanelField label="זמן הפרסום המקורי" mode="view" viewValue={formatDateTime(row.source_published_at)} />
            <AdminPanelField label="זמן הקליטה" mode="view" viewValue={formatDateTime(row.ingested_at)} />
            <AdminPanelField label="טלפון" mode="view" viewValue={row.phone ? `${formatPhone(row.phone)} (מתוך ההודעה)` : null} />
            <AdminPanelField label="טלפון נוסף" mode="view" viewValue={row.second_phone ? formatPhone(row.second_phone) : null} />
            <AdminPanelField label="מייל" mode="view" viewValue={row.email} />
            <AdminPanelField label="Facebook" mode="view" viewValue={row.facebook_name ?? row.facebook_id ?? row.facebook_url} />
            {row.unassigned_phones?.length > 0 && (
              <AdminPanelField
                label="טלפונים ללא ייחוס ברור"
                mode="view"
                fullWidth
                viewValue={row.unassigned_phones.map((p) => formatPhone(p)).join(' · ')}
              />
            )}
          </AdminPanelSection>

          <AdminPanelSection title="ב. מה המערכת הבינה">
            <AdminPanelField
              label="סוג התוכן"
              mode="view"
              viewValue={<AdminBadge label={CONTENT_TYPE_LABEL[row.content_type]} variant={CONTENT_TYPE_TONE[row.content_type]} />}
            />
            <AdminPanelField label="מצב הבקשה" mode="view" viewValue={activeRequestLabel(row.is_active_request)} />
            <AdminPanelField label="רמת ודאות" mode="view" viewValue={row.confidence_level ? CONFIDENCE_LABEL[row.confidence_level] : null} />
            <AdminPanelField label="הסיבה" mode="view" fullWidth viewValue={row.classify_reason} />
            {row.evidence?.length > 0 && (
              <AdminPanelField label="הראיות מהטקסט" mode="view" fullWidth viewValue={row.evidence.join(' · ')} />
            )}
            <AdminPanelField label="תפקיד (כפי שנכתב)" mode="view" viewValue={row.role_raw} />
            <AdminPanelField label="תפקיד (רשמי)" mode="view" viewValue={row.role_id != null ? getDictLabel(appDicts?.roles, row.role_id) : null} />
            <AdminPanelField label="עיר (כפי שנכתבה)" mode="view" viewValue={row.city_raw} />
            <AdminPanelField label="עיר (רשמית)" mode="view" viewValue={row.city_id != null ? getDictLabel(appDicts?.cities, row.city_id) : null} />
            <AdminPanelField label="אזור" mode="view" viewValue={row.region_id != null ? getDictLabel(appDicts?.regions, row.region_id) : null} />
          </AdminPanelSection>

          <AdminPanelSection title="ג. תוצאת ההתאמה">
            <AdminPanelField
              label="מצב במאגר"
              mode="view"
              viewValue={<AdminBadge label={MATCH_STATUS_LABEL[computeMatchStatus(row)]} variant="info" />}
            />
            <AdminPanelField label="איש הקשר שנמצא" mode="view" viewValue={matchedContact.data?.display_name ?? null} />
            <AdminPanelField label="הארגון שנמצא" mode="view" viewValue={matchedAccount.data?.account_name ?? null} />
            <AdminPanelField label="לפי איזה שדה" mode="view" viewValue={row.match_field ? fieldLabel(row.match_field) : null} />
            <AdminPanelField label="מדוע נמצאה ההתאמה" mode="view" viewValue={row.match_type ? MATCH_TYPE_LABEL[row.match_type] : null} />
            {row.match_candidates?.length > 1 && (
              <AdminPanelField
                label="התאמות אפשריות נוספות"
                mode="view"
                fullWidth
                viewValue={row.match_candidates.map((c) => `${c.label} (${c.type === 'contact' ? 'איש קשר' : 'ארגון'})`).join(' · ')}
              />
            )}
            <AdminPanelField
              label="כל ההופעות של אותה זהות"
              mode="view"
              fullWidth
              viewValue={
                occurrences.data && occurrences.data.length > 0 ? (
                  <ul className="space-y-1 text-[13px]">
                    {occurrences.data.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-[#F9FAFB] px-2 py-1">
                        <span className="truncate">{o.original_text}</span>
                        <span className="shrink-0 text-[#9CA3AF]">{o.source_name ?? '—'} · {formatDateTime(o.ingested_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>{occurrences.isLoading ? 'טוען…' : 'לא נמצאו הופעות נוספות של אותה זהות.'}</span>
                )
              }
            />
          </AdminPanelSection>

          <AdminPanelSection title="ד. הפעולה המוצעת">
            <AdminPanelField label="פעולה מוצעת" mode="view" viewValue={row.proposed_action ? ACTION_TYPE_LABEL[row.proposed_action] : null} />
            <AdminPanelField
              label="סטטוס ליד מוצע"
              mode="view"
              viewValue={
                row.proposed_social_status != null
                  ? (intakeDicts?.socialStatuses.find((s) => s.id === row.proposed_social_status)?.name ?? null)
                  : null
              }
            />
            <AdminPanelField
              label="ביצוע"
              mode="view"
              fullWidth
              viewValue={
                <div className="flex flex-wrap gap-2">
                  {row.match_contact == null && (
                    <ActionButton size="sm" icon={UserPlus} onClick={() => setActiveDialog('create_contact')}>
                      יצירת איש קשר חדש
                    </ActionButton>
                  )}
                  {row.match_account == null && row.org_name && (
                    <ActionButton size="sm" icon={Building2} onClick={() => setActiveDialog('create_account')}>
                      יצירת ארגון חדש
                    </ActionButton>
                  )}
                  {row.match_contact != null && row.proposed_social_status != null && (
                    <ActionButton size="sm" icon={Check} onClick={() => setActiveDialog('lead_status')}>
                      עדכון סטטוס ליד
                    </ActionButton>
                  )}
                  {row.content_type === 'irrelevant' && (
                    <ActionButton size="sm" icon={Ban} onClick={() => setActiveDialog('irrelevant')}>
                      סימון לא רלוונטי
                    </ActionButton>
                  )}
                  {row.match_contact != null && row.match_account != null && (
                    <ActionButton size="sm" icon={LinkIcon} onClick={() => setActiveDialog('link_account')}>
                      קישור לארגון
                    </ActionButton>
                  )}
                  {row.match_contact != null && (
                    <ActionButton size="sm" icon={Merge} onClick={() => setActiveDialog('merge_contact')}>
                      מיזוג מידע לאיש הקשר
                    </ActionButton>
                  )}
                  {row.match_account != null && (
                    <ActionButton size="sm" icon={Merge} onClick={() => setActiveDialog('merge_account')}>
                      מיזוג מידע לארגון
                    </ActionButton>
                  )}
                  {row.match_contact != null && onMarkDetailsSent && (
                    <ActionButton size="sm" icon={Send} onClick={() => onMarkDetailsSent(row)}>
                      סימון שנשלחו פרטים
                    </ActionButton>
                  )}
                </div>
              }
            />
          </AdminPanelSection>

          <AdminPanelSection
            title="ה. היסטוריית הפעולות"
            isEmpty={!history.data || history.data.length === 0}
            emptyMessage={history.isLoading ? 'טוען…' : 'לא בוצעו עדיין פעולות עבור זהות זו.'}
          >
            {(history.data ?? []).map((a) => (
              <div key={a.action_id} className="col-span-2 flex items-center justify-between gap-2 rounded-[8px] bg-[#F9FAFB] px-3 py-2 text-[13px]">
                <div>
                  <span className="font-semibold text-[#2D2D2D]">{ACTION_TYPE_LABEL[a.action_type]}</span>
                  {a.details_sent_type && <span className="text-[#6B6B6B]"> — {DETAILS_SENT_TYPE_LABEL[a.details_sent_type]}</span>}
                  <div className="text-[#9CA3AF]">{formatDateTime(a.performed_at)} · {a.performed_by}</div>
                </div>
                <AdminBadge label={ACTION_RESULT_LABEL[a.result]} variant={ACTION_RESULT_TONE[a.result]} />
              </div>
            ))}
          </AdminPanelSection>
        </>
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
      targetId={activeDialog === 'merge_contact' ? (row?.match_contact ?? null) : activeDialog === 'merge_account' ? (row?.match_account ?? null) : null}
      onClose={closeDialog}
    />
    </>
  )
}
