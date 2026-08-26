/**
 * INC-3130 · HOME DENT — מסלולי עסקה.
 *
 * ⚠️ `price_unit` לא נבחר ביד לעולם. שני אילוצים ב-DB קושרים אותו:
 * מחיר בלי יחידה נדחה, ויחידה שאינה תואמת לסוג העסקה נדחית. לכן הוא
 * נגזר כאן מ-offer_type ונשלח תמיד — בורר ידני היה מייצר שגיאת DB
 * שהמשתמשת לא יכולה לתקן.
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  HD_OFFER_TYPES,
  HD_WEEKDAYS,
  type HdOfferType,
} from '@/lib/homeDentOptions'
import type { HdOption } from '@/hooks/useDentalAssetOptions'
import type { DentalAssetOffer } from '@/hooks/useDentalAsset'
import {
  AdminCard,
  CheckField,
  FieldLabel,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/AdminField'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'

const PRICE_UNIT: Record<HdOfferType, string> = {
  sale: 'total',
  rent_monthly: 'per_month',
  rent_daily: 'per_day',
  rent_shift: 'per_shift',
}

export function priceUnitFor(offerType: HdOfferType): string {
  return PRICE_UNIT[offerType]
}

type Draft = Partial<DentalAssetOffer> & { offer_type: HdOfferType }

export function AssetOffersEditor({
  offers,
  saleIncludeOptions,
  onSave,
  onDelete,
  busy,
}: {
  offers: DentalAssetOffer[]
  saleIncludeOptions: HdOption[]
  onSave: (offer: Partial<DentalAssetOffer> & { id?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  busy: boolean
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  function startNew() {
    setEditingId(null)
    setDraft({
      offer_type: 'rent_monthly',
      days: [],
      sale_include_ids: [],
      is_active: true,
      sort_order: offers.length + 1,
    })
  }

  function startEdit(o: DentalAssetOffer) {
    setEditingId(o.id)
    setDraft({ ...o, offer_type: o.offer_type })
  }

  async function submit() {
    if (!draft) return
    const body: Partial<DentalAssetOffer> & { id?: string } = {
      ...draft,
      id: editingId ?? undefined,
      price_unit: priceUnitFor(draft.offer_type),
      // מחרוזת ריקה בשדה תאריך נדחית ע"י Postgres. null הוא הערך הנכון.
      available_from: draft.available_from || null,
      days: draft.days ?? [],
      sale_include_ids: draft.offer_type === 'sale' ? (draft.sale_include_ids ?? []) : [],
    }
    await onSave(body)
    setDraft(null)
    setEditingId(null)
  }

  const typeMeta = draft ? HD_OFFER_TYPES.find((t) => t.value === draft.offer_type) : undefined

  return (
    <AdminCard
      title="מסלולי עסקה"
      description="כל מסלול מתפרסם כקוביה נפרדת בדף. מסלול לא פעיל אינו מתפרסם ואינו נספר בכרטיס הלוח."
      grid={false}
      action={
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#008080] px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-[#006D6D]"
        >
          <Plus className="h-3.5 w-3.5" />
          מסלול חדש
        </button>
      }
    >
      {!offers.length && !draft && (
        <p className="py-3 text-[13px] text-[#9CA3AF]">
          אין עדיין מסלולי עסקה. אפשר לפרסם נכס בלי מסלול, אבל אז לא יופיע בדף שום מחיר או זמינות.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {offers.map((o) => {
          const meta = HD_OFFER_TYPES.find((t) => t.value === o.offer_type)
          return (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9D9D9] px-4 py-3"
            >
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-[#2D2D2D]">{meta?.label ?? o.offer_type}</span>
                {!o.is_active && (
                  <span className="ms-2 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#6B6B6B]">
                    לא פעיל
                  </span>
                )}
                <span className="ms-3 text-[13px] text-[#6B6B6B]">
                  {o.price_amount != null
                    ? `${new Intl.NumberFormat('he-IL').format(o.price_amount)} ₪`
                    : o.price_note || 'ללא מחיר'}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(o)}
                  className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[13px] font-semibold text-[#2D2D2D] transition hover:border-[#008080] hover:text-[#008080]"
                >
                  עריכה
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(o.id)}
                  className="rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-[#6B6B6B] transition hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {draft && (
        <div className="mt-4 rounded-[18px] border-2 border-[#008080]/30 bg-[#F7FBFB] p-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <SelectField
              label="סוג עסקה"
              value={draft.offer_type}
              onChange={(v) => setDraft({ ...draft, offer_type: v as HdOfferType })}
              options={HD_OFFER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              placeholder=""
              hint={typeMeta?.hint}
            />
            <NumberField
              label={typeMeta?.priceLabel ?? 'מחיר'}
              value={draft.price_amount ?? null}
              onChange={(v) => setDraft({ ...draft, price_amount: v })}
              hint="ריק = לא יוצג מחיר"
            />
            <TextField
              label="הערת מחיר"
              value={draft.price_note ?? ''}
              onChange={(v) => setDraft({ ...draft, price_note: v })}
              placeholder='למשל: "מחיר יימסר בשיחה"'
              hint="מלל חופשי שלך — לא סטטוס"
              full
            />
            <TextField
              label="זמין מתאריך"
              type="date"
              value={draft.available_from ?? ''}
              onChange={(v) => setDraft({ ...draft, available_from: v })}
            />
            <TextField
              label="הערת זמינות"
              value={draft.availability_note ?? ''}
              onChange={(v) => setDraft({ ...draft, availability_note: v })}
              placeholder="מיידית / בתיאום"
            />

            <div className="sm:col-span-2">
              <FieldLabel hint="רלוונטי בעיקר להשכרה יומית או לפי משמרת">ימים</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {HD_WEEKDAYS.map((d) => {
                  const on = (draft.days ?? []).includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          days: on
                            ? (draft.days ?? []).filter((x) => x !== d.value)
                            : [...(draft.days ?? []), d.value].sort((a, b) => a - b),
                        })
                      }
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                        on
                          ? 'bg-[#008080] text-white'
                          : 'border border-[#D9D9D9] bg-white text-[#6B6B6B] hover:border-[#008080]'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <TextField
              label="שעות"
              value={draft.hours ?? ''}
              onChange={(v) => setDraft({ ...draft, hours: v })}
              placeholder="08:00–20:00 / משמרת בוקר"
              full
            />

            {draft.offer_type === 'sale' && (
              <div className="sm:col-span-2">
                <FieldLabel>מה כלול במכירה</FieldLabel>
                <DictionaryMultiSelect
                  options={saleIncludeOptions.map((o) => ({ id: o.id, name: o.name }))}
                  value={draft.sale_include_ids ?? []}
                  onChange={(ids) => setDraft({ ...draft, sale_include_ids: ids })}
                  searchable={false}
                  grid
                />
              </div>
            )}

            <TextAreaField
              label="מה כלול (מלל)"
              value={draft.included_note ?? ''}
              onChange={(v) => setDraft({ ...draft, included_note: v })}
              rows={2}
            />
            <TextAreaField
              label="עלויות נוספות"
              value={draft.extra_costs_note ?? ''}
              onChange={(v) => setDraft({ ...draft, extra_costs_note: v })}
              rows={2}
              hint="ארנונה, חשמל, ועד בית"
            />
            <TextAreaField
              label="תנאים"
              value={draft.terms_note ?? ''}
              onChange={(v) => setDraft({ ...draft, terms_note: v })}
              rows={2}
            />
            <TextAreaField
              label="הערה פנימית"
              value={draft.notes ?? ''}
              onChange={(v) => setDraft({ ...draft, notes: v })}
              rows={2}
              hint="לא מתפרסם"
            />

            <div className="sm:col-span-2">
              <CheckField
                checked={draft.is_active !== false}
                onChange={(v) => setDraft({ ...draft, is_active: v })}
                label="מסלול פעיל"
                hint="מסלול שאינו פעיל לא נכנס לפרסום כלל"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-xl bg-[#008080] px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-40"
            >
              {editingId ? 'שמירת המסלול' : 'הוספת המסלול'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setEditingId(null)
              }}
              className="rounded-xl border border-[#D9D9D9] px-5 py-2.5 text-[13.5px] font-semibold text-[#6B6B6B] transition hover:bg-[#F5F5F5]"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </AdminCard>
  )
}
