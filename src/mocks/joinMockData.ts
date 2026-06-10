// =====================================================
// AllDent CRM — Mock join layer (Supabase-shaped raw rows + UI projection)
// Enriched fields are NOT stored on mock table literals in data.ts
// =====================================================

import type { Account, ApplicationEnriched, ApplicationRow, Contact, DictItem, Job } from '@/types'
import { mockAccounts, mockApplicationRows, mockContacts, mockJobs } from '@/mocks/data'
import {
  mockApplicationStatuses,
  mockAvailability,
  mockCheckStatuses,
  mockCities,
  mockJobStatuses,
  mockRegions,
  mockRoles,
} from '@/mocks/dicts'

/** Aligns with useDashboardKPI / dict "פעילה" (id 3) for mock active-job counts */
export const ACTIVE_MOCK_JOB_STATUS_ID = 3

export function isActiveMockJob(job: Pick<Job, 'job_status'>): boolean {
  return Number(job.job_status) === ACTIVE_MOCK_JOB_STATUS_ID
}

function dictName(list: DictItem[], id: number | null | undefined): string {
  if (id == null) return '—'
  return list.find((d) => d.id === id)?.name ?? '—'
}

function heDisplayDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('he-IL')
}

/** Demo-only labels not carried on ApplicationRow — replace when pipeline metadata exists in DB */
const APPLICATION_DEMO_META: Partial<
  Record<
    number,
    {
      record_name: string
      form_title: string
      job_link: string | null
      candidate_notes: string | null
      record_quality: string | null
      status_in_master: string | null
    }
  >
> = {
  1: {
    record_name: 'APP-001',
    form_title: 'הגשת מועמדות',
    job_link: null,
    candidate_notes: 'מעוניינת מאוד, זמינה מיידית',
    record_quality: null,
    status_in_master: null,
  },
  2: {
    record_name: 'APP-002',
    form_title: 'טופס Fillout',
    job_link: null,
    candidate_notes: null,
    record_quality: null,
    status_in_master: null,
  },
  3: {
    record_name: 'APP-003',
    form_title: 'הגשה ישירה',
    job_link: null,
    candidate_notes: null,
    record_quality: 'ממתין לבדיקה',
    status_in_master: null,
  },
  4: {
    record_name: 'APP-004',
    form_title: 'טופס מועמדות',
    job_link: null,
    candidate_notes: 'מעדיפה ימים א-ג',
    record_quality: null,
    status_in_master: null,
  },
  5: {
    record_name: 'APP-005',
    form_title: 'Smart Match',
    job_link: null,
    candidate_notes: null,
    record_quality: null,
    status_in_master: null,
  },
}

export function enrichJob(job: Job, accounts: Account[]): Job {
  const acc =
    job.account_link != null ? accounts.find((a) => a.account_id === job.account_link) : undefined
  return { ...job, account_name: acc?.account_name ?? undefined }
}

export function enrichJobs(jobs: Job[], accounts: Account[]): Job[] {
  return jobs.map((j) => enrichJob(j, accounts))
}

export function enrichApplication(
  row: ApplicationRow,
  ctx: {
    contacts: Contact[]
    jobs: Job[]
    accounts: Account[]
  },
): ApplicationEnriched {
  const contact = row.candidate_link != null ? ctx.contacts.find((c) => c.contact_id === row.candidate_link) : undefined
  const job = row.job_code ? ctx.jobs.find((j) => j.job_code === row.job_code) : undefined
  const jobEnriched = job ? enrichJob(job, ctx.accounts) : undefined
  const meta = APPLICATION_DEMO_META[row.application_id]
  const isClientCreated = row.application_id >= 1_000_000_000_000

  const jobRoleLabel = job ? dictName(mockRoles, job.job_role) : '—'
  const jobCity = job ? dictName(mockCities, job.city_id) : '—'
  const jobRegion = job ? dictName(mockRegions, job.region_id) : '—'
  const jobStatusView = job ? dictName(mockJobStatuses, job.job_status) : '—'

  return {
    ...row,
    record_name: meta?.record_name ?? `APP-${row.application_id}`,
    display_date: heDisplayDate(row.submission_date),
    form_title: meta?.form_title ?? (isClientCreated ? 'יצירה מתוך Candidate 360' : 'הגשה'),
    job_link: meta?.job_link ?? null,
    account_name: jobEnriched?.account_name ?? null,
    job_role: jobRoleLabel,
    job_city: jobCity,
    job_region: jobRegion,
    candidate_phone: contact?.phone ?? null,
    candidate_name: contact?.full_name ?? contact?.display_name ?? null,
    candidate_email: contact?.email ?? null,
    cv_link: contact?.cv_link ?? null,
    candidate_notes: meta?.candidate_notes ?? null,
    status_in_master: meta?.status_in_master ?? null,
    job_status_view: jobStatusView,
    master_availability: dictName(mockAvailability, contact?.availability),
    master_role: dictName(mockRoles, contact?.role),
    master_city: dictName(mockCities, contact?.city_id),
    master_region: dictName(mockRegions, contact?.region_id),
    record_quality:
      meta?.record_quality ??
      (isClientCreated ? 'חדש' : row.check_status === 1 ? dictName(mockCheckStatuses, 1) : null),
  }
}

let _applicationsEnrichedCache: ApplicationEnriched[] | null = null

export function getMockApplicationsEnriched(): ApplicationEnriched[] {
  if (!_applicationsEnrichedCache) {
    const ctx = { contacts: mockContacts, jobs: mockJobs, accounts: mockAccounts }
    _applicationsEnrichedCache = mockApplicationRows.map((row) => enrichApplication(row, ctx))
  }
  return _applicationsEnrichedCache
}

/** For screens that need jobs with account_name without importing enrichJobs repeatedly */
export const mockJobsEnriched: Job[] = enrichJobs(mockJobs, mockAccounts)
