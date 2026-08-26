/**
 * INC-3130 · HOME DENT — יצירת נכס ידנית באדמין (§37).
 *
 * החלטה 11: גם נכס שנוצר ידנית מקבל תקופת פרסום ובחירת שירות מיון,
 * בדיוק כמו נכס שהגיע מהטופס. אין נכס בלי תקופה — זה מונע חריגים
 * בכל מה שמסתמך על package_days ועל שעון 60/90.
 *
 * `source = 'manual'` ו-`submission_snapshot` נשאר NULL, כי אין כאן
 * חומר גלם של לקוח. הטריגר שמקפיא את המקור לא מופעל על NULL.
 *
 * `asset_code` נקבע ב-DB מ-sequence ולכן לא נשלח מכאן — הוא נשלף
 * בחזרה כדי לנווט למסך הנכס.
 *
 * הדיאלוג, הפיקר והשדות הם רכיבי המערכת. אין כאן עיצוב מקומי.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { FieldLabel, SelectField, TextField } from '@/components/ui/AdminField'
import { supabase } from '@/lib/supabase'
import { HD_ASSET_TYPES, hdErrorToHebrew } from '@/lib/homeDentOptions'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'

const PACKAGES = [
  { days: 60, label: '60 ימי פרסום' },
  { days: 90, label: '90 ימי פרסום' },
] as const

export function CreateAssetDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    internal_title: '',
    clinic_name: '',
    asset_type: '',
    city_id: null as number | null,
    package_days: 60 as 60 | 90,
    screening_selected: false,
    client_name: '',
    client_phone: '',
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function create() {
    setError(null)
    if (!form.internal_title.trim() && !form.clinic_name.trim()) {
      return setError('נא למלא כותרת עבודה או שם מרפאה, כדי שאפשר יהיה לזהות את הנכס ברשימה.')
    }
    // טלפון אינו חובה, אבל אם הוזן הוא חייב להיות תקין — אחרת הוא נשמר
    // במצב שלא ניתן להתקשר אליו ואף אחד לא יבחין בכך.
    if (form.client_phone.trim() && !normalizeIlMobile(form.client_phone)) {
      return setError(IL_MOBILE_ERROR)
    }

    setSaving(true)
    try {
      const { data, error: e } = await supabase
        .from('dental_assets')
        .insert({
          source: 'manual',
          workflow_status: 'in_progress',
          internal_title: form.internal_title.trim() || null,
          clinic_name: form.clinic_name.trim() || null,
          asset_type: form.asset_type || null,
          city_id: form.city_id,
          package_days: form.package_days,
          screening_selected: form.screening_selected,
          client_name: form.client_name.trim() || null,
          client_phone: form.client_phone.trim() || null,
          client_phone_norm: normalizeIlMobile(form.client_phone) || null,
        })
        .select('asset_code')

      if (e) {
        setError(hdErrorToHebrew(e))
        return
      }
      // RLS מחזיר הצלחה עם 0 שורות כשההרשאה חסרה — בלי הבדיקה הזו
      // הדיאלוג היה נסגר כאילו הנכס נוצר.
      const code = data?.[0]?.asset_code
      if (!code) {
        setError('הנכס לא נוצר — ייתכן שאין הרשאה. רעננו ונסו שוב.')
        return
      }
      toast.success(`נוצר נכס ${code}`)
      onCreated()
      onClose()
      navigate(`/admin/dental-assets/${code}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>נכס חדש</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-6 text-[#6B6B6B]">
          זה יוצר טיוטה בלבד. שאר הפרטים, התמונות ובחירת מה מתפרסם נעשים במסך
          הנכס, והנכס לא עולה לאתר עד לחיצה על «פרסום».
        </p>

        <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <TextField
            label="כותרת עבודה"
            value={form.internal_title}
            onChange={(v) => set('internal_title', v)}
            placeholder="מרפאה ברמת גן — פנייה מאפי"
            hint="פנימי, לזיהוי ברשימה"
            full
          />
          <TextField
            label="שם המרפאה"
            value={form.clinic_name}
            onChange={(v) => set('clinic_name', v)}
          />
          <SelectField
            label="סוג נכס"
            value={form.asset_type}
            onChange={(v) => set('asset_type', v)}
            options={HD_ASSET_TYPES}
          />

          <div className="sm:col-span-2">
            <FieldLabel hint="האזור נגזר אוטומטית">עיר</FieldLabel>
            <CityRegionPicker
              cityId={form.city_id}
              regionId={null}
              onCityChange={(id) => set('city_id', id)}
              onRegionChange={() => {
                /* האזור נכתב בטריגר DB לפי העיר */
              }}
              variant="edit"
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel hint="חובה — אין נכס בלי תקופת פרסום">תקופת פרסום</FieldLabel>
            <div className="flex gap-2">
              {PACKAGES.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => set('package_days', p.days)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-bold transition ${
                    form.package_days === p.days
                      ? 'border-[#008080] bg-[#E6F3F3] text-[#008080]'
                      : 'border-[#D9D9D9] text-[#6B6B6B] hover:border-[#008080]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-[#9CA3AF]">
              השעון מתחיל רק בפרסום הראשון, לא עכשיו.
            </p>
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>טיפול בפניות</FieldLabel>
            <div className="flex gap-2">
              {[
                { v: false, label: 'ישירות לבעלים' },
                { v: true, label: 'מיון וסינון AllDent' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => set('screening_selected', o.v)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-bold transition ${
                    form.screening_selected === o.v
                      ? 'border-[#008080] bg-[#E6F3F3] text-[#008080]'
                      : 'border-[#D9D9D9] text-[#6B6B6B] hover:border-[#008080]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="שם איש קשר"
            value={form.client_name}
            onChange={(v) => set('client_name', v)}
            hint="פרטי — לא מתפרסם"
          />
          <TextField
            label="טלפון"
            value={form.client_phone}
            onChange={(v) => set('client_phone', v)}
            dir="ltr"
            hint="פרטי — לא מתפרסם"
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-[#DC2626]">
            {error}
          </p>
        )}

        <DialogFooter className="mt-5 gap-2">
          <ActionButton variant="secondary" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" onClick={() => void create()} disabled={saving}>
            {saving ? 'יוצר…' : 'יצירה ומעבר לנכס'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
