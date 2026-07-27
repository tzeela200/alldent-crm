import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const ACCOUNT_QUERY_KEYS = [
  ['accounts', 'admin-board'],
  ['contacts', 'account-links'],
  ['jobs', 'account-counts'],
  ['employer360', 'account'],
  ['employer-profile'],
] as const

async function invalidateAllAccountQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all(
    ACCOUNT_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey: [...queryKey] })
    )
  )
}

export function useAccountMutations() {
  const queryClient = useQueryClient()

  async function updateAccount(accountId: number, patch: Record<string, unknown>) {
    const { error } = await supabase.from('accounts').update(patch).eq('account_id', accountId)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  // מחזיר גם את המזהה החדש (כמו insertContact) — נדרש כדי לקשר את הארגון
  // שנוצר חזרה ל-inbox_v2.match_account ול-inbox_merge_actions.target_id.
  // תוספת אדיטיבית: הצרכן הקיים (AccountPanel) קורא רק { error }.
  async function insertAccount(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('accounts').insert(payload).select('account_id').single()
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { data, error }
  }

  async function bulkUpdateAccounts(ids: number[], patch: Record<string, unknown>) {
    const { error } = await supabase.from('accounts').update(patch).in('account_id', ids)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  async function mergeAccountsRpc(args: {
    master_id: number
    dup_ids: number[]
    overrides: Record<string, unknown>
  }) {
    const { error } = await supabase.rpc('merge_accounts', args)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  return { updateAccount, insertAccount, bulkUpdateAccounts, mergeAccountsRpc }
}