import { useState } from 'react'
import { UserPlus, X, ShieldAlert } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import {
  classifyFacebookValue,
  isValidILMobile,
  normalizeEmail,
  normalizeText,
  phoneCompareKey,
} from '@/lib/inbox-v2-merge'
import { toast } from 'sonner'

interface Props {
  leadId: number
  onClose: () => void
}

/**
 * יצירת איש קשר חדש מרשומת Inbox.
 *
 * מטפל אך ורק בעשרת השדות המאושרים בחוזה המסך.
 * full_name / first_name / last_name אינם נכתבים — פיצול שם הוא באחריות n8n.
 * תפקיד ועיר לקריאה בלבד: מגיעים כמזהי מילון מ-n8n, ואין הקלדה חופשית.
 */
export function CreateFromLeadDialog({ leadId, onClose }: Props) {
  const { data: row } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { insertContact } = useContactMutations()
  const { data: dicts } = useApplicationDicts()
  const { data: cities } = useInboxV2Cities()
  const { user } = useAuth()

  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    second_phone: '',
    email: '',
    second_email: '',
    facebook_name: '',
    facebook_id: '',
    facebook_url: '',
  })

  if (row && !initialized) {
    setForm({
      display_name: row.display_name ?? '',
      phone: row.phone ?? '',
      second_phone: row.second_phone ?? '',
      email: row.email ?? '',
      second_email: row.second_email ?? '',
      facebook_name: row.facebook_name ?? '',
      facebook_id: row.facebook_id ?? '',
      facebook_url: row.facebook_url ?? '',
    })
    setInitialized(true)
  }

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const roleLabel = row?.temp_role != null ? getDictLabel(dicts?.roles, row.temp_role) : null
  const cityLabel =
    row?.temp_city_id != null
      ? (cities?.find((c) => c.id === row.temp_city_id)?.name ?? String(row.temp_city_id))
      : null

  const handleCreate = async () => {
    if (!row) return

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
    // second_phone הוא שדה של נייד נוסף — מספר קווי/077 לא נשמר גם שם.
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
    // trg_contact_set_phone_norm דורש לפחות מזהה אחד.
    if (!phone && !email && !facebookId && !facebookUrl) {
      toast.error('נדרש לפחות אחד מהשדות: נייד, מייל, מזהה Facebook או קישור Facebook')
      return
    }

    const samePhone = !!phone && phoneCompareKey(phone) === phoneCompareKey(secondPhone)
    const sameEmail = !!email && email === secondEmail

    setSaving(true)
    try {
      // full_name / first_name / last_name לא נכתבים — לא בחוזה המסך.
      // phone_norm לא נשלח — הטריגר מחשב אותו מ-phone.
      const payload: Record<string, unknown> = {
        display_name: displayName,
        phone: phone || null,
        second_phone: samePhone ? null : secondPhone || null,
        email: email || null,
        second_email: sameEmail ? null : secondEmail || null,
        role: row.temp_role ?? null,
        city_id: row.temp_city_id ?? null,
        facebook_name: facebookName || null,
        facebook_id: facebookId || null,
        facebook_url: facebookUrl || null,
      }

      const { data: newContact, error } = await insertContact(payload)
      if (error) throw error
      if (!newContact) throw new Error('לא התקבל מזהה איש קשר')

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

      toast.success(`איש קשר חדש נוצר (#${newContact.contact_id})`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת איש קשר')
    } finally {
      setSaving(false)
    }
  }

  if (!row) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-lg items-center justify-center p-4">
        <div className="max-h-[88vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl" dir="rtl">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#008080]" />
              <h2 className="text-base font-bold text-[#2D2D2D]">יצירת איש קשר חדש</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <FormField label="שם תצוגה *" value={form.display_name} onChange={(v) => set('display_name', v)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="נייד ראשי" value={form.phone} onChange={(v) => set('phone', v)} dir="ltr" />
              <FormField label="נייד נוסף" value={form.second_phone} onChange={(v) => set('second_phone', v)} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="מייל ראשי" value={form.email} onChange={(v) => set('email', v)} dir="ltr" />
              <FormField label="מייל נוסף" value={form.second_email} onChange={(v) => set('second_email', v)} dir="ltr" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="תפקיד" value={roleLabel} empty="לא זוהה — לא ייכתב" />
              <ReadOnlyField label="עיר" value={cityLabel} empty="לא זוהתה — לא תיכתב" />
            </div>

            <FormField label="שם Facebook" value={form.facebook_name} onChange={(v) => set('facebook_name', v)} />
            <FormField label="מזהה Facebook (ספרות בלבד)" value={form.facebook_id} onChange={(v) => set('facebook_id', v)} dir="ltr" />
            <FormField label="קישור Facebook" value={form.facebook_url} onChange={(v) => set('facebook_url', v)} dir="ltr" />

            <div className="flex items-start gap-2 rounded-[10px] bg-[#F8F9FA] px-3 py-2 text-[12px] text-[#6B6B6B]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
              <span>האזור נגזר אוטומטית מהעיר. שם פרטי, שם משפחה ושם מלא אינם נכתבים במסלול זה.</span>
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

          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              ביטול
            </button>
            <ActionButton variant="primary" icon={UserPlus} onClick={handleCreate} disabled={saving || !confirmed}>
              {saving ? 'שומר...' : 'צור איש קשר'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
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
