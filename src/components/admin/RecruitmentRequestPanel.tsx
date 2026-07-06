import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CheckCircle2, UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/timeAgo'
import { ContactPicker, type ContactPickerResult } from '@/components/ui/ContactPicker'

const PROFILE_TYPE_EMPLOYER = 2
const PROFILE_TYPE_RECRUITER = 3

type IntakeRow = {
  job_code: string
  requester_company_name: string
  requester_business_id: string | null
  requester_contact_name: string
  requester_phone_raw: string
  requester_email: string
  publication_track_id: number | null
  source_page: string | null
  created_at: string
  matched_account_id: number | null
  matched_contact_id: number | null
  match_status: 'exact' | 'probable' | 'ambiguous' | 'none' | null
  account_match_reason: string | null
  contact_match_reason: string | null
  confirmed_account_id: number | null
  confirmed_contact_id: number | null
  reviewed_at: string | null
}

type NamedRow = { id: number; name: string }
type AccountRow = { account_id: number; account_name: string | null }
type ContactRow = { contact_id: number; full_name: string | null; display_name: string | null; account_link: number | null }

const MATCH_LABEL: Record<string, string> = {
  exact: 'התאמה ודאית',
  probable: 'התאמה חלשה (יש לבדוק)',
  ambiguous: 'נמצאו מספר התאמות',
  none: 'לא נמצאה התאמה',
}

function useIntake(jobCode: string | undefined) {
  return useQuery({
    queryKey: ['job-recruitment-intake', jobCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_recruitment_intake')
        .select('*')
        .eq('job_code', jobCode!)
        .maybeSingle()
      if (error) throw error
      return data as IntakeRow | null
    },
    enabled: !!jobCode,
    staleTime: 10_000,
  })
}

export default function RecruitmentRequestPanel({
  jobCode,
  onLinked,
  showToast,
}: {
  jobCode: string
  onLinked: (patch: { account_link?: number | null; rel_employer_contact?: number | null }) => void
  showToast: (message: string, tone: 'success' | 'error' | 'info') => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: intake, refetch } = useIntake(jobCode)
  const [busy, setBusy] = useState(false)
  const [pickedAccountId, setPickedAccountId] = useState<number | null>(null)

  const { data: tracks = [] } = useQuery({
    queryKey: ['dict_publication_tracks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_publication_tracks').select('id,name')
      if (error) throw error
      return (data ?? []) as NamedRow[]
    },
    staleTime: 600_000,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-for-recruitment-panel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name').order('account_name')
      if (error) throw error
      return (data ?? []) as AccountRow[]
    },
    staleTime: 60_000,
  })

  const relevantContactIds = [intake?.matched_contact_id, intake?.confirmed_contact_id].filter(
    (id): id is number => typeof id === 'number'
  )
  const { data: contactsById = {} } = useQuery({
    queryKey: ['contacts-for-recruitment-panel', relevantContactIds],
    queryFn: async () => {
      if (!relevantContactIds.length) return {} as Record<number, ContactRow>
      const { data, error } = await supabase
        .from('contact')
        .select('contact_id,full_name,display_name,account_link')
        .in('contact_id', relevantContactIds)
      if (error) throw error
      const map: Record<number, ContactRow> = {}
      for (const row of (data ?? []) as ContactRow[]) map[row.contact_id] = row
      return map
    },
    enabled: relevantContactIds.length > 0,
    staleTime: 60_000,
  })

  if (!intake) return null

  const accountName = (id: number | null) => accounts.find((a) => a.account_id === id)?.account_name ?? `#${id}`
  const contactName = (id: number | null) => {
    if (id == null) return null
    const c = contactsById[id]
    return c ? c.full_name || c.display_name || `#${id}` : `#${id}`
  }
  const trackName = tracks.find((t) => t.id === intake.publication_track_id)?.name ?? '—'
  const matchedContact = intake.matched_contact_id != null ? contactsById[intake.matched_contact_id] : null
  const isReviewed = !!intake.reviewed_at

  const markReviewed = async (extraPatch: Record<string, unknown> = {}) => {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('job_recruitment_intake')
      .update({ reviewed_at: new Date().toISOString(), reviewed_by: userData.user?.id ?? null, ...extraPatch })
      .eq('job_code', jobCode)
    if (error) throw error
  }

  const approveAccount = async (accountId: number) => {
    // הערה: accounts.account_status לא מתעדכן כאן. אישור התאמה הוא זיהוי בלבד —
    // הסטטוס "מגייס פעיל" נקבע רק כשהמשרה בפועל מתפרסמת (ראו publishJob ב-JobDetailsPage.tsx).
    setBusy(true)
    try {
      await markReviewed({ confirmed_account_id: accountId })
      const { error: jobError } = await supabase.from('job').update({ account_link: accountId }).eq('job_code', jobCode)
      if (jobError) throw jobError

      onLinked({ account_link: accountId })
      await refetch()
      showToast('הארגון שויך למשרה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בשיוך הארגון', 'error')
    } finally {
      setBusy(false)
    }
  }

  const approveContact = async (contactId: number) => {
    setBusy(true)
    try {
      await markReviewed({ confirmed_contact_id: contactId })
      const { error: jobError } = await supabase.from('job').update({ rel_employer_contact: contactId }).eq('job_code', jobCode)
      if (jobError) throw jobError
      onLinked({ rel_employer_contact: contactId })
      await refetch()
      showToast('איש הקשר שויך למשרה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בשיוך איש הקשר', 'error')
    } finally {
      setBusy(false)
    }
  }

  const leaveUnlinked = async () => {
    setBusy(true)
    try {
      await markReviewed()
      await refetch()
      showToast('הבקשה סומנה כנסקרה, ללא שיוך', 'info')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בשמירה', 'error')
    } finally {
      setBusy(false)
    }
  }

  const addHat = async (contactId: number, profileTypeId: number, label: string) => {
    setBusy(true)
    try {
      const { error } = await supabase.from('rel_contact_profiles').upsert({ contact_id: contactId, profile_type_id: profileTypeId })
      if (error) throw error
      showToast(`נוסף כובע ${label} — הזהות הראשית נשמרה`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בהוספת כובע', 'error')
    } finally {
      setBusy(false)
    }
  }

  const goCreateAccount = () => {
    navigate('/admin/employers', {
      state: {
        prefillAccount: {
          account_name: intake.requester_company_name,
          bus_id: intake.requester_business_id ?? '',
          phone: intake.requester_phone_raw,
          email: intake.requester_email,
        },
      },
    })
  }

  const goCreateContact = () => {
    const parts = intake.requester_contact_name.trim().split(/\s+/)
    navigate('/admin/contacts/new', {
      state: {
        prefillContact: {
          first_name: parts[0] ?? '',
          last_name: parts.slice(1).join(' '),
          phone: intake.requester_phone_raw,
          email: intake.requester_email,
        },
      },
    })
  }

  return (
    <section className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[18px] font-bold text-[#2D2D2D]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]">
            <Building2 className="h-5 w-5" />
          </span>
          בקשת גיוס ציבורית
        </div>
        {isReviewed ? (
          <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-[12px] font-bold text-[#166534]">נסקרה</span>
        ) : (
          <span className="rounded-full bg-[#FDF3E7] px-3 py-1 text-[12px] font-bold text-[#E8A85C]">ממתינה לסקירה</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-[13px]">
        <Info label="שם ארגון שנמסר" value={intake.requester_company_name} />
        <Info label="ח.פ / עוסק שנמסר" value={intake.requester_business_id ?? '—'} />
        <Info label="איש קשר" value={intake.requester_contact_name} />
        <Info label="טלפון" value={intake.requester_phone_raw} dir="ltr" />
        <Info label="אימייל" value={intake.requester_email} dir="ltr" />
        <Info label="מסלול גיוס" value={trackName} />
        <Info label="תאריך הגשה" value={formatDate(intake.created_at)} />
      </div>

      <div className="mt-5 rounded-xl bg-[#FAFAF7] p-4">
        <div className="mb-3 text-[13px] font-bold text-[#2D2D2D]">הצעות התאמה — {MATCH_LABEL[intake.match_status ?? 'none']}</div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* org matching */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#6B6B6B]">ארגון מוצע</div>
            {intake.matched_account_id ? (
              <>
                <div className="text-[14px] font-bold text-[#2D2D2D]">{accountName(intake.matched_account_id)}</div>
                <div className="text-[12px] text-[#6B6B6B]">{intake.account_match_reason}</div>
                {intake.confirmed_account_id === intake.matched_account_id ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#166534]"><CheckCircle2 className="h-3.5 w-3.5" /> אושר</span>
                ) : (
                  <button disabled={busy} onClick={() => approveAccount(intake.matched_account_id!)} className="mt-2 rounded-lg bg-[#008080] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#006D6D] disabled:opacity-60">
                    אישור שיוך לארגון זה
                  </button>
                )}
              </>
            ) : (
              <div className="text-[12px] text-[#6B6B6B]">{intake.account_match_reason ?? 'לא נמצאה התאמה'}</div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <select
                className="h-9 rounded-lg border border-[#D9D9D9] px-2 text-[12px]"
                value={pickedAccountId ?? ''}
                onChange={(e) => setPickedAccountId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">בחירת ארגון אחר...</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                ))}
              </select>
              {pickedAccountId && (
                <button disabled={busy} onClick={() => approveAccount(pickedAccountId)} className="rounded-lg border border-[#008080] px-3 py-1.5 text-[12px] font-bold text-[#008080] hover:bg-[#E6F3F3] disabled:opacity-60">
                  שיוך לארגון הנבחר
                </button>
              )}
              <button disabled={busy} onClick={goCreateAccount} className="flex items-center justify-center gap-1 rounded-lg border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-bold text-[#2D2D2D] hover:bg-[#F3F4F6]">
                <Building2 className="h-3.5 w-3.5" /> צור ארגון חדש
              </button>
            </div>
          </div>

          {/* contact matching */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#6B6B6B]">איש קשר מוצע</div>
            {intake.matched_contact_id ? (
              <>
                <div className="text-[14px] font-bold text-[#2D2D2D]">{contactName(intake.matched_contact_id)}</div>
                <div className="text-[12px] text-[#6B6B6B]">{intake.contact_match_reason}</div>
                {matchedContact && intake.matched_account_id && matchedContact.account_link !== intake.matched_account_id && (
                  <div className="mt-2 rounded-lg bg-[#FEF2F2] px-2 py-1 text-[11px] font-semibold text-[#991B1B]">
                    שימו לב: איש הקשר אינו משויך כרגע לארגון המוצע — לא בוצע שינוי אוטומטי.
                  </div>
                )}
                {intake.confirmed_contact_id === intake.matched_contact_id ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#166534]"><CheckCircle2 className="h-3.5 w-3.5" /> אושר</span>
                ) : (
                  <button disabled={busy} onClick={() => approveContact(intake.matched_contact_id!)} className="mt-2 rounded-lg bg-[#008080] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#006D6D] disabled:opacity-60">
                    אישור שיוך לאיש קשר זה
                  </button>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => addHat(intake.matched_contact_id!, PROFILE_TYPE_EMPLOYER, 'מעסיק')} className="rounded-lg border border-[#D9D9D9] px-2.5 py-1 text-[11px] font-semibold text-[#2D2D2D] hover:bg-[#F3F4F6]">הפוך לכובע מעסיק</button>
                  <button disabled={busy} onClick={() => addHat(intake.matched_contact_id!, PROFILE_TYPE_RECRUITER, 'מגייס')} className="rounded-lg border border-[#D9D9D9] px-2.5 py-1 text-[11px] font-semibold text-[#2D2D2D] hover:bg-[#F3F4F6]">הפוך לכובע מגייס</button>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-[#6B6B6B]">{intake.contact_match_reason ?? 'לא נמצאה התאמה'}</div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <ContactPicker
                value={null}
                onChange={(id, contact?: ContactPickerResult) => { if (id) approveContact(id); if (contact) void queryClient.invalidateQueries({ queryKey: ['contacts-for-recruitment-panel'] }) }}
                placeholder="בחירת איש קשר אחר..."
              />
              <button disabled={busy} onClick={goCreateContact} className="flex items-center justify-center gap-1 rounded-lg border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-bold text-[#2D2D2D] hover:bg-[#F3F4F6]">
                <UserPlus className="h-3.5 w-3.5" /> צור איש קשר חדש
              </button>
            </div>
          </div>
        </div>

        {!isReviewed && (
          <button disabled={busy} onClick={leaveUnlinked} className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#2D2D2D]">
            <Users className="h-3.5 w-3.5" /> סימון כנסקרה ללא שיוך
          </button>
        )}
      </div>
    </section>
  )
}

function Info({ label, value, dir = 'rtl' }: { label: string; value: string; dir?: 'rtl' | 'ltr' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-[#9CA3AF]">{label}</span>
      <span className="text-[13px] font-semibold text-[#2D2D2D]" dir={dir}>{value}</span>
    </div>
  )
}
