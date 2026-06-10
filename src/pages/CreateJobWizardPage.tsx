import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  Sparkles,
  Building2,
  Search,
  Plus,
  X,
  Send,
  MapPin,
  FileText,
  Users,
  CircleAlert,
} from 'lucide-react'
import { Shell, ActionButton } from '@/components/layout/Shell'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'


const STEPS = [
  'הקשר מעסיק',
  'פרטי משרה',
  'תיאור ו־AI',
  'הפצה ופרסום',
]


const ROLE_PREFIX_MAP: Record<number, string> = {
  1: 'DOC',
  2: 'HYG',
  3: 'AS',
  4: 'MNG',
  5: 'SEC',
  6: 'TEC',
  7: 'ORT',
  8: 'PER',
  9: 'END',
  10: 'SUR',
  11: 'PED',
  12: 'PRO',
  13: 'RAD',
  14: 'RES',
  15: 'ANS',
  16: 'LAB',
  17: 'REC',
  18: 'OTH',
}


type CreateMode = 'existing' | 'new'
type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}


type FormState = {
  existingAccountId: string
  createMode: CreateMode
  newAccountName: string
  newBusId: string
  newBillingEmail: string
  newPhone: string
  relEmployerContact: string


  job_code: string
  job_title: string
  job_role: string
  job_sub_role: string
  job_status: string
  region_id: string
  city_id: string
  address: string
  scope: string
  required_experience: string
  required_languages: string[]


  job_description: string
  job_requirements: string
  notes: string
  ai_refined_description: string


  publish_to_facebook: boolean
  publish_to_website: boolean
  publish_to_whatsapp: boolean
  date_facebook: string
  date_website: string
  date_whatsapp: string
  job_url: string
  publish_intent: boolean
}


const INITIAL_FORM: FormState = {
  existingAccountId: '',
  createMode: 'existing',
  newAccountName: '',
  newBusId: '',
  newBillingEmail: '',
  newPhone: '',
  relEmployerContact: '',


  job_code: '',
  job_title: '',
  job_role: '',
  job_sub_role: '',
  job_status: '1',
  region_id: '',
  city_id: '',
  address: '',
  scope: '',
  required_experience: '',
  required_languages: [],


  job_description: '',
  job_requirements: '',
  notes: '',
  ai_refined_description: '',


  publish_to_facebook: false,
  publish_to_website: false,
  publish_to_whatsapp: false,
  date_facebook: '',
  date_website: '',
  date_whatsapp: '',
  job_url: '',
  publish_intent: false,
}


export default function CreateJobWizardPage() {
  const navigate = useNavigate()

  // ── Supabase dict queries ────────────────────────────────────────────
  const fetchDict = async (table: string) => {
    const { data, error } = await supabase.from(table).select('id,name').order('id')
    if (error) throw error
    return (data ?? []) as Array<{ id: number; name: string }>
  }
  const { data: jobRoles = [] } = useQuery({ queryKey: ['dict_roles'], queryFn: () => fetchDict('dict_roles'), staleTime: 600_000 })
  const { data: jobSubRoles = [] } = useQuery({ queryKey: ['dict_sub_roles'], queryFn: () => fetchDict('dict_sub_roles'), staleTime: 600_000 })
  const { data: scopeOptions = [] } = useQuery({ queryKey: ['dict_scopes'], queryFn: () => fetchDict('dict_scopes'), staleTime: 600_000 })
  const { data: experienceOpts = [] } = useQuery({ queryKey: ['dict_experience'], queryFn: () => fetchDict('dict_experience'), staleTime: 600_000 })
  const { data: regions = [] } = useQuery({ queryKey: ['dict_regions'], queryFn: () => fetchDict('dict_regions'), staleTime: 600_000 })
  const { data: allCities = [] } = useQuery<Array<{ id: number; name: string; region_id: number | null }>>({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('id')
      if (error) throw error
      return (data ?? []) as Array<{ id: number; name: string; region_id: number | null }>
    },
    staleTime: 600_000,
  })
  const { data: jobStatusOpts = [] } = useQuery({ queryKey: ['dict_job_statuses'], queryFn: () => fetchDict('dict_job_statuses'), staleTime: 600_000 })
  const { data: accounts = [] } = useQuery<Array<{ account_id: number; account_name: string | null; bus_id?: string | null; phone?: string | null; region_id?: number | null; city_id?: number | null; address?: string | null }>>({
    queryKey: ['accounts-wizard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name,bus_id,phone,region_id,city_id,address').order('account_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  // ── dicts shim for backward-compat ─────────────────────────────────
  const dicts = {
    roles: jobRoles,
    subRoles: jobSubRoles,
    scopes: scopeOptions,
    experience: experienceOpts,
    regions,
    cities: allCities,
    jobStatuses: jobStatusOpts,
    languages: [] as Array<{ id: number; name: string }>,
  }
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [aiPending, setAiPending] = useState(false)
  const [saveDraftPending, setSaveDraftPending] = useState(false)
  const [submitPending, setSubmitPending] = useState(false)
  const [accountSearch, setAccountSearch] = useState('')
  const contacts: any[] = [] // contacts not loaded in wizard — placeholder


  const roles = dicts.roles
  const subRoles = dicts.subRoles
  // regions already declared from useQuery above
  const cities = dicts.cities
  const scopes = dicts.scopes
  const experience = dicts.experience
  const jobStatuses = dicts.jobStatuses
  const languages = dicts.languages


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  function showToast(message: string, tone: 'success' | 'error' | 'info') {
    setToast({ open: true, tone, message })
  }


  useEffect(() => {
    if (form.job_role && !form.job_code) {
      const suggested = suggestJobCode(form.job_role)
      setForm((prev) => ({ ...prev, job_code: suggested }))
    }
  }, [form.job_role, form.job_code])


  useEffect(() => {
    if (!form.publish_intent) return


    const today = getTodayIso()


    setForm((prev) => ({
      ...prev,
      date_facebook: prev.publish_to_facebook && !prev.date_facebook ? today : prev.date_facebook,
      date_website: prev.publish_to_website && !prev.date_website ? today : prev.date_website,
      date_whatsapp: prev.publish_to_whatsapp && !prev.date_whatsapp ? today : prev.date_whatsapp,
    }))
  }, [
    form.publish_intent,
    form.publish_to_facebook,
    form.publish_to_website,
    form.publish_to_whatsapp,
  ])


  const roleOptions = roles.map((item: any) => ({
    value: String(item.id),
    label: item.name,
  }))


  const filteredAccounts = useMemo(() => {
    const search = accountSearch.trim().toLowerCase()
    if (!search) return accounts


    return accounts.filter((account: any) => {
      const name = String(account.account_name ?? '').toLowerCase()
      const busId = String(account.bus_id ?? '').toLowerCase()
      const city = String(
        cities.find((cityItem: any) => cityItem.id === account.city_id)?.name ?? '',
      ).toLowerCase()
      const status = String(account.account_status ?? '').toLowerCase()


      return (
        name.includes(search) ||
        busId.includes(search) ||
        city.includes(search) ||
        status.includes(search)
      )
    })
  }, [accountSearch, accounts, cities])


  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account: any) => String(account.account_id) === String(form.existingAccountId),
      ) ?? null,
    [accounts, form.existingAccountId],
  )


  const accountContacts = useMemo(() => {
    if (!selectedAccount) return []
    return contacts.filter(
      (contact: any) => Number(contact.account_link) === Number(selectedAccount.account_id),
    )
  }, [contacts, selectedAccount])


  const fallbackContacts = useMemo(() => {
    if (accountContacts.length > 0) return accountContacts
    return contacts
  }, [accountContacts, contacts])


  const roleToRelevantSubRoleIds = useMemo<Record<number, number[]>>(
    () => ({
      1: [1, 2, 4, 7, 8, 10],
      3: [11, 14],
      4: [12],
      5: [13],
      6: [3],
      7: [6],
      11: [9],
    }),
    [],
  )


  const activeSubRoles = useMemo(() => {
    if (!form.job_role) return subRoles
    const relevant = roleToRelevantSubRoleIds[Number(form.job_role)] ?? []
    if (!relevant.length) return subRoles
    return subRoles.filter((item: any) => relevant.includes(item.id))
  }, [form.job_role, roleToRelevantSubRoleIds, subRoles])


  const activeCities = useMemo(() => {
    if (!form.region_id) return cities
    const directMatches = cities.filter((cityItem: any) =>
      String(cityItem.region_id ?? '') === String(form.region_id),
    )
    if (directMatches.length) return directMatches


    const regionToCityIds: Record<number, number[]> = {
      2: [3, 19],
      3: [7, 9, 10, 11],
      4: [4, 5, 12, 13, 14, 15, 20],
      5: [1],
      6: [2, 16],
      8: [6, 8, 17],
    }


    const relevant = regionToCityIds[Number(form.region_id)] ?? []
    if (!relevant.length) return cities
    return cities.filter((item: any) => relevant.includes(item.id))
  }, [cities, form.region_id])


  const roleName =
    roles.find((item: any) => String(item.id) === String(form.job_role))?.name ?? '—'
  const subRoleName =
    activeSubRoles.find((item: any) => String(item.id) === String(form.job_sub_role))?.name ?? '—'
  const regionName =
    regions.find((item: any) => String(item.id) === String(form.region_id))?.name ?? '—'
  const cityName =
    cities.find((item: any) => String(item.id) === String(form.city_id))?.name ?? '—'
  const scopeName =
    scopes.find((item: any) => String(item.id) === String(form.scope))?.name ?? '—'
  const experienceName =
    experience.find((item: any) => String(item.id) === String(form.required_experience))?.name ?? '—'
  const statusName =
    jobStatuses.find((item: any) => String(item.id) === String(form.job_status))?.name ?? '—'


  const publishChannelsSelected =
    form.publish_to_facebook || form.publish_to_website || form.publish_to_whatsapp


  const publishReady = useMemo(() => {
    if (!hasMinimumRequiredFields(form)) return false
    if (!form.publish_intent) return false
    if (!publishChannelsSelected) return false


    if (form.publish_to_facebook && !form.date_facebook) return false
    if (form.publish_to_website && !form.date_website) return false
    if (form.publish_to_whatsapp && !form.date_whatsapp) return false


    return true
  }, [form, publishChannelsSelected])


  const progressPercent = ((step + 1) / STEPS.length) * 100


  const stepErrors: Record<number, string[]> = {
    0: validateStepEmployer(form),
    1: validateStepSpecs(form),
    2: validateStepDescription(form),
    3: validateStepDistribution(form),
  }


  const canMoveNext = (stepErrors[step] ?? []).length === 0


  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }


  const toggleLanguage = (value: string) => {
    setForm((prev) => ({
      ...prev,
      required_languages: prev.required_languages.includes(value)
        ? prev.required_languages.filter((item) => item !== value)
        : [...prev.required_languages, value],
    }))
  }


  const selectExistingAccount = (accountId: string) => {
    const account = accounts.find(
      (item: any) => String(item.account_id) === String(accountId),
    )


    setForm((prev) => ({
      ...prev,
      existingAccountId: accountId,
      region_id: prev.region_id || String(account?.region_id ?? ''),
      city_id: prev.city_id || String(account?.city_id ?? ''),
      address: prev.address || String(account?.address ?? ''),
      relEmployerContact: '',
    }))
  }


  const handleAiRefine = async () => {
    if (!form.job_description.trim() && !form.job_requirements.trim()) {
      showToast('יש להזין תיאור או דרישות לפני שיפור AI', 'error')
      return
    }


    try {
      setAiPending(true)


      const baseDescription = form.job_description.trim()
      const baseRequirements = form.job_requirements.trim()
      const generated = [
        baseDescription || 'משרה דנטלית איכותית במערכת ALLDENT.',
        baseRequirements
          ? `דגשים מרכזיים: ${baseRequirements}.`
          : 'נדרשת התאמה מקצועית, שירותיות ויכולת עבודה בצוות.',
        'ניסוח משופר: סביבת עבודה מסודרת, דרישות ברורות ותיאום ציפיות גבוה.',
      ]
        .filter(Boolean)
        .join(' ')


      setForm((prev) => ({
        ...prev,
        ai_refined_description: generated,
      }))


      showToast('הנוסח שופר בהצלחה', 'success')
    } finally {
      setAiPending(false)
    }
  }


  const buildJobPayload = (accountLink: number | null) => ({
    job_code: form.job_code || suggestJobCode(form.job_role),
    account_link: accountLink,
    rel_employer_contact: Number(form.relEmployerContact || 0) || null,
    job_status: 1,
    job_title: form.job_title || null,
    job_role: Number(form.job_role || 0) || null,
    job_sub_role: Number(form.job_sub_role || 0) || null,
    scope: Number(form.scope || 0) || null,
    required_experience: Number(form.required_experience || 0) || null,
    required_languages: form.required_languages.join(', ') || null,
    address: form.address || null,
    city_id: Number(form.city_id || 0) || null,
    region_id: Number(form.region_id || 0) || null,
    salary_range: null as string | null,
    job_requirements: form.job_requirements || null,
    job_description: form.ai_refined_description || form.job_description || null,
    job_url: form.job_url || null,
    date_whatsapp: form.date_whatsapp || null,
    date_website: form.date_website || null,
    date_facebook: form.date_facebook || null,
    last_publish_date: null as string | null,
    notes: form.notes || null,
    created_time: new Date().toISOString(),
  })

  const handleSaveDraft = async () => {
    try {
      setSaveDraftPending(true)
      const accountLink = form.createMode === 'existing' ? Number(form.existingAccountId || 0) || null : null
      const payload = buildJobPayload(accountLink)
      const { error } = await supabase.from('job').insert({ ...payload, job_status: 1 })
      if (error) throw error
      showToast('הטיוטה נשמרה', 'success')
    } catch {
      showToast('שמירת הטיוטה נכשלה', 'error')
    } finally {
      setSaveDraftPending(false)
    }
  }

  const handleSubmit = async () => {
    const allErrors = [
      ...validateStepEmployer(form),
      ...validateStepSpecs(form),
      ...validateStepDescription(form),
      ...validateStepDistribution(form),
    ]

    if (allErrors.length > 0) {
      showToast(allErrors[0], 'error')
      return
    }

    try {
      setSubmitPending(true)

      let createdAccountId: number | null =
        form.createMode === 'existing' ? Number(form.existingAccountId) || null : null

      if (form.createMode === 'new') {
        const accountPayload = {
          account_name: form.newAccountName,
          bus_id: form.newBusId || null,
          billing_email: form.newBillingEmail || null,
          phone: form.newPhone || null,
          region_id: Number(form.region_id || 0) || null,
          city_id: Number(form.city_id || 0) || null,
          address: form.address || null,
          account_status: 1,
        }
        const { data: newAcc, error: accError } = await supabase.from('accounts').insert(accountPayload).select('account_id').single()
        if (accError) throw accError
        createdAccountId = newAcc?.account_id ?? null
      }

      const payload = {
        ...buildJobPayload(createdAccountId),
        job_status: form.publish_intent && publishReady ? 7 : Number(form.job_status || 1),
        last_publish_date: form.publish_intent && publishReady ? getTodayIso() : null,
        date_whatsapp: form.publish_to_whatsapp ? form.date_whatsapp || null : null,
        date_website: form.publish_to_website ? form.date_website || null : null,
        date_facebook: form.publish_to_facebook ? form.date_facebook || null : null,
      }

      const { error } = await supabase.from('job').insert(payload)
      if (error) throw error

      showToast(
        form.publish_intent && publishReady ? 'המשרה נוצרה ופורסמה' : 'המשרה נוצרה בהצלחה',
        'success',
      )

      navigate('/admin/jobs')
    } catch {
      showToast('יצירת המשרה נכשלה', 'error')
    } finally {
      setSubmitPending(false)
    }
  }


  const goNext = () => {
    const errors = stepErrors[step] ?? []
    if (errors.length > 0) {
      showToast(errors[0], 'error')
      return
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }


  const goPrev = () => {
    if (step > 0) {
      setStep((prev) => prev - 1)
      return
    }
    navigate('/admin/jobs')
  }


  return (
    <Shell
      title="יצירת משרה חדשה"
      subtitle={`שלב ${step + 1} מתוך ${STEPS.length} — ${STEPS[step]}`}
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="ghost"
            icon={Save}
            onClick={handleSaveDraft}
            disabled={saveDraftPending}
          >
            {saveDraftPending ? 'שומר...' : 'שמור טיוטה'}
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-bold text-[#0F172A]">אשף פתיחת משרה</h2>
                  <p className="mt-1 text-[13px] font-medium text-slate-500">
                    תהליך מונחה, מדורג ומדויק לפתיחת משרה חדשה
                  </p>
                </div>


                <div className="rounded-full bg-[#F0FDFC] px-3 py-1 text-[12px] font-bold text-[#008080]">
                  {Math.round(progressPercent)}%
                </div>
              </div>


              <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#008080] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>


              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {STEPS.map((label, index) => {
                  const isPast = index < step
                  const isCurrent = index === step


                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (index <= step) setStep(index)
                      }}
                      className={`rounded-2xl border px-4 py-3 text-right transition ${
                        isCurrent
                          ? 'border-[#008080] bg-[#F0FDFC] shadow-sm'
                          : isPast
                            ? 'border-slate-200 bg-white'
                            : 'border-slate-200 bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${
                            isCurrent
                              ? 'bg-[#008080] text-white'
                              : isPast
                                ? 'bg-[#DFF7F7] text-[#008080]'
                                : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isPast ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <span
                          className={`text-[14px] font-bold ${
                            isCurrent ? 'text-[#0F172A]' : 'text-slate-600'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="text-[12px] font-medium text-slate-500">
                        {stepErrors[index].length > 0 && index <= step
                          ? `חסרים ${stepErrors[index].length} פריטים`
                          : isPast
                            ? 'הושלם'
                            : 'מוכן לעבודה'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>


            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {step === 0 && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={<Building2 className="h-5 w-5" />}
                    title="שלב 1 — הקשר מעסיק"
                    description="בחירת ארגון קיים או יצירת מעסיק חדש inline לפני פתיחת המשרה"
                  />


                  <div className="flex flex-wrap gap-2">
                    <TogglePill
                      active={form.createMode === 'existing'}
                      onClick={() => setField('createMode', 'existing')}
                    >
                      ארגון קיים
                    </TogglePill>
                    <TogglePill
                      active={form.createMode === 'new'}
                      onClick={() => setField('createMode', 'new')}
                    >
                      ארגון חדש
                    </TogglePill>
                  </div>


                  {form.createMode === 'existing' ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Search className="h-4 w-4 text-[#008080]" />
                          <span className="text-[14px] font-bold text-[#0F172A]">
                            חיפוש ארגון קיים
                          </span>
                        </div>


                        <TextField
                          label="חיפוש מעסיק"
                          value={accountSearch}
                          onChange={setAccountSearch}
                          placeholder="חיפוש לפי שם ארגון, ח.פ. או עיר"
                        />


                        <div className="mt-4 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                          {filteredAccounts.length === 0 ? (
                            <div className="p-4 text-[13px] font-medium text-slate-500">
                              לא נמצאו ארגונים. ניתן לעבור ליצירת ארגון חדש.
                            </div>
                          ) : (
                            filteredAccounts.map((account: any) => {
                              const isSelected =
                                String(form.existingAccountId) === String(account.account_id)


                              return (
                                <button
                                  key={account.account_id}
                                  type="button"
                                  onClick={() => selectExistingAccount(String(account.account_id))}
                                  className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right last:border-b-0 ${
                                    isSelected ? 'bg-[#F0FDFC]' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <div className="text-[14px] font-bold text-[#0F172A]">
                                      {account.account_name ?? '—'}
                                    </div>
                                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                                      ח.פ. {account.bus_id ?? '—'} •{' '}
                                      {cities.find((item: any) => item.id === account.city_id)?.name ?? '—'}
                                    </div>
                                  </div>


                                  {isSelected && (
                                    <span className="rounded-full bg-[#008080] px-2.5 py-1 text-[12px] font-bold text-white">
                                      נבחר
                                    </span>
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>


                      {selectedAccount && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <InfoCard label="ארגון נבחר" value={selectedAccount.account_name ?? '—'} />
                          <InfoCard label="ח.פ." value={selectedAccount.bus_id ?? '—'} />
                          <InfoCard
                            label="מיקום"
                            value={`${regions.find((item: any) => item.id === selectedAccount.region_id)?.name ?? '—'} / ${cities.find((item: any) => item.id === selectedAccount.city_id)?.name ?? '—'}`}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextField
                        label="שם ארגון חדש *"
                        value={form.newAccountName}
                        onChange={(value) => setField('newAccountName', value)}
                        placeholder="הזן שם ארגון"
                      />
                      <TextField
                        label='ח.פ. / עוסק'
                        value={form.newBusId}
                        onChange={(value) => setField('newBusId', value)}
                        placeholder="מספר מזהה עסקי"
                      />
                      <TextField
                        label="אימייל חיוב"
                        value={form.newBillingEmail}
                        onChange={(value) => setField('newBillingEmail', value)}
                        placeholder="billing@example.com"
                        type="email"
                      />
                      <TextField
                        label="טלפון"
                        value={form.newPhone}
                        onChange={(value) => setField('newPhone', value)}
                        placeholder="03-0000000"
                      />
                    </div>
                  )}


                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SelectField
                      label="איש קשר מגייס"
                      value={form.relEmployerContact}
                      onChange={(value) => setField('relEmployerContact', value)}
                      options={fallbackContacts.map((contact: any) => ({
                        value: String(contact.contact_id),
                        label: `${contact.full_name ?? contact.display_name ?? '—'}${contact.account_link ? ' • משויך' : ''}`,
                      }))}
                      placeholder={
                        accountContacts.length
                          ? 'בחר איש קשר מהארגון'
                          : 'לא נמצאו אנשי קשר בארגון — מוצגת רשימה כללית'
                      }
                    />


                    <div className="rounded-2xl border border-dashed border-slate-300 bg-[#F8FAFC] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-[#D97706]" />
                        <span className="text-[14px] font-bold text-[#0F172A]">
                          יצירת מעסיק inline
                        </span>
                      </div>
                      <p className="text-[12px] font-medium leading-6 text-slate-500">
                        אם לא נמצא ארגון מתאים, אפשר לעבור למצב "ארגון חדש" ולהמשיך באותו
                        אשף ללא יציאה מהזרימה.
                      </p>
                    </div>
                  </div>
                </div>
              )}


              {step === 1 && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={<Briefcase className="h-5 w-5" />}
                    title="שלב 2 — פרטי משרה"
                    description="הגדרת תפקיד, מיקום, סטטוס ותנאי בסיס עם תלויות מסודרות"
                  />


                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField
                      label="קוד משרה *"
                      value={form.job_code}
                      onChange={(value) => setField('job_code', value)}
                      placeholder="DOC101"
                      helper={`הצעה אוטומטית לפי תפקיד: ${suggestJobCode(form.job_role)}`}
                    />


                    <TextField
                      label="כותרת משרה *"
                      value={form.job_title}
                      onChange={(value) => setField('job_title', value)}
                      placeholder="לדוגמה: רופא/ת שיניים כללי/ת"
                    />


                    <SelectField
                      label="סטטוס משרה"
                      value={form.job_status}
                      onChange={(value) => setField('job_status', value)}
                      options={jobStatuses.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="בחר סטטוס"
                    />


                    <SelectField
                      label="תפקיד *"
                      value={form.job_role}
                      onChange={(value) => {
                        setForm((prev) => ({
                          ...prev,
                          job_role: value,
                          job_sub_role: '',
                          job_code: prev.job_code || suggestJobCode(value),
                        }))
                      }}
                      options={roleOptions}
                      placeholder="בחר תפקיד"
                    />


                    <SelectField
                      label="תת־תפקיד"
                      value={form.job_sub_role}
                      onChange={(value) => setField('job_sub_role', value)}
                      options={activeSubRoles.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="תלוי תפקיד"
                    />


                    <SelectField
                      label="היקף משרה *"
                      value={form.scope}
                      onChange={(value) => setField('scope', value)}
                      options={scopes.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="בחר היקף"
                    />


                    <SelectField
                      label="אזור *"
                      value={form.region_id}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          region_id: value,
                          city_id: '',
                        }))
                      }
                      options={regions.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="בחר אזור"
                    />


                    <SelectField
                      label="עיר"
                      value={form.city_id}
                      onChange={(value) => setField('city_id', value)}
                      options={activeCities.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="עיר לפי אזור"
                    />


                    <TextField
                      label="כתובת"
                      value={form.address}
                      onChange={(value) => setField('address', value)}
                      placeholder="רחוב ומספר"
                    />


                    <SelectField
                      label="ניסיון נדרש *"
                      value={form.required_experience}
                      onChange={(value) => setField('required_experience', value)}
                      options={experience.map((item: any) => ({
                        value: String(item.id),
                        label: item.name,
                      }))}
                      placeholder="בחר ניסיון"
                    />
                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#008080]" />
                      <span className="text-[14px] font-bold text-[#0F172A]">
                        שפות נדרשות
                      </span>
                    </div>


                    {languages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {languages.map((item: any) => {
                          const value = String(item.name ?? item.label ?? item.value ?? '')
                          const active = form.required_languages.includes(value)


                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleLanguage(value)}
                              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                                active
                                  ? 'bg-[#008080] text-white'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {value}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] font-medium text-slate-500">
                        לא נמצא מילון שפות זמין. השדה יישמר ריק במצב זה.
                      </p>
                    )}
                  </div>
                </div>
              )}


              {step === 2 && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={<FileText className="h-5 w-5" />}
                    title="שלב 3 — תיאור ו־AI"
                    description="בניית ניסוח מלא למשרה, דרישות מקצועיות ואופציית שיפור AI"
                  />


                  <TextAreaField
                    label="תיאור המשרה *"
                    value={form.job_description}
                    onChange={(value) => setField('job_description', value)}
                    rows={6}
                    placeholder="כתוב תיאור ברור של התפקיד, אחריות, סביבת עבודה וציפיות"
                  />


                  <TextAreaField
                    label="דרישות המשרה *"
                    value={form.job_requirements}
                    onChange={(value) => setField('job_requirements', value)}
                    rows={5}
                    placeholder="רישיון, ניסיון, מיומנויות, שפות ודרישות נוספות"
                  />


                  <TextAreaField
                    label="הערות פנימיות"
                    value={form.notes}
                    onChange={(value) => setField('notes', value)}
                    rows={3}
                    placeholder="הערות צוות, דגשים תפעוליים, מידע פנימי"
                  />


                  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#0EA5A4]" />
                        <span className="text-[14px] font-bold text-[#0F172A]">
                          שיפור ניסוח AI
                        </span>
                      </div>


                      <ActionButton
                        variant="ghost"
                        icon={Sparkles}
                        onClick={handleAiRefine}
                        disabled={aiPending}
                      >
                        {aiPending ? 'משפר...' : 'שפר ניסוח'}
                      </ActionButton>
                    </div>


                    <p className="mb-3 text-[12px] font-medium text-slate-500">
                      שכבת AI היא עזר לניסוח בלבד ואינה מקור אמת לשדות.
                    </p>


                    <TextAreaField
                      label="נוסח משופר"
                      value={form.ai_refined_description}
                      onChange={(value) => setField('ai_refined_description', value)}
                      rows={5}
                      placeholder="כאן יוצג הנוסח המשופר"
                    />
                  </div>
                </div>
              )}


              {step === 3 && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={<Send className="h-5 w-5" />}
                    title="שלב 4 — הפצה ופרסום"
                    description="בחירת ערוצי הפצה, תאריכי פרסום וסיכום סופי לפני יצירה"
                  />


                  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CircleAlert className="h-4 w-4 text-[#D97706]" />
                      <span className="text-[14px] font-bold text-[#0F172A]">
                        כוונת פרסום
                      </span>
                    </div>


                    <div className="flex flex-wrap gap-2">
                      <TogglePill
                        active={form.publish_intent}
                        onClick={() => setField('publish_intent', true)}
                      >
                        יצירה ופרסום
                      </TogglePill>
                      <TogglePill
                        active={!form.publish_intent}
                        onClick={() => setField('publish_intent', false)}
                      >
                        יצירה כטיוטה
                      </TogglePill>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DistributionCard
                      title="פייסבוק"
                      active={form.publish_to_facebook}
                      onToggle={() =>
                        setForm((prev) => ({
                          ...prev,
                          publish_to_facebook: !prev.publish_to_facebook,
                          date_facebook:
                            !prev.publish_to_facebook && !prev.date_facebook
                              ? getTodayIso()
                              : prev.publish_to_facebook
                                ? ''
                                : prev.date_facebook,
                        }))
                      }
                      dateValue={form.date_facebook}
                      onDateChange={(value) => setField('date_facebook', value)}
                    />


                    <DistributionCard
                      title="אתר"
                      active={form.publish_to_website}
                      onToggle={() =>
                        setForm((prev) => ({
                          ...prev,
                          publish_to_website: !prev.publish_to_website,
                          date_website:
                            !prev.publish_to_website && !prev.date_website
                              ? getTodayIso()
                              : prev.publish_to_website
                                ? ''
                                : prev.date_website,
                        }))
                      }
                      dateValue={form.date_website}
                      onDateChange={(value) => setField('date_website', value)}
                    />


                    <DistributionCard
                      title="וואטסאפ"
                      active={form.publish_to_whatsapp}
                      onToggle={() =>
                        setForm((prev) => ({
                          ...prev,
                          publish_to_whatsapp: !prev.publish_to_whatsapp,
                          date_whatsapp:
                            !prev.publish_to_whatsapp && !prev.date_whatsapp
                              ? getTodayIso()
                              : prev.publish_to_whatsapp
                                ? ''
                                : prev.date_whatsapp,
                        }))
                      }
                      dateValue={form.date_whatsapp}
                      onDateChange={(value) => setField('date_whatsapp', value)}
                    />
                  </div>


                  <TextField
                    label="קישור משרה"
                    value={form.job_url}
                    onChange={(value) => setField('job_url', value)}
                    placeholder="https://example.com/job"
                  />


                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-[16px] font-bold text-[#0F172A]">
                      כרטיס סיכום לפני יצירה
                    </div>


                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <SummaryRow label="ארגון" value={getSummaryAccountName(form, selectedAccount)} />
                      <SummaryRow label="איש קשר" value={getSummaryContactName(form, contacts)} />
                      <SummaryRow label="קוד משרה" value={form.job_code || suggestJobCode(form.job_role)} />
                      <SummaryRow label="כותרת" value={form.job_title} />
                      <SummaryRow label="תפקיד" value={roleName} />
                      <SummaryRow label="תת־תפקיד" value={subRoleName} />
                      <SummaryRow label="סטטוס" value={statusName} />
                      <SummaryRow label="אזור / עיר" value={`${regionName} / ${cityName}`} />
                      <SummaryRow label="היקף" value={scopeName} />
                      <SummaryRow label="ניסיון" value={experienceName} />
                      <SummaryRow
                        label="שפות"
                        value={form.required_languages.length ? form.required_languages.join(', ') : '—'}
                      />
                      <SummaryRow
                        label="ערוצי הפצה"
                        value={getChannelsSummary(form)}
                      />
                    </div>


                    {(form.ai_refined_description || form.job_description) && (
                      <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
                        <div className="mb-1 text-[12px] font-bold text-slate-500">
                          תיאור סופי
                        </div>
                        <p className="text-[13px] leading-6 text-slate-700">
                          {truncateText(
                            form.ai_refined_description || form.job_description,
                            280,
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>


          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-[16px] font-bold text-[#0F172A]">סיכום צדדי</div>


              <div className="space-y-3">
                <SideSummaryItem
                  label="מעסיק"
                  value={getSummaryAccountName(form, selectedAccount)}
                />
                <SideSummaryItem label="תפקיד" value={roleName} />
                <SideSummaryItem label="תת־תפקיד" value={subRoleName} />
                <SideSummaryItem label="אזור" value={regionName} />
                <SideSummaryItem label="עיר" value={cityName} />
                <SideSummaryItem label="היקף" value={scopeName} />
                <SideSummaryItem label="ניסיון" value={experienceName} />
                <SideSummaryItem
                  label="פרסום"
                  value={
                    form.publish_intent
                      ? publishReady
                        ? 'מוכן לפרסום'
                        : 'חסרים נתונים לפרסום'
                      : 'טיוטה'
                  }
                  tone={form.publish_intent ? (publishReady ? 'success' : 'warning') : 'muted'}
                />
              </div>
            </section>


            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-[16px] font-bold text-[#0F172A]">
                בדיקות וולידציה
              </div>


              <div className="space-y-2">
                {(stepErrors[step] ?? []).length === 0 ? (
                  <ValidationRow ok text="השלב הנוכחי תקין" />
                ) : (
                  (stepErrors[step] ?? []).map((error: string) => (
                    <ValidationRow key={error} ok={false} text={error} />
                  ))
                )}
              </div>
            </section>


            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-[16px] font-bold text-[#0F172A]">דגשים תפעוליים</div>
              <ul className="space-y-2 text-[13px] font-medium leading-6 text-slate-600">
                <li>קודם מעסיק, אחר כך משרה.</li>
                <li>תת־תפקיד תלוי בתפקיד.</li>
                <li>עיר תלויה באזור.</li>
                <li>פרסום מחייב שדות חובה מינימליים.</li>
                <li>אפשר לשמור טיוטה בכל שלב.</li>
              </ul>
            </section>
          </aside>
        </div>


        <div className="sticky bottom-0 z-20 mt-6 border-t border-slate-200 bg-white/95 px-0 py-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <ActionButton
                variant="secondary"
                icon={ChevronRight}
                onClick={goPrev}
              >
                {step === 0 ? 'ביטול' : 'חזור'}
              </ActionButton>


              <ActionButton
                variant="ghost"
                icon={Save}
                onClick={handleSaveDraft}
                disabled={saveDraftPending}
              >
                {saveDraftPending ? 'שומר...' : 'שמור טיוטה'}
              </ActionButton>
            </div>


            <div className="flex flex-wrap gap-2">
              {step < STEPS.length - 1 ? (
                <ActionButton
                  variant="primary"
                  icon={ChevronLeft}
                  onClick={goNext}
                  disabled={!canMoveNext}
                >
                  הבא
                </ActionButton>
              ) : (
                <ActionButton
                  variant="primary"
                  icon={form.publish_intent ? Send : Check}
                  onClick={handleSubmit}
                  disabled={submitPending || (form.publish_intent && !publishReady)}
                >
                  {submitPending
                    ? 'יוצר...'
                    : form.publish_intent
                      ? 'צור ופרסם'
                      : 'צור משרה'}
                </ActionButton>
              )}
            </div>
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


function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mb-2">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
          {icon}
        </div>
        <h3 className="text-[18px] font-bold text-[#0F172A]">{title}</h3>
      </div>
      <p className="text-[13px] font-medium text-slate-500">{description}</p>
    </div>
  )
}


function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helper?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        dir="rtl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
      {helper ? (
        <div className="mt-1 text-[12px] font-medium text-slate-500">{helper}</div>
      ) : null}
    </div>
  )
}


function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</label>
      <select
        dir="rtl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      >
        <option value="">{placeholder || 'בחר...'}</option>
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}


function TextAreaField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</label>
      <textarea
        dir="rtl"
        rows={rows ?? 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[14px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </div>
  )
}


function TogglePill({
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
      className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
        active
          ? 'bg-[#D97706] text-white'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}


function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[12px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] font-bold text-[#0F172A]">{value}</div>
    </div>
  )
}


function DistributionCard({
  title,
  active,
  onToggle,
  dateValue,
  onDateChange,
}: {
  title: string
  active: boolean
  onToggle: () => void
  dateValue: string
  onDateChange: (value: string) => void
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        active ? 'border-[#008080] bg-[#F0FDFC]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[14px] font-bold text-[#0F172A]">{title}</div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-3 py-1 text-[12px] font-bold ${
            active ? 'bg-[#008080] text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {active ? 'פעיל' : 'כבוי'}
        </button>
      </div>


      <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">
        תאריך הפצה
      </label>
      <input
        type="date"
        dir="rtl"
        value={dateValue}
        disabled={!active}
        onChange={(event) => onDateChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  )
}


function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <div className="text-[12px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-bold text-[#0F172A]">{value || '—'}</div>
    </div>
  )
}


function SideSummaryItem({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'muted'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-[#16A34A]'
      : tone === 'warning'
        ? 'text-[#D97706]'
        : tone === 'muted'
          ? 'text-slate-500'
          : 'text-[#0F172A]'


  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <span className={`text-[13px] font-bold ${toneClass}`}>{value}</span>
    </div>
  )
}


function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
          ok ? 'bg-[#16A34A] text-white' : 'bg-[#D97706] text-white'
        }`}
      >
        {ok ? '✓' : '!'}
      </span>
      <span className="text-[13px] font-medium text-slate-700">{text}</span>
    </div>
  )
}


function validateStepEmployer(form: FormState): string[] {
  const errors: string[] = []


  if (form.createMode === 'existing' && !form.existingAccountId) {
    errors.push('יש לבחור ארגון קיים')
  }


  if (form.createMode === 'new' && !form.newAccountName.trim()) {
    errors.push('יש להזין שם ארגון חדש')
  }


  if (form.newBillingEmail && !isValidEmail(form.newBillingEmail)) {
    errors.push('אימייל חיוב אינו תקין')
  }


  return errors
}


function validateStepSpecs(form: FormState): string[] {
  const errors: string[] = []


  if (!form.job_code.trim()) errors.push('יש להזין קוד משרה')
  if (!form.job_role) errors.push('יש לבחור תפקיד')
  if (!form.job_title.trim()) errors.push('יש להזין כותרת משרה')
  if (!form.region_id) errors.push('יש לבחור אזור')
  if (form.region_id && !form.city_id) errors.push('יש לבחור עיר כאשר נבחר אזור')
  if (!form.scope) errors.push('יש לבחור היקף משרה')
  if (!form.required_experience) errors.push('יש לבחור ניסיון נדרש')


  return errors
}


function validateStepDescription(form: FormState): string[] {
  const errors: string[] = []


  if (!form.job_description.trim()) errors.push('יש להזין תיאור משרה')
  if (!form.job_requirements.trim()) errors.push('יש להזין דרישות משרה')


  return errors
}


function validateStepDistribution(form: FormState): string[] {
  const errors: string[] = []


  if (form.publish_intent) {
    if (
      !form.publish_to_facebook &&
      !form.publish_to_website &&
      !form.publish_to_whatsapp
    ) {
      errors.push('יש לבחור לפחות ערוץ הפצה אחד לפרסום')
    }


    if (form.publish_to_facebook && !form.date_facebook) {
      errors.push('יש להזין תאריך הפצה לפייסבוק')
    }


    if (form.publish_to_website && !form.date_website) {
      errors.push('יש להזין תאריך הפצה לאתר')
    }


    if (form.publish_to_whatsapp && !form.date_whatsapp) {
      errors.push('יש להזין תאריך הפצה לוואטסאפ')
    }


    if (!hasMinimumRequiredFields(form)) {
      errors.push('לא ניתן לפרסם לפני השלמת כל שדות החובה')
    }
  }


  return errors
}


function hasMinimumRequiredFields(form: FormState) {
  const hasEmployer =
    form.createMode === 'existing' ? Boolean(form.existingAccountId) : Boolean(form.newAccountName.trim())


  return (
    hasEmployer &&
    Boolean(form.job_title.trim()) &&
    Boolean(form.job_role) &&
    Boolean(form.region_id) &&
    Boolean(form.city_id) &&
    Boolean(form.scope) &&
    Boolean(form.required_experience) &&
    Boolean(form.job_description.trim()) &&
    Boolean(form.job_requirements.trim())
  )
}


function suggestJobCode(jobRole: string) {
  const roleId = Number(jobRole || 0)
  const prefix = ROLE_PREFIX_MAP[roleId] ?? 'JOB'
  const randomNumber = String(100 + roleId * 7).slice(0, 3)
  return `${prefix}${randomNumber}`
}


function inferNextAccountId(accounts: any[]) {
  const max = accounts.reduce((acc, item) => Math.max(acc, Number(item.account_id ?? 0)), 0)
  return max + 1
}


function getSummaryAccountName(form: FormState, selectedAccount: any) {
  if (form.createMode === 'existing') {
    return selectedAccount?.account_name ?? '—'
  }
  return form.newAccountName || '—'
}


function getSummaryContactName(form: FormState, contacts: any[]) {
  if (!form.relEmployerContact) return 'לא נבחר'
  const contact = contacts.find(
    (item: any) => String(item.contact_id) === String(form.relEmployerContact),
  )
  return contact?.full_name ?? contact?.display_name ?? '—'
}


function getChannelsSummary(form: FormState) {
  const channels: string[] = []
  if (form.publish_to_facebook) channels.push('פייסבוק')
  if (form.publish_to_website) channels.push('אתר')
  if (form.publish_to_whatsapp) channels.push('וואטסאפ')
  return channels.length ? channels.join(', ') : form.publish_intent ? 'אין ערוצים' : 'טיוטה'
}


function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}


function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}


function truncateText(value: string, maxLength: number) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength)}...`
}


function toastClassName(tone: ToastTone) {
  if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
  if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
  return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}



