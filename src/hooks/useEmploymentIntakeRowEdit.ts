/**
 * שלב 9 של INC-3119: עריכה ברמת שורה — כתיבה ל-employment_intake בלבד.
 * אין כאן שום כתיבה לליבה (contact/accounts) — זו שלב 11, אחרי אישור נפרד.
 * כל שינוי נרשם גם ב-manual_override כדי שנדע אילו שדות נגעה בהם המשתמשת,
 * מבלי לגעת ב-original_text (§3.5).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ContentType, MatchType } from '@/types/employment-intake'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'
import { supabaseError, describeError } from '@/lib/employment-intake/errors'

export interface EmploymentIntakeRowPatch {
  contact_name?: string | null
  org_name?: string | null
  phone?: string | null
  phone_norm?: string | null
  second_phone?: string | null
  second_phone_norm?: string | null
  email?: string | null
  second_email?: string | null
  facebook_id?: string | null
  facebook_url?: string | null
  facebook_name?: string | null
  role_id?: number | null
  role_raw?: string | null
  sub_role_ids?: number[]
  city_id?: number | null
  city_raw?: string | null
  region_id?: number | null
  content_type?: ContentType
  proposed_social_status?: number | null
  match_contact?: number | null
  match_account?: number | null
  match_field?: string | null
  match_type?: MatchType
}

interface UpdateArgs {
  row: RowWithAction
  patch: EmploymentIntakeRowPatch
}

/** ממזג את השדות שנערכו ידנית לתוך manual_override, בלי לגעת ב-original_text. */
function mergeManualOverride(current: Record<string, unknown>, patch: EmploymentIntakeRowPatch) {
  const fields = { ...(current.fields as Record<string, string> | undefined) }
  const now = new Date().toISOString()
  for (const key of Object.keys(patch)) fields[key] = now
  return { ...current, fields }
}

export function useUpdateEmploymentIntakeRow() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ row, patch }: UpdateArgs) => {
      const currentOverride = row.manual_override ?? {}
      const manual_override = mergeManualOverride(currentOverride, patch)
      const before = Object.fromEntries(Object.keys(patch).map((key) => [key, (row as unknown as Record<string, unknown>)[key] ?? null]))
      const performedAt = new Date().toISOString()

      const { error } = await supabase
        .from('employment_intake')
        .update({ ...patch, manual_override, updated_at: performedAt })
        .eq('id', row.id)
      if (error) throw supabaseError('עדכון הרשומה נכשל', error)

      const anchorKey = row.match_contact != null
        ? `c:${row.match_contact}`
        : row.match_account != null
          ? `a:${row.match_account}`
          : row.identity_group_id
            ? `g:${row.identity_group_id}`
            : `i:${row.id}`

      const { data: action, error: actionError } = await supabase
        .from('employment_intake_action')
        .insert({
          anchor_key: anchorKey,
          identity_group_id: row.identity_group_id,
          contact_id: row.match_contact,
          account_id: row.match_account,
          action_type: 'manual_override',
          performed_by: user?.email ?? 'system',
          result: 'done',
          source_intake_ids: [row.id],
          occurrence_count: 1,
          applied_before: before,
          applied_patch: patch,
          bulk_run_id: crypto.randomUUID(),
        })
        .select('action_id')
        .single()

      if (actionError) {
        // staging בלבד: אם ה-Audit לא נשמר, מנסים להחזיר את השורה למצב הקודם
        // כדי לא להשאיר תיקון ידני ללא עקבה.
        await supabase
          .from('employment_intake')
          .update({ ...before, manual_override: currentOverride, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        throw supabaseError('שמירת Audit לתיקון הידני נכשלה', actionError)
      }

      const { error: linkError } = await supabase
        .from('employment_intake')
        .update({ last_action_id: action.action_id, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (linkError) throw supabaseError('קישור Audit לרשומה נכשל', linkError)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employment-intake-rows'] })
      qc.invalidateQueries({ queryKey: ['employment-intake-summary'] })
      toast.success('הרשומה עודכנה בהצלחה.')
    },
    onError: (err: unknown) => {
      toast.error(describeError(err, 'עדכון הרשומה נכשל'))
    },
  })
}
