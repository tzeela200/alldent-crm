/**
 * INC-3130 · HOME DENT — טופס בקשת פרסום. /dental-assets/terms/request
 *
 * שבעה שלבים. השדות בשלב 4 נבנים לפי סוגי העסקה שנבחרו בשלב 2.
 *
 * שער כניסה (החלטה 3): מי שמגיע לכאן בלי בחירות תקינות ואישור תנאים
 * מוחזר ל-/dental-assets/terms. Funnel אחד, בלי מסלול עוקף וברירת מחדל
 * שקטה — נכס בלי תקופת פרסום הוא חריג שהמערכת לא אמורה לייצר.
 *
 * הטופס אוסף חומר גלם בלבד. אין בו בחירת חשיפה, בחירת תמונות לפרסום
 * או בחירת פרטי קשר — אלה החלטות של האדמין (§24).
 */
import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
import { useDentalAssetOptions } from '@/hooks/useDentalAssetOptions'
import {
  submitDentalAsset,
  newSubmissionToken,
  validateHdImage,
  HD_MAX_IMAGES,
  type HdOfferInput,
} from '@/hooks/useDentalAssetSubmission'
import {
  HD_ASSET_TYPES,
  HD_AVAILABILITY,
  HD_CLINIC_TYPES,
  HD_LOCATION_TYPES,
  HD_OFFER_TYPES,
  HD_OPTION_GROUPS,
  HD_SHIFTS,
  HD_WEEKDAYS,
  hdErrorToHebrew,
  type HdOfferType,
  type HdOptionGroup,
} from '@/lib/homeDentOptions'

const STEPS = [
  'פרטי הנכס',
  'סוגי העסקה',
  'ציוד ומאפיינים',
  'מחיר וזמינות',
  'תמונות',
  'פרטי הקשר שלך',
  'סיכום ושליחה',
] as const

const pad2 = (n: number) => String(n).padStart(2, '0')
const nis = (n: number) => new Intl.NumberFormat('he-IL').format(n)
const clean = (v: string) => v.trim() || null
const num = (v: string) => (v.trim() === '' ? null : Number(v))

/* ── שדות ── */
const INPUT =
  'w-full border-0 border-b border-rule bg-transparent px-0.5 py-3 text-[16.5px] ' +
  'transition-colors duration-300 placeholder:text-ink/25 placeholder: ' +
  'hover:border-ink/25 focus:border-[#D97706] focus:outline-none rounded-none'

function Field({
  label,
  required,
  hint,
  wide,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <label className="text-[13px] font-medium text-ink/72">
        {label}
        {required && <span className="text-[#D97706]"> *</span>}
      </label>
      {children}
      {hint && <span className="text-[12px] text-ink/60">{hint}</span>}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-[clamp(34px,4vw,56px)] border-t border-rule pt-[clamp(22px,2.6vw,34px)] first:mt-0 first:border-0 first:pt-0">
      <span className="mb-5 block text-[12px] font-black tracking-[0.08em] text-ink/60">{label}</span>
      {children}
    </div>
  )
}

/** רשת צ׳קבוקסים בשלוש עמודות — לא ענן כדורים. */
function CheckGrid({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ id: number; name: string }>
  selected: number[]
  onToggle: (id: number) => void
}) {
  return (
    <div className="grid gap-x-[clamp(20px,3vw,44px)] sm:grid-cols-2 lg:grid-cols-3">
      {options.map((o) => {
        const on = selected.includes(o.id)
        return (
          <label
            key={o.id}
            className={`grid cursor-pointer select-none grid-cols-[auto_1fr] items-center gap-3.5 border-b border-rule/50 py-3 text-[15px] leading-[1.35] transition-colors duration-300 ${
              on ? 'font-normal text-ink' : ' text-ink/72 hover:text-ink'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(o.id)}
              className="peer sr-only"
            />
            <span
              className={`relative h-4 w-4 shrink-0 rounded-[1px] border transition-all duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
                on ? 'border-[#D97706]' : 'border-ink/25'
              }`}
            >
              <span
                className={`absolute inset-[3px] bg-[#D97706] transition-transform duration-300 ${
                  on ? 'scale-100' : 'scale-0'
                }`}
              />
            </span>
            <span>{o.name}</span>
          </label>
        )
      })}
    </div>
  )
}

type OfferDraft = Record<string, string | number[]>

export default function DentalAssetRequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { data: options, isLoading: optionsLoading, error: optionsError } =
    useDentalAssetOptions()

  /* ── שער הכניסה ── */
  const choice = (location.state ?? null) as {
    packageDays?: number
    screening?: boolean
    termsVersion?: string
    termsAccepted?: boolean
  } | null
  const planParam = Number(params.get('plan'))
  const packageDays = (choice?.packageDays ?? planParam) as 60 | 90
  const screening = choice?.screening ?? params.get('screening') === 'yes'
  const termsVersion = choice?.termsVersion ?? ''
  const gateOk =
    choice?.termsAccepted === true && (packageDays === 60 || packageDays === 90)

  const [token] = useState(newSubmissionToken)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  /* ── מצב הטופס ── */
  const [f, setF] = useState<Record<string, string>>({})
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }))

  const [cityId, setCityId] = useState<number | null>(null)
  const [regionId, setRegionId] = useState<number | null>(null)
  const [picked, setPicked] = useState<Record<HdOptionGroup, number[]>>({
    accessibility: [], premises: [], imaging: [], equipment: [], services: [], sale_includes: [],
  })
  const [deals, setDeals] = useState<HdOfferType[]>([])
  const [offers, setOffers] = useState<Record<string, OfferDraft>>({})
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const toggleOption = (g: HdOptionGroup) => (id: number) =>
    setPicked((p) => ({
      ...p,
      [g]: p[g].includes(id) ? p[g].filter((x) => x !== id) : [...p[g], id],
    }))

  const setOffer = (k: HdOfferType, field: string, value: string | number[]) =>
    setOffers((p) => ({ ...p, [k]: { ...(p[k] ?? {}), [field]: value } }))

  const offerDays = (k: HdOfferType) => (offers[k]?.days as number[] | undefined) ?? []
  const toggleOfferDay = (k: HdOfferType, d: number) => {
    const cur = offerDays(k)
    setOffer(k, 'days', cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d])
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    const room = HD_MAX_IMAGES - files.length
    const next: File[] = []
    for (const file of Array.from(list).slice(0, Math.max(0, room))) {
      const bad = validateHdImage(file)
      if (bad) { setError(bad); continue }
      next.push(file)
    }
    if (next.length) {
      setFiles((p) => [...p, ...next])
      setPreviews((p) => [...p, ...next.map((x) => URL.createObjectURL(x))])
    }
  }
  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles((p) => p.filter((_, x) => x !== i))
    setPreviews((p) => p.filter((_, x) => x !== i))
  }

  const canNext = useMemo(() => {
    if (step === 2) return deals.length > 0
    return true
  }, [step, deals])

  async function handleSubmit() {
    setError(null)

    if (!clean(f.clientName ?? '')) { setStep(6); setError('נא למלא שם מלא.'); return }
    if (!normalizeIlMobile(f.clientPhone ?? '')) { setStep(6); setError(IL_MOBILE_ERROR); return }
    if (!cityId) { setStep(1); setError('נא לבחור עיר.'); return }
    if (!f.assetType) { setStep(1); setError('נא לבחור סוג נכס.'); return }
    if (!deals.length) { setStep(2); setError('נא לבחור לפחות סוג עסקה אחד.'); return }

    const payload: HdOfferInput[] = deals.map((k, i) => {
      const d = offers[k] ?? {}
      return {
        offer_type: k,
        price_amount: (d.price as string) || null,
        available_from: (d.availableFrom as string) || null,
        availability_note: (d.availability as string) || null,
        days: (d.days as number[]) ?? [],
        hours: (d.hours as string) || null,
        included_note: (d.included as string) || null,
        extra_costs_note: (d.extraCosts as string) || null,
        terms_note: (d.terms as string) || null,
        sale_include_ids: k === 'sale' ? picked.sale_includes : [],
        notes: (d.notes as string) || null,
        sort_order: i + 1,
      }
    })

    setSaving(true)
    try {
      const res = await submitDentalAsset({
        submissionToken: token,
        packageDays, screening, termsVersion,
        clinicName: clean(f.clinicName ?? ''),
        cityId,
        street: clean(f.street ?? ''),
        streetNumber: clean(f.streetNumber ?? ''),
        entrance: clean(f.entrance ?? ''),
        floor: clean(f.floor ?? ''),
        areaSqm: num(f.areaSqm ?? ''),
        roomsCount: num(f.roomsCount ?? ''),
        unitsCount: num(f.unitsCount ?? ''),
        yearsActive: num(f.yearsActive ?? ''),
        assetType: f.assetType,
        clinicType: clean(f.clinicType ?? ''),
        locationType: clean(f.locationType ?? ''),
        clientNotes: clean(f.clientNotes ?? ''),
        accessibilityIds: picked.accessibility,
        premisesIds: picked.premises,
        imagingIds: picked.imaging,
        equipmentIds: picked.equipment,
        serviceIds: picked.services,
        imagingNotes: clean(f.imagingNotes ?? ''),
        equipmentNotes: clean(f.equipmentNotes ?? ''),
        servicesNotes: clean(f.servicesNotes ?? ''),
        offers: payload,
        files,
        clientName: f.clientName.trim(),
        clientBusinessName: clean(f.clientBusiness ?? ''),
        clientPhone: f.clientPhone.trim(),
        clientWhatsapp: clean(f.clientWhatsapp ?? ''),
        clientEmail: clean(f.clientEmail ?? ''),
        clientContactNotes: clean(f.clientContactNotes ?? ''),
      })
      setDone(res.asset_code)
    } catch (e) {
      setError(hdErrorToHebrew(e))
    } finally {
      setSaving(false)
    }
  }

  if (!gateOk) return <Navigate to="/dental-assets/terms" replace />

  if (done) {
    return (
      <div dir="rtl" className="bg-paper text-ink">
        <div className="mx-auto flex max-w-[840px] flex-col items-center gap-5 px-7 py-[clamp(80px,12vw,170px)] text-center">
          <p className="text-[12px] font-black tracking-[0.08em] text-ink/60">RECEIVED</p>
          <h1 className="text-[clamp(28px,4.6vw,58px)] font-black leading-[1.02] tracking-[-0.03em]">
            הבקשה התקבלה
          </h1>
          <p className="max-w-[46ch] text-[clamp(16px,1.5vw,20px)] leading-[1.8] text-ink/72 text-pretty">
            פרטי הנכס והתמונות הגיעו אלינו. צוות AllDent יעבור על החומרים ויחזור אליכם במידת הצורך.
          </p>
          <p className="font-mono text-[13px] tracking-[0.2em] text-ink/60">מספר בקשה: {done}</p>
          <p className="max-w-[44ch] text-[13px] leading-[1.7] text-ink/60">
            הנכס אינו מתפרסם אוטומטית. הוא יעלה לאתר רק לאחר שנבנה את הפרסום.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dental-assets')}
            className="mt-3 rounded-sm border border-ink/25 px-8 py-4 text-[14.5px] font-semibold transition-colors duration-500 hover:bg-ink hover:text-paper"
          >
            חזרה ללוח הנכסים
          </button>
        </div>
      </div>
    )
  }

  const opt = (g: HdOptionGroup) => options?.[g] ?? []

  return (
    <div dir="rtl" className="bg-paper text-ink">
      {/* ═══ סרגל התקדמות ═══ */}
      <div className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)] py-4">
          <div className="flex items-baseline justify-between gap-5">
            <span className="text-[20px] font-black tracking-[-0.03em]">{STEPS[step - 1]}</span>
            <span className="font-mono text-[11px] tracking-[0.2em] text-ink/60">
              {pad2(step)} / 07
            </span>
          </div>
          <div className="mt-3.5 flex gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-label={s}
                title={s}
                onClick={() => setStep(i + 1)}
                className="relative h-0.5 flex-1 overflow-hidden bg-rule"
              >
                <span
                  className={`absolute inset-0 origin-right transition-transform duration-700 ease-out-expo ${
                    i + 1 === step ? 'scale-x-100 bg-[#D97706]' : i + 1 < step ? 'scale-x-100 bg-ink' : 'scale-x-0 bg-ink'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-[clamp(24px,5vw,72px)] pb-[clamp(80px,10vw,140px)] pt-[clamp(44px,6vw,88px)]">
        {/* כותרת השלב */}
        <div className="mb-[clamp(34px,4.5vw,60px)]">
          <span className="mb-4 block text-[12px] font-black tracking-[0.08em] text-ink/60">
            שלב {pad2(step)} / 07
          </span>
          <h1 className="text-[clamp(26px,4.4vw,58px)] font-black leading-none tracking-[-0.03em]">
            {STEPS[step - 1]}
          </h1>
        </div>

        {optionsError && (
          <p role="alert" className="mb-6 border border-[#DC2626]/30 bg-[#DC2626]/5 p-4 text-[14px] text-[#B91C1C]">
            לא הצלחנו לטעון את רשימות הבחירה. רעננו את העמוד ונסו שוב.
          </p>
        )}

        {/* ─── שלב 1 ─── */}
        {step === 1 && (
          <>
            <Group label="זיהוי ומיקום">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label="שם הנכס / המרפאה" wide>
                  <input className={INPUT} value={f.clinicName ?? ''} onChange={set('clinicName')} placeholder="מרפאת שיניים ד״ר לוי" />
                </Field>
                <div className="sm:col-span-2">
                  <CityRegionPicker
                    cityId={cityId}
                    regionId={regionId}
                    onCityChange={setCityId}
                    onRegionChange={setRegionId}
                    variant="edit"
                  />
                </div>
                <Field label="רחוב"><input className={INPUT} value={f.street ?? ''} onChange={set('street')} placeholder="הרצל" /></Field>
                <Field label="מספר"><input className={INPUT} value={f.streetNumber ?? ''} onChange={set('streetNumber')} placeholder="42" /></Field>
                <Field label="כניסה"><input className={INPUT} value={f.entrance ?? ''} onChange={set('entrance')} placeholder="ב" /></Field>
                <Field label="קומה"><input className={INPUT} value={f.floor ?? ''} onChange={set('floor')} placeholder="2" /></Field>
                <Field label="סוג המיקום">
                  <select className={INPUT} value={f.locationType ?? ''} onChange={set('locationType')}>
                    <option value="">בחרו</option>
                    {HD_LOCATION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
            </Group>

            <Group label="גודל ואופי">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label="סוג הנכס" required>
                  <select className={INPUT} value={f.assetType ?? ''} onChange={set('assetType')}>
                    <option value="">בחרו</option>
                    {HD_ASSET_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="סוג המרפאה">
                  <select className={INPUT} value={f.clinicType ?? ''} onChange={set('clinicType')}>
                    <option value="">בחרו</option>
                    {HD_CLINIC_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="שטח במ״ר"><input className={INPUT} type="number" inputMode="numeric" value={f.areaSqm ?? ''} onChange={set('areaSqm')} placeholder="120" /></Field>
                <Field label="חדרי טיפול"><input className={INPUT} type="number" inputMode="numeric" value={f.roomsCount ?? ''} onChange={set('roomsCount')} placeholder="3" /></Field>
                <Field label="יוניטים"><input className={INPUT} type="number" inputMode="numeric" value={f.unitsCount ?? ''} onChange={set('unitsCount')} placeholder="3" /></Field>
                <Field label="ותק בשנים"><input className={INPUT} type="number" inputMode="numeric" value={f.yearsActive ?? ''} onChange={set('yearsActive')} placeholder="19" /></Field>
              </div>
            </Group>

            <Group label={HD_OPTION_GROUPS.accessibility}>
              <CheckGrid options={opt('accessibility')} selected={picked.accessibility} onToggle={toggleOption('accessibility')} />
            </Group>
            <Group label={HD_OPTION_GROUPS.premises}>
              <CheckGrid options={opt('premises')} selected={picked.premises} onToggle={toggleOption('premises')} />
            </Group>
            <Group label="הערות">
              <Field label="כל דבר שחשוב שנדע" wide>
                <textarea className={`${INPUT} min-h-[104px] resize-y border border-rule px-4 py-3.5 leading-[1.75] rounded-sm`} value={f.clientNotes ?? ''} onChange={set('clientNotes')} />
              </Field>
            </Group>
          </>
        )}

        {/* ─── שלב 2 ─── */}
        {step === 2 && (
          <>
            <p className="mb-8 max-w-[48ch] text-[16.5px] leading-[1.8] text-ink/72 text-pretty">
              אפשר לבחור כמה אפשרויות. לכל אחת נבקש מחיר ותנאים בנפרד.
            </p>
            <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
              {HD_OFFER_TYPES.map((d) => {
                const on = deals.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDeals((p) => (on ? p.filter((x) => x !== d.value) : [...p, d.value]))}
                    className={`relative p-6 text-right transition-colors duration-500 ${on ? 'bg-ink text-paper' : 'bg-paper hover:bg-[rgba(15,15,16,0.03)]'}`}
                  >
                    <span className="flex items-center justify-between gap-3.5">
                      <h4 className="text-[20px] font-black leading-[1.1] tracking-[-0.03em]">{d.label}</h4>
                      <span className={`h-2 w-2 shrink-0 rounded-full border transition-colors duration-500 ${on ? 'border-[#D97706] bg-[#D97706]' : 'border-ink/25'}`} />
                    </span>
                    <p className={`mt-2 text-[13.5px] leading-[1.65] ${on ? 'text-white/75' : 'text-ink/72'}`}>{d.hint}</p>
                  </button>
                )
              })}
            </div>
            <p className="mt-5 text-[13px] text-ink/60">
              {deals.length ? `נבחרו ${deals.length} סוגי עסקה.` : 'בחרו לפחות אפשרות אחת כדי להמשיך.'}
            </p>
          </>
        )}

        {/* ─── שלב 3 ─── */}
        {step === 3 && (
          <>
            {optionsLoading && <p className="text-[15px] text-ink/60">טוען רשימות…</p>}
            {(['imaging', 'equipment', 'services'] as const).map((g) => (
              <Group key={g} label={HD_OPTION_GROUPS[g]}>
                <CheckGrid options={opt(g)} selected={picked[g]} onToggle={toggleOption(g)} />
                <div className="mt-5">
                  <Field label={`${HD_OPTION_GROUPS[g]} — הערות או פריטים שלא ברשימה`} wide>
                    <textarea
                      className={`${INPUT} min-h-[92px] resize-y border border-rule px-4 py-3.5 leading-[1.75] rounded-sm`}
                      value={f[`${g}Notes`] ?? ''}
                      onChange={set(`${g}Notes`)}
                    />
                  </Field>
                </div>
              </Group>
            ))}
          </>
        )}

        {/* ─── שלב 4 — נבנה לפי שלב 2 ─── */}
        {step === 4 && (
          deals.length === 0 ? (
            <p className="text-[16px] text-ink/72">
              לא נבחר סוג עסקה. חזרו לשלב 2 ובחרו לפחות אפשרות אחת.
            </p>
          ) : (
            deals.map((k, i) => {
              const meta = HD_OFFER_TYPES.find((o) => o.value === k)!
              const d = offers[k] ?? {}
              return (
                <div key={k} className="mt-[clamp(30px,3.6vw,48px)] border-t border-rule pt-[clamp(22px,2.6vw,32px)] first:mt-0 first:border-0 first:pt-0">
                  <div className="mb-6 flex items-baseline gap-4">
                    <span className="text-[12px] font-black tracking-[0.08em] text-ink/60">{pad2(i + 1)}</span>
                    <h4 className="text-[clamp(20px,2.4vw,32px)] font-black tracking-[-0.03em]">{meta.label}</h4>
                  </div>
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <Field label={meta.priceLabel} required>
                      <input className={INPUT} type="number" inputMode="numeric" value={(d.price as string) ?? ''} onChange={(e) => setOffer(k, 'price', e.target.value)} />
                    </Field>

                    {k === 'sale' && (
                      <Field label="זמינות">
                        <select className={INPUT} value={(d.availability as string) ?? ''} onChange={(e) => setOffer(k, 'availability', e.target.value)}>
                          <option value="">בחרו</option>
                          {HD_AVAILABILITY.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </Field>
                    )}

                    {k === 'rent_monthly' && (
                      <>
                        <Field label="זמין מתאריך"><input className={INPUT} type="date" value={(d.availableFrom as string) ?? ''} onChange={(e) => setOffer(k, 'availableFrom', e.target.value)} /></Field>
                        <Field label="תקופה מינימלית"><input className={INPUT} value={(d.terms as string) ?? ''} onChange={(e) => setOffer(k, 'terms', e.target.value)} placeholder="12 חודשים" /></Field>
                        <Field label="עלויות נוספות"><input className={INPUT} value={(d.extraCosts as string) ?? ''} onChange={(e) => setOffer(k, 'extraCosts', e.target.value)} placeholder="ארנונה, ועד, חשמל" /></Field>
                      </>
                    )}

                    {k === 'rent_daily' && (
                      <Field label="שעות"><input className={INPUT} value={(d.hours as string) ?? ''} onChange={(e) => setOffer(k, 'hours', e.target.value)} placeholder="08:00–18:00" /></Field>
                    )}

                    {k === 'rent_shift' && (
                      <Field label="משמרות">
                        <select className={INPUT} value={(d.hours as string) ?? ''} onChange={(e) => setOffer(k, 'hours', e.target.value)}>
                          <option value="">בחרו</option>
                          {HD_SHIFTS.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </Field>
                    )}
                  </div>

                  {k === 'sale' && (
                    <div className="mt-7">
                      <span className="mb-4 block text-[12px] font-black tracking-[0.08em] text-ink/60">
                        {HD_OPTION_GROUPS.sale_includes}
                      </span>
                      <CheckGrid options={opt('sale_includes')} selected={picked.sale_includes} onToggle={toggleOption('sale_includes')} />
                    </div>
                  )}

                  {(k === 'rent_daily' || k === 'rent_shift') && (
                    <div className="mt-7">
                      <span className="mb-4 block text-[12px] font-black tracking-[0.08em] text-ink/60">ימים פנויים</span>
                      <CheckGrid
                        options={HD_WEEKDAYS.map((w) => ({ id: w.value, name: w.label }))}
                        selected={offerDays(k)}
                        onToggle={(id) => toggleOfferDay(k, id)}
                      />
                    </div>
                  )}

                  <div className="mt-6">
                    <Field label="הערות" wide>
                      <textarea className={`${INPUT} min-h-[92px] resize-y border border-rule px-4 py-3.5 leading-[1.75] rounded-sm`} value={(d.notes as string) ?? ''} onChange={(e) => setOffer(k, 'notes', e.target.value)} />
                    </Field>
                  </div>
                </div>
              )
            })
          )
        )}

        {/* ─── שלב 5 ─── */}
        {step === 5 && (
          <>
            <p className="mb-8 max-w-[48ch] text-[16.5px] leading-[1.8] text-ink/72 text-pretty">
              עד {HD_MAX_IMAGES} תמונות. אנחנו בוחרים מתוכן מה יופיע ובאיזה סדר.
            </p>
            <label className="block cursor-pointer rounded-sm border border-dashed border-ink/25 px-6 py-[clamp(40px,6vw,72px)] text-center transition-colors duration-500 hover:border-[#D97706] hover:bg-[rgba(217,119,6,0.035)]">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              <b className="block text-[19px] font-bold tracking-[-0.02em]">בחרו תמונות</b>
              <small className="mt-2 block font-mono text-[12.5px] tracking-[0.12em] text-ink/60">JPG · PNG · WEBP · 10MB</small>
            </label>
            {previews.length > 0 && (
              <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="group relative aspect-square overflow-hidden bg-mist">
                    <img src={src} alt={files[i]?.name ?? ''} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`הסרת ${files[i]?.name ?? 'תמונה'}`}
                      className="absolute start-0 top-0 grid h-8 w-8 place-items-center bg-ink text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-between gap-4">
              <span className="font-mono text-[11px] tracking-[0.2em] text-ink/60">{pad2(files.length)} / {HD_MAX_IMAGES}</span>
              <span className="text-[13px] text-ink/60">נשמרות באופן פרטי ואינן מתפרסמות אוטומטית</span>
            </div>
          </>
        )}

        {/* ─── שלב 6 ─── */}
        {step === 6 && (
          <>
            <p className="mb-8 max-w-[48ch] text-[16.5px] leading-[1.8] text-ink/72 text-pretty">
              הפרטים משמשים אותנו כדי לחזור אליכם. הם אינם מתפרסמים אוטומטית בדף הנכס.
            </p>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="שם מלא" required><input className={INPUT} value={f.clientName ?? ''} onChange={set('clientName')} placeholder="ישראל ישראלי" /></Field>
              <Field label="שם העסק / המרפאה"><input className={INPUT} value={f.clientBusiness ?? ''} onChange={set('clientBusiness')} /></Field>
              <Field label="טלפון נייד" required hint="נדרש מספר נייד ישראלי תקין">
                <input className={INPUT} type="tel" inputMode="tel" value={f.clientPhone ?? ''} onChange={set('clientPhone')} placeholder="050-000-0000" />
              </Field>
              <Field label="WhatsApp"><input className={INPUT} type="tel" inputMode="tel" value={f.clientWhatsapp ?? ''} onChange={set('clientWhatsapp')} placeholder="אם שונה מהנייד" /></Field>
              <Field label="אימייל" wide><input className={INPUT} type="email" inputMode="email" value={f.clientEmail ?? ''} onChange={set('clientEmail')} placeholder="name@example.com" /></Field>
              <Field label="מתי נוח לחזור אליכם" wide>
                <textarea className={`${INPUT} min-h-[92px] resize-y border border-rule px-4 py-3.5 leading-[1.75] rounded-sm`} value={f.clientContactNotes ?? ''} onChange={set('clientContactNotes')} />
              </Field>
            </div>
          </>
        )}

        {/* ─── שלב 7 ─── */}
        {step === 7 && (
          <Review
            f={f}
            packageDays={packageDays}
            screening={screening}
            cityId={cityId}
            deals={deals}
            offers={offers}
            picked={picked}
            options={options}
            fileCount={files.length}
            onEdit={setStep}
          />
        )}

        {error && (
          <p role="alert" className="mt-8 border border-[#DC2626]/30 bg-[#DC2626]/5 p-4 text-[14px] text-[#B91C1C]">
            {error}
          </p>
        )}

        {/* ניווט */}
        <div className="mt-[clamp(40px,5vw,68px)] flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-[clamp(24px,3vw,36px)]">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-sm border border-ink/25 px-8 py-4 text-[14.5px] font-semibold transition-colors duration-500 hover:bg-ink hover:text-paper">
              הקודם
            </button>
          ) : <span />}

          {step < 7 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="rounded-sm bg-ink px-8 py-4 text-[14.5px] font-semibold text-paper transition-colors duration-500 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {step === 6 ? 'לסיכום' : 'הבא'}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="rounded-sm bg-[#D97706] px-8 py-4 text-[14.5px] font-semibold text-white transition-colors duration-500 hover:bg-[#B45309] disabled:opacity-40"
            >
              {saving ? 'שולח…' : 'שליחת הבקשה'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── מסך הסיכום ── */
function Review({
  f, packageDays, screening, cityId, deals, offers, picked, options, fileCount, onEdit,
}: {
  f: Record<string, string>
  packageDays: number
  screening: boolean
  cityId: number | null
  deals: HdOfferType[]
  offers: Record<string, OfferDraft>
  picked: Record<HdOptionGroup, number[]>
  options: Record<HdOptionGroup, Array<{ id: number; name: string }>> | undefined
  fileCount: number
  onEdit: (step: number) => void
}) {
  const names = (g: HdOptionGroup) =>
    (options?.[g] ?? []).filter((o) => picked[g].includes(o.id)).map((o) => o.name).join(' · ')

  const Row = ({ k, v }: { k: string; v: string | number | null | undefined }) => (
    <div className="grid items-baseline gap-4 border-b border-rule/50 py-2.5 sm:grid-cols-[clamp(120px,15vw,180px)_1fr]">
      <span className="font-mono text-[10.5px] tracking-[0.14em] text-ink/60">{k}</span>
      {v !== null && v !== undefined && String(v).trim() !== '' ? (
        <span className="text-[15.5px] leading-[1.6]">{v}</span>
      ) : (
        <span className="text-[15.5px] italic text-ink/25">לא צוין</span>
      )}
    </div>
  )

  const Block = ({ title, step, children }: { title: string; step?: number; children: React.ReactNode }) => (
    <div className="mt-8 border-t border-rule pt-5 first:mt-0 first:border-0 first:pt-0">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h4 className="text-[21px] font-black tracking-[-0.03em]">{title}</h4>
        {step && (
          <button type="button" onClick={() => onEdit(step)} className="font-mono text-[12px] tracking-[0.16em] text-ink/60 transition-colors duration-300 hover:text-[#D97706]">
            עריכה
          </button>
        )}
      </div>
      {children}
    </div>
  )

  return (
    <>
      <p className="mb-8 max-w-[48ch] text-[16.5px] leading-[1.8] text-ink/72 text-pretty">
        עברו על הפרטים. אפשר לחזור ולתקן כל מקטע.
      </p>

      <Block title="מסלול השירות">
        <Row k="תקופת פרסום" v={`${packageDays} יום`} />
        <Row k="מחיר" v={`${nis(packageDays === 60 ? 700 : 800)} ₪ + מע״מ`} />
        <Row k="טיפול בפניות" v={screening ? 'AllDent' : 'ישירות אליכם'} />
        <p className="mt-2 text-[13px] text-ink/60">נבחר בעמוד המסלולים ואינו נבחר מחדש כאן.</p>
      </Block>

      <Block title="הנכס" step={1}>
        <Row k="שם" v={f.clinicName} />
        <Row k="עיר" v={cityId ? 'נבחרה' : null} />
        <Row k="כתובת" v={[f.street, f.streetNumber].filter(Boolean).join(' ')} />
        <Row k="סוג הנכס" v={HD_ASSET_TYPES.find((o) => o.value === f.assetType)?.label} />
        <Row k="שטח" v={f.areaSqm ? `${f.areaSqm} מ״ר` : null} />
        <Row k="חדרי טיפול" v={f.roomsCount} />
        <Row k="יוניטים" v={f.unitsCount} />
        <Row k="ותק" v={f.yearsActive ? `${f.yearsActive} שנים` : null} />
        <Row k="נגישות" v={names('accessibility')} />
        <Row k="קיים בנכס" v={names('premises')} />
      </Block>

      <Block title="סוגי עסקה" step={2}>
        <Row k="נבחרו" v={deals.map((d) => HD_OFFER_TYPES.find((o) => o.value === d)?.label).join(' · ')} />
      </Block>

      <Block title="מחירים" step={4}>
        {deals.map((k) => (
          <Row
            key={k}
            k={HD_OFFER_TYPES.find((o) => o.value === k)?.label ?? k}
            v={offers[k]?.price ? `${nis(Number(offers[k].price))} ₪` : null}
          />
        ))}
      </Block>

      <Block title="ציוד" step={3}>
        <Row k="דימות" v={names('imaging')} />
        <Row k="ציוד ומכשור" v={names('equipment')} />
        <Row k="שירותים" v={names('services')} />
      </Block>

      <Block title="תמונות" step={5}>
        <Row k="הועלו" v={fileCount ? `${fileCount} תמונות` : null} />
      </Block>

      <Block title="פרטי קשר" step={6}>
        <Row k="שם" v={f.clientName} />
        <Row k="טלפון" v={f.clientPhone} />
        <Row k="אימייל" v={f.clientEmail} />
      </Block>
    </>
  )
}
