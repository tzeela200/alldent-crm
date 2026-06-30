import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const ACCOUNT_QUERY_KEYS = [
  ['accounts', 'admin-board'],
  ['contacts', 'account-links'],
  ['jobs', 'account-counts'],
  ['employer360', 'account'],   // prefix match — covers all ['employer360','account', <any accountId>]
  ['employer-profile'],          // prefix match — covers all ['employer-profile', <any accountId>]
] as const

async function invalidateAllAccountQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all(
    ACCOUNT_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  )
}

export function useAccountMutations() {
  const queryClient = useQueryClient()

  async function updateAccount(accountId: number, patch: Record<string, unknown>) {
    const { error } = await supabase.from('accounts').update(patch).eq('account_id', accountId)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  async function insertAccount(payload: Record<string, unknown>) {
    const { error } = await supabase.from('accounts').insert(payload)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  async function bulkUpdateAccounts(ids: number[], patch: Record<string, unknown>) {
    const { error } = await supabase.from('accounts').update(patch).in('account_id', ids)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  async function mergeAccountsRpc(args: { master_id: number; dup_ids: number[]; overrides: Record<string, unknown> }) {
    const { error } = await supabase.rpc('merge_accounts', args)
    if (!error) await invalidateAllAccountQueries(queryClient)
    return { error }
  }

  return { updateAccount, insertAccount, bulkUpdateAccounts, mergeAccountsRpc }
}
