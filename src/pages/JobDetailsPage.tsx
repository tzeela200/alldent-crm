import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Briefcase,
  MapPin,
  Building2,
  Users,
  Edit2,
  Copy,
  ChevronLeft,
  ExternalLink,
  Clock3,
  CalendarDays,
  CheckCircle2,
  X,
  Send,
  Sparkles,
  Plus,
  FileText,
  Globe,
} from 'lucide-react'
import { Shell, ActionButton, EmptyState } from '@/components/layout/Shell'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { jobStatusColors, applicationStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate } from '@/lib/timeAgo'

const TABS = ['מעסיק', 'מפרט', 'דרישות', 'הפצה', 'מועמדים'] as const

const STATUS_IDS = {
  draft: 1, waitingApproval: 2, active: 3, hold: 4,
  filled: 5, closedSuccess: 6, closedOther: 7, cancelled: 8, archived: 9,
}

const PUBLIC_STATUS_IDS = { published: 3 }

type TabKey = (typeof TABS)[number]
type ToastTone = 'success' | 'error' | 'info'
type ToastState = { open: boolean; message: string; tone: ToastTone }

export default function JobDetailsPage() {
  const { code } = useParams<{ code: string }>()
  const [activeTab, setActiveTab] = useState<TabKey>('מעסיק')
  const [localJob, setLocalJob] = useState<any | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [actionPending, setActionPending] = useState<string | null>(null)

  const { data: jobData } = useQuery({
    queryKey: ['job-detail', code],
    queryFn: async () => {
      const { data, error } = await supabase.from('job').select('*').eq('job_code', code).single()
      if (error) throw error
      return data
    },
    enabled: !!code,
    staleTime: 30_000,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['dict_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_roles').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: regions = [] } = useQuery({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: cities = [] } = useQuery({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: experienceOptions = [] } = useQuery({
    queryKey: ['dict_experience'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_experience').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: scopes = [] } = useQuery({
    queryKey: ['dict_scopes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_scopes').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: accountData } = useQuery({
    queryKey: ['account-for-job', jobData?.account_link],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id,account_name')
        .eq('account_id', jobData!.account_link)
        .single()
      if (error) return null
      return data
    },
    enabled: !!jobData?.account_link,
    staleTime: 300_000,
  })

  const { data: employerContact } = useQuery({
    queryKey: ['employer-contact', jobData?.rel_employer_contact],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact')
        .select('contact_id,full_name,phone_norm')
        .eq('contact_id', jobData!.rel_employer_contact)
        .single()
      if (error) return null
      return data
    },
    enabled: !!jobData?.rel_employer_contact,
    staleTime: 300_000,
  })

  const { data: applications = [] } = useQuery({
    queryKey: ['applications-for-job', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('application_id,candidate_link,application_status,submission_date,cv_link')
        .eq('job_code', code!)
        .order('submission_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!code,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!jobData) return
    setLocalJob({
      ...jobData,
      account_name: accountData?.account_name ?? null,
    })
  }, [jobData, accountData])

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  const roleName = (id: number | null | undefined) => (roles as any[]).find((r) => Number(r.id) === Number(id))?.name ?? '—'
  const regionName = (id: number | null | undefined) => (regions as any[]).find((r) => Number(r.id) === Number(id))?.name ?? '—'
  const cityName = (id: number | null | undefined) => (cities as any[]).find((r) => Number(r.id) === Number(id))?.name ?? '—'
  const expName = (id: number | null | undefined) => (experienceOptions as any[]).find((r) => Number(r.id) === Number(id))?.name ?? '—'
  const scopeNames = (ids: unknown) => {
    const arr: number[] = Array.isArray(ids) ? ids.map(Number) : []
    return arr.map((id) => (scopes as any[]).find((s) => Number(s.id) === id)?.name).filter(Boolean).join(', ') || '—'
  }

  if (!localJob) {
    return (
      <Shell title="משרה" subtitle="" icon={Briefcase}>
        <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo']">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <EmptyState icon={Briefcase} title="משרה לא נמצאה" description="הרשומה לא קיימת" />
          </div>
        </div>
      </Shell>
    )
  }

  const statusBadge = getStatusBadge(jobStatusColors, localJob.job_status)
  const daysLive = getDaysLive(localJob)
  const lastPublishLabel = getLastPublishDate(localJob)
  const publishReady = canPublish(localJob)
  const actionsBlockedForApplications =
    Number(localJob.job_status) === STATUS_IDS.filled ||
    Number(localJob.job_status) === STATUS_IDS.closedSuccess ||
    Number(localJob.job_status) === STATUS_IDS.closedOther

  const showToast = (message: string, tone: ToastTone = 'info') =>
    setToast({ open: true, message, tone })

  const withPending = async (key: string, fn: () => void) => {
    try { setActionPending(key); fn() } finally { setActionPending(null) }
  }

  const handlePublish = async () => {
    if (!publishReady) { showToast('לא ניתן לפרסם משרה ללא שדות החובה המינימליים', 'error'); return }
    const patch = {
      public_status: PUBLIC_STATUS_IDS.published,
      last_publish_date: getTodayIso(),
      date_website: localJob.date_website ?? getTodayIso(),
      updated_timestamp: new Date().toISOString(),
    }
    await supabase.from('job').update(patch).eq('job_code', localJob.job_code)
    await withPending('publish', () => {
      setLocalJob((prev: any) => ({ ...prev, ...patch }))
      showToast('המשרה פורסמה בהצלחה', 'success')
    })
  }

  const handleUnpublish = async () => {
    const patch = { public_status: 4, updated_timestamp: new Date().toISOString() }
    await supabase.from('job').update(patch).eq('job_code', localJob.job_code)
    await withPending('unpublish', () => {
      setLocalJob((prev: any) => ({ ...prev, ...patch }))
      showToast('הפרסום הוסר', 'success')
    })
  }

  const handleClose = async () => {
    const patch = { job_status: STATUS_IDS.closedOther, updated_timestamp: new Date().toISOString() }
    await supabase.from('job').update(patch).eq('job_code', localJob.job_code)
    await withPending('close', () => {
      setLocalJob((prev: any) => ({ ...prev, ...patch }))
      showToast('המשרה נסגרה', 'success')
    })
  }

  const handleFill = async () => {
    const patch = { job_status: STATUS_IDS.filled, updated_timestamp: new Date().toISOString() }
    await supabase.from('job').update(patch).eq('job_code', localJob.job_code)
    await withPending('fill', () => {
      setLocalJob((prev: any) => ({ ...prev, ...patch }))
      showToast('המשרה סומנה כמאוישת', 'success')
    })
  }

  const handleDuplicate = async () => {
    await withPending('duplicate', () => showToast('שכפול משרה — השתמשי בטבלת המשרות', 'info'))
  }

  const isPublished = Number(localJob.public_status) === PUBLIC_STATUS_IDS.published

  return (
    <Shell
      title={`${localJob.job_code} — ${localJob.job_title ?? 'משרה'}`}
      subtitle={`${localJob.account_name ?? ''} · ${cityName(localJob.city_id)}`}
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="ghost" icon={Copy} onClick={handleDuplicate} disabled={actionPending !== null}>שכפול</ActionButton>
          <ActionButton variant="ghost" icon={Edit2} onClick={() => showToast('פתיחת עריכת משרה', 'info')}>עריכה</ActionButton>
          <Link to={`/admin/smart-match?job=${localJob.job_code}`}>
            <ActionButton variant="ghost" icon={Sparkles}>Smart Match</ActionButton>
          </Link>
          <Link to={`/admin/ats?job=${localJob.job_code}`}>
            <ActionButton variant="primary" icon={Users}>ATS</ActionButton>
          </Link>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <nav className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-500">
              <Link to="/admin/jobs" className="hover:text-[#008080]">משרות</Link>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[#0F172A]">{localJob.job_code}</span>
            </div>
          </nav>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[32px] font-bold leading-tight text-[#0F172A]">{localJob.job_title ?? 'משרה'}</h1>
                  <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${statusBadge.bg} ${statusBadge.text}`}>{statusBadge.label}</span>
                  <span className="rounded-full bg-[#F0FDFC] px-3 py-1 text-[12px] font-bold text-[#008080]">{localJob.job_code}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[14px] font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-[#008080]" />
                    {roleName(localJob.job_role)}
                  </span>
                  {localJob.account_link ? (
                    <Link to={`/admin/accounts/${localJob.account_link}`} className="inline-flex items-center gap-1.5 text-[#008080] hover:underline">
                      <Building2 className="h-4 w-4" />{localJob.account_name ?? '—'}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{localJob.account_name ?? '—'}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#008080]" />
                    {cityName(localJob.city_id)}, {regionName(localJob.region_id)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MetaPill icon={<Users className="h-3.5 w-3.5" />} label={`${Number(localJob.total_applicants ?? 0)} מועמדים`} />
                  <MetaPill icon={<Clock3 className="h-3.5 w-3.5" />} label={`${daysLive} ימים באוויר`} />
                  <MetaPill icon={<CalendarDays className="h-3.5 w-3.5" />} label={lastPublishLabel ? `פרסום אחרון ${formatDate(lastPublishLabel)}` : 'ללא פרסום'} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="ghost" icon={isPublished ? X : Send} onClick={isPublished ? handleUnpublish : handlePublish} disabled={actionPending !== null || (!publishReady && !isPublished)}>
                  {isPublished ? 'הסר פרסום' : 'פרסם'}
                </ActionButton>
                <ActionButton variant="ghost" icon={X} onClick={handleClose} disabled={actionPending !== null}>סגור</ActionButton>
                <ActionButton variant="ghost" icon={CheckCircle2} onClick={handleFill} disabled={actionPending !== null}>אויש</ActionButton>
                <ActionButton variant="primary" icon={Plus} onClick={() => actionsBlockedForApplications ? showToast('לא ניתן להוסיף מועמדות למשרה סגורה או מאוישת', 'error') : showToast('פתיחת הוספת מועמדות ידנית', 'info')}>הוסף מועמדות</ActionButton>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard label="מועמדים" value={String(Number(localJob.total_applicants ?? 0))} subtext="ספירת מועמדויות" />
            <KpiCard label="ימים באוויר" value={String(daysLive)} subtext="מחושב מתאריך יצירה" />
            <KpiCard label="פרסום אחרון" value={lastPublishLabel ? formatDate(lastPublishLabel) : '—'} subtext="נגזר מתאריכי הפצה" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeTab === tab ? 'bg-[#D97706] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              {activeTab === 'מעסיק' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle>מעסיק</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DetailCard title="סיכום ארגון">
                      <DetailRow label="שם ארגון" value={localJob.account_name ?? '—'} />
                      <DetailRow label="קישור ארגון" value={localJob.account_link ? (
                        <Link to={`/admin/accounts/${localJob.account_link}`} className="text-[#008080] hover:underline">פתח Employer 360</Link>
                      ) : '—'} />
                    </DetailCard>
                    <DetailCard title="איש קשר מעסיק">
                      <DetailRow label="שם" value={employerContact?.full_name ?? 'לא קיים'} />
                      <DetailRow label="טלפון" value={employerContact?.phone_norm ?? '—'} />
                      <DetailRow label="סטטוס קישור" value={localJob.account_link ? 'מקושר' : 'לא מקושר'} />
                    </DetailCard>
                  </div>
                </section>
              )}

              {activeTab === 'מפרט' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle>מפרט משרה</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DetailCard title="תפקיד והיררכיה">
                      <DetailRow label="תפקיד" value={roleName(localJob.job_role)} />
                      <DetailRow label="סטטוס" value={statusBadge.label} />
                    </DetailCard>
                    <DetailCard title="תנאים">
                      <DetailRow label="היקף" value={scopeNames(localJob.scope)} />
                      <DetailRow label="ניסיון נדרש" value={expName(localJob.required_experience)} />
                    </DetailCard>
                    <DetailCard title="מיקום">
                      <DetailRow label="אזור" value={regionName(localJob.region_id)} />
                      <DetailRow label="עיר" value={cityName(localJob.city_id)} />
                      <DetailRow label="כתובת" value={localJob.address || '—'} />
                    </DetailCard>
                    <DetailCard title="שכר">
                      <DetailRow label="שעתי" value={localJob.salary_expectation_hourly != null ? `${localJob.salary_expectation_hourly} ₪` : '—'} />
                      <DetailRow label="חודשי / גלובלי" value={localJob.salary_expectation_monthly != null ? `${localJob.salary_expectation_monthly} ₪` : '—'} />
                      <DetailRow label="הצגת שכר לציבור" value={localJob.show_salary_public ? 'כן' : 'לא'} />
                    </DetailCard>
                  </div>
                </section>
              )}

              {activeTab === 'דרישות' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle>דרישות ותוכן</SectionTitle>
                  <div className="space-y-4">
                    <ContentBlock title="תיאור המשרה" text={localJob.job_description} />
                    <ContentBlock title="דרישות המשרה" text={localJob.job_requirements} />
                    <ContentBlock title="הערות" text={localJob.notes} />
                  </div>
                </section>
              )}

              {activeTab === 'הפצה' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle>הפצה ופרסום</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DetailCard title="ערוצי הפצה">
                      <DistributionIndicator label="פייסבוק" active={Boolean(localJob.date_facebook)} date={localJob.date_facebook} />
                      <DistributionIndicator label="אתר" active={Boolean(localJob.date_website)} date={localJob.date_website} />
                      <DistributionIndicator label="וואטסאפ" active={Boolean(localJob.date_whatsapp)} date={localJob.date_whatsapp} />
                    </DetailCard>
                    <DetailCard title="תאריכים">
                      <DetailRow label="פייסבוק" value={localJob.date_facebook ? formatDate(localJob.date_facebook) : '—'} />
                      <DetailRow label="אתר" value={localJob.date_website ? formatDate(localJob.date_website) : '—'} />
                      <DetailRow label="וואטסאפ" value={localJob.date_whatsapp ? formatDate(localJob.date_whatsapp) : '—'} />
                      <DetailRow label="פרסום אחרון" value={lastPublishLabel ? formatDate(lastPublishLabel) : '—'} />
                    </DetailCard>
                    <DetailCard title="קישור חיצוני">
                      {localJob.job_url ? (
                        <a href={localJob.job_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#008080] hover:underline">
                          <Globe className="h-4 w-4" />פתח קישור משרה<ExternalLink className="h-4 w-4" />
                        </a>
                      ) : <div className="text-[13px] font-medium text-slate-500">אין קישור משרה</div>}
                    </DetailCard>
                  </div>
                </section>
              )}

              {activeTab === 'מועמדים' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle className="mb-0">מועמדים ({applications.length})</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/ats?job=${localJob.job_code}`}>
                        <ActionButton variant="ghost" icon={Users}>פתח ATS</ActionButton>
                      </Link>
                      <Link to={`/admin/applications?job=${localJob.job_code}`}>
                        <ActionButton variant="ghost" icon={FileText}>Applications</ActionButton>
                      </Link>
                    </div>
                  </div>
                  {applications.length === 0 ? (
                    <div className="rounded-2xl bg-[#F8FAFC] p-8 text-center text-[14px] font-medium text-slate-500">אין מועמדים למשרה זו עדיין</div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-[600px] w-full border-collapse text-right">
                          <thead className="bg-[#F8FAFC]">
                            <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                              <th className="px-4 py-3">מועמד</th>
                              <th className="px-4 py-3">תאריך הגשה</th>
                              <th className="px-4 py-3">סטטוס</th>
                              <th className="px-4 py-3">קו״ח</th>
                              <th className="px-4 py-3">פעולות</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {applications.map((applicant: any) => {
                              const applicantStatus = getStatusBadge(applicationStatusColors, applicant.application_status)
                              return (
                                <tr key={applicant.application_id} className="text-[13px] font-medium text-[#0F172A] hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    {applicant.candidate_link ? (
                                      <Link to={`/admin/candidates/${applicant.candidate_link}`} className="font-semibold text-[#008080] hover:underline">
                                        #{applicant.candidate_link}
                                      </Link>
                                    ) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">{applicant.submission_date ? formatDate(applicant.submission_date) : '—'}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${applicantStatus.bg} ${applicantStatus.text}`}>{applicantStatus.label}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {applicant.cv_link ? (
                                      <a href={applicant.cv_link} target="_blank" rel="noreferrer" className="text-[#008080] hover:underline">צפייה</a>
                                    ) : <span className="text-slate-400">—</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Link to={`/admin/ats?job=${localJob.job_code}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">ATS</Link>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[16px] font-bold text-[#0F172A]">פעולות קשורות</div>
                <div className="space-y-2">
                  <ActionRailLink to={`/admin/smart-match?job=${localJob.job_code}`} icon={<Sparkles className="h-4 w-4" />} label="פתח Smart Match" />
                  <ActionRailLink to={`/admin/ats?job=${localJob.job_code}`} icon={<Users className="h-4 w-4" />} label="פתח ATS" />
                  <ActionRailLink to={`/admin/applications?job=${localJob.job_code}`} icon={<FileText className="h-4 w-4" />} label="פתח Applications" />
                  {localJob.account_link && (
                    <ActionRailLink to={`/admin/accounts/${localJob.account_link}`} icon={<Building2 className="h-4 w-4" />} label="פתח Employer 360" />
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[16px] font-bold text-[#0F172A]">מטא־דאטה</div>
                <div className="space-y-3">
                  <DetailInline label="קוד משרה" value={localJob.job_code} />
                  <DetailInline label="תאריך יצירה" value={localJob.created_time ? formatDate(localJob.created_time) : '—'} />
                  <DetailInline label="עדכון אחרון" value={localJob.updated_timestamp ? formatDate(localJob.updated_timestamp) : '—'} />
                  <DetailInline label="חסימת מועמדויות" value={actionsBlockedForApplications ? 'כן' : 'לא'} />
                  <DetailInline label="מוכנות לפרסום" value={publishReady ? 'מוכן' : 'חסרים שדות'} />
                </div>
              </section>
            </aside>
          </div>
        </div>

        {toast.open && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
            <div className={`rounded-2xl border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold">{toast.message}</div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-[20px] font-bold text-[#0F172A] ${className}`}>{children}</h2>
}

function KpiCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[24px] font-bold text-[#008080]">{value}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-500">{subtext}</div>
    </div>
  )
}

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-semibold text-slate-700">
      {icon}{label}
    </span>
  )
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="mb-3 text-[15px] font-bold text-[#0F172A]">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-2 text-[13px] last:border-b-0 last:pb-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-left font-semibold text-[#0F172A]">{value}</span>
    </div>
  )
}

function ContentBlock({ title, text }: { title: string; text?: string | null }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-4">
      <div className="mb-2 text-[15px] font-bold text-[#0F172A]">{title}</div>
      <p className="whitespace-pre-wrap text-[14px] leading-7 text-slate-700">{text?.trim() ? text : 'אין תוכן להצגה'}</p>
    </div>
  )
}

function DistributionIndicator({ label, active, date }: { label: string; active: boolean; date?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${active ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-slate-100 text-slate-500'}`}>
        {active ? (date ? formatDate(date) : 'פורסם') : 'לא פורסם'}
      </span>
    </div>
  )
}

function ActionRailLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#008080]">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <ChevronLeft className="h-4 w-4" />
    </Link>
  )
}

function DetailInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <span className="text-[13px] font-bold text-[#0F172A]">{value}</span>
    </div>
  )
}

function getDaysLive(job: any) {
  const sourceDate = job.created_time || job.updated_timestamp || null
  if (!sourceDate) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(sourceDate).getTime()) / (1000 * 60 * 60 * 24)))
}

function getLastPublishDate(job: any) {
  const dates = [job.last_publish_date, job.date_facebook, job.date_website, job.date_whatsapp].filter(Boolean)
  if (!dates.length) return null
  return dates.map((v) => new Date(v).getTime()).sort((a, b) => b - a).map((t) => new Date(t).toISOString().slice(0, 10))[0]
}

function canPublish(job: any) {
  return Boolean(job.account_link) && Boolean(job.job_role) && Boolean(String(job.job_title ?? '').trim())
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function toastClassName(tone: ToastTone) {
  if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
  if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
  return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}
