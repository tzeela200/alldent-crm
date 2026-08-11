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
}

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
}) {
  const { draft, importId, input, classification, roleResult, cityCandidate, cityResult, phones, emails, facebookUrls, facebookId, match, proposal } = params
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
    sender_phone_norm: null, // מנורמל בנפרד רק אם נעשה בו שימוש בפועל; אינו זהה בהכרח לטלפון המיוחס

    contact_name: null, // חילוץ שם מלא מטקסט חופשי אינו אמין דיו לקביעה אוטומטית; נשאר לתיקון ידני (שלב 9)
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
    tags: input.tags,
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
    const primarySenderPhone = unit.members[0].senderPhone
    const identifiers = extractIdentifiers(unit.combinedText, primarySenderPhone)
    const cityCandidates = findCityCandidates(unit.combinedText, input.cityIndex)
    return { unit, classification, identifiers, cityCandidate: cityCandidates[0] ?? null }
  })

  // 3. נרמול — RPC מקובץ: תפקיד (טקסט מלא לכל יחידה, ייחודי), עיר (מועמדים ייחודיים), טלפון (גולמיים ייחודיים)
  const uniqueTexts = Array.from(new Set(perUnit.map((u) => u.unit.combinedText)))
  const roleResults = new Map<string, Awaited<ReturnType<typeof detectRole>>>()
  await Promise.all(
    uniqueTexts.map(async (text) => {
      roleResults.set(text, await detectRole(text))
    }),
  )

  const cityCandidateStrings = perUnit.map((u) => u.cityCandidate).filter((c): c is string => !!c)
  const cityResults = await resolveCitiesBatch(cityCandidateStrings)

  const allRawPhones = perUnit.flatMap((u) => u.identifiers.phones.map((p) => p.raw))
  const phoneNormMap = await normalizePhonesBatch(allRawPhones)

  // 4. בניית שורות טיוטה — אחת לכל הודעה מקורית (אפס אובדן)
  const draftsWithContext = perUnit.flatMap(({ unit, classification, identifiers, cityCandidate }) =>
    buildDraftRows(unit).map((draft) => ({ draft, classification, identifiers, cityCandidate })),
  )

  // 5. התאמה — שאילתה מקובצת אחת ל-contact ואחת ל-accounts, לכל האצווה
  const pool = await fetchMatchingPool({
    phoneNorms: Array.from(new Set(Array.from(phoneNormMap.values()).filter((v): v is string => !!v))),
    emails: draftsWithContext.flatMap((d) => d.identifiers.emails),
    facebookIds: draftsWithContext.flatMap((d) => (d.identifiers.facebookId ? [d.identifiers.facebookId] : [])),
    facebookUrls: draftsWithContext.flatMap((d) => d.identifiers.facebookUrls),
  })

  // 6. הרכבת שורות ה-Insert הסופיות
  const rowsToInsert = draftsWithContext.map(({ draft, classification, identifiers, cityCandidate }) => {
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
        contactNameRaw: null,
        orgNameRaw: null,
        roleId: roleResult?.roleId ?? null,
        cityId: cityResult ? cityResult.cityId : null,
      },
      { contacts: pool.contacts as ContactCandidate[], accounts: pool.accounts as AccountCandidate[] },
    )

    const proposal = proposeAction({
      contentType: classification.contentType,
      isActiveRequest: classification.isActiveRequest,
      matchContact: match.matchContact,
    })

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
    })
  })

  // 7. כתיבה ל-employment_intake (staging של המודול — לא ליבה)
  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('employment_intake').insert(rowsToInsert)
    if (insertError) throw supabaseError('שמירת התוצאות נכשלה', insertError)
  }

  // 8. התכנסות זהות — טרנזקציה אחת ב-DB, בודקת גם היסטוריה קודמת
  const identityStats = await resolveEmploymentIdentity(importId)

  // 9. שליפת המצב הסופי (עם identity_group_id/canonical_contact_id מעודכנים)
  const rows = await fetchImportRows(importId)

  return { importId, rows, identityStats }
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
