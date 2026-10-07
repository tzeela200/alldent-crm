/**
 * INC-3151 · רשימת הפרסומים והקורסים. /dental-solutions
 *
 * זהו היעד של «כיתה דנטלית» בתפריט — דף שהיה «בשלבי הקמה» ומתאר את
 * עצמו כאזור תוכן ולמידה. עכשיו יש בו תוכן אמיתי.
 *
 * עיצוב כהה כמו מקטע השירותים בדף הבית שממנו מגיעים, וכל הגדלים
 * מ-publicType.ts.
 */
import { PUBLISHED_SOLUTIONS } from '@/content/dentalSolutions'
import { SolutionCard } from '@/components/dental-solutions/DentalSolutionBody'
import { BackLink } from '@/components/public/BackLink'
import { EYEBROW_LATIN, HERO_H1, LEAD } from '@/lib/publicType'

export default function DentalSolutionsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#1E1E1E] text-white">
      {/* ═══ הירו ═══ */}
      <section className="relative overflow-hidden py-[clamp(48px,7vw,96px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(0,128,128,0.20),transparent_38%),radial-gradient(circle_at_15%_85%,rgba(217,119,6,0.13),transparent_32%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]"
        />

        <div className="relative z-10 mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
          <BackLink to="/">חזרה לדף הבית</BackLink>

          <p className={`mt-7 ${EYEBROW_LATIN} text-[#F0A03C]`} dir="ltr">
            ALLDENT SOLUTIONS
          </p>
          <h1 className={`mt-4 max-w-[18ch] ${HERO_H1}`}>
            שירותים, קורסים ותוכניות
          </h1>
          <p className={`mt-5 max-w-[52ch] ${LEAD} text-white/75`}>
            הכשרות, תוכניות לימוד ושירותים מקצועיים לאנשי הדנטל — מהגופים
            המובילים בענף.
          </p>
        </div>
      </section>

      {/* ═══ הרשימה ═══ */}
      <section className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)] pb-[clamp(56px,8vw,120px)]">
        {PUBLISHED_SOLUTIONS.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-[15px] text-white/60">
            אין כרגע פרסומים פעילים. בקרוב ייפתחו כאן תוכניות והכשרות חדשות.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {PUBLISHED_SOLUTIONS.map((solution) => (
              <SolutionCard key={solution.slug} solution={solution} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
