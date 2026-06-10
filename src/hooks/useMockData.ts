// =====================================================
// AllDent CRM — Mock Hooks Layer
// Interface זהה ל-Supabase hooks — החלפת implementation בלבד
// =====================================================

import { useMemo, useState, useCallback } from 'react'
import { mockContacts, mockAccounts, mockJobs, mockApplicationRows, mockInboxLeads, mockContactTags } from '@/mocks/data'
import { enrichJob, getMockApplicationsEnriched } from '@/mocks/joinMockData'
import {
  mockRoles,
  mockSubRoles,
  mockRegions,
  mockCities,
  mockAvailability,
  mockExperience,
  mockSources,
  mockApplicationStatuses,
  mockJobStatuses,
  mockAccountStatuses,
  mockAccountTypes,
  mockCheckStatuses,
  mockScopes,
  mockSocialStatuses,
  mockProfileTypes,
} from '@/mocks/dicts'
import type {
  Contact,
  Account,
  Job,
  Application,
  ApplicationEnriched,
  InboxLead,
  ContactTag,
  ContactFilters,
  JobFilters,
  ApplicationFilters,
  InboxFilters,
  MatchResult,
  DictItem,
} from '@/types'

const hookIdle = { isLoading: false, loading: false, error: null as null }

// ==================== DICT HOOKS ====================

export function useDicts() {
  return {
    roles: mockRoles,
    subRoles: mockSubRoles,
    regions: mockRegions,
    cities: mockCities,
    availability: mockAvailability,
    experience: mockExperience,
    sources: mockSources,
    applicationStatuses: mockApplicationStatuses,
    jobStatuses: mockJobStatuses,
    accountStatuses: mockAccountStatuses,
    accountTypes: mockAccountTypes,
    checkStatuses: mockCheckStatuses,
    socialStatuses: mockSocialStatuses,
    profileTypes: mockProfileTypes,
    scopes: mockScopes,
    ...hookIdle,
  }
}

export function useDictName(list: DictItem[], id: number | null | undefined): string {
  if (!id) return '—'
  return list.find((d) => d.id === id)?.name ?? '—'
}

// ==================== CONTACTS ====================

export function useContacts(filters: ContactFilters = {}) {
  const data = useMemo(() => {
    let list = [...mockContacts]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(s) ||
          c.phone_norm?.includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.display_name?.toLowerCase().includes(s)
      )
    }
    if (filters.role) list = list.filter((c) => c.role === filters.role)
    if (filters.sub_role) list = list.filter((c) => c.sub_role === filters.sub_role)
    if (filters.region_id) list = list.filter((c) => c.region_id === filters.region_id)
    if (filters.city_id) list = list.filter((c) => c.city_id === filters.city_id)
    if (filters.availability) list = list.filter((c) => c.availability === filters.availability)
    if (filters.experience) list = list.filter((c) => c.experience === filters.experience)
    if (filters.source) list = list.filter((c) => c.source === filters.source)
    if (filters.check_status) list = list.filter((c) => c.check_status === filters.check_status)
    if (filters.profile_type) list = list.filter((c) => c.profile_type === filters.profile_type)
    if (filters.has_cv !== undefined) list = list.filter((c) => c.has_cv === filters.has_cv)
    if (filters.tags && filters.tags.length > 0) {
      const tagContactIds = mockContactTags
        .filter((t) => filters.tags!.includes(t.tag))
        .map((t) => t.contact_id)
      list = list.filter((c) => tagContactIds.includes(c.contact_id))
    }

    return list
  }, [filters])

  return { data, total: data.length, ...hookIdle }
}

export function useContact(contactId: number | undefined) {
  const data = useMemo(() => {
    if (!contactId) return null
    return mockContacts.find((c) => c.contact_id === contactId) ?? null
  }, [contactId])

  return { data, ...hookIdle }
}

// מועמדים = contact עם הגשה OR availability != null
export function useCandidates(filters: ContactFilters = {}) {
  const candidateContactIds = useMemo(() => {
    const fromApps = new Set(mockApplicationRows.map((a) => a.candidate_link).filter(Boolean))
    return mockContacts
      .filter((c) => fromApps.has(c.contact_id) || c.availability != null || c.profile_type === 1)
      .map((c) => c.contact_id)
  }, [])

  const result = useContacts(filters)
  const data = useMemo(
    () => result.data.filter((c) => candidateContactIds.includes(c.contact_id)),
    [result.data, candidateContactIds]
  )

  return { data, total: data.length, ...hookIdle }
}

// ==================== CONTACT TAGS ====================

export function useContactTags(contactId: number | undefined) {
  const data = useMemo(() => {
    if (!contactId) return []
    return mockContactTags.filter((t) => t.contact_id === contactId)
  }, [contactId])

  return { data, ...hookIdle }
}

// ==================== ACCOUNTS ====================

export function useAccounts(filters: { search?: string; account_status?: number; account_type?: number; region_id?: number; city_id?: number } = {}) {
  const data = useMemo(() => {
    let list = [...mockAccounts]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (a) =>
          a.account_name?.toLowerCase().includes(s) ||
          a.phone?.includes(s) ||
          a.email?.toLowerCase().includes(s) ||
          a.bus_id?.includes(s)
      )
    }
    if (filters.account_status) list = list.filter((a) => a.account_status === filters.account_status)
    if (filters.account_type) list = list.filter((a) => a.account_type === filters.account_type)
    if (filters.region_id) list = list.filter((a) => a.region_id === filters.region_id)
    if (filters.city_id) list = list.filter((a) => a.city_id === filters.city_id)

    return list
  }, [filters])

  return { data, total: data.length, ...hookIdle }
}

export function useAccount(accountId: number | undefined) {
  const data = useMemo(() => {
    if (!accountId) return null
    return mockAccounts.find((a) => a.account_id === accountId) ?? null
  }, [accountId])

  return { data, ...hookIdle }
}

// מעסיקים = accounts עם משרות או סטטוסים מסוימים
export function useEmployers(filters: { search?: string; account_status?: number; account_type?: number; region_id?: number } = {}) {
  const result = useAccounts(filters)
  const data = useMemo(
    () => result.data.filter((a) => a.total_jobs_count > 0 || a.account_status === 2 || a.account_status === 7 || a.account_status === 8),
    [result.data]
  )
  return { data, total: data.length, ...hookIdle }
}

// ==================== JOBS ====================

export function useJobs(filters: JobFilters = {}) {
  const data = useMemo(() => {
    let list = mockJobs.map((j) => enrichJob(j, mockAccounts))

    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (j) =>
          j.job_code?.toLowerCase().includes(s) ||
          j.job_title?.toLowerCase().includes(s) ||
          j.account_name?.toLowerCase().includes(s)
      )
    }
    if (filters.job_status) list = list.filter((j) => j.job_status === filters.job_status)
    if (filters.job_role) list = list.filter((j) => j.job_role === filters.job_role)
    if (filters.region_id) list = list.filter((j) => j.region_id === filters.region_id)
    if (filters.city_id) list = list.filter((j) => j.city_id === filters.city_id)
    if (filters.account_link) list = list.filter((j) => j.account_link === filters.account_link)

    return list
  }, [filters])

  return { data, total: data.length, ...hookIdle }
}

export function useJob(jobCode: string | undefined) {
  const data = useMemo(() => {
    if (!jobCode) return null
    const j = mockJobs.find((x) => x.job_code === jobCode)
    return j ? enrichJob(j, mockAccounts) : null
  }, [jobCode])

  const applicants = useMemo(() => {
    if (!jobCode) return [] as ApplicationEnriched[]
    return getMockApplicationsEnriched().filter((a) => a.job_code === jobCode)
  }, [jobCode])

  return { data, applicants, ...hookIdle }
}

// ==================== APPLICATIONS ====================

export function useApplications(filters: ApplicationFilters = {}) {
  const data = useMemo(() => {
    let list = [...getMockApplicationsEnriched()]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (a) =>
          a.candidate_name?.toLowerCase().includes(s) ||
          a.candidate_phone?.includes(s) ||
          a.account_name?.toLowerCase().includes(s) ||
          a.job_code?.toLowerCase().includes(s)
      )
    }
    if (filters.application_status) list = list.filter((a) => a.application_status === filters.application_status)
    if (filters.check_status) list = list.filter((a) => a.check_status === filters.check_status)
    if (filters.job_code) list = list.filter((a) => a.job_code === filters.job_code)
    if (filters.job_role) list = list.filter((a) => a.job_role === filters.job_role)

    return list
  }, [filters])

  return { data, total: data.length, ...hookIdle }
}

// ==================== INBOX ====================

export function useInbox(filters: InboxFilters = {}) {
  const data = useMemo(() => {
    let list = [...mockInboxLeads]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(
        (l) =>
          l.display_name?.toLowerCase().includes(s) ||
          l.phone?.includes(s) ||
          l.notes?.toLowerCase().includes(s)
      )
    }
    if (filters.lead_source) list = list.filter((l) => l.lead_source === filters.lead_source)
    if (filters.entity_type) list = list.filter((l) => l.entity_type === filters.entity_type)
    if (filters.is_duplicate !== undefined) list = list.filter((l) => l.is_duplicate === filters.is_duplicate)
    if (filters.action_intent) list = list.filter((l) => l.action_intent === filters.action_intent)

    return list
  }, [filters])

  return { data, total: data.length, ...hookIdle }
}

// ==================== DASHBOARD KPI ====================

export function useDashboardKPI() {
  return {
    totalContacts: mockContacts.length,
    totalCandidates: mockContacts.filter((c) => c.profile_type === 1 || c.availability != null).length,
    totalAccounts: mockAccounts.length,
    activeJobs: mockJobs.filter((j) => j.job_status === 3).length,
    totalApplications: mockApplicationRows.length,
    pendingInbox: mockInboxLeads.filter((l) => !l.action_intent).length,
    newApplicationsThisWeek: mockApplicationRows.filter((a) => a.application_status === 1).length,
    placedThisMonth: mockApplicationRows.filter((a) => a.application_status === 15).length,
    interviewsScheduled: mockApplicationRows.filter((a) => a.application_status === 5).length,
    ...hookIdle,
  }
}

// ==================== SMART MATCH ====================

export function useSmartMatch(jobCode: string | undefined) {
  const job = useMemo(() => {
    const j = mockJobs.find((x) => x.job_code === jobCode)
    return j ? enrichJob(j, mockAccounts) : null
  }, [jobCode])

  const results = useMemo<MatchResult[]>(() => {
    if (!job) return []

    return mockContacts
      .filter((c) => c.profile_type === 1 || c.availability != null)
      .map((contact) => {
        // Region score (max 40)
        let region = 0
        if (job.region_id && contact.region_id === job.region_id) region = 40
        else if (job.region_id && contact.preferred_regions?.includes(job.region_id)) region = 25
        else if (job.city_id && contact.city_id === job.city_id) region = 35

        // Role score (max 30)
        let role = 0
        if (job.job_role && contact.role === job.job_role) role = 30
        else if (job.job_role && contact.sub_role === job.job_role) role = 15

        // Experience score (max 15)
        let experience = 0
        if (job.required_experience && contact.experience) {
          if (contact.experience >= job.required_experience) experience = 15
          else if (contact.experience === job.required_experience - 1) experience = 8
        }

        // Availability score (max 15)
        let availability = 0
        if (contact.availability) {
          if (contact.availability <= 2) availability = 15
          else if (contact.availability <= 4) availability = 8
        }

        const score = region + role + experience + availability

        return {
          contact,
          score,
          breakdown: { region, role, experience, availability },
          hasExistingApplication: mockApplicationRows.some(
            (a) => a.candidate_link === contact.contact_id && a.job_code === jobCode
          ),
        }
      })
      .sort((a, b) => b.score - a.score)
  }, [job, jobCode])

  return { job, results, ...hookIdle }
}

// ==================== MUTATIONS (mock) ====================

export function useMockMutations() {
  const updateContact = useCallback((id: number, updates: Partial<Contact>) => {
    console.log('Mock: updateContact', id, updates)
    return Promise.resolve()
  }, [])

  const createContact = useCallback((data: Partial<Contact>) => {
    console.log('Mock: createContact', data)
    return Promise.resolve({ contact_id: Date.now() })
  }, [])

  const updateAccount = useCallback((id: number, updates: Partial<Account>) => {
    console.log('Mock: updateAccount', id, updates)
    return Promise.resolve()
  }, [])

  const createJob = useCallback((data: Partial<Job>) => {
    console.log('Mock: createJob', data)
    return Promise.resolve({ job_code: 'NEW' + Date.now() })
  }, [])

  const updateApplication = useCallback((id: number, updates: Partial<Application>) => {
    console.log('Mock: updateApplication', id, updates)
    return Promise.resolve()
  }, [])

  const processInboxLead = useCallback((id: number, action: string, data?: Record<string, unknown>) => {
    console.log('Mock: processInboxLead', id, action, data)
    return Promise.resolve()
  }, [])

  return { updateContact, createContact, updateAccount, createJob, updateApplication, processInboxLead }
}
