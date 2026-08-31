/**
 * היסטוריית הפרסומים של אדם אחד — כל הקמפיינים שהוא נכלל בהם.
 *
 * מקור האמת להיסטוריה הוא `whatsapp_campaign_recipients`; שדות הסיכום על
 * `contact` מחזיקים רק את השליחה האחרונה. הפאנל הזה הוא המקום היחיד שבו
 * רואים את הרצף המלא, כולל בקשת הסרה שאינה משתקפת בשדה הסיכום.
 *
 * קריאה בלבד — אין כתיבה ואין mutation.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type DeliveryStatusCode } from '@/lib/fixPublications/deliveryStatus'

export interface ContactPublicationRow {
  recipient_id: number
  campaign_id: number
  sent_at: string | null
  delivery_status: DeliveryStatusCode
  delivery_status_raw: string | null
  failure_category: string | null
  failure_message: string | null
  campaign_name: string | null
  source_file_name: string | null
}

/** עד כמה קמפיינים מוצגים לאדם אחד. מעבר לכך — התצוגה מתריעה ולא חותכת בשקט. */
const MAX_ROWS = 200

export function useContactPublications(contactId: number | null | undefined) {
  return useQuery({
    queryKey: ['contact-publications', contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_campaign_recipients')
        .select(
          `recipient_id, campaign_id, sent_at, delivery_status, delivery_status_raw,
           failure_category, failure_message,
           campaign:whatsapp_campaigns(campaign_name, source_file_name)`,
        )
        .eq('contact_id', contactId as number)
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(MAX_ROWS)
      if (error) throw error

      const rows: ContactPublicationRow[] = (data ?? []).map((r) => {
        const campaign = r.campaign as unknown as
          { campaign_name: string | null; source_file_name: string | null } | null
        return {
          recipient_id: Number(r.recipient_id),
          campaign_id: Number(r.campaign_id),
          sent_at: (r.sent_at as string | null) ?? null,
          delivery_status: r.delivery_status as DeliveryStatusCode,
          delivery_status_raw: (r.delivery_status_raw as string | null) ?? null,
          failure_category: (r.failure_category as string | null) ?? null,
          failure_message: (r.failure_message as string | null) ?? null,
          campaign_name: campaign?.campaign_name ?? null,
          source_file_name: campaign?.source_file_name ?? null,
        }
      })

      return { rows, truncated: rows.length >= MAX_ROWS }
    },
  })
}
