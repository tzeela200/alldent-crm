import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitMerge, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { ActionButton } from '@/components/layout/Shell'
import { FieldComparisonRow } from '@/components/inbox-v2/FieldComparisonRow'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useAccountMutations } from '@/hooks/useAccountMutations'
import { useApplicationDicts } from '@/hooks/useApplicationDicts'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import {
  buildComparisons,
  buildPatch,
  deriveEntryReason,
  hasPendingWrites,
  initialChoices,
  parseGoogleSource,
  resolveInboxRoute,
  type ChoiceId,
  type MergeEntity,
} from '@/lib/inbox-v2-merge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Props {
  leadId: number
  /**
   * הכרעה מפורשת במסלול match_conflict (התאמה גם לאדם וגם לארגון).
   * ללא הכרעה — הפאנל לא ממזג ואין ניתוב אוטומטי לאדם.
   */
  forcedEntity?: MergeEntity
  onClose: () => void
}

export function MergePanel({ leadId, forcedEntity, onClose }: Props) {
  const { data: row, isLoading: rowLoading } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { updateContact } = useContactMutations()
  const { updateAccount } = useAccountMutations()
  const { user } = useAuth()
  const { data: dicts } = useApplicationDicts()
  const { data: cities } = useInboxV2Cities()

  const [choices, setChoices] = useState<Record<string, ChoiceId> | null>(null)
  const [overwriteOk, setOverwriteOk] = useState<Record<string, boolean>>({})
  const [showSame, setShowSame] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [merging, setMerging] = useState(false)

  const routing = row ? resolveInboxRoute(row) : null

  // היעד נקבע מהניתוב, לא מ-merge_status. במסלול סתירה נדרשת הכרעה מפורשת.
  const entity: MergeEntity | null =
    routing?.route === 'merge_contact'
      ? 'contact'
      : routing?.route === 'merge_account'
        ? 'account'
        : routing?.route === 'match_conflict'
          ? (forcedEntity ?? null)
          : null

  const targetId =
    entity === 'contact' ? (row?.match_contact ?? null) : entity === 'account' ? (row?.match_account ?? null) : null

  const { data: target, isLoading: targetLoading, error: targetError } = useQuery({
    queryKey: [entity === 'account' ? 'account-for-merge' : 'contact-for-merge', targetId],
    enabled: !!entity && targetId != null,
    queryFn: async () => {
      if (entity === 'account') {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('account_id', targetId)
          .single()
        if (error) throw error
        return data as Record<string, unknown>
      }
      const { data, error } = await supabase
        .from('contact')
        .select('*')
        .eq('contact_id', targetId)
        .single()
      if (error) throw error
      return data as Record<string, unknown>
    },
  })

  const comparisons = useMemo(() => {
    if (!row || !entity || !target) return []
    return buildComparisons(row, target, { roles: dicts?.roles, cities }, entity)
  }, [row, entity, target, dicts?.roles, cities])

  const activeChoices = choices ?? initialChoices(comparisons)
  const setChoice = (key: string, choice: ChoiceId) =>
    setChoices({ ...activeChoices, [key]: choice })

  const visible = comparisons.filter((c) => c.status !== 'none' && c.status !== 'same')
  const sameFields = comparisons.filter((c) => c.status === 'same')
  const google = row ? parseGoogleSource(row) : null

  const handleMerge = async () => {
    if (!row || !entity || targetId == null) return
    setMerging(true)
    try {
      const { patch, applied } = buildPatch(comparisons, activeChoices, entity, target ?? null)
      const changed = Object.keys(patch).length > 0

      if (changed) {
        const { error } =
          entity === 'account'
            ? await updateAccount(targetId, patch)
            : await updateContact(targetId, patch)
        if (error) throw error
      }

      await updateRow.mutateAsync({ leadId, updates: { merge_status: 6 } })

      await logAction.mutateAsync({
        lead_id: leadId,
        target_type: entity,
        target_id: targetId,
        action_type: changed ? INBOX_ACTION.UPDATE_EXISTING : INBOX_ACTION.MERGE,
        updates_applied: applied,
        approved_by: user?.email ?? null,
      })

      toast.success(
        changed
          ? entity === 'account'
            ? 'הרשומה מוזגה והארגון עודכן'
            : 'הרשומה מוזגה ואיש הקשר עודכן'
          : 'הרשומה סומנה כמוזגת (ללא שינוי שדות)'
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה במיזוג')
    } finally {
      setMerging(false)
    }
  }

  const entityLabel = entity === 'account' ? 'ארגון' : 'איש קשר'
  const loading = rowLoading || (!!entity && targetLoading)

  const header = (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#2D2D2D]">
          <GitMerge className="h-5 w-5 text-[#008080]" />
          {entity ? `הצג ואשר מיזוג ל${entityLabel}` : 'אישור רשומת Inbox'}
        </h2>
        {routing && <AdminBadge label={entity === 'account' ? 'ארגון' : entity === 'contact' ? 'אדם' : 'לא סווג'} variant="neutral" />}
      </div>
      {row && (
        <p className="mt-1 text-[12px] text-[#9CA3AF]">
          #{row.lead_id} · {deriveEntryReason(row, routing!.route)}
        </p>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between">
      <button
        onClick={onClose}
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
      >
        ביטול
      </button>
      {entity && (
        <ActionButton
          variant="primary"
          icon={GitMerge}
          onClick={handleMerge}
          disabled={merging || loading || !target}
        >
          {merging
            ? 'מעדכן...'
            : hasPendingWrites(comparisons, activeChoices)
              ? 'אשר ועדכן'
              : 'סמן כמוזג (ללא שינוי שדות)'}
        </ActionButton>
      )}
    </div>
  )

  return (
    <SidePanel open onClose={onClose} header={header} footer={footer}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
        </div>
      ) : !row ? (
        <p className="py-12 text-center text-sm text-[#9CA3AF]">הרשומה לא נמצאה</p>
      ) : !entity ? (
        <AdminPanelSection title="לא ניתן למזג">
          <div className="sm:col-span-2 rounded-[10px] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
            {routing?.route === 'match_conflict'
              ? 'נמצאה התאמה גם לאדם וגם לארגון — נדרשת הכרעה מפורשת לפני מיזוג.'
              : 'לרשומה זו אין התאמה קיימת למיזוג. השתמשי במסלול היצירה המתאים.'}
          </div>
        </AdminPanelSection>
      ) : targetError ? (
        <p className="py-12 text-center text-sm text-[#DC2626]">
          שגיאה בטעינת ה{entityLabel}: {targetError.message}
        </p>
      ) : (
        <>
          {routing?.classificationWarning && (
            <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{routing.classificationWarning}</span>
            </div>
          )}

          <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              ברירת המחדל היא "דלג" — לא מתעדכן דבר עד שתבחרי מפורשות. דריסת ערך קיים דורשת אישור נוסף.
            </span>
          </div>

          <AdminPanelSection title={`השוואת שדות מול ה${entityLabel} הקיים`}>
            <div className="sm:col-span-2 space-y-2">
              {visible.length === 0 ? (
                <div className="rounded-[10px] bg-[#E6F3F3] px-4 py-6 text-center text-[13px] text-[#008080]">
                  אין שדות חדשים מ-Google — הרשומה תואמת ל{entityLabel} הקיים. ניתן לסמן כמוזג.
                </div>
              ) : (
                <>
                  <div className="hidden px-3 text-[12px] font-semibold text-[#6B6B6B] sm:grid sm:grid-cols-[1.1fr_1fr_1fr_1.3fr] sm:gap-2">
                    <div>שדה / סוג שינוי</div>
                    <div>קיים במערכת</div>
                    <div>הגיע מ-Google</div>
                    <div>בחירה</div>
                  </div>
                  {visible.map((cmp) => (
                    <FieldComparisonRow
                      key={cmp.key}
                      comparison={cmp}
                      choice={activeChoices[cmp.key] ?? 'skip'}
                      onChoiceChange={(c) => setChoice(cmp.key, c)}
                      overwriteConfirmed={!!overwriteOk[cmp.key]}
                      onOverwriteConfirmChange={(confirmed) => {
                        setOverwriteOk((o) => ({ ...o, [cmp.key]: confirmed }))
                        if (!confirmed) setChoice(cmp.key, 'skip')
                      }}
                    />
                  ))}
                </>
              )}

              {sameFields.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSame(!showSame)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] transition hover:text-[#6B6B6B]"
                  >
                    {showSame ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    הצג {sameFields.length} שדות זהים
                  </button>
                  {showSame && (
                    <div className="mt-2 space-y-1">
                      {sameFields.map((cmp) => (
                        <div
                          key={cmp.key}
                          className="flex items-center justify-between rounded-[8px] bg-[#F8F9FA] px-3 py-1.5 text-[12px] text-[#6B6B6B]"
                        >
                          <span className="font-medium">{cmp.label}</span>
                          <span dir="auto">{cmp.incomingLabel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </AdminPanelSection>

          <AdminPanelSection title="מקור Google">
            <AdminPanelField label="חשבון Google" mode="view" viewValue={google?.accountKey ?? row.source_name} />
            <AdminPanelField label="מזהה רשומה ב-Google" mode="view" viewValue={google?.resourceName} />
            <AdminPanelField label="סיבת הכניסה" mode="view" viewValue={deriveEntryReason(row, routing!.route)} />
            <AdminPanelField
              label={`מזוהה מול ${entityLabel}`}
              mode="view"
              viewValue={`#${targetId}`}
            />
            <AdminPanelField label="Payload hash" mode="view" viewValue={google?.payloadHash} />
            <AdminPanelField label="etag" mode="view" viewValue={google?.etag} />
          </AdminPanelSection>

          <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] transition hover:text-[#6B6B6B]"
            >
              {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              נתונים גולמיים (JSON) — אזור טכני
            </button>
            {showRaw && (
              <pre
                className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[10px] leading-relaxed text-[#6B6B6B]"
                dir="ltr"
              >
                {JSON.stringify({ raw_payload: row.raw_payload, parsed_payload: row.parsed_payload }, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </SidePanel>
  )
}
