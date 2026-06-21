import { useState } from 'react'
import { Plus, X, Search, AlertTriangle } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { useApplicationDicts } from '@/hooks/useApplicationDicts'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { normalizePhone } from '@/lib/normalizePhone'
import { toast } from 'sonner'
import type { Contact, DictItem } from '@/types'

interface Props {
  onClose: () => void
  onCreated: (applicationId: number) => void
}

interface JobResult {
  job_code: string
  job_title: string | null
  job_status: number | null
  job_role: number | null
  job_url: string | null
  city_id: number | null
  region_id: number | null
  account_link: number | null
  account_name: string | null
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function getDictLabel(items: DictItem[] | undefined, id: number | null | undefined): string {
  if (!items || id == null) return '—'
  return items.find((item) => item.id === id)?.name ?? String(id)
}

export function ManualCreateDialog({ onClose, onCreated }: Props) {
  const { createApplication } = useApplicationMutations()
  const { data: dicts } = useApplicationDicts()
  const [contactSearch, setContactSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null)
  const [submissionDate, setSubmissionDate] = useState(todayInputValue())
  const [appStatus, setAppStatus] = useState<number>(1)
  const [checkStatus, setCheckStatus] = useState<number | ''>('')
  const [source, setSource] = useState<number | ''>('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [candidateNotes, setCandidateNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Cities and jobStatuses are now part of useApplicationDicts
  const cities = dicts?.cities
  const jobStatuses = dicts?.jobStatuses

  const jobStatusLabel = getDictLabel(jobStatuses, selectedJob?.job_status)
  const jobRoleLabel = getDictLabel(dicts?.roles, selectedJob?.job_role)
  const jobCityLabel = getDictLabel(cities, selectedJob?.city_id)
  const jobRegionLabel = getDictLabel(dicts?.regions, selectedJob?.region_id)
  const isInactiveJob = selectedJob?.job_status != null && selectedJob.job_status !== 3

  // Live contact search
  const { data: contactResults } = useQuery({
    queryKey: ['contact-search', contactSearch],
    queryFn: async () => {
      if (contactSearch.length < 2) return []
      const { data } = await supabase
        .from('contact')
        .select('contact_id, display_name, full_name, phone, phone_norm, email, role, city_id, region_id, availability, cv_link, has_cv')
        .or(
          `full_name.ilike.%${contactSearch}%,display_name.ilike.%${contactSearch}%,phone.ilike.%${contactSearch}%,phone_norm.ilike.%${contactSearch}%`
        )
        .limit(10)
      return (data ?? []) as Contact[]
    },
    enabled: contactSearch.length >= 2,
    staleTime: 10_000,
  })

  // Live job search — resolves city/region via dicts at render time (no dict joins needed)
  const { data: jobResults } = useQuery({
    queryKey: ['job-search', jobSearch],
    queryFn: async () => {
      if (jobSearch.length < 2) return []
      const { data } = await supabase
        .from('job')
        .select('job_code, job_title, job_status, job_role, job_url, city_id, region_id, account_link, accounts(account_name)')
        .or(`job_code.ilike.%${jobSearch}%,job_title.ilike.%${jobSearch}%`)
        .limit(10)
      return (data ?? []).map((j: any) => ({
        ...j,
        account_name: Array.isArray(j.accounts)
          ? j.accounts[0]?.account_name ?? null
          : j.accounts?.account_name ?? null,
      })) as JobResult[]
    },
    enabled: jobSearch.length >= 2,
    staleTime: 10_000,
  })

  const handleSubmit = async () => {
    if (!selectedContact) {
      toast.error('יש לבחור מועמד קיים כדי ליצור הגשה ידנית')
      return
    }
    if (!selectedJob) {
      toast.error('יש לבחור משרה')
      return
    }

    const phoneNorm = selectedContact.phone_norm ?? normalizePhone(selectedContact.phone ?? '')
    if (!phoneNorm) {
      toast.error('למועמד אין טלפון תקין — לא ניתן למנוע כפילות בהגשה')
      return
    }

    // Duplicate guard: same phone cannot be submitted twice to the same job
    const { count } = await supabase
      .from('applications')
      .select('application_id', { count: 'exact', head: true })
      .eq('job_code', selectedJob.job_code)
      .eq('phone_norm', phoneNorm)
    if ((count ?? 0) > 0) {
      toast.error('כבר קיימת הגשה למועמד זה למשרה זו')
      return
    }

    setSaving(true)
    try {
      // TODO: master_availability/master_role/master_city/master_region נשמרים כ-ID בתוך string.
      // לא לשנות DB כאן; אם מציגים אותם, להציג label לפי מילון ולא ID.
      const id = await createApplication.mutateAsync({
        submission_date: submissionDate
          ? new Date(submissionDate).toISOString()
          : new Date().toISOString(),
        form_title: 'יצירה ידנית',
        job_code: selectedJob.job_code,
        job_link: selectedJob.job_url ?? null,
        account_name: selectedJob.account_name ?? null,
        account_link: selectedJob.account_link ?? null,
        job_role: jobRoleLabel !== '—' ? jobRoleLabel : null,
        job_city: jobCityLabel !== '—' ? jobCityLabel : null,
        job_region: jobRegionLabel !== '—' ? jobRegionLabel : null,
        job_city_id: selectedJob.city_id ?? null,
        job_region_id: selectedJob.region_id ?? null,
        candidate_phone: selectedContact.phone ?? null,
        candidate_name: selectedContact.full_name ?? selectedContact.display_name ?? null,
        candidate_email: selectedContact.email ?? null,
        cv_link: selectedContact.cv_link ?? null,
        candidate_link: selectedContact.contact_id,
        candidate_notes: candidateNotes || null,
        check_status: checkStatus !== '' ? Number(checkStatus) : null,
        application_status: appStatus,
        master_availability: String(selectedContact.availability ?? ''),
        master_role: String(selectedContact.role ?? ''),
        master_city: String(selectedContact.city_id ?? ''),
        master_region: String(selectedContact.region_id ?? ''),
        internal_notes: internalNotes || null,
        phone_norm: phoneNorm,
        source: source !== '' ? Number(source) : null,
        is_manual: true,
        is_new_candidate: false,
        follow_up_date: followUpDate || null,
        assigned_to: null,
        has_cv: selectedContact.has_cv ?? false,
        cv_storage_path: null,
        cv_received_date: null,
      })
      toast.success('הגשה ידנית נוצרה בהצלחה')
      onCreated(id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">יצירת הגשה ידנית</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {/* Contact selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                מועמד קיים במאגר
              </label>
              {selectedContact ? (
                <div className="flex items-center justify-between rounded-xl border border-teal-300 bg-teal-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-teal-800">
                      {selectedContact.full_name ?? selectedContact.display_name}
                    </p>
                    <p className="text-xs text-teal-600" dir="ltr">
                      {selectedContact.phone}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="text-teal-400 hover:text-teal-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="חיפוש לפי שם / טלפון..."
                      className="h-10 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  {contactResults && contactResults.length > 0 && (
                    <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                      {contactResults.map((c) => (
                        <button
                          key={c.contact_id}
                          onClick={() => {
                            setSelectedContact(c)
                            setContactSearch('')
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-right hover:bg-slate-50"
                        >
                          <span className="text-sm font-medium">
                            {c.full_name ?? c.display_name}
                          </span>
                          <span className="text-xs text-slate-400" dir="ltr">
                            {c.phone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Job selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">משרה</label>
              {selectedJob ? (
                <div className="space-y-2 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-teal-800">
                        {selectedJob.job_code} · {selectedJob.job_title ?? 'ללא כותרת'}
                      </p>
                      <p className="text-xs text-teal-700">
                        ארגון: {selectedJob.account_name ?? '—'}
                      </p>
                      <p className="text-xs text-teal-700">
                        סטטוס משרה: {jobStatusLabel} · עיר משרה: {jobCityLabel} · אזור משרה: {jobRegionLabel}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="text-teal-400 hover:text-teal-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {isInactiveJob && (
                    <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      המשרה אינה פעילה. באדמין ניתן להמשיך, אבל יש לשים לב.
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      placeholder="חיפוש לפי קוד / כותרת משרה..."
                      className="h-10 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  {jobResults && jobResults.length > 0 && (
                    <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                      {jobResults.map((j) => {
                        const statusLabel = getDictLabel(jobStatuses, j.job_status)
                        const cityLabel = getDictLabel(cities, j.city_id)
                        const regionLabel = getDictLabel(dicts?.regions, j.region_id)
                        const inactive = j.job_status != null && j.job_status !== 3
                        return (
                          <button
                            key={j.job_code}
                            onClick={() => {
                              setSelectedJob(j)
                              setJobSearch('')
                            }}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-right hover:bg-slate-50"
                          >
                            <span className="text-sm font-medium text-slate-800">
                              {j.job_code} · {j.job_title ?? 'ללא כותרת'}
                            </span>
                            <span className="text-xs text-slate-500">
                              ארגון: {j.account_name ?? '—'} · סטטוס משרה: {statusLabel}
                            </span>
                            <span className="text-xs text-slate-400">
                              עיר משרה: {cityLabel} · אזור משרה: {regionLabel}
                            </span>
                            {inactive && (
                              <span className="text-xs font-medium text-amber-600">
                                המשרה אינה פעילה
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">תאריך הגשה</label>
                <input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">תאריך פעולה הבאה</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Status + check */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">סטטוס הגשה</label>
                <select
                  dir="rtl"
                  value={appStatus}
                  onChange={(e) => setAppStatus(Number(e.target.value))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  {(dicts?.applicationStatuses ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">סטטוס בדיקה</label>
                <select
                  dir="rtl"
                  value={checkStatus}
                  onChange={(e) => setCheckStatus(e.target.value ? Number(e.target.value) : '')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="">לא מוגדר</option>
                  {(dicts?.checkStatuses ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">מקור</label>
              <select
                dir="rtl"
                value={source}
                onChange={(e) => setSource(e.target.value ? Number(e.target.value) : '')}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">לא מוגדר</option>
                {(dicts?.sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">הערות מועמד</label>
              <textarea
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
                rows={2}
                className="resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
                placeholder="מה המועמד אמר / ביקש..."
              />
            </div>

            {/* Internal notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">הערות פנימיות</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
                placeholder="הערה פנימית לצוות..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              ביטול
            </button>
            <ActionButton variant="primary" icon={Plus} onClick={handleSubmit} disabled={saving}>
              {saving ? 'שומר...' : 'צור הגשה'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}
