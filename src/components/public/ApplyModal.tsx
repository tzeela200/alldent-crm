import { useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'

type Props = {
  isOpen: boolean
  onClose: () => void
  jobCode: string
}

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

export default function ApplyModal({ isOpen, onClose, jobCode }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    notes: '',
    consent: false,
  })

  const [cvFile, setCvFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement

    if (target.name === 'consent') {
      setForm({ ...form, consent: target.checked })
    } else {
      setForm({ ...form, [target.name]: target.value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.consent) return

    // חוסמים נייד פגום כאן, לפני ה-RPC. הגשה עם נייד לא תקין נכנסת למאגר אבל
    // לא ניתן לאשר אותה למאגר אחר כך (contact.phone_norm הוא UNIQUE ומצפה
    // ל-9725XXXXXXXX), ואז צריך לחלץ את המספר האמיתי מקורות החיים — INC-3116.
    if (!normalizeIlMobile(form.phone)) {
      setErrorMsg(IL_MOBILE_ERROR)
      setStatus('error')
      return
    }

    setStatus('loading')

    // Map known RPC/validation errors to friendly Hebrew; never surface raw DB text.
    const mapError = (e: unknown): string => {
      const raw = (e as { message?: string })?.message ?? ''
      const table: Record<string, string> = {
        consent_required: 'יש לאשר את שמירת הפרטים כדי להמשיך.',
        phone_required: 'יש להזין מספר טלפון.',
        // נחסם כבר בוולידציה שלמעלה; קיים למקרה שה-RPC יאכוף בעתיד.
        invalid_phone: IL_MOBILE_ERROR,
        full_name_required: 'יש להזין שם מלא.',
        job_code_required: 'המשרה אינה זמינה כרגע.',
        job_not_found: 'המשרה אינה זמינה כרגע.',
      }
      for (const key of Object.keys(table)) {
        if (raw.includes(key)) return table[key]
      }
      return 'אירעה שגיאה בשליחת המועמדות. נסו שוב בעוד רגע.'
    }

    try {
      let cvStoragePath: string | null = null
      let cvLink: string | null = null

      if (cvFile) {
        const ext = cvFile.name.split('.').pop() ?? 'pdf'
        const uuid = crypto.randomUUID()
        cvStoragePath = `${jobCode}/${uuid}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('candidate-cvs')
          .upload(cvStoragePath, cvFile)

        if (uploadError) throw uploadError

        // Private bucket: anon can INSERT but not SELECT, so it cannot mint a signed
        // URL. Persist only the storage path (sent to the RPC as p_cv_storage_path);
        // an authenticated admin mints a signed URL on demand when viewing the CV.
      }

      const { data, error } = await supabase.rpc('submit_public_application', {
        p_job_code: jobCode,
        p_full_name: form.full_name,
        p_phone: form.phone,
        p_email: form.email || null,
        p_cv_link: cvLink,
        p_cv_storage_path: cvStoragePath,
        p_candidate_notes: form.notes || null,
        p_consent: true,
      })

      if (error) {
        console.error('[ApplyModal] RPC error:', error)
        setErrorMsg(mapError(error))
        setStatus('error')
        return
      }

      const result = (data as { status?: string }[] | null)?.[0]?.status
      setStatus(result === 'duplicate' ? 'duplicate' : 'success')
    } catch (err) {
      console.error('[ApplyModal] submit failed:', err)
      setErrorMsg(mapError(err))
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F10]/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(15,15,16,0.28)]"
        style={{ fontFamily: 'Heebo, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[#EFEFEF] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="text-right">
              <p className="mb-1 text-[12px] font-semibold text-[#B45309]">
                משרה {jobCode}
              </p>
              <h2 className="text-[22px] font-bold leading-tight text-[#1A1A1A]">
                הגשת מועמדות למשרה
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#6B6B6B]">
                מלאו פרטים קצרים ונחזור אליכם בהקדם.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="סגירת חלון"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B6B6B] transition hover:bg-[#F3F4F6] hover:text-[#1A1A1A]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-6 py-6">
          {/* Success / Duplicate */}
          {status === 'success' && (
            <Result
              icon={CheckCircle2}
              title="המועמדות נשלחה בהצלחה"
              text="קיבלנו את הפרטים שלך ונחזור אליך בהמשך התהליך."
              iconClass="text-[#15803D]"
            />
          )}

          {status === 'duplicate' && (
            <Result
              icon={AlertCircle}
              title="המועמדות כבר קיימת"
              text="נראה שכבר שלחת מועמדות למשרה הזו."
              iconClass="text-[#B45309]"
            />
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-[14px] leading-6 text-red-700">
              {errorMsg ?? 'אירעה שגיאה בשליחת המועמדות. נסו שוב בעוד רגע.'}
            </div>
          )}

          {/* Form */}
          {(status === 'idle' || status === 'loading' || status === 'error') && (
            <form onSubmit={handleSubmit} className="space-y-5 text-right">
              <Field label="שם מלא" required>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  placeholder="שם פרטי ושם משפחה"
                  className={inputCls}
                />
              </Field>

              <Field label="נייד" required>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  // נייד ישראלי בלבד: 10 ספרות שמתחילות ב-05, או פורמט +972.
                  // מקבילה ל-normalizeIlMobile, כדי שהדפדפן יחסום עוד לפני השליחה.
                  pattern="^(?:\+?972[-\s]?|0)5[0-9](?:[-\s]?[0-9]){7}$"
                  title={IL_MOBILE_ERROR}
                  placeholder="050-1234567"
                  dir="ltr"
                  className={`${inputCls} text-left`}
                />
              </Field>

              <Field label="דוא״ל">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  dir="ltr"
                  className={`${inputCls} text-left`}
                />
              </Field>

              <Field label="קורות חיים">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D9D9D9] bg-white px-4 text-right text-[14px] transition hover:border-[#B45309] hover:bg-[#FFF8F0]"
                >
                  <span className={cvFile ? 'truncate text-[#1A1A1A]' : 'text-[#9CA3AF]'}>
                    {cvFile ? cvFile.name : 'העלאת קובץ PDF / Word'}
                  </span>

                  <Paperclip className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
                </button>
              </Field>

              <Field label="הודעה קצרה">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="אפשר לציין זמינות, ניסיון רלוונטי או שאלה קצרה"
                  rows={4}
                  className={`${inputCls} min-h-[108px] resize-none py-3 leading-6`}
                />
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#FAFAF7] px-4 py-3">
                <input
                  name="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[#D9D9D9] text-[#B45309] focus:ring-[#B45309]"
                />

                <span className="text-[13px] leading-6 text-[#6B6B6B]">
                  אני מאשר/ת שמירת הפרטים לצורך טיפול במועמדות ויצירת קשר.
                </span>
              </label>

              <button
                type="submit"
                disabled={status === 'loading' || !form.consent}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#B45309] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(217,119,6,0.25)] transition hover:bg-[#92400E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                שליחת מועמדות
              </button>

              <p className="text-center text-[12px] leading-5 text-[#9CA3AF]">
                הפרטים נשמרים במערכת AllDent לצורך טיפול בפנייה בלבד.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'h-12 w-full rounded-2xl border border-[#D9D9D9] bg-white px-4 text-[15px] text-[#1A1A1A] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#B45309] focus:ring-4 focus:ring-[#B45309]/10'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-right text-[13px] font-semibold text-[#2D2D2D]">
        {label}
        {required && <span className="mr-1 text-[#B45309]">*</span>}
      </label>

      {children}
    </div>
  )
}

function Result({
  icon: Icon,
  title,
  text,
  iconClass,
}: {
  icon: React.ElementType
  title: string
  text: string
  iconClass: string
}) {
  return (
    <div className="py-8 text-center">
      <Icon className={`mx-auto mb-4 ${iconClass}`} size={38} />
      <h3 className="text-[20px] font-bold text-[#1A1A1A]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-6 text-[#6B6B6B]">
        {text}
      </p>
    </div>
  )
}