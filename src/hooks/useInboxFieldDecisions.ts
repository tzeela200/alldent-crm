/**
 * זיכרון החלטות שדה (INC-3123) — גישת Supabase.
 *
 * שתי אחריויות:
 *  1. שליפת ההחלטות שכבר אושרו לרשומה, כדי לדכא קונפליקט חוזר.
 *  2. **כתיבה עקבית אחת** של אישור המיזוג.
 *
 * לגבי (2): עד היום האישור היה שלוש קריאות נפרדות מהדפדפן — עדכון
 * הליבה, עדכון סטטוס, ורישום audit. הוספת שמירת החלטה כקריאה רביעית
 * הייתה מגדילה את הסיכון שהרשומה תתעדכן אך ההחלטה לא תישמר, ואז אותו
 * קונפליקט חוזר. `apply_inbox_merge_decision` עושה את כל הארבע
 * בטרנזקציה אחת: או הכול, או כלום.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invalidateAllContactQueries } from '@/hooks/useContactMutations'
import type { DecisionPayload, InboxFieldDecision } from '@/lib/inbox-v2-decisions'
import type { MergeEntity } from '@/lib/inbox-v2-merge'

export const INBOX_DECISIONS_KEY = 'inbox-field-decisions'

/**
 * ההחלטות שכבר אושרו עבור אותה ישות.
 *
 * INC-3124: הסינון הוא לפי היעד בלבד ולא לפי רשומת Google. החלטה על
 * איש קשר מסוים ושדה מסוים תקפה בכל מקור — אם כבר הוכרע ש"חיפה" מנצחת
 * את "תל אביב" עבורו, אין סיבה לשאול שוב רק מפני שהפעם המידע הגיע
 * מ-Excel. ההצלבה המדויקת (שדה + שני הערכים המנורמלים) נעשית בזיכרון
 * ב-`suppressDecided`, כדי לא לשלוח שאילתה לכל שדה.
 */
export function useInboxFieldDecisions(
  targetType: MergeEntity | null,
  targetId: number | null,
) {
  return useQuery({
    queryKey: [INBOX_DECISIONS_KEY, targetType, targetId],
    enabled: !!targetType && targetId != null,
    staleTime: 30_000,
    queryFn: async (): Promise<InboxFieldDecision[]> => {
      const { data, error } = await supabase
        .from('inbox_field_decisions')
        .select('*')
        .eq('target_type', targetType!)
        .eq('target_id', targetId!)
      if (error) throw new Error(`טעינת ההחלטות הקודמות נכשלה: ${error.message}`)
      return (data ?? []) as InboxFieldDecision[]
    },
  })
}

export interface ApplyMergeArgs {
  leadId: number
  targetType: MergeEntity
  targetId: number
  /** רק שדות מה-whitelist; נאכף שוב בתוך הפונקציה במסד */
  patch: Record<string, unknown>
  decisions: DecisionPayload[]
  mergeStatus?: number
  actionType: number
  approvedBy: string | null
  /** provenance — נשמר עם ההחלטה. NULL לגיטימי לכל מקור שאינו Google. */
  googleAccountKey: string | null
  googleResourceName: string | null
  sourceType: number | null
  sourceUniqueKey: string | null
  /** מסלול סתירה בלבד — לאפס את ההתאמה שלא נבחרה */
  clearOtherMatch?: boolean
}

export interface ApplyMergeResult {
  fields_updated: number
  rows_updated: number
  decisions_saved: number
}

export function useApplyInboxMerge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: ApplyMergeArgs): Promise<ApplyMergeResult> => {
      const { data, error } = await supabase.rpc('apply_inbox_merge_decision', {
        p_lead_id: args.leadId,
        p_target_type: args.targetType,
        p_target_id: args.targetId,
        p_patch: args.patch,
        p_decisions: args.decisions,
        p_merge_status: args.mergeStatus ?? 6,
        p_action_type: args.actionType,
        p_approved_by: args.approvedBy,
        p_google_account_key: args.googleAccountKey,
        p_google_resource_name: args.googleResourceName,
        p_clear_other_match: args.clearOtherMatch ?? false,
        p_source_type: args.sourceType,
        p_source_unique_key: args.sourceUniqueKey,
      })
      if (error) throw new Error(error.message)
      return data as ApplyMergeResult
    },
    onSuccess: async (_result, args) => {
      // הפונקציה עוקפת את useContactMutations ולכן ה-invalidation מפורש כאן.
      await invalidateAllContactQueries(queryClient)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox-v2'] }),
        queryClient.invalidateQueries({ queryKey: ['inbox-v2-stats'] }),
        queryClient.invalidateQueries({ queryKey: [INBOX_DECISIONS_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['accounts', 'admin-board'] }),
        queryClient.invalidateQueries({ queryKey: ['employer360', 'account'] }),
        queryClient.invalidateQueries({
          queryKey: [args.targetType === 'account' ? 'account-for-merge' : 'contact-for-merge', args.targetId],
        }),
      ])
    },
  })
}
