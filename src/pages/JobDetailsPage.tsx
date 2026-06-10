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
  MessageCircle,
} from 'lucide-react'
import { Shell, ActionButton, EmptyState } from '@/components/layout/Shell'
import { useJob, useDicts } from '@/hooks/useMockData'
import { jobStatusColors, applicationStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate } from '@/lib/timeAgo'


const TABS = [
  'מעסיק',
  'מפרט',
  'דרישות',
  'הפצה',
  'מועמדים',
] as const


const STATUS_IDS = {
  draft: 1,
  waitingApproval: 2,
  active: 3,
  hold: 4,
  closed: 5,
  filled: 6,
  published: 7,
  cancelled: 8,
  archived: 9,
}


type TabKey = (typeof TABS)[number]
type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  message: string
  tone: ToastTone
}


export default function JobDetailsPage() {
  const { code } = useParams<{ code: string }>()
  const { data: job, applicants = [] } = useJob(code)
  const dicts = useDicts()


  const [activeTab, setActiveTab] = useState<TabKey>('מעסיק')
  const [localJob, setLocalJob] = useState<any | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [actionPending, setActionPending] = useState<string | null>(null)


  useEffect(() => {
    setLocalJob(job ?? null)
  }, [job])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


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


  const roleName =
    dicts.roles.find((item: any) => item.id === localJob.job_role)?.name ?? '—'
  const regionName =
    dicts.regions.find((item: any) => item.id === localJob.region_id)?.name ?? '—'
  const cityName =
    dicts.cities.find((item: any) => item.id === localJob.city_id)?.name ?? '—'
  const expName =
    dicts.experience.find((item: any) => item.id === localJob.required_experience)?.name ?? '—'


  const daysLive = getDaysLive(localJob)
  const lastPublishLabel = getLastPublishDate(localJob)


  const accountSummary = {
    name: localJob.account_name ?? '—',
    accountLink: localJob.account_link ?? null,
    employerContact:
      localJob.rel_employer_contact
        ? getEmployerContactName(localJob.rel_employer_contact, applicants)
        : null,
  }


  const recentApplicants = useMemo(() => {
    return [...applicants]
      .sort((a: any, b: any) => {
        const aTime = a.submission_date ? new Date(a.submission_date).getTime() : 0
        const bTime = b.submission_date ? new Date(b.submission_date).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 50)
  }, [applicants])


  const publishReady = canPublish(localJob)


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, message, tone })
  }


  const withPending = async (key: string, fn: () => void) => {
    try {
      setActionPending(key)
      fn()
    } finally {
      setActionPending(null)
    }
  }


  const handlePublish = async () => {
    if (!publishReady) {
      showToast('לא ניתן לפרסם משרה ללא שדות החובה המינימליים', 'error')
      return
    }


    await withPending('publish', () => {
      setLocalJob((prev: any) => ({
        ...prev,
        job_status: STATUS_IDS.published,
        last_publish_date: getTodayIso(),
        date_website: prev.date_website ?? getTodayIso(),
        updated_timestamp: new Date().toISOString(),
      }))
      showToast('המשרה פורסמה בהצלחה', 'success')
    })
  }


  const handleUnpublish = async () => {
    await withPending('unpublish', () => {
      setLocalJob((prev: any) => ({
        ...prev,
        job_status: STATUS_IDS.active,
        updated_timestamp: new Date().toISOString(),
      }))
      showToast('הפרסום הוסר', 'success')
    })
  }


  const handleClose = async () => {
    await withPending('close', () => {
      setLocalJob((prev: any) => ({
        ...prev,
        job_status: STATUS_IDS.closed,
        updated_timestamp: new Date().toISOString(),
      }))
      showToast('המשרה נסגרה. מועמדויות חדשות חסומות כעת.', 'success')
    })
  }


  const handleFill = async () => {
    await withPending('fill', () => {
      setLocalJob((prev: any) => ({
        ...prev,
        job_status: STATUS_IDS.filled,
        updated_timestamp: new Date().toISOString(),
      }))
      showToast('המשרה סומנה כמאוישת. מועמדויות חדשות חסומות כעת.', 'success')
    })
  }


  const handleDuplicate = async () => {
    await withPending('duplicate', () => {
      showToast('שכפול משרה הופעל', 'success')
    })
  }


  const actionsBlockedForApplications =
    Number(localJob.job_status) === STATUS_IDS.closed ||
    Number(localJob.job_status) === STATUS_IDS.filled


  return (
    <Shell
      title={`${localJob.job_code} — ${localJob.job_title ?? 'משרה'}`}
      subtitle={`${localJob.account_name ?? ''} · ${cityName}`}
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="ghost"
            icon={Copy}
            onClick={handleDuplicate}
            disabled={actionPending !== null}
          >
            שכפול
          </ActionButton>


          <ActionButton
            variant="ghost"
            icon={Edit2}
            onClick={() => showToast('פתיחת עריכת משרה', 'info')}
          >
            עריכה
          </ActionButton>


          <Link to={`/smart-match?job=${localJob.job_code}`}>
            <ActionButton variant="ghost" icon={Sparkles}>
              Smart Match
            </ActionButton>
          </Link>


          <Link to={`/ats?job=${localJob.job_code}`}>
            <ActionButton variant="primary" icon={Users}>
              ATS
            </ActionButton>
          </Link>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <nav className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-500">
              <Link to="/jobs" className="hover:text-[#008080]">
                משרות
              </Link>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[#0F172A]">{localJob.job_code}</span>
            </div>
          </nav>


          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[32px] font-bold leading-tight text-[#0F172A]">
                    {localJob.job_title ?? 'משרה'}
                  </h1>
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-semibold ${statusBadge.bg} ${statusBadge.text}`}
                  >
                    {statusBadge.label}
                  </span>
                  <span className="rounded-full bg-[#F0FDFC] px-3 py-1 text-[12px] font-bold text-[#008080]">
                    {localJob.job_code}
                  </span>
                </div>


                <div className="flex flex-wrap items-center gap-3 text-[14px] font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-[#008080]" />
                    {roleName}
                    {localJob.job_sub_role ? ` • ${localJob.job_sub_role}` : ''}
                  </span>


                  {localJob.account_link ? (
                    <Link
                      to={`/employers/${localJob.account_link}`}
                      className="inline-flex items-center gap-1.5 text-[#008080] hover:underline"
                    >
                      <Building2 className="h-4 w-4" />
                      {localJob.account_name ?? '—'}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {localJob.account_name ?? '—'}
                    </span>
                  )}


                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#008080]" />
                    {cityName}, {regionName}
                  </span>
                </div>


                <div className="flex flex-wrap gap-2">
                  <MetaPill icon={<Users className="h-3.5 w-3.5" />} label={`${Number(localJob.total_applicants ?? 0)} מועמדים`} />
                  <MetaPill icon={<Clock3 className="h-3.5 w-3.5" />} label={`${daysLive} ימים באוויר`} />
                  <MetaPill
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label={lastPublishLabel ? `פרסום אחרון ${formatDate(lastPublishLabel)}` : 'ללא פרסום'}
                  />
                </div>
              </div>


              <div className="flex flex-wrap gap-2">
                <ActionButton
                  variant="ghost"
                  icon={Number(localJob.job_status) === STATUS_IDS.published ? X : Send}
                  onClick={Number(localJob.job_status) === STATUS_IDS.published ? handleUnpublish : handlePublish}
                  disabled={actionPending !== null || (!publishReady && Number(localJob.job_status) !== STATUS_IDS.published)}
                >
                  {Number(localJob.job_status) === STATUS_IDS.published ? 'הסר פרסום' : 'פרסם'}
                </ActionButton>


                <ActionButton
                  variant="ghost"
                  icon={X}
                  onClick={handleClose}
                  disabled={actionPending !== null}
                >
                  סגור
                </ActionButton>


                <ActionButton
                  variant="ghost"
                  icon={CheckCircle2}
                  onClick={handleFill}
                  disabled={actionPending !== null}
                >
                  אויש
                </ActionButton>


                <ActionButton
                  variant="primary"
                  icon={Plus}
                  onClick={() =>
                    actionsBlockedForApplications
                      ? showToast('לא ניתן להוסיף מועמדות למשרה סגורה או מאוישת', 'error')
                      : showToast('פתיחת הוספת מועמדות ידנית', 'info')
                  }
                >
                  הוסף מועמדות
                </ActionButton>
              </div>
            </div>
          </section>


          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="מועמדים"
              value={String(Number(localJob.total_applicants ?? 0))}
              subtext="ספירת מועמדויות"
            />
            <KpiCard
              label="ימים באוויר"
              value={String(daysLive)}
              subtext="מחושב מתאריך יצירה"
            />
            <KpiCard
              label="פרסום אחרון"
              value={lastPublishLabel ? formatDate(lastPublishLabel) : '—'}
              subtext="נגזר מתאריכי הפצה"
            />
          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => {
                const active = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      active
                        ? 'bg-[#D97706] text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </section>


          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              {activeTab === 'מעסיק' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle>מעסיק</SectionTitle>


                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DetailCard title="סיכום ארגון">
                      <DetailRow label="שם ארגון" value={accountSummary.name} />
                      <DetailRow
                        label="קישור ארגון"
                        value={
                          accountSummary.accountLink ? (
                            <Link
                              to={`/employers/${accountSummary.accountLink}`}
                              className="text-[#008080] hover:underline"
                            >
                              פתח Employer 360
                            </Link>
                          ) : (
                            '—'
                          )
                        }
                      />
                    </DetailCard>


                    <DetailCard title="איש קשר מעסיק">
                      <DetailRow label="איש קשר" value={accountSummary.employerContact || 'לא קיים'} />
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
                      <DetailRow label="תפקיד" value={roleName} />
                      <DetailRow label="תת־תפקיד" value={localJob.job_sub_role || '—'} />
                      <DetailRow label="סטטוס" value={statusBadge.label} />
                    </DetailCard>


                    <DetailCard title="תנאים">
                      <DetailRow label="היקף" value={localJob.scope || '—'} />
                      <DetailRow label="ניסיון נדרש" value={expName} />
                      <DetailRow label="שפות" value={localJob.required_languages || '—'} />
                    </DetailCard>


                    <DetailCard title="מיקום">
                      <DetailRow label="אזור" value={regionName} />
                      <DetailRow label="עיר" value={cityName} />
                      <DetailRow label="כתובת" value={localJob.address || '—'} />
                    </DetailCard>


                    <DetailCard title="שכר">
                      <DetailRow label="טווח שכר" value={localJob.salary_range || '—'} />
                      <DetailRow
                        label="מינימום"
                        value={localJob.salary_min ? `₪${localJob.salary_min}` : '—'}
                      />
                      <DetailRow
                        label="מקסימום"
                        value={localJob.salary_max ? `₪${localJob.salary_max}` : '—'}
                      />
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
                      <DetailRow
                        label="פייסבוק"
                        value={localJob.date_facebook ? formatDate(localJob.date_facebook) : '—'}
                      />
                      <DetailRow
                        label="אתר"
                        value={localJob.date_website ? formatDate(localJob.date_website) : '—'}
                      />
                      <DetailRow
                        label="וואטסאפ"
                        value={localJob.date_whatsapp ? formatDate(localJob.date_whatsapp) : '—'}
                      />
                      <DetailRow
                        label="פרסום אחרון"
                        value={lastPublishLabel ? formatDate(lastPublishLabel) : '—'}
                      />
                    </DetailCard>


                    <DetailCard title="קישור חיצוני">
                      {localJob.job_url ? (
                        <a
                          href={localJob.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#008080] hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          פתח קישור משרה
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <div className="text-[13px] font-medium text-slate-500">אין קישור משרה</div>
                      )}
                    </DetailCard>
                  </div>
                </section>
              )}


              {activeTab === 'מועמדים' && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle className="mb-0">מועמדים</SectionTitle>


                    <div className="flex flex-wrap gap-2">
                      <Link to={`/ats?job=${localJob.job_code}`}>
                        <ActionButton variant="ghost" icon={Users}>
                          פתח ATS
                        </ActionButton>
                      </Link>
                      <Link to={`/applications?job=${localJob.job_code}`}>
                        <ActionButton variant="ghost" icon={FileText}>
                          Applications
                        </ActionButton>
                      </Link>
                    </div>
                  </div>


                  {recentApplicants.length === 0 ? (
                    <div className="rounded-2xl bg-[#F8FAFC] p-8 text-center text-[14px] font-medium text-slate-500">
                      אין מועמדים למשרה זו עדיין
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full border-collapse text-right">
                          <thead className="bg-[#F8FAFC]">
                            <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                              <th className="px-4 py-3">מועמד</th>
                              <th className="px-4 py-3">טלפון</th>
                              <th className="px-4 py-3">תאריך הגשה</th>
                              <th className="px-4 py-3">סטטוס</th>
                              <th className="px-4 py-3">קו״ח</th>
                              <th className="px-4 py-3">פעולות</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {recentApplicants.map((applicant: any) => {
                              const applicantStatus = getStatusBadge(
                                applicationStatusColors,
                                applicant.application_status,
                              )


                              return (
                                <tr
                                  key={applicant.application_id}
                                  className="text-[13px] font-medium text-[#0F172A] hover:bg-slate-50"
                                >
                                  <td className="px-4 py-3">
                                    {applicant.candidate_link ? (
                                      <Link
                                        to={`/candidates/${applicant.candidate_link}`}
                                        className="font-semibold text-[#008080] hover:underline"
                                      >
                                        {applicant.candidate_name ?? '—'}
                                      </Link>
                                    ) : (
                                      applicant.candidate_name ?? '—'
                                    )}
                                  </td>


                                  <td className="px-4 py-3 text-slate-600">
                                    {applicant.candidate_phone ?? '—'}
                                  </td>


                                  <td className="px-4 py-3 text-slate-600">
                                    {applicant.submission_date
                                      ? formatDate(applicant.submission_date)
                                      : '—'}
                                  </td>


                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${applicantStatus.bg} ${applicantStatus.text}`}
                                    >
                                      {applicantStatus.label}
                                    </span>
                                  </td>


                                  <td className="px-4 py-3">
                                    {applicant.cv_link ? (
                                      <a
                                        href={applicant.cv_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#008080] hover:underline"
                                      >
                                        צפייה
                                      </a>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>


                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      {applicant.candidate_link ? (
                                        <Link
                                          to={`/candidates/${applicant.candidate_link}`}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                          Candidate
                                        </Link>
                                      ) : null}
                                      <Link
                                        to={`/ats?job=${localJob.job_code}`}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        ATS
                                      </Link>
                                    </div>
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
                  <ActionRailLink to={`/smart-match?job=${localJob.job_code}`} icon={<Sparkles className="h-4 w-4" />} label="פתח Smart Match" />
                  <ActionRailLink to={`/ats?job=${localJob.job_code}`} icon={<Users className="h-4 w-4" />} label="פתח ATS" />
                  <ActionRailLink to={`/applications?job=${localJob.job_code}`} icon={<FileText className="h-4 w-4" />} label="פתח Applications" />
                  {localJob.account_link ? (
                    <ActionRailLink
                      to={`/employers/${localJob.account_link}`}
                      icon={<Building2 className="h-4 w-4" />}
                      label="פתח Employer 360"
                    />
                  ) : null}
                </div>
              </section>


              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[16px] font-bold text-[#0F172A]">מטא־דאטה</div>


                <div className="space-y-3">
                  <DetailInline label="קוד משרה" value={localJob.job_code} />
                  <DetailInline label="תאריך יצירה" value={localJob.created_time ? formatDate(localJob.created_time) : '—'} />
                  <DetailInline label="עדכון אחרון" value={localJob.updated_timestamp ? formatDate(localJob.updated_timestamp) : '—'} />
                  <DetailInline label="חסימת מועמדויות חדשות" value={actionsBlockedForApplications ? 'כן' : 'לא'} />
                  <DetailInline label="מוכנות לפרסום" value={publishReady ? 'מוכן' : 'חסרים שדות'} />
                </div>
              </section>
            </aside>
          </div>
        </div>


        {toast.open && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
            <div className={`rounded-2xl border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}


function SectionTitle({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <h2 className={`text-[20px] font-bold text-[#0F172A] ${className}`}>{children}</h2>
}


function KpiCard({
  label,
  value,
  subtext,
}: {
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[24px] font-bold text-[#008080]">{value}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-500">{subtext}</div>
    </div>
  )
}


function MetaPill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-semibold text-slate-700">
      {icon}
      {label}
    </span>
  )
}


function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="mb-3 text-[15px] font-bold text-[#0F172A]">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}


function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-2 text-[13px] last:border-b-0 last:pb-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-left font-semibold text-[#0F172A]">{value}</span>
    </div>
  )
}


function ContentBlock({
  title,
  text,
}: {
  title: string
  text?: string | null
}) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-4">
      <div className="mb-2 text-[15px] font-bold text-[#0F172A]">{title}</div>
      <p className="whitespace-pre-wrap text-[14px] leading-7 text-slate-700">
        {text?.trim() ? text : 'אין תוכן להצגה'}
      </p>
    </div>
  )
}


function DistributionIndicator({
  label,
  active,
  date,
}: {
  label: string
  active: boolean
  date?: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
          active ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {active ? (date ? formatDate(date) : 'פורסם') : 'לא פורסם'}
      </span>
    </div>
  )
}


function ActionRailLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#008080]"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ChevronLeft className="h-4 w-4" />
    </Link>
  )
}


function DetailInline({
  label,
  value,
}: {
  label: string
  value: string
}) {
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
  const created = new Date(sourceDate).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
}


function getLastPublishDate(job: any) {
  const dates = [
    job.last_publish_date,
    job.date_facebook,
    job.date_website,
    job.date_whatsapp,
  ].filter(Boolean)


  if (!dates.length) return null


  return dates
    .map((value) => new Date(value).getTime())
    .sort((a, b) => b - a)
    .map((timestamp) => new Date(timestamp).toISOString().slice(0, 10))[0]
}


function canPublish(job: any) {
  const hasAccount = Boolean(job.account_link)
  const hasRole = Boolean(job.job_role)
  const hasTitle = Boolean(String(job.job_title ?? '').trim())
  const hasScope = Boolean(String(job.scope ?? '').trim())
  const hasDescription = Boolean(String(job.job_description ?? '').trim())
  const hasRequirements = Boolean(String(job.job_requirements ?? '').trim())
  const regionOk = !job.region_id || Boolean(job.city_id)


  return hasAccount && hasRole && hasTitle && hasScope && hasDescription && hasRequirements && regionOk
}


function getEmployerContactName(relEmployerContact: any, applicants: any[]) {
  const foundApplicant = applicants.find(
    (item: any) => String(item.candidate_link ?? '') === String(relEmployerContact ?? ''),
  )
  return foundApplicant?.candidate_name ?? null
}


function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}


function toastClassName(tone: ToastTone) {
  if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
  if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
  return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}



