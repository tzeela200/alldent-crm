import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, X, ShieldAlert } from 'lucide-react'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxV2Row, useInboxV2Mutations } from '@/hooks/useInboxV2'
import { useAccountMutations } from '@/hooks/useAccountMutations'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION } from '@/lib/inbox-v2-dicts'
import { classifyFacebookValue, normalizeEmail, normalizeText, phoneCompareKey } from '@/lib/inbox-v2-merge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FormField, ReadOnlyField } from '@/components/inbox-v2/CreateFromLeadDialog'
import type { DictItem } from '@/types'

interface Props {
  leadId: number
  onClose: () => void
}

/**
 * יצירת ארגון חדש מרשומת Inbox.
 *
 * תשעת השדות המאושרים בלבד. תפקיד לא רלוונטי — ל-accounts אין עמודת role.
 * account_status לא נשלח: ברירת המחדל ב-DB היא 10 = "ארגון חדש".
 * phone_norm ו-region_id מחושבים בטריגרים של accounts.
 *
 * בניגוד למסלול איש הקשר, מספר קווי הוא ערך לגיטימי כאן —
 * trg_account_set_phone_norm מחזיר NULL בשקט ואינו זורק חריגה.
 */
export function CreateAccountFromLeadDialog({ leadId, onClose }: Props) {
  const { data: row } = useInboxV2Row(leadId)
  const { updateRow, logAction } = useInboxV2Mutations()
  const { insertAccount } = useAccountMutations()
  const { data: cities } = useInboxV2Cities()
  const { user } = useAuth()

  const { data: accountTypes } = useQuery<DictItem[]>({
    queryKey: ['dict_account_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_types').select('id, name').order('id')
      if (error) throw error
      return (data ?? []) as DictItem[]
    },
    staleTime: 5 * 60_000,
  })

  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [accountType, setAccountType] = useState<string>('')
  const [initialized, setInitialized] = useState(false)
  const [form, setForm] = useState({
    account_name: '',
    phone: '',
    second_phone: '',
    email: '',
    second_email: '',
    facebook_name: '',
    facebook_id: '',
    facebook_url: '',
  })

  useEffect(() => {
    if (!row || initialized) return
    setForm({
      account_name: row.display_name ?? '',
      phone: row.phone ?? '',
      second_phone: row.second_phone ?? '',
      email: row.email ?? '',
      second_email: row.second_email ?? '',
      facebook_name: row.facebook_name ?? '',
      facebook_id: row.facebook_id ?? '',
      facebook_url: row.facebook_url ?? '',
    })
    setInitialized(true)
  }, [row, initialized])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const cityLabel =
    row?.temp_city_id != null
      ? (cities?.find((c) => c.id === row.temp_city_id)?.name ?? String(row.temp_city_id))
      : null

  const handleCreate = async () => {
    if (!row) return

    const accountName = normalizeText(form.account_name)
    if (!accountName) {
      toast.error('שם ארגון הוא שדה חובה')
      return
    }

    const phone = normalizeText(form.phone)
    const secondPhone = normalizeText(form.second_phone)
    const email = normalizeEmail(form.email)
    const secondEmail = normalizeEmail(form.second_email)
    const facebookId = normalizeText(form.facebook_id)

    // מזהה Facebook הוא מזהה גם כאן. העמודה text אינה סיבה לקבל כל טקסט.
    if (facebookId && classifyFacebookValue(facebookId) !== 'id') {
      toast.error('מזהה Facebook חייב להיות ספרות בלבד')
      return
    }

    const samePhone = !!phone && phoneCompareKey(phone) === phoneCompareKey(secondPhone)
    const sameEmail = !!email && email === secondEmail

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        account_name: accountName,
        phone: phone || null,
        second_phone: samePhone ? null : secondPhone || null,
        email: email || null,
        second_email: sameEmail ? null : secondEmail || null,
        city_id: row.temp_city_id ?? null,
        facebook_name: normalizeText(form.facebook_name) || null,
        facebook_id: facebookId || null,
        facebook_url: normalizeText(form.facebook_url) || null,
      }
      if (accountType) payload.account_type = Number(accountType)

      const { data: newAccount, error } = await insertAccount(payload)
      if (error) throw error
      if (!newAccount) throw new Error('לא התקבל מזהה ארגון')

      await updateRow.mutateAsync({
        leadId,
        updates: { merge_status: 6, match_account: newAccount.account_id },
      })

      await logAction.mutateAsync({
        lead_id: leadId,
        target_type: 'account',
        target_id: newAccount.account_id,
        action_type: INBOX_ACTION.CREATE_ACCOUNT,
        updates_applied: payload,
        approved_by: user?.email ?? null,
      })

      toast.success(`ארגון חדש נוצר (#${newAccount.account_id})`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת ארגון')
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
              <Building2 className="h-5 w-5 text-[#008080]" />
              <h2 className="text-base font-bold text-[#2D2D2D]">יצירת ארגון חדש</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <FormField label="שם ארגון *" value={form.account_name} onChange={(v) => set('account_name', v)} />

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-[#6B6B6B]">סוג ארגון (אופציונלי)</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
              >
                <option value="">— לא נקבע —</option>
                {(accountTypes ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="טלפון ראשי" value={form.phone} onChange={(v) => set('phone', v)} dir="ltr" />
              <FormField label="טלפון נוסף" value={form.second_phone} onChange={(v) => set('second_phone', v)} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="מייל ראשי" value={form.email} onChange={(v) => set('email', v)} dir="ltr" />
              <FormField label="מייל נוסף" value={form.second_email} onChange={(v) => set('second_email', v)} dir="ltr" />
            </div>

            <ReadOnlyField label="עיר" value={cityLabel} empty="לא זוהתה — לא תיכתב" />

            <FormField label="שם Facebook" value={form.facebook_name} onChange={(v) => set('facebook_name', v)} />
            <FormField label="מזהה Facebook (ספרות בלבד)" value={form.facebook_id} onChange={(v) => set('facebook_id', v)} dir="ltr" />
            <FormField label="קישור Facebook" value={form.facebook_url} onChange={(v) => set('facebook_url', v)} dir="ltr" />

            <div className="flex items-start gap-2 rounded-[10px] bg-[#F8F9FA] px-3 py-2 text-[12px] text-[#6B6B6B]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
              <span>
                סטטוס הארגון ייקבע אוטומטית ל"ארגון חדש". האזור נגזר מהעיר. תפקיד אינו רלוונטי לארגון.
              </span>
            </div>

            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 accent-[#008080]"
              />
              אני מאשרת יצירת ארגון חדש
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              ביטול
            </button>
            <ActionButton variant="primary" icon={Building2} onClick={handleCreate} disabled={saving || !confirmed}>
              {saving ? 'שומר...' : 'צור ארגון'}
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  )
}
