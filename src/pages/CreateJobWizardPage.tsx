import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Building2, CheckCircle2, ChevronLeft, FileText, Image as ImageIcon, MapPin, Save, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Shell, ActionButton } from '@/components/layout/Shell'
import JobImageUpload from '@/components/admin/JobImageUpload'

type DictItem = { id: number; name: string; role_id?: number | null; region_id?: number | null }
type ToastTone = 'success' | 'error' | 'info'
type ToastState = { open: boolean; tone: ToastTone; message: string }

type FormState = {
  createMode: 'existing' | 'new'
  existingAccountId: string
  newAccountName: string
  newAccountBusId: string
  newAccountPhone: string
  newAccountEmail: string
  accountRegionId: string
  accountCityId: string
  accountAddress: string
  employerContactName: string
  employerContactPhone: string
  employerContactEmail: string
  job_code: string
  job_title: string
  job_role: string
  job_sub_role: number[]
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
  work_schedule_text: string
  job_description: string
  job_requirements: string
  employer_notes: string
  notes: string
  public_excerpt: string
  public_image_url: string
}

const EMPTY_FORM: FormState = {
  createMode: 'existing',
  existingAccountId: '',
  newAccountName: '',
  newAccountBusId: '',
  newAccountPhone: '',
  newAccountEmail: '',
  accountRegionId: '',
  accountCityId: '',
  accountAddress: '',
  employerContactName: '',
  employerContactPhone: '',
  employerContactEmail: '',
  job_code: '',
  job_title: '',
  job_role: '',
  job_sub_role: [],
  region_id: '',
  city_id: '',
  address: '',
  scope: [],
  required_experience: '',
  required_languages: [],
  systems_used: [],
  tax_type_id: '',
  mobility_id: '',
  salary_expectation_hourly: '',
  salary_expectation_monthly: '',
  show_salary_public: false,
  work_schedule_text: '',
  job_description: '',
  job_requirements: '',
  employer_notes: '',
  notes: '',
  public_excerpt: '',
  public_image_url: '',
}

const JOB_STATUS_DRAFT = 1
const PUBLIC_STATUS_HIDDEN = 4

export default function CreateJobWizardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accountIdFromUrl = searchParams.get('account_id') || ''
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, existingAccountId: accountIdFromUrl })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })

  const fetchDict = async (table: string): Promise<DictItem[]> => {
    const { data, error } = await supabase.from(table).select('id,name').order('name')
    if (error) throw error
    return (data ?? []) as DictItem[]
  }

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-for-job-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id,account_name,bus_id,phone,email,region_id,city_id,address')
        .order('account_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

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
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name')
      if (error) throw error
      return (data ?? []) as DictItem[]
    },
    staleTime: 600_000,
  })
  const { data: scopes = [] } = useQuery({ queryKey: ['dict_scopes'], queryFn: () => fetchDict('dict_scopes'), staleTime: 600_000 })
  const { data: experience = [] } = useQuery({ queryKey: ['dict_experience'], queryFn: () => fetchDict('dict_experience'), staleTime: 600_000 })
  const { data: languages = [] } = useQuery({ queryKey: ['dict_languages'], queryFn: () => fetchDict('dict_languages'), staleTime: 600_000 })
  const { data: systems = [] } = useQuery({ queryKey: ['dict_systems'], queryFn: () => fetchDict('dict_systems'), staleTime: 600_000 })
  const { data: taxTypes = [] } = useQuery({ queryKey: ['dict_tax_types'], queryFn: () => fetchDict('dict_tax_types'), staleTime: 600_000 })
  const { data: mobility = [] } = useQuery({ queryKey: ['dict_mobility'], queryFn: () => fetchDict('dict_mobility'), staleTime: 600_000 })

  const selectedAccount = useMemo(
    () => accounts.find((account: any) => String(account.account_id) === String(form.existingAccountId)),
    [accounts, form.existingAccountId],
  )

  const cityOptions = useMemo(() => {
    const regionId = Number(form.region_id || 0)
    return regionId ? cities.filter((city) => Number(city.region_id) === regionId) : cities
  }, [cities, form.region_id])

  const accountCityOptions = useMemo(() => {
    const regionId = Number(form.accountRegionId || 0)
    return regionId ? cities.filter((city) => Number(city.region_id) === regionId) : cities
  }, [cities, form.accountRegionId])

  const subRoleOptions = useMemo(() => {
    const roleId = Number(form.job_role || 0)
    return roleId ? subRoles.filter((subRole) => Number(subRole.role_id) === roleId) : subRoles
  }, [subRoles, form.job_role])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
    window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2800)
  }

  const applyAccountToJob = () => {
    if (!selectedAccount) return
    setForm((prev) => ({
      ...prev,
      region_id: selectedAccount.region_id ? String(selectedAccount.region_id) : prev.region_id,
      city_id: selectedAccount.city_id ? String(selectedAccount.city_id) : prev.city_id,
      address: selectedAccount.address ?? prev.address,
    }))
    showToast('פרטי מיקום הועתקו מהארגון', 'success')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let accountLink: number | null = form.createMode === 'existing' ? toNullableNumber(form.existingAccountId) : null

      if (form.createMode === 'new') {
        const accountPayload = {
          account_name: cleanText(form.newAccountName),
          bus_id: cleanText(form.newAccountBusId),
          phone: cleanText(form.newAccountPhone),
          email: cleanText(form.newAccountEmail),
          region_id: toNullableNumber(form.accountRegionId),
          city_id: toNullableNumber(form.accountCityId),
          address: cleanText(form.accountAddress),
          created_at: new Date().toISOString(),
        }
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert(accountPayload)
          .select('account_id')
          .single()
        if (accountError) throw accountError
        accountLink = Number(newAccount.account_id)
      }

      const jobCode = cleanText(form.job_code) || generateJobCode(Number(form.job_role || 0))
      const payload = {
        job_code: jobCode,
        account_link: accountLink,
        job_status: JOB_STATUS_DRAFT,
        public_status: PUBLIC_STATUS_HIDDEN,
        job_title: cleanText(form.job_title),
        job_role: toNullableNumber(form.job_role),
        job_sub_role: form.job_sub_role.length ? form.job_sub_role : null,
        required_experience: toNullableNumber(form.required_experience),
        region_id: toNullableNumber(form.region_id),
        city_id: toNullableNumber(form.city_id),
        address: cleanText(form.address),
        scope: form.scope.length ? form.scope : null,
        required_languages: form.required_languages.length ? form.required_languages : null,
        systems_used: form.systems_used.length ? form.systems_used : null,
        tax_type_id: toNullableNumber(form.tax_type_id),
        mobility_id: toNullableNumber(form.mobility_id),
        salary_expectation_hourly: toNullableNumber(form.salary_expectation_hourly),
        salary_expectation_monthly: toNullableNumber(form.salary_expectation_monthly),
        show_salary_public: form.show_salary_public,
        work_schedule_text: cleanText(form.work_schedule_text),
        job_description: cleanText(form.job_description),
        job_requirements: cleanText(form.job_requirements),
        employer_notes: cleanText(form.employer_notes),
        notes: cleanText(form.notes),
        public_excerpt: cleanText(form.public_excerpt),
        public_image_url: cleanText(form.public_image_url),
        last_publish_date: null,
        date_facebook: null,
        date_website: null,
        date_whatsapp: null,
        published_at: null,
        unpublished_at: new Date().toISOString(),
        created_time: new Date().toISOString(),
        updated_timestamp: new Date().toISOString(),
      }

      const { error } = await supabase.from('job').insert(payload)
      if (error) throw error
      showToast('המשרה נשמרה כטיוטה מוסתרת', 'success')
      navigate(`/admin/jobs/${encodeURIComponent(jobCode)}`)
    } catch (err) {
      console.error(err)
      showToast(err instanceof Error ? err.message : 'שגיאה בשמירת המשרה', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      title="משרה חדשה"
      subtitle="מסך אחד להקמת משרה באדמין — שמירה כטיוטה מוסתרת בלבד"
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton variant="ghost" icon={XCircle} onClick={() => navigate('/admin/jobs')}>ביטול</ActionButton>
          <ActionButton variant="primary" icon={Save} onClick={handleSave} disabled={saving}>{saving ? 'שומרת...' : 'שמירת טיוטה'}</ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] font-['Heebo'] text-[#2D2D2D]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          <main className="space-y-6">
            <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
              <SectionTitle icon={<Building2 className="h-5 w-5" />} title="מעסיק וארגון" />
              <div className="mb-5 flex flex-wrap gap-2">
                <ModeButton active={form.createMode === 'existing'} onClick={() => setField('createMode', 'existing')}>ארגון קיים</ModeButton>
                <ModeButton active={form.createMode === 'new'} onClick={() => setField('createMode', 'new')}>ארגון חדש</ModeButton>
              </div>

              {form.createMode === 'existing' ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SelectField label="בחירת ארגון" value={form.existingAccountId} onChange={(value) => setField('existingAccountId', value)} options={accounts.map((a: any) => ({ value: String(a.account_id), label: `${a.account_name ?? 'ללא שם'}${a.bus_id ? ` · ${a.bus_id}` : ''}` }))} />
                  <div className="flex items-end">
                    <button type="button" onClick={applyAccountToJob} className="h-11 rounded-xl border border-[#008080] bg-white px-4 text-[13px] font-bold text-[#008080] transition hover:bg-[#E6F3F3]">העתקת מיקום מהארגון</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <TextField label="שם ארגון" value={form.newAccountName} onChange={(value) => setField('newAccountName', value)} />
                  <TextField label="ח.פ / עוסק" value={form.newAccountBusId} onChange={(value) => setField('newAccountBusId', value)} dir="ltr" />
                  <TextField label="טלפון ארגון" value={form.newAccountPhone} onChange={(value) => setField('newAccountPhone', value)} dir="ltr" />
                  <TextField label="אימייל ארגון" value={form.newAccountEmail} onChange={(value) => setField('newAccountEmail', value)} dir="ltr" />
                  <SelectField label="אזור ארגון" value={form.accountRegionId} onChange={(value) => setField('accountRegionId', value)} options={regions.map(toOption)} />
                  <SelectField label="עיר ארגון" value={form.accountCityId} onChange={(value) => setField('accountCityId', value)} options={accountCityOptions.map(toOption)} />
                  <TextField label="כתובת ארגון" value={form.accountAddress} onChange={(value) => setField('accountAddress', value)} className="lg:col-span-2" />
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TextField label="שם איש קשר" value={form.employerContactName} onChange={(value) => setField('employerContactName', value)} />
                <TextField label="נייד איש קשר" value={form.employerContactPhone} onChange={(value) => setField('employerContactPhone', value)} dir="ltr" />
                <TextField label="אימייל איש קשר" value={form.employerContactEmail} onChange={(value) => setField('employerContactEmail', value)} dir="ltr" />
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
              <SectionTitle icon={<Briefcase className="h-5 w-5" />} title="פרטי משרה" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextField label="קוד משרה" value={form.job_code} onChange={(value) => setField('job_code', value)} dir="ltr" placeholder="אפשר להשאיר ריק ליצירה אוטומטית" />
                <TextField label="כותרת משרה" value={form.job_title} onChange={(value) => setField('job_title', value)} />
                <SelectField label="תפקיד ראשי" value={form.job_role} onChange={(value) => setForm((prev) => ({ ...prev, job_role: value, job_sub_role: [] }))} options={roles.map(toOption)} />
                <MultiSelectField label="תתי־תפקידים" values={form.job_sub_role} onChange={(values) => setField('job_sub_role', values)} options={subRoleOptions.map(toOption)} />
                <SelectField label="אזור" value={form.region_id} onChange={(value) => setForm((prev) => ({ ...prev, region_id: value, city_id: '' }))} options={regions.map(toOption)} />
                <SelectField label="עיר" value={form.city_id} onChange={(value) => setField('city_id', value)} options={cityOptions.map(toOption)} />
                <TextField label="כתובת" value={form.address} onChange={(value) => setField('address', value)} />
                <SelectField label="ניסיון נדרש" value={form.required_experience} onChange={(value) => setField('required_experience', value)} options={experience.map(toOption)} />
                <MultiSelectField label="היקף משרה" values={form.scope} onChange={(values) => setField('scope', values)} options={scopes.map(toOption)} />
                <TextField label="ימים ושעות עבודה" value={form.work_schedule_text} onChange={(value) => setField('work_schedule_text', value)} />
                <MultiSelectField label="שפות" values={form.required_languages} onChange={(values) => setField('required_languages', values)} options={languages.map(toOption)} />
                <MultiSelectField label="מערכות" values={form.systems_used} onChange={(values) => setField('systems_used', values)} options={systems.map(toOption)} />
                <SelectField label="מיסוי" value={form.tax_type_id} onChange={(value) => setField('tax_type_id', value)} options={taxTypes.map(toOption)} />
                <SelectField label="ניידות" value={form.mobility_id} onChange={(value) => setField('mobility_id', value)} options={mobility.map(toOption)} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
              <SectionTitle icon={<FileText className="h-5 w-5" />} title="תוכן, דרישות ושכר" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextField label="שכר שעתי" value={form.salary_expectation_hourly} onChange={(value) => setField('salary_expectation_hourly', value)} dir="ltr" />
                <TextField label="שכר חודשי / גלובלי" value={form.salary_expectation_monthly} onChange={(value) => setField('salary_expectation_monthly', value)} dir="ltr" />
                <label className="flex items-center justify-between rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 text-[13px] font-semibold text-[#2D2D2D] lg:col-span-2">
                  <span>להציג שכר באתר הציבורי לאחר פרסום</span>
                  <input type="checkbox" checked={form.show_salary_public} onChange={(event) => setField('show_salary_public', event.target.checked)} className="h-4 w-4 accent-[#008080]" />
                </label>
                <TextAreaField label="תיאור המשרה" value={form.job_description} onChange={(value) => setField('job_description', value)} />
                <TextAreaField label="דרישות המשרה" value={form.job_requirements} onChange={(value) => setField('job_requirements', value)} />
                <TextAreaField label="תקציר ציבורי" value={form.public_excerpt} onChange={(value) => setField('public_excerpt', value)} />
                <TextAreaField label="הערות פנימיות" value={form.notes} onChange={(value) => setField('notes', value)} />
                <TextAreaField label="הערות מעסיק" value={form.employer_notes} onChange={(value) => setField('employer_notes', value)} className="lg:col-span-2" />
              </div>
            </section>

            <JobImageUpload
              value={form.public_image_url}
              onChange={(url) => setField('public_image_url', url)}
              jobCode={form.job_code || 'new-job'}
              label="תמונת משרה לאדמין"
              helperText="גרירת תמונה או בחירת קובץ. התמונה נשמרת לשימוש בדף המשרה לאחר אישור שלך."
            />
          </main>

          <aside className="space-y-4">
            <section className="sticky top-4 rounded-2xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[16px] font-bold text-[#008080]"><CheckCircle2 className="h-5 w-5" /> סיכום לפני שמירה</div>
              <SummaryRow label="סטטוס פעילות" value="טיוטה" />
              <SummaryRow label="סטטוס פרסום" value="מוסתרת" />
              <SummaryRow label="ארגון" value={form.createMode === 'existing' ? (selectedAccount?.account_name ?? 'לא נבחר') : (form.newAccountName || 'ארגון חדש')} />
              <SummaryRow label="קוד" value={form.job_code || 'ייווצר אוטומטית'} />
              <SummaryRow label="כותרת" value={form.job_title || '—'} />
              <SummaryRow label="עיר" value={cities.find((c) => String(c.id) === String(form.city_id))?.name ?? '—'} />
              <SummaryRow label="תמונה" value={form.public_image_url ? 'קיימת' : 'לא הועלתה'} />
              <div className="mt-5 rounded-xl bg-[#E6F3F3] p-4 text-[13px] leading-6 text-[#006D6D]">
                אין פרסום מהמסך הזה. המשרה נשמרת כטיוטה מוסתרת, ואת מאשרת ומפרסמת ידנית בדף המשרה.
              </div>
              <button type="button" onClick={handleSave} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#008080] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'שומרת...' : 'שמירת טיוטה'}
              </button>
              <button type="button" onClick={() => navigate('/admin/jobs')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9D9D9] bg-white px-5 py-3 text-[14px] font-bold text-[#6B6B6B] transition hover:bg-[#F3F4F6]">
                חזרה ללוח משרות <ChevronLeft className="h-4 w-4" />
              </button>
            </section>
          </aside>
        </div>

        {toast.open && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
            <div className={`rounded-2xl border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}>
              <div className="text-[13px] font-semibold">{toast.message}</div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="mb-5 flex items-center gap-2 text-[18px] font-bold text-[#2D2D2D]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]">{icon}</span>{title}</div>
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-[13px] font-bold transition ${active ? 'bg-[#008080] text-white' : 'border border-[#D9D9D9] bg-white text-[#2D2D2D] hover:bg-[#F3F4F6]'}`}>{children}</button>
}

function TextField({ label, value, onChange, placeholder, dir = 'rtl', className = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; dir?: 'rtl' | 'ltr'; className?: string }) {
  return <label className={`flex flex-col gap-1.5 ${className}`}><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><input dir={dir} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><select dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"><option value="">בחרי</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function MultiSelectField({ label, values, onChange, options }: { label: string; values: number[]; onChange: (values: number[]) => void; options: { value: string; label: string }[] }) {
  return <div className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><div className="max-h-44 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-2">{options.length ? options.map((option) => { const numeric = Number(option.value); const checked = values.includes(numeric); return <label key={option.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F3F4F6]"><span>{option.label}</span><input type="checkbox" checked={checked} onChange={() => onChange(checked ? values.filter((id) => id !== numeric) : [...values, numeric])} className="h-4 w-4 accent-[#008080]" /></label> }) : <div className="px-2 py-2 text-[13px] text-[#6B6B6B]">אין אפשרויות</div>}</div></div>
}

function TextAreaField({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`flex flex-col gap-1.5 ${className}`}><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><textarea dir="rtl" rows={5} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] leading-7 text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]" /></label>
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] py-2 text-[13px]"><span className="font-semibold text-[#6B6B6B]">{label}</span><span className="text-left font-bold text-[#2D2D2D]">{value}</span></div>
}

function toOption(item: DictItem) { return { value: String(item.id), label: item.name } }
function cleanText(value: string) { const clean = String(value ?? '').trim(); return clean || null }
function toNullableNumber(value: string) { const clean = String(value ?? '').trim(); if (!clean) return null; const numeric = Number(clean); return Number.isFinite(numeric) ? numeric : null }
function generateJobCode(roleId: number) { return `JOB${roleId || ''}${Date.now().toString().slice(-5)}`.toUpperCase() }
function toastClassName(tone: ToastTone) { if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'; if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'; return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]' }
