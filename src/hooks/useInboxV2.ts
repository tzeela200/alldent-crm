import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { InboxV2Row, InboxV2Filters, InboxImportBatch, InboxMergeAction } from '@/types/inbox-v2'

const PAGE_SIZE = 20

export function useInboxV2Rows(filters: InboxV2Filters, page: number) {
  return useQuery({
    queryKey: ['inbox-v2', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('inbox_v2')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filters.search) {
        query = query.or(
          `display_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,phone_norm.ilike.%${filters.search}%,email.ilike.%${filters.search}%,facebook_name.ilike.%${filters.search}%,facebook_id.ilike.%${filters.search}%`
        )
      }
      if (filters.status?.length) query = query.in('merge_status', filters.status)
      if (filters.source_type?.length) query = query.in('source_type', filters.source_type)
      if (filters.batch_id) query = query.eq('import_batch_id', filters.batch_id)
      if (filters.role) query = query.eq('temp_role', filters.role)
      if (filters.confidence_min != null) query = query.gte('match_confidence', filters.confidence_min)
      if (filters.confidence_max != null) query = query.lte('match_confidence', filters.confidence_max)
      if (filters.has_new_info) query = query.eq('has_new_information', true)
      if (filters.date_from) query = query.gte('created_at', filters.date_from)
      if (filters.date_to) query = query.lte('created_at', filters.date_to)

      const { data, count, error } = await query
      if (error) throw error
      return { rows: (data ?? []) as InboxV2Row[], total: count ?? 0 }
    },
    staleTime: 30_000,
  })
}

export function useInboxV2Row(leadId: number | null) {
  return useQuery({
    queryKey: ['inbox-v2-row', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const { data, error } = await supabase
        .from('inbox_v2')
        .select('*')
        .eq('lead_id', leadId)
        .single()
      if (error) throw error
      return data as InboxV2Row
    },
    enabled: !!leadId,
  })
}

export function useInboxV2Batches() {
  return useQuery({
    queryKey: ['inbox-v2-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_import_batches')
        .select('*')
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as InboxImportBatch[]
    },
    staleTime: 60_000,
  })
}

export function useInboxV2Mutations() {
  const qc = useQueryClient()

  const updateRow = useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: number; updates: Partial<InboxV2Row> }) => {
      const { error } = await supabase.from('inbox_v2').update(updates).eq('lead_id', leadId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-v2'] })
      qc.invalidateQueries({ queryKey: ['inbox-v2-row'] })
    },
  })

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: number[]; status: number }) => {
      const { error } = await supabase
        .from('inbox_v2')
        .update({ merge_status: status, updated_at: new Date().toISOString() })
        .in('lead_id', leadIds)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-v2'] }),
  })

  const bulkAddTag = useMutation({
    mutationFn: async ({ leadIds, tag }: { leadIds: number[]; tag: string }) => {
      for (const id of leadIds) {
        const { data } = await supabase
          .from('inbox_v2')
          .select('tags')
          .eq('lead_id', id)
          .single()
        const currentTags: string[] = (data?.tags as string[]) ?? []
        if (!currentTags.includes(tag)) {
          await supabase
            .from('inbox_v2')
            .update({ tags: [...currentTags, tag] })
            .eq('lead_id', id)
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-v2'] }),
  })

  const logAction = useMutation({
    mutationFn: async (action: Omit<InboxMergeAction, 'action_id' | 'created_at'>) => {
      const { error } = await supabase.from('inbox_merge_actions').insert(action)
      if (error) throw error
    },
  })

  return { updateRow, bulkUpdateStatus, bulkAddTag, logAction }
}

export { PAGE_SIZE }
