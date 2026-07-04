import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Loader2,
  MailWarning,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Shell,
  Toolbar,
  KPICard,
  ActionButton,
  EmptyState,
  StatusPill,
} from '@/components/layout/Shell'
import { useApplications, useInbox, useJobs, useCandidates, useAccounts, useDicts } from '@/hooks/useSupabaseData'
import DashboardCandidateMessages from '@/components/admin/DashboardCandidateMessages'
import { formatDate, timeAgo } from '@/lib/timeAgo'
import { applicationStatusColors, jobStatusColors, getStatusBadge } from '@/lib/statusColors'


type DatePreset = 'today' | '7d' | '30d' | 'custom'


type DashboardRange = {
  preset: DatePreset
  from?: string
  to?: string
}


type InsightItem = {
  id: string
  title: string
  text: string
  ctaLabel: string
  ctaLink: string
  tone: 'danger' | 'warning' | 'info' | 'success'
}


const STALE_DAYS = 5
const ZERO_APPLICANTS_MIN_LIVE_DAYS = 5


export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>({ preset: '7d' })
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString())


  const { data: jobs = [], loading: jobsLoading, error: jobsError } = useJobs({})
  const { data: applications = [], loading: applicationsLoading, error: applicationsError } = useApplications({})
  const { data: inboxRows = [], loading: inboxLoading, error: inboxError } = useInbox({})
  const { data: candidates = [], loading: candidatesLoading, error: candidatesError } = useCandidates({})
  const { data: accounts = [], loading: accountsLoading, error: accountsError } = useAccounts({})
  const dicts = useDicts()


  const loading =
    jobsLoading || applicationsLoading || inboxLoading || candidatesLoading || accountsLoading


  const hasTopLevelError =
    Boolean(jobsError) ||
    Boolean(applicationsError) ||
    Boolean(inboxError) ||
    Boolean(candidatesError) ||
    Boolean(accountsError)


  const dateWindow = useMemo(() => {
    const now = new Date()
    const end = range.to ? new Date(range.to) : now
    const start = new Date(end)


    if (range.preset === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (range.preset === '7d') {
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
    } else if (range.preset === '30d') {
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
    } else if (range.preset === 'custom' && range.from) {
      return {
        start: new Date(range.from),
        end,
      }
    }


    return { start, end }
  }, [range])


  const isInRange = (value?: string | null) => {
    if (!value) return false
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return false
    const start = dateWindow.start.getTime()
    const end = new Date(dateWindow.end).setHours(23, 59, 59, 999)
    return ts >= start && ts <= end
  }


  const isOverdue = (value?: string | null) => {
    if (!value) return false
    const due = new Date(value).getTime()
    if (Number.isNaN(due)) return false
    return due < Date.now()
  }


  const isStale = (value?: string | null, days = STALE_DAYS) => {
    if (!value) return true
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return true
    return ts < Date.now() - days * 24 * 60 * 60 * 1000
  }


  const activeJobs = useMemo(() => {
    return (jobs as any[]).filter((job) => Number(job.job_status) === 3)
  }, [jobs])


  const newApplications = useMemo(() => {
    return (applications as any[]).filter((row) => isInRange(row.submission_date))
  }, [applications, dateWindow])


  const pendingApplications = useMemo(() => {
    return (applications as any[]).filter((row) => [1, 2, 3].includes(Number(row.application_status)))
  }, [applications])


  const activeCandidates = useMemo(() => {
    return (candidates as any[]).filter((candidate) => [1, 2, 3].includes(Number(candidate.availability)))
  }, [candidates])


  const activeEmployers = useMemo(() => {
    return (accounts as any[]).filter(
      (account) =>
        Number(account.account_status) === 1 ||
        Number(account.active_job_count_auto ?? 0) > 0,
    )
  }, [accounts])


  const openInboxRows = useMemo(() => {
    return (inboxRows as any[]).filter(
      (row) => !['spam', 'handled', 'archived'].includes(String(row.action_intent ?? '').toLowerCase()),
    )
  }, [inboxRows])


  const zeroApplicantJobs = useMemo(() => {
    return activeJobs
      .filter((job) => {
        const totalApplicants = Number(job.total_applicants ?? 0)
        const createdAt = new Date(job.created_time ?? job.created_timestamp ?? Date.now()).getTime()
        const liveDays = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000))
        return totalApplicants === 0 && liveDays >= ZERO_APPLICANTS_MIN_LIVE_DAYS
      })
      .sort((a, b) => {
        const aLive = new Date(a.created_time ?? a.created_timestamp ?? 0).getTime()
        const bLive = new Date(b.created_time ?? b.created_timestamp ?? 0).getTime()
        return aLive - bLive
      })
      .slice(0, 6)
  }, [activeJobs])


  const urgentApplications = useMemo(() => {
    return (applications as any[])
      .filter((row) => [1, 2, 3, 4, 5, 6, 7].includes(Number(row.application_status)))
      .filter((row) => isStale(row.updated_timestamp))
      .sort((a, b) => {
        const aTs = new Date(a.updated_timestamp ?? a.submission_date ?? 0).getTime()
        const bTs = new Date(b.updated_timestamp ?? b.submission_date ?? 0).getTime()
        return aTs - bTs
      })
      .slice(0, 6)
  }, [applications])


  const inboxUrgent = useMemo(() => {
    return [...openInboxRows]
      .sort((a, b) => {
        const aScore =
          (a.is_duplicate ? 30 : 0) +
          (!a.entity_type ? 20 : 0) +
          (!a.action_intent ? 10 : 0) +
          (isOverdue(a.next_follow_up) ? 15 : 0)


        const bScore =
          (b.is_duplicate ? 30 : 0) +
          (!b.entity_type ? 20 : 0) +
          (!b.action_intent ? 10 : 0) +
          (isOverdue(b.next_follow_up) ? 15 : 0)


        return bScore - aScore
      })
      .slice(0, 6)
  }, [openInboxRows])


  const overdueFollowUps = useMemo(() => {
    const accountItems = (accounts as any[])
      .filter((account) => isOverdue(account.next_follow_up))
      .map((account) => ({
        entityType: 'account' as const,
        name: account.account_name ?? 'ללא שם',
        nextFollowUp: account.next_follow_up,
        link: `/accounts/${account.account_id ?? ''}`,
      }))


    const contactItems = (candidates as any[])
      .filter((candidate) => isOverdue(candidate.next_follow_up))
      .map((candidate) => ({
        entityType: 'contact' as const,
        name: candidate.full_name ?? candidate.display_name ?? 'ללא שם',
        nextFollowUp: candidate.next_follow_up,
        link: `/candidates/${candidate.contact_id ?? ''}`,
      }))


    const inboxItems = (inboxRows as any[])
      .filter((row) => isOverdue(row.next_follow_up))
      .map((row) => ({
        entityType: 'inbox' as const,
        name: row.display_name ?? 'ללא שם',
        nextFollowUp: row.next_follow_up,
        link: `/inbox?lead=${row.lead_id ?? ''}`,
      }))


    return [...accountItems, ...contactItems, ...inboxItems]
      .sort((a, b) => new Date(a.nextFollowUp ?? 0).getTime() - new Date(b.nextFollowUp ?? 0).getTime())
      .slice(0, 8)
  }, [accounts, candidates, inboxRows])


  const newCandidates = useMemo(() => {
    return (candidates as any[])
      .filter((candidate) => isInRange(candidate.created_timestamp))
      .sort((a, b) => new Date(b.created_timestamp ?? 0).getTime() - new Date(a.created_timestamp ?? 0).getTime())
      .slice(0, 6)
  }, [candidates, dateWindow])


  const activeEmployersSnapshot = useMemo(() => {
    return [...activeEmployers]
      .sort((a, b) => Number(b.active_job_count_auto ?? 0) - Number(a.active_job_count_auto ?? 0))
      .slice(0, 6)
  }, [activeEmployers])


  const applicationsByDay = useMemo(() => {
    const days = buildDaySeries(dateWindow.start, dateWindow.end)
    return days.map((dayLabel, index) => {
      const current = new Date(dateWindow.start)
      current.setDate(current.getDate() + index)
      const next = new Date(current)
      next.setDate(next.getDate() + 1)


      const count = (applications as any[]).filter((row) => {
        const ts = new Date(row.submission_date ?? 0).getTime()
        return ts >= current.getTime() && ts < next.getTime()
      }).length


      return {
        label: dayLabel,
        value: count,
      }
    })
  }, [applications, dateWindow])


  const applicationsStatusDistribution = useMemo(() => {
    const counts = new Map<number, number>()
    ;(applications as any[]).forEach((row) => {
      const key = Number(row.application_status ?? 0)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })


    return Array.from(counts.entries())
      .map(([statusId, count]) => ({
        statusId,
        count,
        label:
          dicts.applicationStatuses?.find((item: any) => Number(item.id) === statusId)?.name ??
          `סטטוס ${statusId}`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [applications, dicts.applicationStatuses])


  const hiresThisMonth = useMemo(() => {
    const now = new Date()
    return (applications as any[]).filter((row) => {
      if (Number(row.application_status) !== 12) return false
      const ts = new Date(row.updated_timestamp ?? row.submission_date ?? 0)
      return ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear()
    }).length
  }, [applications])


  const aiInsights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = []


    if (urgentApplications.length > 0) {
      items.push({
        id: 'urgent-apps',
        title: 'הכי דחוף עכשיו',
        text: `${urgentApplications.length} הגשות תקועות ממתינות לפעולה, חלקן לא עודכנו מעל ${STALE_DAYS} ימים.`,
        ctaLabel: 'פתח הגשות',
        ctaLink: '/applications?stale=true',
        tone: 'danger',
      })
    }


    if (zeroApplicantJobs.length > 0) {
      items.push({
        id: 'zero-jobs',
        title: 'משרות תקועות',
        text: `${zeroApplicantJobs.length} משרות פעילות לא קיבלו מועמדים, וזה סימן לצוואר בקבוק בגיוס.`,
        ctaLabel: 'פתח Smart Match',
        ctaLink: '/smart-match',
        tone: 'warning',
      })
    }


    if (inboxUrgent.length > 0) {
      items.push({
        id: 'inbox',
        title: 'לידים דורשי הכרעה',
        text: `${inboxUrgent.length} רשומות באינבוקס דורשות סיווג או בדיקת כפילות לפני יצירה.`,
        ctaLabel: 'פתח Inbox',
        ctaLink: '/inbox?state=open',
        tone: 'info',
      })
    }


    if (newCandidates.length > 0 && zeroApplicantJobs.length > 0) {
      items.push({
        id: 'match-now',
        title: 'הזדמנות שידוך מיידית',
        text: `נוספו ${newCandidates.length} מועמדים חדשים בטווח הזמן הנבחר. כדאי לבדוק התאמות למשרות ללא מועמדים.`,
        ctaLabel: 'פתח שידוך חכם',
        ctaLink: '/smart-match',
        tone: 'success',
      })
    }


    if (overdueFollowUps.length > 0) {
      items.push({
        id: 'followups',
        title: 'פולו-אפ שעבר זמנו',
        text: `${overdueFollowUps.length} פריטי follow-up עברו את תאריך היעד ודורשים סגירה או יצירת קשר.`,
        ctaLabel: 'פתח מעקבים',
        ctaLink: '/accounts?follow_up=overdue',
        tone: 'warning',
      })
    }


    return items.slice(0, 5)
  }, [urgentApplications, zeroApplicantJobs, inboxUrgent, newCandidates, overdueFollowUps])


  const onRefresh = () => {
    setLastUpdated(new Date().toISOString())
  }


  if (hasTopLevelError && !loading) {
    return (
      <Shell
        title="Dashboard"
        subtitle="תמונת מצב יומית של הגיוס, הלידים והמעסיקים"
        icon={LayoutDashboard}
      >
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
          <EmptyState
            icon={AlertTriangle}
            title="אירעה שגיאה בטעינת הדשבורד"
            description="חלק ממקורות הנתונים לא נטענו. נסי לבצע רענון."
            action={
              <ActionButton variant="primary" icon={RefreshCw} onClick={onRefresh}>
                רענון
              </ActionButton>
            }
          />
        </div>
      </Shell>
    )
  }


  return (
    <Shell
      title="Dashboard"
      subtitle="תמונת מצב יומית של הגיוס, הלידים והמעסיקים"
      icon={LayoutDashboard}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-500 shadow-sm">
            עודכן לאחרונה: {timeAgo(lastUpdated)}
          </div>


          <ActionButton variant="ghost" icon={RefreshCw} onClick={onRefresh}>
            רענון
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6 font-['Heebo']">
        <Toolbar>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <PresetButton active={range.preset === 'today'} onClick={() => setRange({ preset: 'today' })}>
                היום
              </PresetButton>
              <PresetButton active={range.preset === '7d'} onClick={() => setRange({ preset: '7d' })}>
                7 ימים
              </PresetButton>
              <PresetButton active={range.preset === '30d'} onClick={() => setRange({ preset: '30d' })}>
                30 ימים
              </PresetButton>
              <PresetButton
                active={range.preset === 'custom'}
                onClick={() => setRange((prev) => ({ ...prev, preset: 'custom' }))}
              >
                טווח מותאם
              </PresetButton>
            </div>


            {range.preset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={range.from ?? ''}
                  onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008080]"
                />
                <input
                  type="date"
                  value={range.to ?? ''}
                  onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008080]"
                />
              </div>
            )}
          </div>
        </Toolbar>

        <DashboardCandidateMessages />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 xl:grid-cols-10">
          <Link to="/jobs?status=active" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="משרות פעילות" value={activeJobs.length} icon={Briefcase} />
          </Link>
          <Link to="/applications?date=current" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="הגשות חדשות" value={newApplications.length} icon={ClipboardList} />
          </Link>
          <Link to="/applications?pending=true" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="ממתינות לטיפול" value={pendingApplications.length} icon={MailWarning} />
          </Link>
          <Link to="/contacts?availability=active" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="מועמדים פעילים" value={activeCandidates.length} icon={UserCheck} />
          </Link>
          <Link to="/accounts?active=true" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="מעסיקים פעילים" value={activeEmployers.length} icon={Building2} />
          </Link>
          <Link to="/inbox?state=open" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="לידים פתוחים" value={openInboxRows.length} icon={Inbox} />
          </Link>
          <Link to="/jobs?applicants=0&status=open" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="ללא מועמדים" value={zeroApplicantJobs.length} icon={AlertTriangle} />
          </Link>
          <Link to="/accounts?follow_up=overdue" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="Follow-up באיחור" value={overdueFollowUps.length} icon={CalendarClock} />
          </Link>
          <Link to="/applications?status=12&period=month" className="block rounded-2xl transition hover:shadow-md">
            <KPICard label="השמות החודש" value={hiresThisMonth} icon={CheckCircle2} />
          </Link>
          <Link to="/inbox?duplicates=true" className="block rounded-2xl transition hover:shadow-md">
            <KPICard
              label="כפילויות באינבוקס"
              value={openInboxRows.filter((row: any) => row.is_duplicate || Number(row.dup_count ?? 0) > 0).length}
              icon={MailWarning}
            />
          </Link>
        </div>


        <Toolbar>
          <div className="flex flex-wrap gap-2">
            <Link to="/jobs/new">
              <ActionButton variant="primary" icon={PlusCircle}>יצירת משרה</ActionButton>
            </Link>
            <Link to="/contacts">
              <ActionButton variant="ghost" icon={Users}>יצירת מועמד / איש קשר</ActionButton>
            </Link>
            <Link to="/inbox">
              <ActionButton variant="ghost" icon={Inbox}>פתיחת Inbox</ActionButton>
            </Link>
            <Link to="/pipeline">
              <ActionButton variant="ghost" icon={ClipboardList}>פתיחת ATS</ActionButton>
            </Link>
            <Link to="/smart-match">
              <ActionButton variant="ghost" icon={Sparkles}>פתיחת Smart Match</ActionButton>
            </Link>
            <Link to="/applications">
              <ActionButton variant="ghost" icon={ClipboardList}>פתיחת Admin Applications</ActionButton>
            </Link>
          </div>
        </Toolbar>


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BlockCard
            title="הגשות ממתינות לטיפול"
            subtitle="דחוף"
            icon={ClipboardList}
            actionLabel="לכל ההגשות"
            actionLink="/applications?pending=true"
          >
            {loading ? (
              <BlockLoading />
            ) : urgentApplications.length === 0 ? (
              <MiniEmpty text="אין הגשות תקועות כרגע." />
            ) : (
              <div className="space-y-3">
                {urgentApplications.map((row: any) => {
                  const statusBadge = getStatusBadge(applicationStatusColors, Number(row.application_status ?? 0))
                  return (
                    <RowCard
                      key={row.application_id}
                      title={row.candidate_name ?? 'ללא שם'}
                      subtitle={`${row.job_code ?? '—'} • ${row.account_name ?? '—'}`}
                      metaLeft={statusBadge.label}
                      metaRight={row.updated_timestamp ? `עודכן ${timeAgo(row.updated_timestamp)}` : 'ללא עדכון'}
                      tone="danger"
                      ctas={[
                        { label: 'Open Application', link: `/applications?application_id=${row.application_id}` },
                        { label: 'Open ATS', link: `/pipeline` },
                        {
                          label: 'WhatsApp',
                          link: buildWhatsAppLink(row.candidate_phone ?? row.phone_norm ?? ''),
                          external: true,
                          disabled: !normalizeDigits(row.candidate_phone ?? row.phone_norm ?? ''),
                        },
                      ]}
                    />
                  )
                })}
              </div>
            )}
          </BlockCard>


          <BlockCard
            title="Inbox ממתינים"
            subtitle="דחוף"
            icon={Inbox}
            actionLabel="לכל ה-Inbox"
            actionLink="/inbox?state=open"
          >
            {loading ? (
              <BlockLoading />
            ) : inboxUrgent.length === 0 ? (
              <MiniEmpty text="אין רשומות פתוחות באינבוקס." />
            ) : (
              <div className="space-y-3">
                {inboxUrgent.map((row: any) => (
                  <RowCard
                    key={row.lead_id}
                    title={row.display_name ?? 'ללא שם'}
                    subtitle={`${sourceLabel(dicts.sources, row.lead_source)} • ${row.entity_type ?? 'לא סווג'}`}
                    metaLeft={row.is_duplicate ? 'כפול' : row.action_intent ? row.action_intent : 'דורש החלטה'}
                    metaRight={row.created_timestamp ? timeAgo(row.created_timestamp) : '—'}
                    tone={row.is_duplicate ? 'warning' : 'default'}
                    ctas={[
                      { label: 'Open Inbox row', link: `/inbox?lead=${row.lead_id}` },
                      { label: 'Open Inbox filtered', link: `/inbox?state=open` },
                    ]}
                  />
                ))}
              </div>
            )}
          </BlockCard>
        </div>


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BlockCard
            title="משרות ללא מועמדים"
            subtitle="חשוב"
            icon={Briefcase}
            actionLabel="לכל המשרות הרלוונטיות"
            actionLink="/jobs?applicants=0&status=open"
          >
            {loading ? (
              <BlockLoading />
            ) : zeroApplicantJobs.length === 0 ? (
              <MiniEmpty text="אין כרגע משרות פעילות ללא מועמדים." />
            ) : (
              <div className="space-y-3">
                {zeroApplicantJobs.map((job: any) => {
                  const createdAt = new Date(job.created_time ?? job.created_timestamp ?? Date.now()).getTime()
                  const liveDays = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000))
                  return (
                    <RowCard
                      key={job.job_code}
                      title={`${job.job_code} • ${job.job_title ?? 'ללא כותרת'}`}
                      subtitle={`${regionLabel(dicts.regions, job.region_id)} • ${job.account_name ?? '—'}`}
                      metaLeft={`${Number(job.total_applicants ?? 0)} מועמדים`}
                      metaRight={`${liveDays} ימים באוויר`}
                      tone="warning"
                      ctas={[
                        { label: 'Open Job Details', link: `/jobs/${job.job_code}` },
                        { label: 'Open Smart Match', link: `/smart-match?job=${job.job_code}` },
                      ]}
                    />
                  )
                })}
              </div>
            )}
          </BlockCard>


          <BlockCard
            title="Follow-up Overdue"
            subtitle="חשוב"
            icon={CalendarClock}
            actionLabel="לכל המעקבים"
            actionLink="/accounts?follow_up=overdue"
          >
            {loading ? (
              <BlockLoading />
            ) : overdueFollowUps.length === 0 ? (
              <MiniEmpty text="אין כרגע פריטי follow-up באיחור." />
            ) : (
              <div className="space-y-3">
                {overdueFollowUps.map((item) => (
                  <RowCard
                    key={`${item.entityType}-${item.name}-${item.nextFollowUp}`}
                    title={item.name}
                    subtitle={
                      item.entityType === 'account'
                        ? 'מעסיק'
                        : item.entityType === 'contact'
                          ? 'מועמד / איש קשר'
                          : 'Inbox'
                    }
                    metaLeft={formatDate(item.nextFollowUp)}
                    metaRight={`${daysOverdue(item.nextFollowUp)} ימים באיחור`}
                    tone="danger"
                    ctas={[
                      {
                        label:
                          item.entityType === 'account'
                            ? 'Open Account'
                            : item.entityType === 'contact'
                              ? 'Open Contact'
                              : 'Open Inbox item',
                        link: item.link,
                      },
                    ]}
                  />
                ))}
              </div>
            )}
          </BlockCard>
        </div>


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BlockCard
            title="מועמדים חדשים"
            subtitle="אינפורמטיבי"
            icon={Users}
            actionLabel="לכל המועמדים"
            actionLink="/contacts"
          >
            {loading ? (
              <BlockLoading />
            ) : newCandidates.length === 0 ? (
              <MiniEmpty text="אין מועמדים חדשים בטווח שנבחר." />
            ) : (
              <div className="space-y-3">
                {newCandidates.map((candidate: any) => (
                  <RowCard
                    key={candidate.contact_id}
                    title={candidate.full_name ?? candidate.display_name ?? 'ללא שם'}
                    subtitle={`${roleLabel(dicts.roles, candidate.role)} • ${cityLabel(dicts.cities, candidate.city_id)} / ${regionLabel(dicts.regions, candidate.region_id)}`}
                    metaLeft={availabilityLabel(dicts.availability, candidate.availability)}
                    metaRight={candidate.created_timestamp ? timeAgo(candidate.created_timestamp) : '—'}
                    tone="default"
                    ctas={[
                      { label: 'Open Candidate 360', link: `/candidates/${candidate.contact_id}` },
                      { label: 'Open Smart Match', link: '/smart-match' },
                    ]}
                    extraBadge={
                      candidate.has_cv ? (
                        <StatusPill label='קו"ח' variant="success" />
                      ) : (
                        <StatusPill label='ללא קו"ח' variant="warning" />
                      )
                    }
                  />
                ))}
              </div>
            )}
          </BlockCard>


          <BlockCard
            title="מעסיקים פעילים"
            subtitle="אינפורמטיבי"
            icon={Building2}
            actionLabel="לכל המעסיקים"
            actionLink="/accounts?active=true"
          >
            {loading ? (
              <BlockLoading />
            ) : activeEmployersSnapshot.length === 0 ? (
              <MiniEmpty text="אין מעסיקים פעילים להצגה." />
            ) : (
              <div className="space-y-3">
                {activeEmployersSnapshot.map((account: any) => (
                  <RowCard
                    key={account.account_id}
                    title={account.account_name ?? 'ללא שם'}
                    subtitle={`סטטוס: ${accountStatusLabel(dicts.accountStatuses, account.account_status)}`}
                    metaLeft={`${Number(account.active_job_count_auto ?? 0)} משרות פעילות`}
                    metaRight={
                      account.next_follow_up
                        ? `פולו-אפ ${timeAgo(account.next_follow_up)}`
                        : account.last_contact_date
                          ? `קשר אחרון ${timeAgo(account.last_contact_date)}`
                          : 'אין היסטוריה'
                    }
                    tone="default"
                    ctas={[
                      { label: 'Open Employer 360', link: `/accounts/${account.account_id}` },
                      { label: 'Create Job', link: `/jobs/new?account=${account.account_id}` },
                    ]}
                  />
                ))}
              </div>
            )}
          </BlockCard>
        </div>


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr,1fr]">
          <BlockCard
            title="Trends / Insights"
            subtitle="אינפורמטיבי"
            icon={TrendingUp}
          >
            {loading ? (
              <BlockLoading />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SimpleBarChartCard title="הגשות לפי ימים" data={applicationsByDay} />
                <SimpleDistributionCard title="התפלגות סטטוסי הגשה" data={applicationsStatusDistribution} />
              </div>
            )}
          </BlockCard>


          <BlockCard
            title="AI Insights"
            subtitle="מוסבר"
            icon={Sparkles}
          >
            {loading ? (
              <BlockLoading />
            ) : aiInsights.length === 0 ? (
              <MiniEmpty text="אין כרגע המלצות פעולה מיוחדות." />
            ) : (
              <div className="space-y-3">
                {aiInsights.map((insight) => (
                  <InsightCard key={insight.id} item={insight} />
                ))}
              </div>
            )}
          </BlockCard>
        </div>
      </div>
    </Shell>
  )
}


function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? 'bg-[#008080] text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}


function BlockCard({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  actionLink,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  actionLabel?: string
  actionLink?: string
  children: React.ReactNode
}) {
  return (
    <Toolbar>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>


        {actionLabel && actionLink ? (
          <Link
            to={actionLink}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#008080] hover:text-[#0f766e]"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>


      {children}
    </Toolbar>
  )
}


function RowCard({
  title,
  subtitle,
  metaLeft,
  metaRight,
  tone,
  ctas,
  extraBadge,
}: {
  title: string
  subtitle: string
  metaLeft: string
  metaRight: string
  tone: 'default' | 'warning' | 'danger'
  ctas: Array<{ label: string; link: string; external?: boolean; disabled?: boolean }>
  extraBadge?: React.ReactNode
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50/60'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/60'
        : 'border-slate-200 bg-white'


  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-slate-900">{title}</div>
            {extraBadge}
          </div>
          <div className="text-sm text-slate-600">{subtitle}</div>
          <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-500">
            <span>{metaLeft}</span>
            <span>{metaRight}</span>
          </div>
        </div>


        <div className="flex flex-wrap gap-2">
          {ctas.map((cta) =>
            cta.external ? (
              <a
                key={cta.label}
                href={cta.disabled ? undefined : cta.link}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-semibold ${
                  cta.disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cta.label}
              </a>
            ) : (
              <Link
                key={cta.label}
                to={cta.link}
                className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {cta.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  )
}


function BlockLoading() {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-slate-50">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        טוען נתונים...
      </div>
    </div>
  )
}


function MiniEmpty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>
}


function SimpleBarChartCard({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; value: number }>
}) {
  const max = Math.max(...data.map((item) => item.value), 1)


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-bold text-slate-900">{title}</div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#008080]"
                style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function SimpleDistributionCard({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; count: number }>
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-bold text-slate-900">{title}</div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-sm font-medium text-slate-700">{item.label}</div>
            <div className="text-xs font-semibold text-slate-500">
              {item.count} ({Math.round((item.count / total) * 100)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function InsightCard({ item }: { item: InsightItem }) {
  const toneClass =
    item.tone === 'danger'
      ? 'border-rose-200 bg-rose-50'
      : item.tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : item.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-sky-200 bg-sky-50'


  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-1 text-sm font-bold text-slate-900">{item.title}</div>
      <div className="mb-3 text-sm text-slate-700">{item.text}</div>
      <Link
        to={item.ctaLink}
        className="inline-flex h-9 items-center rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {item.ctaLabel}
      </Link>
    </div>
  )
}


function buildDaySeries(start: Date, end: Date) {
  const labels: string[] = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)


  const final = new Date(end)
  final.setHours(0, 0, 0, 0)


  while (current.getTime() <= final.getTime()) {
    labels.push(current.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }))
    current.setDate(current.getDate() + 1)
  }


  return labels
}


function sourceLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function regionLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function cityLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function roleLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function availabilityLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function accountStatusLabel(list: any[] | undefined, id: number | null | undefined) {
  return list?.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function normalizeDigits(value: string) {
  return String(value ?? '').replace(/\D/g, '')
}


function buildWhatsAppLink(phone: string) {
  const normalized = normalizeDigits(phone)
  if (!normalized) return ''
  return `https://wa.me/${normalized}`
}


function daysOverdue(value?: string | null) {
  if (!value) return 0
  const diff = Date.now() - new Date(value).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}



