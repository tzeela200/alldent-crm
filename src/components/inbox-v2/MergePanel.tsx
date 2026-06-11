import { useState } from 'react'
import { GitMerge, X } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Contact } from '@/types'

interface Props {
  leadId: number
  onClose: () => void
}

type FieldChoice = 'existing' | 'incoming' | 'skip'

const MERGE_FIELDS = [
  { key: 'email', label: 'אימייל' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'facebook_id', label: 'Facebook ID' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'full_name', label: 'שם מלא' },
  { key: 'city_id', label: 'עיר' },
] as const

type MergeFieldKey = (typeof MERGE_FIELDS)[number]['key']

export function MergePanel({ leadId, onClose }: Props) {
  const { data: row } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const [contact, setContact] = useState<Contact | null>(null)
  const [contactLoading, setContactLoading] = useState(true)
  const [choices, setChoices] = useState<Record<MergeFieldKey, FieldChoice>>(() => {
    const init = {} as Record<MergeFieldKey, FieldChoice>
    for (const f of MERGE_FIELDS) init[f.key] = 'skip'
    return init
  })
  const [merging, setMerging] = useState(false)

  const contactId = row?.match_contact

  // Fetch matched contact
  useState(() => {
    if (!contactId) {
      setContactLoading(false)
      return
    }
    supabase
      .from('contact')
      .select('*')
      .eq('contact_id', contactId)
      .single()
      .then(({ data }) => {
        if (data) {
          setContact(data as Contact)
          const autoChoices = { ...choices }
          for (const f of MERGE_FIELDS) {
            const suggested = row?.suggested_updates
              ? (row.suggested_updates as Record<string, any>)[f.key]
              : null
            if (suggested && !suggested.conflict) {
              autoChoices[f.key] = 'incoming'
            }
          }
          setChoices(autoChoices)
        }
        setContactLoading(false)
      })
  })

  if (!row) return null

  const getIncomingValue = (key: MergeFieldKey): string | null => {
    const suggested = row.suggested_updates
      ? (row.suggested_updates as Record<string, any>)[key]
      : null
    if (suggested) return String(suggested.incoming ?? '')
    switch (key) {
      case 'email':
        return row.email
      case 'facebook_url':
        return row.facebook_url
      case 'facebook_id':
        return row.facebook_id
      case 'linkedin_url':
        return row.linkedin_url
      case 'full_name':
        return row.display_name
      case 'city_id':
        return row.temp_city_id != null ? String(row.temp_city_id) : null
      default:
        return null
    }
  }

  const getExistingValue = (key: MergeFieldKey): string | null => {
    if (!contact) return null
    const val = (contact as Record<string, any>)[key]
    return val != null ? String(val) : null
  }

  const handleMerge = async () => {
    if (!contactId) return
    setMerging(true)

    try {
      const updates: Record<string, unknown> = {}
      for (const f of MERGE_FIELDS) {
        if (choices[f.key] === 'incoming') {
          const val = getIncomingValue(f.key)
          if (val != null) updates[f.key] = val
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('contact')
          .update(updates)
          .eq('contact_id', contactId)
        if (error) throw error
      }

      await updateRow.mutateAsync({
        leadId,
        updates: { merge_status: 6 },
      })

      await logAction.mutateAsync({
        lead_id: leadId,
        target_type: 'contact',
        target_id: contactId,
        action_type: 1,
        updates_applied: updates,
        approved_by: null,
      })

      toast.success('הרשומה מוזגה בהצלחה')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה במיזוג')
    } finally {
      setMerging(false)
    }
  }

  const hasChanges = Object.values(choices).some((c) => c === 'incoming')

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-3xl items-center justify-center p-4">
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">מיזוג רשומה</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {contactLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
              </div>
            ) : !contact ? (
              <p className="py-12 text-center text-sm text-slate-400">
                לא נמצא איש קשר מותאם
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500">
                  <div>שדה</div>
                  <div>קיים במערכת</div>
                  <div>נתון חדש</div>
                  <div>בחירה</div>
                </div>

                {MERGE_FIELDS.map((f) => {
                  const existing = getExistingValue(f.key)
                  const incoming = getIncomingValue(f.key)
                  const suggested = row.suggested_updates
                    ? (row.suggested_updates as Record<string, any>)[f.key]
                    : null
                  const isConflict = suggested?.conflict
                  const isNew = existing == null && incoming != null
                  const isSame = existing === incoming

                  if (!incoming && !existing) return null

                  return (
                    <div
                      key={f.key}
                      className={`grid grid-cols-4 items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        isConflict
                          ? 'bg-red-50'
                          : isNew
                            ? 'bg-emerald-50'
                            : isSame
                              ? 'bg-slate-50'
                              : 'bg-amber-50'
                      }`}
                    >
                      <div className="font-medium text-slate-700">
                        {f.label}
                        {isConflict && (
                          <span className="mr-1 text-[10px] text-red-500">⚠️ קונפליקט</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600" dir="ltr">
                        {existing ?? <span className="text-slate-300">(ריק)</span>}
                      </div>
                      <div className="text-xs text-slate-600" dir="ltr">
                        {incoming ?? <span className="text-slate-300">(ריק)</span>}
                      </div>
                      <div className="flex gap-1">
                        {!isSame && existing != null && (
                          <label className="flex items-center gap-1 text-[10px]">
                            <input
                              type="radio"
                              name={f.key}
                              checked={choices[f.key] === 'existing'}
                              onChange={() =>
                                setChoices((c) => ({ ...c, [f.key]: 'existing' }))
                              }
                              className="h-3 w-3 text-teal-600"
                            />
                            קיים
                          </label>
                        )}
                        {incoming != null && (
                          <label className="flex items-center gap-1 text-[10px]">
                            <input
                              type="radio"
                              name={f.key}
                              checked={choices[f.key] === 'incoming'}
                              onChange={() =>
                                setChoices((c) => ({ ...c, [f.key]: 'incoming' }))
                              }
                              className="h-3 w-3 text-teal-600"
                            />
                            חדש
                          </label>
                        )}
                        <label className="flex items-center gap-1 text-[10px]">
                          <input
                            type="radio"
                            name={f.key}
                            checked={choices[f.key] === 'skip'}
                            onChange={() =>
                              setChoices((c) => ({ ...c, [f.key]: 'skip' }))
                            }
                            className="h-3 w-3 text-teal-600"
                          />
                          דלג
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
              icon={GitMerge}
              onClick={handleMerge}
              disabled={merging || !hasChanges}
            >
              {merging ? 'ממזג...' : 'אשר מיזוג'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}
