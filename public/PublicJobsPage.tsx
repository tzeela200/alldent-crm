import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, RefreshCw, Briefcase } from 'lucide-react'
import { usePublicJobs, usePublicJobFilters } from '@/hooks/usePublicJobs'
import type { PublicJobFilters } from '@/services/publicJobsService'
import PublicJobCard from '@/components/public/PublicJobCard'
import PublicJobSkeleton from '@/components/public/PublicJobSkeleton'
import RevealOnScroll from '@/components/public/RevealOnScroll'

const SORT_OPTIONS = [
  { value: 'newest', label: 'החדשות ביותר' },
  { value: 'city', label: 'לפי עיר' },
  { value: 'role', label: 'לפי תפקיד' },
]

export default function PublicJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<PublicJobFilters>({
    search: searchParams.get('q') ?? '',
    sort: 'newest',
  })
  const [searchInput, setSearchInput] = useState(filters.search ?? '')

  const { data: jobs, isLoading, isError, refetch } = usePublicJobs(filters)
  const filterOptions = usePublicJobFilters(jobs)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setFilters((f) => ({ ...f, search: q }))
      setSearchInput(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setFilter = (key: keyof PublicJobFilters, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  const clearFilters = () => {
    setFilters({ sort: 'newest' })
    setSearchInput('')
    setSearchParams({})
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilter('search', searchInput)
  }

  const activeChips: { key: keyof PublicJobFilters; label: string }[] = []
  if (filters.search) activeChips.push({ key: 'search', label: `חיפוש: ${filters.search}` })
  if (filters.role) activeChips.push({ key: 'role', label: filters.role })
  if (filters.region) activeChips.push({ key: 'region', label: filters.region })
  if (filters.city) activeChips.push({ key: 'city', label: filters.city })
  if (filters.scope) activeChips.push({ key: 'scope', label: filters.scope })
  if (filters.experience) activeChips.push({ key: 'experience', label: filters.experience })

  return (
    <div>
      {/* ═════════════════ HERO BAND ═════════════════ */}
      <section className="relative bg-ink text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #FAFAF7 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-teal/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-12 md:pb-16">
          <RevealOnScroll>
            <p className="text-gold text-[11px] font-mono tracking-[0.3em] uppercase mb-4">Dental Jobs Board</p>
            <h1 className="font-display text-[48px] md:text-[88px] leading-[0.95] mb-6 max-w-4xl">
              כל המשרות<br />
              <span className="text-teal italic">הדנטליות.</span>
            </h1>
            <p className="text-white/60 text-[15px] md:text-[17px] leading-relaxed max-w-2xl mb-9">
              משרות אנונימיות ודיסקרטיות במרפאות, מעבדות וחברות דנטליות ברחבי הארץ.
            </p>
          </RevealOnScroll>

          {/* Search bar */}
          <RevealOnScroll delay={150}>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-3xl">
              <div className="flex-1 flex items-center bg-white text-ink rounded-full overflow-hidden shadow-2xl">
                <Search className="h-4 w-4 text-ink/40 mr-5 flex-shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="חיפוש לפי תפקיד, עיר, קוד משרה..."
                  className="flex-1 py-4 text-[15px] bg-transparent outline-none placeholder:text-ink/35"
                />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(''); setFilter('search', '') }} className="px-2 text-ink/40 hover:text-ink">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="submit" className="m-1.5 px-6 py-2.5 bg-gold text-ink text-sm font-black rounded-full hover:bg-gold-warm transition-colors">
                  חיפוש
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-colors ${
                  showFilters
                    ? 'bg-teal text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">פילטרים</span>
                {activeChips.length > 0 && (
                  <span className="bg-gold text-ink text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {activeChips.length}
                  </span>
                )}
              </button>
            </form>
          </RevealOnScroll>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setFilter(chip.key, undefined)}
                  className="group flex items-center gap-1.5 bg-white/10 text-white text-[12px] px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  {chip.label}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
              <button
                onClick={clearFilters}
                className="text-white/50 text-[12px] underline underline-offset-4 hover:text-gold transition-colors"
              >
                נקה הכל
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════ RESULTS ═════════════════ */}
      <section className="bg-paper py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          {/* Filters panel */}
          {showFilters && (
            <div className="bg-white ring-1 ring-rule rounded-3xl p-6 mb-8 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <FilterSelect label="תפקיד" value={filters.role} options={filterOptions.roles} onChange={(v) => setFilter('role', v)} />
                <FilterSelect label="אזור" value={filters.region} options={filterOptions.regions} onChange={(v) => setFilter('region', v)} />
                <FilterSelect label="עיר" value={filters.city} options={filterOptions.cities} onChange={(v) => setFilter('city', v)} />
                <FilterSelect label="היקף משרה" value={filters.scope} options={filterOptions.scopes} onChange={(v) => setFilter('scope', v)} />
                <FilterSelect label="ניסיון" value={filters.experience} options={filterOptions.experiences} onChange={(v) => setFilter('experience', v)} />
              </div>
            </div>
          )}

          {/* Toolbar */}
          {!isLoading && !isError && jobs && (
            <div className="flex items-center justify-between mb-8">
              <p className="text-[13px] font-mono text-ink/50 tracking-wider">
                {jobs.length > 0 ? (
                  <>
                    <span className="text-ink font-bold">{jobs.length}</span> משרות
                  </>
                ) : (
                  ''
                )}
              </p>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-ink/40">מיון:</span>
                <select
                  value={filters.sort ?? 'newest'}
                  onChange={(e) => setFilter('sort', e.target.value as PublicJobFilters['sort'])}
                  className="text-ink font-medium bg-transparent outline-none cursor-pointer underline underline-offset-4"
                >
                  {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <PublicJobSkeleton key={i} />)}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-center py-24">
              <p className="font-display text-[40px] text-ink mb-3">משהו השתבש</p>
              <p className="text-ink/60 text-[14px] mb-6">לא הצלחנו לטעון את המשרות כרגע.</p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-bold rounded-full hover:bg-teal transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                נסה שוב
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && jobs?.length === 0 && (
            <div className="text-center py-24 bg-mist rounded-3xl">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-ink/30" />
              <p className="font-display text-[28px] text-ink mb-2">לא נמצאו משרות מתאימות</p>
              <p className="text-ink/60 text-[14px] mb-6">נסה לשנות את הפילטרים או לחפש מילת מפתח אחרת</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-ink text-white text-sm font-bold rounded-full hover:bg-teal transition-colors"
              >
                נקה פילטרים
              </button>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !isError && jobs && jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, i) => (
                <RevealOnScroll key={job.job_code} delay={Math.min(i, 6) * 60}>
                  <PublicJobCard job={job} />
                </RevealOnScroll>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string | undefined; options: string[]; onChange: (v: string | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-mono tracking-[0.2em] text-ink/45 uppercase">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="text-[14px] text-ink bg-mist border-0 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal/40 cursor-pointer"
      >
        <option value="">הכל</option>
        {options.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  )
}
