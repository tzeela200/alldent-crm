import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

  return { matchBatch, matchRow }
}
