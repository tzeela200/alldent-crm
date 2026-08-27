/**
 * INC-3130 · HOME DENT — רכיב הרינדור של דף הנכס.
 *
 * ⚠️ קיים כרכיב נפרד בכוונה: גם הדף הציבורי וגם ה-Preview באדמין
 * מרנדרים אותו, מאותו מבנה payload בדיוק. אם היו שני עותקים, ה-Preview
 * היה יכול לשקר — להראות משהו שלא ייצא לאוויר. אפיון §59.
 *
 * הרכיב לא יודע לשלוף כלום. הוא מקבל `page` מוכן: מהתצוגה הציבורית הוא
 * מגיע מ-v_dental_asset_public, ובאדמין מ-preview_dental_asset — אותה
 * פונקציה בונה את שניהם.
 */
import { useMemo, useState } from 'react'
import { BackLink } from '@/components/public/BackLink'
import {
  assetImageUrl,
  submitAssetInquiry,
  type PublicAssetImage,
  type PublicAssetOffer,
  type PublicAssetPage,
} from '@/services/publicDentalAssetsService'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
import { HD_ASSET_TYPE_LABELS, HD_OFFER_LABELS } from '@/lib/homeDentStatuses'

const nis = (n: number) => new Intl.NumberFormat('he-IL').format(n)
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const UNIT_SUFFIX: Record<string, string> = {
  total: '₪',
  per_month: '₪ לחודש',
  per_day: '₪ ליום',
  per_shift: '₪ למשמרת',
}

function Img({ img, className }: { img?: PublicAssetImage; className?: string }) {
  const url = assetImageUrl(img?.path)
  if (!url) {
    return <div className={`bg-gradient-to-br from-[#1a3a3a] to-[#2D2D2D] ${className ?? ''}`} />
  }
  return (
    <img
      src={url}
      alt={img?.alt ?? ''}
      loading="lazy"
      className={`h-full w-full object-cover ${className ?? ''}`}
      style={{
        objectPosition: `${(img?.focal_x ?? 0.5) * 100}% ${(img?.focal_y ?? 0.5) * 100}%`,
      }}
    />
  )
}

function OfferCard({ offer }: { offer: PublicAssetOffer }) {
  const label = HD_OFFER_LABELS[offer.offer_type] ?? offer.offer_type
  const hasPrice = offer.price_amount != null
  return (
    <div className="bg-[#1E1E1E] p-7 md:p-10">
      <span className="font-mono text-[10.5px] tracking-[0.22em] text-[#7CECEC]">{label}</span>

      {hasPrice ? (
        <div className="mt-3.5 text-[clamp(32px,4.4vw,60px)] font-black leading-none tracking-[-0.03em]">
          {nis(Number(offer.price_amount))}
          <small className="ms-2 text-[14px] font-normal tracking-normal text-white/60">
            {UNIT_SUFFIX[offer.price_unit ?? 'total'] ?? '₪'}
          </small>
        </div>
      ) : (
        <div className="mt-3.5 text-[clamp(19px,2.2vw,26px)] font-bold tracking-[-0.02em] text-white/75">
          {offer.price_note || 'מחיר יימסר בפנייה'}
        </div>
      )}

      {hasPrice && offer.price_note && (
        <p className="mt-2 text-[13.5px] text-white/60">{offer.price_note}</p>
      )}

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[14px]">
        {offer.availability_note && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">זמינות</dt>
            <dd className="m-0 text-white/75">{offer.availability_note}</dd>
          </>
        )}
        {offer.available_from && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">מתאריך</dt>
            <dd className="m-0 text-white/75">
              {new Date(offer.available_from).toLocaleDateString('he-IL')}
            </dd>
          </>
        )}
        {!!offer.days?.length && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">ימים</dt>
            <dd className="m-0 text-white/75">
              {offer.days.map((d) => DAYS[d]).join(' · ')}
            </dd>
          </>
        )}
        {offer.hours && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">שעות</dt>
            <dd className="m-0 text-white/75">{offer.hours}</dd>
          </>
        )}
        {!!offer.sale_includes?.length && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">כלול</dt>
            <dd className="m-0 text-white/75">{offer.sale_includes.join(' · ')}</dd>
          </>
        )}
        {offer.extra_costs_note && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">נוסף</dt>
            <dd className="m-0 text-white/75">{offer.extra_costs_note}</dd>
          </>
        )}
        {offer.terms_note && (
          <>
            <dt className="pt-0.5 text-[11.5px] font-black tracking-[0.08em] text-white/60">תנאים</dt>
            <dd className="m-0 text-white/75">{offer.terms_note}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

function LeadForm({
  assetCode,
  offers,
  preview,
}: {
  assetCode: string
  offers: PublicAssetOffer[]
  preview?: boolean
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', offerId: '' })
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setError(null)
    if (preview) {
      setError('זוהי תצוגה מקדימה — הטופס אינו שולח.')
      return
    }
    if (!form.name.trim()) return setError('נא למלא שם.')
    if (!normalizeIlMobile(form.phone)) return setError(IL_MOBILE_ERROR)
    setState('saving')
    try {
      await submitAssetInquiry({
        assetCode,
        offerId: form.offerId || null,
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        message: form.message || null,
      })
      setState('done')
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setError(
        m.includes('duplicate_recent_lead')
          ? 'כבר קיבלנו את הפרטים שלכם. נחזור אליכם בהקדם.'
          : m.includes('lead_phone_is_invalid')
            ? IL_MOBILE_ERROR
            : 'אירעה שגיאה בשליחה. נסו שנית.',
      )
      setState('idle')
    }
  }

  const input =
    'w-full rounded-none border-0 border-b border-white/15 bg-transparent px-0.5 py-3 ' +
    'text-[16px] text-white placeholder:text-white/50 focus:border-[#B45309] focus:outline-none'

  if (state === 'done') {
    return (
      <div className="border border-white/10 p-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.24em] text-[#7CECEC]">התקבל</p>
        <p className="mt-3 text-[18px] font-bold">הפרטים שלכם התקבלו</p>
        <p className="mt-2 text-[15px] text-white/75">נחזור אליכם בהקדם.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 border border-white/10 p-6 sm:grid-cols-2 md:p-8">
      <input className={input} placeholder="שם מלא" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className={input} type="tel" inputMode="tel" placeholder="טלפון נייד" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className={`${input} sm:col-span-2`} type="email" placeholder="אימייל (לא חובה)" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      {offers.length > 1 && (
        <select className={`${input} sm:col-span-2`} value={form.offerId}
          onChange={(e) => setForm({ ...form, offerId: e.target.value })}>
          <option value="" className="bg-[#1E1E1E]">איזה מסלול מעניין אתכם?</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#1E1E1E]">
              {HD_OFFER_LABELS[o.offer_type] ?? o.offer_type}
            </option>
          ))}
        </select>
      )}
      <textarea className={`${input} sm:col-span-2 min-h-[88px] resize-y`} placeholder="הודעה (לא חובה)"
        value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      {error && <p role="alert" className="text-[13.5px] text-[#FCA5A5] sm:col-span-2">{error}</p>}
      <button type="button" disabled={state === 'saving'} onClick={send}
        className="rounded-sm bg-[#B45309] px-8 py-4 text-[14.5px] font-semibold text-white transition-colors duration-500 hover:bg-[#92400E] disabled:opacity-40 sm:col-span-2">
        {state === 'saving' ? 'שולח…' : 'שליחת פרטים'}
      </button>
    </div>
  )
}


export function DentalAssetPageBody({
  page,
  expiresAt,
  preview = false,
}: {
  page: PublicAssetPage
  expiresAt?: string | null
  /** ב-Preview הטופס והקישורים מנוטרלים — זו תצוגה, לא דף חי. */
  preview?: boolean
}) {
  const offers = useMemo(() => page.offers ?? [], [page])
  const images = useMemo(() => page.images ?? [], [page])
  const cover = images[0]
  const gallery = images.slice(1)
  const ctas = (page.ctas ?? []).filter((c) => c.visible !== false)
  const wantsForm = ctas.some((c) => c.type === 'lead_form')

  const loc = page.location ?? {}
  const locationText =
    loc.label ||
    [loc.street && `${loc.street}${loc.street_number ? ` ${loc.street_number}` : ''}`, loc.city, loc.region]
      .filter(Boolean)
      .join(', ')

  return (
    <div dir="rtl" className="bg-[#1E1E1E] text-white">
      {/* ═══ Hero ═══ */}
      <section className="relative flex min-h-[clamp(360px,50vw,600px)] items-end overflow-hidden">
        <div className="absolute inset-0">
          <Img img={cover} />
        </div>
        <div
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,20,19,0.97)_3%,rgba(20,20,19,0.58)_44%,rgba(20,20,19,0.28)_100%)]"
          aria-hidden="true"
        />
        <div className="relative w-full px-[clamp(24px,5vw,72px)] pb-[clamp(30px,4vw,52px)] pt-[clamp(28px,4vw,56px)]">
          <div className="mx-auto max-w-[1280px]">
            <BackLink to="/dental-assets">חזרה ללוח הנכסים</BackLink>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-sm border border-[#B45309]/70 bg-[#D97706]/[0.18] px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] text-[#F0A03C]">
                {page.asset_code}
              </span>
              {page.asset_type && (
                <span className="rounded-sm border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] text-white/75 backdrop-blur">
                  {HD_ASSET_TYPE_LABELS[page.asset_type] ?? page.asset_type}
                </span>
              )}
              {offers.map((o) => (
                <span key={o.id}
                  className="rounded-sm border border-[#7CECEC]/40 bg-[#008080]/[0.22] px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] text-[#7CECEC]">
                  {HD_OFFER_LABELS[o.offer_type] ?? o.offer_type}
                </span>
              ))}
            </div>
            <h1 className="mt-5 max-w-[18ch] text-[clamp(32px,5.6vw,68px)] font-black leading-[1.04] tracking-[-0.03em]">
              {page.title || page.clinic_name || 'נכס דנטלי'}
            </h1>
            {locationText && (
              <p className="mt-4 text-[15.5px] text-white/75">{locationText}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
        {/* ═══ נתוני מפתח ═══ */}
        {!!page.facts?.length && (
          <div className="grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {page.facts.map((f, i) => (
              <div key={f.key}
                className={`px-[clamp(14px,2vw,26px)] py-[clamp(20px,2.6vw,34px)] ${
                  i === 0 ? '' : 'border-white/10 sm:border-s'
                } ${i >= 2 ? 'border-t border-white/10 lg:border-t-0' : ''}`}>
                <span className="text-[11.5px] font-black tracking-[0.08em] text-white/60">{f.label}</span>
                <div className="mt-2 text-[clamp(24px,3vw,40px)] font-black tracking-[-0.03em]">
                  {f.value}
                  {f.unit && <small className="ms-1.5 text-[14px] font-normal tracking-normal text-white/60">{f.unit}</small>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ מסלולי עסקה ═══ */}
        {!!offers.length && (
          <section className="border-b border-white/10 py-[clamp(44px,6vw,88px)]">
            <span className="mb-6 block text-[12px] font-black tracking-[0.08em] text-white/60">
              מסלולי עסקה
            </span>
            <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
              {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
            </div>
          </section>
        )}

        {/* ═══ על הנכס ═══ */}
        {page.description && (
          <section className="border-b border-white/10 py-[clamp(44px,6vw,88px)]">
            <span className="mb-6 block text-[12px] font-black tracking-[0.08em] text-white/60">על הנכס</span>
            {page.subtitle && (
              <h2 className="max-w-[16ch] text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em]">
                {page.subtitle}
              </h2>
            )}
            <p className="mt-6 max-w-[62ch] whitespace-pre-line text-[16.5px] leading-[1.9] text-white/75 text-pretty">
              {page.description}
            </p>
          </section>
        )}

        {/* ═══ גלריה ═══ */}
        {!!gallery.length && (
          <section className="border-b border-white/10 py-[clamp(44px,6vw,88px)]">
            <span className="mb-6 block text-[12px] font-black tracking-[0.08em] text-white/60">גלריה</span>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {gallery.map((g, i) => (
                <figure key={g.path ?? i} className="relative aspect-[4/3] overflow-hidden">
                  <Img img={g} />
                  {g.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[12px] text-white/80">
                      {g.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ═══ ציוד ושירותים ═══ */}
        {page.groups && Object.keys(page.groups).length > 0 && (
          <section className="border-b border-white/10 py-[clamp(44px,6vw,88px)]">
            {Object.entries(page.groups).map(([key, g], i) => (
              <div key={key} className={i === 0 ? '' : 'mt-10'}>
                <span className="mb-4 block text-[12px] font-black tracking-[0.08em] text-white/60">
                  {g.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((item) => (
                    <span key={item}
                      className="rounded-sm border border-white/15 px-4 py-2 text-[13.5px] text-white/75">
                      {item}
                    </span>
                  ))}
                </div>
                {g.note && <p className="mt-3 text-[14px] text-white/60">{g.note}</p>}
              </div>
            ))}
          </section>
        )}

        {/* ═══ יצירת קשר ═══ */}
        <section className="py-[clamp(44px,6vw,88px)]">
          <span className="mb-6 block text-[12px] font-black tracking-[0.08em] text-white/60">
            יצירת קשר
          </span>
          <h2 className="text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em]">
            מעוניינים בנכס?
          </h2>

          {!!ctas.length && (
            <div className="mt-7 flex flex-wrap gap-2.5">
              {ctas
                .filter((c) => c.type !== 'lead_form' && c.desktop !== false)
                .map((c, i) => (
                  <a key={c.id ?? i} href={preview ? undefined : c.target || '#'}
                    target={!preview && c.target?.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-sm px-7 py-3.5 text-[14.5px] font-semibold transition-colors duration-500 ${
                      c.style === 'secondary'
                        ? 'border border-white/15 text-white hover:bg-white hover:text-[#1E1E1E]'
                        : 'bg-[#B45309] text-white hover:bg-[#92400E]'
                    }`}>
                    {c.label}
                  </a>
                ))}
            </div>
          )}

          {wantsForm && (
            <div className="mt-8 max-w-[640px]">
              <LeadForm assetCode={page.asset_code} offers={offers} preview={preview} />
            </div>
          )}

          <p className="mt-8 font-mono text-[10px] tracking-[0.2em] text-white/50">
            פרסום HOME DENT
            {expiresAt &&
              ` · מתפרסם עד ${new Date(expiresAt).toLocaleDateString('he-IL')}`}
          </p>
        </section>
      </div>


      {/* ═══ סרגל CTA דביק במובייל ═══ */}
      {!!ctas.filter((c) => c.type !== 'lead_form' && c.mobile !== false).length && (
        <div className="sticky bottom-0 z-30 flex gap-2 border-t border-white/10 bg-[rgba(20,20,19,0.96)] p-3 backdrop-blur-xl md:hidden">
          {ctas
            .filter((c) => c.type !== 'lead_form' && c.mobile !== false)
            .slice(0, 3)
            .map((c, i) => (
              <a key={c.id ?? i} href={preview ? undefined : c.target || '#'}
                className={`flex-1 rounded-sm px-2 py-3.5 text-center text-[13px] font-semibold ${
                  c.style === 'secondary'
                    ? 'border border-white/15 text-white'
                    : 'bg-[#B45309] text-white'
                }`}>
                {c.label}
              </a>
            ))}
        </div>
      )}
    </div>
  )
}
