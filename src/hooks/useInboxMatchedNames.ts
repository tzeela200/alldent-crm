import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { InboxV2Row } from '@/types/inbox-v2'

/**
 * שמות הרשומות שאליהן הותאמו שורות ה-Inbox (INC-3125).
 *
 * המסך הציג "איש קשר #60470" — מזהה טכני שאינו אומר למשתמשת דבר, ומחייב
 * אותה לפתוח כל שורה כדי להבין למי היא הותאמה. §9 אוסר להציג מזהים
 * טכניים כממשק ראשי.
 *
 * שתי שאילתות לכל היותר לעמוד (לא אחת לשורה): אוספים את כל המזהים
 * הייחודיים של העמוד ושולפים אותם ב-`in()` אחד לכל ישות.
 */
export interface MatchedNames {
  contacts: Map<number, string>
  accounts: Map<number, string>
}

const EMPTY: MatchedNames = { contacts: new Map(), accounts: new Map() }

export function useInboxMatchedNames(rows: InboxV2Row[]) {
  const contactIds = [...new Set(rows.map((r) => r.match_contact).filter((v): v is number => v != null))]
  const accountIds = [...new Set(rows.map((r) => r.match_account).filter((v): v is number => v != null))]

  return useQuery<MatchedNames>({
    queryKey: ['inbox-v2-matched-names', contactIds, accountIds],
    enabled: contactIds.length > 0 || accountIds.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev ?? EMPTY,
    queryFn: async () => {
      const out: MatchedNames = { contacts: new Map(), accounts: new Map() }

      const [contactRes, accountRes] = await Promise.all([
        contactIds.length
          ? supabase.from('contact').select('contact_id, display_name, full_name').in('contact_id', contactIds)
          : Promise.resolve({ data: [], error: null }),
        accountIds.length
          ? supabase.from('accounts').select('account_id, account_name').in('account_id', accountIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (contactRes.error) throw new Error(`טעינת שמות אנשי הקשר נכשלה: ${contactRes.error.message}`)
      if (accountRes.error) throw new Error(`טעינת שמות הארגונים נכשלה: ${accountRes.error.message}`)

      for (const c of (contactRes.data ?? []) as Record<string, unknown>[]) {
        const name = (c.display_name as string) || (c.full_name as string) || ''
        if (name) out.contacts.set(c.contact_id as number, name)
      }
      for (const a of (accountRes.data ?? []) as Record<string, unknown>[]) {
        const name = (a.account_name as string) || ''
        if (name) out.accounts.set(a.account_id as number, name)
      }
      return out
    },
  })
}

/**
 * התווית להצגה עבור ההתאמה של שורה.
 * נופל חזרה למזהה רק כשהשם באמת לא נמצא — ואז זו עדות לבעיה, לא ברירת מחדל.
 */
export function matchedLabel(row: InboxV2Row, names: MatchedNames | undefined): string | null {
  if (row.match_contact != null) {
    return names?.contacts.get(row.match_contact) ?? `איש קשר #${row.match_contact}`
  }
  if (row.match_account != null) {
    return names?.accounts.get(row.match_account) ?? `ארגון #${row.match_account}`
  }
  return null
}
