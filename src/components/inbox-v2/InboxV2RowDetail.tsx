import { useState } from 'react'
import {
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  EyeOff,
  Ban,
  UserPlus,
  GitMerge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { StatusPill, ActionButton } from '@/components/layout/Shell'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useInboxV2Matching } from '@/hooks/useInboxV2Matching'
import { INBOX_STATUSES, SOURCE_TYPES, getDictName, inboxStatusVariant } from '@/lib/inbox-v2-dicts'
import { toast } from 'sonner'

interface Props {
  leadId: number
  onClose: () => void
  onOpenMerge: (leadId: number) => void
  onOpenCreate: (leadId: number) => void
}

export function InboxV2RowDetail({ leadId, onClose, onOpenMerge, onOpenCreate }: Props) {
  const { data: row, isLoading } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { matchRow } = useInboxV2Matching()
  const [showRaw, setShowRaw] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)

  if (isLoading) {
    return (
      <DetailShell onClose={onClose}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      </DetailShell>
    )
  }

  if (!row) {
    return (
      <DetailShell onClose={onClose}>
        <p className="py-20 text-center text-sm text-slate-400">רשומה לא נמצאה</p>
      </DetailShell>
    )
  }

  const setStatus = async (status: number, label: string) => {
    await updateRow.mutateAsync({ leadId, updates: { merge_status: status } })
    await logAction.mutateAsync({
      lead_id: leadId,
      target_type: null,
      target_id: null,
      action_type: status === 7 ? 5 : status === 8 ? 6 : 7,
      updates_applied: { merge_status: status },
      approved_by: null,
    })
    toast.success(`סטטוס עודכן ל-${label}`)
  }

  const saveNotes = async () => {
    if (notes === null) return
    await updateRow.mutateAsync({ leadId, updates: { notes } })
    toast.success('הערות נשמרו')
  }

  const suggestedKeys = row.suggested_updates ? Object.keys(row.suggested_updates) : []

  return (
    <DetailShell onClose={onClose}>
      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{row.display_name ?? 'ללא שם'}</h2>
            <p className="text-xs text-slate-500">
              #{row.lead_id} · {getDictName(SOURCE_TYPES, row.source_type)}{' '}
              {row.source_name ? `· ${row.source_name}` : ''}
            </p>
          </div>
          <StatusPill
            label={getDictName(INBOX_STATUSES, row.merge_status)}
            variant={inboxStatusVariant[row.merge_status ?? 1] ?? 'default'}
          />
        </div>
      </div>

      {/* Parsed Data */}
      <Section title="נתונים מנותחים">
        <FieldGrid>
          <Field label="שם פרטי" value={row.first_name} />
          <Field label="שם משפחה" value={row.last_name} />
          <Field label="טלפון" value={row.phone} dir="ltr" />
          <Field label="טלפון מנורמל" value={row.phone_norm} dir="ltr" />
          <Field label="אימייל" value={row.email} dir="ltr" />
          <Field label="שם פייסבוק" value={row.facebook_name} />
          <Field label="Facebook ID" value={row.facebook_id} dir="ltr" />
          <Field label="Facebook URL" value={row.facebook_url} dir="ltr" />
          <Field label="קבוצת פייסבוק" value={row.facebook_group_name} />
          <Field label="LinkedIn" value={row.linkedin_url} dir="ltr" />
        </FieldGrid>
      </Section>

      {/* Match Info */}
      <Section title="התאמה">
        {row.match_confidence != null && row.match_confidence > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">ביטחון</span>
                  <span
                    className={`font-bold ${
                      row.match_confidence >= 80
                        ? 'text-emerald-600'
                        : row.match_confidence >= 40
                          ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {row.match_confidence}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.match_confidence >= 80
                        ? 'bg-emerald-500'
                        : row.match_confidence >= 40
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                    }`}
                    style={{ width: `${row.match_confidence}%` }}
                  />
                </div>
              </div>
            </div>
            <FieldGrid>
              <Field label="שיטת התאמה" value={row.matched_by} />
              <Field label="סיבה" value={row.match_reason} />
              <Field
                label="התאמה ל"
                value={
                  row.match_contact
                    ? `איש קשר #${row.match_contact}`
                    : row.match_account
                      ? `ארגון #${row.match_account}`
                      : null
                }
              />
            </FieldGrid>
            <ActionButton
              variant="secondary"
              icon={RefreshCw}
              size="sm"
              onClick={() => matchRow.mutate(leadId)}
              disabled={matchRow.isPending}
            >
              {matchRow.isPending ? 'מנתח...' : 'הרץ התאמה מחדש'}
            </ActionButton>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">לא נמצאה התאמה</p>
            <ActionButton
              variant="secondary"
              icon={RefreshCw}
              size="sm"
              onClick={() => matchRow.mutate(leadId)}
              disabled={matchRow.isPending}
            >
              {matchRow.isPending ? 'מנתח...' : 'הרץ התאמה'}
            </ActionButton>
          </div>
        )}
      </Section>

      {/* Suggested Updates */}
      {suggestedKeys.length > 0 && (
        <Section title="עדכונים מוצעים">
          <div className="space-y-1">
            {suggestedKeys.map((key) => {
              const update = (row.suggested_updates as Record<string, any>)[key]
              const isConflict = update?.conflict
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                    isConflict
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className="font-medium">{key}</span>
                  <span>
                    {update?.current != null ? String(update.current) : '(ריק)'} →{' '}
                    {String(update?.incoming ?? '')}
                    {isConflict && ' ⚠️ קונפליקט'}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Tags */}
      {row.tags.length > 0 && (
        <Section title="תגיות">
          <div className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      <Section title="הערות">
        <textarea
          value={notes ?? row.notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
          placeholder="הוסף הערות..."
        />
        {notes !== null && notes !== (row.notes ?? '') && (
          <ActionButton variant="primary" size="sm" onClick={saveNotes}>
            שמור הערות
          </ActionButton>
        )}
      </Section>

      {/* Raw Payload */}
      <div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          נתונים גולמיים (JSON)
        </button>
        {showRaw && (
          <pre
            className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-600"
            dir="ltr"
          >
            {JSON.stringify(row.raw_payload, null, 2)}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <p className="text-xs font-medium text-slate-500">פעולות</p>
        <div className="flex flex-wrap gap-2">
          {row.match_contact && (
            <ActionButton
              variant="primary"
              icon={GitMerge}
              size="sm"
              onClick={() => onOpenMerge(leadId)}
            >
              מזג לאיש קשר
            </ActionButton>
          )}
          <ActionButton
            variant="secondary"
            icon={UserPlus}
            size="sm"
            onClick={() => onOpenCreate(leadId)}
          >
            צור איש קשר חדש
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={CheckCircle2}
            size="sm"
            onClick={() => setStatus(5, 'ממתין לאישור')}
            disabled={updateRow.isPending}
          >
            אשר
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={XCircle}
            size="sm"
            onClick={() => setStatus(7, 'נדחה')}
            disabled={updateRow.isPending}
          >
            דחה
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={EyeOff}
            size="sm"
            onClick={() => setStatus(8, 'התעלמות')}
            disabled={updateRow.isPending}
          >
            התעלם
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={Ban}
            size="sm"
            onClick={() => setStatus(9, 'לא דנטלי')}
            disabled={updateRow.isPending}
          >
            לא דנטלי
          </ActionButton>
        </div>
      </div>
    </DetailShell>
  )
}

function DetailShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 top-0 z-50 flex w-[480px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">פרטי רשומה</h3>
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
  value: string | number | null | undefined
  dir?: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className={`text-sm text-slate-700 ${!value ? 'text-slate-300' : ''}`} dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  )
}
