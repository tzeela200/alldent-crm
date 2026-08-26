/**
 * INC-3130 · HOME DENT — עמוד השירות. /dental-assets/terms
 *
 * שתי בחירות בלבד: תקופת פרסום, וטיפול בפניות. סוגי העסקה נבחרים רק
 * בטופס, ולכן כששירות המיון נבחר מוצגים שני תנאי ההצלחה יחד (החלטה 1).
 *
 * העיצוב ממשיך את לוח הנכסים: הירו כהה עם אותם gradients ורשת נקודות,
 * וגוף בהיר. הטיפוגרפיה היא Heebo 900 עם tracking -0.03em — הערכים של
 * .font-display ב-index.css. אין כאן סריף.
 *
 * המלל כולו ב-src/content/homeDentTerms.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackLink } from '@/components/public/BackLink'
import {
  HD_CONSENT_LABEL,
  HD_FAQ,
  HD_FLOW,
  HD_HERO,
  HD_PACKAGES,
  HD_SCREENING,
  HD_SUCCESS_FEES,
  HD_SUCCESS_FEE_NOTE,
  HD_TERMS_VERSION,
} from '@/content/homeDentTerms'

const nis = (n: number) => new Intl.NumberFormat('he-IL').format(n)
const pad2 = (n: number) => String(n).padStart(2, '0')

/* ── חשיפה בגלילה. תוכן אינו תלוי באנימציה: אם ה-observer לא נורה,
      סריקה חוזרת חושפת כל מה שנמצא במסך. ── */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const show = (el: HTMLElement) => el.setAttribute('data-reveal', 'in')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target as HTMLElement)
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const sweep = () =>
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight * 0.96 && r.bottom > -40) show(el)
      })
    const t = window.setInterval(sweep, 1200)
    window.addEventListener('focus', sweep)
    return () => {
      io.disconnect()
      window.clearInterval(t)
      window.removeEventListener('focus', sweep)
    }
  }, [])
}

const REVEAL =
  'data-[reveal=out]:opacity-0 data-[reveal=out]:translate-y-6 ' +
  'transition-[opacity,transform] duration-700 ease-out-expo motion-reduce:transition-none ' +
  'motion-reduce:opacity-100 motion-reduce:translate-y-0'

function Option({
  checked,
  onSelect,
  tag,
  title,
  price,
  body,
}: {
  checked: boolean
  onSelect: () => void
  tag: string
  title?: string
  price?: number
  body: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      /* ⚠️ הרקע חייב להיות בענף אחד בלבד. קודם היה כאן `bg-paper` בבסיס
         ו-`bg-ink` בענף הנבחר — שתי מחלקות רקע על אותו אלמנט, ו-Tailwind
         מכריע ביניהן לפי הסדר בגיליון הסגנונות ולא לפי סדר המחרוזת.
         התוצאה: הכרטיס הנבחר קיבל רקע בהיר יחד עם `text-paper` הבהיר,
         והטקסט נעלם. */
      className={`relative flex flex-col gap-3 p-7 text-right transition-colors duration-500 ease-out-expo md:p-11 ${
        checked ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-[rgba(15,15,16,0.03)]'
      }`}
    >
      <span className="flex items-center justify-between gap-4">
        {/* התקופה היא הסיבה להפרש המחיר — לכן היא בכתום ובגודל קריא,
            ולא תווית זעירה באפור. */}
        <span
          className={`text-[clamp(15px,1.5vw,18px)] font-black tracking-[-0.01em] ${
            checked ? 'text-[#F0A03C]' : 'text-[#B45309]'
          }`}
        >
          {tag}
        </span>
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-all duration-500 ${
            checked
              ? 'border-[#B45309] bg-[#B45309] shadow-[0_0_0_5px_rgba(217,119,6,0.22)]'
              : 'border-ink/25'
          }`}
        />
      </span>

      {price !== undefined ? (
        <span className="text-[clamp(40px,6.4vw,92px)] font-black leading-[0.9] tracking-[-0.03em]">
          {nis(price)}
          <sup
            className={`ms-1.5 align-super text-[15px] font-normal tracking-normal ${
              checked ? 'text-white/70' : 'text-ink/70'
            }`}
          >
            ₪ + מע״מ
          </sup>
        </span>
      ) : (
        <span className="text-[clamp(23px,3vw,40px)] font-black leading-none tracking-[-0.03em]">
          {title}
        </span>
      )}

      {/* בלי max-w — המידה הצרה שברה את המשפט באמצע ביטוי.
          text-balance מחלק את השורות בנקודה טבעית. */}
      <p
        className={`text-[15.5px] leading-[1.8] text-balance ${
          checked ? 'text-white/80' : 'text-ink/75'
        }`}
      >
        {body}
      </p>
    </button>
  )
}

export default function DentalAssetTermsPage() {
  const navigate = useNavigate()
  useReveal()

  const [days, setDays] = useState<60 | 90 | null>(null)
  const [screening, setScreening] = useState<boolean | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  /* הסרגל נעלם ברגע שכפתור "המשך לטופס" על המסך — אחרת נראים שני
     כפתורי המשך זה ליד זה.
     ⚠️ בכוונה בדיקת מיקום ב-scroll ולא IntersectionObserver: קריאות של
     IO נמסרות רק כשהדפדפן מבצע rendering steps, ובלשונית שאינה מצוירת
     (או ממוזערת) הן לא נמסרות והסרגל היה נתקע במצב אחד. */
  const gateRef = useRef<HTMLButtonElement | null>(null)
  const [gateVisible, setGateVisible] = useState(false)
  useEffect(() => {
    const check = () => {
      const el = gateRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setGateVisible(r.top < window.innerHeight && r.bottom > 0)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  const price = useMemo(
    () => HD_PACKAGES.find((p) => p.days === days)?.price ?? null,
    [days],
  )
  const ready = days !== null && screening !== null
  const canContinue = ready && consent

  const missing = [
    { ok: days !== null, label: 'תקופת פרסום' },
    { ok: screening !== null, label: 'טיפול בפניות' },
    { ok: consent, label: 'אישור תנאים' },
  ]

  function handleContinue() {
    if (!canContinue) {
      setError(true)
      return
    }
    /* הבחירות עוברות ב-state. ה-URL נושא גיבוי לרענון, אבל מועד האישור
       לא נשלח מכאן — השרת כותב now() בעצמו (החלטה 2). */
    navigate(
      `/dental-assets/terms/request?plan=${days}&screening=${screening ? 'yes' : 'no'}`,
      {
        state: {
          packageDays: days,
          screening,
          termsVersion: HD_TERMS_VERSION,
          termsAccepted: true,
        },
      },
    )
  }

  return (
    <div dir="rtl" className="bg-paper text-ink">
      {/* ═══ הירו — ה-DNA של לוח הנכסים ═══ */}
      <section className="relative overflow-hidden bg-[#1E1E1E] py-[clamp(72px,10vw,116px)] text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(0,128,128,0.22),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(217,119,6,0.14),transparent_30%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto flex max-w-[880px] flex-col items-center gap-6 px-7 text-center">
          <BackLink to="/dental-assets" className="self-start">
            חזרה ללוח הנכסים
          </BackLink>
          <p
            className="text-[12px] font-black tracking-[0.08em] text-[#D97706]"
            dir="ltr"
          >
            {HD_HERO.eyebrow}
          </p>
          <h1 className="text-[clamp(38px,7vw,88px)] font-black leading-[1.02] tracking-[-0.03em]">
            {HD_HERO.lineA}
            <span className="mt-1 block text-[#F0A03C]">{HD_HERO.lineB}</span>
          </h1>
          <p className="max-w-[34em] text-[clamp(16px,1.5vw,20px)] leading-[1.85] text-white/70 text-pretty">
            {HD_HERO.lead}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a
              href="#choose"
              className="rounded-sm bg-[#B45309] px-8 py-4 text-[14.5px] font-semibold text-white transition-colors duration-500 hover:bg-[#92400E]"
            >
              בחירת מסלול
            </a>
            <a
              href="#flow"
              className="rounded-sm border border-white/15 px-8 py-4 text-[14.5px] font-semibold text-white transition-colors duration-500 hover:bg-white hover:text-ink"
            >
              איך זה עובד
            </a>
          </div>
        </div>
      </section>

      {/* ═══ הבחירות ═══ */}
      <section id="choose" className="py-[clamp(64px,9vw,140px)]">
        <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
          <p data-reveal="out" className={`text-[12px] font-black tracking-[0.08em] text-[#B45309] ${REVEAL}`}>
            01 — תקופת פרסום · בחירה נדרשת
          </p>
          <h2
            data-reveal="out"
            className={`mt-5 max-w-[16ch] text-[clamp(25px,4.8vw,68px)] font-black leading-[1.02] tracking-[-0.03em] ${REVEAL}`}
          >
            כמה זמן הנכס יפורסם?
          </h2>
          <p
            data-reveal="out"
            className={`mt-5 max-w-[34ch] text-[clamp(16px,1.5vw,20px)] leading-[1.8] text-ink/72 text-pretty ${REVEAL}`}
          >
            התקופה נספרת מהיום שהנכס עולה לאוויר, לא מהיום שמילאתם את הטופס.
          </p>

          <p className="mt-[clamp(30px,3.6vw,52px)] text-[12px] font-black tracking-[0.08em] text-[#B45309] transition-opacity duration-500" style={{ opacity: days === null ? 1 : 0 }}>
            ↓ בחרו אחת מהשתיים
          </p>

          <div
            role="radiogroup"
            aria-required="true"
            aria-label="תקופת פרסום — בחירה נדרשת"
            className="mt-4 grid gap-px border border-rule bg-rule md:grid-cols-2"
          >
            {HD_PACKAGES.map((p) => (
              <Option
                key={p.days}
                checked={days === p.days}
                onSelect={() => setDays(p.days)}
                tag={p.label}
                price={p.price}
                body={p.body}
              />
            ))}
          </div>

          <div className="mt-[clamp(64px,9vw,132px)]">
            <p data-reveal="out" className={`text-[12px] font-black tracking-[0.08em] text-[#B45309] ${REVEAL}`}>
              02 — טיפול בפניות · בחירה נדרשת
            </p>
            <h2
              data-reveal="out"
              className={`mt-5 max-w-[14ch] text-[clamp(25px,4.8vw,68px)] font-black leading-[1.02] tracking-[-0.03em] ${REVEAL}`}
            >
              מי מטפל בפונים?
            </h2>

            <p className="mt-[clamp(30px,3.6vw,52px)] text-[12px] font-black tracking-[0.08em] text-[#B45309] transition-opacity duration-500" style={{ opacity: screening === null ? 1 : 0 }}>
              ↓ בחרו אחת מהשתיים
            </p>

            <div
              role="radiogroup"
              aria-required="true"
              aria-label="טיפול בפניות — בחירה נדרשת"
              className="mt-4 grid gap-px border border-rule bg-rule md:grid-cols-2"
            >
              {HD_SCREENING.map((s) => (
                <Option
                  key={s.key}
                  checked={screening === (s.key === 'yes')}
                  onSelect={() => setScreening(s.key === 'yes')}
                  tag={s.tag}
                  title={s.title}
                  body={s.body}
                />
              ))}
            </div>

            {/* תנאי ההצלחה — שניהם יחד, בלי לבקש סוג עסקה (החלטה 1) */}
            {screening === true && (
              <dl className="mt-8 grid gap-y-2 border-t border-rule pt-8 sm:grid-cols-[auto_1fr] sm:gap-x-14">
                {HD_SUCCESS_FEES.map((f) => (
                  <div key={f.key} className="contents">
                    <dt className="pt-2 text-[12px] font-black tracking-[0.08em] text-ink/60">
                      {f.label}
                    </dt>
                    <dd className="border-b border-rule/50 pb-2 text-[16px] text-ink/72 last:border-0">
                      <b className="font-black tracking-[-0.02em] text-ink">{f.value}</b>
                      {f.suffix ? ` ${f.suffix}` : ''} — במקרה של הצלחה
                    </dd>
                  </div>
                ))}
                <p className="mt-4 max-w-[56ch] text-[13px] leading-[1.7] text-ink/60 sm:col-span-2">
                  {HD_SUCCESS_FEE_NOTE}
                </p>
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* ═══ התהליך ═══ */}
      <section id="flow" className="bg-[#1E1E1E] py-[clamp(56px,7vw,104px)] text-white">
        <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
          <p className="text-[12px] font-black tracking-[0.08em] text-[#F0A03C]">03 — התהליך</p>
          <h2 className="mt-5 max-w-[15ch] text-[clamp(25px,4.8vw,68px)] font-black leading-[1.02] tracking-[-0.03em]">
            חמישה שלבים עד שהנכס באוויר
          </h2>
          <div className="mt-[clamp(36px,4.5vw,64px)] border-t border-white/10">
            {HD_FLOW.map((step, i) => (
              <div
                key={step.title}
                className="grid items-baseline gap-4 border-b border-white/10 py-[clamp(24px,3vw,44px)] md:grid-cols-[clamp(60px,7vw,110px)_1fr_minmax(0,44ch)] md:gap-[clamp(20px,4vw,56px)]"
              >
                <span className="text-[clamp(26px,3.4vw,50px)] font-black leading-none tracking-[-0.03em] text-white/40">
                  {pad2(i + 1)}
                </span>
                <h3 className="text-[clamp(19px,2.3vw,32px)] font-black leading-[1.1] tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="text-[15.5px] leading-[1.8] text-white/75 text-pretty">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ שאלות נפוצות ═══ */}
      <section className="py-[clamp(64px,9vw,140px)]">
        <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
          <p className="text-[12px] font-black tracking-[0.08em] text-[#B45309]">04 — שאלות נפוצות</p>
          <div className="mt-[clamp(28px,3.4vw,48px)] border-t border-rule">
            {HD_FAQ.map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q} className="border-b border-rule">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-6 py-[clamp(20px,2.4vw,32px)] text-right transition-opacity duration-500 hover:opacity-50"
                  >
                    <h3 className="text-[clamp(17px,1.7vw,22px)] font-bold leading-[1.3] tracking-[-0.02em]">
                      {item.q}
                    </h3>
                    <span className="relative h-3.5 w-3.5 shrink-0" aria-hidden="true">
                      <span className="absolute inset-x-0 top-1/2 h-px bg-ink" />
                      <span
                        className={`absolute inset-x-0 top-1/2 h-px bg-ink transition-transform duration-500 ease-out-expo ${
                          open ? 'rotate-0' : 'rotate-90'
                        }`}
                      />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-500 ease-out-expo ${
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[62ch] pb-[clamp(22px,2.4vw,34px)] text-[15.5px] leading-[1.85] text-ink/72 text-balance">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ שער ההסכמה ═══ */}
      <section id="gate" className="pb-[clamp(56px,7vw,96px)]">
        <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
          <div className="relative overflow-hidden rounded-[22px] bg-[#1E1E1E] text-white">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(217,119,6,0.20),transparent_44%),radial-gradient(circle_at_8%_90%,rgba(0,128,128,0.14),transparent_36%)]"
              aria-hidden="true"
            />
            <div className="relative grid items-end gap-[clamp(32px,5vw,88px)] p-[clamp(30px,4.5vw,52px)] lg:grid-cols-[1fr_minmax(0,420px)]">
              <div>
                <p className="text-[12px] font-black tracking-[0.08em] text-[#F0A03C]">05 — מתחילים</p>
                <h2 className="mt-5 max-w-[11ch] text-[clamp(25px,4.8vw,68px)] font-black leading-[1.02] tracking-[-0.03em]">
                  מוכנים להתחיל?
                </h2>
                <p className="mt-5 max-w-[40ch] text-[clamp(16px,1.5vw,20px)] leading-[1.8] text-white/75 text-pretty">
                  השלב הבא הוא טופס אחד — פרטי הנכס, סוגי העסקה ותמונות. אפשר לחזור ולתקן.
                </p>
                <div className="mt-8 border-t border-white/10">
                  {missing.map((m, i) => (
                    <div
                      key={m.label}
                      className={`flex items-center gap-3.5 border-b border-white/10 py-3.5 text-[14px] transition-colors duration-500 ${
                        m.ok ? 'text-[#6EE7B7]' : 'text-white/60'
                      }`}
                    >
                      <span className="font-mono text-[11px] tracking-[0.1em]">{pad2(i + 1)}</span>
                      {m.label}
                      <span className="ms-auto">{m.ok ? '✓' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className={`flex cursor-pointer items-start gap-3.5 rounded-sm border p-5 transition-colors duration-500 ${
                    error && !consent
                      ? 'border-[#F87171] bg-[rgba(220,38,38,0.14)]'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked)
                      if (e.target.checked) setError(false)
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#B45309]"
                  />
                  <span className="text-[13.5px] leading-[1.7] text-white/75">
                    {HD_CONSENT_LABEL}
                  </span>
                </label>

                {error && (
                  <p role="alert" className="mt-3 text-[13px] text-[#FCA5A5]">
                    {ready
                      ? 'יש לאשר את תנאי השירות לפני המעבר לטופס.'
                      : 'יש להשלים את שתי הבחירות ולאשר את התנאים.'}
                  </p>
                )}

                <button
                  ref={gateRef}
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="mt-5 w-full rounded-sm bg-[#B45309] px-8 py-4 text-[14.5px] font-semibold text-white transition-colors duration-500 hover:bg-[#92400E] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  המשך לטופס
                </button>

                <p className="mt-4 text-center text-[13px] font-semibold text-white/70">
                  מועד האישור נרשם בשרת
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ סרגל סיכום — עולה אחרי הבחירה הראשונה ═══ */}
      <div
        /* ⚠️ translate-y-full לבדו לא מספיק: בסוף המסמך הסרגל כבר אינו
           "תקוע" לתחתית החלון, וההזזה בגובה עצמו משאירה אותו חלקית במסך.
           opacity-0 + pointer-events-none מבטיחים היעלמות בכל מצב גלילה. */
        className={`sticky bottom-0 z-30 border-t border-white/10 bg-[rgba(30,30,30,0.94)] text-white backdrop-blur-xl transition-[transform,opacity] duration-700 ease-out-expo ${
          (days !== null || screening !== null) && !gateVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-full opacity-0'
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-[clamp(20px,3vw,44px)] gap-y-3 px-[clamp(24px,5vw,72px)] py-4">
          <div className="flex flex-1 flex-wrap gap-x-[clamp(20px,3vw,44px)] gap-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] font-black tracking-[0.08em] text-white/60">תקופה</span>
              <span className={days ? 'text-[19px] font-bold tracking-[-0.02em]' : 'text-[15px] text-white/60'}>
                {days ? `${days} יום` : 'לא נבחרה'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] font-black tracking-[0.08em] text-white/60">מחיר</span>
              <span className={price ? 'text-[19px] font-bold tracking-[-0.02em]' : 'text-[15px] text-white/60'}>
                {price ? `${nis(price)} ₪` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] font-black tracking-[0.08em] text-white/60">פניות</span>
              <span className={screening !== null ? 'text-[19px] font-bold tracking-[-0.02em]' : 'text-[15px] text-white/60'}>
                {screening === null ? 'לא נבחר' : screening ? 'AllDent' : 'ישירות'}
              </span>
            </div>
          </div>
          {/* כפתור אחד בלבד: כשהשער כבר על המסך הסרגל נעלם, אחרת היו
              נראים שני כפתורי "המשך" זה ליד זה שעושים דברים שונים. */}
          <button
            type="button"
            onClick={() => {
              if (canContinue) return handleContinue()
              document
                .querySelector(ready ? '#gate' : '#choose')
                ?.scrollIntoView({ behavior: 'smooth', block: ready ? 'center' : 'start' })
            }}
            className="rounded-sm bg-[#B45309] px-6 py-3 text-[13.5px] font-semibold text-white transition-colors duration-500 hover:bg-[#92400E]"
          >
            {canContinue ? 'המשך לטופס' : ready ? 'לאישור התנאים' : 'בחירת מסלול'}
          </button>
        </div>
      </div>
    </div>
  )
}
