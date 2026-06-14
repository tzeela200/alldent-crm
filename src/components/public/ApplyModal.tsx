import { useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    setStatus('loading')

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

        const { data: urlData } = await supabase.storage
          .from('candidate-cvs')
          .createSignedUrl(cvStoragePath, 60 * 60 * 24 * 365)

        cvLink = urlData?.signedUrl ?? null
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

      if (error) { setStatus('error'); return }

      const result = (data as { status?: string })?.status
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
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
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
          <Result icon={CheckCircle2} text="המועמדות נשלחה בהצלחה!" iconClass="text-green-500" />
        )}
        {status === 'duplicate' && (
          <Result icon={AlertCircle} text="כבר שלחת מועמדות למשרה זו" iconClass="text-amber-500" />
        )}

        {/* Error */}
        {status === 'error' && (
          <p className="text-red-500 text-sm text-center mb-4">הייתה שגיאה, נסה שוב</p>
        )}

        {/* Form */}
        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <Field label="שם מלא *">
              <input
                name="full_name"
                onChange={handleChange}
                required
                placeholder="ישראל ישראלי"
                className={inputCls}
              />
            </Field>

            <Field label="נייד *">
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

            {/* CV Upload */}
            <Field label='קורות חיים'>
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
                className={`${inputCls} flex items-center gap-2 cursor-pointer hover:border-[#D97706] text-right`}
              >
                <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className={cvFile ? 'text-gray-800' : 'text-gray-400'}>
                  {cvFile ? cvFile.name : 'בחרו קובץ PDF / Word'}
                </span>
              </button>
            </Field>

            <Field label="הערות / הודעה">
              <textarea
                name="notes"
                onChange={handleChange}
                placeholder="ספרו לנו עוד קצת..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Consent */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                name="consent"
                type="checkbox"
                checked={form.consent}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#D97706] focus:ring-[#D97706] flex-shrink-0"
              />
              <span className="text-[13px] text-gray-500 leading-relaxed">
                אני מסכים/ה לשמירת פרטיי לצורך גיוס עובדים
              </span>
            </label>

            <button
              type="submit"
              disabled={status === 'loading' || !form.consent}
              className="w-full py-3 bg-[#D97706] text-white rounded-[20px] font-medium shadow-[6px_6px_12px_rgba(0,0,0,0.12)] hover:bg-[#B45309] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.16)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  'w-full px-3.5 py-2.5 rounded-[16px] border border-gray-200 text-[15px] text-gray-900 placeholder-gray-400 outline-none focus:border-[#D97706] transition bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Result({ icon: Icon, text, iconClass }: { icon: React.ElementType; text: string; iconClass: string }) {
  return (
    <div className="text-center py-6">
      <Icon className={`mx-auto mb-3 ${iconClass}`} size={30} />
      <p className="text-gray-800 font-medium">{text}</p>
    </div>
  )
}
