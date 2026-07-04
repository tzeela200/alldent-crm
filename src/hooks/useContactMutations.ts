import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const CONTACT_QUERY_KEYS = [
  ['contacts-v2'],
  ['contact360'],              // prefix match — covers all ['contact360', <any contactId>]
  ['contacts'],               // prefix match — covers ['contacts', <candidates|seekers|filters|id>, …]
  ['contacts', 'candidates'], // (kept explicit for clarity)
  ['contacts', 'seekers'],
  ['candidate-ids'],
  ['contacts-phone-norms'],
  ['contacts-role-counts'],
  ['contacts-region-counts'],
  ['candidateProfile'],           // candidate self-service view (admin & token)
  ['candidateProfileByToken'],    // candidate self-service view (token link)
] as const

// Shared invalidation so every contact write path (admin edits, candidate
// self-edits, bulk ops) refreshes the same screens instead of "talking alone".
export async function invalidateAllContactQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all(
    CONTACT_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  )
}

export function useContactMutations() {
  const queryClient = useQueryClient()

  async function updateContact(contactId: number, patch: Record<string, unknown>) {
    const { error } = await supabase.from('contact').update(patch).eq('contact_id', contactId)
    if (!error) await invalidateAllContactQueries(queryClient)
    return { error }
  }

  async function bulkUpdateContacts(ids: number[], patch: Record<string, unknown>) {
    const { error } = await supabase.from('contact').update(patch).in('contact_id', ids)
    if (!error) await invalidateAllContactQueries(queryClient)
    return { error }
  }

  async function insertContact(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('contact').insert(payload).select('contact_id').single()
    if (!error) await invalidateAllContactQueries(queryClient)
    return { data, error }
  }

  return { updateContact, bulkUpdateContacts, insertContact }
}
