import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * מצב הסנכרון הנכנס מ-Google Contacts (INC-3125).
 *
 * מקור: `integration_sync_runs`, workflow `GOOGLE-01B — Google Inbound Delta`.
 * זהו הכיוון הנכנס בלבד (Google → Supabase); 01C ו-01D הם היוצאים ואינם מוצגים כאן.
 *
 * ⚠ `started_at` נשמר ב-UTC. ההמרה לשעון ישראל נעשית **כאן ולא בקומפוננטה**,
 * אחרת המסך יציג הרצה של 12:00 כאילו רצה ב-09:00.
 *
 * ═══ שני מדדים נפרדים, ולא אחד ═══
 *
 * הכרטיס הציג בעבר תאריך אחד לכל חשבון, שנלקח מ-`max(inbox_v2.created_at)`,
 * ונקרא "נכנס לאחרונה". זה היה מטעה: `inbox_v2` היא **החלטה של המערכת**
 * שמשהו שווה טיפול, ולא רישום של מה ש-Google החזיר.
 *
 * הראיה: הרצת 01B ב-31/08 10:00 (run 295) החזירה 39 שינויים ב-google_workers
 * ועדכנה אותם (`records_updated: 39`) — ולתור לא נכנסה ולו שורה אחת
 * (`inbox_upserts: 0`). המסך הציג 28/08 והיה נראה כאילו החשבון לא נסרק שבוע.
 *
 * לכן:
 *   scannedAt    = מתי החשבון **נסרק**   (זמן ההרצה)
 *   lastQueuedAt = מתי נכנסה ממנו **שורה לתור** (inbox_v2)
 *
 * ⚠ `google_contact_links.last_synced_at` **אינו** משמש כאן. הוא נכתב על ידי
 * כל ארבעת ה-workflows (01A/01B/01C/01D) ולכן אינו מבחין בין נכנס ליוצא:
 * ב-01/09 הנגיעות היו ב-08:30 וב-10:15 — חלונות 01D ו-01C היוצאים — בעוד
 * 01B הנכנס רץ ב-10:00 ולא נגע באף קישור.
 */

const WORKFLOW = 'GOOGLE-01B%'
const IL_TZ = 'Asia/Jerusalem'

/** שש הרצות ביום, כל שעתיים מ-08:00 עד 18:00. לו"ז קבוע וידוע. */
const RUN_HOURS = [8, 10, 12, 14, 16, 18]

/**
 * `delta` = סנכרון רגיל מול sync_token — רק מה שהשתנה.
 * `recovery` = ה-token פג, והמערכת קוראת מחדש את כל ספר הכתובות,
 * עמוד אחד בכל הרצה, וקולטת רק רשומות שהשתנו אחרי ה-cutoff.
 */
export type SyncMode = 'delta' | 'recovery'

export interface GoogleAccountSync {
  /** המפתח הטכני — google_doctors / google_workers / ... */
  key: string
  /**
   * מתי החשבון נסרק לאחרונה (שעון ישראל).
   * זהו זמן ההרצה, אך **רק אם הסמן של החשבון התקדם בה בפועל** — אחרת אין
   * לנו ראיה שהוא נקרא, ואנחנו לא טוענים שנסרק.
   */
  scannedAt: Date | null
  /** מתי נכנסה ממנו לאחרונה שורה לתור (שעון ישראל), null אם מעולם לא */
  lastQueuedAt: Date | null
  mode: SyncMode
  /** עמוד ה-Recovery הנוכחי; null כשהחשבון ב-Delta רגיל */
  recoveryPage: number | null
}

export interface GoogleSyncStatus {
  lastRunAt: Date | null
  status: string | null
  accounts: GoogleAccountSync[]
  /** השעה הבאה בלו"ז, לפי שעון ישראל */
  nextRunLabel: string | null
}

/** שעון ישראל כ-Date, מתוך timestamptz שמגיע ב-UTC. */
function toIsrael(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** מחרוזת שעה בשעון ישראל, ללא תלות באזור הזמן של הדפדפן. */
export function israelTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString('he-IL', {
    timeZone: IL_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** תאריך קצר בשעון ישראל; "היום" כשזה היום. */
export function israelDate(d: Date | null): string {
  if (!d) return '—'
  const fmt = (x: Date) => x.toLocaleDateString('he-IL', { timeZone: IL_TZ })
  return fmt(d) === fmt(new Date()) ? 'היום' : fmt(d)
}

function nextRunLabel(): string | null {
  const nowIl = new Date(new Date().toLocaleString('en-US', { timeZone: IL_TZ }))
  const hour = nowIl.getHours()
  const next = RUN_HOURS.find((h) => h > hour)
  return next != null ? `${String(next).padStart(2, '0')}:00` : `מחר ${String(RUN_HOURS[0]).padStart(2, '0')}:00`
}

type CursorNode = Record<string, unknown>

function deltaOf(cursor: unknown): Record<string, CursorNode> {
  const d = (cursor as Record<string, unknown> | null)?.delta
  return (d ?? {}) as Record<string, CursorNode>
}

function recoveryOf(node: CursorNode | undefined): CursorNode | null {
  const rec = node?.recovery
  return rec && typeof rec === 'object' ? (rec as CursorNode) : null
}

/**
 * חתימת ההתקדמות של חשבון בתוך הסמן.
 *
 * ההשוואה בין `cursor_before` ל-`cursor_after` היא ההוכחה הישירה היחידה
 * לכך שחשבון מסוים אכן עובד בהרצה — אין ב-`integration_sync_runs` חותמת
 * זמן פר-חשבון. אומת על שמונה הרצות רצופות: כל שלושת החשבונות התקדמו
 * בעמוד אחד בכל הרצה, בלי יוצא מן הכלל.
 */
function progressSignature(node: CursorNode | undefined): string {
  if (!node) return ''
  const rec = recoveryOf(node)
  return [
    node.pages_completed ?? '',
    node.sync_token ?? '',
    node.page_token ?? '',
    rec?.pages_completed ?? '',
    rec?.page_token ?? '',
  ].join('|')
}

export function useGoogleSyncStatus() {
  return useQuery<GoogleSyncStatus>({
    queryKey: ['google-sync-status'],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data: run, error } = await supabase
        .from('integration_sync_runs')
        .select('started_at, status, cursor_before, cursor_after')
        .like('workflow_name', WORKFLOW)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw new Error(`טעינת מצב הסנכרון נכשלה: ${error.message}`)
      if (!run) {
        return { lastRunAt: null, status: null, accounts: [], nextRunLabel: nextRunLabel() }
      }

      const after = deltaOf(run.cursor_after)
      const before = deltaOf(run.cursor_before)
      const startedAt = toIsrael(run.started_at as string)

      // מתי נכנסה מכל חשבון שורה לתור — source_unique_key בתבנית
      // `google:<account_key>:<resource>` (ראו parseGoogleSource).
      const accounts: GoogleAccountSync[] = await Promise.all(
        Object.keys(after).map(async (key) => {
          const { data } = await supabase
            .from('inbox_v2')
            .select('created_at')
            .like('source_unique_key', `google:${key}:%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const node = after[key]
          const rec = recoveryOf(node)
          const active = rec?.active === true
          const advanced = progressSignature(before[key]) !== progressSignature(node)

          return {
            key,
            scannedAt: advanced ? startedAt : null,
            lastQueuedAt: toIsrael((data?.created_at as string) ?? null),
            mode: active ? 'recovery' : 'delta',
            recoveryPage: active ? Number(rec?.pages_completed ?? 0) || null : null,
          } satisfies GoogleAccountSync
        })
      )

      return {
        lastRunAt: startedAt,
        status: (run.status as string) ?? null,
        accounts,
        nextRunLabel: nextRunLabel(),
      }
    },
  })
}
