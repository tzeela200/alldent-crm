import { useState } from 'react'
import { UserPlus, ShieldAlert } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useContactMutations } from '@/hooks/useContactMutations'
import { lookupPhonesByNorm } from '@/hooks/useInboxPhoneCheck'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import { normalizeIlMobile } from '@/lib/normalizePhone'
import {
  classifyFacebookValue,
  deriveGenderFromSource,
  isValidILMobile,
  normalizeEmail,
  normalizeText,
  phoneCompareKey,
} from '@/lib/inbox-v2-merge'
import { useGenders } from '@/hooks/useGenders'
import { toast } from 'sonner'

/** ערכי פתיחה כשאין שורת Inbox (למשל ממסך בדיקת המספרים). */
export interface ContactPrefill {
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  second_phone?: string | null
  email?: string | null
  second_email?: string | null
  facebook_name?: string | null
  facebook_id?: string | null
  facebook_url?: string | null
  role?: number | null
  city_id?: number | null
}

interface Props {
  /** שורת Inbox שממנה נוצר איש הקשר. null כשהיצירה מגיעה ממסלול אחר. */
  leadId?: number | null
  /** ערכי פתיחה ישירים — משמשים כשאין leadId. */
  prefill?: ContactPrefill
  onClose: () => void
  /** נקרא אחרי יצירה מוצלחת, לרענון המסך הקורא. */
  onCreated?: (contactId: number) => void
}

/**
 * יצירת איש קשר חדש — **מרכיב את רכיבי הבחירה המשותפים של AllDent**
 * ואינו מגדיר בוררי תפקיד/עיר משלו (INC-3125).
 *
 * `RoleSubRolePicker` ו-`CityRegionPicker` טוענים בעצמם את המילונים החיים
 * מ-Supabase ומחזירים מזהים אמיתיים; האזור נגזר מהעיר בתוך הרכיב, ואין כאן
 * מיפוי עיר→אזור מקומי. אותם רכיבים משמשים גם במסך הקליטה התעסוקתית.
 *
 * המידע שהגיע מהמקור הוא **ערכי פתיחה בלבד** — כל שדה ניתן לעריכה לפני
 * היצירה. קודם תפקיד ועיר הוצגו לקריאה בלבד ("לא זוהה — לא ייכתב"),
 * כלומר רשומה בלי תפקיד/עיר נוצרה בלי אפשרות להשלים אותם כאן.
 */
export function CreateFromLeadDialog({ leadId, prefill, onClose, onCreated }: Props) {
  const { data: row } = useInboxV2Row(leadId ?? null)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { insertContact } = useContactMutations()
  const { data: cities } = useInboxV2Cities()
  const { data: genders } = useGenders()
  const { user } = useAuth()

  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [roleId, setRoleId] = useState<number | null>(prefill?.role ?? null)
  const [subRoleIds, setSubRoleIds] = useState<number[]>([])
  const [cityId, setCityId] = useState<number | null>(prefill?.city_id ?? null)
  const [regionId, setRegionId] = useState<number | null>(null)
  const [genderId, setGenderId] = useState<number | null>(null)
  const [form, setForm] = useState({
    display_name: prefill?.display_name ?? '',
    first_name: prefill?.first_name ?? '',
    last_name: prefill?.last_name ?? '',
    phone: prefill?.phone ?? '',
    second_phone: prefill?.second_phone ?? '',
    email: prefill?.email ?? '',
    second_email: prefill?.second_email ?? '',
    facebook_name: prefill?.facebook_name ?? '',
    facebook_id: prefill?.facebook_id ?? '',
    facebook_url: prefill?.facebook_url ?? '',
  })

  // מילוי מראש מתוך שורת ה-Inbox, פעם אחת.
  if (row && !initialized && cities) {
    setForm({
      display_name: row.display_name ?? '',
      // אין פיצול שם אוטומטי: נכתבים רק כשהמקור סיפק אותם בנפרד.
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      phone: row.phone ?? '',
      second_phone: row.second_phone ?? '',
      email: row.email ?? '',
      second_email: row.second_email ?? '',
      facebook_name: row.facebook_name ?? '',
      facebook_id: row.facebook_id ?? '',
      facebook_url: row.facebook_url ?? '',
    })
    setRoleId(row.temp_role ?? null)
    setCityId(row.temp_city_id ?? null)
    // האזור נגזר מהעיר גם כשהעיר הגיעה כערך פתיחה. `CityRegionPicker`
    // גוזר אותו רק כשהמשתמשת בוחרת בעצמה, ולכן prefill השאיר אותו ריק.
    if (row.temp_city_id != null) {
      const city = cities?.find((c) => c.id === row.temp_city_id)
      if (city?.region_id != null) setRegionId(city.region_id)
    }
    // "מועמדת" ⇒ נקבה · "דנטל" ⇒ זכר. שני הכינויים ממופים לתפקיד הכללי
    // ולכן התפקיד לבדו אינו מבחין ביניהם — הכינוי כן.
    setGenderId(deriveGenderFromSource(row))
    setInitialized(true)
  }

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleCreate = async () => {
    const displayName = normalizeText(form.display_name)
    if (!displayName) {
      toast.error('שם תצוגה הוא שדה חובה')
      return
    }

    const phone = normalizeText(form.phone)
    const secondPhone = normalizeText(form.second_phone)
    const email = normalizeEmail(form.email)
    const secondEmail = normalizeEmail(form.second_email)
    const facebookId = normalizeText(form.facebook_id)
    const facebookUrl = normalizeText(form.facebook_url)
    const facebookName = normalizeText(form.facebook_name)

    // trg_contact_set_phone_norm זורק חריגה על מספר שאינו נייד ישראלי תקין.
    if (phone && !isValidILMobile(phone)) {
      toast.error('הנייד הראשי אינו נייד ישראלי תקין — לא ניתן לשמור אותו')
      return
    }
    if (secondPhone && !isValidILMobile(secondPhone)) {
      toast.error('הנייד הנוסף אינו נייד ישראלי תקין — לא ניתן לשמור אותו')
      return
    }
    if (facebookId && classifyFacebookValue(facebookId) !== 'id') {
      toast.error('מזהה Facebook חייב להיות ספרות בלבד')
      return
    }
    if (!phone && !email && !facebookId && !facebookUrl) {
      toast.error('נדרש לפחות אחד מהשדות: נייד, מייל, מזהה Facebook או קישור Facebook')
      return
    }

    const samePhone = !!phone && phoneCompareKey(phone) === phoneCompareKey(secondPhone)
    const sameEmail = !!email && email === secondEmail

    setSaving(true)
    try {
      // בדיקת כפילות לפני יצירה: איש קשר קיים עם אותו נייד מנורמל.
      // אין התאמה לפי שם בלבד — שם אינו הוכחת זהות.
      const norms = [normalizeIlMobile(phone), normalizeIlMobile(secondPhone)].filter(
        (n): n is string => !!n
      )
      if (norms.length) {
        const existing = await lookupPhonesByNorm(norms)
        const contactHit = [...existing.values()].flat().find((m) => m.kind === 'contact')
        if (contactHit) {
          toast.error(
            `הנייד כבר משויך לאיש קשר קיים: ${contactHit.name}. יש לעדכן את הרשומה הקיימת במקום ליצור חדשה.`
          )
          setSaving(false)
          return
        }
      }

      // phone_norm והאזור אינם נשלחים — נגזרים בטריגרים של הטבלה.
      const payload: Record<string, unknown> = {
        display_name: displayName,
        first_name: normalizeText(form.first_name) || null,
        last_name: normalizeText(form.last_name) || null,
        phone: phone || null,
        second_phone: samePhone ? null : secondPhone || null,
        email: email || null,
        second_email: sameEmail ? null : secondEmail || null,
        role: roleId,
        city_id: cityId,
        gender: genderId,
        facebook_name: facebookName || null,
        facebook_id: facebookId || null,
        facebook_url: facebookUrl || null,
      }
      if (subRoleIds.length) payload.sub_role = subRoleIds

      const { data: newContact, error } = await insertContact(payload)
      if (error) throw error
      if (!newContact) throw new Error('לא התקבל מזהה איש קשר')

      // קישור שורת ה-Inbox לאיש הקשר החדש + audit, רק כשהיצירה הגיעה משורה.
      if (leadId != null) {
        await updateRow.mutateAsync({
          leadId,
          updates: { merge_status: 6, match_contact: newContact.contact_id },
        })
        await logAction.mutateAsync({
          lead_id: leadId,
          target_type: 'contact',
          target_id: newContact.contact_id,
          action_type: INBOX_ACTION.CREATE_CONTACT,
          updates_applied: payload,
          approved_by: user?.email ?? null,
        })
      }

      toast.success(`איש קשר חדש נוצר: ${displayName}`)
      onCreated?.(newContact.contact_id)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת איש קשר')
    } finally {
      setSaving(false)
    }
  }

  // כשיש leadId אך השורה עדיין נטענת — לא מציגים טופס חצי-ריק.
  if (leadId != null && !row) return null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#008080]" />
            יצירת איש קשר חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="שם תצוגה *" value={form.display_name} onChange={(v) => set('display_name', v)} />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="שם פרטי" value={form.first_name} onChange={(v) => set('first_name', v)} />
            <FormField label="שם משפחה" value={form.last_name} onChange={(v) => set('last_name', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="נייד ראשי" value={form.phone} onChange={(v) => set('phone', v)} dir="ltr" />
            <FormField label="נייד נוסף" value={form.second_phone} onChange={(v) => set('second_phone', v)} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="מייל ראשי" value={form.email} onChange={(v) => set('email', v)} dir="ltr" />
            <FormField label="מייל נוסף" value={form.second_email} onChange={(v) => set('second_email', v)} dir="ltr" />
          </div>

          {/* בוררי המילונים המשותפים — אותם רכיבים של שאר האדמין */}
          <RoleSubRolePicker
            roleId={roleId}
            subRoleIds={subRoleIds}
            onRoleChange={setRoleId}
            onSubRoleChange={setSubRoleIds}
            variant="edit"
          />
          <CityRegionPicker
            cityId={cityId}
            regionId={regionId}
            onCityChange={(id) => {
              setCityId(id)
              const city = id != null ? cities?.find((c) => c.id === id) : null
              if (city?.region_id != null) setRegionId(city.region_id)
            }}
            onRegionChange={setRegionId}
            variant="edit"
          />

          {/* מגדר — מילון חי. נקבע מראש מכינוי התפקיד שהגיע מהמקור
              ("מועמדת" ⇒ נקבה · "דנטל" ⇒ זכר), וניתן לשינוי. */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-[#6B6B6B]">מגדר</label>
            <select
              value={genderId != null ? String(genderId) : ''}
              onChange={(e) => setGenderId(e.target.value ? Number(e.target.value) : null)}
              className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
            >
              <option value="">— לא נקבע —</option>
              {(genders ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <FormField label="שם Facebook" value={form.facebook_name} onChange={(v) => set('facebook_name', v)} />
          <FormField label="מזהה Facebook (ספרות בלבד)" value={form.facebook_id} onChange={(v) => set('facebook_id', v)} dir="ltr" />
          <FormField label="קישור Facebook" value={form.facebook_url} onChange={(v) => set('facebook_url', v)} dir="ltr" />

          <div className="flex items-start gap-2 rounded-[10px] bg-[#F8F9FA] px-3 py-2 text-[12px] text-[#6B6B6B]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
            <span>
              האזור נגזר אוטומטית מהעיר. שם פרטי ומשפחה נשמרים רק כפי שהוזנו — אין פיצול
              אוטומטי של שם מלא.
            </span>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 accent-[#008080]"
            />
            אני מאשרת יצירת איש קשר חדש
          </label>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            ביטול
          </button>
          <ActionButton variant="primary" icon={UserPlus} onClick={handleCreate} disabled={saving || !confirmed}>
            {saving ? 'שומר...' : 'צור איש קשר'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FormField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  dir?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-semibold text-[#6B6B6B]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
      />
    </div>
  )
}

export function ReadOnlyField({
  label,
  value,
  empty,
}: {
  label: string
  value: string | null
  empty: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-semibold text-[#6B6B6B]">{label}</label>
      <div className="flex h-10 items-center rounded-[10px] bg-[#F3F4F6] px-3 text-sm text-[#2D2D2D]">
        {value ?? <span className="text-[#9CA3AF]">{empty}</span>}
      </div>
    </div>
  )
}
