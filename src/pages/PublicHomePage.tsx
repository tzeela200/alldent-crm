import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Briefcase, GraduationCap, MapPin, Users, Wrench } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
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

const HERO_HIGHLIGHTS = [
  { icon: Award, label: 'משרות וגיוס איכותי', tone: '#8ff5f5' },
  { icon: Users, label: 'קהילה מקצועית', tone: '#e4c394' },
  { icon: Wrench, label: 'כלים מתקדמים', tone: '#8ff5f5' },
  { icon: GraduationCap, label: 'תוכן וידע מקצועי', tone: '#e4c394' },
]

function PremiumHero() {
  return (
    <section
      className="home-hero relative isolate overflow-hidden bg-[#0b0d0c] text-white"
      dir="rtl"
      aria-labelledby="home-hero-title"
    >
      {/* רקע גרפיט חם */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_46%,rgba(0,128,128,0.14),transparent_30%),radial-gradient(circle_at_94%_84%,rgba(181,116,58,0.22),transparent_30%),radial-gradient(circle_at_94%_8%,rgba(201,150,82,0.08),transparent_22%),linear-gradient(112deg,#080a09_0%,#0b0d0c_44%,#10100f_72%,#0c0c0b_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.14)_0.7px,transparent_0.7px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* קשתות חום–טורקיז מאחורי התמונה */}
      <div className="pointer-events-none absolute bottom-[-210px] left-[-80px] hidden h-[640px] w-[760px] rounded-[50%] border border-[#d9a35f]/55 lg:block" />
      <div className="pointer-events-none absolute bottom-[-235px] left-[-25px] hidden h-[660px] w-[790px] rounded-[50%] border border-[#00a7a0]/42 lg:block" />
      <div className="pointer-events-none absolute bottom-[-255px] left-[30px] hidden h-[680px] w-[820px] rounded-[50%] border border-white/8 lg:block" />

      {/* תמונת הצוות – משולבת ברקע ללא מסגרת */}
      <div className="hero-photo pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] lg:block">
        <img
          src="/images/home/alldent-hero-team.webp"
          alt="ארבעה אנשי מקצוע מעולם הדנטל"
          loading="eager"
          decoding="async"
          className="hero-photo-img h-full w-full object-cover object-[48%_50%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0b0d0c]/90" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b0d0c] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[610px] w-full max-w-[1640px] flex-col items-center px-5 pb-0 pt-10 md:px-8 lg:min-h-[640px] lg:flex-row lg:py-12 lg:pl-10 lg:pr-4 xl:pl-14 xl:pr-6">
        {/* תוכן – ללא שינוי במלל, בקישורים או באפקט ההקלדה */}
        <div className="hero-copy z-20 w-full text-center lg:ml-auto lg:w-[48%] lg:text-right xl:w-[46%]">
          <p className="hero-anim hero-d1 mb-5 inline-flex items-center gap-2.5 text-[12px] font-extrabold tracking-[0.22em] text-[#e4c394]">
            <span className="h-px w-7 bg-[#e4c394]/70" />
            פלטפורמת הדנטל המובילה בישראל
          </p>

          <h1
            id="home-hero-title"
            className="hero-anim hero-d2 mx-auto max-w-[13ch] text-[clamp(2.55rem,6.1vw,5rem)] font-black leading-[1.04] [text-wrap:balance] text-white lg:mx-0"
          >
            הבית המקצועי של אנשי הדנטל בישראל
          </h1>

          <div
            className="hero-anim hero-d3 mt-6 flex min-h-[1.5em] items-center justify-center gap-3 text-[clamp(1.3rem,2.4vw,2.05rem)] font-extrabold text-[#42cbc6] lg:justify-start"
            aria-live="polite"
          >
            <span className="h-[1.1em] w-[3px] shrink-0 rounded-full bg-[#e4c394]" />
            <TypewriterWords />
          </div>

          <p className="hero-anim hero-d4 mx-auto mt-6 max-w-xl text-[17px] leading-[1.8] text-white/76 md:text-[19px] lg:mx-0">
            קריירה, גיוס, קהילה, למידה והתפתחות מקצועית — הכול בפלטפורמה אחת לאנשי הדנטל בישראל.
          </p>

          <div className="hero-anim hero-d5 mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              to="/jobs"
              className="group inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#008080] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_20px_46px_-20px_rgba(0,128,128,0.95)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#006D6D] hover:shadow-[0_24px_52px_-20px_rgba(0,128,128,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ff5f5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0c]"
            >
              <Briefcase className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-y-0.5" />
              חיפוש משרות
            </Link>

            <Link
              to="/employers"
              className="group inline-flex min-h-[52px] items-center gap-2 rounded-full bg-gradient-to-l from-[#d9b37b] to-[#e7c79a] px-7 py-3.5 text-[15px] font-bold text-[#241c10] shadow-[0_20px_46px_-22px_rgba(217,179,123,0.9)] transition duration-300 hover:-translate-y-0.5 hover:from-[#e2be86] hover:to-[#f0d3a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c394] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0c]"
            >
              <Users className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-105" />
              גיוס עובדים
            </Link>

            <a
              href="https://wa.me/972533951003"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-[52px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3.5 text-[15px] font-bold text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#25D366]/45 hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0c]"
            >
              <WhatsAppIcon className="h-[18px] w-[18px] text-[#25D366] transition-transform duration-300 group-hover:scale-105" />
              WhatsApp
            </a>
          </div>

          <ul className="hero-anim hero-d6 mx-auto mt-9 grid max-w-xl grid-cols-2 border-t border-white/10 pt-6 sm:grid-cols-4 lg:mx-0">
            {HERO_HIGHLIGHTS.map(({ icon: Icon, label, tone }, index) => (
              <li
                key={label}
                className={`flex min-h-[76px] flex-col items-center justify-center gap-2 px-3 text-center ${
                  index < HERO_HIGHLIGHTS.length - 1 ? 'sm:border-l sm:border-white/10' : ''
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" style={{ color: tone }} />
                <span className="text-[13px] font-semibold leading-tight text-white/85">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* גרסת מובייל של התמונה */}
        <div className="hero-mobile-photo relative mt-8 h-[320px] w-full overflow-hidden lg:hidden">
          <img
            src="/images/home/alldent-hero-team.webp"
            alt="ארבעה אנשי מקצוע מעולם הדנטל"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-[48%_50%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d0c]/20 via-transparent to-[#0b0d0c]" />
        </div>
      </div>

      {/* מעבר קמור ועדין לאזור הבא */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-30 h-[54px] overflow-hidden md:h-[72px]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <path
            d="M0,82 C360,62 1080,62 1440,82 L1440,100 L0,100 Z"
            fill="#ffffff"
          />
          <path
            d="M0,82 C360,62 1080,62 1440,82"
            fill="none"
            stroke="#c99652"
            strokeOpacity="0.62"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <style>{`
        .home-hero ::selection {
          background: rgba(0, 128, 128, 0.55);
          color: #fff;
        }

        .home-hero .hero-photo-img {
          -webkit-mask-image:
            linear-gradient(to right, #000 0%, #000 67%, rgba(0,0,0,0.72) 81%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, #000 8%, #000 90%, transparent 100%);
          mask-image:
            linear-gradient(to right, #000 0%, #000 67%, rgba(0,0,0,0.72) 81%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, #000 8%, #000 90%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
          filter: saturate(0.96) contrast(1.04);
          animation: heroKen 18s ease-in-out infinite alternate;
          transform-origin: 38% 58%;
        }

        .home-hero .hero-photo {
          animation: heroPhotoIn 1.05s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .home-hero .hero-anim {
          animation: heroUp 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .home-hero .hero-d1 { animation-delay: 0.05s; }
        .home-hero .hero-d2 { animation-delay: 0.16s; }
        .home-hero .hero-d3 { animation-delay: 0.30s; }
        .home-hero .hero-d4 { animation-delay: 0.42s; }
        .home-hero .hero-d5 { animation-delay: 0.54s; }
        .home-hero .hero-d6 { animation-delay: 0.66s; }

        @keyframes heroUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes heroPhotoIn {
          from { opacity: 0; transform: scale(1.025); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes heroKen {
          from { transform: scale(1); }
          to { transform: scale(1.035); }
        }

        @media (max-width: 1023px) {
          .home-hero .hero-mobile-photo img {
            -webkit-mask-image: linear-gradient(
              to bottom,
              transparent 0%,
              #000 10%,
              #000 80%,
              transparent 100%
            );
            mask-image: linear-gradient(
              to bottom,
              transparent 0%,
              #000 10%,
              #000 80%,
              transparent 100%
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-hero .hero-photo,
          .home-hero .hero-anim,
          .home-hero .hero-photo-img {
            animation: none !important;
          }
        }
      `}</style>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicHomePage() {
  const { data: jobs, isLoading } = usePublicJobs({ sort: 'newest' })
  // המשרות החמות = הכי עדכניות לפי זמן פרסום, החדשה ביותר ראשונה.
  const featuredJobs = [...(jobs ?? [])]
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, 6)

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