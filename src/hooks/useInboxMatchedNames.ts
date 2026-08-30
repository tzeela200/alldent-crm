import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import type { InboxV2Row } from '@/types/inbox-v2'

/**
 * פרטי הרשומות שאליהן הותאמו שורות ה-Inbox (INC-3125).
 *
 * המסך הציג "איש קשר #60470" — מזהה טכני שאינו אומר למשתמשת דבר.
 * §9 אוסר להציג מזהים טכניים כממשק ראשי.
 *
 * מוצגים **שם, תפקיד ועיר**: שם לבדו אינו מספיק כדי לזהות למי הרשומה
 * הותאמה — במאגר יש שמות חוזרים, והתפקיד והעיר הם מה שמבדיל ביניהם
 * בלי לפתוח את הרשומה.
 *
 * שתי שאילתות לכל היותר לעמוד (לא אחת לשורה): אוספים את כל המזהים
 * הייחודיים של העמוד ושולפים אותם ב-`in()` אחד לכל ישות. המילונים
 * מגיעים מה-hooks המשותפים ולכן חולקים cache עם שאר האדמין.
 */

interface MatchedRecord {
  name: string
  /** תפקיד — לאנשי קשר בלבד; ל-accounts אין עמודת role */
  role: string | null
  city: string | null
}

export interface MatchedNames {
  contacts: Map<number, MatchedRecord>
  accounts: Map<number, MatchedRecord>
}

const EMPTY: MatchedNames = { contacts: new Map(), accounts: new Map() }

export function useInboxMatchedNames(rows: InboxV2Row[]) {
  const { data: dicts } = useApplicationDicts()
  const { data: cities } = useInboxV2Cities()

  const contactIds = [...new Set(rows.map((r) => r.match_contact).filter((v): v is number => v != null))]
  const accountIds = [...new Set(rows.map((r) => r.match_account).filter((v): v is number => v != null))]

  return useQuery<MatchedNames>({
    queryKey: ['inbox-v2-matched-names', contactIds, accountIds, !!dicts?.roles, !!cities],
    enabled: contactIds.length > 0 || accountIds.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev ?? EMPTY,
    queryFn: async () => {
      const out: MatchedNames = { contacts: new Map(), accounts: new Map() }
      const cityName = (id: unknown): string | null => {
        if (id == null) return null
        return cities?.find((c) => c.id === Number(id))?.name ?? null
      }

      const [contactRes, accountRes] = await Promise.all([
        contactIds.length
          ? supabase
              .from('contact')
              .select('contact_id, display_name, full_name, role, city_id')
              .in('contact_id', contactIds)
          : Promise.resolve({ data: [], error: null }),
        accountIds.length
          ? supabase
              .from('accounts')
              .select('account_id, account_name, city_id')
              .in('account_id', accountIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (contactRes.error) throw new Error(`טעינת אנשי הקשר נכשלה: ${contactRes.error.message}`)
      if (accountRes.error) throw new Error(`טעינת הארגונים נכשלה: ${accountRes.error.message}`)

      for (const c of (contactRes.data ?? []) as Record<string, unknown>[]) {
        const name = (c.display_name as string) || (c.full_name as string) || ''
        if (!name) continue
        const roleId = c.role as number | null
        out.contacts.set(c.contact_id as number, {
          name,
          role: roleId != null ? getDictLabel(dicts?.roles, roleId) : null,
          city: cityName(c.city_id),
        })
      }

      for (const a of (accountRes.data ?? []) as Record<string, unknown>[]) {
        const name = (a.account_name as string) || ''
        if (!name) continue
        out.accounts.set(a.account_id as number, {
          name,
          role: null,
          city: cityName(a.city_id),
        })
      }

      return out
    },
  })
}

/** הרשומה שאליה הותאמה השורה, או null כשאין התאמה. */
export function matchedRecord(
  row: InboxV2Row,
  names: MatchedNames | undefined
): MatchedRecord | null {
  if (row.match_contact != null) {
    return names?.contacts.get(row.match_contact) ?? { name: `איש קשר #${row.match_contact}`, role: null, city: null }
  }
  if (row.match_account != null) {
    return names?.accounts.get(row.match_account) ?? { name: `ארגון #${row.match_account}`, role: null, city: null }
  }
  return null
}

/** שם בלבד — לשימושים שבהם אין מקום לתפקיד ולעיר. */
export function matchedLabel(row: InboxV2Row, names: MatchedNames | undefined): string | null {
  return matchedRecord(row, names)?.name ?? null
}
