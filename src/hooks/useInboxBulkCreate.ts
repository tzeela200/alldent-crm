import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useInboxV2Mutations } from '@/hooks/useInboxV2'
import { lookupPhonesByNorm } from '@/hooks/useInboxPhoneCheck'
import { useAuth } from '@/contexts/AuthContext'
import { INBOX_ACTION, OPEN_STATUS_IDS } from '@/lib/inbox-v2-dicts'
import { normalizeIlMobile } from '@/lib/normalizePhone'
import {
  classifyFacebookValue,
  deriveGenderFromSource,
  isValidILMobile,
  normalizeEmail,
  normalizeText,
  phoneCompareKey,
} from '@/lib/inbox-v2-merge'
import type { InboxV2Row } from '@/types/inbox-v2'

/**
 * הקמה גורפת של אנשי קשר משורות Inbox (INC-3137).
 *
 * הרקע: 43 שינניות נכנסו מ-Google באותה מנה — אותו תפקיד, אותה עיר,
 * אף אחת לא קיימת במאגר. הדרך היחידה להקים אותן הייתה 43 פתיחות דיאלוג.
 *
 * ═══ שני עקרונות שקובעים את המימוש ═══
 *
 * **1. תוכנית לפני כתיבה.** `plan()` הוא קריאה בלבד ומחזיר בדיוק מה ייווצר
 * ומה ידולג ולמה. הכתיבה מתבצעת רק ב-`run()`, אחרי אישור מפורש במסך —
 * אותה תבנית של אשף הייבוא.
 *
 * **2. דילוג בקול, לעולם לא בשקט.** כל שורה שאינה כשירה מקבלת סיבה
 * בעברית ומוצגת. שורה שנכשלת באמצע הריצה נרשמת ולא מפילה את השאר.
 *
 * ⚠ הקמה **בלבד**. שורה שכבר הותאמה לרשומה קיימת היא מיזוג, ולעולם לא
 * תיווצר כאן — אחרת היינו יוצרים כפילות במקום להעשיר רשומה.
 *
 * הלוגיקה פר-שורה זהה ל-`CreateFromLeadDialog`: אותה ולידציה, אותה בדיקת
 * כפילות נייד, אותו `merge_status = 6` ואותו רישום ל-audit.
 */

/** סטטוס 6 = "מוזג" — השורה טופלה ויוצאת מהתור. */
const STATUS_MERGED = 6

export interface BulkCreateCandidate {
  leadId: number
  name: string
  roleId: number | null
  cityId: number | null
  genderId: number | null
  phone: string | null
  /** null = כשירה להקמה; אחרת הסיבה שבגללה תדולג */
  skipReason: string | null
}

export interface BulkCreateOutcome {
  created: number
  skipped: number
  failed: { leadId: number; name: string; message: string }[]
}

function buildPayload(row: InboxV2Row): Record<string, unknown> {
  const phone = normalizeText(row.phone)
  const secondPhone = normalizeText(row.second_phone)
  const email = normalizeEmail(row.email)
  const secondEmail = normalizeEmail(row.second_email)

  // ערך זהה בשני השדות אינו מידע — לא נכתב פעמיים.
  const samePhone = !!phone && phoneCompareKey(phone) === phoneCompareKey(secondPhone)
  const sameEmail = !!email && email === secondEmail

  // phone_norm והאזור אינם נשלחים — נגזרים בטריגרים של הטבלה.
  return {
    display_name: normalizeText(row.display_name),
    phone: phone || null,
    second_phone: samePhone ? null : secondPhone || null,
    email: email || null,
    second_email: sameEmail ? null : secondEmail || null,
    role: row.temp_role ?? null,
    city_id: row.temp_city_id ?? null,
    gender: deriveGenderFromSource(row),
    facebook_name: normalizeText(row.facebook_name) || null,
    facebook_id: normalizeText(row.facebook_id) || null,
    facebook_url: normalizeText(row.facebook_url) || null,
  }
}

/** הסיבה שבגללה שורה אינה כשירה, או null כשהיא כשירה. */
function disqualify(row: InboxV2Row): string | null {
  if (row.match_contact != null || row.match_account != null) {
    return 'כבר מותאמת לרשומה קיימת — זה מיזוג ולא הקמה'
  }
  if (!OPEN_STATUS_IDS.includes(Number(row.merge_status))) {
    return 'השורה כבר טופלה ואינה בתור'
  }
  if (!normalizeText(row.display_name)) return 'אין שם תצוגה'

  const phone = normalizeText(row.phone)
  const secondPhone = normalizeText(row.second_phone)
  const email = normalizeEmail(row.email)
  const facebookId = normalizeText(row.facebook_id)
  const facebookUrl = normalizeText(row.facebook_url)

  // trg_contact_set_phone_norm זורק חריגה על מספר שאינו נייד ישראלי תקין.
  if (phone && !isValidILMobile(phone)) return 'הנייד הראשי אינו נייד ישראלי תקין'
  if (secondPhone && !isValidILMobile(secondPhone)) return 'הנייד הנוסף אינו נייד ישראלי תקין'
  if (facebookId && classifyFacebookValue(facebookId) !== 'id') {
    return 'מזהה Facebook אינו ספרות בלבד'
  }
  if (!phone && !email && !facebookId && !facebookUrl) {
    return 'אין נייד, מייל או פרטי Facebook — אין במה לזהות'
  }
  return null
}

export function useInboxBulkCreate() {
  const { insertContact } = useContactMutations()
  const { updateRow, logAction } = useInboxV2Mutations()
  const { user } = useAuth()

  const [planning, setPlanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * קריאה בלבד. שולף את השורות הנבחרות, פוסל את מה שאינו כשיר, ומריץ
   * בדיקת כפילות נייד אחת (set-based) על כל המנה — לא שאילתה לשורה.
   */
  async function plan(leadIds: number[]): Promise<BulkCreateCandidate[]> {
    if (!leadIds.length) return []
    setPlanning(true)
    try {
      const { data, error } = await supabase
        .from('inbox_v2')
        .select('*')
        .in('lead_id', leadIds)
      if (error) throw new Error(`טעינת השורות הנבחרות נכשלה: ${error.message}`)

      const rows = (data ?? []) as InboxV2Row[]
      const candidates: BulkCreateCandidate[] = rows.map((row) => ({
        leadId: row.lead_id,
        name: normalizeText(row.display_name) || `שורה #${row.lead_id}`,
        roleId: row.temp_role ?? null,
        cityId: row.temp_city_id ?? null,
        genderId: deriveGenderFromSource(row),
        phone: normalizeText(row.phone) || null,
        skipReason: disqualify(row),
      }))

      // בדיקת כפילות מול המאגר — רק על מה שעבר את הפסילות המקומיות.
      const norms = new Map<number, string[]>()
      for (const row of rows) {
        const c = candidates.find((x) => x.leadId === row.lead_id)
        if (!c || c.skipReason) continue
        const list = [normalizeIlMobile(row.phone), normalizeIlMobile(row.second_phone)].filter(
          (n): n is string => !!n
        )
        if (list.length) norms.set(row.lead_id, list)
      }

      const allNorms = [...new Set([...norms.values()].flat())]
      if (allNorms.length) {
        const existing = await lookupPhonesByNorm(allNorms)
        for (const [leadId, list] of norms) {
          const hit = list
            .flatMap((n) => existing.get(n) ?? [])
            .find((m) => m.kind === 'contact')
          if (hit) {
            const c = candidates.find((x) => x.leadId === leadId)
            if (c) c.skipReason = `הנייד כבר משויך לאיש קשר קיים: ${hit.name}`
          }
        }
      }

      // כפילות **בתוך המנה עצמה**: שתי שורות עם אותו נייד ייצרו שתי רשומות
      // לאותו אדם. הראשונה עוברת, השנייה נעצרת.
      const seen = new Map<string, number>()
      for (const c of candidates) {
        if (c.skipReason || !c.phone) continue
        const key = normalizeIlMobile(c.phone)
        if (!key) continue
        const first = seen.get(key)
        if (first != null) {
          c.skipReason = `אותו נייד מופיע גם בשורה שנבחרה קודם (#${first})`
        } else {
          seen.set(key, c.leadId)
        }
      }

      return candidates.sort((a, b) => Number(!!a.skipReason) - Number(!!b.skipReason))
    } finally {
      setPlanning(false)
    }
  }

  /**
   * הכתיבה בפועל — רק על שורות שהתוכנית סימנה ככשירות.
   * סדרתי במכוון: כישלון בשורה אחת נרשם וממשיכים, בלי להפיל את המנה.
   */
  async function run(candidates: BulkCreateCandidate[]): Promise<BulkCreateOutcome> {
    const eligible = candidates.filter((c) => !c.skipReason)
    const outcome: BulkCreateOutcome = {
      created: 0,
      skipped: candidates.length - eligible.length,
      failed: [],
    }
    if (!eligible.length) return outcome

    setRunning(true)
    setProgress(0)
    try {
      for (const candidate of eligible) {
        try {
          // נטען מחדש פר-שורה: התוכנית יכולה להיות בת כמה דקות, ובינתיים
          // הסנכרון או משתמשת אחרת עשויים לשנות את השורה.
          const { data, error } = await supabase
            .from('inbox_v2')
            .select('*')
            .eq('lead_id', candidate.leadId)
            .single()
          if (error) throw new Error(error.message)

          const row = data as InboxV2Row
          const stillBlocked = disqualify(row)
          if (stillBlocked) {
            outcome.skipped += 1
            outcome.failed.push({
              leadId: candidate.leadId,
              name: candidate.name,
              message: `דולגה בזמן ההרצה: ${stillBlocked}`,
            })
            continue
          }

          const payload = buildPayload(row)
          const { data: created, error: insertError } = await insertContact(payload)
          if (insertError) throw insertError
          if (!created) throw new Error('לא התקבל מזהה איש קשר')

          await updateRow.mutateAsync({
            leadId: candidate.leadId,
            updates: { merge_status: STATUS_MERGED, match_contact: created.contact_id },
          })
          await logAction.mutateAsync({
            lead_id: candidate.leadId,
            target_type: 'contact',
            target_id: created.contact_id,
            action_type: INBOX_ACTION.CREATE_CONTACT,
            updates_applied: payload,
            approved_by: user?.email ?? null,
          })

          outcome.created += 1
        } catch (err) {
          outcome.failed.push({
            leadId: candidate.leadId,
            name: candidate.name,
            message: err instanceof Error ? err.message : 'שגיאה לא ידועה',
          })
        } finally {
          setProgress((p) => p + 1)
        }
      }
      return outcome
    } finally {
      setRunning(false)
    }
  }

  return { plan, run, planning, running, progress }
}
