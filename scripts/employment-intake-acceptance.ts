/**
 * INC-3119 — בדיקות קבלה למסך "קליטה ומיון תעסוקתי" (§14 בתוכנית).
 *
 * הרצה:  npx tsx scripts/employment-intake-acceptance.ts
 *
 * מריץ את כל הלוגיקה הטהורה (src/lib/employment-intake) מול הדוגמאות
 * המפורשות שבתוכנית המאושרת. אין כאן שום קריאה ל-Supabase ואין שום
 * כתיבה — ולכן אפשר להריץ בכל עת, גם בלי סשן מחובר.
 *
 * מה *לא* מכוסה כאן ודורש דפדפן עם משתמשת מחוברת: הפייפליין מקצה לקצה,
 * resolve_employment_identity, הכתיבות לליבה, וה-Preview הגורף (כולם
 * תלויי Supabase).
 */

import { classifyText } from '@/lib/employment-intake/rules'
import { connectContext, buildDraftRows } from '@/lib/employment-intake/context'
import { extractIdentifiers } from '@/lib/employment-intake/extract'
import { findCityCandidates, attributePhones, type CityIndexEntry } from '@/lib/employment-intake/normalize'
import { matchRow, computeMatchStatus, type ContactCandidate, type AccountCandidate } from '@/lib/employment-intake/matching'
import { resolveRowIdentity, groupRowsByIdentity } from '@/lib/employment-intake/identity'
import { checkRepeat, buildAnchorKey } from '@/lib/employment-intake/repeatGuard'
import { proposeAction } from '@/lib/employment-intake/proposals'
import { normalizeForHash } from '@/lib/employment-intake/hashes'
import { contactSourceForIntakeSourceType } from '@/lib/employment-intake/contactSource'
import { computeContactMergeDiff } from '@/lib/employment-intake/mergeCompare'
import { resolveParserFamily, autoDetectFamily } from '@/lib/employment-intake/parsers'
import { parseWhatsappCopyText } from '@/lib/employment-intake/parsers/whatsappCopy'
import { parsePlainText } from '@/lib/employment-intake/parsers/plainText'
import { DETAILS_SENT_STATUS, ACCOUNT_STATUS_POTENTIAL } from '@/lib/employment-intake/detailsSent'
import * as L from '@/lib/employment-intake/labels'
import type { RawParsedMessage, EmploymentIntakeAction } from '@/types/employment-intake'

let pass = 0
let fail = 0
const failures: string[] = []

function check(group: string, name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass++
  else {
    fail++
    failures.push(`[${group}] ${name}\n    ציפייה: ${JSON.stringify(expected)}\n    בפועל:  ${JSON.stringify(actual)}`)
  }
}

function checkTrue(group: string, name: string, cond: boolean, detail = '') {
  if (cond) pass++
  else {
    fail++
    failures.push(`[${group}] ${name}${detail ? `\n    ${detail}` : ''}`)
  }
}

// ═══════════════════════════════════════════════════════════
// 1. סיווג (§14)
// ═══════════════════════════════════════════════════════════
const CLASSIFY_CASES: Array<[string, string]> = [
  ['אני מחפשת עבודה כסייעת בפתח תקווה', 'job_seeker'],
  ['מי פנויה מחר?', 'recruiter'],
  ['מרפאה מחפשת סייעת', 'recruiter'],
  ['סייעת להיום ברמת גן', 'recruiter'],
  ['מחפשת מחליפה שתחליף אותי', 'recruiter'],
  ['אני פנויה', 'job_seeker'],
  ['משרה פנויה', 'recruiter'],
  ['מחפשת מרפאה לקנייה', 'irrelevant'],
  ['אשמח לפרטים', 'unclear'],
  ['הצטרפה לקבוצה', 'group_join'],
  ['כבר מצאנו סייעת', 'recruiter'],
  ['מחפס מישרה כסעיית', 'job_seeker'],
  ['סייעת מחפשת החלפה', 'job_seeker'],
  ['רופאת שיניים מחפשת משמרת', 'job_seeker'],
  ['אני מחפשת סייעת למרפאה', 'recruiter'],
  ['צריכה סייעת', 'recruiter'],
  ['זמינה לעבודה', 'job_seeker'],
  ['למרפאה בחדרה סייעת למשרה מלאה', 'recruiter'],
  ['פנויה בימי שישי', 'job_seeker'],
  ['נפתחה משרה', 'recruiter'],
]
for (const [text, expected] of CLASSIFY_CASES) {
  check('סיווג', `"${text}"`, classifyText(text).contentType, expected)
}

// מצב הצורך — "הצורך הסתיים"
check('סיווג', 'כבר מצאנו סייעת ⇒ הצורך הסתיים', classifyText('כבר מצאנו סייעת').isActiveRequest, false)
check('סיווג', 'המשרה אוישה ⇒ הצורך הסתיים', classifyText('המשרה אוישה').isActiveRequest, false)
check('סיווג', 'הודעה פעילה ⇒ לא הסתיים', classifyText('מרפאה מחפשת סייעת').isActiveRequest, true)

// "לא ברור" — ללא סימון, עם סיבה וראיות
const unclear = classifyText('אשמח לפרטים')
checkTrue('סיווג', '"לא ברור" מסומן needs_context', unclear.needsContext)
checkTrue('סיווג', '"לא ברור" נושא סיבה בעברית', unclear.classifyReason.length > 0 && /[֐-׿]/.test(unclear.classifyReason))
checkTrue('סיווג', 'סיווג ברור נושא ראיות מהטקסט', classifyText('אני מחפשת עבודה כסייעת').evidence.length > 0)

// ═══════════════════════════════════════════════════════════
// 2. חיבור הודעות המשך (§8.3, §14)
// ═══════════════════════════════════════════════════════════
const t0 = new Date('2026-08-01T10:00:00Z')
const msg = (seq: number, text: string, sender: string, offsetSec: number): RawParsedMessage => ({
  seq,
  text,
  senderName: sender,
  senderPhone: null,
  sentAt: new Date(t0.getTime() + offsetSec * 1000).toISOString(),
  messageId: null,
})

// 3 הודעות מאותו שולח, סמוכות בזמן, המשך ברור
const contUnits = connectContext([
  msg(1, 'שלום, אני מחפשת עבודה כסייעת', 'רונית', 0),
  msg(2, 'באזור פתח תקווה', 'רונית', 30),
  msg(3, 'זמינה בימים א-ה', 'רונית', 60),
])
check('הקשר', '3 הודעות רצופות ⇒ יחידת ניתוח אחת', contUnits.length, 1)
check('הקשר', 'היחידה מכילה 3 הודעות מקור', contUnits[0].members.length, 3)
checkTrue('הקשר', 'combinedText מכיל את כל שלוש ההודעות', ['מחפשת עבודה', 'פתח תקווה', 'א-ה'].every((s) => contUnits[0].combinedText.includes(s)))

// אפס אובדן — כל הודעה הופכת לשורה משלה
const drafts = buildDraftRows(contUnits[0])
check('הקשר', 'אפס אובדן — 3 הודעות ⇒ 3 שורות', drafts.length, 3)
check('הקשר', 'רק הראשית היא primary', drafts.filter((d) => d.isPrimary).length, 1)
check('הקשר', 'החברות מצביעות לראשית דרך parent_seq', drafts.filter((d) => !d.isPrimary).map((d) => d.parentSeq), [1, 1])
check('הקשר', 'original_text נשמר בית-לבית לכל הודעה', drafts.map((d) => d.originalText), [
  'שלום, אני מחפשת עבודה כסייעת',
  'באזור פתח תקווה',
  'זמינה בימים א-ה',
])

// שולחים שונים ⇒ לא מחוברות
const twoSenders = connectContext([msg(1, 'מחפשת סייעת למרפאה', 'דנה', 0), msg(2, 'אני זמינה', 'מירב', 20)])
check('הקשר', 'שולחים שונים ⇒ שתי יחידות', twoSenders.length, 2)

// פער זמן גדול ⇒ לא מחוברות
const farApart = connectContext([msg(1, 'מחפשת סייעת', 'דנה', 0), msg(2, 'ובאזור המרכז', 'דנה', 60 * 60)])
check('הקשר', 'פער זמן גדול ⇒ שתי יחידות (בספק לא מחברים)', farApart.length, 2)

// הודעה שנראית חדשה ⇒ לא מחוברת
const newTopic = connectContext([msg(1, 'מחפשת סייעת למרפאה בחדרה', 'דנה', 0), msg(2, 'אני מחפשת עבודה כרופאת שיניים', 'דנה', 30)])
check('הקשר', 'הודעה עצמאית חדשה ⇒ לא מחוברת', newTopic.length, 2)

// ═══════════════════════════════════════════════════════════
// 3. חילוץ וייחוס טלפון (§8.4)
// ═══════════════════════════════════════════════════════════
const ex1 = extractIdentifiers('לפרטים נא לפנות ל 052-1234567 או במייל dana@clinic.co.il', '0501112222')
check('חילוץ', 'מספר בהודעה מזוהה', ex1.phones.filter((p) => p.source === 'message').length, 1)
check('חילוץ', 'מספר בהודעה מנצח — טלפון השולח אינו נכנס', ex1.phones.some((p) => p.source === 'sender'), false)
check('חילוץ', 'מייל חולץ', ex1.emails, ['dana@clinic.co.il'])

const ex2 = extractIdentifiers('מחפשת עבודה כסייעת', '0501112222')
check('חילוץ', 'אין מספר בהודעה ⇒ טלפון השולח משמש כ-fallback', ex2.phones.map((p) => p.source), ['sender'])

const ex3 = extractIdentifiers('נייד 052-1234567 ובבית 053-7654321 ועוד 054-1112233', null)
check('חילוץ', 'שלושה מספרים בהודעה', ex3.phones.length, 3)

const ex4 = extractIdentifiers('הפרופיל שלה https://www.facebook.com/profile.php?id=1000123456789', null)
check('חילוץ', 'Facebook ID חולץ מ-profile.php', ex4.facebookId, '1000123456789')
checkTrue('חילוץ', 'Facebook URL נשמר', ex4.facebookUrls.length === 1)

// ייחוס סופי — שני מספרים תקינים + אחד לא תקין
const attributed = attributePhones(
  [
    { raw: '052-1234567', source: 'message' },
    { raw: '053-7654321', source: 'message' },
    { raw: '054-1112233', source: 'message' },
    { raw: '03-5556666', source: 'message' },
  ],
  new Map([
    ['052-1234567', '972521234567'],
    ['053-7654321', '972537654321'],
    ['054-1112233', '972541112233'],
    ['03-5556666', null], // קו נייח — normalize_il_mobile_phone מחזיר null
  ]),
)
check('ייחוס טלפון', 'ראשי', attributed.phoneNorm, '972521234567')
check('ייחוס טלפון', 'משני', attributed.secondPhoneNorm, '972537654321')
checkTrue('ייחוס טלפון', 'עודפים + לא תקינים נשארים לבדיקה', attributed.unassignedPhones.includes('054-1112233') && attributed.unassignedPhones.includes('03-5556666'))

// ═══════════════════════════════════════════════════════════
// 4. נרמול עיר — מועמדים מנוקי תחיליות (§8.5)
// ═══════════════════════════════════════════════════════════
const cityIndex: CityIndexEntry[] = [
  { id: 1, name: 'פתח תקווה', normalizedName: 'פתח תקווה', aliases: ['פ"ת'], regionId: 2 },
  { id: 2, name: 'רמת גן', normalizedName: 'רמת גן', aliases: [], regionId: 2 },
  { id: 3, name: 'חדרה', normalizedName: 'חדרה', aliases: [], regionId: 3 },
  { id: 4, name: 'בני ברק', normalizedName: 'בני ברק', aliases: [], regionId: 2 },
]
checkTrue('נרמול עיר', 'ב+עיר ⇒ מוחזרת ללא התחילית', findCityCandidates('אני מחפשת עבודה כסייעת בפתח תקווה', cityIndex).includes('פתח תקווה'))
checkTrue('נרמול עיר', 'עיר דו-מילית ברמת גן', findCityCandidates('סייעת להיום ברמת גן', cityIndex).includes('רמת גן'))
checkTrue('נרמול עיר', 'עיר חד-מילית בחדרה', findCityCandidates('למרפאה בחדרה סייעת', cityIndex).includes('חדרה'))
checkTrue('נרמול עיר', 'ל+עיר', findCityCandidates('נוסעת לבני ברק מחר', cityIndex).includes('בני ברק'))
check('נרמול עיר', 'ללא עיר ⇒ אין מועמדים', findCityCandidates('מחפשת עבודה במשרה מלאה', cityIndex), [])

// ═══════════════════════════════════════════════════════════
// 5. התאמה (§9)
// ═══════════════════════════════════════════════════════════
const contacts: ContactCandidate[] = [
  { contact_id: 11, display_name: 'רונית כהן', phone_norm: '972521234567', second_phone: null, email: 'ronit@x.com', second_email: null, facebook_id: null, facebook_url: null, role: 9, city_id: 1 },
  { contact_id: 12, display_name: 'דנה לוי', phone_norm: '972539999999', second_phone: null, email: null, second_email: null, facebook_id: '1000123456789', facebook_url: null, role: 9, city_id: 2 },
  { contact_id: 13, display_name: 'רונית כהן', phone_norm: '972544444444', second_phone: null, email: null, second_email: null, facebook_id: null, facebook_url: null, role: 9, city_id: 1 },
]
const accounts: AccountCandidate[] = [
  { account_id: 21, account_name: 'מרפאת שיניים חדרה', phone_norm: '972501111111', second_phone: null, email: null, second_email: null, facebook_id: null, facebook_url: null, city_id: 3 },
]
const emptyInput = { phoneNorm: null, secondPhoneNorm: null, email: null, secondEmail: null, facebookId: null, facebookUrl: null, contactNameRaw: null, orgNameRaw: null, roleId: null, cityId: null }

const byPhone = matchRow({ ...emptyInput, phoneNorm: '972521234567' }, { contacts, accounts })
check('התאמה', 'טלפון מנורמל ⇒ התאמה ודאית', [byPhone.matchContact, byPhone.matchType], [11, 'exact'])

const byFb = matchRow({ ...emptyInput, facebookId: '1000123456789' }, { contacts, accounts })
check('התאמה', 'Facebook ID ⇒ התאמה ודאית', [byFb.matchContact, byFb.matchType], [12, 'exact'])

const byEmail = matchRow({ ...emptyInput, email: 'RONIT@X.com' }, { contacts, accounts })
check('התאמה', 'מייל (case-insensitive) ⇒ התאמה ודאית', [byEmail.matchContact, byEmail.matchType], [11, 'exact'])

const nameOnly = matchRow({ ...emptyInput, contactNameRaw: 'רונית כהן' }, { contacts, accounts })
check('התאמה', 'שם בלבד ללא תפקיד/עיר ⇒ אין התאמה אוטומטית', [nameOnly.matchContact, nameOnly.matchType], [null, 'none'])

const nameRole = matchRow({ ...emptyInput, contactNameRaw: 'רונית כהן', roleId: 9 }, { contacts, accounts })
check('התאמה', 'שם+תפקיד עם שני מועמדים ⇒ נמצאו מספר התאמות', nameRole.matchType, 'ambiguous')
check('התאמה', 'ambiguous אינו בוחר אוטומטית', [nameRole.matchContact, nameRole.matchAccount], [null, null])

const noMatch = matchRow({ ...emptyInput, phoneNorm: '972500000000' }, { contacts, accounts })
check('התאמה', 'אין התאמה', [noMatch.matchContact, noMatch.matchType], [null, 'none'])

const accMatch = matchRow({ ...emptyInput, phoneNorm: '972501111111' }, { contacts, accounts })
check('התאמה', 'התאמת ארגון לפי טלפון', accMatch.matchAccount, 21)

// ציר #2 — מצב ההתאמה למאגר
check('מצב במאגר', 'איש קשר', computeMatchStatus({ match_contact: 11, match_account: null, match_type: 'exact', last_action_id: null }), 'contact_found')
check('מצב במאגר', 'ארגון', computeMatchStatus({ match_contact: null, match_account: 21, match_type: 'exact', last_action_id: null }), 'account_found')
check('מצב במאגר', 'שניהם', computeMatchStatus({ match_contact: 11, match_account: 21, match_type: 'exact', last_action_id: null }), 'both_found')
check('מצב במאגר', 'מספר התאמות', computeMatchStatus({ match_contact: null, match_account: null, match_type: 'ambiguous', last_action_id: null }), 'multiple')
check('מצב במאגר', 'לא נמצאה', computeMatchStatus({ match_contact: null, match_account: null, match_type: 'none', last_action_id: null }), 'none')
check('מצב במאגר', 'כבר קושרה', computeMatchStatus({ match_contact: 11, match_account: null, match_type: 'exact', last_action_id: 5 }), 'already_linked')

// ═══════════════════════════════════════════════════════════
// 6. זהות מאוחדת (§4)
// ═══════════════════════════════════════════════════════════
const G = '11111111-1111-1111-1111-111111111111'
const G2 = '22222222-2222-2222-2222-222222222222'
const idRow = (id: number, canonical: number | null, group: string | null, conflict = false) => ({
  id,
  canonical_contact_id: canonical,
  identity_group_id: group,
  identity_conflict: conflict,
})

check('זהות', 'canonical_contact_id גובר', resolveRowIdentity(idRow(1, 11, G))?.key, 'c:11')
check('זהות', 'ללא contact ⇒ מפתח לפי קבוצה', resolveRowIdentity(idRow(2, null, G))?.key, 'g:' + G)
check('זהות', 'identity_conflict ⇒ אין זהות (מוחרגת)', resolveRowIdentity(idRow(3, 11, null, true)), null)
check('זהות', 'ללא מזהה כלל ⇒ אין זהות', resolveRowIdentity(idRow(4, null, null)), null)

// אדם ב-8 קבוצות — 8 הופעות, זהות אחת
const eightOccurrences = Array.from({ length: 8 }, (_, i) => idRow(100 + i, 11, G))
const grouped8 = groupRowsByIdentity(eightOccurrences)
check('זהות', '8 הופעות ⇒ זהות אחת', grouped8.groups.size, 1)
check('זהות', '8 ההופעות נשמרות תחת הזהות', grouped8.groups.get('c:11')!.rows.length, 8)

// שלוש הופעות — טלפון/מייל/FB — כשכולן מותאמות לאותו contact ⇒ זהות אחת
const threeChannels = [idRow(201, 11, G), idRow(202, 11, G), idRow(203, 11, G)]
check('זהות', 'שלושה ערוצים ⇒ זהות אחת', groupRowsByIdentity(threeChannels).groups.size, 1)

// שתי קבוצות שונות ⇒ שתי זהויות
check('זהות', 'שתי קבוצות ⇒ שתי זהויות', groupRowsByIdentity([idRow(301, null, G), idRow(302, null, G2)]).groups.size, 2)

// חסומות מוחזרות בנפרד
const mixed = groupRowsByIdentity([idRow(401, 11, G), idRow(402, null, null, true), idRow(403, null, null)])
check('זהות', 'חסומות אינן נכנסות לקיבוץ', mixed.groups.size, 1)
check('זהות', 'חסומות מוחזרות בנפרד', mixed.unidentified.length, 2)

check('זהות', 'anchor_key לפי contact', buildAnchorKey({ key: 'c:11', contactId: 11, identityGroupId: G }), 'c:11')
check('זהות', 'anchor_key לפי קבוצה כשאין contact', buildAnchorKey({ key: 'g:' + G, contactId: null, identityGroupId: G }), 'g:' + G)

// ═══════════════════════════════════════════════════════════
// 7. מניעת פעולה חוזרת (§5.4)
// ═══════════════════════════════════════════════════════════
const action = (over: Partial<EmploymentIntakeAction>): EmploymentIntakeAction => ({
  action_id: 1,
  anchor_key: 'c:11',
  identity_group_id: G,
  contact_id: 11,
  account_id: null,
  action_type: 'mark_details_sent',
  details_sent_type: 'pool_join',
  performed_at: '2026-08-05T09:00:00Z',
  performed_by: 'admin@alldent.co.il',
  result: 'done',
  error_message: null,
  source_intake_ids: [1, 2, 3, 4, 5, 6, 7, 8],
  occurrence_count: 8,
  applied_patch: null,
  applied_before: null,
  bulk_run_id: 'x',
  idempotency_key: 'y',
  created_at: '2026-08-05T09:00:00Z',
  ...over,
})
const identityC11 = { key: 'c:11', contactId: 11, identityGroupId: G }

check(
  'מניעת חזרה',
  'אותה פעולה + אותו סוג ⇒ כבר טופלה',
  checkRepeat([action({})], identityC11, 'mark_details_sent', 'pool_join').alreadyDone,
  true,
)
check(
  'מניעת חזרה',
  'סוג פרטים אחר ⇒ לא נחשבת חוזרת',
  checkRepeat([action({})], identityC11, 'mark_details_sent', 'job_seeking').alreadyDone,
  false,
)
check(
  'מניעת חזרה',
  'result!=done ⇒ לא נחשבת',
  checkRepeat([action({ result: 'error' })], identityC11, 'mark_details_sent', 'pool_join').alreadyDone,
  false,
)
// פעולה שנרשמה לפני שהיה Contact — נמצאת דרך identity_group_id
check(
  'מניעת חזרה',
  'פעולה שנרשמה לפני יצירת Contact נמצאת דרך הקבוצה',
  checkRepeat([action({ contact_id: null, anchor_key: 'g:' + G })], identityC11, 'mark_details_sent', 'pool_join').alreadyDone,
  true,
)
check(
  'מניעת חזרה',
  'זהות אחרת ⇒ לא נחשבת',
  checkRepeat([action({})], { key: 'c:99', contactId: 99, identityGroupId: G2 }, 'mark_details_sent', 'pool_join').alreadyDone,
  false,
)
check(
  'מניעת חזרה',
  'הפעולה האחרונה מוחזרת עם מועד ומבצע',
  (() => {
    const r = checkRepeat([action({ action_id: 1, performed_at: '2026-08-01T09:00:00Z' }), action({ action_id: 2, performed_at: '2026-08-05T09:00:00Z' })], identityC11, 'mark_details_sent', 'pool_join')
    return r.lastAction?.action_id
  })(),
  2,
)

// ═══════════════════════════════════════════════════════════
// 8. מנוע ההצעות ומסלולי social_status (§10)
// ═══════════════════════════════════════════════════════════
check('הצעות', 'מחפש עבודה + חדש ⇒ 1 + יצירה', proposeAction({ contentType: 'job_seeker', isActiveRequest: true, matchContact: null }), { proposedSocialStatus: 1, proposedAction: 'create_contact' })
check('הצעות', 'מגייס + חדש ⇒ 2 + יצירה', proposeAction({ contentType: 'recruiter', isActiveRequest: true, matchContact: null }), { proposedSocialStatus: 2, proposedAction: 'create_contact' })
check('הצעות', 'הצטרפות + חדש ⇒ 3 + יצירה', proposeAction({ contentType: 'group_join', isActiveRequest: true, matchContact: null }), { proposedSocialStatus: 3, proposedAction: 'create_contact' })
check('הצעות', 'מחפש עבודה + קיים ⇒ 1 + עדכון סטטוס', proposeAction({ contentType: 'job_seeker', isActiveRequest: true, matchContact: 11 }), { proposedSocialStatus: 1, proposedAction: 'mark_lead_status' })
check('הצעות', '"לא ברור" ⇒ אין הצעה כלל', proposeAction({ contentType: 'unclear', isActiveRequest: null, matchContact: 11 }), { proposedSocialStatus: null, proposedAction: null })
check('הצעות', '"טרם סווג" ⇒ אין הצעה', proposeAction({ contentType: 'unclassified', isActiveRequest: null, matchContact: 11 }), { proposedSocialStatus: null, proposedAction: null })
check('הצעות', 'לא רלוונטי + קיים ⇒ 12', proposeAction({ contentType: 'irrelevant', isActiveRequest: true, matchContact: 11 }), { proposedSocialStatus: 12, proposedAction: 'mark_irrelevant' })
check('הצעות', 'לא רלוונטי + אין רשומה ⇒ אין כתיבה', proposeAction({ contentType: 'irrelevant', isActiveRequest: true, matchContact: null }), { proposedSocialStatus: null, proposedAction: null })
check('הצעות', 'צורך שהסתיים ⇒ אין הצעה', proposeAction({ contentType: 'recruiter', isActiveRequest: false, matchContact: 11 }), { proposedSocialStatus: null, proposedAction: null })
check('הצעות', 'רשומה חדשה שזוהתה כמחפשת אינה מקבלת גם "הצטרפות למאגר"', proposeAction({ contentType: 'job_seeker', isActiveRequest: true, matchContact: null }).proposedSocialStatus !== 3, true)

// מסלולי "נשלחו פרטים" (§6.3)
check('נשלחו פרטים', 'חיפוש עבודה ⇒ 5', DETAILS_SENT_STATUS.job_seeking, 5)
check('נשלחו פרטים', 'תהליך גיוס ⇒ 4', DETAILS_SENT_STATUS.recruiting, 4)
check('נשלחו פרטים', 'הצטרפות למאגר ⇒ 6', DETAILS_SENT_STATUS.pool_join, 6)
check('נשלחו פרטים', 'לעולם לא account_status=7', Object.values(DETAILS_SENT_STATUS).includes(7), false)
check('נשלחו פרטים', 'ארגון במסלול גיוס ⇒ "פוטנציאלי – לטיפול" (1)', ACCOUNT_STATUS_POTENTIAL, 1)

// ═══════════════════════════════════════════════════════════
// 9. כפילויות ו-normalized_text (נספח א׳.3)
// ═══════════════════════════════════════════════════════════
check('כפילות', 'lowercase + כיווץ רווחים', normalizeForHash('  Shalom   OLAM  '), 'shalom olam')
check('כפילות', 'אותו תוכן בשני מקורות ⇒ אותו normalized_text', normalizeForHash('מחפשת סייעת') === normalizeForHash('מחפשת   סייעת'), true)
check('כפילות', 'תוכן שונה ⇒ normalized_text שונה', normalizeForHash('מחפשת סייעת') === normalizeForHash('מחפשת רופאה'), false)
checkTrue('כפילות', 'תווי רוחב-אפס מוסרים', normalizeForHash('אבג​דה') === 'אבגדה')
checkTrue('כפילות', 'תווי כיווניות מוסרים', normalizeForHash('‫טקסט‬') === 'טקסט')

// ═══════════════════════════════════════════════════════════
// 10. מקור הקליטה → contact.source (§5.5)
// ═══════════════════════════════════════════════════════════
check('מקור', 'WhatsApp ⇒ 4', contactSourceForIntakeSourceType('WhatsApp'), 4)
check('מקור', 'Facebook Group ⇒ 5', contactSourceForIntakeSourceType('Facebook Group'), 5)
check('מקור', 'Facebook Page ⇒ 5', contactSourceForIntakeSourceType('Facebook Page'), 5)
check('מקור', 'Excel ⇒ נשאר ריק', contactSourceForIntakeSourceType('Excel'), null)
check('מקור', 'CSV ⇒ נשאר ריק', contactSourceForIntakeSourceType('CSV'), null)
check('מקור', 'Email ⇒ נשאר ריק', contactSourceForIntakeSourceType('Email'), null)
check('מקור', 'Manual ⇒ נשאר ריק', contactSourceForIntakeSourceType('Manual'), null)

// ═══════════════════════════════════════════════════════════
// 11. מיזוג פר-שדה — ללא דריסה שקטה (§3.5 פעולה 10)
// ═══════════════════════════════════════════════════════════
const mergeRow = {
  contact_name: 'רונית כהן',
  phone: '0521234567',
  second_phone: null,
  email: 'ronit@new.com',
  second_email: null,
  facebook_id: null,
  facebook_url: null,
  facebook_name: null,
  role_id: 9,
  city_id: 1,
  org_name: null,
}
const mergeDiffs = computeContactMergeDiff(mergeRow, {
  display_name: 'רונית כהן',
  phone: null,
  second_phone: null,
  email: 'ronit@old.com',
  second_email: null,
  facebook_id: null,
  facebook_url: null,
  facebook_name: null,
  role: 9,
  city_id: null,
})
check('מיזוג', 'ערך זהה אינו מוצע', mergeDiffs.find((d) => d.key === 'display_name'), undefined)
check('מיזוג', 'תפקיד זהה אינו מוצע', mergeDiffs.find((d) => d.key === 'role'), undefined)
check('מיזוג', 'שדה ריק ⇒ מסומן fillsEmpty', mergeDiffs.find((d) => d.key === 'phone')?.fillsEmpty, true)
check('מיזוג', 'ערך קיים שונה ⇒ מוצע אך לא fillsEmpty', mergeDiffs.find((d) => d.key === 'email')?.fillsEmpty, false)
check('מיזוג', 'עיר ריקה ⇒ מוצעת', mergeDiffs.find((d) => d.key === 'city_id')?.fillsEmpty, true)
checkTrue('מיזוג', 'כל השדות המוצעים נושאים תווית עברית', mergeDiffs.every((d) => /[֐-׿]/.test(d.label)))

// ═══════════════════════════════════════════════════════════
// 12. Parsers — זיהוי משפחה ואפס אובדן
// ═══════════════════════════════════════════════════════════
check('Parsers', 'WhatsApp לפי שם דיקט', resolveParserFamily('WhatsApp'), 'whatsapp')
check('Parsers', 'Facebook Group לפי שם דיקט', resolveParserFamily('Facebook Group'), 'facebook')
check('Parsers', 'CSV לפי שם דיקט', resolveParserFamily('CSV'), 'tabular')
check('Parsers', 'Manual ⇒ plain', resolveParserFamily('Manual'), 'plain')

const waText = `[01/08/2026, 10:00:00] רונית: אני מחפשת עבודה כסייעת
[01/08/2026, 10:00:30] רונית: באזור פתח תקווה
[01/08/2026, 10:05:00] דנה: מרפאה מחפשת סייעת לחדרה`
const waParsed = parseWhatsappCopyText(waText)
checkTrue('Parsers', 'ייצוא WhatsApp מזוהה', waParsed !== null)
check('Parsers', 'אפס אובדן — 3 שורות ⇒ 3 הודעות', waParsed?.length, 3)
check('Parsers', 'שם השולח נחלץ', waParsed?.map((m) => m.senderName), ['רונית', 'רונית', 'דנה'])
checkTrue('Parsers', 'זמן הפרסום המקורי נחלץ מהמקור', !!waParsed?.[0].sentAt)
check('Parsers', 'זיהוי אוטומטי של WhatsApp', autoDetectFamily(waText), 'whatsapp')
check('Parsers', 'טקסט חופשי ⇒ plain', autoDetectFamily('סתם טקסט בלי חותמות זמן'), 'plain')

const plainParsed = parsePlainText('הודעה ראשונה\nשורה שנייה של אותה הודעה\n\nהודעה שנייה')
check('Parsers', 'הדבקה — פסקה = הודעה, לא שורה', plainParsed.length, 2)
check('Parsers', 'source_published_at ריק כשאינו במקור', plainParsed[0].sentAt, null)

// ═══════════════════════════════════════════════════════════
// 13. עברית מלאה (§12) — אין ערך טכני שדולף לתצוגה
// ═══════════════════════════════════════════════════════════
const hebrew = (s: string) => /[֐-׿]/.test(s)
const allLabelMaps: Array<[string, Record<string, string>]> = [
  ['CONTENT_TYPE_LABEL', L.CONTENT_TYPE_LABEL],
  ['MATCH_STATUS_LABEL', L.MATCH_STATUS_LABEL],
  ['MATCH_TYPE_LABEL', L.MATCH_TYPE_LABEL],
  ['CONFIDENCE_LABEL', L.CONFIDENCE_LABEL],
  ['ACTION_TYPE_LABEL', L.ACTION_TYPE_LABEL],
  ['DETAILS_SENT_TYPE_LABEL', L.DETAILS_SENT_TYPE_LABEL],
  ['ACTION_RESULT_LABEL', L.ACTION_RESULT_LABEL],
]
for (const [name, map] of allLabelMaps) {
  const nonHebrew = Object.entries(map).filter(([, v]) => !hebrew(v))
  check('עברית', `${name} — כל הערכים בעברית`, nonHebrew, [])
  const leaks = Object.entries(map).filter(([k, v]) => v === k)
  check('עברית', `${name} — אין ערך טכני שדולף כמו-שהוא`, leaks, [])
}
// FIELD_LABEL מכיל גם "מזהה Facebook"/"קישור Facebook" — שם מותג לגיטימי
const fieldLeaks = Object.entries(L.FIELD_LABEL).filter(([, v]) => !hebrew(v))
check('עברית', 'FIELD_LABEL — כל התוויות מכילות עברית', fieldLeaks, [])

// match_field מוצג בטבלה ובפאנל — כל ערך אפשרי חייב תרגום, אחרת דולף שם עמודה
const MATCH_FIELD_VALUES = ['phone_norm', 'second_phone', 'second_phone_norm', 'email', 'second_email', 'facebook_id', 'facebook_url', 'display_name', 'account_name', 'manual', 'created']
const untranslated = MATCH_FIELD_VALUES.filter((k) => L.fieldLabel(k) === k)
check('עברית', 'כל ערכי match_field מתורגמים (אין נפילה לשם העמודה)', untranslated, [])

checkTrue('עברית', 'שם המסך בעברית', hebrew(L.SCREEN_TITLE))
checkTrue('עברית', 'תת-כותרת בעברית', hebrew(L.SCREEN_SUBTITLE))
checkTrue('עברית', 'לשוניות בעברית', hebrew(L.TAB_LABEL.intake) && hebrew(L.TAB_LABEL.results))
checkTrue('עברית', 'מצבי טעינה בעברית', Object.values(L.LOADING_LABEL).every(hebrew))
checkTrue('עברית', 'מצבי ריק בעברית', Object.values(L.EMPTY_LABEL).every(hebrew))

// הודעות הצלחה / שגיאה / אזהרה / חלקית
checkTrue('הודעות', 'הצלחה — יצירת איש קשר', hebrew(L.successContactCreated()))
checkTrue('הודעות', 'הצלחה — יצירת ארגון', hebrew(L.successAccountCreated()))
checkTrue('הודעות', 'הצלחה — עדכון סטטוס מזכיר את הסטטוס', L.successStatusUpdated('ליד חדש – חיפוש עבודה').includes('ליד חדש – חיפוש עבודה'))
checkTrue('הודעות', 'הצלחה — נשלחו פרטים מזכירה את מועד הקשר', L.successDetailsSent().includes('מועד יצירת הקשר האחרון'))
checkTrue('הודעות', 'הצלחה — מיזוג מדגישה שאין דריסה', L.successMergeNoOverwrite().includes('ללא דריסת'))
checkTrue('הודעות', 'אין "Success"/"Saved" באנגלית', ![L.successContactCreated(), L.successAccountCreated(), L.successDetailsSent()].some((s) => /success|saved/i.test(s)))

checkTrue('הודעות', 'שגיאה — טלפון לא תקין מסבירה למה', L.errorInvalidPhone().includes('נייד ישראלי תקין'))
checkTrue('הודעות', 'שגיאה — מספר התאמות מסבירה מה לעשות', L.errorAmbiguousMatch().includes('ידנית'))
checkTrue('הודעות', 'שגיאה — רשומה שהשתנתה', hebrew(L.errorStaleRow()))
checkTrue('הודעות', 'שגיאה — קובץ כפול', L.errorDuplicateFile().includes('כבר נקלט'))
checkTrue('הודעות', 'שגיאה — אין מזהה תקין', L.errorNoIdentifier().includes('מזהה'))
checkTrue('הודעות', 'אזהרה — "עובד ארגון" מוצגת', L.warningOrgEmployeeProfile().includes('עובד ארגון'))
checkTrue('הודעות', 'אזהרה — אין אישור בלי טקסט מקורי', L.warningNoOriginalText().includes('המקורית'))
checkTrue('הודעות', '"כבר טופלה" כוללת מועד ומבצע', L.errorAlreadyHandled('05.08.2026', 'admin@x.com').includes('05.08.2026') && L.errorAlreadyHandled('05.08.2026', 'admin@x.com').includes('admin@x.com'))

const partial = L.errorPartial(7, 2, 1)
checkTrue('הודעות', 'פעולה חלקית מציגה מספרים מדויקים ולא הצלחה כללית', partial.includes('7') && partial.includes('2') && partial.includes('1') && partial.includes('חלקי'))

const previewLines = L.bulkPreviewSummary({ occurrences: 20, identities: 8, toUpdate: 5, alreadyHandled: 2, blocked: 1 })
check('הודעות', 'Preview גורף — חמישה נתונים', previewLines.length, 5)
checkTrue('הודעות', 'Preview גורף — כל השורות בעברית', previewLines.every(hebrew))
checkTrue('הודעות', 'דוח גורף בעברית', hebrew(L.bulkResultSummary({ succeeded: 5, skipped: 2, failed: 1 })))

// ═══════════════════════════════════════════════════════════
console.log('')
console.log('═'.repeat(70))
if (failures.length) {
  console.log('כשלים:')
  for (const f of failures) console.log('  ✗ ' + f)
  console.log('')
}
console.log(`עברו: ${pass} · נכשלו: ${fail} · סה"כ: ${pass + fail}`)
console.log('═'.repeat(70))
process.exit(fail === 0 ? 0 : 1)
