/**
 * תיקון ידני של סטטוס שליחה בשורת נמען.
 *
 * ## שלושה כללי בטיחות
 *
 * 1. **מה שפיקס דיווח לעולם לא נמחק.** נכתב רק `delivery_status`;
 *    `delivery_status_raw` נשאר בדיוק כפי שהתקבל מהדוח.
 * 2. **התיקון מתועד** ב-`raw_payload._alldent` — הערך הקודם ומתי שונה.
 *    כך תמיד אפשר לדעת מה היה לפני, ומה נקבע ידנית.
 * 3. **שדות הסיכום נגזרים מחדש** מהאירוע האחרון של אותו אדם, ומוני הקמפיין
 *    מרועננים. בלי זה הטבלה הייתה מציגה סטטוס אחד והכרטיסים אחר —
 *    ראו [[feedback_cache_field_needs_real_event]].
 *
 * קליטת דוח עתידית עדיין מקדמת סטטוס (`pickHigherStatus`), ולכן תיקון ידני
 * אינו "נועל" את השורה — הוא מתקן את מה שידוע עכשיו.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invalidateAllContactQueries } from '@/hooks/useContactMutations'
import { FIX_PUBLICATIONS_KEYS } from '@/hooks/useFixPublications'
import { PUBLICATION_DB_KEYS } from '@/hooks/usePublicationDatabase'
import {
  failureCategoryOf, type DeliveryStatusCode,
} from '@/lib/fixPublications/deliveryStatus'

export interface OverrideStatusInput {
  recipientId: number
  /** לגזירה מחדש של שדות הסיכום. null = השורה אינה משויכת לאיש קשר */
  contactId: number | null
  campaignId: number
  currentStatus: DeliveryStatusCode
  nextStatus: DeliveryStatusCode
  /** הערך המקורי מפיקס — נשמר כדי שנוכל להציג ממה שונה */
  rawStatus: string | null
}

/** דירוג לבחירת הסטטוס הקובע כששני אירועים נושאים את אותו מועד */
const STATUS_RANK: Record<string, number> = {
  read: 5, delivered: 4, submitted: 3, no_status: 1,
}
const rankOf = (status: string | null) => (status ? STATUS_RANK[status] ?? 2 : 0)

/**
 * גוזר מחדש את שדות הסיכום של איש קשר מהאירועים שלו.
 *
 * אותו כלל בדיוק שבו הקליטה משתמשת: האירוע המאוחר ביותר, ובין שווי-מועד —
 * הסטטוס המתקדם יותר.
 */
async function resyncContactSummary(contactId: number): Promise<void> {
  const { data, error } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('sent_at, delivery_status')
    .eq('contact_id', contactId)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(50)
  if (error) throw error

  const rows = data ?? []
  if (!rows.length) {
    await supabase
      .from('contact')
      .update({ whatsapp_campaign_last_sent: null, whatsapp_last_delivery_status: null })
      .eq('contact_id', contactId)
    return
  }

  const latestStamp = String(rows[0].sent_at)
  const best = rows
    .filter((r) => String(r.sent_at) === latestStamp)
    .sort((a, b) => rankOf(b.delivery_status as string) - rankOf(a.delivery_status as string))[0]

  const { error: updateError } = await supabase
    .from('contact')
    .update({
      whatsapp_campaign_last_sent: latestStamp,
      whatsapp_last_delivery_status: best.delivery_status as string,
    })
    .eq('contact_id', contactId)
  if (updateError) throw updateError
}

/** מרענן את מוני הקמפיין — אחרת הכרטיסים יסתרו את הטבלה */
async function refreshCampaignCounts(campaignId: number): Promise<void> {
  const base = () => supabase
    .from('whatsapp_campaign_recipients')
    .select('recipient_id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  const [total, submitted, delivered, read, failed] = await Promise.all([
    base(),
    base().eq('delivery_status', 'submitted'),
    base().eq('delivery_status', 'delivered'),
    base().eq('delivery_status', 'read'),
    base().like('delivery_status', 'failed_%'),
  ])
  if (total.error || submitted.error || delivered.error || read.error || failed.error) return

  await supabase
    .from('whatsapp_campaigns')
    .update({
      total_recipients: total.count ?? 0,
      submitted_count: submitted.count ?? 0,
      delivered_count: delivered.count ?? 0,
      read_count: read.count ?? 0,
      failed_count: failed.count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
}

export function useOverrideDeliveryStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: OverrideStatusInput) => {
      if (input.nextStatus === input.currentStatus) return { changed: false }

      // קריאת raw_payload כדי למזג את בלוק התיעוד ולא לדרוס את שורת המקור
      const { data: existing, error: readError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('raw_payload')
        .eq('recipient_id', input.recipientId)
        .single()
      if (readError) throw readError

      const payload = (existing.raw_payload ?? {}) as Record<string, unknown>
      const audit = (payload._alldent ?? {}) as Record<string, unknown>

      const { error } = await supabase
        .from('whatsapp_campaign_recipients')
        .update({
          delivery_status: input.nextStatus,
          // הקטגוריה נגזרת מחדש מהסטטוס החדש; הטקסט הגולמי נשאר כפי שהיה
          failure_category: failureCategoryOf(input.nextStatus, input.rawStatus),
          raw_payload: {
            ...payload,
            _alldent: {
              ...audit,
              status_overridden_from: input.currentStatus,
              status_overridden_at: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('recipient_id', input.recipientId)
      if (error) throw error

      if (input.contactId) await resyncContactSummary(input.contactId)
      await refreshCampaignCounts(input.campaignId)

      return { changed: true }
    },
    onSuccess: async () => {
      await invalidateAllContactQueries(queryClient)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FIX_PUBLICATIONS_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: PUBLICATION_DB_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['contact-publications'] }),
      ])
    },
  })
}
