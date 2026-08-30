import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitMerge, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { ActionButton } from '@/components/layout/Shell'
import { FieldComparisonRow } from '@/components/inbox-v2/FieldComparisonRow'
import { useInboxV2Row } from '@/hooks/useInboxV2'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useInboxV2SourceTypes } from '@/hooks/useInboxV2SourceTypes'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION, sourceLabel } from '@/lib/inbox-v2-dicts'
import { formatPhone } from '@/lib/normalizePhone'
import {
  buildComparisons,
  buildPatch,
  deriveEntryReason,
  hasPendingWrites,
  initialChoices,
  parseGoogleSource,
  resolveInboxRoute,
  summarizeMerge,
  unresolvedConflicts,
  type ChoiceId,
  type MergeEntity,
} from '@/lib/inbox-v2-merge'
import {
  suppressDecided,
  buildDecisionPayload,
  googleAccountLabel,
  type DecisionContext,
} from '@/lib/inbox-v2-decisions'
import { useInboxFieldDecisions, useApplyInboxMerge } from '@/hooks/useInboxFieldDecisions'
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
  // אין כאן יותר updateContact/updateRow/logAction נפרדים: כל ארבע
  // הכתיבות עוברות דרך apply_inbox_merge_decision בטרנזקציה אחת.
  const { user } = useAuth()
  const { data: dicts } = useApplicationDicts()
  const { data: cities } = useInboxV2Cities()
  const { data: sourceTypes } = useInboxV2SourceTypes()

  const [choices, setChoices] = useState<Record<string, ChoiceId> | null>(null)
  const [manualValues, setManualValues] = useState<Record<string, unknown>>({})
  const [showSame, setShowSame] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [merging, setMerging] = useState(false)
  const applyMerge = useApplyInboxMerge()

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

  // מקור הרשומה בפועל — לא הנחה ש-Google (INC-3124).
  const source = row ? sourceLabel(row, sourceTypes) : null

  const comparisons = useMemo(() => {
    if (!row || !entity || !target) return []
    return buildComparisons(row, target, { roles: dicts?.roles, cities }, entity, source?.short)
  }, [row, entity, target, dicts?.roles, cities, source?.short])

  const activeChoices = choices ?? initialChoices(comparisons)
  const setChoice = (key: string, choice: ChoiceId) =>
    setChoices({ ...activeChoices, [key]: choice })

  const google = row ? parseGoogleSource(row) : null

  // ── זיכרון החלטות (INC-3123) ────────────────────────────────────────
  const decisionCtx: DecisionContext | null =
    entity && targetId != null
      ? {
          targetType: entity,
          targetId,
          googleAccountKey: google?.accountKey ?? null,
          googleResourceName: google?.resourceName ?? null,
          sourceType: row?.source_type ?? null,
          sourceUniqueKey: row?.source_unique_key ?? null,
        }
      : null

  const { data: pastDecisions = [] } = useInboxFieldDecisions(entity, targetId)

  // קונפליקט שכבר הוכרע בדיוק באותם שני ערכים אינו מוצג שוב.
  const { visible: visibleFields, suppressed } = useMemo(() => {
    const withValue = comparisons.filter((c) => c.status !== 'none')
    if (!decisionCtx) return { visible: withValue, suppressed: [] }
    return suppressDecided(withValue, pastDecisions, decisionCtx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisons, pastDecisions, entity, targetId])

  // שדות זהים מוסתרים כברירת מחדל — הם לא דורשים החלטה.
  const decisionFields = visibleFields.filter((c) => c.status !== 'same')
  const sameFields = visibleFields.filter((c) => c.status === 'same')
  const shownFields = showSame ? visibleFields : decisionFields

  const summary = summarizeMerge(visibleFields, activeChoices, manualValues)
  const blocking = unresolvedConflicts(visibleFields, activeChoices, manualValues)

  const autoDecided = visibleFields.filter((c) => c.status === 'auto')

  const handleMerge = async () => {
    if (!row || !entity || targetId == null) return
    if (blocking.length > 0) {
      toast.error('יש לבחור ערך בשדות המסומנים.')
      return
    }
    setMerging(true)
    try {
      const { patch, applied } = buildPatch(comparisons, activeChoices, entity, target ?? null, manualValues)
      const changed = Object.keys(patch).length > 0

      // אחרי אישור חייבת להישאר בדיוק התאמה אחת: GOOGLE-01 רושם שגיאה ולא יוצר
      // קישור כאשר שתי העמודות מלאות (SSOT §18.5), וההחלטה לא הייתה חוזרת ל-Google.
      // רלוונטי רק למסלול הסתירה — בשאר המסלולים העמודה השנייה כבר null.
      const resolvedConflict = routing?.route === 'match_conflict'

      // ⚠ כתיבה אחת עקבית: עדכון הליבה, שמירת ההחלטות, סטטוס הרשומה
      // וה-audit — הכול בטרנזקציה אחת. עד היום אלו היו שלוש קריאות
      // נפרדות, וכשל באמצע השאיר את הרשומה מעודכנת בלי שההחלטה נשמרה,
      // ואז אותו קונפליקט חזר בסנכרון הבא.
      await applyMerge.mutateAsync({
        leadId,
        targetType: entity,
        targetId,
        patch,
        decisions: buildDecisionPayload(visibleFields, activeChoices, manualValues),
        actionType: changed ? INBOX_ACTION.UPDATE_EXISTING : INBOX_ACTION.MERGE,
        approvedBy: user?.email ?? null,
        googleAccountKey: google?.accountKey ?? null,
        googleResourceName: google?.resourceName ?? null,
        sourceType: row.source_type,
        sourceUniqueKey: row.source_unique_key,
        clearOtherMatch: resolvedConflict,
      })

      void applied
      toast.success(
        changed
          ? entity === 'account'
            ? 'הארגון עודכן'
            : 'איש הקשר עודכן'
          : 'סומן כקיים במערכת. הבחירות נשמרו ולא יוצגו שוב.'
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון הרשומה')
    } finally {
      setMerging(false)
    }
  }

  const entityLabel = entity === 'account' ? 'ארגון' : 'איש קשר'
  const loading = rowLoading || (!!entity && targetLoading)
  // שם הישות במקום מזהה — §9 אוסר להציג מזהים טכניים
  const targetName =
    (entity === 'account' ? (target?.account_name as string | null) : (target?.display_name as string | null)) ?? null

  // תפקיד ועיר של הרשומה הקיימת — שם לבדו אינו מספיק כדי לדעת מול מי
  // מכריעים, במיוחד כשיש שמות חוזרים במאגר (INC-3125).
  const targetDetails = [
    entity === 'contact' && target?.role != null
      ? getDictLabel(dicts?.roles, target.role as number)
      : null,
    target?.city_id != null
      ? (cities?.find((c) => c.id === Number(target.city_id))?.name ?? null)
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const header = (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#2D2D2D]">
          <GitMerge className="h-5 w-5 text-[#008080]" />
          {entity ? `השוואה ועדכון — ${entityLabel} קיים` : 'אישור רשומת Inbox'}
        </h2>
        {routing && <AdminBadge label={entity === 'account' ? 'ארגון' : entity === 'contact' ? 'אדם' : 'לא סווג'} variant="neutral" />}
      </div>
      {/* §7 — זהות קודם: מי זה, איזה נייד, מה מצבו במערכת, מאיפה הגיע */}
      {row && (
        <div className="mt-1 space-y-0.5">
          <p className="text-[13px] font-semibold text-[#2D2D2D]" dir="auto">
            {targetName ?? row.display_name ?? 'ללא שם'}
            {targetName && <span className="ms-2 text-[12px] font-normal text-[#008080]">קיים במערכת</span>}
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            {row.phone && (
              <span dir="ltr" className="me-2">
                {formatPhone(row.phone)}
              </span>
            )}
            {targetDetails && <span className="me-2">{targetDetails}</span>}
            {source ? `מקור: ${source.full}` : ''}
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            {blocking.length > 0
              ? `${blocking.length} ${blocking.length === 1 ? 'שינוי דורש' : 'שינויים דורשים'} את החלטתך`
              : summary.willChange > 0
                ? `${summary.willChange} שדות יתעדכנו`
                : 'אין שינוי — ניתן לסמן כקיים במערכת'}
          </p>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={onClose}
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
      >
        ביטול
      </button>
      <div className="flex items-center gap-3">
        {blocking.length > 0 && (
          <span className="text-[12px] font-semibold text-[#DC2626]">יש לבחור ערך בשדות המסומנים.</span>
        )}
        {entity && (
          <ActionButton
            variant="primary"
            icon={GitMerge}
            onClick={handleMerge}
            disabled={merging || loading || !target || blocking.length > 0}
          >
            {merging
              ? 'שומר...'
              : hasPendingWrites(comparisons, activeChoices)
                ? 'אשר ושמור'
                : 'סמן כקיים במערכת'}
          </ActionButton>
        )}
      </div>
    </div>
  )

  return (
    <SidePanel open onClose={onClose} header={header} footer={footer} width="max-w-[900px]">
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
              ? 'נמצאה התאמה גם לאדם וגם לארגון — נדרשת הכרעה מפורשת לפני העדכון.'
              : 'לרשומה זו אין רשומה קיימת לעדכן. השתמשי במסלול היצירה המתאים.'}
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

          {/* אין מה להחליט — מצב מינימלי. אין טעם להציג טבלה של שדות
              זהים ורשימת שדות ריקים כשאין שום פעולה נדרשת (INC-3125). */}
          {shownFields.length === 0 ? (
            <div className="rounded-[16px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-6 text-center text-[13px] text-[#166534]">
              אין שינוי מול ה{entityLabel} הקיים — אין מה להחליט.
              {suppressed.length > 0 && (
                <div className="mt-1 text-[12px] text-[#4D7C5F]">
                  {suppressed.length} פערים הוכרעו על ידך בעבר ואינם מוצגים שוב.
                </div>
              )}
            </div>
          ) : (
            <>
              {/* אותה טבלה בדיוק של מסך מיזוג הרשומות: שדה · קיים · הגיע ·
                  תוצאה סופית, ובחירה בלחיצה על הערך עצמו. */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-right text-[13px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr className="border-b border-slate-200">
                      <th className="w-[130px] px-4 py-3 text-[12px] font-semibold text-slate-500">שדה</th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-slate-500">קיים במערכת</th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-slate-500">
                        הגיע מ{source?.short ?? 'המקור'}
                      </th>
                      <th className="bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-700">
                        תוצאה סופית
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shownFields.map((cmp) => (
                      <FieldComparisonRow
                        key={cmp.key}
                        comparison={cmp}
                        sourceLabel={source?.short ?? 'המקור'}
                        choice={activeChoices[cmp.key] ?? 'skip'}
                        onChoiceChange={(c) => setChoice(cmp.key, c)}
                        manualValue={manualValues[cmp.key]}
                        onManualValueChange={(v) => setManualValues((m) => ({ ...m, [cmp.key]: v }))}
                        needsDecision={blocking.some((b) => b.key === cmp.key)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* §17 — הכרעות אוטומטיות אינן נשאלות, אבל גם אינן מוסתרות */}
              {autoDecided.length > 0 && (
                <div className="mt-3 rounded-[10px] border border-[#99D6D6] bg-[#E6F3F3] px-4 py-2 text-[12px] text-[#00696B]">
                  {autoDecided.length === 1 ? 'שדה אחד הוכרע' : `${autoDecided.length} שדות הוכרעו`} אוטומטית
                  לפי חוק עסקי — מידע ספציפי גובר על ערך כללי:{' '}
                  {autoDecided.map((c) => c.label).join(' · ')}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {sameFields.length > 0 ? (
                  <label className="flex items-center gap-2 text-[12px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={showSame}
                      onChange={(e) => setShowSame(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#008080]"
                    />
                    הצג גם {sameFields.length} שדות זהים
                  </label>
                ) : (
                  <span />
                )}
                {suppressed.length > 0 && (
                  <span className="text-[12px] text-slate-400">
                    {suppressed.length} פערים הוכרעו על ידך בעבר
                  </span>
                )}
              </div>
            </>
          )}

          {/* כל מה שאינו נדרש להחלטה יורד לכאן, סגור כברירת מחדל. */}
          <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] transition hover:text-[#6B6B6B]"
            >
              {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              פרטים טכניים
            </button>
            {showRaw && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <AdminPanelField label="מקור הרשומה" mode="view" viewValue={source?.full} />
                  <AdminPanelField label={`מזוהה מול ${entityLabel}`} mode="view" viewValue={`#${targetId}`} />
                  {/* שדות Google מוצגים רק כשהרשומה אכן הגיעה משם (INC-3124) */}
                  {google?.accountKey && (
                    <AdminPanelField label="חשבון Google" mode="view" viewValue={google.accountKey} />
                  )}
                  {google?.resourceName && (
                    <AdminPanelField
                      label="מזהה הרשומה בגוגל"
                      mode="view"
                      fullWidth
                      viewValue={<span className="break-all" dir="ltr">{google.resourceName}</span>}
                    />
                  )}
                  {google?.payloadHash && (
                    <AdminPanelField
                      label="חתימת המידע"
                      mode="view"
                      fullWidth
                      viewValue={<span className="break-all" dir="ltr">{google.payloadHash}</span>}
                    />
                  )}
                  {google?.etag && (
                    <AdminPanelField
                      label="גרסת הרשומה בגוגל"
                      mode="view"
                      fullWidth
                      viewValue={<span className="break-all" dir="ltr">{google.etag}</span>}
                    />
                  )}
                </div>
                <pre
                  className="max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[10px] leading-relaxed text-[#6B6B6B]"
                  dir="ltr"
                >
                  {JSON.stringify({ raw_payload: row.raw_payload, parsed_payload: row.parsed_payload }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </SidePanel>
  )
}
