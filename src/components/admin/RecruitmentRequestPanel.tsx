import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CheckCircle2, UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/timeAgo'
import { ContactPicker, type ContactPickerResult } from '@/components/ui/ContactPicker'
import { AccountPanel, type AccountPanelPrefill } from '@/components/admin/AccountPanel'
import { useAccountMutations } from '@/hooks/useAccountMutations'

const PROFILE_TYPE_EMPLOYER = 2
const PROFILE_TYPE_RECRUITER = 3

// "ארגון חדש" — הסטטוס הנכון לארגון שנוצר מבקשה ציבורית שטרם פורסמה.
// חשוב: אסור ליצור אותו כ-7 ("מגייס פעיל"), כי הטריגר sync_account_status_from_jobs
// דורס 7→8 ("מגייס סגור") כשאין למשרה job_status=3 — והמשרה כאן היא טיוטה (2).
// סטטוס 10 אינו מושפע מהטריגר, ויעלה ל-7 לבד כשהמשרה תפורסם בפועל.
const NEW_ACCOUNT_STATUS_ID = 10

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
type AccountRow = { account_id: number; account_name: string | null; city_id: number | null }
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
  jobCityId,
  jobRegionId,
  jobAddress,
  onLinked,
  showToast,
}: {
  jobCode: string
  /** מיקום המשרה — משמש למילוי מוקדם של מיקום הארגון בעת יצירת ארגון חדש. */
  jobCityId?: number | null
  jobRegionId?: number | null
  jobAddress?: string | null
  onLinked: (patch: { account_link?: number | null; rel_employer_contact?: number | null }) => void
  showToast: (message: string, tone: 'success' | 'error' | 'info') => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { insertAccount } = useAccountMutations()
  const { data: intake, refetch } = useIntake(jobCode)
  const [busy, setBusy] = useState(false)
  const [pickedAccountId, setPickedAccountId] = useState<number | null>(null)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [copyCityToAccount, setCopyCityToAccount] = useState(false)

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
      const { data, error } = await supabase.from('accounts').select('account_id,account_name,city_id').order('account_name')
      if (error) throw error
      return (data ?? []) as AccountRow[]
    },
    staleTime: 60_000,
  })

  // מילונים לפאנל הארגון המשותף. מפתחות ה-query זהים לשאר המסכים כדי לחלוק cache.
  const { data: accountStatuses = [] } = useQuery({
    queryKey: ['dict_account_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_statuses').select('id,name').order('id')
      if (error) throw error
      return (data ?? []) as NamedRow[]
    },
    staleTime: 600_000,
  })

  const { data: accountTypes = [] } = useQuery({
    queryKey: ['dict_account_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_types').select('id,name').order('id')
      if (error) throw error
      return (data ?? []) as NamedRow[]
    },
    staleTime: 600_000,
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

  const markReviewed = async (extraPatch: Record<string, unknown> = {}) => {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('job_recruitment_intake')
      .update({ reviewed_at: new Date().toISOString(), reviewed_by: userData.user?.id ?? null, ...extraPatch })
      .eq('job_code', jobCode)
    if (error) throw error
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

  // חזרה ממסך "איש קשר חדש" — משייכים את איש הקשר שנוצר ומנקים את ה-state
  // כדי שרענון של הדף לא ישייך שוב.
  const returnedContactId = (location.state as { linkContactId?: number } | null)?.linkContactId
  useEffect(() => {
    if (typeof returnedContactId !== 'number' || !intake) return
    navigate(location.pathname, { replace: true, state: null })
    void approveContact(returnedContactId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedContactId, !!intake])

  if (!intake) return null

  const accountName = (id: number | null) => accounts.find((a) => a.account_id === id)?.account_name ?? `#${id}`
  const storedContactName = (id: number | null) => {
    if (id == null) return null
    const c = contactsById[id]
    return (c?.full_name || c?.display_name) ?? null
  }
  const contactName = (id: number | null) => {
    if (id == null) return null
    return storedContactName(id) ?? `#${id} (ללא שם)`
  }
  const trackName = tracks.find((t) => t.id === intake.publication_track_id)?.name ?? '—'
  const matchedContact = intake.matched_contact_id != null ? contactsById[intake.matched_contact_id] : null
  const isReviewed = !!intake.reviewed_at

  // עיר הבקשה ממלאת את עיר הארגון רק ביצירת ארגון חדש. לארגון קיים שכבר יש לו עיר
  // לא נוגעים — העיר נשארת על המשרה בלבד. אם לארגון הקיים אין עיר כלל, מציעים
  // להשלים אותה, אבל רק בסימון מפורש ולא בכתיבה שקטה.
  const accountMissingCity = (accountId: number | null) =>
    accountId != null && jobCityId != null && accounts.some((a) => a.account_id === accountId && a.city_id == null)

  const approveAccount = async (accountId: number) => {
    // הערה: accounts.account_status לא מתעדכן כאן. אישור התאמה הוא זיהוי בלבד —
    // הסטטוס "מגייס פעיל" נקבע רק כשהמשרה בפועל מתפרסמת (ראו publishJob ב-JobDetailsPage.tsx).
    setBusy(true)
    try {
      await markReviewed({ confirmed_account_id: accountId })
      const { error: jobError } = await supabase.from('job').update({ account_link: accountId }).eq('job_code', jobCode)
      if (jobError) throw jobError

      let cityCopied = false
      if (copyCityToAccount && accountMissingCity(accountId)) {
        // region_id נגזר אוטומטית מ-city_id בטריגר trg_accounts_fill_region_from_city_id.
        const { error: cityError } = await supabase.from('accounts').update({ city_id: jobCityId }).eq('account_id', accountId)
        if (cityError) throw cityError
        cityCopied = true
        await queryClient.invalidateQueries({ queryKey: ['accounts-for-recruitment-panel'] })
      }

      onLinked({ account_link: accountId })
      await refetch()
      showToast(cityCopied ? 'הארגון שויך למשרה ועיר הארגון עודכנה' : 'הארגון שויך למשרה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בשיוך הארגון', 'error')
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

  // מילוי מוקדם לפאנל הארגון. שים לב: הטלפון נשאר ריק בכוונה — הנייד שנמסר בטופס
  // הוא נייד אישי של איש הקשר, והעתקתו לארגון הייתה מכפילה את אותו מספר
  // בין contact ל-accounts בניגוד לכלל "נייד = רשומה אחת".
  const accountPrefill: AccountPanelPrefill = {
    account_name: intake.requester_company_name,
    bus_id: intake.requester_business_id ?? '',
    email: intake.requester_email,
    phone: '',
    account_status: String(NEW_ACCOUNT_STATUS_ID),
    city_id: jobCityId ?? null,
    region_id: jobRegionId ?? null,
    address: jobAddress ?? '',
  }

  // יצירת הארגון ושיוכו למשרה כפעולה אחת — כדי שלא נישאר עם ארגון "יתום"
  // שאינו מקושר לבקשה שממנה נוצר.
  const createAccountFromRequest = async (patch: Record<string, unknown>) => {
    const { data, error } = await insertAccount(patch)
    if (error) return { error }

    const newAccountId = Number((data as { account_id?: number } | null)?.account_id)
    if (!Number.isFinite(newAccountId)) {
      return { error: { message: 'הארגון נוצר אך לא הוחזר מזהה — יש לשייך אותו למשרה ידנית' } }
    }

    // מכאן הארגון כבר קיים ב-DB. כישלון בשלבים הבאים אינו מצדיק שמירה חוזרת
    // (שהייתה יוצרת כפילות), ולכן מדווחים הצלחה חלקית מפורשת ולא שגיאה.
    try {
      const { error: jobError } = await supabase.from('job').update({ account_link: newAccountId }).eq('job_code', jobCode)
      if (jobError) throw jobError
      await markReviewed({ confirmed_account_id: newAccountId })

      onLinked({ account_link: newAccountId })
      await refetch()
      await queryClient.invalidateQueries({ queryKey: ['accounts-for-recruitment-panel'] })
      showToast('הארגון נוצר ושויך למשרה', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      showToast(`הארגון נוצר (#${newAccountId}) אך השיוך למשרה נכשל: ${message}`, 'error')
    }

    return { error: null }
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
        // אחרי היצירה נחזור לכאן ואיש הקשר ישויך אוטומטית לבקשה ולמשרה.
        returnToJob: jobCode,
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

            {/* השלמת עיר לארגון קיים — רק כשחסרה לו עיר, ורק בסימון מפורש. */}
            {(accountMissingCity(intake.matched_account_id) || accountMissingCity(pickedAccountId)) && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-[#F9FAFB] p-2 text-[11px] font-semibold text-[#2D2D2D]">
                <input
                  type="checkbox"
                  checked={copyCityToAccount}
                  onChange={(e) => setCopyCityToAccount(e.target.checked)}
                  className="mt-0.5"
                />
                <span>לארגון הזה אין עיר — עדכני גם את עיר הארגון לפי עיר המשרה</span>
              </label>
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
              <button disabled={busy} onClick={() => setCreateAccountOpen(true)} className="flex items-center justify-center gap-1 rounded-lg border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-bold text-[#2D2D2D] hover:bg-[#F3F4F6]">
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
                {!storedContactName(intake.matched_contact_id) && (
                  <div className="mt-2 rounded-lg bg-[#FFFBEB] px-2 py-1 text-[11px] font-semibold text-[#92400E]">
                    לרשומה הקיימת אין שם. בבקשה נמסר «{intake.requester_contact_name}» — יש להשלים ידנית ב-360 של איש הקשר.
                  </div>
                )}
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

      {/* יצירת ארגון נעשית כאן, על מסך המשרה — לא בניווט למסך המעסיקים,
          כדי שהארגון שנוצר ישויך מיד למשרה ולבקשה. */}
      {createAccountOpen && (
        <AccountPanel
          account={null}
          mode="create"
          onModeChange={() => {}}
          onClose={() => setCreateAccountOpen(false)}
          navigate={navigate}
          dicts={{
            accountTypes,
            accountStatuses,
            profileTypesMap: new Map(),
            rolesMap: new Map(),
          }}
          save={createAccountFromRequest}
          prefill={accountPrefill}
          createTitle="ארגון חדש מבקשת גיוס"
          phoneHint={
            <>
              הנייד שנמסר בטופס (<span dir="ltr">{intake.requester_phone_raw}</span>) שייך לאיש הקשר ולא לארגון,
              ולכן לא הועתק לכאן. אפשר להשאיר ריק או להזין טלפון משרדי של הארגון.
            </>
          }
        />
      )}
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
