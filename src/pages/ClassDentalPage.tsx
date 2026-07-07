import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

// קבועי העיצוב שנלקחו ישירות מקוד מיתוג המעסיקים שלך
const WHATSAPP_CLASS =
  'inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-[18px] bg-[#D97706] px-7 py-3 text.5 font-bold text-white shadow-[0_12px_24px_rgba(217,119,6,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B45309] hover:shadow-[0_14px_28px_rgba(217,119,6,0.24)]'

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.11 17.38c-.26-.13-1.52-.75-1.76-.84-.24-.09-.41-.13-.59.13-.17.26-.67.84-.82 1.01-.15.17-.3.2-.56.07-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.27-1.52-1.42-1.78-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.59-1.42-.8-1.94-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.52-.62 1.74-1.22.22-.6.22-1.11.15-1.22-.06-.11-.24-.17-.5-.3Z" />
      <path d="M26.68 5.34A14.87 14.87 0 0 0 16.08.95C7.85.95 1.15 7.65 1.15 15.88c0 2.63.69 5.2 2 7.46L1.02 31.1l7.95-2.08a14.9 14.9 0 0 0 7.11 1.81h.01c8.23 0 14.93-6.7 14.93-14.93a14.84 14.84 0 0 0-4.34-10.56Zm-10.6 22.98h-.01a12.4 12.4 0 0 1-6.32-1.73l-.45-.27-4.72 1.24 1.26-4.6-.3-.47a12.38 12.38 0 0 1-1.9-6.61c0-6.86 5.58-12.44 12.45-12.44 3.32 0 6.44 1.29 8.79 3.65a12.36 12.36 0 0 1 3.64 8.8c0 6.86-5.58 12.43-12.44 12.43Z" />
    </svg>
  )
}

const CLASS_HIGHLIGHTS = [
  'אזור תוכן',
  'למידה מקצועית',
  'התפתחות בענף',
]

export default function ClassDentalPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2D2D2D] px-4 py-20 text-white md:px-8 md:py-28">
        {/* הילת רקע טורקיז עדינה */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.16),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-4xl text-start">
            {/* כפתור החזרה המדויק מהקוד שלך - מנווט לדף הבית */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white/58 transition hover:text-white"
            >
              <ArrowRight
                className="h-3.5 w-3.5 rtl:scale-x-[-1]"
                aria-hidden="true"
              />
              חזרה לדף הבית
            </Link>

            <div className="mt-8 text-start">
              {/* תגית עליונה מותאמת בטורקיז */}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-4 py-2 text-[13px] font-bold text-white/82">
                <span className="h-2 w-2 rounded-full bg-[#20D3C2]" />
                AllDent Class
              </span>

              {/* מבנה הכותרת הדו-שורתית */}
              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-[-0.04em] md:text-6xl lg:text-[68px]">
                כיתה דנטלית
                <span className="mt-2 block text-[#7CECEC]">בשלבי הקמה</span>
              </h1>

              {/* פסקת המלל של הכיתה */}
              <p className="mt-6 max-w-2xl text-[17px] leading-[1.85] text-white/78 md:text-[19px]">
                אזור תוכן, למידה והתפתחות מקצועית לאנשי הדנטל. האזור נמצא בשלבי הקמה וייפתח בהמשך.
              </p>

              {/* רשימת היתרונות של הכיתה */}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] font-bold text-white/82">
                {CLASS_HIGHLIGHTS.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7CECEC]" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              {/* כפתור ה-WhatsApp המקורי והמדויק מהעיצוב שלך */}
              <div className="mt-9">
                <a
                  href="https://wa.me/972533951003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={WHATSAPP_CLASS}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  דברו איתנו ב-WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}