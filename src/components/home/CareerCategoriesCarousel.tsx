import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ROLES } from '@/lib/roles'

const AUTOPLAY_MS = 3500

export function CareerCategoriesCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion) return
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % ROLES.length)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, reducedMotion])

  const visibleRoles = useMemo(() => {
    const total = ROLES.length
    return ROLES.map((role, index) => {
      let distance = index - active
      if (distance > total / 2) distance -= total
      if (distance < -total / 2) distance += total
      return { role, index, distance }
    }).sort((a, b) => a.distance - b.distance)
  }, [active])

  const goPrev = () => setActive((current) => (current - 1 + ROLES.length) % ROLES.length)
  const goNext = () => setActive((current) => (current + 1) % ROLES.length)

  return (
    <section className="bg-white py-20 md:py-28 overflow-hidden" dir="rtl">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[#D97706] text-[12px] font-extrabold tracking-[0.24em] uppercase" dir="ltr">
            Career Categories
          </p>
          <h2 className="mt-3 text-[#2D2D2D] text-[34px] md:text-[52px] leading-[1.06] font-black tracking-[-0.035em]">
            בחרו את התחום שלכם
          </h2>
          <p className="mt-4 text-[#2D2D2D]/60 text-[15px] md:text-[17px] leading-relaxed">
            משרות לפי מקצוע, עם חוויית דפדוף ויזואלית שמבליטה בכל רגע תחום אחר בעולם הדנטל.
          </p>
        </div>
      </div>

      <div
        className="relative mt-12 md:mt-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative mx-auto h-[420px] max-w-[1500px] overflow-hidden md:h-[560px]">
          {visibleRoles.map(({ role, index, distance }) => {
            const abs = Math.abs(distance)
            const isActive = index === active
            const x = distance * -310
            const scale = isActive ? 1 : Math.max(0.72, 0.9 - abs * 0.08)
            const opacity = abs > 3 ? 0 : isActive ? 1 : Math.max(0.28, 0.68 - abs * 0.12)
            const blur = abs > 1 ? Math.min(3, abs * 0.8) : 0
            const zIndex = 20 - abs

            return (
              <Link
                key={role.slug}
                to={`/jobs?role=${role.slug}`}
                aria-label={`משרות ל${role.label}`}
                className="group absolute left-1/2 top-0 block w-[72vw] max-w-[330px] -translate-x-1/2 transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[46vw] md:max-w-[380px]"
                style={{
                  transform: `translateX(calc(-50% + ${x}px)) scale(${scale})`,
                  opacity,
                  filter: blur ? `blur(${blur}px)` : 'none',
                  zIndex,
                  pointerEvents: abs > 2 ? 'none' : 'auto',
                }}
              >
                <article className="relative h-[390px] overflow-hidden rounded-[32px] bg-[#111] shadow-[0_32px_90px_-42px_rgba(0,0,0,0.75)] md:h-[520px]">
                  <img
                    src={role.image}
                    alt={role.label}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-8">
                    <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-bold text-white/80 backdrop-blur">
                      {role.longTitle}
                    </p>
                    <h3 className="text-[31px] font-black leading-[1.05] tracking-[-0.02em] md:text-[44px]">
                      {role.label}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-white/72 md:text-[15px]">
                      {role.description}
                    </p>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl items-center justify-center gap-3 px-5 md:px-8">
          <button
            type="button"
            onClick={goPrev}
            aria-label="הקודם"
            className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white text-[#2D2D2D] shadow-sm transition-all hover:bg-[#2D2D2D] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008080]"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 px-2">
            {ROLES.map((role, i) => (
              <button
                key={role.slug}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`עבור לכרטיס ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-8 bg-[#2D2D2D]' : 'w-2 bg-black/15 hover:bg-black/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label="הבא"
            className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white text-[#2D2D2D] shadow-sm transition-all hover:bg-[#2D2D2D] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008080]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
