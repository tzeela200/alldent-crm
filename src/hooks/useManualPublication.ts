/**
 * רישום **פרסום אישי** — פרסום שנשלח ידנית ללקוח, לא דרך קמפיין ב-Fix.
 *
 * ## למה זה לא סתם עדכון של התאריך ברשומה
 *
 * `contact.whatsapp_campaign_last_sent` הוא שדה סיכום (Cache); מקור האמת
 * להיסטוריה הוא `whatsapp_campaign_recipients`. אילו היינו כותבים רק לשדה
 * הסיכום, המסך היה סותר את עצמו: הטבלה הייתה מציגה תאריך פרסום, ובאותו זמן
 * פאנל היסטוריית הפרסומים ב-360 היה אומר "מעולם לא נכלל בקמפיין".
 *
 * לכן רישום ידני כותב **אירוע אמיתי** תחת קמפיין ייעודי „פרסומים אישיים"
 * (`external_campaign_id='manual:personal'`, `source_type='manual'`), ורק
 * אחר כך מעדכן את שדות הסיכום — בדיוק באותו מסלול שבו קליטת דוח מעדכנת אותם.
 *
 * ## אירוע אחד לכל אדם
 *
 * המפתח הוא `manual|<contact_id>` בלי תאריך, ולכן יש **רישום ידני אחד לכל
 * אדם** שנערך במקום להיערם. זה תואם למשמעות העמודה ("פרסום אחרון"): שינוי
 * התאריך מתקן את הרישום, ולא יוצר אירוע שני.
 *
 * ## מה גובר על מה
 *
 * שדה הסיכום מתעדכן רק אם התאריך החדש **מאוחר** מהקיים — אותו כלל שמונע
 * מדוח היסטורי לדרוס פרסום עדכני. לכן קמפיין מאוחר יותר יגבר על רישום ידני
 * ישן, ולהפך. הרישום הידני עצמו נשאר בהיסטוריה בכל מקרה.
 *
 * אפס שינוי סכמה: `source_type` ו-`delivery_status_raw` הן עמודות חופשיות.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invalidateAllContactQueries } from '@/hooks/useContactMutations'
import { PUBLICATION_DB_KEYS } from '@/hooks/usePublicationDatabase'
import { FIX_PUBLICATIONS_KEYS } from '@/hooks/useFixPublications'
import { type DeliveryStatusCode } from '@/lib/fixPublications/deliveryStatus'

/** הקמפיין הייעודי שמאגד את כל הפרסומים האישיים */
const MANUAL_CAMPAIGN_KEY = 'manual:personal'
const MANUAL_CAMPAIGN_NAME = 'פרסומים אישיים'

/**
 * הסטטוסים שאפשר לרשום ידנית. רק תוצאות חיוביות — פרסום שנשלח אישית ונכשל
 * אינו משהו שהמשתמשת יודעת לדווח עליו, וכשל מדווח תמיד מדוח Fix.
 */
export const MANUAL_STATUS_OPTIONS: { code: DeliveryStatusCode; label: string }[] = [
  { code: 'submitted', label: 'נשלח' },
  { code: 'delivered', label: 'נמסר' },
  { code: 'read',      label: 'נקרא' },
]

export interface ManualPublicationInput {
  contactId: number
  phoneNorm: string | null
  /** yyyy-mm-dd מתוך שדה התאריך */
  date: string
  status: DeliveryStatusCode
  /** הערך הקיים ברשומה — כדי לדעת אם הסיכום מתקדם */
  currentLastSent: string | null
}

/** ממיר yyyy-mm-dd לחותמת זמן מקומית, כדי שהיום לא יזלוג בהמרה ל-UTC */
function toLocalTimestamp(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0).toISOString()
}

async function ensureManualCampaign(): Promise<number> {
  const { data: existing, error: findError } = await supabase
    .from('whatsapp_campaigns')
    .select('campaign_id')
    .eq('external_campaign_id', MANUAL_CAMPAIGN_KEY)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return Number(existing.campaign_id)

  const { data, error } = await supabase
    .from('whatsapp_campaigns')
    .insert({
      external_campaign_id: MANUAL_CAMPAIGN_KEY,
      campaign_name: MANUAL_CAMPAIGN_NAME,
      source_type: 'manual',
      raw_payload: { kind: 'manual', created_by_screen: 'publication-database' },
    })
    .select('campaign_id').single()
  if (error) throw error
  return Number(data.campaign_id)
}

/**
 * מרענן את מוני הקמפיין האישי אחרי כל שינוי.
 *
 * בלי זה הקמפיין „פרסומים אישיים" היה מופיע בטבלת ביצועי הקמפיינים עם 0
 * נמענים בזמן שיש בו רשומות — מסך שסותר את עצמו. אותה שיטת ספירה שבה
 * refreshCampaignCounts משתמש אחרי קליטת דוח.
 */
async function refreshManualCampaignCounts(campaignId: number): Promise<void> {
  const base = () => supabase
    .from('whatsapp_campaign_recipients')
    .select('recipient_id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  const [total, submitted, delivered, read] = await Promise.all([
    base(),
    base().eq('delivery_status', 'submitted'),
    base().eq('delivery_status', 'delivered'),
    base().eq('delivery_status', 'read'),
  ])
  if (total.error || submitted.error || delivered.error || read.error) return

  await supabase
    .from('whatsapp_campaigns')
    .update({
      total_recipients: total.count ?? 0,
      submitted_count: submitted.count ?? 0,
      delivered_count: delivered.count ?? 0,
      read_count: read.count ?? 0,
      failed_count: 0, // רישום ידני לעולם אינו כשל
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
}

export function useRecordManualPublication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ManualPublicationInput) => {
      if (!input.phoneNorm) {
        throw new Error('לרשומה אין נייד תקין, ולכן אי אפשר לרשום עליה פרסום.')
      }
      if (!input.date) throw new Error('יש לבחור תאריך.')

      const sentAt = toLocalTimestamp(input.date)
      const campaignId = await ensureManualCampaign()
      const sourceKey = `manual|${input.contactId}`

      const payload = {
        campaign_id: campaignId,
        contact_id: input.contactId,
        phone_norm: input.phoneNorm,
        delivery_status: input.status,
        delivery_status_raw: 'נרשם ידנית',
        sent_at: sentAt,
        source_unique_key: sourceKey,
        raw_payload: {
          _alldent: {
            match: 'manual',
            note: 'פרסום שנשלח אישית, לא דרך קמפיין',
            recorded_at: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      }

      // רישום ידני אחד לכל אדם — עדכון אם קיים, אחרת יצירה.
      // אין upsert(): recipient_id הוא GENERATED ALWAYS AS IDENTITY (שגיאת 428C9).
      const { data: existing, error: findError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('recipient_id')
        .eq('source_unique_key', sourceKey)
        .maybeSingle()
      if (findError) throw findError

      if (existing) {
        const { error } = await supabase
          .from('whatsapp_campaign_recipients')
          .update(payload)
          .eq('recipient_id', Number(existing.recipient_id))
        if (error) throw error
      } else {
        const { error } = await supabase.from('whatsapp_campaign_recipients').insert(payload)
        if (error) throw error
      }

      // שדות הסיכום — רק אם הרישום מאוחר מהקיים, בדיוק כמו בקליטת דוח.
      const isNewer = !input.currentLastSent || new Date(sentAt) > new Date(input.currentLastSent)
      if (isNewer) {
        const { error } = await supabase
          .from('contact')
          .update({
            whatsapp_campaign_last_sent: sentAt,
            whatsapp_last_delivery_status: input.status,
          })
          .eq('contact_id', input.contactId)
        if (error) throw error
      }

      await refreshManualCampaignCounts(campaignId)

      return { updatedSummary: isNewer, replaced: !!existing }
    },
    onSuccess: async () => {
      await invalidateAllContactQueries(queryClient)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLICATION_DB_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: FIX_PUBLICATIONS_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['contact-publications'] }),
      ])
    },
  })
}

/** מוחק את הרישום הידני של אדם. אירועי קמפיין אמיתיים לעולם אינם נמחקים. */
export function useDeleteManualPublication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contactId: number) => {
      const { error } = await supabase
        .from('whatsapp_campaign_recipients')
        .delete()
        .eq('source_unique_key', `manual|${contactId}`)
      if (error) throw error

      // שדות הסיכום נגזרים מחדש מהאירוע האחרון שנשאר, אם יש כזה.
      const { data: latest, error: latestError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('sent_at, delivery_status')
        .eq('contact_id', contactId)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1).maybeSingle()
      if (latestError) throw latestError

      const { error: updateError } = await supabase
        .from('contact')
        .update({
          whatsapp_campaign_last_sent: (latest?.sent_at as string | null) ?? null,
          whatsapp_last_delivery_status: (latest?.delivery_status as string | null) ?? null,
        })
        .eq('contact_id', contactId)
      if (updateError) throw updateError

      const { data: campaign } = await supabase
        .from('whatsapp_campaigns').select('campaign_id')
        .eq('external_campaign_id', MANUAL_CAMPAIGN_KEY).maybeSingle()
      if (campaign) await refreshManualCampaignCounts(Number(campaign.campaign_id))
    },
    onSuccess: async () => {
      await invalidateAllContactQueries(queryClient)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLICATION_DB_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: FIX_PUBLICATIONS_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['contact-publications'] }),
      ])
    },
  })
}
