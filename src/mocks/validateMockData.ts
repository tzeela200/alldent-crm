// =====================================================
// AllDent CRM — Mock data integrity (DEV / manual)
// Schema gaps: log only; do not block production from missing live introspection
// =====================================================

import { mockAccounts, mockApplicationRows, mockContacts, mockContactTags, mockInboxLeads, mockJobs } from '@/mocks/data'
import {
  mockAccountStatuses,
  mockAccountTypes,
  mockApplicationStatuses,
  mockAvailability,
  mockCheckStatuses,
  mockCities,
  mockExperience,
  mockJobStatuses,
  mockProfileTypes,
  mockRegions,
  mockRoles,
  mockSocialStatuses,
  mockSources,
  mockSubRoles,
} from '@/mocks/dicts'

const dictIds = (d: { id: number }[]) => new Set(d.map((x) => x.id))

function inDict(set: Set<number>, id: number | null | undefined, label: string, errors: string[]) {
  if (id == null) return
  if (!set.has(id)) errors.push(`${label}: invalid dict id ${id}`)
}

export function validateMockData(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  const regions = dictIds(mockRegions)
  const cities = dictIds(mockCities)
  const roles = dictIds(mockRoles)
  const subRoles = dictIds(mockSubRoles)
  const availability = dictIds(mockAvailability)
  const experience = dictIds(mockExperience)
  const sources = dictIds(mockSources)
  const profileTypes = dictIds(mockProfileTypes)
  const checkStatuses = dictIds(mockCheckStatuses)
  const socialStatuses = dictIds(mockSocialStatuses)
  const appStatuses = dictIds(mockApplicationStatuses)
  const jobStatuses = dictIds(mockJobStatuses)
  const accountStatuses = dictIds(mockAccountStatuses)
  const accountTypes = dictIds(mockAccountTypes)

  const accountIds = new Set(mockAccounts.map((a) => a.account_id))
  const contactIds = new Set(mockContacts.map((c) => c.contact_id))
  const jobCodes = new Set(mockJobs.map((j) => j.job_code))

  for (const c of mockContacts) {
    if (!String(c.phone_norm ?? '').trim()) errors.push(`contact ${c.contact_id}: empty phone_norm`)
    inDict(regions, c.region_id, `contact ${c.contact_id} region_id`, errors)
    inDict(cities, c.city_id, `contact ${c.contact_id} city_id`, errors)
    inDict(roles, c.role, `contact ${c.contact_id} role`, errors)
    inDict(subRoles, c.sub_role, `contact ${c.contact_id} sub_role`, errors)
    inDict(availability, c.availability, `contact ${c.contact_id} availability`, errors)
    inDict(experience, c.experience, `contact ${c.contact_id} experience`, errors)
    inDict(sources, c.source, `contact ${c.contact_id} source`, errors)
    inDict(profileTypes, c.profile_type, `contact ${c.contact_id} profile_type`, errors)
    inDict(checkStatuses, c.check_status, `contact ${c.contact_id} check_status`, errors)
    inDict(socialStatuses, c.social_status, `contact ${c.contact_id} social_status`, errors)
    if (c.account_link != null && !accountIds.has(c.account_link)) {
      errors.push(`contact ${c.contact_id}: account_link ${c.account_link} missing in accounts`)
    }
  }

  for (const a of mockAccounts) {
    inDict(accountStatuses, a.account_status, `account ${a.account_id} account_status`, errors)
    inDict(accountTypes, a.account_type, `account ${a.account_id} account_type`, errors)
    inDict(regions, a.region_id, `account ${a.account_id} region_id`, errors)
    inDict(cities, a.city_id, `account ${a.account_id} city_id`, errors)
  }

  for (const j of mockJobs) {
    if (!String(j.job_code ?? '').trim()) errors.push('job: empty job_code')
    inDict(jobStatuses, j.job_status, `job ${j.job_code} job_status`, errors)
    inDict(roles, j.job_role, `job ${j.job_code} job_role`, errors)
    inDict(regions, j.region_id, `job ${j.job_code} region_id`, errors)
    inDict(cities, j.city_id, `job ${j.job_code} city_id`, errors)
    inDict(experience, j.required_experience, `job ${j.job_code} required_experience`, errors)
    if (j.account_link != null && !accountIds.has(j.account_link)) {
      errors.push(`job ${j.job_code}: account_link ${j.account_link} missing in accounts`)
    }
    if (j.rel_employer_contact != null && !contactIds.has(j.rel_employer_contact)) {
      errors.push(`job ${j.job_code}: rel_employer_contact ${j.rel_employer_contact} missing in contact`)
    }
  }

  for (const r of mockApplicationRows) {
    inDict(appStatuses, r.application_status, `application ${r.application_id} application_status`, errors)
    inDict(checkStatuses, r.check_status, `application ${r.application_id} check_status`, errors)
    if (r.job_code && !jobCodes.has(r.job_code)) {
      errors.push(`application ${r.application_id}: job_code ${r.job_code} missing in job`)
    }
    if (r.candidate_link != null && !contactIds.has(r.candidate_link)) {
      errors.push(`application ${r.application_id}: candidate_link ${r.candidate_link} missing in contact`)
    }
  }

  for (const t of mockContactTags) {
    if (!contactIds.has(t.contact_id)) {
      errors.push(`contact_tags id ${t.id}: contact_id ${t.contact_id} missing`)
    }
  }

  for (const l of mockInboxLeads) {
    inDict(sources, l.lead_source, `inbox ${l.lead_id} lead_source`, errors)
    if (l.match_contact != null && !contactIds.has(l.match_contact)) {
      errors.push(`inbox ${l.lead_id}: match_contact ${l.match_contact} missing`)
    }
    if (l.match_account != null && !accountIds.has(l.match_account)) {
      errors.push(`inbox ${l.lead_id}: match_account ${l.match_account} missing`)
    }
  }

  return { ok: errors.length === 0, errors }
}
