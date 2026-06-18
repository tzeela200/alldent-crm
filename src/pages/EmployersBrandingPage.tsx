import { Link } from 'react-router-dom'
import { PageMediaHero } from '@/components/public/PageMediaHero'
import { MessageCircle, ArrowRight, ClipboardList } from 'lucide-react'

export default function EmployersBrandingPage() {
  return (
    <div className="bg-[#FAFAF7] min-h-screen" dir="rtl">
      <PageMediaHero
        badge="מעסיקים"
        title="מיתוג מעסיקים בעולם הדנטל"
        subtitle="עמוד ותוכן שמציגים את המרפאה, סביבת העבודה, היתרונות והצוות — כדי למשוך מועמדים איכותיים יותר."
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="מיתוג מעסיקים"
      >
        <a
          href="https://wa.me/972533959003"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[20px] bg-[#D97706] text-white text-[14px] font-bold shadow-[6px_6px_12px_rgba(0,0,0,0.12)] hover:bg-[#B45309] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.16)] transition-all duration-200 min-h-[44px]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          דברו איתנו בוואטסאפ
        </a>
        <Link
          to="/employers/recruitment-request"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[20px] bg-[#008080] text-white text-[14px] font-bold shadow-[6px_6px_12px_rgba(0,0,0,0.12)] hover:bg-[#006D6D] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.16)] transition-all duration-200 min-h-[44px]"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          הגישו בקשת גיוס
        </Link>
        <Link
          to="/employers"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[20px] bg-white text-[#0F0F10] text-[14px] font-bold border border-[#D9D9D9] shadow-[6px_6px_12px_rgba(0,0,0,0.10),inset_-6px_-6px_12px_rgba(255,255,255,0.8)] hover:border-[#008080] hover:text-[#008080] hover:shadow-[4px_4px_8px_rgba(0,0,0,0.14),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] transition-all duration-200 min-h-[44px]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          חזרה למעסיקים
        </Link>
      </PageMediaHero>
    </div>
  )
}
