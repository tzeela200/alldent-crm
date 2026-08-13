/**
 * שלב 11 של INC-3119: כתיבה לליבה — הנתיב היחיד מהמסך הזה אל contact/accounts.
 * כל פונקציה כאן היא ✋ כתיבה בפועל, ולכן:
 *   - נקראת רק מתוך דיאלוג אישור מפורש בממשק ("אני מאשרת...")
 *   - כותבת דרך useContactMutations/useAccountMutations הקיימים — לא supabase.from ישיר
 *   - רושמת שורת employment_intake_action אחת ומקשרת אותה חזרה ל-employment_intake.last_action_id
 *   - לאחר יצירת Contact/Account: מריצה מחדש resolve_employment_identity כדי להפיץ
 *     canonical_contact_id/match_* לכל הופעות אותה זהות, כולל אצוות קודמות
 *
 * שדה proposed_social_status וההצעה המחושבת (§10, proposals.ts) מגיעים תמיד
 * מהשורה כפי שהיא מוצגת — הפונקציות כאן רק מבצעות את מה שכבר אושר.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useAccountMutations } from '@/hooks/useAccountMutations'
import { resolveEmploymentIdentity } from '@/hooks/useEmploymentIntakeIdentity'
import { fetchActionsForIdentities } from '@/hooks/useEmploymentIntakeIdentity'
import { resolveRowIdentity } from '@/lib/employment-intake/identity'
import { checkRepeat, buildAnchorKey } from '@/lib/employment-intake/repeatGuard'
import { contactSourceForIntakeSourceType } from '@/lib/employment-intake/contactSource'
import { successContactCreated, successAccountCreated, successStatusUpdated, successMergeNoOverwrite } from '@/lib/employment-intake/labels'
import type { ActionType, DetailsSentType } from '@/types/employment-intake'
import type { ContactCompareData, AccountCompareData } from '@/lib/employment-intake/mergeCompare'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'
import { supabaseError, describeError } from '@/lib/employment-intake/errors'

function invalidateIntake(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['employment-intake-rows'] })
  qc.invalidateQueries({ queryKey: ['employment-intake-summary'] })
  qc.invalidateQueries({ queryKey: ['employment-intake-action-history'] })
  qc.invalidateQueries({ queryKey: ['employment-intake-identity-occurrences'] })
}

async function insertIntakeAction(args: {
  anchorKey: string
  identityGroupId: string | null
  contactId: number | null
  accountId?: number | null
  actionType: ActionType
  detailsSentType?: DetailsSentType | null
  performedBy: string
  sourceIntakeIds: number[]
  appliedPatch?: Record<string, unknown> | null
  appliedBefore?: Record<string, unknown> | null
}): Promise<number> {
  const { data, error } = await supabase
    .from('employment_intake_action')
    .insert({
      anchor_key: args.anchorKey,
      identity_group_id: args.identityGroupId,
      contact_id: args.contactId,
      account_id: args.accountId ?? null,
      action_type: args.actionType,
      details_sent_type: args.detailsSentType ?? null,
      performed_by: args.performedBy,
      result: 'done',
      source_intake_ids: args.sourceIntakeIds,
      occurrence_count: args.sourceIntakeIds.length,
      applied_patch: args.appliedPatch ?? null,
      applied_before: args.appliedBefore ?? null,
      bulk_run_id: crypto.randomUUID(),
    })
    .select('action_id')
    .single()
  if (error) throw supabaseError('רישום הפעולה נכשל', error)
  return data.action_id as number
}

async function linkActionToIntakeRow(rowId: number, actionId: number, extra: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from('employment_intake')
    .update({ last_action_id: actionId, updated_at: new Date().toISOString(), ...extra })
    .eq('id', rowId)
  if (error) throw supabaseError('קישור הפעולה להודעה נכשל', error)
}

async function fetchContactBefore(contactId: number, fields: string[]): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('contact')
    .select(fields.join(','))
    .eq('contact_id', contactId)
    .single()
  if (error) throw supabaseError('טעינת מצב איש הקשר לפני העדכון נכשלה', error)
  const record = data as unknown as Record<string, unknown>
  return Object.fromEntries(fields.map((field) => [field, record[field] ?? null]))
}

// ── יצירת Contact חדש (§3.5 פעולה 7) ────────────────────────────────────
export interface CreateContactInput {
  displayName: string
  phone: string | null
  secondPhone: string | null
  email: string | null
  secondEmail: string | null
  facebookId: string | null
  facebookUrl: string | null
  facebookName: string | null
  roleId: number | null
  cityId: number | null
  includeWorkStatus: boolean
}

export function useCreateContactFromIntake() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { insertContact } = useContactMutations()

  return useMutation({
    mutationFn: async ({ row, input, sourceTypeName }: { row: RowWithAction; input: CreateContactInput; sourceTypeName: string | null }) => {
      const payload: Record<string, unknown> = {
        display_name: input.displayName,
        phone: input.phone || null,
        second_phone: input.secondPhone || null,
        email: input.email || null,
        second_email: input.secondEmail || null,
        facebook_id: input.facebookId || null,
        facebook_url: input.facebookUrl || null,
        facebook_name: input.facebookName || null,
        role: input.roleId,
        city_id: input.cityId,
        source: contactSourceForIntakeSourceType(sourceTypeName),
        social_status: row.proposed_social_status,
        ...(input.includeWorkStatus ? { work_status: 1 } : {}),
      }

      const { data, error } = await insertContact(payload)
      if (error) throw supabaseError('יצירת איש הקשר נכשלה', error)
      const contactId = data!.contact_id as number

      const actionId = await insertIntakeAction({
        anchorKey: `c:${contactId}`,
        identityGroupId: row.identity_group_id,
        contactId,
        actionType: 'create_contact',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: payload,
      })
      await linkActionToIntakeRow(row.id, actionId, { match_contact: contactId, match_type: 'exact', match_field: 'created' })
      await resolveEmploymentIdentity(row.import_id)
      return contactId
    },
    onSuccess: () => {
      invalidateIntake(qc)
      toast.success(successContactCreated())
    },
    onError: (err: unknown) => toast.error(describeError(err, 'יצירת איש קשר')),
  })
}

// ── יצירת Account חדש (§3.5 פעולה 8) ────────────────────────────────────
export interface CreateAccountInput {
  accountName: string
  phone: string | null
  email: string | null
  facebookUrl: string | null
  cityId: number | null
}

export function useCreateAccountFromIntake() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { insertAccount } = useAccountMutations()

  return useMutation({
    mutationFn: async ({ row, input }: { row: RowWithAction; input: CreateAccountInput }) => {
      const payload: Record<string, unknown> = {
        account_name: input.accountName,
        phone: input.phone || null,
        email: input.email || null,
        facebook_url: input.facebookUrl || null,
        city_id: input.cityId,
        account_status: 1,
      }

      const { data, error } = await insertAccount(payload)
      if (error) throw supabaseError('יצירת הארגון נכשלה', error)
      const accountId = data!.account_id as number

      const actionId = await insertIntakeAction({
        anchorKey: `a:${accountId}`,
        identityGroupId: row.identity_group_id,
        contactId: null,
        accountId,
        actionType: 'create_account',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: payload,
      })
      await linkActionToIntakeRow(row.id, actionId, { match_account: accountId, match_type: 'exact', match_field: 'created' })
      return accountId
    },
    onSuccess: () => {
      invalidateIntake(qc)
      toast.success(successAccountCreated())
    },
    onError: (err: unknown) => toast.error(describeError(err, 'יצירת ארגון')),
  })
}

// ── קישור Contact לארגון (§5.1) ─────────────────────────────────────────
export function useLinkContactToAccount() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateContact } = useContactMutations()

  return useMutation({
    mutationFn: async ({ row, contactId, accountId }: { row: RowWithAction; contactId: number; accountId: number }) => {
      const before = await fetchContactBefore(contactId, ['account_link'])
      const { error } = await updateContact(contactId, { account_link: accountId })
      if (error) throw supabaseError('קישור האדם לארגון נכשל', error)

      const actionId = await insertIntakeAction({
        anchorKey: `c:${contactId}`,
        identityGroupId: row.identity_group_id,
        contactId,
        accountId,
        actionType: 'link_contact_account',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: { account_link: accountId },
        appliedBefore: before,
      })
      await linkActionToIntakeRow(row.id, actionId)
    },
    onSuccess: () => {
      invalidateIntake(qc)
      toast.success('האדם קושר לארגון בהצלחה.')
    },
    onError: (err: unknown) => toast.error(describeError(err, 'קישור לארגון')),
  })
}

// ── עדכון סטטוס ליד (§5.1, §5.4 repeatGuard) ────────────────────────────
export interface MarkLeadStatusResult {
  written: boolean
  alreadyDone: boolean
  lastActionAt: string | null
  lastActionBy: string | null
}

export function useMarkLeadStatus() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateContact } = useContactMutations()

  return useMutation({
    mutationFn: async ({
      row,
      statusId,
      statusLabel,
      includeWorkStatus,
      force,
    }: {
      row: RowWithAction
      statusId: number
      statusLabel: string
      includeWorkStatus: boolean
      force?: boolean
    }): Promise<MarkLeadStatusResult> => {
      const identity = resolveRowIdentity(row)
      if (!identity || identity.contactId == null) throw new Error('לא ניתן לעדכן סטטוס ללא איש קשר קיים.')

      if (!force) {
        const actions = await fetchActionsForIdentities([identity.contactId], identity.identityGroupId ? [identity.identityGroupId] : [])
        const check = checkRepeat(actions, identity, 'mark_lead_status', null)
        if (check.alreadyDone) {
          return {
            written: false,
            alreadyDone: true,
            lastActionAt: check.lastAction?.performed_at ?? null,
            lastActionBy: check.lastAction?.performed_by ?? null,
          }
        }
      }

      const patch: Record<string, unknown> = { social_status: statusId, ...(includeWorkStatus ? { work_status: 1 } : {}) }
      const before = await fetchContactBefore(identity.contactId, includeWorkStatus ? ['social_status', 'work_status'] : ['social_status'])
      const { error } = await updateContact(identity.contactId, patch)
      if (error) throw supabaseError('עדכון סטטוס הליד נכשל', error)

      const actionId = await insertIntakeAction({
        anchorKey: buildAnchorKey(identity),
        identityGroupId: identity.identityGroupId,
        contactId: identity.contactId,
        actionType: 'mark_lead_status',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: patch,
        appliedBefore: before,
      })
      await linkActionToIntakeRow(row.id, actionId)
      return { written: true, alreadyDone: false, lastActionAt: null, lastActionBy: null }
    },
    onSuccess: (result, vars) => {
      invalidateIntake(qc)
      if (result.written) toast.success(successStatusUpdated(vars.statusLabel))
    },
    onError: (err: unknown) => toast.error(describeError(err, 'עדכון סטטוס ליד')),
  })
}

// ── סימון לא רלוונטי (§5.1, §5.3) — רק כשיש התאמה; אחרת אין כתיבה כלל ──
export function useMarkIrrelevant() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateContact } = useContactMutations()

  return useMutation({
    mutationFn: async ({ row }: { row: RowWithAction }) => {
      const identity = resolveRowIdentity(row)
      if (!identity || identity.contactId == null) {
        return { written: false }
      }

      const before = await fetchContactBefore(identity.contactId, ['social_status'])
      const { error } = await updateContact(identity.contactId, { social_status: 12 })
      if (error) throw supabaseError('סימון "לא רלוונטי" נכשל', error)

      const actionId = await insertIntakeAction({
        anchorKey: buildAnchorKey(identity),
        identityGroupId: identity.identityGroupId,
        contactId: identity.contactId,
        actionType: 'mark_irrelevant',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: { social_status: 12 },
        appliedBefore: before,
      })
      await linkActionToIntakeRow(row.id, actionId)
      return { written: true }
    },
    onSuccess: (result) => {
      invalidateIntake(qc)
      toast.success(result.written ? 'הרשומה סומנה כלא רלוונטית.' : 'לא נדרשת פעולה — אין רשומה קיימת לסמן.')
    },
    onError: (err: unknown) => toast.error(describeError(err, 'סימון לא רלוונטי')),
  })
}

// ── מיזוג מידע חדש לרשומה קיימת (§3.5 פעולה 10) — פר-שדה, ללא דריסה שקטה ──
const CONTACT_COMPARE_FIELDS = 'display_name, phone, second_phone, email, second_email, facebook_id, facebook_url, facebook_name, role, city_id'
const ACCOUNT_COMPARE_FIELDS = 'account_name, phone, email, facebook_url, city_id'

export function useContactCompareData(contactId: number | null) {
  return useQuery({
    queryKey: ['employment-intake-contact-compare', contactId],
    enabled: contactId != null,
    queryFn: async (): Promise<ContactCompareData> => {
      const { data, error } = await supabase.from('contact').select(CONTACT_COMPARE_FIELDS).eq('contact_id', contactId!).single()
      if (error) throw supabaseError('טעינת נתוני איש הקשר נכשלה', error)
      return data as unknown as ContactCompareData
    },
  })
}

export function useAccountCompareData(accountId: number | null) {
  return useQuery({
    queryKey: ['employment-intake-account-compare', accountId],
    enabled: accountId != null,
    queryFn: async (): Promise<AccountCompareData> => {
      const { data, error } = await supabase.from('accounts').select(ACCOUNT_COMPARE_FIELDS).eq('account_id', accountId!).single()
      if (error) throw supabaseError('טעינת נתוני הארגון נכשלה', error)
      return data as unknown as AccountCompareData
    },
  })
}

export function useMergeContactFields() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateContact } = useContactMutations()

  return useMutation({
    mutationFn: async ({ row, contactId, patch, before }: { row: RowWithAction; contactId: number; patch: Record<string, unknown>; before?: Record<string, unknown> }) => {
      const { error } = await updateContact(contactId, patch)
      if (error) throw supabaseError('מיזוג המידע לאיש הקשר נכשל', error)

      const identity = resolveRowIdentity(row)
      const actionId = await insertIntakeAction({
        anchorKey: `c:${contactId}`,
        identityGroupId: identity?.identityGroupId ?? null,
        contactId,
        actionType: 'merge_contact',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: patch,
        appliedBefore: before ?? null,
      })
      await linkActionToIntakeRow(row.id, actionId)
    },
    onSuccess: () => {
      invalidateIntake(qc)
      toast.success(successMergeNoOverwrite())
    },
    onError: (err: unknown) => toast.error(describeError(err, 'מיזוג מידע לאיש קשר')),
  })
}

export function useMergeAccountFields() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { updateAccount } = useAccountMutations()

  return useMutation({
    mutationFn: async ({ row, accountId, patch, before }: { row: RowWithAction; accountId: number; patch: Record<string, unknown>; before?: Record<string, unknown> }) => {
      const { error } = await updateAccount(accountId, patch)
      if (error) throw supabaseError('מיזוג המידע לארגון נכשל', error)

      const identity = resolveRowIdentity(row)
      const actionId = await insertIntakeAction({
        anchorKey: `a:${accountId}`,
        identityGroupId: identity?.identityGroupId ?? null,
        contactId: null,
        accountId,
        actionType: 'merge_account',
        performedBy: user?.email ?? 'system',
        sourceIntakeIds: [row.id],
        appliedPatch: patch,
        appliedBefore: before ?? null,
      })
      await linkActionToIntakeRow(row.id, actionId)
    },
    onSuccess: () => {
      invalidateIntake(qc)
      toast.success(successMergeNoOverwrite())
    },
    onError: (err: unknown) => toast.error(describeError(err, 'מיזוג מידע לארגון')),
  })
}
