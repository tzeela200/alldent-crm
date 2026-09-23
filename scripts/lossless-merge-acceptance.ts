/**
 * INC-3146 — בדיקות קבלה למיזוג בלי איבוד נתונים.
 *
 * הרצה:  npx tsx scripts/lossless-merge-acceptance.ts
 *
 * לוגיקה טהורה בלבד — אין Supabase ואין כתיבה.
 */
import {
  buildMergePlan, collectPoints, defaultChoice, defaultPointRoles, resolveFieldValue,
  type FieldChoice, type LosslessMergeField,
} from '@/lib/lossless-merge'
import { CONTACT_MERGE_SLOTS } from '@/lib/contactMergeFields'

let pass = 0, fail = 0
const bad: string[] = []
const check = (n: string, a: unknown, e: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++
  else { fail++; bad.push(`${n}\n   ציפייה: ${JSON.stringify(e)}\n   בפועל:  ${JSON.stringify(a)}`) }
}

const fields: LosslessMergeField[] = [
  { key: 'full_name', label: 'שם מלא', group: 'זהות' },
  { key: 'facebook_name', label: 'שם בפייסבוק', group: 'רשתות' },
  { key: 'facebook_id', label: 'מזהה פייסבוק', group: 'רשתות' },
  { key: 'facebook_url', label: 'קישור פייסבוק', group: 'רשתות' },
  { key: 'candidate_availability_ids', label: 'זמינות', group: 'העדפות', kind: 'array' },
  { key: 'city_id', label: 'עיר', group: 'מיקום' },
  { key: 'region_id', label: 'אזור', group: 'מיקום', derivedFrom: 'city_id' },
  { key: 'has_cv', label: 'יש קו״ח', group: 'קו״ח' },
  { key: 'notes', label: 'הערות', group: 'הערות', kind: 'text' },
]
const slots = CONTACT_MERGE_SLOTS
const idKey = 'contact_id'

// ── תרחיש 1: המקרה מהדיווח — פרטי פייסבוק רק בכפולה ──
const master = { contact_id: 1, full_name: 'דנה כהן', phone: '0501111111', email: 'dana@a.com', second_phone: null, second_email: null,
  facebook_name: null, facebook_id: null, facebook_url: null, candidate_availability_ids: [1], city_id: 5, region_id: 2, has_cv: false, notes: 'הערה א' }
const dup = { contact_id: 2, full_name: 'דנה כהן', phone: '0522222222', email: 'DANA@a.com', second_phone: null, second_email: 'd2@b.com',
  facebook_name: 'Dana Cohen', facebook_id: 100012345678901, facebook_url: 'https://facebook.com/dana', candidate_availability_ids: [2], city_id: null, region_id: 3, has_cv: true, notes: 'הערה ב' }
const records = [master, dup]

check('פייסבוק ריק במאסטר ⇒ נלקח מהכפולה', defaultChoice(records, idKey, 1, fields[1]), { type: 'from', recordId: 2 })
check('מזהה פייסבוק ⇒ from (המסד מעתיק, לא JS)', defaultChoice(records, idKey, 1, fields[2]), { type: 'from', recordId: 2 })
check('זמינות שונה ⇒ איחוד', defaultChoice(records, idKey, 1, fields[4]), { type: 'union' })
check('איחוד זמינות', resolveFieldValue(records, idKey, 1, fields[4], { type: 'union' }), [1, 2])
check('הערות שונות ⇒ חיבור', defaultChoice(records, idKey, 1, fields[8]), { type: 'concat' })
check('יש קו״ח: false נחשב ריק ⇒ true מהכפולה', defaultChoice(records, idKey, 1, fields[7]), { type: 'from', recordId: 2 })
check('שם זהה ⇒ מהמאסטר', defaultChoice(records, idKey, 1, fields[0]), { type: 'from', recordId: 1 })

// נייד: הנייד של הכפולה עובר לנייד נוסף, לא נמחק
const phones = collectPoints(records, idKey, 1, slots[0])
check('שני ניידים שונים', phones.map((p) => p.raw), ['0501111111', '0522222222'])
const phoneRoles = defaultPointRoles(phones, slots[0], 1)
check('ברירת מחדל נייד', Object.values(phoneRoles), ['primary', 'secondary'])

// מייל: אותו מייל באותיות שונות = ערך אחד; המייל השני של הכפולה נשמר
const emails = collectPoints(records, idKey, 1, slots[1])
check('מייל זהה בלי תלות ברישיות', emails.map((p) => p.raw), ['dana@a.com', 'd2@b.com'])

const choices: Record<string, FieldChoice | null> = {}
for (const f of fields) choices[f.key] = defaultChoice(records, idKey, 1, f)
const pointRoles = Object.fromEntries(slots.map((s) => [s.id, defaultPointRoles(collectPoints(records, idKey, 1, s), s, 1)]))
const plan = buildMergePlan({ records, idKey, masterId: 1, fields, slots, choices, pointRoles, overflowField: 'notes' })
check('ברירת מחדל ⇒ שום דבר לא הולך לאיבוד', plan.lost, [])
check('נייד ראשי', plan.overrides.phone, { value: '0501111111' })
check('נייד נוסף = הנייד של הכפולה', plan.overrides.second_phone, { value: '0522222222' })
check('מייל נוסף', plan.overrides.second_email, { value: 'd2@b.com' })
check('שם פייסבוק נשלח', plan.overrides.facebook_name, { from: 2 })
check('זמינות: איחוד', plan.overrides.candidate_availability_ids, { union: true })
check('הערות מחוברות', plan.overrides.notes, { value: 'הערה א\n---\nהערה ב' })
check('אזור לא נשלח כשיש עיר (נגזר בטריגר)', 'region_id' in plan.overrides, false)
check('סיכום: נייד עבר לנוסף', plan.movedToSecondary, [{ label: 'נייד נוסף', value: '052-2222222' }])
check('אין שגיאות', plan.errors, [])

// ── תרחיש 2: בחירה שמוחקת ערך — חייבת להופיע ברשימת "לא יישמר" ──
const plan2 = buildMergePlan({ records, idKey, masterId: 1, fields, slots,
  choices: { ...choices, candidate_availability_ids: { type: 'from', recordId: 1 }, notes: { type: 'from', recordId: 1 } },
  pointRoles: { ...pointRoles, phone: { [phones[0].key]: 'primary', [phones[1].key]: 'drop' } },
  overflowField: 'notes' })
check('ערכים שלא יישמרו מוצגים', plan2.lost.map((l) => l.label).sort(), ['הערות', 'זמינות', 'נייד'].sort())

// ── תרחיש 3: שלושה ניידים — השלישי עובר להערות, לא נמחק ──
const third = { ...dup, contact_id: 3, phone: '0533333333', second_phone: '0544444444', email: null, second_email: null, notes: null }
const r3 = [master, dup, third]
const p3 = collectPoints(r3, idKey, 1, slots[0])
const roles3 = defaultPointRoles(p3, slots[0], 1)
check('4 ניידים: ראשי, נוסף, והשאר להערות', p3.map((p) => roles3[p.key]), ['primary', 'secondary', 'notes', 'notes'])
const ch3: Record<string, FieldChoice | null> = {}
for (const f of fields) ch3[f.key] = defaultChoice(r3, idKey, 1, f)
const plan3 = buildMergePlan({ records: r3, idKey, masterId: 1, fields, slots, choices: ch3,
  pointRoles: { phone: roles3, email: defaultPointRoles(collectPoints(r3, idKey, 1, slots[1]), slots[1], 1) }, overflowField: 'notes' })
check('ניידים עודפים נכנסים להערות', String((plan3.overrides.notes as { value: string }).value).includes('נייד נוסף מהמיזוג: 053-3333333'), true)
check('אין אובדן', plan3.lost, [])

// ── תרחיש 4: נייד ראשי לא תקין נחסם עם הודעה בעברית ──
const landline = { ...master, contact_id: 4, phone: null, second_phone: '036123456' }
const p4 = collectPoints([landline], idKey, 4, slots[0])
check('קווי לא מוצע כראשי', Object.values(defaultPointRoles(p4, slots[0], 4)), ['secondary'])
const plan4 = buildMergePlan({ records: [landline], idKey, masterId: 4, fields: [], slots: [slots[0]], choices: {},
  pointRoles: { phone: { [p4[0].key]: 'primary' } }, overflowField: 'notes' })
check('קווי כראשי ⇒ שגיאה', plan4.errors.length, 1)

// ── תרחיש 5: החלפת מאסטר — ברירת המחדל עוברת לערכי המאסטר החדש ──
check('מאסטר 2 ⇒ שם פייסבוק ממנו', defaultChoice(records, idKey, 2, fields[1]), { type: 'from', recordId: 2 })
check('מאסטר 2 ⇒ עיר ריקה אצלו ⇒ מהרשומה השנייה', defaultChoice(records, idKey, 2, fields[5]), { type: 'from', recordId: 1 })

console.log(`\n${pass} עברו · ${fail} נכשלו`)
if (fail) { console.log(bad.join('\n\n')); process.exit(1) }
