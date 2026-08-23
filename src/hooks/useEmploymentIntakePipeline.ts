/**
 * "הפעל מיון" — הפייפליין המלא של שלב 2–7: הקשר → סיווג → חילוץ ונרמול →
 * התאמה → כתיבה ל-employment_intake (staging של המודול, לא ליבה) →
 * התכנסות זהות. כל שלב מתועד ב-INC-3119. שאילתה מקובצת אחת לכל אצווה
 * לכל טבלה — לא שאילתה/RPC לכל שורה.
 *
 * חשוב: הכתיבה כאן היא ל-employment_intake בלבד (טבלת העבודה של המודול,
 * לא טבלת ליבה). כתיבה ל-contact/accounts דורשת אישור פר-פעולה בפאנל
 * (שלב 9–11) ואינה קורית כאן.
 *
 * `computeUnitAnalyses` (שלבים 2–5, לפי יחידת הקשר) מיוצא בנפרד כדי
 * ש"סיווג מחדש" (useEmploymentIntakeReclassify.ts) ירוץ על אותה לוגיקה
 * בדיוק על רשומות קיימות — לא מנוע מקביל עם כללים שעלולים להתפזר.
 */

import { useMutation } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

import type { EmploymentIntakeRow, RawParsedMessage, ClassificationResult } from '@/types/employment-intake'
import { connectContext, buildDraftRows, type DraftRow } from '@/lib/employment-intake/context'
import { classifyText } from '@/lib/employment-intake/rules'
import { extractIdentifiers } from '@/lib/employment-intake/extract'
import { findCityCandidates, attributePhones, type CityIndexEntry, type AttributedPhones } from '@/lib/employment-intake/normalize'
import { matchRow, type ContactCandidate, type AccountCandidate, type MatchResult } from '@/lib/employment-intake/matching'
import { proposeAction, type ProposalResult } from '@/lib/employment-intake/proposals'
import { normalizeForHash } from '@/lib/employment-intake/hashes'
import { sourceHashKey, dedupeBySourceHash } from '@/lib/employment-intake/sourceHash'
import { detectSourceEvent, parseStructuredGoogleContact, targetNameOnly, type SourceEvent } from '@/lib/employment-intake/sourceMessage'
import { detectRole, normalizePhonesBatch, resolveCitiesBatch, type RoleDetection } from '@/hooks/useEmploymentIntakeNormalize'
import { fetchMatchingPool } from '@/hooks/useEmploymentIntakeMatching'
import { resolveEmploymentIdentity, fetchImportRows, type ResolveIdentityStats } from '@/hooks/useEmploymentIntakeIdentity'
import { supabaseError } from '@/lib/employment-intake/errors'

/** גרסת מנוע/כללים נוכחית — נכתבת על כל שורה. שינוי בכללי הסיווג/התאמה
 * חייב לבוא עם עליית rules_version, אחרת אין דרך להבדיל "רשומה שעברה
 * דרך הכלל החדש" מ"רשומה ישנה שנשארה מאחור" — זה בדיוק מה ש"סיווג מחדש"
 * (useEmploymentIntakeReclassify.ts) משתמש בו כדי לדעת מי זכאי. */
export const ENGINE_VERSION = 'v1'
export const RULES_VERSION = 'v2'

export interface PipelineInput {
  messages: RawParsedMessage[]
  sourceTypeId: number | null
  sourceName: string
  fileName: string | null
  fileHash: string | null
  tags: string[]
  importedBy: string
  cityIndex: CityIndexEntry[]
}

export interface PipelineResult {
  importId: string
  rows: EmploymentIntakeRow[]
  identityStats: ResolveIdentityStats
  /** הודעות שחזרו על עצמן בתוך הקובץ עצמו (הודעות מערכת של WhatsApp) */
  duplicatesInFile: number
  /** הודעות שכבר נקלטו בהעלאה קודמת ולכן דולגו */
  alreadyIngested: number
}

/** גודל מנת כתיבה. קובץ ייצוא טיפוסי מגיע ל-1,200 שורות; בקשה אחת ענקית שברירה. */
export const INSERT_CHUNK_SIZE = 400

// ── שלבים 2–5: סיווג + חילוץ + נרמול + התאמה, לפי יחידת הקשר ─────────

/** קלט מינימלי ליחידת הקשר — נבנה גם מהודעות גולמיות (קליטה חדשה) וגם
 * משורות שכבר נשמרו (סיווג מחדש: primary + context_text/context_seqs). */
export interface UnitAnalysisInput {
  /** מפתח יציב לקישור בין קלט לפלט — לא נשמר בשום מקום. */
  key: string
  /** הטקסט המאוחד שעליו רץ מנוע הסיווג — combinedText/context_text. */
  combinedText: string
  /** הטקסט של ההודעה הראשית בלבד — לזיהוי אירועי מקור (הצטרפות/הסרה/וכו'). */
  primaryText: string
  primarySenderName: string | null
  primarySenderPhone: string | null
}

export interface UnitAnalysisResult {
  classification: ClassificationResult
  sourceEvent: SourceEvent
  contactName: string | null
  trustedExistingName: boolean
  roleResult: RoleDetection | null
  cityCandidate: string | null
  cityResult: { cityId: number; regionId: number | null } | null
  phones: AttributedPhones
  emails: string[]
  facebookUrls: string[]
  facebookId: string | null
  match: MatchResult
  proposal: ProposalResult
  extraTags: string[]
}

export interface UnitAnalysisBatch {
  perUnit: Map<string, UnitAnalysisResult>
  /** טלפון גולמי (כפי שנכתב אצל השולח) → מנורמל. נדרש גם ברמת שורה בודדת
   * (sender_phone_norm), לא רק ברמת יחידה. */
  phoneNormMap: Map<string, string | null>
}

/**
 * שלבים 2–5 של הפייפליין, לפי יחידת הקשר — לוגיקה יחידה שמשמשת גם קליטה
 * חדשה (runClassificationPipeline) וגם סיווג מחדש של רשומות קיימות
 * (useEmploymentIntakeReclassify.ts). אצווה אחת של קריאות RPC לכל הקלט,
 * לא קריאה ליחידה.
 */
export async function computeUnitAnalyses(units: UnitAnalysisInput[], cityIndex: CityIndexEntry[]): Promise<UnitAnalysisBatch> {
  // 2. סיווג + חילוץ + מועמדי עיר — פעם אחת ליחידה
  const perUnitRaw = units.map((u) => {
    const classification = classifyText(u.combinedText)
    const sourceEvent = detectSourceEvent(u.primaryText)
    const identityLabel = sourceEvent.kind === 'join' || sourceEvent.kind === 'add' ? sourceEvent.targetLabel : u.primarySenderName
    const identifiers = extractIdentifiers(u.combinedText, u.primarySenderPhone)
    const cityCandidates = findCityCandidates(u.combinedText, cityIndex)
    const identityCityCandidates = identityLabel ? findCityCandidates(identityLabel, cityIndex) : []
    return {
      unit: u,
      classification,
      identifiers,
      cityCandidate: cityCandidates[0] ?? null,
      sourceEvent,
      identityLabel,
      identityCityCandidate: identityCityCandidates[0] ?? null,
    }
  })

  // 3. נרמול — טקסט ההודעה + תווית השולח/המצטרף נבדקים בנפרד (ראו הערת
  // עיצוב מקורית: "דרושה סייעת" אינה הופכת את תפקיד השולח לסייעת).
  const uniqueTexts = Array.from(new Set([
    ...perUnitRaw.map((u) => u.unit.combinedText),
    ...perUnitRaw.map((u) => u.identityLabel).filter((v): v is string => !!v),
  ]))
  const roleResults = new Map<string, RoleDetection | null>()
  await Promise.all(
    uniqueTexts.map(async (text) => {
      roleResults.set(text, await detectRole(text))
    }),
  )

  const cityCandidateStrings = perUnitRaw.flatMap((u) => [u.cityCandidate, u.identityCityCandidate]).filter((c): c is string => !!c)
  const cityResults = await resolveCitiesBatch(cityCandidateStrings)

  const allRawPhones = perUnitRaw.flatMap((u) => [
    ...u.identifiers.phones.map((p) => p.raw),
    ...(u.unit.primarySenderPhone ? [u.unit.primarySenderPhone] : []),
  ])
  const phoneNormMap = await normalizePhonesBatch(allRawPhones)

  // 4. פירוק תווית Google + שם היעד — פעם אחת ליחידה
  const withIdentity = perUnitRaw.map((u) => {
    const identityRoleResult = u.identityLabel ? (roleResults.get(u.identityLabel) ?? null) : null
    const structured = parseStructuredGoogleContact({
      label: u.identityLabel,
      matchedRoleAlias: identityRoleResult?.matchedAlias ?? null,
      roleId: identityRoleResult?.roleId ?? null,
      cityCandidate: u.identityCityCandidate,
    })
    const contactName = structured.contactName ?? targetNameOnly(u.sourceEvent)
    return { ...u, contactName, trustedExistingName: structured.isStructured }
  })

  // 5. התאמה — מזהים חזקים + שמות רק מתווית Google המאושרת. שאילתה
  // מקובצת אחת לכל הבאטש (לא ליחידה).
  const pool = await fetchMatchingPool({
    phoneNorms: Array.from(new Set(Array.from(phoneNormMap.values()).filter((v): v is string => !!v))),
    emails: withIdentity.flatMap((u) => u.identifiers.emails),
    facebookIds: withIdentity.flatMap((u) => (u.identifiers.facebookId ? [u.identifiers.facebookId] : [])),
    facebookUrls: withIdentity.flatMap((u) => u.identifiers.facebookUrls),
    trustedContactNames: withIdentity.filter((u) => u.trustedExistingName && u.contactName).map((u) => u.contactName!),
  })

  const perUnit = new Map<string, UnitAnalysisResult>()
  for (const u of withIdentity) {
    const phones = attributePhones(u.identifiers.phones, phoneNormMap)
    const cityResult = u.cityCandidate ? (cityResults.get(u.cityCandidate) ?? null) : null
    const roleResult = roleResults.get(u.unit.combinedText) ?? null

    const match = matchRow(
      {
        phoneNorm: phones.phoneNorm,
        secondPhoneNorm: phones.secondPhoneNorm,
        email: u.identifiers.emails[0] ?? null,
        secondEmail: u.identifiers.emails[1] ?? null,
        facebookId: u.identifiers.facebookId,
        facebookUrl: u.identifiers.facebookUrls[0] ?? null,
        contactNameRaw: u.contactName,
        orgNameRaw: null,
        roleId: roleResult?.roleId ?? null,
        cityId: cityResult ? cityResult.cityId : null,
        trustedExistingName: u.trustedExistingName,
      },
      { contacts: pool.contacts as ContactCandidate[], accounts: pool.accounts as AccountCandidate[] },
    )

    const proposal = proposeAction({
      contentType: u.classification.contentType,
      isActiveRequest: u.classification.isActiveRequest,
      matchContact: match.matchContact,
      hasPhone: phones.phoneNorm != null,
    })

    // הערה: אין כאן תיוג "requires_identification" גורף לכל מצטרף בשם לא-מאומת.
    // שם שלא נמצא לו שום מועמד (match_type='none') הוא ליד חדש רגיל, לא "נדרש
    // זיהוי" — מנוע ההתאמה עצמו (weakNameMatchContacts) כבר מסמן ambiguous/
    // probable כשיש אכן יותר ממועמד אחד או התאמה חלשה, וזה מספיק כדי ש-
    // computeDatabaseState יציג "נדרש זיהוי" נכון (§8.3 SSOT).
    const extraTags: string[] = []
    if (u.sourceEvent.kind === 'system_noise') extraTags.push('system_noise')
    if (u.trustedExistingName) extraTags.push('google_contact_expected_existing')

    perUnit.set(u.unit.key, {
      classification: u.classification,
      sourceEvent: u.sourceEvent,
      contactName: u.contactName,
      trustedExistingName: u.trustedExistingName,
      roleResult,
      cityCandidate: u.cityCandidate,
      cityResult: cityResult ? { cityId: cityResult.cityId, regionId: cityResult.regionId } : null,
      phones,
      emails: u.identifiers.emails,
      facebookUrls: u.identifiers.facebookUrls,
      facebookId: u.identifiers.facebookId,
      match,
      proposal,
      extraTags,
    })
  }

  return { perUnit, phoneNormMap }
}

/** בונה שורת Insert אחת עבור employment_intake מתוך draft + תוצאות המנועים. */
function buildInsertRow(params: {
  draft: DraftRow
  importId: string
  input: PipelineInput
  analysis: UnitAnalysisResult
  senderPhoneNorm: string | null
}) {
  const { draft, importId, input, analysis: a, senderPhoneNorm } = params
  return {
    import_id: importId,
    source_type: input.sourceTypeId,
    source_name: input.sourceName || null,
    file_name: input.fileName,
    file_hash: input.fileHash,
    source_url: null,
    source_seq: draft.sourceSeq,
    source_message_id: draft.sourceMessageId,
    source_published_at: draft.sourcePublishedAt,
    imported_by: input.importedBy,

    original_text: draft.originalText,
    normalized_text: normalizeForHash(draft.originalText),
    context_text: draft.contextText,
    context_seqs: draft.contextSeqs,
    parent_seq: draft.parentSeq,

    sender_name: draft.senderName,
    sender_phone: draft.senderPhone,
    sender_phone_norm: senderPhoneNorm,

    contact_name: a.contactName,
    org_name: null,
    phone: a.phones.phone,
    phone_norm: a.phones.phoneNorm,
    second_phone: a.phones.secondPhone,
    second_phone_norm: a.phones.secondPhoneNorm,
    email: a.emails[0] ?? null,
    email_norm: a.emails[0]?.toLowerCase() ?? null,
    second_email: a.emails[1] ?? null,
    second_email_norm: a.emails[1]?.toLowerCase() ?? null,
    facebook_id: a.facebookId,
    facebook_url: a.facebookUrls[0] ?? null,
    facebook_url_norm: a.facebookUrls[0]?.toLowerCase() ?? null,
    facebook_name: null,
    unassigned_phones: a.phones.unassignedPhones,

    content_type: a.classification.contentType,
    is_active_request: a.classification.isActiveRequest,
    classify_reason: a.classification.classifyReason,
    evidence: a.classification.evidence,
    confidence_level: a.classification.confidenceLevel,
    needs_context: a.classification.needsContext,

    role_raw: a.roleResult?.matchedAlias ?? null,
    role_id: a.roleResult?.roleId ?? null,
    sub_role_ids: [], // אין RPC לזיהוי תת-תפקיד מטקסט חופשי — נשאר לבחירה ידנית (שלב 9)
    city_raw: a.cityCandidate,
    city_id: a.cityResult?.cityId ?? null,
    region_id: a.cityResult?.regionId ?? null,

    manual_override: {},

    match_contact: a.match.matchContact,
    match_account: a.match.matchAccount,
    match_field: a.match.matchField,
    match_type: a.match.matchType,
    match_candidates: a.match.matchCandidates,
    has_new_information: false, // נקבע בפועל בפאנל ההשוואה (שלב 10), לא כאן
    suggested_updates: {},

    proposed_social_status: a.proposal.proposedSocialStatus,
    proposed_action: a.proposal.proposedAction,
    last_action_id: null,

    notes: null,
    tags: Array.from(new Set([...input.tags, ...a.extraTags])),
    deleted_at: null,
    engine_version: ENGINE_VERSION,
    rules_version: RULES_VERSION,
  }
}

export async function runClassificationPipeline(input: PipelineInput): Promise<PipelineResult> {
  const importId = crypto.randomUUID()

  // 1. הקשר — מחבר הודעות רצופות ליחידות ניתוח
  const units = connectContext(input.messages)

  // 2–5. סיווג + חילוץ + נרמול + התאמה, פעם אחת ליחידה
  const unitInputs: UnitAnalysisInput[] = units.map((unit) => ({
    key: String(unit.primarySeq),
    combinedText: unit.combinedText,
    primaryText: unit.members[0].text,
    primarySenderName: unit.members[0].senderName,
    primarySenderPhone: unit.members[0].senderPhone,
  }))
  const { perUnit, phoneNormMap } = await computeUnitAnalyses(unitInputs, input.cityIndex)

  // 6. הרכבת שורות ה-Insert הסופיות — אחת לכל הודעה מקורית (אפס אובדן)
  const rowsToInsert = units.flatMap((unit) => {
    const analysis = perUnit.get(String(unit.primarySeq))!
    return buildDraftRows(unit).map((draft) =>
      buildInsertRow({
        draft,
        importId,
        input,
        analysis,
        senderPhoneNorm: draft.senderPhone ? (phoneNormMap.get(draft.senderPhone) ?? null) : null,
      }),
    )
  })

  // 7. כתיבה ל-employment_intake (staging של המודול — לא ליבה)
  //
  // ל-source_hash יש UNIQUE, וייצוא WhatsApp מכיל הודעות מערכת זהות
  // שחוזרות באותה דקה. בלי דילוג על כפילויות, קומץ שורות כאלה מפיל את
  // כתיבת כל האצווה. שתי שכבות: דה-דופ בצד הלקוח (כדי לדעת ולדווח כמה
  // דולגו) + ON CONFLICT DO NOTHING במסד (כדי לכסות גם העלאה חוזרת של
  // אותו קובץ, שהלקוח אינו יכול לראות).
  const { unique: uniqueRows, duplicateCount } = dedupeBySourceHash(rowsToInsert, (r) =>
    sourceHashKey({
      sourceType: r.source_type,
      sourceName: r.source_name,
      sourceMessageId: r.source_message_id,
      sourcePublishedAt: r.source_published_at,
      sourceSeq: r.source_seq,
      senderPhoneNorm: r.sender_phone_norm,
      senderName: r.sender_name,
      normalizedText: r.normalized_text,
    }),
  )

  let insertedCount = 0
  for (let from = 0; from < uniqueRows.length; from += INSERT_CHUNK_SIZE) {
    const chunk = uniqueRows.slice(from, from + INSERT_CHUNK_SIZE)
    const { data, error: insertError } = await supabase
      .from('employment_intake')
      .upsert(chunk, { onConflict: 'source_hash', ignoreDuplicates: true })
      .select('id')
    if (insertError) throw supabaseError('שמירת התוצאות נכשלה', insertError)
    insertedCount += (data ?? []).length
  }

  // כבר נקלט בעבר — כל השורות דולגו, ואין מה להריץ עליו התכנסות זהות
  const skippedAsExisting = uniqueRows.length - insertedCount

  // 8. התכנסות זהות — טרנזקציה אחת ב-DB, בודקת גם היסטוריה קודמת
  const identityStats = await resolveEmploymentIdentity(importId)

  // 9. שליפת המצב הסופי (עם identity_group_id/canonical_contact_id מעודכנים)
  const rows = await fetchImportRows(importId)

  return {
    importId,
    rows,
    identityStats,
    duplicatesInFile: duplicateCount,
    alreadyIngested: skippedAsExisting,
  }
}

export function useRunClassificationPipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runClassificationPipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employment-intake-rows'] })
    },
  })
}
