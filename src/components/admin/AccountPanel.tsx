import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { MessageCircle, Mail, X, Pencil } from 'lucide-react'
import SidePanel from '@/components/ui/SidePanel'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { getRoleColor } from '@/lib/roleColors'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { formatPhone, whatsappLink, normalizePhone } from '@/lib/normalizePhone'

type DictItem = { id: number; name: string }
type PanelMode = 'view' | 'edit' | 'create'

interface LinkedContact {
  contact_id: number
  full_name: string | null
  phone: string | null
  email: string | null
  role: number | null
  profile_type: number | null
}
interface RelatedJob {
  job_code: string
  job_role: number | null
  job_status: number | null
  public_status: number | null
}
export interface AccountPanelData {
  account_id: number
  account_name: string | null
  bus_id: string | null
  account_status: number | null
  account_type: number | null
  phone: string | null
  second_phone: string | null
  email: string | null
  second_email: string | null
  billing_email: string | null
  website_url: string | null
  facebook_url: string | null
  linkedin_url: string | null
  region_id: number | null
  city_id: number | null
  address: string | null
  notes: string | null
  cityName: string
  regionName: string
  typeName: string
  linkedContacts: LinkedContact[]
  relatedJobs: RelatedJob[]
  activeJobsCount: number
  totalJobsCount: number
}

interface AccountPanelProps {
  account: AccountPanelData | null
  mode: PanelMode
  onModeChange: (m: PanelMode) => void
  onClose: () => void
  navigate: NavigateFunction
  dicts: {
    accountTypes: DictItem[]
    accountStatuses: DictItem[]
    profileTypesMap: Map<number, string>
    rolesMap: Map<number, string>
  }
  save: (patch: Record<string, unknown>, id?: number) => Promise<{ error: unknown }>
}

type FormState = {
  account_name: string
  account_type: string
  account_status: string
  bus_id: string
  notes: string
  region_id: number | null
  city_id: number | null
  address: string
  phone: string
  second_phone: string
  email: string
  second_email: string
  billing_email: string
  website_url: string
  facebook_url: string
  linkedin_url: string
}

function emptyForm(): FormState {
  return {
    account_name: '', account_type: '', account_status: '', bus_id: '', notes: '',
    region_id: null, city_id: null, address: '',
    phone: '', second_phone: '', email: '', second_email: '', billing_email: '',
    website_url: '', facebook_url: '', linkedin_url: '',
  }
}
function formFrom(a: AccountPanelData): FormState {
  return {
    account_name: a.account_name ?? '',
    account_type: a.account_type != null ? String(a.account_type) : '',
    account_status: a.account_status != null ? String(a.account_status) : '',
    bus_id: a.bus_id ?? '',
    notes: a.notes ?? '',
    region_id: a.region_id,
    city_id: a.city_id,
    address: a.address ?? '',
    phone: a.phone ?? '',
    second_phone: a.second_phone ?? '',
    email: a.email ?? '',
    second_email: a.second_email ?? '',
    billing_email: a.billing_email ?? '',
    website_url: a.website_url ?? '',
    facebook_url: a.facebook_url ?? '',
    linkedin_url: a.linkedin_url ?? '',
  }
}

const editInput = 'w-full rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#008080]'

export function AccountPanel({ account, mode, onModeChange, onClose, navigate, dicts, save }: AccountPanelProps) {
  const [form, setForm] = useState<FormState>(() => (account ? formFrom(account) : emptyForm()))
  const [saving, setSaving] = useState(false)
  const isEditing = mode === 'edit' || mode === 'create'

  // אתחול הטופס בכל כניסה למצב עריכה/יצירה — כדי שהערכים תמיד תואמים לרשומה.
  useEffect(() => {
    if (mode === 'edit' && account) setForm(formFrom(account))
    if (mode === 'create') setForm(emptyForm())
  }, [mode, account])

  const initial = useMemo(() => (account ? formFrom(account) : emptyForm()), [account])
  const isDirty = isEditing && JSON.stringify(form) !== JSON.stringify(mode === 'create' ? emptyForm() : initial)

  const setField = (k: keyof FormState, v: FormState[keyof FormState]) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const patch: Record<string, unknown> = {
      account_name: form.account_name.trim() || null,
      account_type: form.account_type ? Number(form.account_type) : null,
      account_status: form.account_status ? Number(form.account_status) : null,
      bus_id: form.bus_id.trim() || null,
      notes: form.notes.trim() || null,
      region_id: form.region_id,
      city_id: form.city_id,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      phone_norm: form.phone.trim() ? normalizePhone(form.phone) : null,
      second_phone: form.second_phone.trim() || null,
      email: form.email.trim() || null,
      second_email: form.second_email.trim() || null,
      billing_email: form.billing_email.trim() || null,
      website_url: form.website_url.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
    }
    const { error } = await save(patch, mode === 'edit' ? account?.account_id : undefined)
    setSaving(false)
    if (error) { alert('שגיאה בשמירה'); return }
    if (mode === 'create') onClose()
    else onModeChange('view')
  }

  const validPhone = account?.phone && normalizePhone(account.phone).length === 12
  const validEmail = account?.email && account.email.includes('@')

  // ── People grouped by profile_type ──
  const grouped = useMemo(() => {
    const g = new Map<number, LinkedContact[]>()
    ;(account?.linkedContacts ?? []).forEach((c) => {
      const pt = Number(c.profile_type ?? 0)
      if (!g.has(pt)) g.set(pt, [])
      g.get(pt)!.push(c)
    })
    return g
  }, [account])

  const header = (
    <div className="flex items-start justify-between px-5 py-4">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="truncate text-[18px] font-black text-[#0F0F10]">
            {mode === 'create' ? 'ארגון חדש' : account?.account_name || '—'}
          </h2>
          {account && <StatusBadge statusType="account" statusId={account.account_status} />}
        </div>
        {account && (
          <p className="text-[13px] text-[#6B6B6B]">
            {account.cityName !== '—' ? account.cityName : ''}
            {account.cityName !== '—' ? ' · ' : ''}
            {account.activeJobsCount} משרות פעילות · {account.totalJobsCount} סה״כ
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {validPhone && (
          <a aria-label="שליחת וואטסאפ" href={whatsappLink(account!.phone)} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-[#25D366] hover:bg-[#F3F4F6]">
            <MessageCircle className="h-5 w-5" />
          </a>
        )}
        {validEmail && (
          <a aria-label="שליחת מייל" href={`mailto:${account!.email}`} className="rounded-lg p-2 text-[#6B6B6B] hover:bg-[#F3F4F6]">
            <Mail className="h-5 w-5" />
          </a>
        )}
        {mode === 'view' && account && (
          <button aria-label="עריכה" onClick={() => onModeChange('edit')} className="rounded-lg p-2 text-[#008080] hover:bg-[#F3F4F6]">
            <Pencil className="h-5 w-5" />
          </button>
        )}
        <button aria-label="סגירה" onClick={onClose} className="rounded-lg p-2 text-[#6B6B6B] hover:bg-[#F3F4F6]">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const footer = (
    <AdminPanelActions
      mode={mode}
      onClose={onClose}
      onEdit={() => onModeChange('edit')}
      onCancelEdit={() => { if (account) setForm(formFrom(account)); onModeChange('view') }}
      onSave={handleSave}
      saving={saving}
      saveLabel={mode === 'create' ? 'צור ארגון' : 'שמור'}
      primaryAction={mode === 'view' && account ? { label: 'מסך 360', onClick: () => navigate(`/admin/accounts/${account.account_id}`) } : undefined}
    />
  )

  return (
    <SidePanel open onClose={onClose} header={header} footer={footer} isDirty={isDirty} width="max-w-[680px]">
      {/* 1 · פרטי ארגון */}
      <AdminPanelSection title="פרטי ארגון">
        <AdminPanelField label="שם ארגון" mode={mode} viewValue={account?.account_name}
          editValue={<input className={editInput} value={form.account_name} onChange={(e) => setField('account_name', e.target.value)} />} />
        <AdminPanelField label="סוג ארגון" mode={mode} viewValue={account?.typeName}
          editValue={<SelectInput value={form.account_type} onChange={(v) => setField('account_type', v)} options={dicts.accountTypes} />} />
        <AdminPanelField label="סטטוס ארגון" mode={mode}
          viewValue={account ? <StatusBadge statusType="account" statusId={account.account_status} /> : undefined}
          editValue={<SelectInput value={form.account_status} onChange={(v) => setField('account_status', v)} options={dicts.accountStatuses} />} />
        <AdminPanelField label="ח.פ. / מזהה עסקי" mode={mode} viewValue={account?.bus_id}
          editValue={<input className={editInput} value={form.bus_id} onChange={(e) => setField('bus_id', e.target.value)} />} />
        <AdminPanelField label="הערות" mode={mode} fullWidth viewValue={account?.notes}
          editValue={<textarea className={editInput} rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />} />
      </AdminPanelSection>

      {/* 2 · מיקום */}
      <AdminPanelSection title="מיקום">
        {isEditing ? (
          <div className="sm:col-span-2">
            <CityRegionPicker
              cityId={form.city_id}
              regionId={form.region_id}
              onCityChange={(id) => setField('city_id', id)}
              onRegionChange={(id) => setField('region_id', id)}
              variant="edit"
            />
          </div>
        ) : (
          <>
            <AdminPanelField label="אזור" mode="view" viewValue={account?.regionName} />
            <AdminPanelField label="עיר" mode="view" viewValue={account?.cityName} />
          </>
        )}
        <AdminPanelField label="כתובת" mode={mode} fullWidth viewValue={account?.address}
          editValue={<input className={editInput} value={form.address} onChange={(e) => setField('address', e.target.value)} />} />
      </AdminPanelSection>

      {/* 3 · משרות מקושרות (read-only) */}
      <AdminPanelSection title="משרות מקושרות" isEmpty={!account?.relatedJobs.length} emptyMessage="אין משרות מקושרות לארגון">
        <div className="sm:col-span-2 space-y-1.5">
          {(account?.relatedJobs ?? []).map((j) => (
            <div key={j.job_code} className="flex items-center gap-2 text-[13px]">
              <button onClick={() => navigate(`/admin/jobs/${j.job_code}`)} className="font-mono font-bold text-[#008080] hover:underline">{j.job_code}</button>
              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: getRoleColor(j.job_role).solid }}>
                {dicts.rolesMap.get(Number(j.job_role)) ?? '—'}
              </span>
              <StatusBadge statusType="job" statusId={j.job_status} />
              <StatusBadge statusType="public" statusId={j.public_status} />
            </div>
          ))}
        </div>
      </AdminPanelSection>

      {/* 4 · אנשים מקושרים לארגון (read-only) */}
      <AdminPanelSection title="אנשים מקושרים לארגון" isEmpty={!account?.linkedContacts.length} emptyMessage="אין אנשים מקושרים לארגון">
        <div className="sm:col-span-2 space-y-3">
          {[...grouped.entries()].map(([pt, list]) => (
            <div key={pt}>
              <div className="mb-1 text-[12px] font-bold text-[#008080]">{dicts.profileTypesMap.get(pt) ?? 'אחר'} ({list.length})</div>
              <div className="space-y-1.5">
                {list.map((c) => (
                  <div key={c.contact_id} className="rounded-lg border border-[#F0F0F0] p-2 text-[13px]">
                    <div className="font-semibold text-[#2D2D2D]">{c.full_name || '—'}</div>
                    <div className="text-[12px] text-[#6B6B6B]" dir="ltr">
                      {formatPhone(c.phone) || ''}{c.email ? ` · ${c.email}` : ''}
                    </div>
                    {c.role != null && <div className="text-[11px] text-[#9CA3AF]">{dicts.rolesMap.get(Number(c.role)) ?? ''}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminPanelSection>

      {/* 5 · פרטי קשר (always last) */}
      <AdminPanelSection title="פרטי קשר">
        <ContactField label="טלפון" mode={mode} view={formatPhone(account?.phone)} value={form.phone} onChange={(v) => setField('phone', v)} />
        <ContactField label="טלפון נוסף" mode={mode} view={formatPhone(account?.second_phone)} value={form.second_phone} onChange={(v) => setField('second_phone', v)} />
        <ContactField label="מייל ארגון" mode={mode} view={account?.email} value={form.email} onChange={(v) => setField('email', v)} />
        <ContactField label="מייל נוסף" mode={mode} view={account?.second_email} value={form.second_email} onChange={(v) => setField('second_email', v)} />
        <ContactField label="מייל להנהלת חשבונות" mode={mode} view={account?.billing_email} value={form.billing_email} onChange={(v) => setField('billing_email', v)} />
        <LinkField label="אתר" mode={mode} view={account?.website_url} value={form.website_url} onChange={(v) => setField('website_url', v)} />
        <LinkField label="Facebook" mode={mode} view={account?.facebook_url} value={form.facebook_url} onChange={(v) => setField('facebook_url', v)} />
        <LinkField label="LinkedIn" mode={mode} view={account?.linkedin_url} value={form.linkedin_url} onChange={(v) => setField('linkedin_url', v)} />
      </AdminPanelSection>
    </SidePanel>
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: DictItem[] }) {
  return (
    <select className={editInput} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )
}
function ContactField({ label, mode, view, value, onChange }: { label: string; mode: PanelMode; view?: string | null; value: string; onChange: (v: string) => void }) {
  return (
    <AdminPanelField label={label} mode={mode} viewValue={view}
      editValue={<input className={editInput} value={value} onChange={(e) => onChange(e.target.value)} />} />
  )
}
function LinkField({ label, mode, view, value, onChange }: { label: string; mode: PanelMode; view?: string | null; value: string; onChange: (v: string) => void }) {
  const viewNode: ReactNode = view ? (
    <a href={view} target="_blank" rel="noopener noreferrer" className="text-[#008080] hover:underline" dir="ltr">{view}</a>
  ) : undefined
  return (
    <AdminPanelField label={label} mode={mode} viewValue={viewNode}
      editValue={<input className={editInput} value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" />} />
  )
}
