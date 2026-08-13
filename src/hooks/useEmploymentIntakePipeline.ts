/**
 * "הפעל מיון" — הפייפליין המלא של שלב 2–7: הקשר → סיווג → חילוץ ונרמול →
 * התאמה → כתיבה ל-employment_intake (staging של המודול, לא ליבה) →
 * התכנסות זהות. כל שלב מתועד ב-INC-3119. שאילתה מקובצת אחת לכל אצווה
 * לכל טבלה — לא שאילתה/RPC לכל שורה.
 *
 * חשוב: הכתיבה כאן היא ל-employment_intake בלבד (טבלת העבודה של המודול,
 * לא טבלת ליבה). כתיבה ל-contact/accounts דורשת אישור פר-פעולה בפאנל
 * (שלב 9–11) ואינה קורית כאן.
 */

import { useMutation } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

import type { EmploymentIntakeRow, RawParsedMessage } from '@/types/employment-intake'
import { connectContext, buildDraftRows, type DraftRow } from '@/lib/employment-intake/context'
import { classifyText } from '@/lib/employment-intake/rules'
import { extractIdentifiers } from '@/lib/employment-intake/extract'
import { findCityCandidates, attributePhones, type CityIndexEntry } from '@/lib/employment-intake/normalize'
import { matchRow, type ContactCandidate, type AccountCandidate } from '@/lib/employment-intake/matching'
import { proposeAction } from '@/lib/employment-intake/proposals'
import { normalizeForHash } from '@/lib/employment-intake/hashes'
import { sourceHashKey, dedupeBySourceHash } from '@/lib/employment-intake/sourceHash'
import { detectSourceEvent, parseStructuredGoogleContact, targetNameOnly } from '@/lib/employment-intake/sourceMessage'
import { detectRole, normalizePhonesBatch, resolveCitiesBatch } from '@/hooks/useEmploymentIntakeNormalize'
import { fetchMatchingPool } from '@/hooks/useEmploymentIntakeMatching'
import { resolveEmploymentIdentity, fetchImportRows, type ResolveIdentityStats } from '@/hooks/useEmploymentIntakeIdentity'
import { supabaseError } from '@/lib/employment-intake/errors'

const ENGINE_VERSION = 'v1'
const RULES_VERSION = 'v1'

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
const INSERT_CHUNK_SIZE = 400

/** בונה שורת Insert אחת עבור employment_intake מתוך draft + תוצאות המנועים. */
function buildInsertRow(params: {
  draft: DraftRow
  importId: string
  input: PipelineInput
  classification: ReturnType<typeof classifyText>
  roleResult: Awaited<ReturnType<typeof detectRole>>
  cityCandidate: string | null
  cityResult: { cityId: number; regionId: number | null } | null
  phones: ReturnType<typeof attributePhones>
  emails: string[]
  facebookUrls: string[]
  facebookId: string | null
  match: ReturnType<typeof matchRow>
  proposal: ReturnType<typeof proposeAction>
  contactName: string | null
  senderPhoneNorm: string | null
  extraTags: string[]
}) {
  const { draft, importId, input, classification, roleResult, cityCandidate, cityResult, phones, emails, facebookUrls, facebookId, match, proposal, contactName, senderPhoneNorm, extraTags } = params
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

    contact_name: contactName,
    org_name: null,
    phone: phones.phone,
    phone_norm: phones.phoneNorm,
    second_phone: phones.secondPhone,
    second_phone_norm: phones.secondPhoneNorm,
    email: emails[0] ?? null,
    email_norm: emails[0]?.toLowerCase() ?? null,
    second_email: emails[1] ?? null,
    second_email_norm: emails[1]?.toLowerCase() ?? null,
    facebook_id: facebookId,
    facebook_url: facebookUrls[0] ?? null,
    facebook_url_norm: facebookUrls[0]?.toLowerCase() ?? null,
    facebook_name: null,
    unassigned_phones: phones.unassignedPhones,

    content_type: classification.contentType,
    is_active_request: classification.isActiveRequest,
    classify_reason: classification.classifyReason,
    evidence: classification.evidence,
    confidence_level: classification.confidenceLevel,
    needs_context: classification.needsContext,

    role_raw: roleResult?.matchedAlias ?? null,
    role_id: roleResult?.roleId ?? null,
    sub_role_ids: [], // אין RPC לזיהוי תת-תפקיד מטקסט חופשי — נשאר לבחירה ידנית (שלב 9)
    city_raw: cityCandidate,
    city_id: cityResult?.cityId ?? null,
    region_id: cityResult?.regionId ?? null,

    manual_override: {},

    match_contact: match.matchContact,
    match_account: match.matchAccount,
    match_field: match.matchField,
    match_type: match.matchType,
    match_candidates: match.matchCandidates,
    has_new_information: false, // נקבע בפועל בפאנל ההשוואה (שלב 10), לא כאן
    suggested_updates: {},

    proposed_social_status: proposal.proposedSocialStatus,
    proposed_action: proposal.proposedAction,
    last_action_id: null,

    notes: null,
    tags: Array.from(new Set([...input.tags, ...extraTags])),
    deleted_at: null,
    engine_version: ENGINE_VERSION,
    rules_version: RULES_VERSION,
  }
}

export async function runClassificationPipeline(input: PipelineInput): Promise<PipelineResult> {
  const importId = crypto.randomUUID()

  // 1. הקשר — מחבר הודעות רצופות ליחידות ניתוח
  const units = connectContext(input.messages)

  // 2. סיווג + חילוץ + מועמדי עיר — פעם אחת לכל יחידה, מוחל על כל חברותיה
  const perUnit = units.map((unit) => {
    const classification = classifyText(unit.combinedText)
    const primary = unit.members[0]
    const sourceEvent = detectSourceEvent(primary.text)
    const identityLabel = sourceEvent.kind === 'join' || sourceEvent.kind === 'add' ? sourceEvent.targetLabel : primary.senderName
    const primarySenderPhone = primary.senderPhone
    const identifiers = extractIdentifiers(unit.combinedText, primarySenderPhone)
    const cityCandidates = findCityCandidates(unit.combinedText, input.cityIndex)
    const identityCityCandidates = identityLabel ? findCityCandidates(identityLabel, input.cityIndex) : []
    return {
      unit,
      classification,
      identifiers,
      cityCandidate: cityCandidates[0] ?? null,
      sourceEvent,
      identityLabel,
      identityCityCandidate: identityCityCandidates[0] ?? null,
    }
  })

  // 3. נרמול — טקסט ההודעה + תווית השולח/המצטרף נבדקים בנפרד. כך "דרושה סייעת"
  // אינה הופכת את תפקיד השולח לסייעת; תווית Google שלו מפורקת בפני עצמה.
  const uniqueTexts = Array.from(new Set([
    ...perUnit.map((u) => u.unit.combinedText),
    ...perUnit.map((u) => u.identityLabel).filter((v): v is string => !!v),
  ]))
  const roleResults = new Map<string, Awaited<ReturnType<typeof detectRole>>>()
  await Promise.all(
    uniqueTexts.map(async (text) => {
      roleResults.set(text, await detectRole(text))
    }),
  )

  const cityCandidateStrings = perUnit.flatMap((u) => [u.cityCandidate, u.identityCityCandidate]).filter((c): c is string => !!c)
  const cityResults = await resolveCitiesBatch(cityCandidateStrings)

  const allRawPhones = perUnit.flatMap((u) => [
    ...u.identifiers.phones.map((p) => p.raw),
    ...(u.unit.members[0].senderPhone ? [u.unit.members[0].senderPhone!] : []),
  ])
  const phoneNormMap = await normalizePhonesBatch(allRawPhones)

  // 4. בניית שורות טיוטה — אחת לכל הודעה מקורית (אפס אובדן)
  const draftsWithContext = perUnit.flatMap(({ unit, classification, identifiers, cityCandidate, sourceEvent, identityLabel, identityCityCandidate }) => {
    const identityRoleResult = identityLabel ? (roleResults.get(identityLabel) ?? null) : null
    const structured = parseStructuredGoogleContact({
      label: identityLabel,
      matchedRoleAlias: identityRoleResult?.matchedAlias ?? null,
      roleId: identityRoleResult?.roleId ?? null,
      cityCandidate: identityCityCandidate,
    })
    const contactName = structured.contactName ?? targetNameOnly(sourceEvent)
    return buildDraftRows(unit).map((draft) => ({
      draft,
      classification,
      identifiers,
      cityCandidate,
      sourceEvent,
      contactName,
      trustedExistingName: structured.isStructured,
    }))
  })

  // 5. התאמה — מזהים חזקים + שמות רק מתווית Google המאושרת.
  const pool = await fetchMatchingPool({
    phoneNorms: Array.from(new Set(Array.from(phoneNormMap.values()).filter((v): v is string => !!v))),
    emails: draftsWithContext.flatMap((d) => d.identifiers.emails),
    facebookIds: draftsWithContext.flatMap((d) => (d.identifiers.facebookId ? [d.identifiers.facebookId] : [])),
    facebookUrls: draftsWithContext.flatMap((d) => d.identifiers.facebookUrls),
    trustedContactNames: draftsWithContext.filter((d) => d.trustedExistingName && d.contactName).map((d) => d.contactName!),
  })

  // 6. הרכבת שורות ה-Insert הסופיות
  const rowsToInsert = draftsWithContext.map(({ draft, classification, identifiers, cityCandidate, sourceEvent, contactName, trustedExistingName }) => {
    const phones = attributePhones(identifiers.phones, phoneNormMap)
    const cityResult = cityCandidate ? (cityResults.get(cityCandidate) ?? null) : null
    const roleResult = roleResults.get(draft.combinedTextForAnalysis) ?? null

    const match = matchRow(
      {
        phoneNorm: phones.phoneNorm,
        secondPhoneNorm: phones.secondPhoneNorm,
        email: identifiers.emails[0] ?? null,
        secondEmail: identifiers.emails[1] ?? null,
        facebookId: identifiers.facebookId,
        facebookUrl: identifiers.facebookUrls[0] ?? null,
        contactNameRaw: contactName,
        orgNameRaw: null,
        roleId: roleResult?.roleId ?? null,
        cityId: cityResult ? cityResult.cityId : null,
        trustedExistingName,
      },
      { contacts: pool.contacts as ContactCandidate[], accounts: pool.accounts as AccountCandidate[] },
    )

    const proposal = proposeAction({
      contentType: classification.contentType,
      isActiveRequest: classification.isActiveRequest,
      matchContact: match.matchContact,
    })

    const extraTags: string[] = []
    if (sourceEvent.kind === 'system_noise') extraTags.push('system_noise')
    if (trustedExistingName) extraTags.push('google_contact_expected_existing')
    if ((sourceEvent.kind === 'join' || sourceEvent.kind === 'add') && contactName && !trustedExistingName) {
      extraTags.push('requires_identification')
    }

    return buildInsertRow({
      draft,
      importId,
      input,
      classification,
      roleResult,
      cityCandidate,
      cityResult: cityResult ? { cityId: cityResult.cityId, regionId: cityResult.regionId } : null,
      phones,
      emails: identifiers.emails,
      facebookUrls: identifiers.facebookUrls,
      facebookId: identifiers.facebookId,
      match,
      proposal,
      contactName,
      senderPhoneNorm: draft.senderPhone ? (phoneNormMap.get(draft.senderPhone) ?? null) : null,
      extraTags,
    })
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
