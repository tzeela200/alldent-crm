/**
 * בדיקות קבלה — קליטת דוחות קמפיין WhatsApp (INC-3135 / INC-3136).
 *
 * הרצה:  npx tsx scripts/whatsapp-publications-acceptance.ts
 *
 * רצה ב-Node ללא דפדפן וללא Supabase — בודקת את הפרסור, מיפוי הסטטוסים,
 * הפרדת קטגוריות הכשל ושכבת ההחלטה. כל שינוי בכללים חייב בדיקה כאן.
 */
import * as XLSX from 'xlsx'
import {
  readCampaignFile, parseCampaignSheets, groupIntoCampaigns, validateCampaignFile,
  detectFieldMap, parseSendingTime, buildSourceUniqueKey, campaignKeyOf, rekeyCampaignGroup,
  markInFileDuplicates, sendEventKey,
} from '@/lib/fixPublications/campaignParser'
import { mapDeliveryStatus, failureCategoryOf, isOptOutText, isMediaFailureText } from '@/lib/fixPublications/deliveryStatus'
import { outcomeOf, outcomeOfRecord, assertOutcomeCoverage, OUTCOME_STATUS_CODES } from '@/lib/fixPublications/deliveryOutcome'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      expected ${e}\n      actual   ${a}`}`)
}

function makeFile(sheets: { name: string; rows: Record<string, unknown>[] }[], fileName: string): File {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name)
  if (fileName.toLowerCase().endsWith('.csv')) {
    return new File([XLSX.write(wb, { type: 'string', bookType: 'csv' }) as string], fileName)
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buf], fileName)
}

async function main() {
  // ── 1. מיפוי כותרות: אנגלית ועברית, כולל גרש ורווחים כפולים ──
  check('detectFieldMap אנגלית', detectFieldMap(
    ['fullname', 'email', 'phone', 'process', 'status', 'sending_time', 'sending_status'],
  ), {
    fullname: 'fullname', email: 'email', phone: 'phone', process: 'process',
    status: 'status', sending_time: 'sending_time', sending_status: 'sending_status',
  })

  check('detectFieldMap עברית + עמודות בקרה', detectFieldMap(
    ['שם מלא', 'טלפון', 'סטטוס שליחה', 'מס׳ רשומה', 'קובץ מקור', 'שורת מקור'],
  ), {
    fullname: 'שם מלא', phone: 'טלפון', sending_status: 'סטטוס שליחה',
    record_number: 'מס׳ רשומה', source_file: 'קובץ מקור', source_row: 'שורת מקור',
  })

  check('detectFieldMap גרש רגיל וגם רווח כפול', detectFieldMap(["מס' רשומה", 'Sending  Status']), {
    sending_status: 'Sending  Status', record_number: "מס' רשומה",
  })

  // ── 2. מיפוי סטטוסים ──
  check('status: Read',       mapDeliveryStatus('Read'), 'read')
  check('status: Delivered',  mapDeliveryStatus('Delivered'), 'delivered')
  check('status: Submited',   mapDeliveryStatus('Submited'), 'submitted')
  check('status: Submitted',  mapDeliveryStatus('Submitted'), 'submitted')
  check('status: device',     mapDeliveryStatus('Rejected - Not suitable device'), 'failed_device')
  check('status: undeliv.',   mapDeliveryStatus('Rejected: Message undeliverable'), 'failed_device')
  check('status: auto-limit', mapDeliveryStatus('Rejected (Auto-limiting)'), 'failed_rate_limit')
  check('status: blocked',    mapDeliveryStatus('Rejected - Message Blocked by Provider'), 'failed_blocked')
  check('status: provider',   mapDeliveryStatus('Rejected - provider error'), 'failed_provider')
  check('status: other',      mapDeliveryStatus('Rejected - something new'), 'failed_other')
  check('status: None',       mapDeliveryStatus('None'), 'no_status')
  check('status: ריק',        mapDeliveryStatus(''), 'no_status')

  // ── 3. תאריכים ──
  const iso = parseSendingTime('2026-07-16 20:42')
  check('sending_time שומר על היום המקומי', new Date(iso!).getDate(), 16)
  check('sending_time שומר על השעה', new Date(iso!).getHours(), 20)
  check('sending_time ריק', parseSendingTime(null), null)

  // ── 4. קובץ FIX רגיל: הקובץ עצמו הוא הקמפיין ──
  const fixFile = makeFile([{
    name: 'Sheet1',
    rows: [
      { fullname: 'מריה צ&#039;רקסקי', email: 'a@b.co', phone: '0501234567', process: 'רופאים', status: 'ליד', sending_time: '2026-07-16 20:42', sending_status: 'Read' },
      { fullname: 'דנה כהן', email: '', phone: '052-765-4321', process: 'רופאים', status: 'ליד', sending_time: '2026-07-16 20:42', sending_status: 'Rejected - Not suitable device' },
      { fullname: 'ללא נייד', email: '', phone: '', process: 'רופאים', status: '', sending_time: '2026-07-16 20:42', sending_status: 'None' },
      { fullname: 'נייד פסול', email: '', phone: '03-1234567', process: 'רופאים', status: '', sending_time: '2026-07-16 20:42', sending_status: 'Delivered' },
    ],
  }], 'campaign-37.csv')

  const fixSheets = await readCampaignFile(fixFile)
  check('קובץ FIX תקף', validateCampaignFile(fixSheets).ok, true)
  check('קובץ FIX אינו מזוהה כמאוחד', validateCampaignFile(fixSheets).isMergedFile, false)

  const fixRows = parseCampaignSheets(fixSheets, fixFile.name)
  check('4 שורות נקראו', fixRows.length, 4)
  check('HTML entity פוענח', fixRows[0].fullNameRaw, "מריה צ'רקסקי")
  check('נייד מנורמל', fixRows[0].phoneNorm, '972501234567')
    check('נייד עם מקפים מנורמל', fixRows[1].phoneNorm, '972527654321')
  check('חסר נייד', fixRows[2].matchResult, 'missing_phone')
  check('נייד קווי נדחה', fixRows[3].matchResult, 'invalid_phone')
  check('נייד קווי לא נשמר', fixRows[3].phoneNorm, null)
  check('קטגוריית כשל', fixRows[1].failureCategory, 'device')
  check('הודעת כשל נשמרת', fixRows[1].failureMessage, 'Rejected - Not suitable device')
  check('אין קטגוריה להצלחה', fixRows[0].failureCategory, null)

  const fixGroups = groupIntoCampaigns(fixRows)
  check('קמפיין אחד', fixGroups.length, 1)
  check('תווית הקמפיין = שם הקובץ ללא סיומת', fixGroups[0].label, 'campaign-37')
  check('processName', fixGroups[0].processName, 'רופאים')

  // ── 5. קובץ מאוחד: עמודת "קובץ מקור" מפצלת לקמפיינים ──
  const mergedFile = makeFile([{
    name: 'מאוחד',
    rows: [
      { 'מס׳ רשומה': 1, 'קובץ מקור': 'רופאים מאי.csv',  'שורת מקור': 2, 'שם מלא': 'א', 'טלפון': '0501111111', 'סטטוס שליחה': 'Read',      'מועד שליחה': '2026-05-01 10:00' },
      { 'מס׳ רשומה': 2, 'קובץ מקור': 'רופאים מאי.csv',  'שורת מקור': 3, 'שם מלא': 'ב', 'טלפון': '0502222222', 'סטטוס שליחה': 'Delivered', 'מועד שליחה': '2026-05-01 10:00' },
      { 'מס׳ רשומה': 3, 'קובץ מקור': 'רופאים אוגוסט.csv', 'שורת מקור': 2, 'שם מלא': 'א', 'טלפון': '0501111111', 'סטטוס שליחה': 'Submited', 'מועד שליחה': '2026-08-26 09:00' },
    ],
  }], 'רופאים מאוחד.xlsx')

  const mergedSheets = await readCampaignFile(mergedFile)
  const validation = validateCampaignFile(mergedSheets)
  check('קובץ מאוחד תקף', validation.ok, true)
  check('קובץ מאוחד מזוהה ככזה', validation.isMergedFile, true)

  const mergedRows = parseCampaignSheets(mergedSheets, mergedFile.name)
  const mergedGroups = groupIntoCampaigns(mergedRows)
  check('שני קמפיינים נפרדים', mergedGroups.length, 2)
  check('תוויות הקמפיינים', mergedGroups.map((g) => g.label), ['רופאים מאי', 'רופאים אוגוסט'])
  check('מיון לפי מועד', mergedGroups[0].startedAt! < mergedGroups[1].startedAt!, true)

  // אותו אדם בשני קמפיינים = שני אירועים נפרדים, שני מפתחות שונים
  const sameManTwice = mergedRows.filter((r) => r.phoneNorm === '972501111111')
  check('אותו אדם, שתי שורות', sameManTwice.length, 2)
  check('מפתחות שונים לשני הקמפיינים',
    sameManTwice[0].sourceUniqueKey !== sameManTwice[1].sourceUniqueKey, true)

  // ── 6. דטרמיניזם: קריאה חוזרת של אותו קובץ נותנת בדיוק אותם מפתחות ──
  const again = parseCampaignSheets(await readCampaignFile(mergedFile), mergedFile.name)
  check('מפתחות זהים בקריאה חוזרת',
    again.map((r) => r.sourceUniqueKey), mergedRows.map((r) => r.sourceUniqueKey))

  check('מבנה המפתח', mergedRows[0].sourceUniqueKey,
    buildSourceUniqueKey(campaignKeyOf('רופאים מאי'), 'r2', '972501111111'))

  // ── 7. חוברת מרובת גיליונות: כל גיליון = קמפיין ──
  const multiSheet = makeFile([
    { name: 'ינואר', rows: [{ fullname: 'א', phone: '0503333333', sending_status: 'Read', sending_time: '2026-01-05 08:00' }] },
    { name: 'פברואר', rows: [{ fullname: 'ב', phone: '0504444444', sending_status: 'Read', sending_time: '2026-02-05 08:00' }] },
  ], 'חוברת.xlsx')
  const multiGroups = groupIntoCampaigns(
    parseCampaignSheets(await readCampaignFile(multiSheet), 'חוברת.xlsx'),
  )
  check('גיליון = קמפיין', multiGroups.map((g) => g.label), ['ינואר', 'פברואר'])

  // ── 8. קובץ שאינו דוח קמפיין נדחה ──
  const badFile = makeFile([{ name: 'x', rows: [{ שם: 'א', עיר: 'תל אביב' }] }], 'לא-קמפיין.xlsx')
  const badValidation = validateCampaignFile(await readCampaignFile(badFile))
  check('קובץ לא מתאים נדחה', badValidation.ok, false)
  check('מדווח מה חסר', badValidation.missingRequired, ['phone', 'sending_status'])


  // ── 9. הפרדת קטגוריות הכשל (INC-3136) ──
  check('בקשת הסרה מזוהה', isOptOutText('Rejected (Unknown Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business)'), true)
  check('בקשת הסרה אינה כשל מכשיר', mapDeliveryStatus('Rejected (Unknown Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business)'), 'failed_other')
  check('בקשת הסרה → קטגוריה opt_out', failureCategoryOf(mapDeliveryStatus('Rejected (Unknown Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business)'), 'Rejected (Unknown Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business)'), 'opt_out')
  check('תקלת מדיה מזוהה', isMediaFailureText('Rejected (Invalid resource Media upload error Downloading media from weblink failed with http code 500)'), true)
  check('תקלת מדיה → failed_provider', mapDeliveryStatus('Rejected (Invalid resource Media upload error Downloading media from weblink failed with http code 500)'), 'failed_provider')
  check('תקלת מדיה → קטגוריה media', failureCategoryOf(mapDeliveryStatus('Rejected (Invalid resource Media upload error Downloading media from weblink failed with http code 500)'), 'Rejected (Invalid resource Media upload error Downloading media from weblink failed with http code 500)'), 'media')
  check('מכשיר → קטגוריה device', failureCategoryOf(mapDeliveryStatus('Rejected (Not suitable device Message undeliverable Message Undeliverable.)'), 'Rejected (Not suitable device Message undeliverable Message Undeliverable.)'), 'device')
  check('הגבלה → קטגוריה rate_limit', failureCategoryOf(mapDeliveryStatus('Rejected (Auto-limiting of messages by Provider This message was not delivered)'), 'Rejected (Auto-limiting of messages by Provider This message was not delivered)'), 'rate_limit')
  check('חסימה → קטגוריה blocked', failureCategoryOf(mapDeliveryStatus('Rejected (Message Blocked by Provider a user number is part of an experiment)'), 'Rejected (Message Blocked by Provider a user number is part of an experiment)'), 'blocked')
  check('הצלחה → אין קטגוריה', failureCategoryOf('read', 'Read'), null)

  // ── 10. שכבת ההחלטה ──
  check('כל 9 הקודים משויכים לדלי אחד', assertOutcomeCoverage(), [])
  check('נקרא → הגיע', outcomeOf('read'), 'reached')
  check('נמסר → הגיע', outcomeOf('delivered'), 'reached')
  check('נשלח → הגיע (החלטת צאלה)', outcomeOf('submitted'), 'reached')
  check('אין מכשיר → אל תשלחי שוב', outcomeOf('failed_device'), 'do_not_send')
  check('הגבלה → נסי שוב', outcomeOf('failed_rate_limit'), 'retry')
  check('חסימה → נסי שוב', outcomeOf('failed_blocked'), 'retry')
  check('מדיה → נסי שוב', outcomeOf('failed_provider', 'media'), 'retry')
  check('כשל אחר → נסי שוב', outcomeOf('failed_other', 'other'), 'retry')
  check('הסרה גוברת על כשל אחר', outcomeOf('failed_other', 'opt_out'), 'do_not_send')
  check('הסרה מזוהה גם מהטקסט הגולמי', outcomeOf('failed_other', null, 'Rejected (Unknown Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business)'), 'do_not_send')
  check('ללא סטטוס → ללא מידע', outcomeOf('no_status'), 'unknown')

  // ── 11. החלטה ברמת הרשומה במאגר ──
  check('אין נייד', outcomeOfRecord({ phoneNorm: null, lastSentAt: null, lastStatus: null }), 'no_phone')
  check('מעולם לא נשלח', outcomeOfRecord({ phoneNorm: '972501234567', lastSentAt: null, lastStatus: null }), 'never_sent')
  check('קיבל', outcomeOfRecord({ phoneNorm: '972501234567', lastSentAt: '2026-08-26T07:33:00Z', lastStatus: 'read' }), 'reached')
  check('אין מכשיר ברשומה', outcomeOfRecord({ phoneNorm: '972501234567', lastSentAt: '2026-08-26T07:33:00Z', lastStatus: 'failed_device' }), 'do_not_send')
  check('הסרה גוברת גם על סטטוס מוצלח מאוחר', outcomeOfRecord({ phoneNorm: '972501234567', lastSentAt: '2026-08-30T00:00:00Z', lastStatus: 'read', isOptedOut: true }), 'do_not_send')
  check('דלי הצלחה = 3 קודים', OUTCOME_STATUS_CODES.reached.length, 3)


  // ── 12. זיהוי אותו קובץ בשם אחר (INC-3136) ──
  const fixA = makeFile([{ name: 'Sheet1', rows: [
    { fullname: 'דר א', phone: '0501111111', sending_status: 'Read',      sending_time: '2026-08-26 10:33' },
    { fullname: 'דר ב', phone: '0502222222', sending_status: 'Delivered', sending_time: '2026-08-26 10:33' },
  ] }], 'export (37).csv')
  const fixB = makeFile([{ name: 'Sheet1', rows: [
    { fullname: 'דר א', phone: '0501111111', sending_status: 'Read',      sending_time: '2026-08-26 10:33' },
    { fullname: 'דר ב', phone: '0502222222', sending_status: 'Delivered', sending_time: '2026-08-26 10:33' },
  ] }], 'רופאים קבוצה 6.csv')

  const gA = groupIntoCampaigns(parseCampaignSheets(await readCampaignFile(fixA), fixA.name))
  const gB = groupIntoCampaigns(parseCampaignSheets(await readCampaignFile(fixB), fixB.name))

  check('שם קובץ שונה → מזהה קמפיין שונה', gA[0].campaignKey !== gB[0].campaignKey, true)
  check('ולכן גם מפתחות השורות שונים',
    gA[0].rows[0].sourceUniqueKey !== gB[0].rows[0].sourceUniqueKey, true)
  check('אותו מועד שליחה בשני הקבצים', gA[0].startedAt === gB[0].startedAt, true)

  // הזיהוי ממפה את הקבוצה השנייה למזהה הקיים
  rekeyCampaignGroup(gB[0], gA[0].campaignKey)
  check('אחרי הזיהוי — אותו מזהה קמפיין', gB[0].campaignKey, gA[0].campaignKey)
  check('אחרי הזיהוי — כל מפתחות השורות זהים',
    gB[0].rows.map((r) => r.sourceUniqueKey), gA[0].rows.map((r) => r.sourceUniqueKey))
  check('ולכן כל השורות יזוהו כקיימות ולא ייקלטו שוב',
    gB[0].rows.every((r, i) => r.sourceUniqueKey === gA[0].rows[i].sourceUniqueKey), true)
  check('מיפוי לאותו מזהה אינו משנה דבר',
    (() => { const before = gA[0].rows[0].sourceUniqueKey; rekeyCampaignGroup(gA[0], gA[0].campaignKey); return gA[0].rows[0].sourceUniqueKey === before })(), true)


  // ── 13. אירוע שליחה = אדם + מועד. ההגנה החזקה (INC-3136) ──
  check('מפתח אירוע זהה לשני פורמטי זמן',
    sendEventKey('972501111111', '2026-07-19T21:00:00.000Z') ===
    sendEventKey('972501111111', '2026-07-19 21:00:00+00'), true)
  check('בלי נייד אין מפתח', sendEventKey(null, '2026-07-19T21:00:00Z'), null)
  check('בלי מועד אין מפתח', sendEventKey('972501111111', null), null)

  // קובץ שבו כל אדם מופיע פעמיים ברצף — בדיוק מה שנצפה בפועל
  const dupFile = makeFile([{ name: 'Sheet1', rows: [
    { fullname: 'דר א', phone: '0501111111', sending_status: 'Delivered', sending_time: '2026-07-20 00:00' },
    { fullname: 'דר א', phone: '0501111111', sending_status: 'Delivered', sending_time: '2026-07-20 00:00' },
    { fullname: 'דר ב', phone: '0502222222', sending_status: 'Read',      sending_time: '2026-07-20 00:00' },
    { fullname: 'דר ב', phone: '0502222222', sending_status: 'Read',      sending_time: '2026-07-20 00:00' },
  ] }], '2026-07-20 469.csv')
  const dupRows = parseCampaignSheets(await readCampaignFile(dupFile), dupFile.name)
  check('4 שורות בקובץ', dupRows.length, 4)
  check('מפתחות שורה שונים (אינדקס שונה)',
    dupRows[0].sourceUniqueKey !== dupRows[1].sourceUniqueKey, true)
  check('אבל מפתח האירוע זהה',
    sendEventKey(dupRows[0].phoneNorm, dupRows[0].sentAt) === sendEventKey(dupRows[1].phoneNorm, dupRows[1].sentAt), true)
  check('סומנו 2 כפילויות בקובץ', markInFileDuplicates(dupRows), 2)
  check('ההופעה הראשונה נשמרת', dupRows[0].duplicateReason, null)
  check('השנייה מסומנת', dupRows[1].duplicateReason, 'in_file')
  check('רק 2 שורות ייקלטו', dupRows.filter((r) => !r.duplicateReason).length, 2)
  check('הרצה חוזרת לא מסמנת שוב', markInFileDuplicates(dupRows), 2)

  console.log(failures ? `\n${failures} בדיקות נכשלו` : '\nכל הבדיקות עברו')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
