/**
 * שלב 9 (§3.5, פעולות 1–4 ו-9) — עריכה ברמת שורה, מתוך דיאלוג שנפתח
 * מ-AdminActionsMenu בטבלה. כותב אך ורק ל-employment_intake:
 *   1. עריכת המידע שחולץ  2. שינוי הסיווג/סטטוס הליד המוצע
 *   3–4/9. בחירת/קישור Contact או Account קיים
 * אין כאן פתיחה/עריכה/יצירה של Contact/Account אמיתי — זו כתיבה לליבה
 * שדורשת אישור נפרד (שלב 11). original_text מוצג לקריאה בלבד ואינו נערך.
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { ContactPicker, type ContactPickerResult } from '@/components/ui/ContactPicker'
import { AccountPicker, type AccountPickerResult } from '@/components/ui/AccountPicker'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { normalizePhoneRpc } from '@/hooks/useEmploymentIntakeNormalize'
import { useUpdateEmploymentIntakeRow, type EmploymentIntakeRowPatch } from '@/hooks/useEmploymentIntakeRowEdit'
import { CONTENT_TYPE_LABEL } from '@/lib/employment-intake/labels'
import type { ContentType } from '@/types/employment-intake'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

const CONTENT_TYPE_OPTIONS: ContentType[] = ['job_seeker', 'recruiter', 'group_join', 'irrelevant', 'unclear', 'unclassified']

interface Props {
  row: RowWithAction | null
  onClose: () => void
}

function fieldClass() {
  return 'h-10 w-full rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]'
}

export function IntakeRowEditor({ row, onClose }: Props) {
  const { data: dicts } = useEmploymentIntakeDicts()
  const updateRow = useUpdateEmploymentIntakeRow()

  const [contactName, setContactName] = useState(row?.contact_name ?? '')
  const [orgName, setOrgName] = useState(row?.org_name ?? '')
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
  const [contentType, setContentType] = useState<ContentType>(row?.content_type ?? 'unclassified')
  const [socialStatus, setSocialStatus] = useState<number | null>(row?.proposed_social_status ?? null)
  const [matchContact, setMatchContact] = useState<number | null>(row?.match_contact ?? null)
  const [matchAccount, setMatchAccount] = useState<number | null>(row?.match_account ?? null)

  if (!row) return null

  async function handleSave() {
    if (!row) return
    const patch: EmploymentIntakeRowPatch = {}

    if (contactName !== (row.contact_name ?? '')) patch.contact_name = contactName || null
    if (orgName !== (row.org_name ?? '')) patch.org_name = orgName || null
    if (email !== (row.email ?? '')) patch.email = email || null
    if (secondEmail !== (row.second_email ?? '')) patch.second_email = secondEmail || null
    if (facebookId !== (row.facebook_id ?? '')) patch.facebook_id = facebookId || null
    if (facebookUrl !== (row.facebook_url ?? '')) patch.facebook_url = facebookUrl || null
    if (facebookName !== (row.facebook_name ?? '')) patch.facebook_name = facebookName || null

    if (phone !== (row.phone ?? '')) {
      patch.phone = phone || null
      patch.phone_norm = phone ? await normalizePhoneRpc(phone) : null
    }
    if (secondPhone !== (row.second_phone ?? '')) {
      patch.second_phone = secondPhone || null
      patch.second_phone_norm = secondPhone ? await normalizePhoneRpc(secondPhone) : null
    }

    if (roleId !== row.role_id) patch.role_id = roleId
    if (JSON.stringify(subRoleIds) !== JSON.stringify(row.sub_role_ids)) patch.sub_role_ids = subRoleIds
    if (cityId !== row.city_id) patch.city_id = cityId
    if (regionId !== row.region_id) patch.region_id = regionId
    if (contentType !== row.content_type) patch.content_type = contentType
    if (socialStatus !== row.proposed_social_status) patch.proposed_social_status = socialStatus

    if (matchContact !== row.match_contact) {
      patch.match_contact = matchContact
      patch.match_field = matchContact ? 'manual' : null
      patch.match_type = matchContact ? 'exact' : undefined
    }
    if (matchAccount !== row.match_account) {
      patch.match_account = matchAccount
      patch.match_field = matchAccount ? 'manual' : patch.match_field ?? null
      patch.match_type = matchAccount ? 'exact' : patch.match_type
    }

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    updateRow.mutate(
      { id: row.id, patch, currentOverride: row.manual_override ?? {} },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת פרטי ההודעה</DialogTitle>
        </DialogHeader>

        <div className="rounded-[12px] border border-[#D9D9D9] bg-[#F9FAFB] p-3 text-[13px] text-[#6B6B6B]">
          <div className="mb-1 font-semibold text-[#2D2D2D]">הטקסט המקורי (לקריאה בלבד)</div>
          {row.original_text}
        </div>

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-[#2D2D2D]">המידע שחולץ</div>
          <div className="grid grid-cols-2 gap-3">
            <input className={fieldClass()} placeholder="שם האדם" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <input className={fieldClass()} placeholder="שם ארגון" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <input className={fieldClass()} placeholder="נייד" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className={fieldClass()} placeholder="נייד נוסף" value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} />
            <input className={fieldClass()} placeholder="מייל" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={fieldClass()} placeholder="מייל נוסף" value={secondEmail} onChange={(e) => setSecondEmail(e.target.value)} />
            <input className={fieldClass()} placeholder="מזהה Facebook" value={facebookId} onChange={(e) => setFacebookId(e.target.value)} />
            <input className={fieldClass()} placeholder="קישור Facebook" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
            <input className={fieldClass()} placeholder="שם Facebook" value={facebookName} onChange={(e) => setFacebookName(e.target.value)} />
          </div>
          <RoleSubRolePicker variant="edit" roleId={roleId} subRoleIds={subRoleIds} onRoleChange={setRoleId} onSubRoleChange={setSubRoleIds} />
          <CityRegionPicker variant="edit" cityId={cityId} regionId={regionId} onCityChange={setCityId} onRegionChange={setRegionId} />
        </div>

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-[#2D2D2D]">סיווג וסטטוס</div>
          <div className="grid grid-cols-2 gap-3">
            <select className={fieldClass()} value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)}>
              {CONTENT_TYPE_OPTIONS.map((ct) => (
                <option key={ct} value={ct}>
                  {CONTENT_TYPE_LABEL[ct]}
                </option>
              ))}
            </select>
            <select
              className={fieldClass()}
              value={socialStatus ?? ''}
              onChange={(e) => setSocialStatus(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">סטטוס ליד מוצע — ללא</option>
              {(dicts?.socialStatuses ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-[#2D2D2D]">קישור לרשומה קיימת</div>
          <ContactPicker
            value={matchContact}
            onChange={(id: number | null, _c?: ContactPickerResult) => setMatchContact(id)}
            label="איש קשר"
          />
          <AccountPicker
            value={matchAccount != null ? String(matchAccount) : null}
            onChange={(id: string | null, _a?: AccountPickerResult) => setMatchAccount(id ? Number(id) : null)}
            label="ארגון"
          />
        </div>

        <DialogFooter>
          <ActionButton variant="ghost" onClick={onClose}>
            ביטול
          </ActionButton>
          <ActionButton variant="primary" onClick={handleSave} disabled={updateRow.isPending}>
            {updateRow.isPending ? 'שומר…' : 'שמירה'}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
