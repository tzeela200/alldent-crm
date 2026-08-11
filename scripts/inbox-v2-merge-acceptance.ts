/**
 * INC-3121 — בדיקות קבלה לשער האישור של Inbox V2.
 *
 * הרצה:  npx tsx scripts/inbox-v2-merge-acceptance.ts
 *
 * בודק את שתי הפונקציות הטהורות שעליהן נשענת התצוגה: תרגום קודי
 * match_reason לעברית, ותיאור "מה יישמר אחרי האישור". אין קריאות
 * Supabase ואין כתיבה — אפשר להריץ בכל עת.
 */

import { entryReasonLabel, describeMergeResult, summarizeMerge } from '@/lib/inbox-v2-merge'
import type { FieldComparison, ChoiceId } from '@/lib/inbox-v2-merge'

let pass = 0, fail = 0
const bad: string[] = []
const check = (n: string, a: unknown, e: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++
  else { fail++; bad.push(`${n}\n   ציפייה: ${JSON.stringify(e)}\n   בפועל:  ${JSON.stringify(a)}`) }
}
const heb = (s: unknown) => typeof s === 'string' && /[֐-׿]/.test(s)

// ── תרגום קודים ──
check('existing_google_link', entryReasonLabel('existing_google_link'), 'הרשומה כבר מקושרת לאיש קשר')
check('new_person', entryReasonLabel('new_person'), 'אדם חדש')
check('new_information', entryReasonLabel('new_information'), 'מידע חדש ברשומה קיימת')
check('unclassified', entryReasonLabel('unclassified'), 'סוג הרשומה לא נקבע')
check('match_conflict', entryReasonLabel('match_conflict'), 'התאמה גם לאדם וגם לארגון')
check('ריק ⇒ null', entryReasonLabel(''), null)
check('null ⇒ null', entryReasonLabel(null), null)
check('הסבר עברי עובר כמו שהוא', entryReasonLabel('נמצאה התאמה לפי נייד'), 'נמצאה התאמה לפי נייד')
check('קוד לא מוכר לא מדליף אנגלית', entryReasonLabel('some_unknown_code_xyz'), 'נדרשת בדיקה ידנית')
check('אות גדולה עדיין מתורגמת', entryReasonLabel('Existing_Google_Link'), 'הרשומה כבר מקושרת לאיש קשר')

// ── describeMergeResult ──
const cmp = (over: Partial<FieldComparison>): FieldComparison => ({
  key: 'phone', label: 'נייד', kind: 'phone' as never, status: 'diff',
  incomingRaw: '0521111111', incomingLabel: '052-1111111',
  existingRaw: '0529999999', existingLabel: '052-9999999',
  options: [
    { id: 'skip', label: 'דלג' },
    { id: 'incoming', label: 'עדכן', requiresOverwriteConfirm: true },
    { id: 'secondary', label: 'שמור כנייד נוסף' },
  ],
  blockedReason: null, secondaryTarget: 'second_phone', redirectTarget: null, target: 'phone',
  ...over,
})

check('דילוג ⇒ ללא שינוי', describeMergeResult(cmp({}), 'skip').tone, 'unchanged')
check('דילוג ⇒ הערך הקיים', describeMergeResult(cmp({}), 'skip').value, '052-9999999')
check('"השאר קיים" ⇒ ללא שינוי', describeMergeResult(cmp({}), 'existing').tone, 'unchanged')

const replaced = describeMergeResult(cmp({}), 'incoming')
check('עדכון מעל ערך קיים ⇒ replaced', replaced.tone, 'replaced')
check('עדכון ⇒ מציג את הערך החדש', replaced.value, '052-1111111')
check('עדכון ⇒ ההערה מזכירה את הישן', replaced.note?.includes('052-9999999'), true)

const filled = describeMergeResult(cmp({ existingLabel: null, existingRaw: null, status: 'complete' }), 'incoming')
check('שדה ריק ⇒ new', filled.tone, 'new')
check('שדה ריק ⇒ "השלמת מידע חסר"', filled.note, 'השלמת מידע חסר')

check('שדה זהה ⇒ unchanged', describeMergeResult(cmp({ status: 'same' }), 'skip').tone, 'unchanged')
check('שדה זהה ⇒ הערה מסבירה', describeMergeResult(cmp({ status: 'same' }), 'skip').note, 'זהה בשני המקורות')

const sec = describeMergeResult(cmp({}), 'secondary')
check('שמירה כמשני ⇒ elsewhere', sec.tone, 'elsewhere')
check('שמירה כמשני ⇒ השדה עצמו לא משתנה', sec.value, '052-9999999')
check('שמירה כמשני ⇒ ההערה מתווית האפשרות', sec.note, 'שמור כנייד נוסף')

const blocked = describeMergeResult(cmp({ status: 'unresolved', blockedReason: 'ערך לא מזוהה' }), 'incoming')
check('מידע לא מזוהה ⇒ חסום', blocked.tone, 'blocked')
check('חסום ⇒ הערך לא משתנה', blocked.value, '052-9999999')

check('ערך נכנס ריק ⇒ לא נכתב', describeMergeResult(cmp({ incomingLabel: null, incomingRaw: null }), 'incoming').tone, 'unchanged')

// כל ההערות בעברית
const allNotes = (['skip','existing','incoming','secondary'] as ChoiceId[])
  .map((c) => describeMergeResult(cmp({}), c).note).filter(Boolean)
check('כל ההערות בעברית', allNotes.every(heb), true)

// ── סיכום ──
const list = [cmp({ key: 'a' }), cmp({ key: 'b', status: 'same' }), cmp({ key: 'c' })]
check('סיכום — אף בחירה', summarizeMerge(list, { a: 'skip', b: 'skip', c: 'skip' }), { willChange: 0, unchanged: 3 })
check('סיכום — בחירה אחת', summarizeMerge(list, { a: 'incoming', b: 'skip', c: 'skip' }), { willChange: 1, unchanged: 2 })
check('סיכום — שדה זהה לא נספר כשינוי', summarizeMerge(list, { a: 'incoming', b: 'incoming', c: 'incoming' }).willChange, 2)

console.log('')
if (bad.length) { console.log('כשלים:'); bad.forEach((b) => console.log('  ✗ ' + b)); console.log('') }
console.log(`עברו: ${pass} · נכשלו: ${fail}`)
process.exit(fail === 0 ? 0 : 1)
