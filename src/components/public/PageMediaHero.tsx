import type { ReactNode } from 'react'

type PageMediaHeroProps = {
  title: string
  subtitle?: string
  badge?: string
  image: string
  imageAlt: string
  status?: 'active' | 'coming-soon'
  children?: ReactNode
}

export function PageMediaHero({
  title,
  subtitle,
  badge,
  image,
  imageAlt,
  status,
  children,
}: PageMediaHeroProps) {
  return (
    <section className="bg-[#FAFAF7] pt-6 pb-10 md:pt-10 md:pb-16 px-4 md:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto">

        {/* תמונה */}
        <div className="w-full rounded-[24px] md:rounded-[32px] overflow-hidden bg-[#1e1e1e] border border-[#E0E0E0] shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
          <img
            src={image}
            alt={imageAlt}
            className="w-full aspect-[16/9] object-contain block"
            loading="eager"
          />
        </div>

        {/* טקסט מתחת לתמונה */}
        <div className="mt-6 md:mt-8 text-right">
          <div className="flex flex-wrap items-center gap-2 justify-end mb-3">
            {badge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold tracking-wide bg-[#008080]/10 text-[#008080]">
                {badge}
              </span>
            )}
            {status === 'coming-soon' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold tracking-wide bg-[#D97706]/10 text-[#D97706]">
                בקרוב
              </span>
            )}
          </div>

          <h1 className="text-[28px] md:text-[40px] font-black text-[#0F0F10] leading-[1.1] tracking-[-0.02em] mb-3">
            {title}
          </h1>

          {subtitle && (
            <p className="text-[15px] md:text-[17px] text-[#6B6B6B] leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}

          {children && (
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
