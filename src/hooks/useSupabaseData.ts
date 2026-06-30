// =====================================================
// AllDent CRM — Supabase Live Data Hooks (React Query)
// =====================================================

import { useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, Account, ContactFilters, DictItem, Job, Application } from '@/types'

export function useDicts(): Record<string, DictItem[]> {
  return {
    roles: [], subRoles: [], regions: [], cities: [], availability: [],
    experience: [], applicationStatuses: [], jobStatuses: [], accountStatuses: [],
    accountTypes: [], checkStatuses: [], socialStatuses: [], sources: [],
    profileTypes: [], scopes: [], genders: [],
  }
}

export function useDictName() {
  return (_list: any[], _id: any): string => '—'
}

// ==================== JOBS ====================

export function useJobs(filters: Record<string, unknown> = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('job')
        .select('*')
        .order('job_code', { ascending: true })
      if (err) throw err
      return (rows ?? []) as Job[]
    },
    staleTime: 60_000,
  })

  return {
    data: data ?? [],
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useJob(_jobCode: string | undefined) {
  return { data: null, isLoading: false, loading: false, error: null }
}

// ==================== APPLICATIONS ====================

export function useApplications(filters: Record<string, unknown> = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', filters],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('applications')
        .select('*')
        .order('submission_date', { ascending: false })
      if (err) throw err
      return (rows ?? []) as Application[]
    },
    staleTime: 30_000,
  })

  return {
    data: data ?? [],
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useInbox(_filters: Record<string, unknown> = {}) {
  return { data: [], isLoading: false, loading: false, error: null }
}

export function useSmartMatch() {
  return { data: [], isLoading: false, loading: false, error: null }
}

export function useMockMutations() {
  return {}
}

// ==================== CONTACTS ====================

export function useContacts(filters: ContactFilters = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      let query = supabase
        .from('contact')
        .select('*')
        .order('contact_id', { ascending: true })

      if (filters.role) query = query.eq('role', filters.role)
      if (filters.sub_role) query = query.eq('sub_role', filters.sub_role)
      if (filters.region_id) query = query.eq('region_id', filters.region_id)
      if (filters.city_id) query = query.eq('city_id', filters.city_id)
      if (filters.availability) query = query.eq('availability', filters.availability)
      if (filters.experience) query = query.eq('experience', filters.experience)
      if (filters.source) query = query.eq('source', filters.source)
      if (filters.check_status) query = query.eq('check_status', filters.check_status)
      if (filters.profile_type) query = query.eq('profile_type', filters.profile_type)
      if (filters.has_cv !== undefined) query = query.eq('has_cv', filters.has_cv)

      if (filters.search) {
        const s = filters.search.trim()
        query = query.or(
          `full_name.ilike.%${s}%,phone.ilike.%${s}%,phone_norm.ilike.%${s}%,email.ilike.%${s}%`
        )
      }

      const { data: rows, error: err } = await query
      if (err) throw err
      return (rows ?? []) as Contact[]
    },
    staleTime: 60_000,
  })

  const rows = data ?? []
  return {
    data: rows,
    total: rows.length,
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useContact(contactId: number | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', contactId],
    queryFn: async () => {
      const { data: row, error: err } = await supabase
        .from('contact')
        .select('*')
        .eq('contact_id', contactId!)
        .single()
      if (err) throw err
      return (row as Contact) ?? null
    },
    enabled: !!contactId,
    staleTime: 60_000,
  })

  return {
    data: data ?? null,
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useCandidates(filters: ContactFilters = {}) {
  const result = useContacts({ ...filters, profile_type: filters.profile_type ?? undefined })
  const data = useMemo(
    () => result.data.filter((c) => c.availability != null || c.profile_type === 1),
    [result.data]
  )
  return { data, total: data.length, isLoading: result.isLoading, loading: result.isLoading, error: result.error }
}

// ==================== ACCOUNTS ====================

export function useAccounts(filters: {
  search?: string
  account_status?: number
  account_type?: number
  region_id?: number
  city_id?: number
} = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts', filters],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('account_id', { ascending: true })

      if (filters.account_status) query = query.eq('account_status', filters.account_status)
      if (filters.account_type) query = query.eq('account_type', filters.account_type)
      if (filters.region_id) query = query.eq('region_id', filters.region_id)
      if (filters.city_id) query = query.eq('city_id', filters.city_id)
      if (filters.search) {
        const s = filters.search.trim()
        query = query.or(`account_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`)
      }

      const { data: rows, error: err } = await query
      if (err) throw err
      return (rows ?? []) as Account[]
    },
    staleTime: 60_000,
  })

  const rows = data ?? []
  return {
    data: rows,
    total: rows.length,
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useAccount(accountId: number | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts', accountId],
    queryFn: async () => {
      const { data: row, error: err } = await supabase
        .from('accounts')
        .select('*')
        .eq('account_id', accountId!)
        .single()
      if (err) throw err
      return (row as Account) ?? null
    },
    enabled: !!accountId,
    staleTime: 60_000,
  })

  return {
    data: data ?? null,
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

export function useEmployers(filters: {
  search?: string
  account_status?: number
  account_type?: number
  region_id?: number
} = {}) {
  const result = useAccounts(filters)
  return result
}

// ==================== CONTACT TAGS ====================

export function useContactTags(contactId: number | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contact-tags', contactId],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('contact_tags')
        .select('*')
        .eq('contact_id', contactId!)
      if (err) throw err
      return (rows ?? []) as { contact_id: number; tag: string }[]
    },
    enabled: !!contactId,
    staleTime: 60_000,
  })

  return {
    data: data ?? [],
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

// ==================== DASHBOARD KPI ====================

const DEFAULT_KPI = {
  totalContacts: 0,
  totalCandidates: 0,
  totalAccounts: 0,
  activeJobs: 0,
  totalApplications: 0,
  pendingInbox: 0,
  newApplicationsThisWeek: 0,
  placedThisMonth: 0,
  interviewsScheduled: 0,
}

export function useDashboardKPI() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: async () => {
      const [contacts, accounts] = await Promise.all([
        supabase.from('contact').select('contact_id', { count: 'exact', head: true }),
        supabase.from('accounts').select('account_id', { count: 'exact', head: true }),
      ])
      return {
        ...DEFAULT_KPI,
        totalContacts: contacts.count ?? 0,
        totalAccounts: accounts.count ?? 0,
      }
    },
    staleTime: 60_000,
  })

  return {
    ...(data ?? DEFAULT_KPI),
    isLoading,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}

// ==================== MUTATIONS ====================

export function useMutations() {
  const qc = useQueryClient()

  const updateContact = useCallback(async (id: number, updates: Partial<Contact>) => {
    const { error } = await supabase.from('contact').update(updates).eq('contact_id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['contacts'] })
    qc.invalidateQueries({ queryKey: ['dashboard-kpi'] })
  }, [qc])

  const createContact = useCallback(async (data: Partial<Contact>) => {
    const { data: row, error } = await supabase.from('contact').insert(data).select().single()
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['contacts'] })
    qc.invalidateQueries({ queryKey: ['dashboard-kpi'] })
    return row as Contact
  }, [qc])

  const updateAccount = useCallback(async (id: number, updates: Partial<Account>) => {
    const { error } = await supabase.from('accounts').update(updates).eq('account_id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['accounts'] })
  }, [qc])

  return { updateContact, createContact, updateAccount }
}
