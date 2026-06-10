import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, Clock, DollarSign, Calendar, Briefcase, GraduationCap, Award,
  Globe, Share2, ChevronLeft, CheckCircle2, Send, Copy, MessageCircle,
  Facebook, AlertCircle, Loader2, Home as HomeIcon
} from 'lucide-react'
import { usePublicJob, usePublicJobs } from '@/hooks/usePublicJobs'
import { getJobImage, formatPublishDate } from '@/lib/publicJobUtils'
import { normalizePhone } from '@/lib/normalizePhone'
import { supabase } from '@/lib/supabase'
import PublicJobCard from '@/components/public/PublicJobCard'
import RevealOnScroll from '@/components/public/RevealOnScroll'

type SubmitStatus = 'idle' | 'loading' | 'success' | 'duplicate' | 'demo' | 'error'

export default function PublicJobPage() {
  const { jobCode } = useParams<{ jobCode: string }>()
  const navigate = useNavigate()
  const { data: job, isLoading, isError } = usePublicJob(jobCode)
  const { data: allJobs } = usePublicJobs()

  const [showApply, setShowApply] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    cv_link: '',
    consent: false,
  })
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [copied, setCopied] = useState(false)

  if (isLoading) return <JobPageSkeleton />
  if (isError || !job) return <JobNotFound />

  const image = getJobImage(job)
  const shareUrl = `${window.location.origin}/jobs/${job.job_code}`
  const shareText = `${job.job_title} [${job.job_code}]`

  const similarJobs = allJobs
    ?.filter((j) => j.job_code !== job.job_code && (j.job_role === job.job_role || j.region_id === job.region_id))
    .slice(0, 3) ?? []

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.phone || !formData.full_name) return

    setSubmitStatus('loading')
    try {
      const { data, error } = await supabase.rpc('submit_public_application', {
        p_job_code: job.job_code,
        p_full_name: formData.full_name,
        p_phone: formData.phone,
        p_email: formData.email || null,
        p_cv_link: formData.cv_link || null,
        p_consent: true,
        p_source: 'public_website',
      })
      if (error) {
        setSubmitStatus(error.code === 'PGRST202' ? 'demo' : 'error')
        return
      }
      const status = (data as { status: string })?.status
      setSubmitStatus(status === 'duplicate' ? 'duplicate' : 'success')
    } catch {
      setSubmitStatus('error')
    }
    // Use normalized phone (avoid lint warning)
    void normalizePhone(formData.phone)
  }

  // Parse description/requirements into list items if has bullet markers
  const parseList = (text: string | null | undefined): string[] => {
    if (!text) return []
    return text
      .split(/[\n•·▪︎*]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5)
  }

  const responsibilities = parseList(job.job_description)
  const requirements = parseList(job.job_requirements)

  return (
    <div className="bg-paper">
      {/* ═════════════════ HERO BAND (dark teal — Hireox style) ═════════════════ */}
      <section className="relative bg-teal-deep text-white overflow-hidden">
        {/* Background image with teal overlay */}
        <div className="absolute inset-0">
          <img src={image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-teal-deep/70 via-teal-deep/90 to-teal-deep" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #FAFAF7 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <RevealOnScroll>
            <h1 className="font-display text-[36px] md:text-[60px] leading-[1.05] mb-4">
              {job.job_title}
            </h1>
          </RevealOnScroll>

          {/* Breadcrumb */}
          <RevealOnScroll delay={100}>
            <nav className="flex items-center gap-2 text-[13px] text-white/70">
              <Link to="/" className="flex items-center gap-1.5 hover:text-gold transition-colors">
                <HomeIcon className="h-3.5 w-3.5" />
                <span>בית</span>
              </Link>
              <span className="text-white/40">/</span>
              <Link to="/jobs" className="hover:text-gold transition-colors">משרות</Link>
              <span className="text-white/40">/</span>
              <span className="text-gold font-mono">{job.job_code}</span>
            </nav>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═════════════════ MAIN CONTENT ═════════════════ */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16 -mt-12 md:-mt-16 relative z-10">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
          {/* ─── Left: image + content (lg:col-8) ─── */}
          <div className="lg:col-span-8 space-y-8">
            {/* Featured image */}
            <RevealOnScroll>
              <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-mist shadow-xl">
                <img
                  src={image}
                  alt={job.job_title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/images/fallback/default-dental.svg' }}
                />
              </div>
            </RevealOnScroll>

            {/* Job Description */}
            {job.job_description && (
              <RevealOnScroll>
                <section>
                  <h2 className="font-display text-ink text-[24px] md:text-[32px] mb-4">תיאור המשרה</h2>
                  <div className="text-ink/70 text-[15px] md:text-[16px] leading-[1.8] whitespace-pre-line">
                    {job.job_description}
                  </div>
                </section>
              </RevealOnScroll>
            )}

            {/* Responsibilities */}
            {responsibilities.length > 1 && (
              <RevealOnScroll>
                <section>
                  <h2 className="font-display text-ink text-[22px] md:text-[28px] mb-5">תחומי אחריות</h2>
                  <ul className="space-y-3">
                    {responsibilities.slice(0, 6).map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-[14px] md:text-[15px] text-ink/75 leading-relaxed">
                        <CheckCircle2 className="h-5 w-5 text-teal flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </RevealOnScroll>
            )}

            {/* Requirements — Hireox style with icons */}
            {(requirements.length > 0 || job.required_experience_name || job.required_languages) && (
              <RevealOnScroll>
                <section>
                  <h2 className="font-display text-ink text-[22px] md:text-[28px] mb-5">דרישות התפקיד</h2>
                  <dl className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F1F2F4] overflow-hidden">
                    {job.job_role_name && (
                      <RequirementRow icon={Briefcase} label="תפקיד" value={job.job_role_name} />
                    )}
                    {job.scope_name && (
                      <RequirementRow icon={Clock} label="היקף משרה" value={job.scope_name} />
                    )}
                    {job.required_experience_name && (
                      <RequirementRow icon={Award} label="ניסיון" value={job.required_experience_name} />
                    )}
                    {job.required_languages && (
                      <RequirementRow icon={Globe} label="שפות" value={job.required_languages} />
                    )}
                    {requirements.slice(0, 5).map((req, i) => (
                      <RequirementRow key={i} icon={GraduationCap} label={`דרישה ${i + 1}`} value={req} />
                    ))}
                  </dl>
                </section>
              </RevealOnScroll>
            )}

            {/* Discretion */}
            <RevealOnScroll>
              <div className="bg-teal-mist border border-teal/20 rounded-2xl p-5 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-teal text-white flex items-center justify-center flex-shrink-0">
                  🔒
                </div>
                <div>
                  <h3 className="font-bold text-teal-deep text-[14px] mb-1">דיסקרטיות מלאה</h3>
                  <p className="text-ink/65 text-[13px] leading-relaxed">
                    כל המשרות באתר AllDent הן אנונימיות. שם המרפאה, פרטי המעסיק וכתובת מדויקת — ימסרו רק לאחר תיאום אישי.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Share buttons */}
            <RevealOnScroll>
              <section>
                <h3 className="font-bold text-ink text-[14px] mb-3 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-teal" />
                  שיתוף המשרה
                </h3>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white text-[12.5px] font-bold rounded-full hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1877F2] text-white text-[12.5px] font-bold rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-[12.5px] font-bold rounded-full hover:bg-teal transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'הועתק!' : 'העתק קישור'}
                  </button>
                </div>
              </section>
            </RevealOnScroll>
          </div>

          {/* ─── Right: sticky info card (lg:col-4) ─── */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-5">
              {/* Job info card — Hireox style */}
              <RevealOnScroll>
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="bg-ink text-white p-5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-gold uppercase mb-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        משרה אנונימית מאומתת
                      </div>
                      <p className="font-bold text-[14px] truncate">{job.job_role_name ?? 'משרה דנטלית'}</p>
                      {job.scope_name && (
                        <p className="text-[11px] text-white/60">{job.scope_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Info rows */}
                  <dl className="divide-y divide-[#F1F2F4]">
                    {(job.city_name || job.region_name) && (
                      <InfoRow icon={MapPin} label="מיקום" value={[job.city_name, job.region_name].filter(Boolean).join(', ')} />
                    )}
                    {job.scope_name && (
                      <InfoRow icon={Clock} label="היקף משרה" value={job.scope_name} />
                    )}
                    {job.salary_range && (
                      <InfoRow icon={DollarSign} label="שכר" value={job.salary_range} highlight />
                    )}
                    {job.required_experience_name && (
                      <InfoRow icon={Award} label="ניסיון נדרש" value={job.required_experience_name} />
                    )}
                    {job.last_publish_date && (
                      <InfoRow icon={Calendar} label="תאריך פרסום" value={formatPublishDate(job.last_publish_date)} />
                    )}
                  </dl>

                  {/* Apply CTA */}
                  <div className="p-5 bg-paper border-t border-[#F1F2F4]">
                    {submitStatus === 'success' || submitStatus === 'duplicate' || submitStatus === 'demo' ? (
                      <SuccessState status={submitStatus} />
                    ) : (
                      <button
                        onClick={() => setShowApply(true)}
                        className="w-full py-3.5 bg-teal text-white text-sm font-bold rounded-xl hover:bg-teal-deep transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        הגשת מועמדות
                      </button>
                    )}
                  </div>
                </div>
              </RevealOnScroll>

              {/* Quick back */}
              <button
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E5E7EB] text-ink text-[13px] font-bold rounded-xl hover:border-teal hover:text-teal transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                חזרה למשרות
              </button>
            </div>
          </aside>
        </div>
      </section>

      {/* ═════════════════ SIMILAR JOBS ═════════════════ */}
      {similarJobs.length > 0 && (
        <section className="bg-mist py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <RevealOnScroll>
              <div className="mb-10">
                <p className="text-teal text-[11px] font-bold tracking-[0.3em] uppercase mb-3">More opportunities</p>
                <h2 className="font-display text-ink text-[28px] md:text-[40px] leading-tight">
                  משרות דומות <span className="text-teal">שיעניינו אתכם.</span>
                </h2>
              </div>
            </RevealOnScroll>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {similarJobs.map((j, i) => (
                <RevealOnScroll key={j.job_code} delay={i * 80}>
                  <PublicJobCard job={j} />
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═════════════════ MOBILE STICKY BAR ═════════════════ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E5E7EB] p-3 shadow-2xl">
        {submitStatus === 'success' || submitStatus === 'duplicate' ? (
          <p className="text-center text-[13px] font-bold text-teal py-2">✓ נשמר בהצלחה</p>
        ) : (
          <button
            onClick={() => setShowApply(true)}
            className="w-full py-3.5 bg-teal text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            הגישו מועמדות למשרה {job.job_code}
          </button>
        )}
      </div>

      {/* ═════════════════ APPLY MODAL ═════════════════ */}
      {showApply && (
        <ApplyModal
          job={job}
          formData={formData}
          setFormData={setFormData}
          submitStatus={submitStatus}
          onSubmit={handleSubmit}
          onClose={() => setShowApply(false)}
        />
      )}

      {/* Mobile bottom spacing */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}

/* ─── Sub-components ─── */

function InfoRow({
  icon: Icon, label, value, highlight,
}: { icon: typeof MapPin; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon className="h-4 w-4 text-teal mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-mono tracking-[0.18em] uppercase text-ink/45 mb-0.5">{label}</dt>
        <dd className={`text-[14px] font-bold ${highlight ? 'text-gold' : 'text-ink'}`}>{value}</dd>
      </div>
    </div>
  )
}

function RequirementRow({
  icon: Icon, label, value,
}: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 p-4 md:p-5">
      <div className="w-9 h-9 rounded-xl bg-teal-mist flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-teal" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-mono tracking-[0.18em] uppercase text-ink/45 mb-1">{label}</dt>
        <dd className="text-[14px] text-ink leading-relaxed">{value}</dd>
      </div>
    </div>
  )
}

function SuccessState({ status }: { status: SubmitStatus }) {
  const config = {
    success: { icon: CheckCircle2, color: 'text-teal', bg: 'bg-teal-mist', title: 'התקבל בהצלחה!', msg: 'נחזור אליך בהקדם ובדיסקרטיות.' },
    duplicate: { icon: AlertCircle, color: 'text-gold', bg: 'bg-gold/10', title: 'כבר הגשת!', msg: 'הפרטים קיימים אצלנו.' },
    demo: { icon: AlertCircle, color: 'text-gold', bg: 'bg-gold/10', title: 'בקרוב פעיל', msg: 'אנחנו מקימים את המערכת.' },
    idle: { icon: CheckCircle2, color: '', bg: '', title: '', msg: '' },
    loading: { icon: Loader2, color: '', bg: '', title: '', msg: '' },
    error: { icon: AlertCircle, color: '', bg: '', title: '', msg: '' },
  }[status]

  const Icon = config.icon
  return (
    <div className={`${config.bg} rounded-xl p-4 text-center`}>
      <Icon className={`h-8 w-8 ${config.color} mx-auto mb-2`} />
      <p className="font-bold text-ink text-[14px] mb-1">{config.title}</p>
      <p className="text-ink/65 text-[12px]">{config.msg}</p>
    </div>
  )
}

function ApplyModal({
  job, formData, setFormData, submitStatus, onSubmit, onClose,
}: {
  job: { job_code: string; job_title: string }
  formData: { full_name: string; phone: string; email: string; cv_link: string; consent: boolean }
  setFormData: React.Dispatch<React.SetStateAction<{ full_name: string; phone: string; email: string; cv_link: string; consent: boolean }>>
  submitStatus: SubmitStatus
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  const set = (key: keyof typeof formData, val: string) =>
    setFormData((f) => ({ ...f, [key]: val }))

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-ink text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gold text-[10px] font-mono tracking-widest uppercase">הגשת מועמדות</p>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
          </div>
          <h3 className="font-bold text-[16px] line-clamp-2 mb-1">{job.job_title}</h3>
          <p className="text-[11px] font-mono text-teal">{job.job_code}</p>
        </div>

        {/* Body */}
        {submitStatus === 'success' || submitStatus === 'duplicate' || submitStatus === 'demo' ? (
          <div className="p-6">
            <SuccessState status={submitStatus} />
            <button onClick={onClose} className="w-full mt-4 py-3 bg-mist text-ink text-sm font-bold rounded-xl">סגירה</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-5 space-y-3">
            <p className="text-[13px] text-ink/65 mb-4">השאירו פרטים ונחזור אליכם בדיסקרטיות.</p>

            <Field label="שם מלא *">
              <input
                type="text" value={formData.full_name} onChange={(e) => set('full_name', e.target.value)} required
                placeholder="שם פרטי ושם משפחה" className="field-modern"
              />
            </Field>
            <Field label="נייד *">
              <input
                type="tel" value={formData.phone} onChange={(e) => set('phone', e.target.value)} required
                placeholder="05X-XXXXXXX" dir="ltr" className="field-modern text-left"
              />
            </Field>
            <Field label="מייל">
              <input
                type="email" value={formData.email} onChange={(e) => set('email', e.target.value)}
                placeholder="your@email.com" dir="ltr" className="field-modern text-left"
              />
            </Field>
            <Field label="קישור לקורות חיים">
              <input
                type="url" value={formData.cv_link} onChange={(e) => set('cv_link', e.target.value)}
                placeholder="https://drive.google.com/..." dir="ltr" className="field-modern text-left"
              />
            </Field>

            {submitStatus === 'error' && (
              <p className="text-[12px] text-[#DC2626] text-center">לא הצלחנו לשלוח. נסו שוב.</p>
            )}

            <button
              type="submit"
              disabled={!formData.phone || !formData.full_name || submitStatus === 'loading'}
              className="w-full py-3.5 bg-gold text-ink text-sm font-black rounded-xl hover:bg-gold-warm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {submitStatus === 'loading' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> שולח...</>
              ) : (
                <><Send className="h-4 w-4" /> שליחת מועמדות</>
              )}
            </button>
            <p className="text-[10px] text-ink/45 text-center">בלחיצה אני מאשר/ת ל-AllDent ליצור איתי קשר בדיסקרטיות.</p>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-ink/65 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function JobPageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-64 bg-teal-deep" />
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-[16/10] bg-mist rounded-3xl" />
          <div className="h-32 bg-mist rounded-2xl" />
          <div className="h-48 bg-mist rounded-2xl" />
        </div>
        <div className="lg:col-span-4">
          <div className="h-96 bg-mist rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

function JobNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-20">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-teal-mist mx-auto mb-6 flex items-center justify-center text-4xl">🦷</div>
        <h1 className="font-display text-[28px] md:text-[36px] text-ink mb-3">המשרה אינה זמינה</h1>
        <p className="text-ink/60 text-[14px] mb-7">ייתכן שהמשרה הוסרה או שקוד המשרה שגוי.</p>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal text-white text-sm font-bold rounded-xl hover:bg-teal-deep transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          חזרה לכל המשרות
        </Link>
      </div>
    </div>
  )
}
