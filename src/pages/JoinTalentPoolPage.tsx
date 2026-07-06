import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { normalizePhone } from '@/lib/normalizePhone'

// טופס "הצטרפות למאגר הדנטלי" — פופאפ/כרטיס ממורכז באתר הציבורי.
// כרגע ההגשה נשלחת לוואטאפ של AllDent (972533951003) עם הפרטים.
// שמירה קבועה ב-DB היא נקודת החלטה פתוחה (RPC ציבורי מאובטח) — טרם חוברה.
const WHATSAPP_NUMBER = '972533951003'

// שמות תפקידים ציבוריים (תואם dict_roles). סטטי כדי לא לתלות ב-RLS אנונימי.
const ROLE_OPTIONS = [
  'רופא/ת שיניים',
  'רופא/ה מומחה/ית',
  'שיננית',
  'סייע/ת רופא שיניים',
  'מזכיר/ה דנטלית',
  'טכנאי/ת שיניים',
  'ניהול / מכירות דנטלי',
  'אחר',
]

export default function JoinTalentPoolPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim() || !role) {
      setError('נא למלא שם מלא, טלפון ותפקיד.')
      return
    }
    const normalized = normalizePhone(phone)
    if (normalized.replace(/\D/g, '').length < 9) {
      setError('מספר טלפון לא תקין.')
      return
    }
    setError('')
    const lines = [
      'הצטרפות למאגר הדנטלי של AllDent',
      `שם: ${fullName.trim()}`,
      `טלפון: ${phone.trim()}`,
      `תפקיד: ${role}`,
      city.trim() && `אזור/עיר: ${city.trim()}`,
      note.trim() && `הערה: ${note.trim()}`,
    ].filter(Boolean)
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const inputClass =
    'w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 text-[15px] text-[#0F0F10] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]'

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6 py-12"
      dir="rtl"
      style={{ fontFamily: 'Heebo, Assistant, Noto Sans Hebrew, sans-serif' }}
    >
      <div className="w-full rounded-3xl bg-white p-7 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)]" style={{ maxWidth: 460 }}>
        <button
          onClick={() => navigate('/')}
          aria-label="סגירה"
          className="mb-2 mr-auto block text-2xl leading-none text-[#9CA3AF] transition hover:text-[#0F0F10]"
        >
          ×
        </button>

        <h1 className="mb-1 text-2xl font-black text-[#0F0F10]">הצטרפו למאגר הדנטלי של AllDent</h1>
        <p className="mb-6 text-[14px] leading-relaxed text-[#6B6B6B]">
          השאירו פרטים ונעדכן אתכם על משרות שמתאימות לכם — בדיסקרטיות מלאה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input className={inputClass} placeholder="שם מלא *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className={inputClass} placeholder="טלפון *" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ color: role ? '#0F0F10' : '#9CA3AF' }}
          >
            <option value="" disabled>תפקיד *</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} style={{ color: '#0F0F10' }}>{r}</option>
            ))}
          </select>
          <input className={inputClass} placeholder="אזור / עיר" value={city} onChange={(e) => setCity(e.target.value)} />
          <textarea
            className={inputClass}
            placeholder="הערה (אופציונלי)"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-[#008080] py-3.5 text-[15px] font-extrabold text-white transition hover:bg-[#006D6D] active:scale-[0.99]"
          >
            הצטרפות למאגר
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-[#9CA3AF]">
          בלחיצה על "הצטרפות למאגר" הפרטים יישלחו אלינו בוואטאפ. פרטיכם נשמרים בדיסקרטיות.
        </p>
      </div>
    </div>
  )
}
