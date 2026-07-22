import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

// קבועי העיצוב שנלקחו ישירות מקוד מיתוג המעסיקים שלך
const WHATSAPP_CLASS =
  'inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-[18px] bg-[#D97706] px-7 py-3 text.5 font-bold text-white shadow-[0_12px_24px_rgba(217,119,6,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B45309] hover:shadow-[0_14px_28px_rgba(217,119,6,0.24)]'

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