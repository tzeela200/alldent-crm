import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useContactMutations } from '@/hooks/useContactMutations'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import { toast } from 'sonner'

interface Props {
  leadId: number
  onClose: () => void
}

export function CreateFromLeadDialog({ leadId, onClose }: Props) {
  const { data: row } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { insertContact } = useContactMutations()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    display_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    facebook_url: '',
    facebook_id: '',
    linkedin_url: '',
  })

  // Initialize form from row data once loaded
  const [initialized, setInitialized] = useState(false)
  if (row && !initialized) {
    setForm({
      display_name: row.display_name ?? '',
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      facebook_url: row.facebook_url ?? '',
      facebook_id: row.facebook_id ?? '',
      linkedin_url: row.linkedin_url ?? '',
    })
    setInitialized(true)
  }

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleCreate = async () => {
    if (!form.display_name.trim()) {
      toast.error('שם תצוגה הוא שדה חובה')
      return
    }

    setSaving(true)
    try {
      // איחוד עמודת שם: full_name (שדה ההתאמה של match_inbox_row) לצד display_name.
      const fullName =
        [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ') ||
        form.display_name.trim()

      const payload = {
        display_name: form.display_name.trim(),
        full_name: fullName,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        phone_norm: row?.phone_norm || null,
        email: form.email.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        facebook_id: form.facebook_id.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
      }

      const { data: newContact, error } = await insertContact(payload)
      if (error) throw error
      if (!newContact) throw new Error('לא התקבל מזהה איש קשר')

      await updateRow.mutateAsync({
        leadId,
        updates: {
          merge_status: 6,
          match_contact: newContact.contact_id,
        },
      })

      await logAction.mutateAsync({
        lead_id: leadId,
        target_type: 'contact',
        target_id: newContact.contact_id,
        action_type: INBOX_ACTION.CREATE_CONTACT,
        updates_applied: payload,
        approved_by: null,
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
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-lg items-center justify-center p-4">
        <div className="max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">יצירת איש קשר חדש</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 p-6">
            <FormField label="שם תצוגה *" value={form.display_name} onChange={(v) => set('display_name', v)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="שם פרטי" value={form.first_name} onChange={(v) => set('first_name', v)} />
              <FormField label="שם משפחה" value={form.last_name} onChange={(v) => set('last_name', v)} />
            </div>
            <FormField label="טלפון" value={form.phone} onChange={(v) => set('phone', v)} dir="ltr" />
            <FormField label="אימייל" value={form.email} onChange={(v) => set('email', v)} dir="ltr" />
            <FormField label="Facebook URL" value={form.facebook_url} onChange={(v) => set('facebook_url', v)} dir="ltr" />
            <FormField label="Facebook ID" value={form.facebook_id} onChange={(v) => set('facebook_id', v)} dir="ltr" />
            <FormField label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} dir="ltr" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              ביטול
            </button>
            <ActionButton
              variant="primary"
              icon={UserPlus}
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? 'שומר...' : 'צור איש קשר'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}

function FormField({
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
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
      />
    </div>
  )
}
