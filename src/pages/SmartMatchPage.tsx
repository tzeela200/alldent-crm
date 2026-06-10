import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  Shell,
  Toolbar,
  SelectFilter,
  ActionButton,
  EmptyState,
} from '@/components/layout/Shell'
import { useApplications, useCandidates, useDicts, useJobs } from '@/hooks/useMockData'
import { formatDate, timeAgo } from '@/lib/timeAgo'


type ViewMode = 'grid' | 'list'
type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}


type FiltersState = {
  minimumScore: number
  availability?: number
  experience?: number
  hasCvOnly: boolean
  language?: string
  scopeFit?: 'yes'
  salaryFit?: 'yes'
  region?: number
  city?: number
  nonAppliedOnly: boolean
  activeSeekersOnly: boolean
  profileType?: number
  tag?: string
}


type Breakdown = {
  role: number
  experience: number
  salary: number
  language: number
  scope: number
  bonus: number
  secondary: number
}


type MatchRow = {
  candidate: any
  score: number
  breakdown: Breakdown
  explainer: string
  aiSummary: string
  recommendation: string
  missingSignals: string[]
  hasExistingApplication: boolean
  existingApplicationId: number | null
  scopeFit: boolean
  salaryFit: boolean
  languageFit: boolean
  roleFit: boolean
  partial: boolean
  secondarySignals: string[]
}


type CreateApplicationState = {
  open: boolean
  candidateId: number | null
}


const EXPERIENCE_WEIGHT = 15
const SALARY_WEIGHT = 15
const LANGUAGE_WEIGHT = 20
const SCOPE_WEIGHT = 10
const ROLE_WEIGHT = 30
const BONUS_WEIGHT = 5
const SECONDARY_WEIGHT = 5


const IMPORTANT_TAGS = [
  'VIP',
  'זמינות-מיידית',
  'מחפש-אקטיבי',
  'מחפש-פסיבי',
  'אין-קו"ח',
  'פוטנציאל-גבוה',
  'דגל-אדום-מבריז',
] as const


const INITIAL_TAGS_BY_CONTACT: Record<number, string[]> = {
  1: ['VIP', 'זמינות-מיידית', 'פוטנציאל-גבוה'],
  2: ['זמינות-מיידית', 'מחפש-אקטיבי'],
  3: ['מחפש-פסיבי', 'אין-קו"ח'],
  4: ['פוטנציאל-גבוה'],
  7: ['זמינות-מיידית', 'מחפש-אקטיבי'],
  8: ['אין-קו"ח'],
  10: ['דגל-אדום-מבריז'],
}


export default function SmartMatchPage() {
  const [searchParams] = useSearchParams()
  const initialJob = searchParams.get('job') ?? ''
  const [selectedJobCode, setSelectedJobCode] = useState(initialJob)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null)
  const [createApplicationState, setCreateApplicationState] = useState<CreateApplicationState>({
    open: false,
    candidateId: null,
  })
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [duplicateState, setDuplicateState] = useState<{
    blocked: boolean
    rowId: number | null
    message: string
  }>({
    blocked: false,
    rowId: null,
    message: '',
  })
  const [localApplications, setLocalApplications] = useState<any[]>([])
  const [filters, setFilters] = useState<FiltersState>({
    minimumScore: 55,
    hasCvOnly: false,
    nonAppliedOnly: true,
    activeSeekersOnly: false,
  })


  const { data: jobs = [] } = useJobs({})
  const { data: candidates = [] } = useCandidates({})
  const { data: applications = [] } = useApplications({})
  const dicts = useDicts()


  useEffect(() => {
    setLocalApplications(applications)
  }, [applications])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  const roles = dicts.roles ?? []
  const subRoles = dicts.subRoles ?? []
  const regions = dicts.regions ?? []
  const cities = dicts.cities ?? []
  const availability = dicts.availability ?? []
  const experience = dicts.experience ?? []
  const profileTypes = dicts.profileTypes ?? []


  const roleName = (id: number | null | undefined) => roles.find((r: any) => r.id === id)?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => subRoles.find((r: any) => r.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regions.find((r: any) => r.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cities.find((r: any) => r.id === id)?.name ?? '—'
  const availabilityName = (id: number | null | undefined) =>
    availability.find((r: any) => r.id === id)?.name ?? '—'
  const experienceName = (id: number | null | undefined) =>
    experience.find((r: any) => r.id === id)?.name ?? '—'
  const profileTypeName = (id: number | null | undefined) =>
    profileTypes.find((r: any) => r.id === id)?.name ?? '—'


  const openJobs = useMemo(() => {
    return (jobs as any[]).filter((job) => Number(job.job_status) === 3)
  }, [jobs])


  const selectedJob = useMemo(() => {
    return openJobs.find((job) => String(job.job_code) === String(selectedJobCode)) ?? null
  }, [openJobs, selectedJobCode])


  const languageOptions = useMemo(() => {
    const set = new Set<string>()
    ;(candidates as any[]).forEach((candidate) => {
      splitCsv(candidate.languages).forEach((language) => set.add(language))
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
  }, [candidates])


  const selectedJobSummary = useMemo(() => {
    if (!selectedJob) return null
    return {
      jobCode: selectedJob.job_code,
      title: selectedJob.job_title ?? '—',
      role: roleName(selectedJob.job_role),
      subRole: normalizeJobSubRoleText(selectedJob.job_sub_role),
      employer: selectedJob.account_name ?? '—',
      region: regionName(selectedJob.region_id),
      city: cityName(selectedJob.city_id),
      experience: experienceName(selectedJob.required_experience),
      salaryRange: formatJobSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_range),
      languages: selectedJob.required_languages ?? '—',
      scope: selectedJob.scope ?? '—',
    }
  }, [selectedJob, roles, subRoles, regions, cities, experience])


  const computedMatches = useMemo<MatchRow[]>(() => {
    if (!selectedJob) return []


    const results: MatchRow[] = []


    ;(candidates as any[]).forEach((candidate) => {
      const roleFit = Number(candidate.role) === Number(selectedJob.job_role)
      const candidateLanguages = splitCsv(candidate.languages)
      const requiredLanguages = splitCsv(selectedJob.required_languages)
      const languageFit =
        requiredLanguages.length === 0 ||
        requiredLanguages.every((required) => candidateLanguages.includes(required))


      const phoneNorm = normalizeDigits(candidate.phone_norm ?? candidate.phone ?? '')
      const duplicateApplication = (localApplications as any[]).find(
        (application) =>
          String(application.job_code ?? '').toLowerCase() === String(selectedJob.job_code).toLowerCase() &&
          normalizeDigits(application.phone_norm ?? application.candidate_phone ?? '') === phoneNorm,
      )


      if (!roleFit || !languageFit) return


      const breakdown = buildBreakdown(candidate, selectedJob, candidateLanguages, requiredLanguages)
      const score = clampScore(
        breakdown.role +
          breakdown.experience +
          breakdown.salary +
          breakdown.language +
          breakdown.scope +
          breakdown.bonus +
          breakdown.secondary,
      )


      const missingSignals = getMissingSignals(candidate)
      const partial = missingSignals.length > 0
      const secondarySignals = getSecondarySignals(candidate, selectedJob)
      const explainer = buildExplainer({
        selectedJob,
        breakdown,
        secondarySignals,
      })
      const aiSummary = buildAiSummary({ candidate, selectedJob, score, missingSignals })
      const recommendation = buildRecommendation({
        score,
        duplicateBlocked: Boolean(duplicateApplication),
        missingSignals,
        hasCv: Boolean(candidate.has_cv && candidate.cv_link),
      })


      results.push({
        candidate,
        score,
        breakdown,
        explainer,
        aiSummary,
        recommendation,
        missingSignals,
        hasExistingApplication: Boolean(duplicateApplication),
        existingApplicationId: duplicateApplication ? Number(duplicateApplication.application_id) : null,
        scopeFit: breakdown.scope >= 8,
        salaryFit: breakdown.salary >= 10,
        languageFit,
        roleFit,
        partial,
        secondarySignals,
      })
    })


    return results.sort((a, b) => b.score - a.score)
  }, [selectedJob, candidates, localApplications])


  const filteredMatches = useMemo(() => {
    return computedMatches.filter((match) => {
      if (match.score < filters.minimumScore) return false
      if (filters.availability && Number(match.candidate.availability) !== Number(filters.availability)) return false
      if (filters.experience && Number(match.candidate.experience) !== Number(filters.experience)) return false
      if (filters.hasCvOnly && !(match.candidate.has_cv && match.candidate.cv_link)) return false
      if (filters.language) {
        const candidateLanguages = splitCsv(match.candidate.languages)
        if (!candidateLanguages.includes(filters.language)) return false
      }
      if (filters.scopeFit === 'yes' && !match.scopeFit) return false
      if (filters.salaryFit === 'yes' && !match.salaryFit) return false
      if (filters.region && Number(match.candidate.region_id) !== Number(filters.region)) return false
      if (filters.city && Number(match.candidate.city_id) !== Number(filters.city)) return false
      if (filters.nonAppliedOnly && match.hasExistingApplication) return false
      if (filters.activeSeekersOnly && !isActiveSeeker(match.candidate)) return false
      if (filters.profileType && Number(match.candidate.profile_type) !== Number(filters.profileType)) return false
      if (filters.tag) {
        const tags = INITIAL_TAGS_BY_CONTACT[Number(match.candidate.contact_id)] ?? []
        if (!tags.includes(filters.tag as (typeof IMPORTANT_TAGS)[number])) return false
      }
      return true
    })
  }, [computedMatches, filters])


  useEffect(() => {
    if (!selectedCandidateId && filteredMatches.length > 0) {
      setSelectedCandidateId(Number(filteredMatches[0].candidate.contact_id))
      return
    }


    if (
      selectedCandidateId &&
      !filteredMatches.some((match) => Number(match.candidate.contact_id) === Number(selectedCandidateId))
    ) {
      setSelectedCandidateId(filteredMatches.length ? Number(filteredMatches[0].candidate.contact_id) : null)
    }
  }, [filteredMatches, selectedCandidateId])


  const selectedMatch = useMemo(() => {
    return filteredMatches.find((match) => Number(match.candidate.contact_id) === Number(selectedCandidateId)) ?? null
  }, [filteredMatches, selectedCandidateId])


  const matchKpis = useMemo(() => {
    const total = filteredMatches.length
    const strong = filteredMatches.filter((match) => match.score >= 85).length
    const good = filteredMatches.filter((match) => match.score >= 70 && match.score < 85).length
    const partial = filteredMatches.filter((match) => match.partial).length
    const notApplied = filteredMatches.filter((match) => !match.hasExistingApplication).length
    return { total, strong, good, partial, notApplied }
  }, [filteredMatches])


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
  }


  const resetFilters = () => {
    setFilters({
      minimumScore: 55,
      hasCvOnly: false,
      nonAppliedOnly: true,
      activeSeekersOnly: false,
    })
  }


  const exportResults = () => {
    const rows = filteredMatches.map((match) => ({
      'שם מועמד': match.candidate.full_name ?? match.candidate.display_name ?? '',
      תפקיד: roleName(match.candidate.role),
      'תת־תפקיד': subRoleName(match.candidate.sub_role),
      'עיר / אזור': `${cityName(match.candidate.city_id)} / ${regionName(match.candidate.region_id)}`,
      זמינות: availabilityName(match.candidate.availability),
      ניסיון: experienceName(match.candidate.experience),
      שפות: match.candidate.languages ?? '',
      'ציפיות שכר': formatCandidateSalary(
        match.candidate.salary_expectation_hourly,
        match.candidate.salary_expectation_monthly,
      ),
      'יש קו"ח': match.candidate.has_cv && match.candidate.cv_link ? 'כן' : 'לא',
      ציון: match.score,
      'פירוט ציון': `Role ${match.breakdown.role} | Experience ${match.breakdown.experience} | Salary ${match.breakdown.salary} | Language ${match.breakdown.language} | Scope ${match.breakdown.scope} | Bonus ${match.breakdown.bonus} | Secondary ${match.breakdown.secondary}`,
      הסבר: match.explainer,
      המלצה: match.recommendation,
      'קיימת הגשה': match.hasExistingApplication ? 'כן' : 'לא',
    }))


    const csv = toCsv(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `smart-match-${selectedJob?.job_code ?? 'results'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast('הייצוא הושלם', 'success')
  }


  const openCreateApplication = (candidateId: number) => {
    setCreateApplicationState({
      open: true,
      candidateId,
    })
  }


  const submitCreateApplication = () => {
    if (!selectedJob || !createApplicationState.candidateId) return


    const candidate = (candidates as any[]).find(
      (item) => Number(item.contact_id) === Number(createApplicationState.candidateId),
    )
    if (!candidate) {
      showToast('לא נמצא מועמד ליצירת הגשה', 'error')
      return
    }


    const phoneNorm = normalizeDigits(candidate.phone_norm ?? candidate.phone ?? '')
    const existingApplication = (localApplications as any[]).find(
      (application) =>
        String(application.job_code ?? '').toLowerCase() === String(selectedJob.job_code).toLowerCase() &&
        normalizeDigits(application.phone_norm ?? application.candidate_phone ?? '') === phoneNorm,
    )


    if (existingApplication) {
      setDuplicateState({
        blocked: true,
        rowId: Number(existingApplication.application_id),
        message: 'כבר קיימת הגשה למועמד עבור אותה משרה. הפעולה נחסמה.',
      })
      showToast('נחסמה יצירת הגשה כפולה', 'error')
      setCreateApplicationState({ open: false, candidateId: null })
      return
    }


    const nextId =
      (localApplications as any[]).reduce((max, row) => Math.max(max, Number(row.application_id ?? 0)), 0) + 1


    const createdAt = new Date().toISOString()


    const nextApplication = {
      application_id: nextId,
      record_name: `APP-${String(nextId).padStart(3, '0')}`,
      submission_date: createdAt,
      display_date: formatDate(createdAt),
      form_title: 'Smart Match',
      job_code: selectedJob.job_code,
      job_link: selectedJob.job_url ?? null,
      account_name: selectedJob.account_name ?? null,
      job_role: roleName(selectedJob.job_role),
      job_city: cityName(selectedJob.city_id),
      job_region: regionName(selectedJob.region_id),
      candidate_phone: candidate.phone ?? candidate.phone_norm ?? null,
      candidate_name: candidate.full_name ?? candidate.display_name ?? null,
      candidate_email: candidate.email ?? null,
      cv_link: candidate.cv_link ?? null,
      candidate_link: candidate.contact_id,
      candidate_notes: null,
      status_in_master: null,
      check_status: 1,
      job_status_view: 'פעילה',
      application_status: 1,
      master_availability: availabilityName(candidate.availability),
      master_role: roleName(candidate.role),
      master_city: cityName(candidate.city_id),
      master_region: regionName(candidate.region_id),
      internal_notes: 'נוצר מתוך Smart Match',
      phone_norm: candidate.phone_norm ?? phoneNorm,
      created_timestamp: createdAt,
      updated_timestamp: createdAt,
    }


    setLocalApplications((prev) => [nextApplication, ...prev])
    setCreateApplicationState({ open: false, candidateId: null })
    showToast('ההגשה נוצרה בהצלחה', 'success')
  }


  const openWhatsappPitch = (match: MatchRow) => {
    const phone = normalizeDigits(match.candidate.phone_norm ?? match.candidate.phone ?? '')
    if (!phone) {
      showToast('אין טלפון תקין ליצירת פנייה', 'error')
      return
    }


    const firstName = getFirstName(match.candidate.full_name ?? match.candidate.display_name ?? 'שלום')
    const message = `היי ${firstName}, ראיתי התאמה מעניינת למשרת ${selectedJob?.job_title ?? ''} ב-${selectedJob?.account_name ?? ''}. אשמח לתאם שיחה קצרה ולספר לך עליה.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }


  return (
    <Shell
      title="שידוך חכם"
      subtitle={`גילוי מועמדים פרואקטיבי למשרות פתוחות${selectedJob ? ` • ${selectedJob.job_code}` : ''}`}
      icon={Sparkles}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-10 w-10 items-center justify-center ${
                viewMode === 'grid' ? 'bg-[#FFF7ED] text-[#D97706]' : 'text-slate-500'
              }`}
              title="תצוגת גריד"
              aria-label="תצוגת גריד"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-10 w-10 items-center justify-center ${
                viewMode === 'list' ? 'bg-[#F0FDFC] text-[#008080]' : 'text-slate-500'
              }`}
              title="תצוגת רשימה"
              aria-label="תצוגת רשימה"
            >
              <List className="h-4 w-4" />
            </button>
          </div>


          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => showToast('הרשימה רועננה', 'success')}>
            רענון
          </ActionButton>


          <ActionButton variant="ghost" icon={Download} onClick={exportResults} disabled={!selectedJob}>
            ייצוא תוצאות
          </ActionButton>


          {selectedJob ? (
            <Link to={`/jobs/${selectedJob.job_code}`}>
              <ActionButton variant="ghost" icon={ExternalLink}>פתח פרטי משרה</ActionButton>
            </Link>
          ) : null}


          <ActionButton variant="primary" icon={WandSparkles} onClick={resetFilters}>
            איפוס פילטרים
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">בחירת משרה פתוחה</h2>
                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  רק משרות פעילות
                </span>
              </div>


              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,1fr]">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-500">משרה</label>
                  <SelectFilter
                    value={selectedJobCode}
                    onChange={setSelectedJobCode}
                    options={openJobs.map((job: any) => ({
                      value: String(job.job_code),
                      label: `${job.job_code} • ${job.job_title ?? 'ללא כותרת'} • ${roleName(job.job_role)} • ${
                        job.account_name ?? 'ללא ארגון'
                      }`,
                    }))}
                    placeholder="בחר משרה פתוחה..."
                  />
                </div>


                {selectedJobSummary ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <SummaryChip label="קוד משרה" value={selectedJobSummary.jobCode} />
                    <SummaryChip label="תפקיד" value={selectedJobSummary.role} />
                    <SummaryChip label="מעסיק" value={selectedJobSummary.employer} />
                    <SummaryChip label="אזור / עיר" value={`${selectedJobSummary.region} / ${selectedJobSummary.city}`} />
                    <SummaryChip label="ניסיון" value={selectedJobSummary.experience} />
                    <SummaryChip label="שכר" value={selectedJobSummary.salaryRange} />
                    <SummaryChip label="שפות" value={selectedJobSummary.languages} />
                    <SummaryChip label="היקף" value={selectedJobSummary.scope} />
                  </div>
                ) : null}
              </div>
            </div>
          </Toolbar>


          {!selectedJob ? (
            <Toolbar>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={Sparkles}
                  title="עדיין לא נבחרה משרה"
                  description="בחרי משרה פתוחה כדי להתחיל בחישוב התאמות."
                />
              </div>
            </Toolbar>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard label='סה"כ תוצאות' value={matchKpis.total} tone="default" />
                <KpiCard label="התאמה חזקה" value={matchKpis.strong} tone="success" />
                <KpiCard label="התאמה טובה" value={matchKpis.good} tone="accent" />
                <KpiCard label="תוצאות Partial" value={matchKpis.partial} tone="warning" />
                <KpiCard label="ללא הגשה קיימת" value={matchKpis.notApplied} tone="default" />
              </section>


              <Toolbar>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#3B82F6]">
                      <Star className="h-4 w-4" />
                    </div>
                    <h2 className="text-[15px] font-bold text-[#0F172A]">לוגיקת ההתאמה</h2>
                  </div>


                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <LogicPill label="Role" value="סינון קשיח" tone="default" />
                    <LogicPill label="Experience" value="לוגיקת טווח" tone="default" />
                    <LogicPill label="Salary" value="לוגיקת טווח" tone="default" />
                    <LogicPill label="Language" value="דרישת חובה" tone="default" />
                    <LogicPill label="Work Scope" value="בדיקת חפיפה" tone="default" />
                    <LogicPill label="Sub Role" value="בונוס" tone="accent" />
                    <LogicPill label="Region / City" value="דירוג משני" tone="muted" />
                    <LogicPill label="Availability" value="דירוג משני" tone="muted" />
                  </div>
                </div>
              </Toolbar>


              <Toolbar>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                      <Filter className="h-4 w-4" />
                    </div>
                    <h2 className="text-[15px] font-bold text-[#0F172A]">פילטרים</h2>
                    <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                      אחרי חישוב score
                    </span>
                  </div>


                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                    <SelectFilter
                      value={String(filters.minimumScore)}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, minimumScore: Number(value || 55) }))
                      }
                      options={[
                        { value: '55', label: 'ציון מינימום 55' },
                        { value: '70', label: 'ציון מינימום 70' },
                        { value: '85', label: 'ציון מינימום 85' },
                      ]}
                      placeholder="ציון מינימום"
                    />


                    <SelectFilter
                      value={String(filters.availability ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          availability: value ? Number(value) : undefined,
                        }))
                      }
                      options={availability.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="זמינות"
                    />


                    <SelectFilter
                      value={String(filters.experience ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          experience: value ? Number(value) : undefined,
                        }))
                      }
                      options={experience.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="ניסיון"
                    />


                    <SelectFilter
                      value={String(filters.language ?? '')}
                      onChange={(value) => setFilters((prev) => ({ ...prev, language: value || undefined }))}
                      options={languageOptions.map((language) => ({
                        value: language,
                        label: language,
                      }))}
                      placeholder="שפה"
                    />


                    <SelectFilter
                      value={String(filters.region ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, region: value ? Number(value) : undefined }))
                      }
                      options={regions.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="אזור"
                    />


                    <SelectFilter
                      value={String(filters.city ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, city: value ? Number(value) : undefined }))
                      }
                      options={cities.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="עיר"
                    />


                    <SelectFilter
                      value={String(filters.profileType ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          profileType: value ? Number(value) : undefined,
                        }))
                      }
                      options={profileTypes.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="סוג פרופיל"
                    />


                    <SelectFilter
                      value={String(filters.tag ?? '')}
                      onChange={(value) => setFilters((prev) => ({ ...prev, tag: value || undefined }))}
                      options={IMPORTANT_TAGS.map((tag) => ({
                        value: tag,
                        label: tag,
                      }))}
                      placeholder="תגית"
                    />


                    <SelectFilter
                      value={String(filters.scopeFit ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          scopeFit: value ? 'yes' : undefined,
                        }))
                      }
                      options={[{ value: 'yes', label: 'היקף מתאים' }]}
                      placeholder="התאמת היקף"
                    />


                    <SelectFilter
                      value={String(filters.salaryFit ?? '')}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          salaryFit: value ? 'yes' : undefined,
                        }))
                      }
                      options={[{ value: 'yes', label: 'שכר מתאים' }]}
                      placeholder="התאמת שכר"
                    />
                  </div>


                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <FilterChip
                      active={filters.hasCvOnly}
                      onClick={() => setFilters((prev) => ({ ...prev, hasCvOnly: !prev.hasCvOnly }))}
                    >
                      עם קו"ח בלבד
                    </FilterChip>


                    <FilterChip
                      active={filters.nonAppliedOnly}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, nonAppliedOnly: !prev.nonAppliedOnly }))
                      }
                    >
                      ללא הגשה קיימת
                    </FilterChip>


                    <FilterChip
                      active={filters.activeSeekersOnly}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          activeSeekersOnly: !prev.activeSeekersOnly,
                        }))
                      }
                    >
                      מחפשים אקטיביים בלבד
                    </FilterChip>


                    <div className="ms-auto flex flex-wrap gap-2">
                      <InfoPill label={`${filteredMatches.length} תוצאות`} />
                      <ActionButton variant="ghost" onClick={resetFilters}>
                        נקה פילטרים
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </Toolbar>


              {duplicateState.blocked && (
                <Toolbar>
                  <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[14px] font-bold text-[#991B1B]">
                          <AlertTriangle className="h-4 w-4" />
                          Duplicate Blocked
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-[#7F1D1D]">
                          {duplicateState.message}
                        </div>
                      </div>


                      {duplicateState.rowId ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              showToast(`קיימת הגשה מספר ${duplicateState.rowId}`, 'info')
                            }
                            className="inline-flex h-10 items-center rounded-xl border border-[#FECACA] bg-white px-4 text-[13px] font-semibold text-[#991B1B] shadow-sm transition hover:bg-[#FFF1F2]"
                          >
                            פתח הגשה קיימת
                          </button>


                          <button
                            type="button"
                            onClick={() => setDuplicateState({ blocked: false, rowId: null, message: '' })}
                            className="inline-flex h-10 items-center rounded-xl border border-[#FECACA] bg-white px-4 text-[13px] font-semibold text-[#991B1B] shadow-sm transition hover:bg-[#FFF1F2]"
                          >
                            סגור
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Toolbar>
              )}


              {filteredMatches.length === 0 ? (
                <Toolbar>
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <EmptyState
                      icon={Sparkles}
                      title="אין התאמות למשרה"
                      description="לא נמצאו מועמדים לאחר חישוב ההתאמה והפילטרים."
                    />
                  </div>
                </Toolbar>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),420px]">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredMatches.map((match) => (
                      <MatchGridCard
                        key={match.candidate.contact_id}
                        match={match}
                        roleName={roleName}
                        subRoleName={subRoleName}
                        cityName={cityName}
                        regionName={regionName}
                        availabilityName={availabilityName}
                        experienceName={experienceName}
                        onOpen={() => setSelectedCandidateId(Number(match.candidate.contact_id))}
                        onCreateApplication={() => openCreateApplication(Number(match.candidate.contact_id))}
                        onWhatsapp={() => openWhatsappPitch(match)}
                      />
                    ))}
                  </div>


                  <div>
                    {selectedMatch ? (
                      <CandidateSheet
                        match={selectedMatch}
                        selectedJob={selectedJob}
                        roleName={roleName}
                        subRoleName={subRoleName}
                        cityName={cityName}
                        regionName={regionName}
                        availabilityName={availabilityName}
                        experienceName={experienceName}
                        profileTypeName={profileTypeName}
                        onCreateApplication={() =>
                          openCreateApplication(Number(selectedMatch.candidate.contact_id))
                        }
                        onWhatsapp={() => openWhatsappPitch(selectedMatch)}
                      />
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                        <EmptyState
                          icon={UserRound}
                          title="בחרי מועמד"
                          description="בחרי כרטיס כדי לראות פירוט מלא ולבצע פעולות."
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),420px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-[1720px] w-full text-right">
                        <thead className="bg-[#F8FAFC]">
                          <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                            <th className="px-4 py-3">מועמד</th>
                            <th className="px-4 py-3">תפקיד / תת־תפקיד</th>
                            <th className="px-4 py-3">עיר / אזור</th>
                            <th className="px-4 py-3">זמינות</th>
                            <th className="px-4 py-3">ניסיון</th>
                            <th className="px-4 py-3">שכר</th>
                            <th className="px-4 py-3">שפות</th>
                            <th className="px-4 py-3">קו״ח</th>
                            <th className="px-4 py-3">ציון</th>
                            <th className="px-4 py-3">Breakdown</th>
                            <th className="px-4 py-3">Explainer</th>
                            <th className="px-4 py-3">פעולות</th>
                          </tr>
                        </thead>


                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredMatches.map((match) => (
                            <tr
                              key={match.candidate.contact_id}
                              className="cursor-pointer text-[13px] font-medium text-[#0F172A] transition hover:bg-slate-50"
                              onClick={() => setSelectedCandidateId(Number(match.candidate.contact_id))}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[15px] font-bold text-[#008080]">
                                    {(match.candidate.full_name ?? '?').charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-[14px] font-bold text-[#0F172A]">
                                      {match.candidate.full_name ?? match.candidate.display_name ?? '—'}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {match.partial ? <InlineSignal tone="warning">Partial</InlineSignal> : null}
                                      {match.hasExistingApplication ? (
                                        <InlineSignal tone="danger">הגשה קיימת</InlineSignal>
                                      ) : (
                                        <InlineSignal tone="success">ללא הגשה</InlineSignal>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>


                              <td className="px-4 py-3">
                                {roleName(match.candidate.role)} / {subRoleName(match.candidate.sub_role)}
                              </td>
                              <td className="px-4 py-3">
                                {cityName(match.candidate.city_id)} / {regionName(match.candidate.region_id)}
                              </td>
                              <td className="px-4 py-3">{availabilityName(match.candidate.availability)}</td>
                              <td className="px-4 py-3">{experienceName(match.candidate.experience)}</td>
                              <td className="px-4 py-3">
                                {formatCandidateSalary(
                                  match.candidate.salary_expectation_hourly,
                                  match.candidate.salary_expectation_monthly,
                                )}
                              </td>
                              <td className="px-4 py-3">{match.candidate.languages ?? '—'}</td>
                              <td className="px-4 py-3">
                                {match.candidate.has_cv && match.candidate.cv_link ? (
                                  <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-semibold text-[#16A34A]">
                                    יש
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-[#FFFBEB] px-2.5 py-1 text-[12px] font-semibold text-[#D97706]">
                                    חסר
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <ScoreBadge score={match.score} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="min-w-[220px] space-y-1 text-[12px] text-slate-600">
                                  <div>Role {match.breakdown.role}</div>
                                  <div>Experience {match.breakdown.experience}</div>
                                  <div>Salary {match.breakdown.salary}</div>
                                  <div>Language {match.breakdown.language}</div>
                                  <div>Scope {match.breakdown.scope}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-[280px] whitespace-normal">{match.explainer}</div>
                              </td>
                              <td
                                className="px-4 py-3"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5">
                                  <IconAction
                                    title="פתח פירוט"
                                    onClick={() => setSelectedCandidateId(Number(match.candidate.contact_id))}
                                    icon={<Eye className="h-4 w-4" />}
                                  />


                                  <IconAction
                                    title="360 מועמד"
                                    asLink={`/admin/candidates/${match.candidate.contact_id}`}
                                    onClick={() => {}}
                                    icon={<UserRound className="h-4 w-4" />}
                                  />


                                  <IconAction
                                    title="וואטסאפ"
                                    onClick={() => openWhatsappPitch(match)}
                                    disabled={!normalizeDigits(match.candidate.phone_norm ?? match.candidate.phone ?? '')}
                                    icon={<MessageCircle className="h-4 w-4" />}
                                  />


                                  <IconAction
                                    title='פתח קו"ח'
                                    href={match.candidate.cv_link ?? undefined}
                                    onClick={() => {}}
                                    disabled={!(match.candidate.has_cv && match.candidate.cv_link)}
                                    icon={<FileText className="h-4 w-4" />}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>


                  <div>
                    {selectedMatch ? (
                      <CandidateSheet
                        match={selectedMatch}
                        selectedJob={selectedJob}
                        roleName={roleName}
                        subRoleName={subRoleName}
                        cityName={cityName}
                        regionName={regionName}
                        availabilityName={availabilityName}
                        experienceName={experienceName}
                        profileTypeName={profileTypeName}
                        onCreateApplication={() =>
                          openCreateApplication(Number(selectedMatch.candidate.contact_id))
                        }
                        onWhatsapp={() => openWhatsappPitch(selectedMatch)}
                      />
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                        <EmptyState
                          icon={UserRound}
                          title="בחרי מועמד"
                          description="בחרי שורה כדי לראות פירוט מלא ולבצע פעולות."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>


        {createApplicationState.open && (
          <Modal onClose={() => setCreateApplicationState({ open: false, candidateId: null })}>
            <div className="space-y-4">
              <div>
                <h3 className="text-[22px] font-bold text-[#0F172A]">יצירת הגשה</h3>
                <p className="mt-1 text-[13px] font-medium text-slate-500">
                  בדיקת duplicate guard לפני יצירה
                </p>
              </div>


              <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DetailLine label="משרה" value={selectedJob?.job_title ?? '—'} />
                  <DetailLine label="קוד משרה" value={selectedJob?.job_code ?? '—'} />
                  <DetailLine
                    label="מועמד"
                    value={
                      (candidates as any[]).find(
                        (item) => Number(item.contact_id) === Number(createApplicationState.candidateId),
                      )?.full_name ?? '—'
                    }
                  />
                  <DetailLine
                    label="טלפון"
                    value={
                      (candidates as any[]).find(
                        (item) => Number(item.contact_id) === Number(createApplicationState.candidateId),
                      )?.phone_norm ??
                      (candidates as any[]).find(
                        (item) => Number(item.contact_id) === Number(createApplicationState.candidateId),
                      )?.phone ??
                      '—'
                    }
                  />
                </div>
              </div>


              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateApplicationState({ open: false, candidateId: null })}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  ביטול
                </button>


                <button
                  type="button"
                  onClick={submitCreateApplication}
                  className="inline-flex h-10 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                  צור הגשה
                </button>
              </div>
            </div>
          </Modal>
        )}


        {toast.open && (
          <div className="fixed bottom-6 left-6 z-[70]">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-lg ${
                toast.tone === 'success'
                  ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                  : toast.tone === 'error'
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
              }`}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {toast.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
                {toast.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : null}
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}


function MatchGridCard({
  match,
  roleName,
  subRoleName,
  cityName,
  regionName,
  availabilityName,
  experienceName,
  onOpen,
  onCreateApplication,
  onWhatsapp,
}: {
  match: MatchRow
  roleName: (id: number | null | undefined) => string
  subRoleName: (id: number | null | undefined) => string
  cityName: (id: number | null | undefined) => string
  regionName: (id: number | null | undefined) => string
  availabilityName: (id: number | null | undefined) => string
  experienceName: (id: number | null | undefined) => string
  onOpen: () => void
  onCreateApplication: () => void
  onWhatsapp: () => void
}) {
  const [expanded, setExpanded] = useState(false)


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#008080]/20 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[16px] font-bold text-[#008080]">
            {(match.candidate.full_name ?? '?').charAt(0)}
          </div>


          <div>
            <div className="text-[15px] font-bold text-[#0F172A]">
              {match.candidate.full_name ?? match.candidate.display_name ?? '—'}
            </div>
            <div className="mt-1 text-[12px] text-slate-500">
              {roleName(match.candidate.role)} / {subRoleName(match.candidate.sub_role)}
            </div>
            <div className="mt-1 text-[12px] text-slate-500">
              {cityName(match.candidate.city_id)} / {regionName(match.candidate.region_id)}
            </div>
          </div>
        </div>


        <ScoreBadge score={match.score} />
      </div>


      <div className="space-y-2 text-[13px]">
        <GridInfoRow label="זמינות" value={availabilityName(match.candidate.availability)} />
        <GridInfoRow label="ניסיון" value={experienceName(match.candidate.experience)} />
        <GridInfoRow
          label="שכר"
          value={formatCandidateSalary(
            match.candidate.salary_expectation_hourly,
            match.candidate.salary_expectation_monthly,
          )}
        />
        <GridInfoRow label="שפות" value={match.candidate.languages ?? '—'} />
      </div>


      <div className="mt-4 flex flex-wrap gap-1.5">
        {match.candidate.has_cv && match.candidate.cv_link ? (
          <InlineSignal tone="success">יש קו"ח</InlineSignal>
        ) : (
          <InlineSignal tone="warning">ללא קו"ח</InlineSignal>
        )}
        {match.partial ? <InlineSignal tone="warning">Partial</InlineSignal> : null}
        {match.hasExistingApplication ? (
          <InlineSignal tone="danger">הגשה קיימת</InlineSignal>
        ) : (
          <InlineSignal tone="success">ללא הגשה</InlineSignal>
        )}
      </div>


      <div className="mt-4 rounded-xl bg-[#F8FAFC] p-3">
        <div className="mb-2 text-[12px] font-semibold text-slate-500">פירוט ציון</div>
        <div className="space-y-2">
          <ScoreRow label="Role" value={match.breakdown.role} max={ROLE_WEIGHT} />
          <ScoreRow label="Experience" value={match.breakdown.experience} max={EXPERIENCE_WEIGHT} />
          <ScoreRow label="Salary" value={match.breakdown.salary} max={SALARY_WEIGHT} />
          <ScoreRow label="Language" value={match.breakdown.language} max={LANGUAGE_WEIGHT} />
          <ScoreRow label="Scope" value={match.breakdown.scope} max={SCOPE_WEIGHT} />
        </div>
      </div>


      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <span>הסבר והמלצה</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>


      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[12px] font-semibold text-slate-500">Explainer</div>
            <div className="mt-1 text-[13px] font-medium text-[#0F172A]">{match.explainer}</div>
          </div>


          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[12px] font-semibold text-slate-500">המלצה</div>
            <div className="mt-1 text-[13px] font-medium text-[#0F172A]">{match.recommendation}</div>
          </div>
        </div>
      )}


      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          פירוט מלא
        </button>


        <button
          type="button"
          onClick={onWhatsapp}
          disabled={!normalizeDigits(match.candidate.phone_norm ?? match.candidate.phone ?? '')}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          WhatsApp
        </button>


        <button
          type="button"
          onClick={onCreateApplication}
          disabled={match.hasExistingApplication}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#008080] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          צור הגשה
        </button>


        <Link
          to={`/admin/candidates/${match.candidate.contact_id}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          360 מועמד
        </Link>
      </div>
    </div>
  )
}


function CandidateSheet({
  match,
  selectedJob,
  roleName,
  subRoleName,
  cityName,
  regionName,
  availabilityName,
  experienceName,
  profileTypeName,
  onCreateApplication,
  onWhatsapp,
}: {
  match: MatchRow
  selectedJob: any
  roleName: (id: number | null | undefined) => string
  subRoleName: (id: number | null | undefined) => string
  cityName: (id: number | null | undefined) => string
  regionName: (id: number | null | undefined) => string
  availabilityName: (id: number | null | undefined) => string
  experienceName: (id: number | null | undefined) => string
  profileTypeName: (id: number | null | undefined) => string
  onCreateApplication: () => void
  onWhatsapp: () => void
}) {
  const candidate = match.candidate


  return (
    <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[18px] font-bold text-[#008080]">
            {(candidate.full_name ?? '?').charAt(0)}
          </div>


          <div>
            <h3 className="text-[22px] font-bold text-[#0F172A]">
              {candidate.full_name ?? candidate.display_name ?? '—'}
            </h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <InlineSignal tone="success">{roleName(candidate.role)}</InlineSignal>
              <InlineSignal tone="muted">{profileTypeName(candidate.profile_type)}</InlineSignal>
              <InlineSignal tone="warning">{availabilityName(candidate.availability)}</InlineSignal>
            </div>
          </div>
        </div>


        <ScoreBadge score={match.score} />
      </div>


      <SectionCard title="פרטי קשר">
        <DetailsGrid
          items={[
            { label: 'טלפון', value: candidate.phone_norm ?? candidate.phone ?? '—' },
            { label: 'אימייל', value: candidate.email ?? '—' },
            { label: 'עיר / אזור', value: `${cityName(candidate.city_id)} / ${regionName(candidate.region_id)}` },
            { label: 'מעסיק נוכחי', value: candidate.current_employer ?? '—' },
          ]}
        />
      </SectionCard>


      <div className="mt-4" />


      <SectionCard title="פרופיל מקצועי">
        <DetailsGrid
          items={[
            { label: 'תפקיד', value: roleName(candidate.role) },
            { label: 'תת־תפקיד', value: subRoleName(candidate.sub_role) },
            { label: 'ניסיון', value: experienceName(candidate.experience) },
            { label: 'זמינות', value: availabilityName(candidate.availability) },
            { label: 'שפות', value: candidate.languages ?? '—' },
            { label: 'היקף מועדף', value: candidate.preferred_scope ?? '—' },
            {
              label: 'שכר',
              value: formatCandidateSalary(
                candidate.salary_expectation_hourly,
                candidate.salary_expectation_monthly,
              ),
            },
            {
              label: 'קו"ח',
              value: candidate.has_cv && candidate.cv_link ? 'קיים' : 'חסר',
            },
            {
              label: 'מספר הגשות קודמות',
              value: String(candidate.prev_applications_count ?? 0),
            },
          ]}
        />
      </SectionCard>


      <div className="mt-4" />


      <SectionCard title="Breakdown מפורט">
        <div className="space-y-3">
          <ScoreRow label="Role" value={match.breakdown.role} max={ROLE_WEIGHT} />
          <ScoreRow label="Experience" value={match.breakdown.experience} max={EXPERIENCE_WEIGHT} />
          <ScoreRow label="Salary" value={match.breakdown.salary} max={SALARY_WEIGHT} />
          <ScoreRow label="Language" value={match.breakdown.language} max={LANGUAGE_WEIGHT} />
          <ScoreRow label="Scope" value={match.breakdown.scope} max={SCOPE_WEIGHT} />
          <ScoreRow label="Bonus" value={match.breakdown.bonus} max={BONUS_WEIGHT} />
          <ScoreRow label="Secondary" value={match.breakdown.secondary} max={SECONDARY_WEIGHT} />
        </div>
      </SectionCard>


      <div className="mt-4" />


      <SectionCard title="AI Layer">
        <div className="space-y-3">
          <AiBlock title="AI Summary" value={match.aiSummary} />
          <AiBlock title="Recommendation" value={match.recommendation} />


          <div className="rounded-xl bg-[#F8FAFC] p-3">
            <div className="text-[12px] font-semibold text-slate-500">Missing Data Signal</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.missingSignals.length ? (
                match.missingSignals.map((signal) => (
                  <InlineSignal key={signal} tone="warning">
                    {signal}
                  </InlineSignal>
                ))
              ) : (
                <InlineSignal tone="success">אין חסרים קריטיים</InlineSignal>
              )}
            </div>
          </div>


          <AiBlock title="Explainer" value={match.explainer} />
        </div>
      </SectionCard>


      <div className="mt-4" />


      <SectionCard title="פעולות">
        <div className="grid grid-cols-1 gap-2">
          <Link
            to={`/admin/candidates/${candidate.contact_id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Candidate 360
          </Link>


          <button
            type="button"
            onClick={onWhatsapp}
            disabled={!normalizeDigits(candidate.phone_norm ?? candidate.phone ?? '')}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            WhatsApp Pitch
          </button>


          {candidate.has_cv && candidate.cv_link ? (
            <a
              href={candidate.cv_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open CV
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-400 transition"
            >
              Open CV
            </button>
          )}


          <button
            type="button"
            onClick={onCreateApplication}
            disabled={match.hasExistingApplication}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#008080] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Create Application
          </button>


          <button
            type="button"
            onClick={() => window.alert(`תיאום ראיון מול ${candidate.full_name ?? candidate.display_name ?? 'המועמד'}`)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D97706]/20 bg-[#FFF7ED] px-3 text-[13px] font-semibold text-[#D97706] transition hover:bg-[#FFEDD5]"
          >
            Schedule Interview
          </button>
        </div>
      </SectionCard>


      <div className="mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
        <div className="text-[12px] font-semibold text-slate-500">משרה נבחרת</div>
        <div className="mt-1 text-[14px] font-bold text-[#0F172A]">
          {selectedJob?.job_code} • {selectedJob?.job_title}
        </div>
        <div className="mt-2 text-[13px] font-medium text-slate-600">
          {selectedJob?.account_name} • {selectedJob?.scope ?? '—'}
        </div>
      </div>
    </div>
  )
}


function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'default' | 'success' | 'warning' | 'accent'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
      : tone === 'warning'
        ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
        : tone === 'accent'
          ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]'
          : 'border-slate-200 bg-white text-[#008080]'


  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[12px] font-semibold">{label}</div>
      <div className="mt-2 text-[24px] font-bold">{value}</div>
    </div>
  )
}


function SummaryChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[#0F172A]">{value}</div>
    </div>
  )
}


function LogicPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'default' | 'accent' | 'muted'
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === 'accent'
          ? 'border-[#FED7AA] bg-[#FFF7ED]'
          : tone === 'muted'
            ? 'border-slate-200 bg-[#F8FAFC]'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div
        className={`mt-1 text-[13px] font-semibold ${
          tone === 'accent' ? 'text-[#D97706]' : 'text-[#0F172A]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}


function FilterChip({
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
      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
        active
          ? 'bg-[#FFF7ED] text-[#D97706]'
          : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}


function InfoPill({ label }: { label: string }) {
  return <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[12px] font-semibold text-slate-600">{label}</span>
}


function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 85
      ? 'bg-[#F0FDF4] text-[#15803D]'
      : score >= 70
        ? 'bg-[#EFF6FF] text-[#1D4ED8]'
        : score >= 55
          ? 'bg-[#FFF7ED] text-[#D97706]'
          : 'bg-[#F8FAFC] text-slate-600'


  return (
    <div className={`flex h-12 min-w-[48px] items-center justify-center rounded-2xl px-3 text-[18px] font-bold ${style}`}>
      {score}
    </div>
  )
}


function ScoreRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className="font-semibold text-[#0F172A]">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[#008080]" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}


function GridInfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      <span className="text-[13px] font-semibold text-[#0F172A]">{value}</span>
    </div>
  )
}


function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-4 text-[16px] font-bold text-[#0F172A]">{title}</h4>
      {children}
    </div>
  )
}


function DetailsGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-xl bg-[#F8FAFC] p-3">
          <div className="text-[12px] font-semibold text-slate-500">{item.label}</div>
          <div className="mt-1 text-[13px] font-semibold text-[#0F172A]">{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}


function AiBlock({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3">
      <div className="text-[12px] font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-[13px] font-medium text-[#0F172A]">{value}</div>
    </div>
  )
}


function Modal({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[680px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          aria-label="סגור"
          title="סגור"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}


function DetailLine({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[#0F172A]">{value}</div>
    </div>
  )
}


function InlineSignal({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'warning' | 'danger' | 'muted' | 'success'
}) {
  const style =
    tone === 'warning'
      ? 'bg-[#FFFBEB] text-[#D97706]'
      : tone === 'danger'
        ? 'bg-[#FEF2F2] text-[#DC2626]'
        : tone === 'success'
          ? 'bg-[#F0FDF4] text-[#16A34A]'
          : 'bg-[#F8FAFC] text-slate-500'


  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>{children}</span>
}


function IconAction({
  title,
  onClick,
  icon,
  asLink,
  href,
  disabled = false,
}: {
  title: string
  onClick: () => void
  icon: React.ReactNode
  asLink?: string
  href?: string
  disabled?: boolean
}) {
  const className = `inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition ${
    disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-50'
  }`


  if (asLink && !disabled) {
    return (
      <Link to={asLink} className={className} title={title} aria-label={title}>
        {icon}
      </Link>
    )
  }


  if (href && !disabled) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        title={title}
        aria-label={title}
      >
        {icon}
      </a>
    )
  }


  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={className}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}


function splitCsv(value: string | null | undefined) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}


function normalizeDigits(value: string) {
  return String(value ?? '').replace(/\D/g, '')
}


function normalizeJobSubRoleText(value: string | null | undefined) {
  return String(value ?? '').trim() || '—'
}


function getExperienceLevel(id: number | null | undefined) {
  const map: Record<number, number> = {
    1: 0,
    2: 1,
    3: 2,
    4: 4,
    5: 6,
  }
  return map[Number(id)] ?? 0
}


function buildBreakdown(
  candidate: any,
  job: any,
  candidateLanguages: string[],
  requiredLanguages: string[],
): Breakdown {
  const role = Number(candidate.role) === Number(job.job_role) ? ROLE_WEIGHT : 0


  const candidateExp = getExperienceLevel(candidate.experience)
  const requiredExp = getExperienceLevel(job.required_experience)
  const experience =
    candidateExp >= requiredExp
      ? EXPERIENCE_WEIGHT
      : Math.max(0, Math.round((candidateExp / Math.max(requiredExp, 1)) * EXPERIENCE_WEIGHT))


  const salary = calculateSalaryScore(candidate, job)
  const language =
    requiredLanguages.length === 0 ||
    requiredLanguages.every((required) => candidateLanguages.includes(required))
      ? LANGUAGE_WEIGHT
      : 0


  const scope = calculateScopeScore(candidate.preferred_scope, job.scope)
  const bonus = calculateBonusScore(candidate, job)
  const secondary = calculateSecondaryScore(candidate, job)


  return {
    role,
    experience,
    salary,
    language,
    scope,
    bonus,
    secondary,
  }
}


function calculateSalaryScore(candidate: any, job: any) {
  const hourly = typeof candidate.salary_expectation_hourly === 'number' ? candidate.salary_expectation_hourly : null
  const monthly =
    typeof candidate.salary_expectation_monthly === 'number' ? candidate.salary_expectation_monthly : null
  const min = typeof job.salary_min === 'number' ? job.salary_min : null
  const max = typeof job.salary_max === 'number' ? job.salary_max : null


  if (hourly !== null && min !== null && max !== null) {
    if (hourly >= min && hourly <= max) return SALARY_WEIGHT
    if (hourly < min && min - hourly <= Math.max(10, min * 0.1)) return 10
    if (hourly > max && hourly - max <= Math.max(10, max * 0.1)) return 8
    return 3
  }


  if (monthly !== null) return 8
  return 6
}


function calculateScopeScore(candidateScope: string | null | undefined, jobScope: string | null | undefined) {
  if (!jobScope) return 6
  if (!candidateScope) return 5
  if (String(candidateScope).trim() === String(jobScope).trim()) return SCOPE_WEIGHT


  const c = String(candidateScope)
  const j = String(jobScope)


  if ((c.includes('משרה מלאה') && j.includes('משרה חלקית')) || (c.includes('משרה חלקית') && j.includes('משרה מלאה'))) {
    return 5
  }


  if (c.includes('ימים') && j.includes('ימים')) return 8
  if (c.includes('משמרות') && j.includes('משמרות')) return 8


  return 4
}


function calculateBonusScore(candidate: any, job: any) {
  let score = 0
  const subRoleText = String(job.job_sub_role ?? '').trim()
  const candidateSubRole = String(candidate.sub_role ?? '')
  const candidateProfessionalTitle = String(candidate.professional_title ?? '')
  const currentEmployer = String(candidate.current_employer ?? '')


  if (subRoleText && candidateProfessionalTitle && candidateProfessionalTitle.includes(subRoleText)) score += 3
  if (subRoleText && candidateSubRole && subRoleText.includes(candidateSubRole)) score += 1
  if (currentEmployer) score += 1


  return Math.min(BONUS_WEIGHT, score)
}


function calculateSecondaryScore(candidate: any, job: any) {
  let score = 0


  if (Number(candidate.city_id) === Number(job.city_id)) score += 2
  else if (Number(candidate.region_id) === Number(job.region_id)) score += 1


  if ([1, 2].includes(Number(candidate.availability))) score += 2
  else if ([3, 4].includes(Number(candidate.availability))) score += 1


  const hasCoreCompleteness =
    Boolean(candidate.languages) &&
    Boolean(candidate.has_cv && candidate.cv_link) &&
    (candidate.salary_expectation_hourly !== null || candidate.salary_expectation_monthly !== null)


  if (hasCoreCompleteness) score += 1


  return Math.min(SECONDARY_WEIGHT, score)
}


function getMissingSignals(candidate: any) {
  const signals: string[] = []
  if (!(candidate.has_cv && candidate.cv_link)) signals.push('אין קו"ח')
  if (!candidate.languages) signals.push('אין שפות')
  if (!candidate.availability) signals.push('אין זמינות')
  if (candidate.salary_expectation_hourly == null && candidate.salary_expectation_monthly == null) {
    signals.push('אין שכר')
  }
  return signals
}


function getSecondarySignals(candidate: any, job: any) {
  const signals: string[] = []
  if (Number(candidate.city_id) === Number(job.city_id)) signals.push('אותה עיר')
  else if (Number(candidate.region_id) === Number(job.region_id)) signals.push('אותו אזור')
  if ([1, 2].includes(Number(candidate.availability))) signals.push('זמינות גבוהה')
  if (candidate.has_cv && candidate.cv_link) signals.push('פרופיל מלא')
  return signals
}


function buildExplainer({
  selectedJob,
  breakdown,
  secondarySignals,
}: {
  selectedJob: any
  breakdown: Breakdown
  secondarySignals: string[]
}) {
  const parts: string[] = []


  if (breakdown.experience >= 12) parts.push('ניסיון מתאים')
  else if (breakdown.experience >= 8) parts.push('ניסיון קרוב לדרישה')
  else parts.push('ניסיון חלקי')


  if (breakdown.salary >= 12) parts.push('שכר בטווח')
  else if (breakdown.salary >= 8) parts.push('שכר קרוב לטווח')
  else parts.push('פער בשכר')


  if (breakdown.language === LANGUAGE_WEIGHT) parts.push('שפה תואמת')
  if (breakdown.scope >= 8) parts.push('היקף משרה תואם')
  else if (selectedJob.scope) parts.push('חפיפה חלקית בהיקף')


  if (secondarySignals.length) parts.push(secondarySignals[0])


  return parts.join(', ')
}


function buildAiSummary({
  candidate,
  selectedJob,
  score,
  missingSignals,
}: {
  candidate: any
  selectedJob: any
  score: number
  missingSignals: string[]
}) {
  const name = candidate.full_name ?? candidate.display_name ?? 'המועמד'
  if (score >= 85) {
    return `${name} מציג התאמה חזקה למשרת ${selectedJob?.job_title ?? ''}, עם בסיס מקצועי טוב ויכולת מעבר מהירה לשלב פנייה.`
  }
  if (score >= 70) {
    return `${name} הוא מועמד טוב למשרה, אך יש נקודות שכדאי לבדוק לפני יצירת הגשה.`
  }
  if (missingSignals.length) {
    return `${name} עשוי להתאים חלקית, אבל חסרים נתונים שמקשים על החלטה בטוחה.`
  }
  return `${name} מציג התאמה בינונית ודורש אימות ידני נוסף לפני פנייה.`
}


function buildRecommendation({
  score,
  duplicateBlocked,
  missingSignals,
  hasCv,
}: {
  score: number
  duplicateBlocked: boolean
  missingSignals: string[]
  hasCv: boolean
}) {
  if (duplicateBlocked) return 'קיימת כבר הגשה — פתחי את ההגשה הקיימת לפני פעולה נוספת.'
  if (score >= 85 && hasCv) return 'מומלץ ליצור הגשה עכשיו.'
  if (score >= 70 && hasCv) return 'מומלץ לפנות קודם ב־WhatsApp ואז ליצור הגשה.'
  if (missingSignals.length) return 'מומלץ להשלים מידע לפני פנייה.'
  return 'מומלץ לבצע בדיקה ידנית נוספת.'
}


function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}


function formatJobSalary(min: number | null | undefined, max: number | null | undefined, salaryRange: string | null | undefined) {
  if (salaryRange) return salaryRange
  if (typeof min === 'number' && typeof max === 'number') return `${min}-${max} ₪/שעה`
  return 'לא צוין'
}


function formatCandidateSalary(hourly: number | null | undefined, monthly: number | null | undefined) {
  if (typeof hourly === 'number') return `${hourly} ₪/שעה`
  if (typeof monthly === 'number') return `${monthly} ₪/חודש`
  return 'לא צוין'
}


function isActiveSeeker(candidate: any) {
  return [1, 2, 3].includes(Number(candidate.availability))
}


function getFirstName(fullName: string) {
  return String(fullName ?? '').trim().split(' ')[0] || 'שלום'
}


function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const raw = row[header] ?? ''
          const safe = String(raw).replace(/"/g, '""')
          return `"${safe}"`
        })
        .join(','),
    ),
  ]
  return lines.join('\n')
}



