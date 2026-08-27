import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDown,
  CheckCircle2,
  Clock3,
  Home,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { supabase } from '@/lib/supabase'

type ContactFormState = {
  fullName: string
  phone: string
  email: string
  requestType: string
  preferredContactMethod: string
  message: string
  consent: boolean
  website: string
}

const INITIAL_FORM: ContactFormState = {
  fullName: '',
  phone: '',
  email: '',
  requestType: 'general_question',
  preferredContactMethod: 'whatsapp',
  message: '',
  consent: false,
  website: '',
}

const REQUEST_TYPES = [
  { value: 'job_seeker', label: 'מחפש/ת עבודה' },
  { value: 'employer_recruitment', label: 'מעסיק/ה – בקשת גיוס' },
  { value: 'recruitment_services', label: 'שירותי גיוס והשמה' },
  { value: 'partnership', label: 'שיתוף פעולה' },
  { value: 'advertising_marketing', label: 'פרסום ושיווק' },
  { value: 'general_question', label: 'שאלה כללית' },
  { value: 'other', label: 'אחר' },
] as const

const CONTACT_METHODS: Array<{
  value: 'whatsapp' | 'phone' | 'email'
  label: string
  icon: LucideIcon
}> = [
  { value: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { value: 'phone', label: 'טלפון', icon: Phone },
  { value: 'email', label: 'אימייל', icon: Mail },
]

const fieldClassName =
  'h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008080] focus:ring-4 focus:ring-[#008080]/10'

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)

  const phoneDigits = useMemo(
    () => form.phone.replace(/\D/g, ''),
    [form.phone],
  )

  function updateField<K extends keyof ContactFormState>(
    field: K,
    value: ContactFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (error) {
      setError('')
    }
  }

  function validateForm(): string {
    if (form.fullName.trim().length < 2) {
      return 'יש להזין שם מלא.'
    }

    if (!form.phone.trim() && !form.email.trim()) {
      return 'יש להזין לפחות מספר טלפון או כתובת אימייל.'
    }

    if (
      form.phone.trim() &&
      (phoneDigits.length < 8 || phoneDigits.length > 13)
    ) {
      return 'מספר הטלפון אינו תקין.'
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return 'כתובת האימייל אינה תקינה.'
    }

    if (
      form.preferredContactMethod === 'email' &&
      !form.email.trim()
    ) {
      return 'כדי שנחזור באימייל, יש להזין כתובת אימייל.'
    }

    if (
      (form.preferredContactMethod === 'phone' ||
        form.preferredContactMethod === 'whatsapp') &&
      !form.phone.trim()
    ) {
      return 'כדי שנחזור בטלפון או ב־WhatsApp, יש להזין מספר טלפון.'
    }

    if (form.message.trim().length < 2) {
      return 'יש לכתוב את פרטי הפנייה.'
    }

    if (!form.consent) {
      return 'יש לאשר שנוכל לחזור אליכם בהתאם לפרטים שמסרתם.'
    }

    return ''
  }

  function mapSubmitError(message: string): string {
    const knownMessages: Record<string, string> = {
      INVALID_FULL_NAME: 'השם שהוזן אינו תקין.',
      INVALID_MESSAGE: 'ההודעה קצרה מדי או ארוכה מדי.',
      CONTACT_METHOD_REQUIRED:
        'יש להזין לפחות מספר טלפון או כתובת אימייל.',
      INVALID_EMAIL: 'כתובת האימייל אינה תקינה.',
      INVALID_PHONE: 'מספר הטלפון אינו תקין.',
      INVALID_REQUEST_TYPE: 'סוג הפנייה אינו תקין.',
      INVALID_CONTACT_METHOD: 'דרך ההתקשרות שנבחרה אינה תקינה.',
    }

    const matchedKey = Object.keys(knownMessages).find((key) =>
      message.includes(key),
    )

    return matchedKey
      ? knownMessages[matchedKey]
      : 'לא הצלחנו לשלוח את הפנייה. נסו שוב בעוד רגע או פנו אלינו ב־WhatsApp.'
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    // שדה מלכודת לבוטים.
    // אם הוא מולא, לא נשלחת רשומה למסד הנתונים.
    if (form.website.trim()) {
      setSubmitted(true)
      return
    }

    setSubmitting(true)

    try {
      const { data, error: submitError } = await supabase.rpc(
        'submit_public_contact_request',
        {
          p_full_name: form.fullName.trim(),
          p_message: form.message.trim(),
          p_phone: form.phone.trim() || null,
          p_email: form.email.trim() || null,
          p_request_type: form.requestType,
          p_preferred_contact_method:
            form.preferredContactMethod || null,
          p_source_page: '/contact',
          p_source_url:
            typeof window !== 'undefined'
              ? window.location.href
              : null,
          p_consent: form.consent,
        },
      )

      if (submitError) {
        setError(mapSubmitError(submitError.message))
        return
      }

      setRequestId(data == null ? null : String(data))
      setSubmitted(true)
      setForm(INITIAL_FORM)
    } catch (submitException) {
      const message =
        submitException instanceof Error
          ? submitException.message
          : ''

      setError(mapSubmitError(message))
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setSubmitted(false)
    setRequestId(null)
    setError('')
    setForm(INITIAL_FORM)
  }

  return (
    <div
      className="min-h-screen bg-[#F3F4F6] text-[#0F1720]"
      dir="rtl"
    >
      <section className="relative overflow-hidden bg-[#2D2D2D] px-4 py-16 text-white md:px-8 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(171,19,78,0.10),transparent_27%),radial-gradient(circle_at_center_left,rgba(217,169,40,0.09),transparent_24%)]" />

        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full border border-white/[0.05]" />

        <div className="pointer-events-none absolute -left-10 top-28 h-48 w-48 rounded-full border border-white/[0.05]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div className="max-w-4xl text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-4 py-2 text-[13px] font-bold text-white/85">
              <span className="h-2 w-2 rounded-full bg-[#20D3C2]" />
              AllDent Contact
            </span>

            <h1 className="mt-6 text-[clamp(32px,5.6vw,68px)] font-black leading-[1.04] tracking-[-0.03em]">
              נשמח לשמוע
              <span className="mt-2 block text-[#7CECEC]">
                איך נוכל לעזור?
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-[17px] leading-[1.9] text-white/75 md:text-[20px]">
              מחפשים עבודה, רוצים לגייס, מעוניינים בשיתוף פעולה
              או צריכים תשובה? השאירו פרטים ונחזור אליכם באופן
              אישי ומקצועי.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] font-bold text-white/85">
              {[
                'מענה אישי ומקצועי',
                'פנייה שמגיעה ישירות לצוות',
                'בחירת דרך ההתקשרות הנוחה לכם',
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-[#7CECEC]"
                    aria-hidden="true"
                  />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10">
              <a
                href="#contact-form"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] bg-[#008080] px-7 py-3 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(0,128,128,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#006D6D]"
              >
                <ArrowDown
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                מעבר לטופס
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[430px] lg:ms-auto">
            <div className="relative overflow-hidden rounded-[34px] border border-white/[0.12] bg-white/[0.07] p-7 shadow-[0_26px_70px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-9">
              <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[#008080]/20 blur-3xl" />

              <div className="relative">
                <img
                  src="/images/logo-teal.png"
                  alt="AllDent"
                  className="mx-auto h-auto w-[220px] max-w-full object-contain"
                />

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <HeroInfo
                    icon={ShieldCheck}
                    label="שליחה מאובטחת"
                  />

                  <HeroInfo
                    icon={Clock3}
                    label="נחזור בהקדם"
                  />
                </div>

                <p className="mt-6 text-center text-[14px] leading-7 text-white/65">
                  כל פנייה נשמרת באופן מסודר ומועברת לטיפול צוות
                  AllDent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact-form"
        className="scroll-mt-24 px-4 py-14 md:px-8 md:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <aside className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-9">
              <img
                src="/images/logo.png"
                alt="AllDent"
                className="h-auto w-[190px] max-w-full object-contain"
              />

              <h2 className="mt-7 text-[clamp(21px,2.6vw,32px)] font-black leading-[1.12] tracking-[-0.02em] text-slate-900">
                אנחנו כאן בשבילכם
              </h2>

              <p className="mt-3 text-[15px] leading-8 text-slate-600">
                צוות AllDent מחבר בין אנשי מקצוע, מרפאות וארגונים
                בעולם הדנטלי. בחרו את דרך ההתקשרות הנוחה לכם או
                שלחו את הטופס.
              </p>

              <div className="mt-7 space-y-3">
                <ContactLink
                  href="https://wa.me/972533951003"
                  icon={WhatsAppIcon}
                  label="WhatsApp"
                  value="053-3951003"
                  external
                />

                <ContactLink
                  href="tel:+972533951003"
                  icon={Phone}
                  label="טלפון"
                  value="053-3951003"
                />

                <ContactLink
                  href="mailto:alldent.job@gmail.com"
                  icon={Mail}
                  label="אימייל"
                  value="alldent.job@gmail.com"
                />
              </div>
            </div>

            <div className="rounded-[26px] border border-[#CFE8E8] bg-[#EAF7F7] p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#008080] shadow-sm">
                  <ShieldCheck
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h3 className="text-[clamp(17px,1.75vw,22px)] font-black leading-[1.3] tracking-[-0.015em] text-slate-900">
                    הפרטים נשמרים בצורה מאובטחת
                  </h3>

                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    האתר הציבורי מאפשר שליחת פנייה בלבד. לא ניתן
                    לצפות בפניות, לערוך אותן או לקרוא פרטים של
                    פונים אחרים.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,32,0.08)] sm:p-8 md:p-10">
            {submitted ? (
              <div className="flex min-h-[540px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F3F3] text-[#008080]">
                  <CheckCircle2
                    className="h-8 w-8"
                    aria-hidden="true"
                  />
                </div>

                <h2 className="mt-6 text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em] text-slate-900">
                  הפנייה נשלחה בהצלחה
                </h2>

                <p className="mt-3 max-w-md text-[16px] leading-8 text-slate-600">
                  הפרטים הגיעו למערכת AllDent. נחזור אליכם בהתאם
                  לדרך ההתקשרות שבחרתם.
                </p>

                {requestId ? (
                  <p className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                    מספר פנייה:{' '}
                    <span dir="ltr">{requestId}</span>
                  </p>
                ) : null}

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-[16px] bg-[#008080] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#006D6D]"
                  >
                    שליחת פנייה נוספת
                  </button>

                  <Link
                    to="/"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-[#008080] hover:text-[#008080]"
                  >
                    <Home
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    חזרה לדף הבית
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
                    <Sparkles
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    טופס יצירת קשר
                  </span>

                  <h2 className="mt-4 text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em] text-slate-900">
                    ספרו לנו במה מדובר
                  </h2>

                  <p className="mt-2 text-[15px] leading-7 text-slate-600">
                    מלאו את הפרטים ונחזור אליכם. אפשר לכתוב כל
                    שאלה, בקשה או מידע נוסף בשדה המלל החופשי.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  noValidate
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField
                      label="שם מלא"
                      required
                    >
                      <input
                        value={form.fullName}
                        onChange={(event) =>
                          updateField(
                            'fullName',
                            event.target.value,
                          )
                        }
                        autoComplete="name"
                        maxLength={150}
                        className={fieldClassName}
                        placeholder="שם פרטי ומשפחה"
                      />
                    </FormField>

                    <FormField
                      label="נושא הפנייה"
                      required
                    >
                      <select
                        value={form.requestType}
                        onChange={(event) =>
                          updateField(
                            'requestType',
                            event.target.value,
                          )
                        }
                        className={fieldClassName}
                      >
                        {REQUEST_TYPES.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="טלפון">
                      <input
                        value={form.phone}
                        onChange={(event) =>
                          updateField(
                            'phone',
                            event.target.value,
                          )
                        }
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={30}
                        className={`${fieldClassName} text-left`}
                        placeholder="053-3951003"
                        dir="ltr"
                      />
                    </FormField>

                    <FormField label="אימייל">
                      <input
                        value={form.email}
                        onChange={(event) =>
                          updateField(
                            'email',
                            event.target.value,
                          )
                        }
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        className={`${fieldClassName} text-left`}
                        placeholder="name@example.com"
                        dir="ltr"
                      />
                    </FormField>
                  </div>

                  <fieldset>
                    <legend className="mb-3 text-sm font-extrabold text-slate-800">
                      איך נוח לכם שנחזור?
                    </legend>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {CONTACT_METHODS.map(
                        ({
                          value,
                          label,
                          icon: Icon,
                        }) => {
                          const active =
                            form.preferredContactMethod ===
                            value

                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updateField(
                                  'preferredContactMethod',
                                  value,
                                )
                              }
                              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-bold transition ${
                                active
                                  ? 'border-[#008080] bg-[#E6F3F3] text-[#007070] shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#008080]/60 hover:text-[#008080]'
                              }`}
                              aria-pressed={active}
                            >
                              <Icon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {label}
                            </button>
                          )
                        },
                      )}
                    </div>
                  </fieldset>

                  <FormField
                    label="איך נוכל לעזור?"
                    required
                    hint={`${form.message.length.toLocaleString(
                      'he-IL',
                    )} / 5,000`}
                  >
                    <textarea
                      value={form.message}
                      onChange={(event) =>
                        updateField(
                          'message',
                          event.target.value,
                        )
                      }
                      maxLength={5000}
                      rows={7}
                      className={`${fieldClassName} min-h-[180px] resize-y py-3`}
                      placeholder="כתבו כאן בחופשיות את פרטי הפנייה, השאלה או הבקשה שלכם..."
                    />
                  </FormField>

                  <div
                    className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0 [clip-path:inset(50%)]"
                    aria-hidden="true"
                  >
                    <label htmlFor="contact-website">
                      Website
                    </label>

                    <input
                      id="contact-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(event) =>
                        updateField(
                          'website',
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(event) =>
                        updateField(
                          'consent',
                          event.target.checked,
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#008080]"
                    />

                    <span>
                      אני מאשר/ת ל־AllDent לחזור אליי בהתאם
                      לפרטים שמסרתי בטופס.
                    </span>
                  </label>

                  {error ? (
                    <div
                      className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                      role="alert"
                    >
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#008080] px-7 py-3.5 text-[16px] font-extrabold text-white shadow-[0_14px_32px_rgba(0,128,128,0.24)] transition hover:-translate-y-0.5 hover:bg-[#006D6D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          className="h-5 w-5 animate-spin"
                          aria-hidden="true"
                        />
                        שולחים את הפנייה...
                      </>
                    ) : (
                      <>
                        <Send
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                        שליחת הפנייה
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroInfo({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <div className="flex min-h-[88px] flex-col items-center justify-center rounded-[20px] border border-white/[0.10] bg-black/10 px-3 py-4 text-center">
      <Icon
        className="h-5 w-5 text-[#7CECEC]"
        aria-hidden="true"
      />

      <span className="mt-2 text-[13px] font-bold text-white/80">
        {label}
      </span>
    </div>
  )
}

function FormField({
  label,
  required = false,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-extrabold text-slate-800">
        <span>
          {label}

          {required ? (
            <span className="mr-1 text-[#008080]">*</span>
          ) : null}
        </span>

        {hint ? (
          <span className="text-xs font-medium text-slate-400">
            {hint}
          </span>
        ) : null}
      </span>

      {children}
    </label>
  )
}

function ContactLink({
  href,
  icon: Icon,
  label,
  value,
  external = false,
}: {
  href: string
  icon: LucideIcon
  label: string
  value: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white p-3.5 transition hover:border-[#008080]/50 hover:bg-[#F8FFFF]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080]">
        <Icon
          className="h-5 w-5"
          aria-hidden="true"
        />
      </span>

      <span>
        <span className="block text-xs font-bold text-slate-400">
          {label}
        </span>

        <span
          className="block text-sm font-extrabold text-slate-800"
          dir={label === 'אימייל' ? 'ltr' : undefined}
        >
          {value}
        </span>
      </span>
    </a>
  )
}