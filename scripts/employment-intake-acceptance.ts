/**
 * INC-3119 — בדיקות קבלה למסך "איתור מחפשי עבודה ומגייסים" (§14 בתוכנית).
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

import { classifyText, messagePointsAtSender } from '@/lib/employment-intake/rules'
import { connectContext, buildDraftRows } from '@/lib/employment-intake/context'
import { extractIdentifiers } from '@/lib/employment-intake/extract'
import { findCityCandidates, attributePhones, pickLandline, type CityIndexEntry } from '@/lib/employment-intake/normalize'
import { matchRow, computeMatchStatus, type ContactCandidate, type AccountCandidate } from '@/lib/employment-intake/matching'
import { resolveRowIdentity, groupRowsByIdentity } from '@/lib/employment-intake/identity'
import { checkRepeat, buildAnchorKey } from '@/lib/employment-intake/repeatGuard'
import { proposeAction } from '@/lib/employment-intake/proposals'
import { normalizeForHash } from '@/lib/employment-intake/hashes'
import { contactSourceForIntakeSourceType } from '@/lib/employment-intake/contactSource'
import { computeContactMergeDiff } from '@/lib/employment-intake/mergeCompare'
import { sourceHashKey, dedupeBySourceHash } from '@/lib/employment-intake/sourceHash'
import { resolveParserFamily, autoDetectFamily } from '@/lib/employment-intake/parsers'
import { parseWhatsappCopyText } from '@/lib/employment-intake/parsers/whatsappCopy'
import { parsePlainText } from '@/lib/employment-intake/parsers/plainText'
import { DETAILS_SENT_STATUS, ACCOUNT_STATUS_POTENTIAL } from '@/lib/employment-intake/detailsSent'
import { detectSourceEvent, parseStructuredGoogleContact, targetNameOnly } from '@/lib/employment-intake/sourceMessage'
import { resolveEffectiveFields } from '@/lib/employment-intake/effectiveFields'
import {
  isEligibleForReclassify,
  buildRowPatch,
  classifyRowDiff,
  PIPELINE_OWNED_FIELDS,
  ENGINE_OWNED_TAGS,
} from '@/lib/employment-intake/reclassifyDiff'
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
// 1ב. אירועי מקור WhatsApp + פורמט Google השמור
// ═══════════════════════════════════════════════════════════
const joinedByPhone = detectSourceEvent('\u200f+972 52-805-1911 הצטרף/ה לקבוצה באמצעות קישור.')
check('אירועי מקור', 'מצטרף במספר מזוהה כ-join', joinedByPhone.kind, 'join')
check('אירועי מקור', 'מספר המצטרף נשמר כמושא האירוע', joinedByPhone.targetPhone, '+972 52-805-1911')

const osheretJoin = detectSourceEvent('\u200f~\u202fאושרת ביטון מזכירה לוד הצטרפה לקבוצה באמצעות קישור.')
check('אירועי מקור', 'מצטרפת בשם מזוהה כ-join', osheretJoin.kind, 'join')
const osheretStructured = parseStructuredGoogleContact({
  label: osheretJoin.targetLabel,
  matchedRoleAlias: 'מזכירה',
  roleId: 13,
  cityCandidate: 'לוד',
})
check('Google Contact', 'שם+תפקיד+עיר מזוהה כאיש קשר שמור', osheretStructured.isStructured, true)
check('Google Contact', 'שם קנוני מחולץ בלי תפקיד ועיר', osheretStructured.contactName, 'אושרת ביטון')

const irisJoin = detectSourceEvent('איריס אשד הצטרפה לקבוצה באמצעות קישור.')
check('אירועי מקור', 'שם בלבד נשמר כמושא', targetNameOnly(irisJoin), 'איריס אשד')
const irisStructured = parseStructuredGoogleContact({ label: irisJoin.targetLabel, matchedRoleAlias: null, roleId: null, cityCandidate: null })
check('Google Contact', 'שם בלבד אינו נחשב פורמט Google בטוח', irisStructured.isStructured, false)

const added = detectSourceEvent('דנה כהן צירפה את איריס אשד')
check('אירועי מקור', 'צירוף — Actor נכון', added.actorLabel, 'דנה כהן')
check('אירועי מקור', 'צירוף — Target נכון', added.targetLabel, 'איריס אשד')

for (const noise of ['ההודעה הזו נמחקה', '<המדיה לא נכללה>', 'דנה יצאה', 'דנה הסירה את איריס']) {
  check('אירועי מקור', `הודעת מערכת מוסתרת: ${noise}`, detectSourceEvent(noise).kind, 'system_noise')
  check('סיווג', `הודעת מערכת אינה רשומת עבודה: ${noise}`, classifyText(noise).contentType, 'irrelevant')
}

for (const fragment of ['מחר', 'גם אני', 'בחולון', 'כן']) {
  const fragmentResult = classifyText(fragment)
  check('הקשר', `קטע קצר דורש בדיקה: ${fragment}`, fragmentResult.contentType, 'unclear')
  check('הקשר', `קטע קצר מסומן needs_context: ${fragment}`, fragmentResult.needsContext, true)
}

const doctorStructured = parseStructuredGoogleContact({
  label: 'דר נפתלי חן * חולון',
  matchedRoleAlias: 'דר',
  roleId: 1,
  cityCandidate: 'חולון',
})
check('Google Contact', 'רופא + עיר מזוהה כפורמט שמור', doctorStructured.isStructured, true)
check('Google Contact', 'תואר דר והכוכבית נשמרים בשם הקנוני', doctorStructured.contactName, 'דר נפתלי חן *')

// "דר" בלבד, בלי roleId/matchedRoleAlias שזוהו בנפרד — החריג המוצהר
// (§7.1 SSOT) חייב לעבוד גם כש-detectRole לא מזהה "דר" כ-alias של תפקיד.
const doctorAloneStructured = parseStructuredGoogleContact({
  label: 'דר יעקב טוביה גלסמן * ירושלים',
  matchedRoleAlias: null,
  roleId: null,
  cityCandidate: 'ירושלים',
})
check('Google Contact', '"דר" מספיק לבד גם בלי roleId שזוהה בנפרד', doctorAloneStructured.isStructured, true)

// צירוף שבו לשולחת (Actor) יש תווית "שם תפקיד עיר" משלה — אסור שהתפקיד/
// עיר של השולחת "ידלפו" לרשומה של מי שצורף (Target).
const addedWithActorLabel = detectSourceEvent('שרה דהרי סייעת אור-עקיבא צירף/ה את דר יעקב טוביה גלסמן * ירושלים')
check('אירועי מקור', 'צירוף עם תווית לשולחת — Target נכון (לא כולל את תווית השולחת)', addedWithActorLabel.targetLabel, 'דר יעקב טוביה גלסמן * ירושלים')
const addedWithActorLabelStructured = parseStructuredGoogleContact({
  label: addedWithActorLabel.targetLabel,
  matchedRoleAlias: null,
  roleId: null,
  cityCandidate: 'ירושלים',
})
check('Google Contact', 'צירוף עם תווית לשולחת — היעד עצמו מזוהה כפורמט Google (לא תפקיד/עיר השולחת)', addedWithActorLabelStructured.isStructured, true)

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

// INC-3129 #2 — פורמטים חריגים שנפלו בין הכיסאות והפילו לקוחות אמיתיים
check('חילוץ', 'נייד בקיבוץ ספרות חריג (054-9920-559) נתפס', extractIdentifiers('דחוף סייעת לגבעתיים 054-9920-559', null).phones.map((p) => p.raw), ['054-9920-559'])
check('חילוץ', 'קו נייח של מרפאה נתפס', extractIdentifiers('ליצירת קשר : 048700959', null).phones.map((p) => p.raw), ['048700959'])
check('חילוץ', 'נייד + קו נייח באותה שורה — שניהם', extractIdentifiers('פרטים 054-6944477,08-9264071', null).phones.map((p) => p.raw), ['054-6944477', '08-9264071'])
check('חילוץ', 'מספר בן 9 ספרות פסול אינו נתפס כמספר שלם', extractIdentifiers('לפרטים:055668007', null).phones.map((p) => p.raw), [])
// ההרחבה אסור שתייצר זיהוי-שווא על מספרים שאינם טלפון — אלה דפוסים
// שמופיעים כמעט בכל מודעת גיוס אמיתית.
for (const noise of ['בשעה 14:00 עד 19:30', 'בתאריכים 22.07 ,27 ,28 29 ו3.08', 'משמרת 9-14:30', 'שכר:65-80 ₪']) {
  check('חילוץ', `אינו טלפון ואינו נתפס: ${noise}`, extractIdentifiers(noise, null).phones.length, 0)
}

// קו נייח מוצג כפרט קשר (החלטת המשתמשת: "זה לקוח לכל דבר")
check('קו נייח', 'קו נייח נבחר מתוך unassigned', pickLandline(['048700959']), '048700959')
check('קו נייח', 'קו נייח עם מקף', pickLandline(['08-9264071']), '08-9264071')
check('קו נייח', 'מספר פגום אינו מוצג כקו נייח', pickLandline(['055668007']), null)
check('קו נייח', 'נייד אינו נחשב קו נייח', pickLandline(['0521234567']), null)
check('קו נייח', 'רשימה ריקה', pickLandline([]), null)

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

const trustedName = matchRow({ ...emptyInput, contactNameRaw: 'דנה לוי', trustedExistingName: true }, { contacts, accounts })
check('התאמה', 'פורמט Google שמור + שם יחיד ⇒ התאמה ודאית', [trustedName.matchContact, trustedName.matchType, trustedName.matchField], [12, 'exact', 'google_contact_label'])
const trustedAmbiguous = matchRow({ ...emptyInput, contactNameRaw: 'רונית כהן', trustedExistingName: true }, { contacts, accounts })
check('התאמה', 'פורמט Google שמור עם שני שמות זהים ⇒ ambiguous', trustedAmbiguous.matchType, 'ambiguous')

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

check('מצב עסקי', 'התאמה קיימת ⇒ קיים', L.computeDatabaseState({ match_contact: 11, match_account: null, match_type: 'exact' }), 'existing')
check('מצב עסקי', 'ללא התאמה ⇒ לא קיים', L.computeDatabaseState({ match_contact: null, match_account: null, match_type: 'none' }), 'not_existing')
check('מצב עסקי', 'שם בלבד/דורש זיהוי', L.computeDatabaseState({ match_contact: null, match_account: null, match_type: 'none', tags: ['requires_identification'] }), 'needs_identification')
check('מצב עסקי', 'התאמה חלשה אינה מסומנת כלא קיים', L.computeDatabaseState({ match_contact: null, match_account: null, match_type: 'probable' }), 'needs_identification')
check('מצב עסקי', 'פורמט Google שלא נמצא ב-Supabase ⇒ עדיין קיים (הפורמט הוא ההוכחה, לא ה-lookup)', L.computeDatabaseState({ match_contact: null, match_account: null, match_type: 'none', tags: ['google_contact_expected_existing'] }), 'existing')

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

// מצטרף קיים ⇒ "קיים במאגר" (7), לא "ליד חדש - הצטרפות למאגר" (3)
check('הצעות', 'הצטרפות + איש קשר קיים ⇒ 7 "קיים במאגר"', proposeAction({ contentType: 'group_join', isActiveRequest: true, matchContact: 11 }), { proposedSocialStatus: 7, proposedAction: 'mark_lead_status' })
// מצטרף חדש עם נייד ⇒ 3 + הקמה; בלי נייד כלל ⇒ 3 בלי הצעת פעולה (אי אפשר להקים בלי נייד)
check('הצעות', 'הצטרפות + חדש + נייד ⇒ 3 + יצירה', proposeAction({ contentType: 'group_join', isActiveRequest: true, matchContact: null, hasPhone: true }), { proposedSocialStatus: 3, proposedAction: 'create_contact' })
check('הצעות', 'הצטרפות + חדש + בלי נייד ⇒ 3 בלי הצעת פעולה', proposeAction({ contentType: 'group_join', isActiveRequest: true, matchContact: null, hasPhone: false }), { proposedSocialStatus: 3, proposedAction: null })

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
// 14. חתימת המקור ודילוג על כפילויות (INC-3122)
// ═══════════════════════════════════════════════════════════
const baseHash = {
  sourceType: 4,
  sourceName: 'קבוצת דרושים',
  sourceMessageId: null,
  sourcePublishedAt: '2026-06-04T15:56:00.000Z',
  sourceSeq: 7,
  senderPhoneNorm: null,
  senderName: null,
  normalizedText: 'הגדרות הקבוצה השתנו',
}

check('חתימה', 'מזהה חיצוני גובר על הכול', sourceHashKey({ ...baseHash, sourceMessageId: 'abc' }), '4|קבוצת דרושים|mid|abc')
check('חתימה', 'שתי הודעות מערכת זהות באותה דקה ⇒ אותה חתימה', sourceHashKey(baseHash) === sourceHashKey({ ...baseHash, sourceSeq: 99 }), true)
check('חתימה', 'טקסט שונה ⇒ חתימה שונה', sourceHashKey(baseHash) === sourceHashKey({ ...baseHash, normalizedText: 'אחר' }), false)
check('חתימה', 'זמן שונה ⇒ חתימה שונה', sourceHashKey(baseHash) === sourceHashKey({ ...baseHash, sourcePublishedAt: '2026-06-04T15:57:00.000Z' }), false)
check('חתימה', 'שולח שונה ⇒ חתימה שונה', sourceHashKey(baseHash) === sourceHashKey({ ...baseHash, senderName: 'דנה' }), false)
check('חתימה', 'מקור שונה ⇒ חתימה שונה (אותה מודעה בשתי קבוצות נשמרת פעמיים)', sourceHashKey(baseHash) === sourceHashKey({ ...baseHash, sourceName: 'קבוצה אחרת' }), false)
check('חתימה', 'ללא זמן ⇒ נופל למספר סידורי', sourceHashKey({ ...baseHash, sourcePublishedAt: null }).includes('|seq|7|'), true)
check('חתימה', 'ללא זמן — סידורי שונה ⇒ חתימה שונה', sourceHashKey({ ...baseHash, sourcePublishedAt: null }) === sourceHashKey({ ...baseHash, sourcePublishedAt: null, sourceSeq: 8 }), false)

const dedupeInput = [
  { id: 1, k: 'a' }, { id: 2, k: 'b' }, { id: 3, k: 'a' }, { id: 4, k: 'a' }, { id: 5, k: 'c' },
]
const deduped = dedupeBySourceHash(dedupeInput, (r) => r.k)
check('דילוג', 'נשמר מופע ראשון בלבד', deduped.unique.map((r) => r.id), [1, 2, 5])
check('דילוג', 'ספירת הכפילויות מדויקת', deduped.duplicateCount, 2)
check('דילוג', 'אין כפילויות ⇒ הכול עובר', dedupeBySourceHash([{ k: 'x' }, { k: 'y' }], (r) => r.k).duplicateCount, 0)
check('דילוג', 'רשימה ריקה', dedupeBySourceHash([], (r: { k: string }) => r.k), { unique: [], duplicateCount: 0 })

// ═══════════════════════════════════════════════════════════
// 15. עברית עסקית אחידה לקטגוריות (§14 בסבב התיקונים)
// ═══════════════════════════════════════════════════════════
check('קטגוריה', 'job_seeker ⇒ "מחפש עבודה" (לא "מחפש/ת")', L.CONTENT_TYPE_LABEL.job_seeker, 'מחפש עבודה')
check('קטגוריה', 'recruiter ⇒ "מגייס" (לא "מגייס/ת עובדים")', L.CONTENT_TYPE_LABEL.recruiter, 'מגייס')
check('קטגוריה', 'group_join ⇒ "הצטרף/צורף לקבוצה"', L.CONTENT_TYPE_LABEL.group_join, 'הצטרף/צורף לקבוצה')
check('קטגוריה', 'unclear ⇒ "דורש בדיקה" (לא "לא ברור")', L.CONTENT_TYPE_LABEL.unclear, 'דורש בדיקה')
// מכוון שונה מ"לא רלוונטי" של סטטוס הטיפול (dict_social_statuses 12):
// הקטגוריה מתארת את ההודעה, הסטטוס מתאר את האדם ונכתב ל-contact.
check('קטגוריה', 'irrelevant ⇒ "לא קשור לגיוס" (שונה מסטטוס "לא רלוונטי")', L.CONTENT_TYPE_LABEL.irrelevant, 'לא קשור לגיוס')
checkTrue('קטגוריה', 'תווית הקטגוריה אינה זהה לתווית סטטוס הטיפול', L.CONTENT_TYPE_LABEL.irrelevant !== 'לא רלוונטי')
check('קטגוריה', 'unclassified ⇒ "טרם סווג"', L.CONTENT_TYPE_LABEL.unclassified, 'טרם סווג')

// ═══════════════════════════════════════════════════════════
// 16. ערך אפקטיבי — Enrichment מ-Supabase ו"לא ליפול ל'ללא שם'" (§1, §4)
// ═══════════════════════════════════════════════════════════
type EffRow = Parameters<typeof resolveEffectiveFields>[0]

const baseEffRow: EffRow = {
  contact_name: null, org_name: null, sender_name: null,
  phone: null, phone_norm: null, second_phone: null, email: null, second_email: null,
  sender_phone_norm: null, unassigned_phones: [],
  role_id: null, city_id: null, region_id: null,
  facebook_id: null, facebook_url: null, facebook_name: null,
  matched_contact: null, matched_account: null,
}

// #1 — Sender קיים במקור, אין contact_name מפורש ⇒ אסור להגיע ל"ללא שם"
const senderOnlyRow: EffRow = { ...baseEffRow, sender_name: 'דר נפתלי חן * חולון' }
check('ערך אפקטיבי', 'Sender קיים ⇒ משמש כשם המוצג (לא נופל ל-null)', resolveEffectiveFields(senderOnlyRow).displayName, 'דר נפתלי חן * חולון')
checkTrue('ערך אפקטיבי', 'Sender קיים ⇒ displayName אינו null (בפאנל זה מונע "ללא שם")', resolveEffectiveFields(senderOnlyRow).displayName !== null)

// #4 — נייד/מייל/תפקיד/עיר נופלים ל-Contact שהותאם כשה-Parser לא חילץ אותם
const matchedContactRow: EffRow = {
  ...baseEffRow,
  sender_name: 'יוסי כהן',
  matched_contact: {
    contact_id: 501, display_name: 'יוסי כהן', phone: '0501234567', second_phone: null,
    email: 'yossi@example.com', role: 9, city_id: 388, region_id: 13, social_status: 7,
  },
}
const enrichedFromContact = resolveEffectiveFields(matchedContactRow)
check('ערך אפקטיבי', 'נייד נופל ל-Contact כש-Parser לא חילץ', enrichedFromContact.phone, '0501234567')
checkTrue('ערך אפקטיבי', 'נייד מסומן כמגיע מהתאמה', enrichedFromContact.phoneFromMatch)
check('ערך אפקטיבי', 'מייל נופל ל-Contact כש-Parser לא חילץ', enrichedFromContact.email, 'yossi@example.com')
check('ערך אפקטיבי', 'תפקיד נופל ל-Contact כש-Parser לא חילץ', enrichedFromContact.roleId, 9)
check('ערך אפקטיבי', 'עיר נופלת ל-Contact כש-Parser לא חילץ', enrichedFromContact.cityId, 388)
check('ערך אפקטיבי', 'אזור נופל ל-Contact כש-Parser לא חילץ', enrichedFromContact.regionId, 13)
check('ערך אפקטיבי', 'שם מוצג הוא display_name של ה-Contact (עדיף על Sender)', enrichedFromContact.displayName, 'יוסי כהן')

// עדיפות: ערך שכבר על השורה (מה-Parser או מעריכה ידנית — אותה עמודה) גובר על ההתאמה
const ownValueWins: EffRow = {
  ...baseEffRow,
  phone: '0529998888',
  role_id: 3,
  matched_contact: { contact_id: 502, display_name: 'אחר', phone: '0501111111', second_phone: null, email: null, role: 9, city_id: null, region_id: null, social_status: null },
}
const ownWins = resolveEffectiveFields(ownValueWins)
check('ערך אפקטיבי', 'נייד על השורה עצמה גובר על ה-Contact', ownWins.phone, '0529998888')
checkTrue('ערך אפקטיבי', 'נייד על השורה עצמה לא מסומן כמגיע מהתאמה', !ownWins.phoneFromMatch)
check('ערך אפקטיבי', 'תפקיד על השורה עצמה גובר על ה-Contact', ownWins.roleId, 3)

// INC-3129 #1 — מנהלת קבוצה שמעבירה מודעה של מרפאה אחרת אינה הלקוחה.
// אומת חי: 211 שורות · 47 שולחים · 122 לקוחות אמיתיים הוסתרו מאחורי שם
// המעבירה. כלל מס' 1: "איש הקשר האמיתי = המספר שבתוך ההודעה, לא השולח".
const forwardedAdRow: EffRow = {
  ...baseEffRow,
  sender_name: 'שרה דהרי סייעת אור-עקיבא',
  sender_phone_norm: '972535265224',
  phone: '0544390880',
  phone_norm: '972544390880', // נייד מגוף ההודעה — של מרפאה אחרת
  matched_contact: {
    contact_id: 777, display_name: 'רונית אליאס', phone: '0544390880', second_phone: null,
    email: null, role: null, city_id: null, region_id: null, social_status: null,
  },
}
check('לקוח אמיתי', 'מודעה מועברת ⇒ מוצג בעל הנייד, לא המעבירה', resolveEffectiveFields(forwardedAdRow).displayName, 'רונית אליאס')
checkTrue('לקוח אמיתי', 'שם בעל הנייד מסומן כמגיע מהתאמה', resolveEffectiveFields(forwardedAdRow).displayNameFromMatch)

// אותה מודעה מועברת, אך בעל הנייד עדיין לא במאגר — עדיף "—" מאשר להציג
// את המעבירה כאילו היא הלקוחה (זו בדיוק הטעות שהמשתמשת זיהתה במסך).
const forwardedAdNoMatch: EffRow = { ...forwardedAdRow, matched_contact: null }
check('לקוח אמיתי', 'מודעה מועברת בלי התאמה ⇒ לא נופל לשם המעבירה', resolveEffectiveFields(forwardedAdNoMatch).displayName, null)

// לעומת זאת: הנייד הוא של השולח עצמו ⇒ הוא באמת הנושא, ושמו כן מוצג.
const ownPhoneRow: EffRow = {
  ...baseEffRow,
  sender_name: 'רחל ביניאשוילי סייעת מרכז',
  sender_phone_norm: '972521111111',
  phone: '0521111111',
  phone_norm: '972521111111',
}
check('לקוח אמיתי', 'הנייד הוא של השולח ⇒ שמו כן מוצג', resolveEffectiveFields(ownPhoneRow).displayName, 'רחל ביניאשוילי סייעת מרכז')

// INC-3129 #3 — כלל "לא סווג" של המשתמשת: גיוס בלי פרטי קשר ולא מטעם אישי
check('לא סווג', 'גיוס בלי נייד ובלי התאמה ⇒ אין הצעת הקמה', proposeAction({ contentType: 'recruiter', isActiveRequest: true, matchContact: null, hasPhone: false }).proposedAction, null)
check('לא סווג', 'גיוס עם נייד ⇒ כן הצעת הקמה', proposeAction({ contentType: 'recruiter', isActiveRequest: true, matchContact: null, hasPhone: true }).proposedAction, 'create_contact')
check('לא סווג', 'מחפש עבודה בלי נייד ⇒ אין הצעת הקמה', proposeAction({ contentType: 'job_seeker', isActiveRequest: true, matchContact: null, hasPhone: false }).proposedAction, null)
check('לא סווג', 'יש איש קשר ⇒ עדכון סטטוס גם בלי נייד', proposeAction({ contentType: 'recruiter', isActiveRequest: true, matchContact: 5, hasPhone: false }).proposedAction, 'mark_lead_status')

for (const text of ['למרפאת שיניים בקרית מוצקין דרושה סייעת. לפרטים בפרטי', 'למרפאה ברמת אביב צריכים סייעת, ניתן לפנות אליי בפרטי', 'מחפש סייעת בתל אביב, נא לשלוח הודעה ב-WhatsApp']) {
  checkTrue('לא סווג', `"פנו אליי" מזוהה ⇒ השולח הוא איש הקשר: ${text.slice(0, 30)}…`, messagePointsAtSender(text))
}
for (const text of ['ליום רביעי הבא סייעת בבני ברק משעה 11:00 עד 19:00', 'דרושה סייעת מחליפה למחר מ9-14:30 בחולון']) {
  checkTrue('לא סווג', `מודעה מועברת בלי דרך ליצור קשר: ${text.slice(0, 30)}…`, !messagePointsAtSender(text))
}
checkTrue('לא סווג', 'התג no_contact_info בבעלות המנוע (מתנקה בסיווג מחדש)', (ENGINE_OWNED_TAGS as readonly string[]).includes('no_contact_info'))

// קו נייח מוצג רק כשאין נייד — נייד תמיד גובר
const landlineOnlyRow: EffRow = { ...baseEffRow, unassigned_phones: ['048700959'] }
check('קו נייח', 'אין נייד ⇒ הקו הנייח מוצג', resolveEffectiveFields(landlineOnlyRow).landline, '048700959')
const mobileWinsRow: EffRow = { ...baseEffRow, phone: '0521234567', unassigned_phones: ['048700959'] }
check('קו נייח', 'יש נייד ⇒ הקו הנייח אינו מוצג', resolveEffectiveFields(mobileWinsRow).landline, null)

// ═══════════════════════════════════════════════════════════
// 17. סיווג מחדש — זכאות, שמירה על עריכה ידנית, קיבוץ שינויים
// ═══════════════════════════════════════════════════════════
const CURRENT_RULES = 'v2'

checkTrue('סיווג מחדש', 'נמחקה ⇒ לא זכאית', !isEligibleForReclassify({ deleted_at: '2026-01-01', last_action_id: null, rules_version: 'v1' }, CURRENT_RULES))
checkTrue('סיווג מחדש', 'כבר קושרה לפעולה ⇒ לא זכאית', !isEligibleForReclassify({ deleted_at: null, last_action_id: 5, rules_version: 'v1' }, CURRENT_RULES))
checkTrue('סיווג מחדש', 'כבר בגרסה נוכחית ⇒ לא זכאית', !isEligibleForReclassify({ deleted_at: null, last_action_id: null, rules_version: CURRENT_RULES }, CURRENT_RULES))
checkTrue('סיווג מחדש', 'גרסה ישנה ⇒ זכאית', isEligibleForReclassify({ deleted_at: null, last_action_id: null, rules_version: 'v1' }, CURRENT_RULES))
checkTrue('סיווג מחדש', 'ללא rules_version (null) ⇒ זכאית', isEligibleForReclassify({ deleted_at: null, last_action_id: null, rules_version: null }, CURRENT_RULES))

const freshValues: Record<string, unknown> = {
  content_type: 'group_join', is_active_request: true, classify_reason: 'r', evidence: [], confidence_level: 'high', needs_context: false,
  role_raw: 'סייעת', role_id: 9, city_raw: 'חולון', city_id: 375, region_id: 13,
  contact_name: 'יוסי כהן', phone: '0501234567', phone_norm: '972501234567', second_phone: null, second_phone_norm: null,
  email: null, email_norm: null, second_email: null, second_email_norm: null,
  facebook_id: null, facebook_url: null, facebook_url_norm: null, unassigned_phones: [],
  match_contact: 501, match_account: null, match_field: 'phone_norm', match_type: 'exact', match_candidates: [],
  proposed_social_status: 7, proposed_action: 'mark_lead_status',
  tags: [],
}

// שדה ללא עריכה ידנית ⇒ מקבל את הערך הטרי
const noManualRow = { id: 1, content_type: 'unclear', role_id: null, manual_override: {}, tags: [] }
const noManualPatch = buildRowPatch(noManualRow, freshValues)
check('סיווג מחדש', 'שדה ללא עריכה ידנית ⇒ ערך טרי', noManualPatch.patch.content_type, 'group_join')
checkTrue('סיווג מחדש', 'שדה ללא עריכה ידנית ⇒ ברשימת touchedFields', noManualPatch.touchedFields.includes('content_type'))

// שדה שנערך ידנית ⇒ הערך הנוכחי נכתב בחזרה, לא נדרס
const manualRow = { id: 2, content_type: 'irrelevant', role_id: 3, manual_override: { fields: { content_type: '2026-08-01T00:00:00Z' } }, tags: [] }
const manualPatch = buildRowPatch(manualRow, freshValues)
check('סיווג מחדש', 'שדה שנערך ידנית ⇒ לא נדרס (הערך הנוכחי נשמר)', manualPatch.patch.content_type, 'irrelevant')
checkTrue('סיווג מחדש', 'שדה שנערך ידנית ⇒ ברשימת skippedFields', manualPatch.skippedFields.includes('content_type'))
check('סיווג מחדש', 'שדה אחר (לא נערך ידנית) באותה שורה ⇒ עדיין מתעדכן', manualPatch.patch.role_id, 9)

// ה-patch תמיד כולל את כל השדות (למניעת מלכודת upsert עם מפתחות שונים בין שורות)
checkTrue('סיווג מחדש', 'patch כולל את כל PIPELINE_OWNED_FIELDS גם כשחלקם דולגו', PIPELINE_OWNED_FIELDS.every((f) => f in manualPatch.patch))

// sub_role_ids/notes אינם בבעלות המנוע — לעולם לא ב-patch
checkTrue('סיווג מחדש', 'sub_role_ids לעולם לא ב-patch', !('sub_role_ids' in noManualPatch.patch))
checkTrue('סיווג מחדש', 'notes לעולם לא ב-patch', !('notes' in noManualPatch.patch))
checkTrue('סיווג מחדש', 'manual_override עצמו לעולם לא ב-patch', !('manual_override' in noManualPatch.patch))

// tags: מיזוג, לא דריסה — תגית מנועית ישנה שלא רלוונטית יותר יורדת; תגית לא-מנועית נשמרת
const staleTagRow = { id: 3, content_type: 'unclear', manual_override: {}, tags: ['requires_identification', 'custom_manual_tag'] }
const staleTagPatch = buildRowPatch(staleTagRow, freshValues)
check('סיווג מחדש', 'תגית מנועית ישנה שלא רלוונטית יותר יורדת', (staleTagPatch.patch.tags as string[]).includes('requires_identification'), false)
checkTrue('סיווג מחדש', 'תגית לא-מנועית נשמרת', (staleTagPatch.patch.tags as string[]).includes('custom_manual_tag'))

// classifyRowDiff — קיבוץ לתצוגה המקדימה
const baseDiff = { match_contact: null, match_account: null, content_type: 'unclear', proposed_social_status: null, proposed_action: null, tags: [] as string[] }
check('סיווג מחדש', 'null → match_contact ⇒ now_matched', classifyRowDiff(baseDiff, { ...baseDiff, match_contact: 501 }, ['match_contact']), 'now_matched')
check('סיווג מחדש', 'תגית system_noise חדשה ⇒ now_hidden_system_noise', classifyRowDiff(baseDiff, { ...baseDiff, tags: ['system_noise'] }, ['tags']), 'now_hidden_system_noise')
check(
  'סיווג מחדש',
  'group_join + סטטוס מוצע חדש ⇒ group_join_status_fixed',
  classifyRowDiff({ ...baseDiff, content_type: 'group_join' }, { ...baseDiff, content_type: 'group_join', proposed_social_status: 3 }, ['proposed_social_status']),
  'group_join_status_fixed',
)
check('סיווג מחדש', 'קטגוריה משתנה (לא group_join) ⇒ category_changed', classifyRowDiff(baseDiff, { ...baseDiff, content_type: 'job_seeker' }, ['content_type']), 'category_changed')
check('סיווג מחדש', 'שדה משתנה בלי קטגוריה/התאמה ⇒ field_updated', classifyRowDiff(baseDiff, baseDiff, ['role_id']), 'field_updated')
check('סיווג מחדש', 'שום שדה לא השתנה ⇒ no_change', classifyRowDiff(baseDiff, baseDiff, []), 'no_change')

// ═══════════════════════════════════════════════════════════
// 18. הודעה ריקה — אין מה לבדוק, לא "דורש בדיקה" (שאלת המשתמשת מ-23.08.2026)
// ═══════════════════════════════════════════════════════════
check('הודעה ריקה', 'detectSourceEvent על מחרוזת ריקה ⇒ system_noise', detectSourceEvent('').kind, 'system_noise')
check('הודעה ריקה', 'detectSourceEvent על רווחים בלבד ⇒ system_noise', detectSourceEvent('   \n  ').kind, 'system_noise')
check('הודעה ריקה', 'classifyText על טקסט ריק ⇒ irrelevant, לא unclear', classifyText('').contentType, 'irrelevant')
checkTrue('הודעה ריקה', 'classifyText על טקסט ריק ⇒ needsContext=false (אין מה לבדוק)', classifyText('').needsContext === false)
check('הודעה ריקה', 'classifyText על רווחים/שורות בלבד ⇒ irrelevant', classifyText('   \n\n  ').contentType, 'irrelevant')
// ודאות: "ההודעה הזו נמחקה" עדיין נתפס נכון אחרי הזזת הבדיקה (§ שאלת המשתמשת השנייה)
check('הודעה ריקה', '"ההודעה הזו נמחקה" עדיין irrelevant אחרי הסידור מחדש', classifyText('ההודעה הזו נמחקה').contentType, 'irrelevant')

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
