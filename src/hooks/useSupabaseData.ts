// =====================================================
// AllDent CRM — Supabase Live Data Hooks
// =====================================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact, Account, ContactFilters, DictItem } from '@/types'

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

export function useJobs(_filters: Record<string, unknown> = {}) {
  return { data: [], isLoading: false, loading: false, error: null }
}

export function useJob(_jobCode: string | undefined) {
  return { data: null, isLoading: false, loading: false, error: null }
}

export function useApplications(_filters: Record<string, unknown> = {}) {
  return { data: [], isLoading: false, loading: false, error: null }
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
  const [data, setData] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    async function fetch() {
      try {
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
        if (cancelled) return
        if (err) throw err
        setData((rows ?? []) as Contact[])
        setError(null)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [
    filters.search,
    filters.role,
    filters.sub_role,
    filters.region_id,
    filters.city_id,
    filters.availability,
    filters.experience,
    filters.source,
    filters.check_status,
    filters.profile_type,
    filters.has_cv,
  ])

  return { data, total: data.length, isLoading, loading: isLoading, error }
}

export function useContact(contactId: number | undefined) {
  const [data, setData] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contactId) {
      setData(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)

    supabase
      .from('contact')
      .select('*')
      .eq('contact_id', contactId)
      .single()
      .then(({ data: row, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setData((row as Contact) ?? null)
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [contactId])

  return { data, isLoading, loading: isLoading, error }
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
  const [data, setData] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    async function fetch() {
      try {
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
        if (cancelled) return
        if (err) throw err
        setData((rows ?? []) as Account[])
        setError(null)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [filters.search, filters.account_status, filters.account_type, filters.region_id, filters.city_id])

  return { data, total: data.length, isLoading, loading: isLoading, error }
}

export function useAccount(accountId: number | undefined) {
  const [data, setData] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) {
      setData(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)

    supabase
      .from('accounts')
      .select('*')
      .eq('account_id', accountId)
      .single()
      .then(({ data: row, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setData((row as Account) ?? null)
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [accountId])

  return { data, isLoading, loading: isLoading, error }
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
  const [data, setData] = useState<{ contact_id: number; tag: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!contactId) { setData([]); return }
    let cancelled = false
    setIsLoading(true)

    supabase
      .from('contact_tags')
      .select('*')
      .eq('contact_id', contactId)
      .then(({ data: rows }) => {
        if (!cancelled) setData(rows ?? [])
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [contactId])

  return { data, isLoading, loading: isLoading, error: null }
}

// ==================== DASHBOARD KPI ====================

export function useDashboardKPI() {
  const [kpi, setKpi] = useState({
    totalContacts: 0,
    totalCandidates: 0,
    totalAccounts: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingInbox: 0,
    newApplicationsThisWeek: 0,
    placedThisMonth: 0,
    interviewsScheduled: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('contact').select('contact_id', { count: 'exact', head: true }),
      supabase.from('accounts').select('account_id', { count: 'exact', head: true }),
    ]).then(([contacts, accounts]) => {
      setKpi((prev) => ({
        ...prev,
        totalContacts: contacts.count ?? 0,
        totalAccounts: accounts.count ?? 0,
      }))
      setIsLoading(false)
    })
  }, [])

  return { ...kpi, isLoading, loading: isLoading, error: null }
}

// ==================== MUTATIONS ====================

export function useMutations() {
  const updateContact = useCallback(async (id: number, updates: Partial<Contact>) => {
    const { error } = await supabase.from('contact').update(updates).eq('contact_id', id)
    if (error) throw error
  }, [])

  const createContact = useCallback(async (data: Partial<Contact>) => {
    const { data: row, error } = await supabase.from('contact').insert(data).select().single()
    if (error) throw error
    return row as Contact
  }, [])

  const updateAccount = useCallback(async (id: number, updates: Partial<Account>) => {
    const { error } = await supabase.from('accounts').update(updates).eq('account_id', id)
    if (error) throw error
  }, [])

  return { updateContact, createContact, updateAccount }
}
