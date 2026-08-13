/**
 * שלב 12 של INC-3119: שלוש משפחות הפעולות הגורפות (§5.2).
 *
 * כלל ברזל (§4, §4.5): הביצוע מקבץ לפי **זהות ייחודית** לפני הכתיבה.
 * שמונה הופעות של אותו אדם = פעולה אחת, רשומת employment_intake_action
 * אחת עם source_intake_ids באורך 8 — לא שמונה פעולות.
 *
 * שלוש המשפחות:
 *   א. lead_status   — contact.social_status = 1/2/3
 *   ב. details_sent  — contact.social_status = 5/4/6 + last_contact_date
 *                      (+ accounts במסלול גיוס, באישור נפרד) — ראה שלב 13
 *   ג. update_field  — contact.role / city_id / source, מילוי שדות ריקים
 *                      בלבד כברירת מחדל
 *
 * bulk_run_id נוצר פעם אחת ב-Preview ונשמר גם ב-Retry, כך שההגנה במסד
 * (unique idempotency_key) חוסמת רישום כפול של אותה פעולה לאותה זהות.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useAccountMutations } from '@/hooks/useAccountMutations'
import { fetchActionsForIdentities } from '@/hooks/useEmploymentIntakeIdentity'
import { groupRowsByIdentity } from '@/lib/employment-intake/identity'
import { checkRepeat, buildAnchorKey } from '@/lib/employment-intake/repeatGuard'
import { DETAILS_SENT_STATUS as DETAILS_STATUS_MAP, ACCOUNT_STATUS_POTENTIAL } from '@/lib/employment-intake/detailsSent'
import type {
  ActionType,
  DetailsSentType,
  EmploymentIntakeAction,
  ResolvedIdentity,
} from '@/types/employment-intake'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'
import { supabaseError, describeError } from '@/lib/employment-intake/errors'

export type BulkFamily = 'lead_status' | 'details_sent' | 'update_field'

export { DETAILS_SENT_STATUS } from '@/lib/employment-intake/detailsSent'

export interface SharedFieldEdit {
  /** role / city_id / source — רק אלה מותרים בעריכה גורפת (§5.2 משפחה ג׳) */
  field: 'role' | 'city_id' | 'source'
  value: number | null
  /** דריסת ערך קיים — דורש סימון מפורש; ברירת המחדל היא מילוי ריקים בלבד */
  overwriteExisting: boolean
}

export interface BulkActionSpec {
  family: BulkFamily
  /** משפחה א׳ */
  leadStatusId?: number
  /** משפחה ב׳ */
  detailsSentType?: DetailsSentType
  /** משפחה ב׳ — עדכון גם את הארגון המקושר (account_status=1). באישור נפרד בלבד (§6.3) */
  alsoUpdateAccount?: boolean
  /** משפחה ג׳ */
  sharedField?: SharedFieldEdit
}

export type PlanStatus = 'will_run' | 'already_done' | 'blocked' | 'no_change'

export interface BulkIdentityPlan {
  key: string
  identity: ResolvedIdentity
  /** כל ההופעות של אותה זהות מתוך הבחירה */
  rows: RowWithAction[]
  status: PlanStatus
  /** למה נחסמה / דולגה — בעברית, מוצג ב-Preview ובדוח */
  reason: string | null
  lastAction: EmploymentIntakeAction | null
  /** ה-patch שיוחל בפועל על contact (נחשב מראש כדי שה-Preview יהיה אמיתי) */
  patch: Record<string, unknown>
  displayName: string
}

export interface BulkPreview {
  bulkRunId: string
  occurrences: number
  identities: number
  toUpdate: number
  alreadyHandled: number
  skipped: number
  blocked: number
  plans: BulkIdentityPlan[]
}

const CONTACT_CURRENT_FIELDS = 'contact_id, display_name, role, city_id, source, social_status'

interface ContactCurrent {
  contact_id: number
  display_name: string | null
  role: number | null
  city_id: number | null
  source: number | null
  social_status: number | null
}

const ACTION_TYPE_BY_FAMILY: Record<BulkFamily, ActionType> = {
  lead_status: 'mark_lead_status',
  details_sent: 'mark_details_sent',
  update_field: 'update_field',
}

/** שולף את השורות שנבחרו במלואן — הבחירה יכולה להשתרע על כמה עמודים. */
async function fetchRowsByIds(ids: number[]): Promise<RowWithAction[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('employment_intake')
    .select('*, last_action:employment_intake_action!last_action_id(result, performed_at, performed_by, action_type)')
    .in('id', ids)
    .is('deleted_at', null)
  if (error) throw supabaseError('טעינת השורות שנבחרו נכשלה', error)
  return (data ?? []) as unknown as RowWithAction[]
}

/**
 * §6.3 — פעולה אחת לכל זהות מקושרת ל**כל** ההופעות של אותה זהות
 * (`source_intake_ids` באורך N, ו-`last_action_id` על כל N השורות), גם אם
 * המשתמשת סימנה רק חלק מהן. בלי ההרחבה הזו, סימון הופעה אחת מתוך שמונה
 * היה מייצר פעולה שמכסה הופעה אחת בלבד, ושבע ההופעות האחרות היו נראות
 * "טרם טופלו" למרות שהזהות כבר טופלה.
 */
async function fetchRowsForIdentities(contactIds: number[], groupIds: string[]): Promise<RowWithAction[]> {
  const clauses: string[] = []
  if (contactIds.length) clauses.push(`canonical_contact_id.in.(${Array.from(new Set(contactIds)).join(',')})`)
  if (groupIds.length) clauses.push(`identity_group_id.in.(${Array.from(new Set(groupIds)).join(',')})`)
  if (clauses.length === 0) return []

  const { data, error } = await supabase
    .from('employment_intake')
    .select('*, last_action:employment_intake_action!last_action_id(result, performed_at, performed_by, action_type)')
    .or(clauses.join(','))
    .is('deleted_at', null)
  if (error) throw supabaseError('טעינת הופעות הזהות נכשלה', error)
  return (data ?? []) as unknown as RowWithAction[]
}

async function fetchContactsCurrent(contactIds: number[]): Promise<Map<number, ContactCurrent>> {
  if (contactIds.length === 0) return new Map()
  const { data, error } = await supabase.from('contact').select(CONTACT_CURRENT_FIELDS).in('contact_id', contactIds)
  if (error) throw supabaseError('טעינת אנשי הקשר נכשלה', error)
  return new Map((data ?? []).map((c) => [(c as unknown as ContactCurrent).contact_id, c as unknown as ContactCurrent]))
}

function isEmptyValue(v: unknown): boolean {
  return v == null || v === ''
}

/**
 * בונה את תוכנית הביצוע לפי זהות. אינו כותב דבר — זהו בדיוק מה שמוצג
 * ב-Preview, וגם בדיוק מה שירוץ באישור (§4.5: "הביצוע מקבץ לפי זהות
 * לפני הכתיבה").
 */
export async function buildBulkPreview(selectedIds: number[], spec: BulkActionSpec): Promise<BulkPreview> {
  const bulkRunId = crypto.randomUUID()
  const rows = await fetchRowsByIds(selectedIds)

  const { groups, unidentified } = groupRowsByIdentity(rows)

  const plans: BulkIdentityPlan[] = []

  // הופעות ללא זהות — כל אחת מוצגת כחסומה בנפרד, עם הסיבה
  for (const row of unidentified) {
    plans.push({
      key: `x:${row.id}`,
      identity: { key: `x:${row.id}`, contactId: null, identityGroupId: null },
      rows: [row],
      status: 'blocked',
      reason: row.identity_conflict
        ? 'זהות בסתירה — ההופעה מגשרת בין שני אנשי קשר שונים. נדרשת בדיקה ידנית.'
        : 'לא נמצא בהופעה אף מזהה (טלפון, מייל או Facebook) ולכן אין לה זהות.',
      lastAction: null,
      patch: {},
      displayName: row.contact_name ?? row.sender_name ?? `הודעה #${row.id}`,
    })
  }

  const identityList = Array.from(groups.values())
  const contactIds = identityList.map((g) => g.identity.contactId).filter((v): v is number => v != null)
  const groupIds = identityList.map((g) => g.identity.identityGroupId).filter((v): v is string => v != null)

  const [actions, contactsCurrent, allIdentityRows] = await Promise.all([
    fetchActionsForIdentities(contactIds, groupIds),
    fetchContactsCurrent(contactIds),
    fetchRowsForIdentities(contactIds, groupIds),
  ])

  // הרחבת כל זהות לכל ההופעות שלה (§6.3), כולל הופעות מאצוות קודמות
  // שלא נבחרו במסך. שאילתה מקובצת אחת — לא לכל זהות בנפרד.
  const expanded = groupRowsByIdentity(allIdentityRows).groups
  const occurrencesByIdentity = new Map<string, RowWithAction[]>()
  for (const { identity, rows: identityRows } of identityList) {
    const fromDb = expanded.get(identity.key)?.rows ?? []
    const byId = new Map<number, RowWithAction>()
    for (const r of [...identityRows, ...fromDb]) byId.set(r.id, r)
    occurrencesByIdentity.set(identity.key, Array.from(byId.values()).sort((a, b) => a.id - b.id))
  }

  const actionType = ACTION_TYPE_BY_FAMILY[spec.family]

  for (const { identity, rows: selectedRows } of identityList) {
    const identityRows = occurrencesByIdentity.get(identity.key) ?? selectedRows
    const first = identityRows[0]
    const displayName =
      contactsCurrent.get(identity.contactId ?? -1)?.display_name ?? first.contact_name ?? first.sender_name ?? `זהות ${identity.key}`

    const base = { key: identity.key, identity, rows: identityRows, lastAction: null as EmploymentIntakeAction | null, displayName }

    // (1) חסימות זהות (§4.4) — התאמה לא ודאית מוחרגת מכל פעולה גורפת
    if (identityRows.some((r) => r.match_type === 'ambiguous')) {
      plans.push({ ...base, status: 'blocked', reason: 'נמצאו כמה התאמות אפשריות — יש להכריע ידנית.', patch: {} })
      continue
    }

    // (2) שלוש המשפחות כותבות ל-contact ולכן דורשות איש קשר קיים
    if (identity.contactId == null) {
      plans.push({
        ...base,
        status: 'blocked',
        reason: 'אין איש קשר קיים לזהות זו — יש ליצור איש קשר לפני הפעולה.',
        patch: {},
      })
      continue
    }

    // (3) סיווגים שאינם נכללים אוטומטית (§5.2 כלל 4, §5.3)
    if (spec.family !== 'update_field') {
      const excluded = identityRows.every((r) => r.content_type === 'unclear' || r.content_type === 'unclassified')
      if (excluded) {
        plans.push({ ...base, status: 'blocked', reason: 'הסיווג "לא ברור" — אינו נכלל בפעולה גורפת.', patch: {} })
        continue
      }
      if (identityRows.every((r) => r.content_type === 'irrelevant')) {
        plans.push({ ...base, status: 'blocked', reason: 'סומן כלא רלוונטי — אינו נכלל בפעולה גורפת.', patch: {} })
        continue
      }
    }

    // (4) מניעת פעולה חוזרת (§5.4) — לפי הזהות, משני העוגנים
    const repeat = checkRepeat(actions, identity, actionType, spec.family === 'details_sent' ? (spec.detailsSentType ?? null) : null)
    if (repeat.alreadyDone) {
      plans.push({
        ...base,
        status: 'already_done',
        reason: `כבר טופלה — בוצעה ב-${new Date(repeat.lastAction!.performed_at).toLocaleDateString('he-IL')} על ידי ${repeat.lastAction!.performed_by}.`,
        lastAction: repeat.lastAction,
        patch: {},
      })
      continue
    }

    // (5) בניית ה-patch בפועל
    const current = contactsCurrent.get(identity.contactId)
    let patch: Record<string, unknown> = {}

    if (spec.family === 'lead_status') {
      if (spec.leadStatusId == null) {
        plans.push({ ...base, status: 'blocked', reason: 'לא נבחר סטטוס ליד.', patch: {} })
        continue
      }
      patch = { social_status: spec.leadStatusId }
    } else if (spec.family === 'details_sent') {
      if (!spec.detailsSentType) {
        plans.push({ ...base, status: 'blocked', reason: 'לא נבחר סוג פרטים שנשלחו.', patch: {} })
        continue
      }
      patch = { social_status: DETAILS_STATUS_MAP[spec.detailsSentType], last_contact_date: new Date().toISOString() }
    } else {
      const edit = spec.sharedField
      if (!edit || edit.value == null) {
        plans.push({ ...base, status: 'blocked', reason: 'לא נבחר ערך לעדכון.', patch: {} })
        continue
      }
      const currentValue = current ? (current[edit.field] as unknown) : null
      // ברירת המחדל: מילוי שדות ריקים בלבד (§5.2 כלל 3)
      if (!isEmptyValue(currentValue) && !edit.overwriteExisting) {
        plans.push({
          ...base,
          status: 'no_change',
          reason: 'קיים כבר ערך בשדה — לא יידרס (דריסה דורשת סימון מפורש).',
          patch: {},
        })
        continue
      }
      if (currentValue === edit.value) {
        plans.push({ ...base, status: 'no_change', reason: 'הערך הקיים כבר זהה לערך המבוקש.', patch: {} })
        continue
      }
      patch = { [edit.field]: edit.value }
    }

    plans.push({ ...base, status: 'will_run', reason: null, patch })
  }

  return {
    bulkRunId,
    occurrences: rows.length,
    identities: identityList.length,
    toUpdate: plans.filter((p) => p.status === 'will_run').length,
    alreadyHandled: plans.filter((p) => p.status === 'already_done').length,
    skipped: plans.filter((p) => p.status === 'no_change').length,
    blocked: plans.filter((p) => p.status === 'blocked').length,
    plans,
  }
}

export interface BulkRunItemResult {
  key: string
  displayName: string
  outcome: 'succeeded' | 'skipped' | 'blocked' | 'failed'
  reason: string | null
  occurrences: number
}

export interface BulkRunReport {
  succeeded: number
  skipped: number
  blocked: number
  failed: number
  items: BulkRunItemResult[]
}

/**
 * מבצע את התוכנית. כשל בזהות אחת אינו עוצר את השאר (§5.2 כלל 5),
 * וכל זהות מקבלת שורת דוח משלה עם סיבה (§12.6).
 */
export function useRunBulkAction() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateContact } = useContactMutations()
  const { updateAccount } = useAccountMutations()

  return useMutation({
    mutationFn: async ({ preview, spec }: { preview: BulkPreview; spec: BulkActionSpec }): Promise<BulkRunReport> => {
      const performedBy = user?.email ?? 'system'
      const actionType = ACTION_TYPE_BY_FAMILY[spec.family]
      const items: BulkRunItemResult[] = []

      for (const plan of preview.plans) {
        if (plan.status !== 'will_run') {
          items.push({
            key: plan.key,
            displayName: plan.displayName,
            outcome: plan.status === 'blocked' ? 'blocked' : 'skipped',
            reason: plan.reason,
            occurrences: plan.rows.length,
          })
          continue
        }

        try {
          const contactId = plan.identity.contactId!
          const { error: contactError } = await updateContact(contactId, plan.patch)
          if (contactError) throw supabaseError('עדכון איש הקשר נכשל', contactError)

          // מסלול גיוס עם ארגון מקושר — רק כשסומן במפורש (§6.3)
          if (spec.family === 'details_sent' && spec.detailsSentType === 'recruiting' && spec.alsoUpdateAccount) {
            const accountId = plan.rows.find((r) => r.match_account != null)?.match_account ?? null
            if (accountId != null) {
              const { error: accountError } = await updateAccount(accountId, {
                last_contact_date: new Date().toISOString(),
                account_status: ACCOUNT_STATUS_POTENTIAL, // פוטנציאלי – לטיפול. לעולם לא 7 (§10)
              })
              if (accountError) throw supabaseError('עדכון הארגון נכשל', accountError)
            }
          }

          const sourceIntakeIds = plan.rows.map((r) => r.id)
          const { data: inserted, error: actionError } = await supabase
            .from('employment_intake_action')
            .upsert(
              {
                anchor_key: buildAnchorKey(plan.identity),
                identity_group_id: plan.identity.identityGroupId,
                contact_id: contactId,
                account_id:
                  spec.family === 'details_sent' && spec.alsoUpdateAccount
                    ? (plan.rows.find((r) => r.match_account != null)?.match_account ?? null)
                    : null,
                action_type: actionType,
                details_sent_type: spec.family === 'details_sent' ? (spec.detailsSentType ?? null) : null,
                performed_by: performedBy,
                result: 'done',
                source_intake_ids: sourceIntakeIds,
                occurrence_count: sourceIntakeIds.length,
                applied_patch: plan.patch,
                bulk_run_id: preview.bulkRunId,
              },
              { onConflict: 'idempotency_key', ignoreDuplicates: true },
            )
            .select('action_id')
          if (actionError) throw supabaseError('רישום הפעולה נכשל', actionError)

          // Retry עם אותו bulk_run_id: ה-UNIQUE בלע את הרישום הכפול ואין
          // action_id חדש — הכתיבה לליבה כבר בוצעה, אין מה לקשר מחדש.
          const actionId = (inserted ?? [])[0]?.action_id as number | undefined
          if (actionId != null) {
            const { error: linkError } = await supabase
              .from('employment_intake')
              .update({ last_action_id: actionId, updated_at: new Date().toISOString() })
              .in('id', sourceIntakeIds)
            if (linkError) throw supabaseError('קישור הפעולה להופעות נכשל', linkError)
          }

          items.push({
            key: plan.key,
            displayName: plan.displayName,
            outcome: 'succeeded',
            reason: null,
            occurrences: plan.rows.length,
          })
        } catch (err) {
          items.push({
            key: plan.key,
            displayName: plan.displayName,
            outcome: 'failed',
            reason: describeError(err, `הפעולה עבור ${plan.displayName} נכשלה`),
            occurrences: plan.rows.length,
          })
        }
      }

      return {
        succeeded: items.filter((i) => i.outcome === 'succeeded').length,
        skipped: items.filter((i) => i.outcome === 'skipped').length,
        blocked: items.filter((i) => i.outcome === 'blocked').length,
        failed: items.filter((i) => i.outcome === 'failed').length,
        items,
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employment-intake-rows'] })
      qc.invalidateQueries({ queryKey: ['employment-intake-summary'] })
      qc.invalidateQueries({ queryKey: ['employment-intake-action-history'] })
    },
  })
}
