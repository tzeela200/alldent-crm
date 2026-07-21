import { useEffect, useState } from 'react'
import { GitMerge, X, ShieldAlert } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { AdminBadge, type AdminBadgeVariant } from '@/components/admin/AdminBadge'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useContactMutations } from '@/hooks/useContactMutations'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Contact } from '@/types'

interface Props {
  leadId: number
  onClose: () => void
}

type FieldChoice = 'existing' | 'incoming' | 'skip'
type ChangeType = 'complete' | 'temp-replace' | 'overwrite' | 'conflict' | 'same' | 'none'

const MERGE_FIELDS = [
  { key: 'email', label: 'אימייל' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'facebook_id', label: 'Facebook ID' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'full_name', label: 'שם מלא' },
  { key: 'city_id', label: 'עיר' },
] as const

type MergeFieldKey = (typeof MERGE_FIELDS)[number]['key']

const CHANGE_META: Record<ChangeType, { label: string; variant: AdminBadgeVariant }> = {
  complete: { label: 'השלמה', variant: 'teal' },
  'temp-replace': { label: 'החלפת ערך זמני', variant: 'amber' },
  overwrite: { label: 'דריסה', variant: 'error' },
  conflict: { label: 'סתירה', variant: 'error' },
  same: { label: 'זהה', variant: 'neutral' },
  none: { label: '', variant: 'neutral' },
}

export function MergePanel({ leadId, onClose }: Props) {
  const { data: row } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { updateContact } = useContactMutations()
  const [contact, setContact] = useState<Contact | null>(null)
  const [contactLoading, setContactLoading] = useState(true)
  const [contactError, setContactError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  // ברירת מחדל: הכל "דלג" — אין דריסה שקטה בלחיצה אחת. האדמין בוחר מפורשות.
  const [choices, setChoices] = useState<Record<MergeFieldKey, FieldChoice>>(() => {
    const init = {} as Record<MergeFieldKey, FieldChoice>
    for (const f of MERGE_FIELDS) init[f.key] = 'skip'
    return init
  })
  // דריסת ערך קיים אמיתי דורשת אישור מפורש נוסף לכל שדה.
  const [overwriteOk, setOverwriteOk] = useState<Record<string, boolean>>({})

  const contactId = row?.match_contact ?? null

  useEffect(() => {
    let active = true
    if (!contactId) {
      setContactLoading(false)
      return
    }
    setContactLoading(true)
    supabase
      .from('contact')
      .select('*')
      .eq('contact_id', contactId)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setContactError(error.message)
        } else {
          setContact(data as Contact)
        }
        setContactLoading(false)
      })
    return () => {
      active = false
    }
  }, [contactId])

  if (!row) return null

  const getIncomingValue = (key: MergeFieldKey): string | null => {
    const suggested = row.suggested_updates
      ? (row.suggested_updates as Record<string, { incoming?: unknown }>)[key]
      : null
    if (suggested) return suggested.incoming != null ? String(suggested.incoming) : null
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
    const val = (contact as unknown as Record<string, unknown>)[key]
    return val != null ? String(val) : null
  }

  const classify = (key: MergeFieldKey): ChangeType => {
    const suggested = row.suggested_updates
      ? (row.suggested_updates as Record<string, { conflict?: boolean }>)[key]
      : null
    if (suggested?.conflict) return 'conflict'
    const existing = getExistingValue(key)
    const incoming = getIncomingValue(key)
    if (incoming == null && existing == null) return 'none'
    if (existing === incoming) return 'same'
    if (existing == null) return 'complete'
    const displayName = contact ? (contact as unknown as Record<string, unknown>).display_name : null
    if (key === 'full_name' && displayName != null && existing === String(displayName)) {
      return 'temp-replace'
    }
    return 'overwrite'
  }

  const setChoice = (key: MergeFieldKey, choice: FieldChoice) =>
    setChoices((c) => ({ ...c, [key]: choice }))

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
        const { error } = await updateContact(contactId, updates)
        if (error) throw error
      }

      await updateRow.mutateAsync({ leadId, updates: { merge_status: 6 } })

      await logAction.mutateAsync({
        lead_id: leadId,
        target_type: 'contact',
        target_id: contactId,
        action_type: INBOX_ACTION.MERGE,
        updates_applied: updates,
        approved_by: null,
      })

      toast.success(
        Object.keys(updates).length > 0
          ? 'הרשומה מוזגה ואיש הקשר עודכן'
          : 'הרשומה סומנה כמוזגת (ללא שינוי שדות)'
      )
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
      <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-3xl items-center justify-center p-4">
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-[#008080]" />
              <h2 className="text-base font-bold text-[#2D2D2D]">הצג ואשר מיזוג לאיש קשר</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Safety note */}
          <div className="flex items-start gap-2 border-b border-[#FDE68A] bg-[#FFFBEB] px-6 py-3 text-[12px] text-[#92400E]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              ברירת המחדל היא "דלג" — לא מתעדכן דבר עד שתבחרי מפורשות. דריסת ערך קיים דורשת אישור נוסף.
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            {contactLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#008080]" />
              </div>
            ) : contactError ? (
              <p className="py-12 text-center text-sm text-[#DC2626]">
                שגיאה בטעינת איש הקשר: {contactError}
              </p>
            ) : !contact ? (
              <p className="py-12 text-center text-sm text-slate-400">לא נמצא איש קשר מותאם</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1.1fr_1fr_1fr_1.2fr] gap-2 px-3 text-[12px] font-semibold text-[#6B6B6B]">
                  <div>שדה / סוג שינוי</div>
                  <div>קיים במערכת</div>
                  <div>הגיע מהקובץ</div>
                  <div>בחירה</div>
                </div>

                {MERGE_FIELDS.map((f) => {
                  const existing = getExistingValue(f.key)
                  const incoming = getIncomingValue(f.key)
                  const type = classify(f.key)
                  if (type === 'none') return null

                  const isConflict = type === 'conflict'
                  const isOverwrite = type === 'overwrite'
                  const isSame = type === 'same'
                  const incomingLocked = isConflict || (isOverwrite && !overwriteOk[f.key])
                  const meta = CHANGE_META[type]

                  return (
                    <div
                      key={f.key}
                      className={`grid grid-cols-[1.1fr_1fr_1fr_1.2fr] items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        isConflict
                          ? 'bg-[#FEF2F2]'
                          : isOverwrite
                            ? 'bg-[#FEF2F2]'
                            : type === 'complete'
                              ? 'bg-[#E6F3F3]'
                              : type === 'temp-replace'
                                ? 'bg-[#FFFBEB]'
                                : 'bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-[#2D2D2D]">{f.label}</div>
                        {meta.label && <AdminBadge label={meta.label} variant={meta.variant} />}
                      </div>
                      <div className="text-xs text-[#6B6B6B]" dir="ltr">
                        {existing ?? <span className="text-slate-300">(ריק)</span>}
                      </div>
                      <div className="text-xs text-[#6B6B6B]" dir="ltr">
                        {incoming ?? <span className="text-slate-300">(ריק)</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        {isConflict ? (
                          <span className="text-[11px] font-semibold text-[#DC2626]">
                            ⚠️ סתירה — נשמר לבדיקה, לא נדרס
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {!isSame && existing != null && (
                              <label className="flex items-center gap-1 text-[11px]">
                                <input
                                  type="radio"
                                  name={f.key}
                                  checked={choices[f.key] === 'existing'}
                                  onChange={() => setChoice(f.key, 'existing')}
                                  className="h-3 w-3 accent-[#008080]"
                                />
                                קיים
                              </label>
                            )}
                            {incoming != null && (
                              <label
                                className={`flex items-center gap-1 text-[11px] ${
                                  incomingLocked ? 'opacity-40' : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={f.key}
                                  checked={choices[f.key] === 'incoming'}
                                  disabled={incomingLocked}
                                  onChange={() => setChoice(f.key, 'incoming')}
                                  className="h-3 w-3 accent-[#008080]"
                                />
                                חדש
                              </label>
                            )}
                            <label className="flex items-center gap-1 text-[11px]">
                              <input
                                type="radio"
                                name={f.key}
                                checked={choices[f.key] === 'skip'}
                                onChange={() => setChoice(f.key, 'skip')}
                                className="h-3 w-3 accent-[#008080]"
                              />
                              דלג
                            </label>
                          </div>
                        )}
                        {isOverwrite && (
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]">
                            <input
                              type="checkbox"
                              checked={!!overwriteOk[f.key]}
                              onChange={(e) => {
                                setOverwriteOk((o) => ({ ...o, [f.key]: e.target.checked }))
                                if (!e.target.checked && choices[f.key] === 'incoming')
                                  setChoice(f.key, 'skip')
                              }}
                              className="h-3 w-3 accent-[#DC2626]"
                            />
                            אני מאשרת דריסה
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
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
              disabled={merging || contactLoading || !contact}
            >
              {merging ? 'ממזג...' : hasChanges ? 'אשר מיזוג' : 'סמן כמוזג (ללא שינוי שדות)'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}
