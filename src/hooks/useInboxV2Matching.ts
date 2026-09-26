import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { OPEN_STATUS_IDS } from '@/lib/inbox-v2-dicts'
import { detectBlockPrefix } from '@/lib/inboxV2BlockDetection'
import { invalidateAllContactQueries } from '@/hooks/useContactMutations'

/** dict_inbox_statuses.id = 8 ("התעלמות") — הסטטוס שאליו נסגרת שורה שזוהתה כחסימה (INC-3148) */
const AUTO_BLOCK_CLOSE_STATUS = 8

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

  /**
   * זיהוי קידומת חסימה בשם הנכנס (INC-3148) — רק על שורות שכבר הותאמו לאיש
   * קשר קיים (match_contact); שורה בלי התאמה לא יוצרת רשומה חדשה רק כדי
   * לחסום אותה. לכל התאמה: מעדכנים social_status על איש הקשר וסוגרים את
   * השורה (8 — "התעלמות"), כדי שלא תישאר "ממתינה להכרעה" בלי סיבה.
   */
  const autoBlockByNamePrefix = useMutation({
    mutationFn: async () => {
      const { data: rows, error: readErr } = await supabase
        .from('inbox_v2')
        .select('lead_id, display_name, match_contact')
        .in('merge_status', OPEN_STATUS_IDS)
        .not('match_contact', 'is', null)
      if (readErr) throw new Error(readErr.message)

      const contactIdsByStatus = new Map<number, Set<number>>()
      const leadIdsToClose: number[] = []

      for (const row of (rows ?? []) as { lead_id: number; display_name: string | null; match_contact: number }[]) {
        const match = detectBlockPrefix(row.display_name)
        if (!match) continue
        leadIdsToClose.push(row.lead_id)
        const set = contactIdsByStatus.get(match.socialStatus) ?? new Set<number>()
        set.add(row.match_contact)
        contactIdsByStatus.set(match.socialStatus, set)
      }

      for (const [socialStatus, contactIds] of contactIdsByStatus) {
        const { error } = await supabase
          .from('contact')
          .update({ social_status: socialStatus })
          .in('contact_id', Array.from(contactIds))
        if (error) throw new Error(error.message)
      }

      if (leadIdsToClose.length) {
        const { error } = await supabase
          .from('inbox_v2')
          .update({ merge_status: AUTO_BLOCK_CLOSE_STATUS, updated_at: new Date().toISOString() })
          .in('lead_id', leadIdsToClose)
        if (error) throw new Error(error.message)
      }

      const contactsUpdated = new Set(Array.from(contactIdsByStatus.values()).flatMap((s) => Array.from(s))).size
      return { rowsClosed: leadIdsToClose.length, contactsUpdated }
    },
    onSuccess: async ({ rowsClosed, contactsUpdated }) => {
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-stats'] })
      qc.invalidateQueries({ queryKey: ['contact-hidden-from-lists-ids'] })
      await invalidateAllContactQueries(qc)
      if (rowsClosed) {
        toast.success(`זוהו ${rowsClosed} רשומות חסימה — ${contactsUpdated} אנשי קשר סומנו, השורות נסגרו`)
      } else {
        toast.info('לא נמצאו רשומות עם קידומת חסימה בתור הפתוח')
      }
    },
    onError: (err: Error) => toast.error(`זיהוי החסימות נכשל: ${err.message}`),
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

  return { matchBatch, matchRow, rematchOpenQueue, autoBlockByNamePrefix }
}
