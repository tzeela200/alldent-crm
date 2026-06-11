import { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Props = {
  isOpen: boolean
  onClose: () => void
  jobCode: string
}

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

export default function ApplyModal({ isOpen, onClose, jobCode }: Props) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', cv_link: '' })
  const [status, setStatus] = useState<Status>('idle')

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const { data, error } = await supabase.rpc('submit_public_application', {
        p_job_code: jobCode,
        p_full_name: form.full_name,
        p_phone: form.phone,
        p_email: form.email || null,
        p_cv_link: form.cv_link || null,
        p_consent: true,
        p_source: 'public_website',
      })

      if (error) { setStatus('error'); return }

      const result = (data as any)?.status
      setStatus(result === 'duplicate' ? 'duplicate' : 'success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl"
        style={{ fontFamily: 'Heebo, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <X className="text-gray-500 hover:text-black" size={18} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">הגשת מועמדות</h2>
        </div>

        {/* Success / Duplicate */}
        {status === 'success' && (
          <Success icon={CheckCircle2} text="המועמדות נשלחה בהצלחה!" iconClass="text-green-500" />
        )}
        {status === 'duplicate' && (
          <Success icon={AlertCircle} text="כבר שלחת מועמדות" iconClass="text-amber-500" />
        )}

        {/* Error */}
        {status === 'error' && (
          <p className="text-red-500 text-sm text-center mb-4">הייתה שגיאה, נסה שוב</p>
        )}

        {/* Form */}
        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <Field label="שם מלא">
              <input
                name="full_name"
                onChange={handleChange}
                required
                placeholder="ישראל ישראלי"
                className={inputCls}
              />
            </Field>

            <Field label="טלפון">
              <input
                name="phone"
                type="tel"
                onChange={handleChange}
                required
                placeholder="050-0000000"
                dir="ltr"
                className={`${inputCls} text-left`}
              />
            </Field>

            <Field label="אימייל">
              <input
                name="email"
                type="email"
                onChange={handleChange}
                placeholder="name@example.com"
                dir="ltr"
                className={`${inputCls} text-left`}
              />
            </Field>

            <Field label='קישור לקו"ח'>
              <input
                name="cv_link"
                type="url"
                onChange={handleChange}
                placeholder="https://drive.google.com/..."
                dir="ltr"
                className={`${inputCls} text-left`}
              />
            </Field>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-[#D97706] text-white rounded-full font-medium shadow-md hover:shadow-xl hover:-translate-y-[1px] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {status === 'loading' && <Loader2 className="animate-spin w-4 h-4" />}
              שליחת מועמדות
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-full border border-gray-200 text-[15px] text-gray-900 placeholder-gray-400 outline-none focus:border-[#D97706] transition'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Success({ icon: Icon, text, iconClass }: { icon: React.ElementType; text: string; iconClass: string }) {
  return (
    <div className="text-center py-6">
      <Icon className={`mx-auto mb-3 ${iconClass}`} size={30} />
      <p className="text-gray-800 font-medium">{text}</p>
    </div>
  )
}
