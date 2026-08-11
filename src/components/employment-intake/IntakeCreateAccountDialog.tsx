/**
 * §3.5 פעולה 8 — יצירת Account חדש (רק כשזוהה ארגון בפועל, §9). כתיבה
 * לליבה בפועל — דורשת אישור מפורש.
 */

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { useCreateAccountFromIntake, type CreateAccountInput } from '@/hooks/useEmploymentIntakeActions'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

interface Props {
  row: RowWithAction | null
  onClose: () => void
}

function fieldClass() {
  return 'h-10 w-full rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]'
}

export function IntakeCreateAccountDialog({ row, onClose }: Props) {
  const createAccount = useCreateAccountFromIntake()

  const [accountName, setAccountName] = useState(row?.org_name ?? '')
  const [phone, setPhone] = useState(row?.phone ?? '')
  const [email, setEmail] = useState(row?.email ?? '')
  const [facebookUrl, setFacebookUrl] = useState(row?.facebook_url ?? '')
  const [cityId, setCityId] = useState<number | null>(row?.city_id ?? null)
  const [regionId, setRegionId] = useState<number | null>(row?.region_id ?? null)
  const [confirmed, setConfirmed] = useState(false)

  if (!row) return null

  function handleCreate() {
    if (!row) return
    if (!accountName.trim()) {
      toast.error('שם הארגון הוא שדה חובה.')
      return
    }
    const input: CreateAccountInput = {
      accountName: accountName.trim(),
      phone: phone || null,
      email: email || null,
      facebookUrl: facebookUrl || null,
      cityId,
    }
    createAccount.mutate({ row, input }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת ארגון חדש</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#D9D9D9] bg-[#F9FAFB] p-3 text-[13px] text-[#6B6B6B]">{row.original_text}</div>

        <div className="grid grid-cols-2 gap-3">
          <input className={`col-span-2 ${fieldClass()}`} placeholder="שם ארגון *" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          <input className={fieldClass()} placeholder="טלפון" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={fieldClass()} placeholder="מייל" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={`col-span-2 ${fieldClass()}`} placeholder="קישור Facebook" dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
        </div>

        <CityRegionPicker variant="edit" cityId={cityId} regionId={regionId} onCityChange={setCityId} onRegionChange={setRegionId} />

        <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
          אני מאשרת יצירת ארגון חדש
        </label>

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" icon={Building2} disabled={!confirmed || createAccount.isPending} onClick={handleCreate}>
            {createAccount.isPending ? 'יוצר…' : 'יצירת ארגון'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
