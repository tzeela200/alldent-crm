import { Link } from 'react-router-dom'
import { PageMediaHero } from '@/components/public/PageMediaHero'
import { MessageCircle, ArrowRight } from 'lucide-react'

export default function EmployersDiscreetPage() {
  return (
    <div className="bg-[#FAFAF7] min-h-screen" dir="rtl">
      <PageMediaHero
        badge="מעסיקים"
        title="גיוס דיסקרטי למרפאות שיניים"
        subtitle="מסלול גיוס שקט וממוקד למרפאות שרוצות לאתר מועמדים מתאימים בלי לחשוף את שם המרפאה בשלב הראשון."
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="גיוס דיסקרטי"
      >
        <a
          href="https://wa.me/972533959003"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D97706] text-white text-[14px] font-bold hover:bg-[#B45309] transition-colors min-h-[44px]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          דברו איתנו בוואטסאפ
        </a>
        <Link
          to="/employers"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0F0F10] text-[14px] font-bold border border-[#D9D9D9] hover:border-[#008080] hover:text-[#008080] transition-colors min-h-[44px]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          חזרה למעסיקים
        </Link>
      </PageMediaHero>
    </div>
  )
}
