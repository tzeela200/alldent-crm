import React, { useEffect, useMemo, useState } from 'react'
import { useJobMutations } from '@/hooks/useJobMutations'
import JobAIWriter from '@/components/admin/JobAIWriter'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, Briefcase, Building2, CheckCircle2, ChevronLeft, Copy, FileText, Image as ImageIcon, MapPin, Save, Send, Sparkles, Users, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Shell, ActionButton, EmptyState } from '@/components/layout/Shell'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/timeAgo'
import JobImageUpload from '@/components/admin/JobImageUpload'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { ContactPicker } from '@/components/ui/ContactPicker'

type DictItem = { id: number; name: string; role_id?: number | null; region_id?: number | null }
type ToastTone = 'success' | 'error' | 'info'
type ToastState = { open: boolean; message: string; tone: ToastTone }

type JobDraft = {
  job_code: string
  job_title: string
  job_status: string
  public_status: string
  job_role: string
  job_sub_role: number[]
  account_link: string
  rel_employer_contact: string
  rel_recruiter_contact: string
  region_id: string
  city_id: string
  address: string
  scope: number[]
  required_experience: string
  required_languages: number[]
  systems_used: number[]
  tax_type_id: string
  mobility_id: string
  salary_expectation_hourly: string
  salary_expectation_monthly: string
  show_salary_public: boolean
  salary_type_ids: number[]
  work_schedule_text: string
  job_description: string
  job_requirements: string
  employer_notes: string
  notes: string
  public_excerpt: string
  public_image_url: string
  job_url: string
}

const JOB_STATUS_ACTIVE = 3
const PUBLIC_STATUS_PUBLISHED = 3
const PUBLIC_STATUS_HIDDEN = 4

export default function JobDetailsPage() {
  const { updateJob } = useJobMutations()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [localJob, setLocalJob] = useState<any | null>(null)
  const [draft, setDraft] = useState<JobDraft | null>(null)
  const [editing, setEditing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })

  const fetchDict = async (table: string): Promise<DictItem[]> => {
    const { data, error } = await supabase.from(table).select('id,name').order('name')
    if (error) throw error
    return (data ?? []) as DictItem[]
  }

  const { data: jobData, refetch } = useQuery({
    queryKey: ['job-detail', code],
    queryFn: async () => {
      const { data, error } = await supabase.from('job').select('*').eq('job_code', code).single()
      if (error) throw error
      return data
    },
    enabled: !!code,
    staleTime: 30_000,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-for-job-detail'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name').order('account_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })
  const { data: jobStatuses = [] } = useQuery({ queryKey: ['dict_job_statuses'], queryFn: () => fetchDict('dict_job_statuses'), staleTime: 600_000 })
  const { data: publicStatuses = [] } = useQuery({ queryKey: ['dict_public_statuses'], queryFn: () => fetchDict('dict_public_statuses'), staleTime: 600_000 })
  const { data: roles = [] } = useQuery({ queryKey: ['dict_roles'], queryFn: () => fetchDict('dict_roles'), staleTime: 600_000 })
  const { data: subRoles = [] } = useQuery({
    queryKey: ['dict_sub_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_sub_roles').select('id,name,role_id').order('name')
      if (error) throw error
      return (data ?? []) as DictItem[]
    },
    staleTime: 600_000,
  })
  const { data: regions = [] } = useQuery({ queryKey: ['dict_regions'], queryFn: () => fetchDict('dict_regions'), staleTime: 600_000 })
  const { data: cities = [] } = useQuery({
    queryKey: ['dict_cities', 'all-for-job-detail'],
    queryFn: async () => {
      // Supabase/PostgREST מחזיר ברירת מחדל עד 1,000 רשומות.
      // במילון הערים יש יותר מזה, ולכן ערים בסוף הא״ב כמו שוהם עלולות לא להופיע בלי pagination.
      const PAGE = 1000
      const all: DictItem[] = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('dict_cities')
          .select('id,name,region_id')
          .order('name')
          .range(from, from + PAGE - 1)

        if (error) throw error
        const batch = (data ?? []) as DictItem[]
        if (!batch.length) break

        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }

      return all
    },
    staleTime: 600_000,
  })
  const { data: scopes = [] } = useQuery({ queryKey: ['dict_scopes'], queryFn: () => fetchDict('dict_scopes'), staleTime: 600_000 })
  const { data: experience = [] } = useQuery({ queryKey: ['dict_experience'], queryFn: () => fetchDict('dict_experience'), staleTime: 600_000 })
  const { data: languages = [] } = useQuery({ queryKey: ['dict_languages'], queryFn: () => fetchDict('dict_languages'), staleTime: 600_000 })
  const { data: systems = [] } = useQuery({ queryKey: ['dict_systems'], queryFn: () => fetchDict('dict_systems'), staleTime: 600_000 })
  const { data: taxTypes = [] } = useQuery({ queryKey: ['dict_tax_types'], queryFn: () => fetchDict('dict_tax_types'), staleTime: 600_000 })
  const { data: mobility = [] } = useQuery({ queryKey: ['dict_mobility'], queryFn: () => fetchDict('dict_mobility'), staleTime: 600_000 })
  const { data: salaryTypes = [] } = useQuery({ queryKey: ['dict_salary_types'], queryFn: () => fetchDict('dict_salary_types'), staleTime: 600_000 })

  const { data: applicationStatuses = [] } = useQuery({ queryKey: ['dict_application_statuses'], queryFn: () => fetchDict('dict_application_statuses'), staleTime: 600_000 })

  const { data: applications = [] } = useQuery({
    queryKey: ['applications-for-job', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('application_id,candidate_link,candidate_name,candidate_phone,application_status,check_status,submission_date,cv_link,contact:candidate_link(full_name,display_name)')
        .eq('job_code', code!)
        .order('submission_date', { ascending: false })
      if (error) throw error
      // Hide spam (check_status=2) and archived (application_status=15) from the job's candidate list.
      return (data ?? []).filter((a: any) => Number(a.check_status) !== 2 && Number(a.application_status) !== 15)
    },
    enabled: !!code,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!cities.length || !draft) return
    if (draft.region_id || !draft.city_id) return
    const found = cities.find((c) => String(c.id) === String(draft.city_id))
    if (found?.region_id) setDraft((prev) => prev ? { ...prev, region_id: String(found.region_id) } : prev)
  }, [cities, draft?.city_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!jobData) return
    setLocalJob(jobData)
    setDraft(toDraft(jobData))
  }, [jobData])

  const cityOptions = useMemo(() => {
    const regionId = Number(draft?.region_id || 0)
    return regionId ? cities.filter((city) => Number(city.region_id) === regionId) : cities
  }, [cities, draft?.region_id])

  const subRoleOptions = useMemo(() => {
    const roleId = Number(draft?.job_role || 0)
    return roleId ? subRoles.filter((item) => Number(item.role_id) === roleId) : subRoles
  }, [subRoles, draft?.job_role])

  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, message, tone })
    window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2600)
  }

  const setField = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const setJobCity = (cityId: string) => {
    const selectedCity = cities.find((city) => Number(city.id) === Number(cityId))
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        city_id: cityId,
        region_id: selectedCity?.region_id ? String(selectedCity.region_id) : prev.region_id,
      }
    })
  }

  const saveJob = async () => {
    if (!draft || !localJob) return
    setSaving(true)
    try {
      const nextJobStatus = toNullableNumber(draft.job_status)
      const mustHide = nextJobStatus !== JOB_STATUS_ACTIVE
      const nextPublicStatus = mustHide ? PUBLIC_STATUS_HIDDEN : toNullableNumber(draft.public_status)
      const newJobCode = cleanText(draft.job_code) || localJob.job_code
      const patch = {
        job_code: newJobCode,
        job_title: cleanText(draft.job_title),
        job_status: nextJobStatus,
        public_status: nextPublicStatus,
        job_role: toNullableNumber(draft.job_role),
        job_sub_role: draft.job_sub_role.length ? draft.job_sub_role : [],
        account_link: toNullableNumber(draft.account_link),
        rel_employer_contact: toNullableNumber(draft.rel_employer_contact),
        rel_recruiter_contact: toNullableNumber(draft.rel_recruiter_contact),
        region_id: toNullableNumber(draft.region_id),
        city_id: toNullableNumber(draft.city_id),
        address: cleanText(draft.address),
        scope: draft.scope.length ? draft.scope : [],
        required_experience: toNullableNumber(draft.required_experience),
        required_languages: draft.required_languages.length ? draft.required_languages : [],
        systems_used: draft.systems_used.length ? draft.systems_used : [],
        salary_type_ids: draft.salary_type_ids.length ? draft.salary_type_ids : [],
        tax_type_id: toNullableNumber(draft.tax_type_id),
        mobility_id: toNullableNumber(draft.mobility_id),
        salary_expectation_hourly: toNullableNumber(draft.salary_expectation_hourly),
        salary_expectation_monthly: toNullableNumber(draft.salary_expectation_monthly),
        show_salary_public: draft.show_salary_public,
        work_schedule_text: cleanText(draft.work_schedule_text),
        job_description: cleanText(draft.job_description),
        job_requirements: cleanText(draft.job_requirements),
        employer_notes: cleanText(draft.employer_notes),
        notes: cleanText(draft.notes),
        public_excerpt: cleanText(draft.public_excerpt),
        public_image_url: cleanText(draft.public_image_url),
        job_url: cleanText(draft.job_url),
        unpublished_at: mustHide ? new Date().toISOString() : localJob.unpublished_at,
        updated_timestamp: new Date().toISOString(),
      }
      const { error } = await updateJob(localJob.job_code, patch)
      if (error) throw error
      setLocalJob((prev: any) => ({ ...prev, ...patch }))
      showToast(mustHide ? 'המשרה נשמרה והפרסום הוסתר' : 'המשרה נשמרה', 'success')
      if (newJobCode !== localJob.job_code) navigate(`/admin/jobs/${encodeURIComponent(String(newJobCode))}`, { replace: true })
      else void refetch()
    } catch (err) {
      console.error(err)
      showToast(err instanceof Error ? err.message : 'שגיאה בשמירת המשרה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const publishJob = async () => {
    if (!localJob) return
    if (Number(localJob.job_status) !== JOB_STATUS_ACTIVE) {
      showToast('לא ניתן לפרסם משרה שאינה בסטטוס פעילה', 'error')
      return
    }
    const patch = {
      public_status: PUBLIC_STATUS_PUBLISHED,
      last_publish_date: todayIsoDate(),
      date_website: localJob.date_website ?? todayIsoDate(),
      published_at: localJob.published_at ?? new Date().toISOString(),
      unpublished_at: null,
      updated_timestamp: new Date().toISOString(),
    }
    const { error } = await updateJob(localJob.job_code, patch)
    if (error) { showToast(error.message, 'error'); return }
    setLocalJob((prev: any) => ({ ...prev, ...patch }))
    setDraft((prev) => prev ? { ...prev, public_status: String(PUBLIC_STATUS_PUBLISHED) } : prev)
    showToast('המשרה פורסמה', 'success')
  }

  const hidePublication = async () => {
    if (!localJob) return
    const patch = { public_status: PUBLIC_STATUS_HIDDEN, unpublished_at: new Date().toISOString(), updated_timestamp: new Date().toISOString() }
    const { error } = await updateJob(localJob.job_code, patch)
    if (error) { showToast(error.message, 'error'); return }
    setLocalJob((prev: any) => ({ ...prev, ...patch }))
    setDraft((prev) => prev ? { ...prev, public_status: String(PUBLIC_STATUS_HIDDEN) } : prev)
    showToast('המשרה הוסתרה מהציבור', 'success')
  }

  const archiveJob = async () => {
    if (!localJob) return
    const patch = { job_status: 9, public_status: PUBLIC_STATUS_HIDDEN, unpublished_at: new Date().toISOString(), updated_timestamp: new Date().toISOString() }
    const { error } = await updateJob(localJob.job_code, patch)
    if (error) { showToast(error.message, 'error'); return }
    setLocalJob((prev: any) => ({ ...prev, ...patch }))
    setDraft((prev) => prev ? { ...prev, job_status: '9', public_status: String(PUBLIC_STATUS_HIDDEN) } : prev)
    showToast('המשרה הועברה לארכיון והוסתרה', 'success')
  }

  if (!localJob || !draft) {
    return <Shell title="משרה" subtitle="" icon={Briefcase}><div className="rounded-2xl border border-[#D9D9D9] bg-white p-8"><EmptyState icon={Briefcase} title="משרה לא נמצאה" description="הרשומה לא קיימת" /></div></Shell>
  }

  const accountName = (accounts as any[]).find((a) => Number(a.account_id) === Number(localJob.account_link))?.account_name ?? '—'
  const regionName = labelById(regions, localJob.region_id)
  const cityName = labelById(cities, localJob.city_id)
  const roleName = labelById(roles, localJob.job_role)
  const statusName = labelById(jobStatuses, localJob.job_status)
  const publicStatusName = labelById(publicStatuses, localJob.public_status)
  const isActive = Number(localJob.job_status) === JOB_STATUS_ACTIVE
  const isPublished = Number(localJob.public_status) === PUBLIC_STATUS_PUBLISHED

  return (
    <Shell
      title={`${localJob.job_code} — ${localJob.job_title ?? 'משרה'}`}
      subtitle={`${accountName} · ${cityName}`}
      icon={Briefcase}
      actions={<div className="flex flex-wrap gap-2"><ActionButton variant="ghost" icon={ChevronLeft} onClick={() => navigate('/admin/jobs')}>חזרה ללוח</ActionButton><ActionButton variant="primary" icon={Save} onClick={saveJob} disabled={saving}>{saving ? 'שומרת...' : 'שמירה'}</ActionButton></div>}
    >
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] font-['Heebo'] text-[#2D2D2D]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          <main className="space-y-6">
            <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2"><Pill text={statusName} tone={isActive ? 'success' : 'muted'} /><Pill text={publicStatusName} tone={isPublished ? 'success' : 'muted'} /></div>
                <div className="flex flex-wrap gap-2"><ActionButton variant="ghost" icon={Send} onClick={publishJob}>פרסום</ActionButton><ActionButton variant="ghost" icon={XCircle} onClick={hidePublication}>הסתרה</ActionButton><ActionButton variant="ghost" icon={Archive} onClick={archiveJob}>ארכוב</ActionButton></div>
              </div>
              <SectionTitle icon={<Briefcase className="h-5 w-5" />} title="עריכת משרה מלאה" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextField label="קוד משרה" value={draft.job_code} onChange={(value) => setField('job_code', value)} dir="ltr" />
                <TextField label="כותרת משרה" value={draft.job_title} onChange={(value) => setField('job_title', value)} labelSuffix={<JobAIWriter mode="admin" field="job_title" currentValue={draft.job_title} jobContext={{ role: draft.job_role }} onApply={(v) => setField('job_title', v)} />} />
                <SelectField label="סטטוס פעילות" value={draft.job_status} onChange={(value) => setField('job_status', value)} options={jobStatuses.map(toOption)} />
                <SelectField label="סטטוס פרסום" value={draft.public_status} onChange={(value) => setField('public_status', value)} options={publicStatuses.map(toOption)} />
                <SelectField label="ארגון" value={draft.account_link} onChange={(value) => setField('account_link', value)} options={(accounts as any[]).map((a) => ({ value: String(a.account_id), label: a.account_name ?? '' }))} />
                <ContactPicker label="מעסיק / איש קשר" value={draft.rel_employer_contact ? Number(draft.rel_employer_contact) : null} onChange={(id) => setField('rel_employer_contact', id ? String(id) : '')} />
                <ContactPicker label="מגייס" value={draft.rel_recruiter_contact ? Number(draft.rel_recruiter_contact) : null} onChange={(id) => setField('rel_recruiter_contact', id ? String(id) : '')} />
                <RoleSubRolePicker
                  variant="edit"
                  roleId={draft.job_role ? Number(draft.job_role) : null}
                  subRoleIds={draft.job_sub_role}
                  onRoleChange={(id) => setDraft((prev) => prev ? { ...prev, job_role: id ? String(id) : '', job_sub_role: [] } : prev)}
                  onSubRoleChange={(ids) => setField('job_sub_role', ids)}
                />
                <CityRegionPicker
                  variant="edit"
                  cityId={draft.city_id ? Number(draft.city_id) : null}
                  regionId={draft.region_id ? Number(draft.region_id) : null}
                  cities={cities}
                  regions={regions}
                  onCityChange={(id) => setDraft((prev) => prev ? { ...prev, city_id: id ? String(id) : '' } : prev)}
                  onRegionChange={(id) => setDraft((prev) => prev ? { ...prev, region_id: id ? String(id) : '', city_id: '' } : prev)}
                />
                <TextField label="כתובת" value={draft.address} onChange={(value) => setField('address', value)} />
                <SelectField label="ניסיון נדרש" value={draft.required_experience} onChange={(value) => setField('required_experience', value)} options={experience.map(toOption)} />
                <MultiSelectField label="היקף משרה" values={draft.scope} onChange={(values) => setField('scope', values)} options={scopes.map(toOption)} />
                <TextField label="ימים ושעות עבודה" value={draft.work_schedule_text} onChange={(value) => setField('work_schedule_text', value)} labelSuffix={<JobAIWriter mode="admin" field="work_schedule_text" currentValue={draft.work_schedule_text} onApply={(v) => setField('work_schedule_text', v)} />} />
                <MultiSelectField label="שפות נדרשות" values={draft.required_languages} onChange={(values) => setField('required_languages', values)} options={languages.map(toOption)} />
                <MultiSelectField label="מערכות מחשב / תוכנות מחשב" values={draft.systems_used} onChange={(values) => setField('systems_used', values)} options={systems.map(toOption)} />
                <SelectField label="סוג העסקה" value={draft.tax_type_id} onChange={(value) => setField('tax_type_id', value)} options={taxTypes.map(toOption)} />
                <SelectField label="ניידות נדרשת" value={draft.mobility_id} onChange={(value) => setField('mobility_id', value)} options={mobility.map(toOption)} />
                <TextField label="שכר שעתי" value={draft.salary_expectation_hourly} onChange={(value) => setField('salary_expectation_hourly', value)} dir="ltr" />
                <TextField label="שכר חודשי / גלובלי" value={draft.salary_expectation_monthly} onChange={(value) => setField('salary_expectation_monthly', value)} dir="ltr" />
                <MultiSelectField label="סוג שכר" values={draft.salary_type_ids} onChange={(values) => setField('salary_type_ids', values)} options={salaryTypes.map(toOption)} />
                <label className="flex items-center justify-between rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 text-[13px] font-semibold lg:col-span-2"><span>הצגת שכר לציבור</span><input type="checkbox" checked={draft.show_salary_public} onChange={(event) => setField('show_salary_public', event.target.checked)} className="h-4 w-4 accent-[#008080]" /></label>
                <TextAreaField label="תיאור המשרה" value={draft.job_description} onChange={(value) => setField('job_description', value)} labelSuffix={<JobAIWriter mode="admin" field="job_description" currentValue={draft.job_description} jobContext={{ title: draft.job_title, role: draft.job_role }} onApply={(v) => setField('job_description', v)} />} />
                <TextAreaField label="דרישות המשרה" value={draft.job_requirements} onChange={(value) => setField('job_requirements', value)} labelSuffix={<JobAIWriter mode="admin" field="job_requirements" currentValue={draft.job_requirements} jobContext={{ title: draft.job_title, role: draft.job_role }} onApply={(v) => setField('job_requirements', v)} />} />
                <TextAreaField label="תקציר ציבורי" value={draft.public_excerpt} onChange={(value) => setField('public_excerpt', value)} labelSuffix={<JobAIWriter mode="admin" field="public_excerpt" currentValue={draft.public_excerpt} jobContext={{ title: draft.job_title }} onApply={(v) => setField('public_excerpt', v)} />} />
                <TextAreaField label="הערות פנימיות" value={draft.notes} onChange={(value) => setField('notes', value)} />
                <TextAreaField label="הערות מהלקוח / מהמעסיק" value={draft.employer_notes} onChange={(value) => setField('employer_notes', value)} className="lg:col-span-2" />
                <div className="lg:col-span-2 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#6B6B6B]">קישור משרה חיצוני (אופציונלי)</span>
                  <input dir="ltr" value={draft.job_url} onChange={(e) => setField('job_url', e.target.value)} className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]" />
                  {draft.job_code && (
                    <p className="text-[11px] text-[#6B6B6B]" dir="ltr">
                      קישור ציבורי צפוי: https://www.alldent.co.il/jobs/{draft.job_code.trim().toUpperCase()}
                    </p>
                  )}
                  {draft.job_code.trim().toUpperCase().startsWith('MITOG') && draft.job_url && (
                    <p className="text-[11px] text-[#6B6B6B]">קישור מיתוג קיים: <span dir="ltr">{draft.job_url}</span></p>
                  )}
                </div>
              </div>
            </section>

            <JobImageUpload value={draft.public_image_url} onChange={(url) => setField('public_image_url', url)} jobCode={draft.job_code || localJob.job_code} label="תמונת משרה לאדמין" helperText="גרירה או בחירת תמונה. נשמרת ב־job-images ומעודכנת בשדה public_image_url." />

            <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
              <SectionTitle icon={<Users className="h-5 w-5" />} title={`מועמדים למשרה (${applications.length})`} />
              {applications.length === 0 ? <div className="rounded-xl bg-[#FAFAF7] p-6 text-center text-[14px] text-[#6B6B6B]">אין מועמדים למשרה זו עדיין</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-right text-[13px]"><thead className="bg-[#FAFAF7] text-[#6B6B6B]"><tr><th className="px-3 py-3">מועמד</th><th className="px-3 py-3">נייד</th><th className="px-3 py-3">סטטוס הגשה</th><th className="px-3 py-3">תאריך</th><th className="px-3 py-3">קו״ח</th></tr></thead><tbody className="divide-y divide-[#F3F4F6]">{(applications as any[]).map((app) => <tr key={app.application_id}><td className="px-3 py-3 font-semibold">{(() => { const name = (app as any).contact?.full_name || (app as any).contact?.display_name || app.candidate_name || 'מועמד ללא שם'; return app.candidate_link ? <Link to={`/admin/candidates/${app.candidate_link}`} className="text-[#008080] hover:underline">{name}</Link> : name })()}</td><td className="px-3 py-3 font-mono text-[12px]" dir="ltr">{app.candidate_phone ?? '—'}</td><td className="px-3 py-3">{applicationStatuses.find((s: any) => s.id === app.application_status)?.name ?? '—'}</td><td className="px-3 py-3">{app.submission_date ? formatDate(app.submission_date) : '—'}</td><td className="px-3 py-3">{app.cv_link ? <a href={app.cv_link} target="_blank" rel="noreferrer" className="text-[#008080] hover:underline">פתיחה</a> : '—'}</td></tr>)}</tbody></table></div>}
            </section>
          </main>

          <aside className="space-y-4">
            <section className="sticky top-4 rounded-2xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
              <div className="mb-4 text-[16px] font-bold text-[#008080]">סיכום משרה</div>
              <SummaryRow label="קוד" value={localJob.job_code} />
              <SummaryRow label="ארגון" value={accountName} />
              <SummaryRow label="תפקיד" value={roleName} />
              <SummaryRow label="אזור" value={regionName} />
              <SummaryRow label="עיר" value={cityName} />
              <SummaryRow label="סטטוס פעילות" value={statusName} />
              <SummaryRow label="סטטוס פרסום" value={publicStatusName} />
              <SummaryRow label="מועמדים" value={applications.length} />
              <div className="mt-5 rounded-xl bg-[#E6F3F3] p-4 text-[13px] leading-6 text-[#006D6D]">רק משרה פעילה יכולה להיות מפורסמת. אם סטטוס הפעילות אינו פעילה — הפרסום נשמר כמוסתר.</div>
              <button type="button" onClick={saveJob} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#008080] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'שומרת...' : 'שמירה'}</button>
              <div className="mt-3 grid gap-2">
                <ActionRailLink to={`/admin/ats?job=${localJob.job_code}`} icon={<Users className="h-4 w-4" />} label="פתח ATS" />
                <ActionRailLink to={`/admin/applications?job=${localJob.job_code}`} icon={<FileText className="h-4 w-4" />} label="פתח הגשות" />
                <ActionRailLink to={`/admin/smart-match?job=${localJob.job_code}`} icon={<Sparkles className="h-4 w-4" />} label="Smart Match" />
                {localJob.account_link && <ActionRailLink to={`/admin/accounts/${localJob.account_link}`} icon={<Building2 className="h-4 w-4" />} label="Employer 360" />}
              </div>
            </section>
          </aside>
        </div>

        {toast.open && <div className="pointer-events-none fixed bottom-4 left-4 z-[60]"><div className={`rounded-2xl border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}><div className="text-[13px] font-semibold">{toast.message}</div></div></div>}
      </div>
    </Shell>
  )
}

function toDraft(job: any): JobDraft {
  return {
    job_code: String(job.job_code ?? ''), job_title: String(job.job_title ?? ''), job_status: job.job_status != null ? String(job.job_status) : '', public_status: job.public_status != null ? String(job.public_status) : '', job_role: job.job_role != null ? String(job.job_role) : '', job_sub_role: normalizeIds(job.job_sub_role), account_link: job.account_link != null ? String(job.account_link) : '', rel_employer_contact: job.rel_employer_contact != null ? String(job.rel_employer_contact) : '', rel_recruiter_contact: job.rel_recruiter_contact != null ? String(job.rel_recruiter_contact) : '', region_id: job.region_id != null ? String(job.region_id) : '', city_id: job.city_id != null ? String(job.city_id) : '', address: String(job.address ?? ''), scope: normalizeIds(job.scope), required_experience: job.required_experience != null ? String(job.required_experience) : '', required_languages: normalizeIds(job.required_languages), systems_used: normalizeIds(job.systems_used), salary_type_ids: normalizeIds(job.salary_type_ids), tax_type_id: job.tax_type_id != null ? String(job.tax_type_id) : '', mobility_id: job.mobility_id != null ? String(job.mobility_id) : '', salary_expectation_hourly: job.salary_expectation_hourly != null ? String(job.salary_expectation_hourly) : '', salary_expectation_monthly: job.salary_expectation_monthly != null ? String(job.salary_expectation_monthly) : '', show_salary_public: Boolean(job.show_salary_public), work_schedule_text: String(job.work_schedule_text ?? ''), job_description: String(job.job_description ?? ''), job_requirements: String(job.job_requirements ?? ''), employer_notes: String(job.employer_notes ?? ''), notes: String(job.notes ?? ''), public_excerpt: String(job.public_excerpt ?? ''), public_image_url: String(job.public_image_url ?? ''), job_url: String(job.job_url ?? '')
  }
}
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="mb-5 flex items-center gap-2 text-[18px] font-bold text-[#2D2D2D]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]">{icon}</span>{title}</div> }
function TextField({ label, value, onChange, dir = 'rtl', className = '', labelSuffix }: { label: string; value: string; onChange: (value: string) => void; dir?: 'rtl' | 'ltr'; className?: string; labelSuffix?: React.ReactNode }) { return <div className={`flex flex-col gap-1.5 ${className}`}><div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>{labelSuffix}</div><input dir={dir} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]" /></div> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <label className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><select dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"><option value="">בחרי</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
function MultiSelectField({ label, values, onChange, options }: { label: string; values: number[]; onChange: (values: number[]) => void; options: { value: string; label: string }[] }) { return <div className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><div className="max-h-44 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-2">{options.length ? options.map((option) => { const numeric = Number(option.value); const checked = values.includes(numeric); return <label key={option.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F3F4F6]"><span>{option.label}</span><input type="checkbox" checked={checked} onChange={() => onChange(checked ? values.filter((id) => id !== numeric) : [...values, numeric])} className="h-4 w-4 accent-[#008080]" /></label> }) : <div className="px-2 py-2 text-[13px] text-[#6B6B6B]">אין אפשרויות</div>}</div></div> }
function TextAreaField({ label, value, onChange, className = '', labelSuffix }: { label: string; value: string; onChange: (value: string) => void; className?: string; labelSuffix?: React.ReactNode }) { return <div className={`flex flex-col gap-1.5 ${className}`}><div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>{labelSuffix}</div><textarea dir="rtl" rows={5} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] leading-7 outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]" /></div> }
function Pill({ text, tone }: { text: string; tone: 'success' | 'muted' }) { return <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${tone === 'success' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B6B6B]'}`}>{text}</span> }
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] py-2 text-[13px]"><span className="font-semibold text-[#6B6B6B]">{label}</span><span className="text-left font-bold text-[#2D2D2D]">{value}</span></div> }
function ActionRailLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) { return <Link to={to} className="flex items-center justify-between rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 text-[13px] font-bold text-[#2D2D2D] transition hover:bg-[#E6F3F3] hover:text-[#008080]"><span className="inline-flex items-center gap-2">{icon}{label}</span><ChevronLeft className="h-4 w-4" /></Link> }
function normalizeIds(value: unknown): number[] { if (Array.isArray(value)) return value.map(Number).filter((id) => Number.isFinite(id) && id > 0); if (value == null || value === '') return []; const n = Number(value); return Number.isFinite(n) && n > 0 ? [n] : [] }
function toOption(item: DictItem) { return { value: String(item.id), label: item.name } }
function labelById(items: DictItem[], id: number | string | null | undefined) { return items.find((item) => Number(item.id) === Number(id))?.name ?? '—' }
function cleanText(value: string) { const clean = String(value ?? '').trim(); return clean || null }
function toNullableNumber(value: string) { const clean = String(value ?? '').trim(); if (!clean) return null; const numeric = Number(clean); return Number.isFinite(numeric) ? numeric : null }
function todayIsoDate() { return new Date().toISOString().slice(0, 10) }
function toastClassName(tone: ToastTone) { if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'; if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'; return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]' }
