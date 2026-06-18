import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizePhone } from '@/lib/normalizePhone'

type DictItem = { id: number; name: string; role_id?: number | null; region_id?: number | null }

type FormState = {
  company_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  job_role: string
  job_sub_role: number[]
  region_id: string
  city_id: string
  scope: number[]
  job_description: string
  job_requirements: string
  work_schedule_text: string
  required_experience: string
  required_languages: number[]
  systems_used: number[]
  mobility_id: string
  tax_type_id: string
  salary_expectation_monthly: string
  salary_expectation_hourly: string
  show_salary_public: boolean
  employer_notes: string
}

const EMPTY_FORM: FormState = {
  company_name: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  job_role: '',
  job_sub_role: [],
  region_id: '',
  city_id: '',
  scope: [],
  job_description: '',
  job_requirements: '',
  work_schedule_text: '',
  required_experience: '',
  required_languages: [],
  systems_used: [],
  mobility_id: '',
  tax_type_id: '',
  salary_expectation_monthly: '',
  salary_expectation_hourly: '',
  show_salary_public: false,
  employer_notes: '',
}

async function fetchDict(table: string): Promise<DictItem[]> {
  const { data, error } = await supabase.from(table).select('id,name').order('name')
  if (error) throw error
  return (data ?? []) as DictItem[]
}

export default function RecruitmentRequestPage() {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: roles = [] } = useQuery({ queryKey: ['dict_roles'], queryFn: () => fetchDict('dict_roles'), staleTime: 600_000 })
  const { data: subRoles = [] } = useQuery({
    queryKey: ['dict_sub_roles'],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('dict_sub_roles').select('id,name,role_id').order('name')
      if (err) throw err
      return (data ?? []) as DictItem[]
    },
    staleTime: 600_000,
  })
  const { data: regions = [] } = useQuery({ queryKey: ['dict_regions'], queryFn: () => fetchDict('dict_regions'), staleTime: 600_000 })
  const { data: cities = [] } = useQuery({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('dict_cities').select('id,name,region_id').order('name').limit(2000)
      if (err) throw err
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

  const cityOptions = useMemo(() => {
    const regionId = Number(form.region_id || 0)
    return regionId ? cities.filter((c) => Number(c.region_id) === regionId) : []
  }, [cities, form.region_id])

  const subRoleOptions = useMemo(() => {
    const roleId = Number(form.job_role || 0)
    return roleId ? subRoles.filter((s) => Number(s.role_id) === roleId) : []
  }, [subRoles, form.job_role])

  const showSubRole = subRoleOptions.length > 0

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    setError(null)

    if (!form.company_name.trim()) { setError('שם ארגון / מרפאה הוא שדה חובה'); return }
    if (!form.contact_name.trim()) { setError('שם איש קשר הוא שדה חובה'); return }
    if (!form.contact_phone.trim()) { setError('נייד הוא שדה חובה'); return }
    if (!form.contact_email.trim()) { setError('אימייל הוא שדה חובה'); return }
    if (!form.job_role) { setError('יש לבחור תפקיד'); return }
    if (!form.region_id) { setError('יש לבחור אזור המשרה'); return }
    if (!form.city_id) { setError('יש לבחור עיר המשרה'); return }
    if (!form.scope.length) { setError('יש לבחור היקף משרה'); return }
    if (!form.job_description.trim()) { setError('תיאור המשרה הוא שדה חובה'); return }
    if (!form.job_requirements.trim()) { setError('דרישות התפקיד הן שדה חובה'); return }
    if (!form.required_experience) { setError('יש לבחור ניסיון נדרש'); return }
    if (!form.required_languages.length) { setError('יש לבחור לפחות שפה אחת'); return }
    if (!form.salary_expectation_monthly && !form.salary_expectation_hourly) {
      setError('יש להזין שכר גלובלי או שכר שעתי לצורך טיפול בבקשה.')
      return
    }

    setSubmitting(true)
    try {
      const normalizedPhone = normalizePhone(form.contact_phone)

      const { data: accountRows } = await supabase
        .from('accounts')
        .select('account_id')
        .eq('account_name', form.company_name.trim())
        .limit(1)
      const accountLink = (accountRows as any)?.[0]?.account_id ?? null

      const contactBlock = [
        '[בקשת גיוס — פרטי פונה]',
        `ארגון: ${form.company_name}`,
        `איש קשר: ${form.contact_name}`,
        `נייד: ${normalizedPhone}`,
        `אימייל: ${form.contact_email}`,
        '---',
        form.employer_notes.trim(),
      ].filter(Boolean).join('\n')

      const jobCode = `DRAFT-${Date.now()}`

      const { error: insertError } = await supabase.from('job').insert({
        job_code: jobCode,
        job_status: 2,
        public_status: 1,
        published_at: null,
        account_link: accountLink,
        job_role: Number(form.job_role) || null,
        job_sub_role: form.job_sub_role.length ? form.job_sub_role : [],
        region_id: Number(form.region_id) || null,
        city_id: Number(form.city_id) || null,
        scope: form.scope.length ? form.scope : [],
        job_description: form.job_description.trim() || null,
        job_requirements: form.job_requirements.trim() || null,
        work_schedule_text: form.work_schedule_text.trim() || null,
        required_experience: Number(form.required_experience) || null,
        required_languages: form.required_languages.length ? form.required_languages : [],
        systems_used: form.systems_used.length ? form.systems_used : [],
        mobility_id: Number(form.mobility_id) || null,
        tax_type_id: Number(form.tax_type_id) || null,
        salary_expectation_monthly: form.salary_expectation_monthly ? Number(form.salary_expectation_monthly) : null,
        salary_expectation_hourly: form.salary_expectation_hourly ? Number(form.salary_expectation_hourly) : null,
        show_salary_public: form.show_salary_public,
        employer_notes: contactBlock,
        show_employer_name: false,
        created_time: new Date().toISOString(),
        updated_timestamp: new Date().toISOString(),
      })

      if (insertError) throw insertError
      setSuccess(true)
    } catch {
      setError('אירעה שגיאה בשליחת הבקשה. אנא נסו שנית.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAFAF7] font-['Heebo'] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F3F3] mx-auto mb-6">
            <svg className="h-8 w-8 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-[24px] font-bold text-[#2D2D2D] mb-3">בקשת הגיוס התקבלה</h2>
          <p className="text-[#6B6B6B] text-[16px]">צוות AllDent יבדוק את הבקשה ויחזור אליכם בהקדם.</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] font-['Heebo'] text-[#2D2D2D]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <span className="rounded-full bg-[#E6F3F3] px-3 py-1 text-[12px] font-bold text-[#008080]">מעסיקים</span>
          <h1 className="mt-3 text-[32px] font-bold text-[#2D2D2D]">בקשת גיוס</h1>
          <p className="mt-2 text-[16px] text-[#6B6B6B]">מלאו את הטופס ואנחנו נחזור אליכם בהקדם עם הצעה מותאמת.</p>
        </div>

        <div className="space-y-6">
          {/* חלק 1 — פרטי המעסיק */}
          <SectionCard title="פרטי המעסיק / הארגון">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="שם ארגון / מרפאה *" value={form.company_name} onChange={(v) => setField('company_name', v)} className="sm:col-span-2" />
              <TextField label="שם איש קשר *" value={form.contact_name} onChange={(v) => setField('contact_name', v)} />
              <TextField label="נייד *" value={form.contact_phone} onChange={(v) => setField('contact_phone', v)} dir="ltr" type="tel" />
              <TextField label="אימייל *" value={form.contact_email} onChange={(v) => setField('contact_email', v)} dir="ltr" type="email" className="sm:col-span-2" />
            </div>
          </SectionCard>

          {/* חלק 2 — פרטי המשרה */}
          <SectionCard title="פרטי המשרה">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="תפקיד *"
                value={form.job_role}
                onChange={(v) => setForm((prev) => ({ ...prev, job_role: v, job_sub_role: [] }))}
                options={roles.map(toOption)}
              />
              {showSubRole && (
                <MultiSelectField
                  label="תת-תפקיד"
                  values={form.job_sub_role}
                  onChange={(v) => setField('job_sub_role', v)}
                  options={subRoleOptions.map(toOption)}
                />
              )}
              <SelectField
                label="אזור המשרה *"
                value={form.region_id}
                onChange={(v) => setForm((prev) => ({ ...prev, region_id: v, city_id: '' }))}
                options={regions.map(toOption)}
              />
              <SelectField
                label="עיר המשרה *"
                value={form.city_id}
                onChange={(v) => setField('city_id', v)}
                options={cityOptions.map(toOption)}
                placeholder={form.region_id ? 'בחרו עיר' : 'בחרו אזור תחילה'}
              />
              <MultiSelectField
                label="היקף משרה *"
                values={form.scope}
                onChange={(v) => setField('scope', v)}
                options={scopes.map(toOption)}
                className="sm:col-span-2"
              />
              <SelectField label="ניסיון נדרש *" value={form.required_experience} onChange={(v) => setField('required_experience', v)} options={experience.map(toOption)} />
              <MultiSelectField label="שפות *" values={form.required_languages} onChange={(v) => setField('required_languages', v)} options={languages.map(toOption)} />
            </div>
          </SectionCard>

          {/* תוכן ודרישות */}
          <SectionCard title="תיאור ודרישות">
            <div className="grid grid-cols-1 gap-4">
              <TextAreaField label="תיאור המשרה (כולל ימים ושעות עבודה) *" value={form.job_description} onChange={(v) => setField('job_description', v)} />
              <TextAreaField label="ימים ושעות עבודה" value={form.work_schedule_text} onChange={(v) => setField('work_schedule_text', v)} rows={3} />
              <TextAreaField label="דרישות התפקיד *" value={form.job_requirements} onChange={(v) => setField('job_requirements', v)} />
            </div>
          </SectionCard>

          {/* שכר */}
          <SectionCard title="שכר">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="שכר חודשי / גלובלי (₪)" value={form.salary_expectation_monthly} onChange={(v) => setField('salary_expectation_monthly', v)} dir="ltr" type="number" />
              <TextField label="שכר שעתי (₪)" value={form.salary_expectation_hourly} onChange={(v) => setField('salary_expectation_hourly', v)} dir="ltr" type="number" />
              <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 text-[13px] font-semibold text-[#2D2D2D] cursor-pointer">
                <span>הצגת שכר לציבור — האם לפרסם את השכר במשרה?</span>
                <input type="checkbox" checked={form.show_salary_public} onChange={(e) => setField('show_salary_public', e.target.checked)} className="h-4 w-4 accent-[#008080]" />
              </label>
            </div>
          </SectionCard>

          {/* אופציונלי */}
          <SectionCard title="פרטים נוספים (לא חובה)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MultiSelectField label="מערכות נדרשות" values={form.systems_used} onChange={(v) => setField('systems_used', v)} options={systems.map(toOption)} />
              <SelectField label="אופן הגעה / נגישות" value={form.mobility_id} onChange={(v) => setField('mobility_id', v)} options={mobility.map(toOption)} />
              <SelectField label="מיסוי" value={form.tax_type_id} onChange={(v) => setField('tax_type_id', v)} options={taxTypes.map(toOption)} />
              <TextAreaField label="הערות נוספות" value={form.employer_notes} onChange={(v) => setField('employer_notes', v)} className="sm:col-span-2" rows={3} />
            </div>
          </SectionCard>

          {/* שגיאה */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* שליחה */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-[#008080] px-8 py-3 text-[15px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-60"
            >
              {submitting ? 'שולח...' : 'שליחת בקשת גיוס'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function toOption(item: DictItem) {
  return { value: String(item.id), label: item.name }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-[18px] font-bold text-[#2D2D2D]">{title}</h2>
      {children}
    </div>
  )
}

function TextField({
  label, value, onChange, dir = 'rtl', type = 'text', className = '', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; dir?: 'rtl' | 'ltr'; type?: string; className?: string; placeholder?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      <input
        dir={dir}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
      />
    </div>
  )
}

function SelectField({
  label, value, onChange, options, placeholder = 'בחרו',
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      <select
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[14px] font-medium text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function MultiSelectField({
  label, values, onChange, options, className = '',
}: {
  label: string; values: number[]; onChange: (v: number[]) => void; options: { value: string; label: string }[]; className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-2">
        {options.length ? options.map((o) => {
          const num = Number(o.value)
          const checked = values.includes(num)
          return (
            <label key={o.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F3F4F6]">
              <span>{o.label}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((id) => id !== num) : [...values, num])}
                className="h-4 w-4 accent-[#008080]"
              />
            </label>
          )
        }) : <div className="px-2 py-2 text-[13px] text-[#6B6B6B]">אין אפשרויות</div>}
      </div>
    </div>
  )
}

function TextAreaField({
  label, value, onChange, rows = 5, className = '',
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      <textarea
        dir="rtl"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] leading-7 text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
      />
    </div>
  )
}
