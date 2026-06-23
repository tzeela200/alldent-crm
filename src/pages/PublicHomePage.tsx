import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MapPin, MessageCircle, Users } from 'lucide-react'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import type { PublicJob } from '@/services/publicJobsService'
import PublicJobCard from '@/components/public/PublicJobCard'
import PublicJobSkeleton from '@/components/public/PublicJobSkeleton'
import RevealOnScroll from '@/components/public/RevealOnScroll'
import { CareerCategoriesCarousel } from '@/components/home/CareerCategoriesCarousel'

// ─── Typewriter ──────────────────────────────────────────────────────────────

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

// ─── Hero ─────────────────────────────────────────────────────────────────────

function PremiumHero() {
  return (
    <section className="relative isolate flex min-h-[88svh] overflow-hidden bg-[#1a1a1a] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(0,128,128,0.24),transparent_31%),radial-gradient(circle_at_20%_82%,rgba(217,119,6,0.18),transparent_29%),linear-gradient(135deg,#1a1a1a_0%,#2D2D2D_46%,#151515_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
      <div className="pointer-events-none absolute -left-32 top-8 h-[30rem] w-[30rem] rounded-full bg-[#008080]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#D97706]/14 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl place-items-center px-5 py-20 text-center md:px-8 md:py-28">
        <div className="mx-auto grid max-w-5xl justify-items-center gap-8 md:gap-10">
          <img
            src="/images/logo-teal.png"
            alt="AllDent"
            className="h-[48px] w-auto object-contain md:h-[56px]"
          />

          <h1 className="max-w-[12ch] text-[clamp(2.8rem,6vw,5.2rem)] font-black leading-[1.08] tracking-[-0.04em] text-white">
            הבית המקצועי של אנשי הדנטל בישראל
          </h1>

          <div
            className="flex min-h-[1.45em] items-center justify-center text-[clamp(1.35rem,2.5vw,2.15rem)] font-extrabold text-[#8ff5f5]"
            aria-live="polite"
          >
            <span className="border-l-2 border-white/65 pl-2">
              <TypewriterWords />
            </span>
          </div>

          <p className="mx-auto max-w-3xl text-[17px] leading-[1.75] text-white/80 md:text-[22px]">
            קריירה, גיוס, קהילה, למידה והתפתחות מקצועית — בפלטפורמה אחת.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-[14px] font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <Briefcase className="h-4 w-4" />
              חיפוש משרות
            </Link>
            <Link
              to="/employers"
              className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
            >
              <Users className="h-4 w-4" />
              גיוס עובדים
            </Link>
            <a
              href="https://wa.me/972533959003"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_28px_-14px_rgba(37,211,102,0.65)] transition hover:bg-[#20bd5a]"
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

// ─── Properties data (homepage teaser — 4 mock items) ─────────────────────────

const PROPERTIES = [
  {
    id: 'p1',
    index: '01',
    title: 'מרפאה פעילה בבאר שבע',
    location: 'באר שבע',
    type: 'קליניקה פעילה',
    description: 'מרפאה פעילה עם מספר חדרי טיפול, ציוד קיים ואפשרות להמשך פעילות מיידי.',
    highlights: ['5 חדרי טיפול', 'ציוד מלא', 'מטופלים פעילים'],
    image: '/images/properties/property-1.jpg',
  },
  {
    id: 'p2',
    index: '02',
    title: 'מעבדה דנטלית במרכז',
    location: 'אזור המרכז',
    type: 'מעבדה דנטלית',
    description: 'נכס מקצועי המיועד לפעילות מעבדה דנטלית עם תשתית קיימת.',
    highlights: ['אזור מרכזי', 'תשתית קיימת', 'מתאים להמשך פעילות'],
    image: '/images/properties/property-2.jpg',
  },
]

// ─── Properties Showcase — Stack Scroll Reveal ───────────────────────────────

function PropertiesShowcase() {
  const [imgError, setImgError] = useState<Record<string, boolean>>({})

  return (
    <section className="props-section relative isolate overflow-hidden bg-[#1e1e1e] py-20 text-white md:py-28" dir="rtl">
      <div className="pointer-events-none absolute -right-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#008080]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#D97706]/8 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        {/* Header */}
        <RevealOnScroll>
          <div className="mb-16 text-center">
            <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-5 py-2 text-[12px] font-extrabold tracking-[0.28em] text-[#D97706] backdrop-blur" dir="ltr">
              HOME DENT
            </p>
            <h2 className="text-[40px] font-black tracking-[-0.04em] text-white md:text-[56px]">
              נכסים דנטליים
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-9 text-white/65 md:text-lg">
              מרפאות, מעבדות והזדמנויות עסקיות בעולם הדנטל — מכירה, השכרה, שותפויות והעברת פעילות.
            </p>
          </div>
        </RevealOnScroll>

        {/* Card stack */}
        <div className="flex flex-col gap-6 md:gap-8">
          {PROPERTIES.map((item, i) => (
            <RevealOnScroll key={item.id} delay={i * 120}>
              <div className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#232323] shadow-2xl md:grid md:grid-cols-[1.1fr_1fr]">

                {/* Image */}
                <div className="relative h-[300px] min-h-[260px] md:h-full">
                  {!imgError[item.id] ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={() => setImgError((e) => ({ ...e, [item.id]: true }))}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#1a3a3a] to-[#2D2D2D]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-l from-[#232323]/60 via-transparent to-transparent md:block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#232323]/80 via-transparent to-transparent md:hidden" />
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center px-8 py-8 md:py-10">
                  <span className="inline-flex w-fit rounded-full bg-[#008080]/15 px-3 py-1 text-[11px] font-extrabold tracking-widest text-[#8ff5f5]">
                    {item.type}
                  </span>
                  <div className="mt-2 flex items-center gap-1.5 text-[14px] text-white/70">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.location}</span>
                  </div>
                  <h3 className="mt-1 text-[22px] font-black tracking-tight text-white md:text-[28px]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-white/60">
                    {item.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.highlights.map((h) => (
                      <span key={h} className="rounded-full bg-white/[0.08] px-3 py-1 text-[12px] text-white/65">
                        {h}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/dental-assets"
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#008080] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#006D6D]"
                  >
                    לצפייה בנכס ←
                  </Link>
                  <span className="mt-auto pt-6 font-mono text-[11px] text-white/20">{item.index}</span>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Bottom CTA */}
        <RevealOnScroll>
          <div className="mt-14 text-center">
            <Link
              to="/dental-assets"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-white/15"
            >
              לכל הנכסים הדנטליים
            </Link>
          </div>
        </RevealOnScroll>
      </div>

      <style>{`
        .props-section .reveal {
          transform: translateY(52px) scale(0.97);
        }
        .props-section .reveal.in-view {
          transform: translateY(0) scale(1);
        }
      `}</style>
    </section>
  )
}

// ─── Ecosystem mock data ──────────────────────────────────────────────────────

const ECOSYSTEM = [
  { id: 'labs',       index: '01', label: 'מעבדות דנטליות',   name: 'Dental Lab Pro',    tagline: 'שירותי מעבדה בפריסה ארצית למרפאות, מומחים ומעבדות.' },
  { id: 'supply',     index: '02', label: 'ציוד וחומרים',      name: 'Dental Supply',     tagline: 'פתרונות לציוד וחומרים דנטליים לכל סוגי המרפאות.' },
  { id: 'media',      index: '03', label: 'שיווק ומדיה',       name: 'Clinic Media',      tagline: 'צילום, וידאו ותוכן מקצועי למרפאות ועסקים דנטליים.' },
  { id: 'software',   index: '04', label: 'תוכנות וטכנולוגיה', name: 'Medical Software',  tagline: 'פלטפורמות דיגיטליות לניהול מרפאה ושיפור חווית המטופל.' },
  { id: 'consulting', index: '05', label: 'ייעוץ וליווי',      name: 'Dental Consulting', tagline: 'ייעוץ אסטרטגי ותפעולי למרפאות ולעסקים בענף הדנטלי.' },
  { id: 'finance',    index: '06', label: 'מימון וביטוח',      name: 'Finance Dental',    tagline: 'פתרונות עסקיים, מימון וביטוח מקצועי לרפואת שיניים.' },
]

// ─── Ecosystem Showcase ───────────────────────────────────────────────────────

function EcosystemShowcase() {
  const [activeId, setActiveId] = useState(ECOSYSTEM[0].id)
  const [fadeKey, setFadeKey] = useState(0)

  const active = ECOSYSTEM.find((e) => e.id === activeId)!

  function handleActivate(id: string) {
    if (id === activeId) return
    setActiveId(id)
    setFadeKey((k) => k + 1)
  }

  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#1b1b1b] py-24 text-white" dir="rtl">
      <div className="pointer-events-none absolute -right-40 top-10 h-[32rem] w-[32rem] rounded-full bg-[#008080]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-10 h-[28rem] w-[28rem] rounded-full bg-[#D97706]/7 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <RevealOnScroll>
          <div className="mb-16 text-center">
            <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-5 py-2 text-[12px] font-extrabold tracking-[0.28em] text-[#008080] backdrop-blur" dir="ltr">
              ALLDENT ECOSYSTEM
            </p>
            <h2 className="text-[34px] font-black tracking-[-0.035em] text-white md:text-[44px]">
              שירותים ופתרונות לעולם הדנטל
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-relaxed text-white/55">
              מרפאות, מעבדות, חברות, ספקי ציוד ונותני שירות הפועלים בענף הדנטלי.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid items-stretch gap-6 md:grid-cols-[1.8fr_1fr]">
          {/* Spotlight panel */}
          <div className="overflow-hidden rounded-2xl bg-[#242424]">
            <div className="relative overflow-hidden" style={{ height: '340px' }}>
              <div
                key={`eco-img-${fadeKey}`}
                className="h-full w-full bg-gradient-to-br from-[#1a3a3a] to-[#2D2D2D]"
                style={{ animation: 'ecosystemFadeIn 0.45s ease forwards' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#242424]/95 via-[#242424]/20 to-transparent" />
            </div>

            <div
              key={`eco-content-${fadeKey}`}
              className="px-7 py-6"
              style={{ animation: 'ecosystemFadeIn 0.45s ease forwards' }}
              dir="rtl"
            >
              <span className="inline-flex rounded-full bg-[#008080]/20 px-3 py-1 text-[11px] font-extrabold tracking-widest text-[#008080]">
                {active.label}
              </span>
              <h3 className="mt-3 text-[26px] font-black tracking-tight text-white">
                {active.name}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                {active.tagline}
              </p>
              <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#008080] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#006D6D]">
                לפרטים נוספים ←
              </button>
            </div>
          </div>

          {/* Category list */}
          <div className="flex flex-col justify-center gap-1">
            {ECOSYSTEM.map((item) => {
              const isActive = item.id === activeId
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => handleActivate(item.id)}
                  onClick={() => handleActivate(item.id)}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-r-2 px-5 py-4 transition-all duration-200 ${
                    isActive
                      ? 'border-[#008080] bg-white/[0.06]'
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="w-7 shrink-0 font-mono text-[12px] text-[#008080]/60">
                    {item.index}
                  </span>
                  <span className={`text-[15px] font-bold transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/45'}`}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <RevealOnScroll>
          <div className="mt-14 text-center">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]">
              לכל השירותים והפתרונות
            </button>
          </div>
        </RevealOnScroll>
      </div>

      <style>{`
        @keyframes ecosystemFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

// ─── Role-based job picker ────────────────────────────────────────────────────

const ROLE_KEYWORDS = ['רופא', 'מומח', 'שינ', 'סייע', 'מזכיר', 'ניהול', 'טכנא']

function pickOnePerRole(jobs: PublicJob[] | undefined): PublicJob[] {
  const seen = new Set<string>()
  const out: PublicJob[] = []
  for (const job of jobs ?? []) {
    const key = ROLE_KEYWORDS.find((k) => (job.job_title ?? '').includes(k)) ?? '__other__'
    if (!seen.has(key)) {
      seen.add(key)
      out.push(job)
    }
    if (out.length === 6) break
  }
  return out
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicHomePage() {
  const { data: jobs, isLoading } = usePublicJobs({ sort: 'newest' })
  const featuredJobs = pickOnePerRole(jobs)

  return (
    <div className="bg-white">
      <PremiumHero />

      <CareerCategoriesCarousel />

      {/* Jobs section */}
      <section className="bg-[#F3F4F6] py-20 md:py-28" dir="rtl">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <RevealOnScroll>
            <div className="mb-14 grid gap-4 md:grid-cols-2 md:items-end">
              <div>
                <p className="mb-3 text-[12px] font-extrabold tracking-[0.24em] text-[#008080] uppercase" dir="ltr">
                  Latest Opportunities
                </p>
                <h2 className="text-[#2D2D2D] text-[34px] md:text-[44px] leading-[1.12] font-black tracking-[-0.035em]">
                  משרות חדשות בעולם הדנטל
                </h2>
              </div>
              <div className="flex md:justify-end">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
                >
                  לכל המשרות
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <PublicJobSkeleton key={i} />)}
            </div>
          ) : featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.map((job, i) => (
                <RevealOnScroll key={job.job_code} delay={i * 110}>
                  <PublicJobCard job={job} index={i} />
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

      <PropertiesShowcase />
      <EcosystemShowcase />
    </div>
  )
}
