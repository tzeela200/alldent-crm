/**
 * §3.5 פעולה 7 — יצירת Contact חדש מתוך שורת קליטה. כתיבה לליבה בפועל,
 * ולכן דורשת אישור מפורש (checkbox) והצגת הטקסט המקורי לפני האישור.
 */

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { isValidIlMobile } from '@/lib/normalizePhone'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useCreateContactFromIntake, type CreateContactInput } from '@/hooks/useEmploymentIntakeActions'
import { errorInvalidPhone } from '@/lib/employment-intake/labels'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'
import { toast } from 'sonner'

interface Props {
  row: RowWithAction | null
  onClose: () => void
}

function fieldClass() {
  return 'h-10 w-full rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]'
}

export function IntakeCreateContactDialog({ row, onClose }: Props) {
  const { data: dicts } = useEmploymentIntakeDicts()
  const createContact = useCreateContactFromIntake()

  const [displayName, setDisplayName] = useState(row?.contact_name ?? '')
  const [phone, setPhone] = useState(row?.phone ?? '')
  const [secondPhone, setSecondPhone] = useState(row?.second_phone ?? '')
  const [email, setEmail] = useState(row?.email ?? '')
  const [secondEmail, setSecondEmail] = useState(row?.second_email ?? '')
  const [facebookId, setFacebookId] = useState(row?.facebook_id ?? '')
  const [facebookUrl, setFacebookUrl] = useState(row?.facebook_url ?? '')
  const [facebookName, setFacebookName] = useState(row?.facebook_name ?? '')
  const [roleId, setRoleId] = useState<number | null>(row?.role_id ?? null)
  const [subRoleIds, setSubRoleIds] = useState<number[]>(row?.sub_role_ids ?? [])
  const [cityId, setCityId] = useState<number | null>(row?.city_id ?? null)
  const [regionId, setRegionId] = useState<number | null>(row?.region_id ?? null)
  const [includeWorkStatus, setIncludeWorkStatus] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  if (!row) return null

  const showWorkStatusOption = row.content_type === 'job_seeker' && row.is_active_request !== false
  const sourceTypeName = dicts?.sourceTypes.find((s) => s.id === row.source_type)?.name ?? null

  async function handleCreate() {
    if (!row) return
    if (!displayName.trim()) {
      toast.error('שם תצוגה הוא שדה חובה.')
      return
    }
    if (phone && !isValidIlMobile(phone)) {
      toast.error(errorInvalidPhone())
      return
    }
    if (secondPhone && !isValidIlMobile(secondPhone)) {
      toast.error(errorInvalidPhone())
      return
    }
    if (!phone && !email && !facebookId && !facebookUrl) {
      toast.error('נדרש לפחות אחד מהשדות: נייד, מייל, מזהה Facebook או קישור Facebook.')
      return
    }

    const input: CreateContactInput = {
      displayName: displayName.trim(),
      phone: phone || null,
      secondPhone: secondPhone || null,
      email: email || null,
      secondEmail: secondEmail || null,
      facebookId: facebookId || null,
      facebookUrl: facebookUrl || null,
      facebookName: facebookName || null,
      roleId,
      cityId,
      includeWorkStatus: showWorkStatusOption && includeWorkStatus,
    }

    createContact.mutate({ row, input, sourceTypeName }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת איש קשר חדש</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#D9D9D9] bg-[#F9FAFB] p-3 text-[13px] text-[#6B6B6B]">
          {row.original_text}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input className={`col-span-2 ${fieldClass()}`} placeholder="שם תצוגה *" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <input className={fieldClass()} placeholder="נייד" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={fieldClass()} placeholder="נייד נוסף" dir="ltr" value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} />
          <input className={fieldClass()} placeholder="מייל" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={fieldClass()} placeholder="מייל נוסף" dir="ltr" value={secondEmail} onChange={(e) => setSecondEmail(e.target.value)} />
          <input className={fieldClass()} placeholder="מזהה Facebook" dir="ltr" value={facebookId} onChange={(e) => setFacebookId(e.target.value)} />
          <input className={fieldClass()} placeholder="קישור Facebook" dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
          <input className={`col-span-2 ${fieldClass()}`} placeholder="שם Facebook" value={facebookName} onChange={(e) => setFacebookName(e.target.value)} />
        </div>

        <RoleSubRolePicker variant="edit" roleId={roleId} subRoleIds={subRoleIds} onRoleChange={setRoleId} onSubRoleChange={setSubRoleIds} />
        <CityRegionPicker variant="edit" cityId={cityId} regionId={regionId} onCityChange={setCityId} onRegionChange={setRegionId} />

        {showWorkStatusOption && (
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
            <input type="checkbox" checked={includeWorkStatus} onChange={(e) => setIncludeWorkStatus(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
            סימון גם כ"מחפש/ת עבודה פעיל/ה" (סטטוס עבודה)
          </label>
        )}

        <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2D2D2D]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#008080]" />
          אני מאשרת יצירת איש קשר חדש
        </label>

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" icon={UserPlus} disabled={!confirmed || createContact.isPending} onClick={handleCreate}>
            {createContact.isPending ? 'יוצר…' : 'יצירת איש קשר'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
