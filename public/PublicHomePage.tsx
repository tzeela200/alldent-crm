import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search, ArrowUpLeft, MessageCircle, Sparkles, Users, Briefcase, CheckCircle2,
  Smartphone, GraduationCap, Newspaper, Bell, Heart, Award, Shield, Zap,
  Stethoscope, BookOpen, Play
} from 'lucide-react'
import { usePublicJobs } from '@/hooks/usePublicJobs'
import PublicJobCard from '@/components/public/PublicJobCard'
import PublicJobSkeleton from '@/components/public/PublicJobSkeleton'
import RevealOnScroll from '@/components/public/RevealOnScroll'
import AnimatedCounter from '@/components/public/AnimatedCounter'

const STATS = [
  { value: 1558, label: 'משרות שפורסמו' },
  { value: 18000, label: 'אנשי מקצוע', format: (n: number) => `${(n / 1000).toFixed(0)}K+` },
  { value: 4348, label: 'סייעות במאגר' },
  { value: 2327, label: 'שינניות במאגר' },
]

const FEATURES = [
  { icon: Briefcase, title: 'לוח משרות', body: 'משרות דנטליות אנונימיות מעודכנות בזמן אמת. פילטרים ממוקדים לתפקיד, אזור והיקף.' },
  { icon: Shield, title: 'דיסקרטיות מלאה', body: 'שם המרפאה לא נחשף. פרטי המעסיק מוסתרים. המועמדים מוגנים לחלוטין.' },
  { icon: GraduationCap, title: 'אקדמיה דנטלית', body: 'קורסים, הכשרות וסדנאות מקצועיות לכל תפקיד דנטלי — בקרוב.' },
  { icon: Newspaper, title: 'חדשות וכתבות', body: 'חידושים, מגמות, ראיונות והדרכות — הבית הדיגיטלי של הענף הדנטלי.' },
  { icon: Smartphone, title: 'אפליקציה ייעודית', body: 'מערכת ניהול מועמדים, התראות על משרות ופרופיל מקצועי — בפיתוח.' },
  { icon: Heart, title: 'קהילה מקצועית', body: 'מאגר של אלפי רופאים, סייעות, שינניות וטכנאים — כולם דנטלים, כולם אקטיביים.' },
]

const ROLE_TILES = [
  { name: 'רופאי שיניים', count: '10,189', img: '/images/fallback/dentist.svg' },
  { name: 'סייעות', count: '4,348', img: '/images/fallback/dental-assistant.svg' },
  { name: 'שינניות', count: '2,327', img: '/images/fallback/hygienist.svg' },
  { name: 'טכנאי שיניים', count: '617', img: '/images/fallback/dental-tech.svg' },
  { name: 'מזכירות', count: '719', img: '/images/fallback/receptionist.svg' },
  { name: 'מנהלי מרפאות', count: '781', img: '/images/fallback/clinic-manager.svg' },
]

const ARTICLE_TEASERS = [
  {
    tag: 'חידושים',
    title: 'AI ברפואת שיניים: איך טכנולוגיה משנה את המקצוע ב-2026',
    date: 'בקרוב',
    img: '/images/fallback/dentist.svg',
    color: '#008080',
  },
  {
    tag: 'מדריך',
    title: 'איך לבחור מרפאה? המדריך המלא לרופא/ה צעיר/ה',
    date: 'בקרוב',
    img: '/images/fallback/clinic-manager.svg',
    color: '#D9A928',
  },
  {
    tag: 'אקדמיה',
    title: 'קורס סייעות מתקדמות: השתלות וכירורגיה',
    date: 'בקרוב',
    img: '/images/fallback/dental-assistant.svg',
    color: '#006D6D',
  },
]

export default function PublicHomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [email, setEmail] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const { data: jobs, isLoading } = usePublicJobs({ sort: 'newest' })

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/jobs?q=${encodeURIComponent(q.trim())}` : '/jobs')
  }

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) setSignedUp(true)
  }

  const featuredJobs = jobs?.slice(0, 4) ?? []

  return (
    <div>
      {/* ═════════════════ 1. HERO ═════════════════ */}
      <section className="relative bg-paper overflow-hidden">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-teal-mist opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-gold/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left: text + search */}
            <div className="lg:col-span-7 text-right">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 bg-teal-mist text-teal-deep text-[12px] font-bold px-4 py-2 rounded-full mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span>הבית של הענף הדנטלי בישראל</span>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h1 className="font-display text-ink text-[44px] sm:text-[56px] lg:text-[72px] leading-[1.05] mb-6">
                  פלטפורמת הגיוס,<br />
                  ההשמה <span className="text-teal">והאקדמיה</span><br />
                  לעולם הדנטלי.
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <p className="text-ink/60 text-[16px] md:text-[18px] leading-relaxed max-w-xl mb-7">
                  משרות אנונימיות, אקדמיה מקצועית, חדשות מהענף, ובקרוב — אפליקציה ייעודית לכל איש מקצוע דנטלי.
                </p>
              </RevealOnScroll>

              {/* Checkmark list */}
              <RevealOnScroll delay={280}>
                <div className="grid grid-cols-2 gap-3 mb-7 max-w-md">
                  {['1,500+ משרות פעילות', '18,000+ מקצוענים', 'דיסקרטיות מלאה', 'אפליקציה בקרוב'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[13px] text-ink/75">
                      <CheckCircle2 className="h-4 w-4 text-teal flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </RevealOnScroll>

              {/* Search */}
              <RevealOnScroll delay={360}>
                <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2 max-w-xl mb-6">
                  <div className="flex-1 flex items-center bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm focus-within:border-teal transition-colors">
                    <Search className="h-4 w-4 text-ink/40 mr-4 flex-shrink-0" />
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="חפשו תפקיד, עיר או קוד משרה..."
                      className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-ink/35"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-7 py-3.5 bg-teal text-white text-sm font-bold rounded-2xl hover:bg-teal-deep transition-colors flex items-center justify-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    חיפוש משרות
                  </button>
                </form>
              </RevealOnScroll>

              {/* CTAs */}
              <RevealOnScroll delay={440}>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/jobs"
                    className="flex items-center gap-2 px-5 py-3 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink-2 transition-colors"
                  >
                    <Briefcase className="h-4 w-4" />
                    לכל המשרות
                  </Link>
                  <Link
                    to="/for-clinics"
                    className="flex items-center gap-2 px-5 py-3 bg-white text-ink text-sm font-bold rounded-xl border border-[#E5E7EB] hover:border-teal hover:text-teal transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    מעסיקים — פרסום משרה
                  </Link>
                  <a
                    href="https://wa.me/972533959003"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 text-ink text-sm font-bold hover:text-[#25D366] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    WhatsApp
                  </a>
                </div>
              </RevealOnScroll>
            </div>

            {/* Right: asymmetric photo collage (JobStock style) */}
            <div className="lg:col-span-5 relative">
              <RevealOnScroll delay={400}>
                <div className="relative h-[480px] md:h-[560px]">
                  {/* Background blob */}
                  <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-teal/15 rounded-[60%_40%_50%_50%/40%_50%_50%_60%] -z-0" />
                  <div className="absolute bottom-10 left-10 w-56 h-56 bg-gold/15 rounded-[40%_60%_60%_40%/60%_40%_60%_40%] -z-0" />

                  {/* Photo 1 — top right (large circle) */}
                  <div className="absolute top-0 right-0 w-44 h-44 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-[#E5E7EB]">
                    <img src="/images/fallback/dentist.svg" alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* Photo 2 — top left (rounded rect) */}
                  <div className="absolute top-12 right-1/2 -mr-8 md:right-auto md:left-2 md:top-16 w-40 h-52 md:w-48 md:h-60 rounded-[40px] overflow-hidden shadow-xl ring-1 ring-[#E5E7EB] rotate-[-4deg]">
                    <img src="/images/fallback/dental-assistant.svg" alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* Photo 3 — bottom right (rounded) */}
                  <div className="absolute bottom-0 right-12 w-44 h-56 md:w-52 md:h-64 rounded-[40px] overflow-hidden shadow-xl ring-1 ring-[#E5E7EB] rotate-[3deg]">
                    <img src="/images/fallback/hygienist.svg" alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* Photo 4 — bottom left (circle) */}
                  <div className="absolute bottom-16 -left-2 md:left-12 w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-[#E5E7EB]">
                    <img src="/images/fallback/clinic-manager.svg" alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* Floating badge — stats */}
                  <div className="absolute top-1/2 left-2 md:left-0 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-4 border border-[#E5E7EB] z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-display text-2xl text-ink leading-none">
                          <AnimatedCounter target={1558} format={(n) => n.toLocaleString()} />
                        </p>
                        <p className="text-[11px] text-ink/55 mt-0.5">משרות פעילות</p>
                      </div>
                    </div>
                  </div>

                  {/* Dotted accent */}
                  <div
                    className="absolute -bottom-4 right-0 w-24 h-24 opacity-40"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #D9A928 1.5px, transparent 1.5px)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════ 2. SPLIT SECTION — half light/half dark ═════════════════ */}
      <section className="grid md:grid-cols-2 min-h-[400px]">
        {/* Left — Candidates (dark) */}
        <div className="relative bg-ink text-white p-10 md:p-16 lg:p-20 flex flex-col justify-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #FAFAF7 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <RevealOnScroll>
            <div className="relative max-w-md mr-auto">
              <p className="text-gold text-[11px] font-bold tracking-[0.25em] uppercase mb-4">For candidates</p>
              <h2 className="font-display text-[32px] md:text-[42px] leading-[1.1] mb-5">
                מחפשים עבודה<br />
                <span className="text-teal">בענף הדנטלי?</span>
              </h2>
              <p className="text-white/65 text-[15px] leading-relaxed mb-7">
                גלו משרות אנונימיות מעודכנות, הגישו מועמדות בדיסקרטיות, וקבלו התאמות ממוקדות לפי תפקיד, אזור וניסיון.
              </p>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal text-white text-sm font-bold rounded-xl hover:bg-teal-deep transition-colors"
              >
                לחיפוש משרות
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
          </RevealOnScroll>
        </div>

        {/* Right — Employers (teal) */}
        <div className="relative bg-teal text-white p-10 md:p-16 lg:p-20 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-white/5 rounded-full" />

          <RevealOnScroll delay={100}>
            <div className="relative max-w-md mr-auto">
              <p className="text-gold text-[11px] font-bold tracking-[0.25em] uppercase mb-4">For employers</p>
              <h2 className="font-display text-[32px] md:text-[42px] leading-[1.1] mb-5">
                מרפאה? מעבדה?<br />
                <span className="text-gold">מחפשים עובדים?</span>
              </h2>
              <p className="text-white/80 text-[15px] leading-relaxed mb-7">
                פרסמו משרה אנונימית בלוח הדנטלי הגדול בישראל. AllDent מסננת, מתאימה ומציגה רק מועמדים רלוונטיים.
              </p>
              <Link
                to="/for-clinics"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink-2 transition-colors"
              >
                לפרסום משרה
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═════════════════ 3. STATS ═════════════════ */}
      <section className="bg-paper py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-teal text-[11px] font-bold tracking-[0.3em] uppercase mb-3">The Numbers</p>
              <h2 className="font-display text-ink text-[32px] md:text-[44px] leading-tight">
                קהילת המקצוענים<br className="hidden md:block" />
                <span className="text-teal">הגדולה בענף.</span>
              </h2>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((stat, i) => (
              <RevealOnScroll key={stat.label} delay={i * 80}>
                <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 md:p-8 text-center hover:border-teal hover:shadow-lg transition-all">
                  <p className="font-display text-teal text-[42px] md:text-[56px] leading-none mb-2">
                    <AnimatedCounter target={stat.value} format={stat.format} />
                  </p>
                  <p className="text-ink/65 text-[13.5px] font-medium">{stat.label}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Role tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
            {ROLE_TILES.map((role, i) => (
              <RevealOnScroll key={role.name} delay={i * 60}>
                <div className="group flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-3 hover:border-teal transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-teal-mist flex-shrink-0">
                    <img src={role.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-ink truncate group-hover:text-teal transition-colors">{role.name}</p>
                    <p className="text-[10.5px] font-mono text-ink/45">{role.count}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════ 4. FEATURED JOBS ═════════════════ */}
      <section className="bg-mist py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <RevealOnScroll>
            <div className="grid md:grid-cols-2 gap-4 mb-10 items-end">
              <div>
                <p className="text-teal text-[11px] font-bold tracking-[0.3em] uppercase mb-3">Latest opportunities</p>
                <h2 className="font-display text-ink text-[32px] md:text-[44px] leading-tight">
                  משרות <span className="text-teal">חמות</span> שמחכות לכם.
                </h2>
              </div>
              <div className="flex md:justify-end">
                <Link
                  to="/jobs"
                  className="group inline-flex items-center gap-2 text-ink text-[14px] font-bold border-b-2 border-ink pb-1 hover:gap-4 hover:text-teal hover:border-teal transition-all"
                >
                  לכל המשרות
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => <PublicJobSkeleton key={i} />)}
            </div>
          ) : featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredJobs.map((job, i) => (
                <RevealOnScroll key={job.job_code} delay={i * 80}>
                  <PublicJobCard job={job} />
                </RevealOnScroll>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E7EB]">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-ink/30" />
              <p className="text-sm text-ink/60">משרות חדשות בקרוב</p>
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════ 5. APP COMING SOON (dark teaser) ═════════════════ */}
      <section className="relative bg-ink text-white py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #FAFAF7 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-32 w-[500px] h-[500px] bg-teal/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div>
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 bg-gold/15 text-gold text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
                  <Sparkles className="h-3 w-3" />
                  Coming Soon
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h2 className="font-display text-white text-[36px] md:text-[52px] leading-[1.05] mb-5">
                  אפליקציית<br />
                  <span className="text-teal">AllDent</span><br />
                  בדרך אליכם.
                </h2>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <p className="text-white/65 text-[15px] md:text-[17px] leading-relaxed mb-7 max-w-lg">
                  פרופיל מקצועי, התראות על משרות חדשות, הגשת מועמדות בלחיצה, ניהול קורות חיים, ותקשורת ישירה עם AllDent — מהנייד.
                </p>
              </RevealOnScroll>

              {/* Features list */}
              <RevealOnScroll delay={280}>
                <div className="space-y-3 mb-8">
                  {[
                    { icon: Bell, text: 'התראות חכמות על משרות שמתאימות לך' },
                    { icon: Award, text: 'פרופיל מקצועי + תיק עבודות דיגיטלי' },
                    { icon: Zap, text: 'הגשה מהירה והתאמות אישיות' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-4 w-4 text-gold" />
                      </div>
                      <span className="text-[14px] text-white/85">{item.text}</span>
                    </div>
                  ))}
                </div>
              </RevealOnScroll>

              {/* Email signup */}
              <RevealOnScroll delay={360}>
                {signedUp ? (
                  <div className="bg-teal/15 border border-teal/30 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal flex-shrink-0" />
                    <p className="text-[14px] text-white">תודה! נשלח לך הודעה ברגע שהאפליקציה תעלה לאוויר.</p>
                  </div>
                ) : (
                  <form onSubmit={onSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="האימייל שלך"
                      required
                      dir="ltr"
                      className="flex-1 px-5 py-3.5 text-sm bg-white/10 border border-white/15 rounded-xl outline-none focus:border-teal placeholder:text-white/40 text-white"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3.5 bg-gold text-ink text-sm font-bold rounded-xl hover:bg-gold-warm transition-colors flex items-center justify-center gap-2"
                    >
                      קבלו עדכון
                      <Bell className="h-4 w-4" />
                    </button>
                  </form>
                )}
                <p className="text-[11px] text-white/35 mt-3">לא נשלח ספאם. עדכון אחד בלבד כשהאפליקציה תעלה.</p>
              </RevealOnScroll>
            </div>

            {/* Right: phone mockup */}
            <div className="relative flex justify-center">
              <RevealOnScroll delay={300}>
                <div className="relative">
                  {/* Glow behind phone */}
                  <div className="absolute inset-0 bg-teal/30 blur-3xl rounded-full" />

                  {/* Phone frame */}
                  <div className="relative w-64 md:w-72 aspect-[9/19] bg-ink-3 rounded-[48px] border-[8px] border-ink-2 shadow-2xl overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-ink rounded-full z-10" />
                    {/* Screen content */}
                    <div className="absolute inset-0 bg-gradient-to-b from-teal-deep to-ink p-5 pt-12 flex flex-col">
                      <img src="/images/logo.png" alt="AllDent" className="h-7 w-auto brightness-0 invert mx-auto mb-6" />
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 mb-3">
                        <p className="text-[10px] font-mono text-gold tracking-widest uppercase mb-1">משרה חדשה</p>
                        <p className="text-[13px] font-bold text-white leading-tight">סייעת מנוסה - בני ברק</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 mb-3">
                        <p className="text-[10px] font-mono text-gold tracking-widest uppercase mb-1">התאמה</p>
                        <p className="text-[13px] font-bold text-white leading-tight">98% התאמה - גן יבנה</p>
                      </div>
                      <div className="bg-gold rounded-2xl p-3 mt-auto">
                        <p className="text-[13px] font-bold text-ink text-center">הגישו מועמדות</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-4 -left-4 bg-white text-ink rounded-2xl shadow-xl p-3 hidden md:block">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-teal" />
                      <p className="text-[11px] font-bold">משרה חדשה!</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-gold text-ink rounded-2xl shadow-xl p-3 hidden md:block">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <p className="text-[11px] font-bold">בקרוב ב-2026</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════ 6. ACADEMY & ARTICLES ═════════════════ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <RevealOnScroll>
            <div className="grid md:grid-cols-2 gap-4 mb-10 items-end">
              <div>
                <p className="text-teal text-[11px] font-bold tracking-[0.3em] uppercase mb-3">Academy & insights</p>
                <h2 className="font-display text-ink text-[32px] md:text-[44px] leading-tight">
                  הבית הדיגיטלי<br />
                  <span className="text-teal">של הענף הדנטלי.</span>
                </h2>
              </div>
              <p className="text-ink/60 text-[15px] leading-relaxed md:text-end">
                כתבות, מדריכים, ראיונות, חידושים וקורסים — כל מה שאיש מקצוע דנטלי צריך לדעת.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ARTICLE_TEASERS.map((article, i) => (
              <RevealOnScroll key={article.title} delay={i * 100}>
                <article className="group bg-white rounded-3xl overflow-hidden border border-[#E5E7EB] hover:border-teal hover:-translate-y-1 transition-all duration-500 ease-out-expo h-full flex flex-col cursor-pointer">
                  <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                    <img src={article.img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {/* Coming soon overlay */}
                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                      <div className="text-center">
                        <BookOpen className="h-8 w-8 text-white mx-auto mb-2 opacity-80" />
                        <p className="text-white font-bold text-[15px]">בקרוב</p>
                      </div>
                    </div>
                    {/* Date badge */}
                    <div className="absolute bottom-3 left-3 bg-white text-ink text-[10.5px] font-mono font-bold tracking-[0.1em] px-3 py-1.5 rounded-full uppercase">
                      {article.date}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-[10.5px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: article.color }}>
                      {article.tag}
                    </p>
                    <h3 className="font-bold text-ink text-[17px] leading-[1.3] line-clamp-2 group-hover:text-teal transition-colors mb-auto">
                      {article.title}
                    </h3>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F1F2F4]">
                      <span className="text-[11px] text-ink/45">בקרוב באתר</span>
                      <span className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.15em] text-teal uppercase">
                        קריאה
                        <ArrowUpLeft className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════ 7. FEATURES & PROCESS ═════════════════ */}
      <section className="bg-mist py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <p className="text-teal text-[11px] font-bold tracking-[0.3em] uppercase mb-3">Features & process</p>
              <h2 className="font-display text-ink text-[32px] md:text-[44px] leading-tight">
                למה <span className="text-teal">AllDent?</span>
              </h2>
              <p className="text-ink/60 text-[15px] mt-3 max-w-2xl mx-auto">
                ההבדל הוא בפרטים. פלטפורמה שבנויה רק לענף הדנטלי, על ידי אנשים שמכירים אותו מבפנים.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((item, i) => (
              <RevealOnScroll key={item.title} delay={i * 80}>
                <div className="group bg-white rounded-3xl border border-[#E5E7EB] p-7 hover:border-teal hover:shadow-lg transition-all h-full">
                  <div className="w-12 h-12 rounded-2xl bg-teal-mist flex items-center justify-center mb-5 group-hover:bg-teal transition-colors">
                    <item.icon className="h-5 w-5 text-teal group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-ink text-[18px] mb-3 group-hover:text-teal transition-colors">{item.title}</h3>
                  <p className="text-ink/60 text-[14px] leading-relaxed">{item.body}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════ 8. FINAL CTA (centered teal) ═════════════════ */}
      <section className="relative bg-teal overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full" />

        <div className="relative max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-28 text-center text-white">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6">
              <Stethoscope className="h-3 w-3" />
              Ready?
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={100}>
            <h2 className="font-display text-[40px] md:text-[60px] leading-[1.05] mb-5">
              הצטרפו <span className="text-gold">לבית</span><br />
              של הענף הדנטלי.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <p className="text-white/80 text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto mb-9">
              משרות, אקדמיה, חדשות, קהילה ובקרוב אפליקציה — הכל במקום אחד, בעברית, דנטלי.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={300}>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/jobs"
                className="flex items-center gap-2 px-7 py-3.5 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink-2 transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                לחיפוש משרות
              </Link>
              <Link
                to="/for-clinics"
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-teal text-sm font-bold rounded-xl hover:bg-paper transition-colors"
              >
                <Users className="h-4 w-4" />
                לפרסום משרה
              </Link>
              <a
                href="https://wa.me/972533959003"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-7 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </RevealOnScroll>

          {/* Coming soon stamp */}
          <RevealOnScroll delay={400}>
            <div className="mt-12 flex items-center justify-center gap-2 text-[12px] text-white/60">
              <Play className="h-3 w-3 fill-white/60" />
              <span>אפליקציה ייעודית בקרוב 2026</span>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  )
}
