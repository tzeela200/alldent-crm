/**
 * סימון רשומה כ„חסום" לפרסום, וביטול הסימון.
 *
 * ## איפה זה נשמר
 *
 * הכרעת צאלה (14/09/2026): החסימה נשמרת כסטטוס הפנייה **„הסרה"**
 * (`contact.social_status = 13`) — ערך שכבר קיים במילון החי ומשמש 150 רשומות.
 * אין שדה חדש ואין שינוי במבנה המסד.
 *
 * ## למה ביטול משחזר ולא מאפס
 *
 * `social_status` הוא שדה אחד, ולפני הסימון הוא עשוי היה להחזיק ערך אחר
 * ("נשלחו פרטים", "פולואפ נדרש"). איפוס ל-null היה מוחק את המידע הזה בשקט.
 * לכן הביטול קורא את היומן `contact_profile_history` — שהטריגר
 * `trg_log_contact_changes` כותב בכל עדכון — ומחזיר את הערך שהיה לפני.
 *
 * ## מה אי אפשר לבטל כאן
 *
 * חסימה שנגזרת מפיקס ("אין וואטסאפ", "ביקש הסרה") אינה נשמרת בשדה הזה,
 * ולכן אין מה לבטל. "אין וואטסאפ" יורדת לבד כשקמפיין מאוחר מצליח.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useContactMutations } from '@/hooks/useContactMutations'
import { PUBLICATION_DB_KEYS } from '@/hooks/usePublicationDatabase'
import { FIX_PUBLICATIONS_KEYS } from '@/hooks/useFixPublications'
import { REMOVED_SOCIAL_STATUS } from '@/lib/fixPublications/deliveryOutcome'

/**
 * סטטוס הפנייה שהיה לפני שהרשומה סומנה „הסרה".
 * מחזיר null כשאין רישום ביומן (למשל רשומה שסומנה לפני שהיומן פעל).
 */
async function previousSocialStatus(contactId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('contact_profile_history')
    .select('old_data, new_data, changed_at')
    .eq('contact_id', contactId)
    .contains('changed_fields', ['social_status'])
    .order('changed_at', { ascending: false })
    .limit(20)
  if (error) throw error

  for (const entry of data ?? []) {
    const next = (entry.new_data as Record<string, unknown> | null)?.social_status
    if (Number(next) !== REMOVED_SOCIAL_STATUS) continue
    const prev = (entry.old_data as Record<string, unknown> | null)?.social_status
    if (prev == null || Number(prev) === REMOVED_SOCIAL_STATUS) return null
    return Number(prev)
  }
  return null
}

export function usePublicationBlock() {
  const queryClient = useQueryClient()
  const { updateContact } = useContactMutations()

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: PUBLICATION_DB_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: FIX_PUBLICATIONS_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: ['contact-publications'] }),
  ])

  const block = useMutation({
    mutationFn: async (contactId: number) => {
      const { error } = await updateContact(contactId, { social_status: REMOVED_SOCIAL_STATUS })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const unblock = useMutation({
    mutationFn: async (contactId: number) => {
      const restored = await previousSocialStatus(contactId)
      const { error } = await updateContact(contactId, { social_status: restored })
      if (error) throw error
      return { restored }
    },
    onSuccess: invalidate,
  })

  return { block, unblock }
}
