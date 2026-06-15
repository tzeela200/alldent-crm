import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MessageCircle, Users } from 'lucide-react'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import PublicJobCard from '@/components/public/PublicJobCard'
import PublicJobSkeleton from '@/components/public/PublicJobSkeleton'
import RevealOnScroll from '@/components/public/RevealOnScroll'
import { CareerCategoriesCarousel } from '@/components/home/CareerCategoriesCarousel'

const ROTATING_WORDS = [
  'קריירה דנטלית',
  'גיוס עובדים',
  'קהילה מקצועית',
  'למידה והתפתחות',
  'לוח משרות דנטלי',
]

function TypewriterWords() {
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = ROTATING_WORDS[wordIndex]
    const delay = !deleting && charIndex === current.length ? 1350 : deleting ? 48 : 90

    const timer = window.setTimeout(() => {
      if (!deleting && charIndex < current.length) {
        setCharIndex((value) => value + 1)
        return
      }

      if (!deleting && charIndex === current.length) {
        setDeleting(true)
        return
      }

      if (deleting && charIndex > 0) {
        setCharIndex((value) => value - 1)
        return
      }

      setDeleting(false)
      setWordIndex((value) => (value + 1) % ROTATING_WORDS.length)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [charIndex, deleting, wordIndex])

  return <span>{ROTATING_WORDS[wordIndex].slice(0, charIndex)}</span>
}

function PremiumHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-76px)] overflow-hidden bg-[#1e1e1e] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(0,128,128,0.24),transparent_31%),radial-gradient(circle_at_20%_82%,rgba(217,119,6,0.18),transparent_29%),linear-gradient(135deg,#1e1e1e_0%,#2D2D2D_46%,#171717_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
      <div className="pointer-events-none absolute -left-32 top-8 h-[30rem] w-[30rem] rounded-full bg-[#008080]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#D97706]/14 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl place-items-center px-5 py-20 text-center md:px-8 md:py-28">
        <div className="mx-auto grid max-w-5xl justify-items-center gap-7 md:gap-8">
          <p className="inline-flex rounded-full border border-white/10 bg-white/[0.07] px-5 py-2 text-[13px] font-extrabold tracking-[0.28em] text-[#D97706] backdrop-blur" dir="ltr">
            ALLDENT
          </p>

          <h1 className="max-w-[12ch] text-[clamp(3.25rem,8vw,7.4rem)] font-black leading-[0.95] tracking-[-0.055em] text-white">
            הבית המקצועי של אנשי הדנטל בישראל
          </h1>

          <div
            className="flex min-h-[1.45em] items-center justify-center text-[clamp(1.6rem,3vw,2.7rem)] font-extrabold text-[#8ff5f5]"
            aria-live="polite"
          >
            <span className="border-l-2 border-white/65 pl-2">
              <TypewriterWords />
            </span>
          </div>

          <p className="mx-auto max-w-2xl text-[17px] leading-relaxed text-white/72 md:text-[22px]">
            קריירה, גיוס, קהילה, למידה והתפתחות מקצועית — בפלטפורמה אחת.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 opacity-90">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-[14px] font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <Briefcase className="h-4 w-4" />
              חיפוש משרות
            </Link>
            <Link
              to="/employers"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-[14px] font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <Users className="h-4 w-4" />
              גיוס עובדים
            </Link>
            <a
              href="https://wa.me/972533959003"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[14px] font-bold text-white shadow-[0_18px_45px_-18px_rgba(37,211,102,0.85)] transition hover:bg-[#20bd5a]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 grid -translate-x-1/2 justify-items-center gap-2 text-[12px] text-white/55">
        <span>גללו להמשך</span>
        <span className="h-12 w-px animate-pulse bg-gradient-to-b from-white/70 to-transparent" />
      </div>
    </section>
  )
}

export default function PublicHomePage() {
  const { data: jobs, isLoading } = usePublicJobs({ sort: 'newest' })
  const featuredJobs = jobs?.slice(0, 4) ?? []

  return (
    <div className="bg-white">
      <PremiumHero />

      <CareerCategoriesCarousel />

      <section className="bg-[#F3F4F6] py-18 md:py-24" dir="rtl">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <RevealOnScroll>
            <div className="mb-10 grid gap-4 md:grid-cols-2 md:items-end">
              <div>
                <p className="mb-3 text-[12px] font-extrabold tracking-[0.24em] text-[#008080] uppercase" dir="ltr">
                  Latest Opportunities
                </p>
                <h2 className="text-[#2D2D2D] text-[34px] md:text-[52px] leading-[1.06] font-black tracking-[-0.035em]">
                  משרות חדשות בעולם הדנטל
                </h2>
              </div>
              <div className="flex md:justify-end">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2D2D2D] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#008080]"
                >
                  לכל המשרות
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => <PublicJobSkeleton key={i} />)}
            </div>
          ) : featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.map((job, i) => (
                <RevealOnScroll key={job.job_code} delay={i * 80}>
                  <PublicJobCard job={job} />
                </RevealOnScroll>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-black/10 bg-white py-16 text-center">
              <Briefcase className="mx-auto mb-3 h-12 w-12 text-[#2D2D2D]/30" />
              <p className="text-sm text-[#2D2D2D]/60">משרות חדשות בקרוב</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
