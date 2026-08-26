/**
 * INC-3130 · HOME DENT — שלושת הרכיבים שקובעים מה יוצא לאוויר.
 *
 *   AssetPublishFields — ה-Allow-List עצמו (published_fields)
 *   AssetCardSeoEditor — המלל שאת כותבת: כרטיס הלוח, הדף, ושיתוף
 *   AssetContactCta    — פרטי קשר ציבוריים והכפתורים שנגזרים מהם
 *
 * העיקרון המשותף: **מה שנשמר כאן הוא מה שמתפרסם.** אין קשר חי לנתוני
 * הלקוח — פרטי הקשר הם מילוי מקדים בלבד (החלטה 6), ופרטי הלקוח עצמם
 * (client_*) לא מגיעים לפרסום בשום מסלול.
 */
import { useMemo } from 'react'
import { MessageCircle, Phone, Mail, Navigation, Link2, FileText } from 'lucide-react'
import {
  HD_PUBLISH_GROUPS,
  HD_SUGGESTED_KEYS,
  HD_ALL_PUBLISH_KEYS,
} from '@/lib/homeDentPublishFields'
import type { HdCardConfig, HdCta, HdPublicContact } from '@/hooks/useDentalAsset'
import {
  AdminCard,
  CheckField,
  FieldLabel,
  StringListField,
  TextAreaField,
  TextField,
} from '@/components/ui/AdminField'
import { whatsappLink } from '@/lib/normalizePhone'

/* ═══════════════════ 1. Allow-List ═══════════════════ */

export function AssetPublishFields({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const set = useMemo(() => new Set(value), [value])
  const toggle = (key: string) =>
    onChange(set.has(key) ? value.filter((k) => k !== key) : [...value, key])

  return (
    <AdminCard
      title="אילו נתונים מתפרסמים"
      description={`${set.size} מתוך ${HD_ALL_PUBLISH_KEYS.length} שדות מסומנים. מה שלא מסומן לא נכנס לדף כלל — הוא לא מוסתר בעיצוב, הוא פשוט לא נשלח לדפדפן.`}
      grid={false}
      action={
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onChange([...HD_SUGGESTED_KEYS])}
            className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080]"
          >
            בחירה מומלצת
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-semibold text-[#6B6B6B] transition hover:border-[#DC2626] hover:text-[#DC2626]"
          >
            ניקוי
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {HD_PUBLISH_GROUPS.map((group) => (
          <div key={group.key}>
            <FieldLabel>{group.title}</FieldLabel>
            {group.note && (
              <p className="mb-2 text-[12px] leading-5 text-[#9CA3AF]">{group.note}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.fields.map((f) => (
                <CheckField
                  key={f.key}
                  checked={set.has(f.key)}
                  onChange={() => toggle(f.key)}
                  label={f.label}
                  hint={f.hint}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  )
}

/* ═══════════════════ 2. כרטיס, דף ושיתוף ═══════════════════ */

export function AssetCardSeoEditor({
  value,
  onChange,
  coverPath,
}: {
  value: HdCardConfig
  onChange: (next: HdCardConfig) => void
  coverPath: string | null
}) {
  const set = <K extends keyof HdCardConfig>(k: K, v: HdCardConfig[K]) =>
    onChange({ ...value, [k]: v })

  const ogTitle = value.og_title || value.title || ''
  const ogDesc = value.og_description || value.excerpt || ''

  return (
    <>
      <AdminCard
        title="כרטיס הנכס בלוח"
        description="מה שרואים ברשימה ב-/dental-assets, לצד הנכסים הקיימים. הכותרת חובה — בלעדיה שער הפרסום חוסם."
      >
        <TextField
          label="כותרת"
          value={value.title ?? ''}
          onChange={(v) => set('title', v)}
          placeholder="מרפאה מאובזרת להשכרה — רמת גן"
          hint="חובה"
          full
        />
        <TextField
          label="מיקום להצגה"
          value={value.location ?? ''}
          onChange={(v) => set('location', v)}
          placeholder="ריק = העיר מהנתונים"
        />
        <TextField
          label="תווית סוג"
          value={value.type_label ?? ''}
          onChange={(v) => set('type_label', v)}
          placeholder="ריק = נגזר ממסלולי העסקה"
        />
        <TextAreaField
          label="תקציר"
          value={value.excerpt ?? ''}
          onChange={(v) => set('excerpt', v)}
          rows={3}
          hint="2–3 שורות שמופיעות בכרטיס"
        />
        <StringListField
          label="נקודות בולטות"
          value={value.highlights ?? []}
          onChange={(v) => set('highlights', v)}
          placeholder='32 מ"ר | 2 חדרי טיפול'
          hint="מוצגות כתגיות בכרטיס"
        />
        <StringListField
          label="תגיות"
          value={value.tags ?? []}
          onChange={(v) => set('tags', v)}
          placeholder="מרכז / מיידי / מאובזר"
        />
      </AdminCard>

      <AdminCard
        title="הדף עצמו"
        description="ריק = הדף נופל לכותרת ולתקציר של הכרטיס. המלל כאן מתפרסם תמיד ואינו תלוי בסימון השדות."
      >
        <TextField
          label="כותרת הדף"
          value={value.public_title ?? ''}
          onChange={(v) => set('public_title', v)}
          full
        />
        <TextField
          label="כותרת משנה"
          value={value.public_subtitle ?? ''}
          onChange={(v) => set('public_subtitle', v)}
          full
        />
        <TextAreaField
          label="תיאור מלא"
          value={value.public_description ?? ''}
          onChange={(v) => set('public_description', v)}
          rows={6}
          hint="ירידת שורה נשמרת בדף"
        />
      </AdminCard>

      <AdminCard
        title="שיתוף בוואטסאפ ורשתות"
        description="כך ייראה הקישור כשישתפו אותו. ריק = נופל לכותרת ולתקציר של הכרטיס."
        grid={false}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <TextField
            label="כותרת שיתוף"
            value={value.og_title ?? ''}
            onChange={(v) => set('og_title', v)}
            full
          />
          <TextAreaField
            label="תיאור שיתוף"
            value={value.og_description ?? ''}
            onChange={(v) => set('og_description', v)}
            rows={2}
          />
        </div>

        {/* תצוגה מקדימה — אותו סדר שוואטסאפ מציג: תמונה, כותרת, תיאור, דומיין */}
        <div className="mt-4">
          <FieldLabel>תצוגה מקדימה</FieldLabel>
          <div className="max-w-[340px] overflow-hidden rounded-xl border border-[#D9D9D9] bg-[#F0F2F5]">
            <div className="aspect-[1.91/1] bg-[#D9D9D9]">
              {coverPath && (
                <img src={coverPath} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-2.5">
              <p className="truncate text-[13px] font-bold text-[#111B21]">
                {ogTitle || 'כותרת הנכס'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#667781]">
                {ogDesc || 'תיאור קצר של הנכס'}
              </p>
              <p className="mt-1 text-[11px] text-[#8696A0]" dir="ltr">
                www.alldent.co.il
              </p>
            </div>
          </div>
          {!coverPath && (
            <p className="mt-2 text-[12px] text-[#9CA3AF]">
              אין עדיין תמונה מסומנת לפרסום — השיתוף יציג את תמונת ברירת המחדל של המותג.
            </p>
          )}
        </div>
      </AdminCard>
    </>
  )
}

/* ═══════════════════ 3. פרטי קשר ו-CTA ═══════════════════ */

const ALLDENT = { phone: '050-210-8501', email: 'info@alldent.co.il' }

const CTA_META: Record<
  HdCta['type'],
  { label: string; icon: typeof Phone; build: (c: HdPublicContact) => string }
> = {
  whatsapp: {
    label: 'וואטסאפ',
    icon: MessageCircle,
    build: (c) => (c.whatsapp ? whatsappLink(c.whatsapp) : ''),
  },
  phone: { label: 'חיוג', icon: Phone, build: (c) => (c.phone ? `tel:${c.phone}` : '') },
  email: { label: 'מייל', icon: Mail, build: (c) => (c.email ? `mailto:${c.email}` : '') },
  waze: { label: 'ניווט', icon: Navigation, build: (c) => c.waze ?? '' },
  link: { label: 'קישור', icon: Link2, build: () => '' },
  lead_form: { label: 'טופס השארת פרטים', icon: FileText, build: () => '' },
}

const CTA_ORDER: HdCta['type'][] = ['whatsapp', 'phone', 'waze', 'email', 'lead_form']

export function AssetContactCta({
  contact,
  ctas,
  onContactChange,
  onCtasChange,
  clientContact,
}: {
  contact: HdPublicContact
  ctas: HdCta[]
  onContactChange: (next: HdPublicContact) => void
  onCtasChange: (next: HdCta[]) => void
  clientContact: { name?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null }
}) {
  const set = <K extends keyof HdPublicContact>(k: K, v: HdPublicContact[K]) =>
    onContactChange({ ...contact, [k]: v })

  /** מילוי מקדים בלבד. אחרי הלחיצה כל שדה נערך עצמאית ואין קשר חי למקור. */
  function prefill(mode: 'owner' | 'alldent') {
    if (mode === 'owner') {
      onContactChange({
        ...contact,
        mode: 'owner',
        contact_name: clientContact.name ?? '',
        phone: clientContact.phone ?? '',
        whatsapp: clientContact.whatsapp || clientContact.phone || '',
        email: clientContact.email ?? '',
      })
    } else {
      onContactChange({
        ...contact,
        mode: 'alldent',
        contact_name: 'AllDent',
        phone: ALLDENT.phone,
        whatsapp: ALLDENT.phone,
        email: ALLDENT.email,
      })
    }
  }

  const byType = new Map(ctas.map((c) => [c.type, c]))

  function toggleCta(type: HdCta['type'], on: boolean) {
    if (!on) {
      onCtasChange(ctas.filter((c) => c.type !== type))
      return
    }
    const meta = CTA_META[type]
    const next: HdCta = {
      id: crypto.randomUUID(),
      type,
      label: meta.label,
      target: meta.build(contact),
      style: ctas.length === 0 ? 'primary' : 'secondary',
      visible: true,
      mobile: true,
      desktop: true,
    }
    onCtasChange([...ctas, next])
  }

  function patchCta(type: HdCta['type'], patch: Partial<HdCta>) {
    onCtasChange(ctas.map((c) => (c.type === type ? { ...c, ...patch } : c)))
  }

  /** מסנכרן יעדים מפרטי הקשר בלי לגעת בטקסט שנערך ידנית. */
  function resyncTargets() {
    onCtasChange(ctas.map((c) => ({ ...c, target: CTA_META[c.type].build(contact) || c.target })))
  }

  return (
    <>
      <AdminCard
        title="פרטי קשר ציבוריים"
        description="הערכים כאן הם מה שמתפרסם. פרטי הלקוח עצמם לא מגיעים לדף בשום מסלול — הכפתורים ממלאים מראש בלבד, ואחריהם כל שדה נערך עצמאית."
        action={
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => prefill('owner')}
              className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080]"
            >
              מילוי מפרטי הבעלים
            </button>
            <button
              type="button"
              onClick={() => prefill('alldent')}
              className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080]"
            >
              מילוי בפרטי AllDent
            </button>
          </div>
        }
      >
        <TextField
          label="שם איש קשר"
          value={contact.contact_name ?? ''}
          onChange={(v) => set('contact_name', v)}
        />
        <TextField
          label="טלפון"
          value={contact.phone ?? ''}
          onChange={(v) => set('phone', v)}
          dir="ltr"
        />
        <TextField
          label="וואטסאפ"
          value={contact.whatsapp ?? ''}
          onChange={(v) => set('whatsapp', v)}
          dir="ltr"
        />
        <TextField
          label="אימייל"
          value={contact.email ?? ''}
          onChange={(v) => set('email', v)}
          dir="ltr"
        />
        <TextField
          label="קישור ניווט"
          value={contact.waze ?? ''}
          onChange={(v) => set('waze', v)}
          placeholder="https://waze.com/ul/..."
          hint="ריק = לא יוצג כפתור ניווט"
          dir="ltr"
          full
        />
        <TextAreaField
          label="הערה ליד פרטי הקשר"
          value={contact.note ?? ''}
          onChange={(v) => set('note', v)}
          rows={2}
        />
      </AdminCard>

      <AdminCard
        title="כפתורי פעולה בדף"
        description="הכפתורים שיופיעו בסוף הדף ובסרגל הדביק במובייל. אין חוק שקושר אותם לבחירת שירות המיון — מה שמסומן כאן הוא מה שמתפרסם."
        grid={false}
        action={
          <button
            type="button"
            onClick={resyncTargets}
            className="shrink-0 rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080]"
          >
            רענון יעדים מפרטי הקשר
          </button>
        }
      >
        <div className="flex flex-col gap-2.5">
          {CTA_ORDER.map((type) => {
            const meta = CTA_META[type]
            const cta = byType.get(type)
            const Icon = meta.icon
            const autoTarget = meta.build(contact)
            const needsTarget = type !== 'lead_form'
            return (
              <div key={type} className="rounded-xl border border-[#D9D9D9] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={!!cta}
                      onChange={(e) => toggleCta(type, e.target.checked)}
                      className="h-4 w-4 accent-[#008080]"
                    />
                    <Icon className="h-4 w-4 text-[#008080]" />
                    <span className="text-[13.5px] font-bold text-[#2D2D2D]">{meta.label}</span>
                  </label>
                  {cta && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          patchCta(type, { style: cta.style === 'primary' ? 'secondary' : 'primary' })
                        }
                        className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                          cta.style === 'primary'
                            ? 'bg-[#008080] text-white'
                            : 'border border-[#D9D9D9] text-[#6B6B6B]'
                        }`}
                      >
                        {cta.style === 'primary' ? 'ראשי' : 'משני'}
                      </button>
                      <label className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                        <input
                          type="checkbox"
                          checked={cta.mobile !== false}
                          onChange={(e) => patchCta(type, { mobile: e.target.checked })}
                          className="h-3.5 w-3.5 accent-[#008080]"
                        />
                        מובייל
                      </label>
                      <label className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                        <input
                          type="checkbox"
                          checked={cta.desktop !== false}
                          onChange={(e) => patchCta(type, { desktop: e.target.checked })}
                          className="h-3.5 w-3.5 accent-[#008080]"
                        />
                        דסקטופ
                      </label>
                    </div>
                  )}
                </div>

                {cta && (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel>טקסט הכפתור</FieldLabel>
                      <input
                        className="h-10 w-full rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13.5px] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
                        value={cta.label}
                        onChange={(e) => patchCta(type, { label: e.target.value })}
                      />
                    </label>
                    {needsTarget && (
                      <label className="block">
                        <FieldLabel>יעד</FieldLabel>
                        <input
                          dir="ltr"
                          className="h-10 w-full rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
                          value={cta.target ?? ''}
                          placeholder={autoTarget || 'https://…'}
                          onChange={(e) => patchCta(type, { target: e.target.value })}
                        />
                      </label>
                    )}
                    {needsTarget && !cta.target && !autoTarget && (
                      <p className="text-[12px] font-semibold text-[#DC2626] sm:col-span-2">
                        אין יעד לכפתור הזה — מלאי את פרטי הקשר המתאימים או הזיני יעד ידנית.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </AdminCard>
    </>
  )
}
