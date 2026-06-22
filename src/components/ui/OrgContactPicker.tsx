import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ContactPicker, type ContactPickerResult } from './ContactPicker'
import { supabase } from '@/lib/supabase'

interface OrgContact {
  contact_id: number
  full_name: string | null
  display_name: string | null
  phone: string | null
  profile_type: number | null
}

interface OrgContactPickerProps {
  accountId: number
  employerValue: string | null     // accounts.contact_link
  onEmployerChange: (id: string | null) => void
}

function contactLabel(c: OrgContact) {
  return c.full_name || c.display_name || `#${c.contact_id}`
}

export function OrgContactPicker({
  accountId,
  employerValue,
  onEmployerChange,
}: OrgContactPickerProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linking, setLinking] = useState(false)
  const queryClient = useQueryClient()

  const { data: contacts = [] } = useQuery<OrgContact[]>({
    queryKey: ['org-contacts', accountId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contact')
        .select('contact_id, full_name, display_name, phone, profile_type')
        .eq('account_link', accountId)
        .order('full_name')
      return (data ?? []) as OrgContact[]
    },
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const handleLinkContact = async (id: number | null, contact?: ContactPickerResult) => {
    if (!id || !contact) return
    setLinking(true)
    try {
      await supabase
        .from('contact')
        .update({ account_link: accountId })
        .eq('contact_id', id)
      queryClient.invalidateQueries({ queryKey: ['org-contacts', accountId] })
    } finally {
      setLinking(false)
      setLinkOpen(false)
    }
  }

  const selectClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]'
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-500'

  return (
    <div className="space-y-3">
      {/* מעסיק ראשי */}
      <div>
        <label className={labelClass}>מעסיק ראשי</label>
        <div className="flex items-center gap-2">
          <select
            className={selectClass}
            value={employerValue ?? ''}
            onChange={e => onEmployerChange(e.target.value || null)}
          >
            <option value="">— ללא מעסיק ראשי —</option>
            {contacts.map(c => (
              <option key={c.contact_id} value={c.contact_id}>
                {contactLabel(c)}{c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {employerValue && (
            <button
              type="button"
              onClick={() => onEmployerChange(null)}
              className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="נקה"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* אנשי קשר נוספים משויכים */}
      {contacts.length > 0 && (
        <div>
          <label className={labelClass}>אנשי קשר משויכים לארגון</label>
          <div className="flex flex-wrap gap-2">
            {contacts.map(c => (
              <span
                key={c.contact_id}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                  String(c.contact_id) === String(employerValue)
                    ? 'bg-[#E6F3F3] text-[#008080] ring-1 ring-[#008080]'
                    : 'bg-[#F3F4F6] text-[#2D2D2D]'
                }`}
              >
                {contactLabel(c)}
                {String(c.contact_id) === String(employerValue) && ' ★'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* שיוך איש קשר חדש */}
      {!linkOpen ? (
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-[#008080] px-3 py-2 text-[13px] font-semibold text-[#008080] hover:bg-[#E6F3F3] transition"
        >
          <UserPlus className="h-4 w-4" />
          שייך איש קשר לארגון
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-600">חיפוש איש קשר לשיוך</span>
            <button type="button" onClick={() => setLinkOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ContactPicker
            value={null}
            onChange={handleLinkContact}
            placeholder="חיפוש לפי שם או נייד..."
            label=""
          />
          {linking && <p className="text-[12px] text-slate-400">משייך...</p>}
        </div>
      )}
    </div>
  )
}
