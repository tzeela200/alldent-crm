import { Link } from 'react-router-dom'
import { PageMediaHero } from '@/components/public/PageMediaHero'
import { MessageCircle, Users, Briefcase } from 'lucide-react'

const CARDS = [
  {
    to: '/employers/discreet',
    icon: Briefcase,
    title: 'גיוס דיסקרטי',
    body: 'מסלול גיוס שקט וממוקד למרפאות שרוצות לאתר מועמדים מתאימים בלי לחשוף את שם המרפאה בשלב הראשון.',
    cta: 'קראו עוד',
  },
  {
    to: '/employers/branding',
    icon: Users,
    title: 'מיתוג מעסיקים',
    body: 'עמוד ותוכן שמציגים את המרפאה, סביבת העבודה, היתרונות והצוות — כדי למשוך מועמדים איכותיים יותר.',
    cta: 'קראו עוד',
  },
]

export default function EmployersPage() {
  return (
    <div className="bg-[#FAFAF7] min-h-screen" dir="rtl">
      <PageMediaHero
        badge="מעסיקים"
        title="גיוס עובדים לעולם הדנטל"
        subtitle="פתרונות גיוס למרפאות שיניים, רשתות, מעבדות וחברות דנטליות — מפרסום משרה ועד חיבור למועמדים מתאימים."
        image="/images/page-heroes/jobs-board.jpg"
        imageAlt="גיוס עובדים AllDent"
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
      </PageMediaHero>

      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CARDS.map(({ to, icon: Icon, title, body, cta }) => (
            <Link
              key={to}
              to={to}
              className="group bg-white rounded-[24px] border border-[#E0E0E0] p-8 md:p-10 hover:border-[#008080] hover:shadow-[0_8px_32px_rgba(0,128,128,0.08)] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 flex items-center justify-center mb-5 group-hover:bg-[#008080] transition-colors">
                <Icon className="h-5 w-5 text-[#008080] group-hover:text-white transition-colors" aria-hidden="true" />
              </div>
              <h2 className="text-[22px] font-black text-[#0F0F10] mb-3 group-hover:text-[#008080] transition-colors">{title}</h2>
              <p className="text-[15px] text-[#6B6B6B] leading-relaxed mb-6">{body}</p>
              <span className="inline-flex items-center text-[13px] font-bold text-[#008080] border-b border-[#008080] pb-0.5 group-hover:gap-2 transition-all">
                {cta}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
