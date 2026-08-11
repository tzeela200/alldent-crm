/**
 * שלב 9 של INC-3119: עריכה ברמת שורה — כתיבה ל-employment_intake בלבד.
 * אין כאן שום כתיבה לליבה (contact/accounts) — זו שלב 11, אחרי אישור נפרד.
 * כל שינוי נרשם גם ב-manual_override כדי שנדע אילו שדות נגעה בהם המשתמשת,
 * מבלי לגעת ב-original_text (§3.5).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ContentType, MatchType } from '@/types/employment-intake'
import { errorGeneric } from '@/lib/employment-intake/labels'

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
  id: number
  patch: EmploymentIntakeRowPatch
  currentOverride: Record<string, unknown>
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
  return useMutation({
    mutationFn: async ({ id, patch, currentOverride }: UpdateArgs) => {
      const manual_override = mergeManualOverride(currentOverride, patch)
      const { error } = await supabase
        .from('employment_intake')
        .update({ ...patch, manual_override, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employment-intake-rows'] })
      qc.invalidateQueries({ queryKey: ['employment-intake-summary'] })
      toast.success('השורה עודכנה בהצלחה.')
    },
    onError: () => {
      toast.error(errorGeneric('עדכון שורת הקליטה'))
    },
  })
}
