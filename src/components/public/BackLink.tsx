/**
 * קישור "חזרה" בעמודים הציבוריים.
 *
 * ⚠️ למה כרכיב: ארבעה עמודים כבר כתבו את אותה מרקאפ מילה במילה
 * (EmployersDiscreet, EmployersBranding, ClassDental, DentalShop), ועמודי
 * HOME DENT כתבו גרסה שונה — חץ כתו "→" בגופן mono עם tracking רחב.
 * ההבדל הזה נראה למשתמשת. עכשיו יש מקור אחד.
 *
 * הטוקנים הם של הדפוס הקיים ולא חדשים:
 *   text-[13px] font-bold · אטימות 58% · חץ 3.5 שמתהפך ב-RTL
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function BackLink({
  to,
  children,
  tone = 'dark',
  className = '',
}: {
  to: string
  children: React.ReactNode
  /** dark = על רקע כהה (ברירת מחדל) · light = על רקע בהיר */
  tone?: 'dark' | 'light'
  className?: string
}) {
  const color =
    tone === 'dark'
      ? 'text-white/58 hover:text-white'
      : 'text-ink/58 hover:text-ink'
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 text-[13px] font-bold transition ${color} ${className}`}
    >
      <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" aria-hidden="true" />
      {children}
    </Link>
  )
}
