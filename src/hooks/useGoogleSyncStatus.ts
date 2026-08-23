import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * מצב הסנכרון הנכנס מ-Google Contacts (INC-3125).
 *
 * מקור: `integration_sync_runs`, workflow `GOOGLE-01B — Google Inbound Delta`.
 * זהו הכיוון הנכנס בלבד (Google → Supabase); הכיוון ההפוך הוא 01C ואינו מוצג כאן.
 *
 * ⚠ `started_at` נשמר ב-UTC. ההמרה לשעון ישראל נעשית **כאן ולא בקומפוננטה**,
 * אחרת המסך יציג הרצה של 12:00 כאילו רצה ב-09:00.
 *
 * ההרצה מכסה את שלושת החשבונות יחד, ולכן זמן ההרצה זהה לשלושתם. מה שכן
 * שונה בין החשבונות הוא מתי נכנס מכל אחד מהם מידע בפועל.
 */

const WORKFLOW = 'GOOGLE-01B%'
const IL_TZ = 'Asia/Jerusalem'

/** שלוש הרצות ביום עד 18:00, כל שעתיים מ-08:00. לו"ז קבוע וידוע. */
const RUN_HOURS = [8, 10, 12, 14, 16, 18]

export interface GoogleAccountSync {
  /** המפתח הטכני — google_doctors / google_workers / ... */
  key: string
  /** מתי נכנס מהחשבון הזה מידע לאחרונה (שעון ישראל), null אם מעולם לא */
  lastRowAt: Date | null
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

export function useGoogleSyncStatus() {
  return useQuery<GoogleSyncStatus>({
    queryKey: ['google-sync-status'],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data: run, error } = await supabase
        .from('integration_sync_runs')
        .select('started_at, status, cursor_after')
        .like('workflow_name', WORKFLOW)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw new Error(`טעינת מצב הסנכרון נכשלה: ${error.message}`)
      if (!run) {
        return { lastRunAt: null, status: null, accounts: [], nextRunLabel: nextRunLabel() }
      }

      const delta = ((run.cursor_after as Record<string, unknown> | null)?.delta ??
        {}) as Record<string, unknown>
      const keys = Object.keys(delta)

      // מתי נכנס מכל חשבון מידע לאחרונה — source_unique_key בתבנית
      // `google:<account_key>:<resource>` (ראו parseGoogleSource).
      const accounts: GoogleAccountSync[] = await Promise.all(
        keys.map(async (key) => {
          const { data } = await supabase
            .from('inbox_v2')
            .select('created_at')
            .like('source_unique_key', `google:${key}:%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          return { key, lastRowAt: toIsrael((data?.created_at as string) ?? null) }
        })
      )

      return {
        lastRunAt: toIsrael(run.started_at as string),
        status: (run.status as string) ?? null,
        accounts,
        nextRunLabel: nextRunLabel(),
      }
    },
  })
}
