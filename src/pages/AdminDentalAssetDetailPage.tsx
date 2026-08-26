/**
 * INC-3130 · HOME DENT — מסך נכס בודד. /admin/dental-assets/HD0001
 *
 * מיקום במערכת:
 *   /admin/dental-assets  (הרשימה)  →  המסך הזה  →  /dental-assets/HD0001
 * המשתמשת מגיעה מהרשימה, מכינה כאן את הפרסום, ומוציאה אותו לאוויר.
 *
 * שכבות (אפיון §40): מקור הלקוח קפוא · נתוני עבודה נערכים · הפרסום הוא
 * snapshot נפרד. עריכה כאן לא משנה את האתר עד Publish / Publish Update.
 *
 * מסגרת, טאבים, תגיות, שדות וטבלאות — כולם רכיבי המערכת הקיימים.
 * אין כאן שום רכיב עיצוב מקומי חדש.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarPlus,
  ExternalLink,
  Eye,
  Home,
  RefreshCw,
  Save,
  Send,
  Undo2,
} from 'lucide-react'
import { Shell, ActionButton, EmptyState } from '@/components/layout/Shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'
import { AdminTable } from '@/components/admin/AdminTable'
import {
  AdminCard,
  FieldLabel,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/AdminField'
import { AssetOffersEditor } from '@/components/admin/dental/AssetOffersEditor'
import { AssetImagesManager } from '@/components/admin/dental/AssetImagesManager'
import {
  AssetCardSeoEditor,
  AssetContactCta,
  AssetPublishFields,
} from '@/components/admin/dental/AssetPublishConfig'
import { DentalAssetPageBody } from '@/components/dental-assets/DentalAssetPageBody'
import {
  publicImageUrl,
  useDentalAsset,
  useDentalAssetDetailMutations,
  useDentalAssetImages,
  useDentalAssetInquiries,
  useDentalAssetOffers,
  type DentalAsset,
  type DentalAssetImage,
  type HdCardConfig,
  type HdCta,
  type HdPublicContact,
} from '@/hooks/useDentalAsset'
import { useDentalAssetOptions } from '@/hooks/useDentalAssetOptions'
import { useDentalAssetMutations } from '@/hooks/useDentalAssets'
import {
  HD_ASSET_TYPES,
  HD_CLINIC_TYPES,
  HD_LOCATION_TYPES,
  hdErrorToHebrew,
} from '@/lib/homeDentOptions'
import { HD_PUBLICATION, HD_WORKFLOW, HD_INQUIRY, asFilterOptions } from '@/lib/homeDentStatuses'
import { formatPhone } from '@/lib/normalizePhone'
import type { PublicAssetPage } from '@/services/publicDentalAssetsService'

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('he-IL') : '—')

/** מה שנערך מקומית עד לחיצה על שמירה. */
type Draft = Partial<DentalAsset>

export default function AdminDentalAssetDetailPage() {
  const { assetCode } = useParams<{ assetCode: string }>()
  const navigate = useNavigate()

  const { data: asset, isLoading, error } = useDentalAsset(assetCode)
  const { data: offers = [] } = useDentalAssetOffers(asset?.id)
  const { data: images = [] } = useDentalAssetImages(asset?.id)
  const { data: inquiries = [] } = useDentalAssetInquiries(asset?.id)
  const { data: options } = useDentalAssetOptions()
  const m = useDentalAssetDetailMutations(asset?.id)
  const { publish, publishUpdate, unpublish, extend } = useDentalAssetMutations()

  const [draft, setDraft] = useState<Draft>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [preview, setPreview] = useState<PublicAssetPage | null>(null)
  const [tab, setTab] = useState('work')

  // הטיוטה נטענת מחדש רק כשמזהה הנכס משתנה — לא בכל refetch,
  // אחרת רענון רקע של React Query היה מוחק עריכה באמצע הקלדה.
  useEffect(() => {
    setDraft({})
  }, [asset?.id])

  const value = useMemo(() => ({ ...(asset ?? {}), ...draft }) as DentalAsset, [asset, draft])
  const dirty = Object.keys(draft).length > 0
  const set = <K extends keyof DentalAsset>(k: K, v: DentalAsset[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  function notify(kind: 'ok' | 'err', text: string) {
    setToast({ kind, text })
    window.setTimeout(() => setToast(null), 6000)
  }

  async function run(label: string, fn: () => Promise<{ error: unknown }>) {
    setBusy(true)
    try {
      const { error: e } = await fn()
      if (e) notify('err', `${label}: ${hdErrorToHebrew(e)}`)
      else notify('ok', `${label} — בוצע.`)
      return !e
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!dirty) return
    const ok = await run('שמירה', () => m.saveAsset(draft as Record<string, unknown>))
    if (ok) setDraft({})
  }

  async function openPreview() {
    setBusy(true)
    try {
      const { data, error: e } = await m.preview()
      if (e || !data) {
        notify('err', `תצוגה מקדימה: ${hdErrorToHebrew(e)}`)
        return
      }
      const payload = data as { page?: PublicAssetPage }
      setPreview(payload.page ?? null)
    } finally {
      setBusy(false)
    }
  }

  async function doExtend() {
    const days = window.prompt('בכמה ימים להאריך את הפרסום? (60 / 90 / מספר ימים)', '60')
    if (!days) return
    const n = Number(days)
    if (!Number.isFinite(n) || n <= 0) return notify('err', 'מספר ימים לא תקין.')
    const base = value.ends_at ? new Date(value.ends_at) : new Date()
    const next = new Date(base.getTime() + n * 864e5).toISOString()
    await run('הארכת פרסום', () => extend(asset!.id, next, `הארכה ידנית ב-${n} ימים`))
  }

  /* ────────────────────────── מצבי טעינה ────────────────────────── */

  if (isLoading) {
    return (
      <Shell title="נכס דנטלי" subtitle="" icon={Home}>
        <div className="flex items-center justify-center gap-3 rounded-[18px] border border-[#D9D9D9] bg-white p-10 text-[13px] font-semibold text-[#6B6B6B]">
          <RefreshCw className="h-5 w-5 animate-spin text-[#008080]" />
          טוען נכס…
        </div>
      </Shell>
    )
  }

  if (error || !asset) {
    return (
      <Shell title="נכס דנטלי" subtitle="" icon={Home}>
        <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-8">
          <EmptyState
            icon={Home}
            title="הנכס לא נמצא"
            description={`לא קיים נכס עם הקוד ${assetCode}.`}
            action={
              <ActionButton onClick={() => navigate('/admin/dental-assets')} variant="primary">
                חזרה לרשימה
              </ActionButton>
            }
          />
        </div>
      </Shell>
    )
  }

  const wf = HD_WORKFLOW[value.workflow_status] ?? { label: value.workflow_status, variant: 'neutral' as const }
  const pub = HD_PUBLICATION[value.publication_state] ?? { label: value.publication_state, variant: 'neutral' as const }
  const isPublished = value.publication_state === 'published'
  const coverUrl = publicImageUrl(images.find((i) => i.is_published)?.public_path ?? null)
  const daysLeft = value.ends_at
    ? Math.ceil((new Date(value.ends_at).getTime() - Date.now()) / 864e5)
    : null

  return (
    <Shell
      title={`${value.asset_code} · ${value.card_config?.title || value.internal_title || 'נכס דנטלי'}`}
      subtitle={`${value.clinic_name ?? 'ללא שם מרפאה'} · נוצר ${fmtDate(value.created_at)}`}
      icon={Home}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/dental-assets"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D9D9] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            לרשימה
          </Link>
          {isPublished && (
            <a
              href={`/dental-assets/${value.asset_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D9D9] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              לדף החי
            </a>
          )}
        </div>
      }
    >
      {/* ── סרגל מצב ופעולות ── */}
      <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#D9D9D9] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge label={wf.label} variant={wf.variant} />
          <AdminBadge label={pub.label} variant={pub.variant} />
          <span className="text-[13px] text-[#6B6B6B]">
            {value.package_days ? `${value.package_days} ימים` : 'ללא תקופה'}
            {value.screening_selected && ' · עם מיון'}
          </span>
          {value.ends_at && (
            <span className="text-[13px] text-[#6B6B6B]">
              · עד {fmtDate(value.ends_at)}
              {daysLeft !== null && (
                <span className={daysLeft <= 14 ? 'font-bold text-[#DC2626]' : ''}>
                  {' '}({daysLeft} ימים)
                </span>
              )}
            </span>
          )}
          {value.current_version > 0 && (
            <span className="text-[13px] text-[#9CA3AF]">· גרסה {value.current_version}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={() => setDraft({})}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D9D9] px-3 py-2 text-[13px] font-semibold text-[#6B6B6B] transition hover:bg-[#F3F4F6]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              ביטול שינויים
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => void save()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#008080] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {dirty ? 'שמירה' : 'אין שינויים'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPreview()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D9D9] px-4 py-2 text-[13px] font-bold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080] disabled:opacity-40"
          >
            <Eye className="h-3.5 w-3.5" />
            תצוגה מקדימה
          </button>
          <button
            type="button"
            disabled={busy || dirty}
            title={dirty ? 'יש לשמור לפני פרסום' : undefined}
            onClick={() =>
              void run(isPublished ? 'עדכון הפרסום' : 'פרסום', () =>
                isPublished ? publishUpdate(asset.id) : publish(asset.id),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#B45309] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#92400E] disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            {isPublished ? 'עדכון הפרסום' : 'פרסום'}
          </button>
          {isPublished && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doExtend()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D9D9] px-3 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080] disabled:opacity-40"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                הארכה
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('להסיר את הנכס מהאתר? הדף יציג "הפרסום אינו פעיל כרגע".'))
                    void run('הסרה מהאתר', () => unpublish(asset.id, 'הסרה ידנית מהאדמין'))
                }}
                className="rounded-xl border border-[#D9D9D9] px-3 py-2 text-[13px] font-semibold text-[#6B6B6B] transition hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-40"
              >
                הסרה
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-[13.5px] font-semibold ${
            toast.kind === 'ok'
              ? 'border-[#008080]/30 bg-[#E6F3F3] text-[#00615F]'
              : 'border-[#DC2626]/30 bg-[#FEF2F2] text-[#B91C1C]'
          }`}
        >
          {toast.text}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} dir="rtl" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#D9D9D9] sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['work', 'נתוני עבודה'],
            ['offers', 'מסלולי עסקה'],
            ['images', `תמונות (${images.length})`],
            ['publish', 'מה מתפרסם'],
            ['contact', 'קשר ו-CTA'],
            ['source', `מקור ופניות (${inquiries.length})`],
          ].map(([k, label]) => (
            <TabsTrigger
              key={k}
              value={k}
              className="rounded-xl text-[13px] data-[state=active]:bg-[#008080] data-[state=active]:text-white"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ נתוני עבודה ═══ */}
        <TabsContent value="work" className="mt-0">
          <AdminCard title="ניהול" description="שדות פנימיים. לא מתפרסמים לעולם.">
            <TextField
              label="כותרת עבודה"
              value={value.internal_title ?? ''}
              onChange={(v) => set('internal_title', v)}
              hint="לזיהוי ברשימה"
            />
            <SelectField
              label="מצב טיפול"
              value={value.workflow_status}
              onChange={(v) => set('workflow_status', v)}
              options={asFilterOptions(HD_WORKFLOW)}
              placeholder=""
            />
            <TextAreaField
              label="הערות פנימיות"
              value={value.admin_notes ?? ''}
              onChange={(v) => set('admin_notes', v)}
              rows={3}
            />
          </AdminCard>

          <AdminCard title="הנכס" description="נתוני העבודה. מה מהם יתפרסם נקבע בלשונית «מה מתפרסם».">
            <TextField
              label="שם המרפאה"
              value={value.clinic_name ?? ''}
              onChange={(v) => set('clinic_name', v)}
            />
            <SelectField
              label="סוג נכס"
              value={value.asset_type ?? ''}
              onChange={(v) => set('asset_type', v || null)}
              options={HD_ASSET_TYPES}
            />
            <SelectField
              label="סוג מרפאה"
              value={value.clinic_type ?? ''}
              onChange={(v) => set('clinic_type', v || null)}
              options={HD_CLINIC_TYPES}
            />
            <SelectField
              label="סוג מיקום"
              value={value.location_type ?? ''}
              onChange={(v) => set('location_type', v || null)}
              options={HD_LOCATION_TYPES}
            />

            <div className="sm:col-span-2">
              <FieldLabel hint="האזור נגזר אוטומטית מהעיר">עיר ואזור</FieldLabel>
              <CityRegionPicker
                cityId={value.city_id ?? null}
                regionId={value.region_id ?? null}
                onCityChange={(id) => set('city_id', id)}
                onRegionChange={() => {
                  /* האזור נגזר בטריגר DB מהעיר — אין כתיבה ידנית */
                }}
                variant="edit"
              />
            </div>

            <TextField label="רחוב" value={value.street ?? ''} onChange={(v) => set('street', v)} />
            <TextField
              label="מספר"
              value={value.street_number ?? ''}
              onChange={(v) => set('street_number', v)}
            />
            <TextField label="קומה" value={value.floor ?? ''} onChange={(v) => set('floor', v)} />
            <TextField
              label="כניסה"
              value={value.entrance ?? ''}
              onChange={(v) => set('entrance', v)}
            />

            <NumberField
              label='שטח (מ"ר)'
              value={value.area_sqm ?? null}
              onChange={(v) => set('area_sqm', v)}
              step="0.5"
            />
            <NumberField
              label="חדרי טיפול"
              value={value.rooms_count ?? null}
              onChange={(v) => set('rooms_count', v)}
            />
            <NumberField
              label="יוניטים"
              value={value.units_count ?? null}
              onChange={(v) => set('units_count', v)}
            />
            <NumberField
              label="ותק (שנים)"
              value={value.years_active ?? null}
              onChange={(v) => set('years_active', v)}
            />
            <TextAreaField
              label="הערות הלקוח"
              value={value.client_notes ?? ''}
              onChange={(v) => set('client_notes', v)}
              rows={3}
            />
          </AdminCard>

          <AdminCard title="ציוד ומאפיינים" grid={false}>
            <div className="grid gap-5 lg:grid-cols-2">
              {(
                [
                  ['accessibility', 'נגישות וסביבה', 'accessibility_ids', null],
                  ['premises', 'מה קיים בנכס', 'premises_feature_ids', null],
                  ['imaging', 'ציוד דימות', 'imaging_equipment_ids', 'imaging_notes'],
                  ['equipment', 'ציוד ומכשור', 'equipment_ids', 'equipment_notes'],
                  ['services', 'שירותים ותשתיות', 'service_ids', 'services_notes'],
                ] as const
              ).map(([group, title, idsKey, notesKey]) => (
                <div key={group}>
                  <FieldLabel>{title}</FieldLabel>
                  <DictionaryMultiSelect
                    options={(options?.[group] ?? []).map((o) => ({ id: o.id, name: o.name }))}
                    value={(value[idsKey] as number[]) ?? []}
                    onChange={(ids) => set(idsKey, ids as never)}
                    searchable={false}
                    grid
                  />
                  {notesKey && (
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13.5px] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
                      placeholder="הערה חופשית לקבוצה"
                      value={(value[notesKey] as string) ?? ''}
                      onChange={(e) => set(notesKey, e.target.value as never)}
                    />
                  )}
                </div>
              ))}
            </div>
          </AdminCard>
        </TabsContent>

        {/* ═══ מסלולי עסקה ═══ */}
        <TabsContent value="offers" className="mt-0">
          <AssetOffersEditor
            offers={offers}
            saleIncludeOptions={options?.sale_includes ?? []}
            busy={busy}
            onSave={async (o) => {
              await run('שמירת מסלול', () => m.saveOffer(o))
            }}
            onDelete={async (id) => {
              if (window.confirm('למחוק את המסלול?')) await run('מחיקת מסלול', () => m.deleteOffer(id))
            }}
          />
        </TabsContent>

        {/* ═══ תמונות ═══ */}
        <TabsContent value="images" className="mt-0">
          <AssetImagesManager
            images={images}
            assetCode={value.asset_code}
            busy={busy}
            onUpload={async (files) => {
              setBusy(true)
              try {
                let next = images.length
                for (const file of Array.from(files)) {
                  next += 1
                  const { error: e } = await m.uploadImage(file, value.asset_code, next)
                  if (e) {
                    notify('err', `העלאת ${file.name}: ${hdErrorToHebrew(e)}`)
                    return
                  }
                }
                notify('ok', 'התמונות הועלו.')
              } finally {
                setBusy(false)
              }
            }}
            onPublish={async (img: DentalAssetImage) => {
              await run('סימון לפרסום', () => m.publishImage(img, value.asset_code))
            }}
            onUnpublish={async (img) => {
              await run('הסרה מפרסום', () => m.unpublishImage(img))
            }}
            onUpdate={async (id, patch) => {
              await m.updateImage(id, patch)
            }}
            onDelete={async (img) => {
              if (window.confirm('למחוק את התמונה לצמיתות?'))
                await run('מחיקת תמונה', () => m.deleteImage(img))
            }}
            onReorder={async (ordered) => {
              await run('שינוי סדר', () => m.reorderImages(ordered))
            }}
          />
        </TabsContent>

        {/* ═══ מה מתפרסם ═══ */}
        <TabsContent value="publish" className="mt-0">
          <AssetPublishFields
            value={value.published_fields ?? []}
            onChange={(next) => set('published_fields', next)}
          />
          <AssetCardSeoEditor
            value={value.card_config ?? {}}
            onChange={(next: HdCardConfig) => set('card_config', next)}
            coverPath={coverUrl}
          />
        </TabsContent>

        {/* ═══ קשר ו-CTA ═══ */}
        <TabsContent value="contact" className="mt-0">
          <AssetContactCta
            contact={value.public_contact ?? {}}
            ctas={value.cta_buttons ?? []}
            onContactChange={(next: HdPublicContact) => set('public_contact', next)}
            onCtasChange={(next: HdCta[]) => set('cta_buttons', next)}
            clientContact={{
              name: value.client_name,
              phone: value.client_phone,
              whatsapp: value.client_whatsapp,
              email: value.client_email,
            }}
          />
        </TabsContent>

        {/* ═══ מקור ופניות ═══ */}
        <TabsContent value="source" className="mt-0">
          <AdminCard
            title="פרטי הלקוח"
            description="פרטיים לחלוטין. לא מתפרסמים בשום מסלול — גם לא כשבוחרים «פרטי הבעלים» בלשונית הקשר, שם הם רק ממלאים מראש."
          >
            <TextField
              label="שם"
              value={value.client_name ?? ''}
              onChange={(v) => set('client_name', v)}
            />
            <TextField
              label="שם עסק"
              value={value.client_business_name ?? ''}
              onChange={(v) => set('client_business_name', v)}
            />
            <TextField
              label="טלפון"
              value={value.client_phone ?? ''}
              onChange={(v) => set('client_phone', v)}
              dir="ltr"
            />
            <TextField
              label="וואטסאפ"
              value={value.client_whatsapp ?? ''}
              onChange={(v) => set('client_whatsapp', v)}
              dir="ltr"
            />
            <TextField
              label="אימייל"
              value={value.client_email ?? ''}
              onChange={(v) => set('client_email', v)}
              dir="ltr"
            />
            <TextAreaField
              label="הערות קשר"
              value={value.client_contact_notes ?? ''}
              onChange={(v) => set('client_contact_notes', v)}
              rows={2}
            />
          </AdminCard>

          <AdminCard
            title="הבקשה כפי שהתקבלה"
            description="קפוא. הטריגר ב-DB דוחה כל ניסיון לשנות את חומר המקור."
            grid={false}
          >
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                ['מקור', value.source === 'manual' ? 'הוזן ידנית' : 'טופס ציבורי'],
                ['תקופה שנבחרה', value.package_days ? `${value.package_days} ימים` : '—'],
                ['שירות מיון', value.screening_selected ? 'כן' : 'לא'],
                ['גרסת תנאים', value.terms_version ?? '—'],
                ['אישור תנאים', fmtDate(value.terms_accepted_at)],
                ['פרסום ראשון', fmtDate(value.first_published_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-[#F3F4F6] py-1.5">
                  <dt className="text-[12.5px] font-semibold text-[#6B6B6B]">{k}</dt>
                  <dd className="text-[13px] text-[#2D2D2D]">{v}</dd>
                </div>
              ))}
            </dl>
            {value.submission_snapshot && (
              <details className="mt-4">
                <summary className="cursor-pointer text-[13px] font-semibold text-[#008080]">
                  הצגת ההגשה המלאה
                </summary>
                <pre
                  dir="ltr"
                  className="mt-2 max-h-[320px] overflow-auto rounded-xl bg-[#FAFAF7] p-3 text-[11.5px] leading-5 text-[#2D2D2D]"
                >
                  {JSON.stringify(value.submission_snapshot, null, 2)}
                </pre>
              </details>
            )}
          </AdminCard>

          <AdminCard
            title={`פניות (${inquiries.length})`}
            description="פניות שהגיעו מטופס הנכס. לחיצה על וואטסאפ או טלפון בדף אינה יוצרת פנייה."
            grid={false}
          >
            <AdminTable
              columns={[
                { key: 'created_at', label: 'תאריך', render: (r) => fmtDate(r.created_at) },
                { key: 'name', label: 'שם' },
                {
                  key: 'phone',
                  label: 'טלפון',
                  render: (r) => <span dir="ltr">{formatPhone(r.phone)}</span>,
                },
                { key: 'offer_label', label: 'מסלול', render: (r) => r.offer_label ?? '—' },
                {
                  key: 'status',
                  label: 'סטטוס',
                  render: (r) => (
                    <select
                      value={r.status}
                      onChange={(e) => void m.saveInquiry(r.id, { status: e.target.value })}
                      className="h-8 rounded-lg border border-[#D9D9D9] bg-white px-2 text-[12.5px] outline-none focus:border-[#008080]"
                    >
                      {asFilterOptions(HD_INQUIRY).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ),
                },
                { key: 'message', label: 'הודעה', render: (r) => r.message ?? '—' },
              ]}
              data={inquiries}
              keyField="id"
              emptyMessage="אין עדיין פניות לנכס הזה."

            />
          </AdminCard>
        </TabsContent>
      </Tabs>

      {/* ── תצוגה מקדימה: אותו רכיב שמרנדר את הדף החי ── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-[18px] bg-[#1E1E1E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="text-[13px] font-semibold text-white/70">
                תצוגה מקדימה · {value.asset_code}
                <span className="ms-2 text-white/40">
                  זה בדיוק מה שיפורסם — אותו רכיב ואותו payload
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-xl border border-white/20 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white hover:text-[#1E1E1E]"
              >
                סגירה
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DentalAssetPageBody page={preview} expiresAt={value.ends_at} preview />
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
