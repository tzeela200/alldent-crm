import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { OPEN_STATUS_IDS } from '@/lib/inbox-v2-dicts'

interface MatchBatchResult {
  total_processed: number
  matched: number
  strong_matches: number
  partial_matches: number
}

export function useInboxV2Matching() {
  const qc = useQueryClient()

  const matchBatch = useMutation({
    mutationFn: async (batchId: number) => {
      const { data, error } = await supabase.rpc('match_inbox_batch', { p_batch_id: batchId })
      if (error) throw error
      return data as MatchBatchResult
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-batches'] })
      toast.success(
        `נותחו ${result.total_processed} רשומות — ${result.matched} התאמות (${result.strong_matches} חזקות)`
      )
    },
    onError: (err: Error) => toast.error(`שגיאה בניתוח: ${err.message}`),
  })

  /**
   * הרצת התאמה מחדש על כל התור הפתוח (INC-3125).
   *
   * נחוץ מפני ש-n8n כותבת שורות ישירות ל-inbox_v2 עם merge_status ו-
   * matched_by משלה ('link'/'strong'/'weak'), בלי להריץ את מנוע ההשוואה
   * שלנו. התוצאה: רשומות יושבות ב"דורש החלטה" כשאין בהן מה להחליט,
   * והפאנל — שכן מריץ את המנוע — סותר את הטבלה.
   *
   * הכפתור מאפשר לנקות את התור בלי להמתין לשינוי באוטומציה.
   */
  const rematchOpenQueue = useMutation({
    mutationFn: async () => {
      const { data: rows, error: readErr } = await supabase
        .from('inbox_v2')
        .select('lead_id')
        .in('merge_status', OPEN_STATUS_IDS)
      if (readErr) throw new Error(readErr.message)

      const ids = (rows ?? []).map((r) => r.lead_id as number)
      let failed = 0
      for (const id of ids) {
        const { error } = await supabase.rpc('match_inbox_row', { p_lead_id: id })
        if (error) failed++
      }
      return { total: ids.length, failed }
    },
    onSuccess: ({ total, failed }) => {
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-stats'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-row'] })
      if (failed > 0) {
        toast.warning(`נותחו ${total} רשומות, ${failed} נכשלו`)
      } else {
        toast.success(`נותחו מחדש ${total} רשומות — התור עודכן`)
      }
    },
    onError: (err: Error) => toast.error(`הרצת ההתאמה נכשלה: ${err.message}`),
  })

  const matchRow = useMutation({
    mutationFn: async (leadId: number) => {
      const { data, error } = await supabase.rpc('match_inbox_row', { p_lead_id: leadId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-row'] })
    },
  })

  return { matchBatch, matchRow, rematchOpenQueue }
}
