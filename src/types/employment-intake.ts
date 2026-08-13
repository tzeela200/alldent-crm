// =====================================================
// AllDent CRM — Employment Intake Types (INC-3119)
// מבוסס על employment_intake + employment_intake_action ב-Supabase.
// שתי הטבלאות תועדו ואושרו בתוכנית INC-3119 (ראה docs/employment-intake).
// =====================================================

export type ContentType =
  | 'job_seeker'
  | 'recruiter'
  | 'group_join'
  | 'irrelevant'
  | 'unclear'
  | 'unclassified'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** אוצר המילים הקיים ב-RecruitmentRequestPanel.tsx — לא להמציא חדש. */
export type MatchType = 'exact' | 'probable' | 'ambiguous' | 'none'

export type ActionType =
  | 'mark_lead_status'
  | 'mark_details_sent'
  | 'create_contact'
  | 'create_account'
  | 'merge_contact'
  | 'merge_account'
  | 'link_contact_account'
  | 'update_field'
  | 'mark_irrelevant'
  | 'merge_identity_group'
  | 'manual_override'

export type DetailsSentType = 'job_seeking' | 'recruiting' | 'pool_join'

export type ActionResult = 'pending' | 'done' | 'not_needed' | 'not_performed' | 'error'

/** מזהה יחיד לזהות: contact_id אם ידוע, אחרת identity_group_id. */
export interface MatchCandidate {
  type: 'contact' | 'account'
  id: number
  field: string
  label: string
  confidence?: MatchType
}

export interface SuggestedFieldUpdate {
  current: unknown
  incoming: unknown
}

export type SuggestedUpdates = Record<string, SuggestedFieldUpdate>

/** שורה בטבלת `employment_intake` — הופעה אחת של הודעה אחת. */
export interface EmploymentIntakeRow {
  id: number
  import_id: string

  // מקור וזמנים
  source_type: number | null
  source_name: string | null
  file_name: string | null
  file_hash: string | null
  source_url: string | null
  source_seq: number | null
  source_message_id: string | null
  source_published_at: string | null
  ingested_at: string
  imported_by: string | null

  // טקסט והקשר
  original_text: string
  normalized_text: string
  context_text: string | null
  context_seqs: number[]
  parent_seq: number | null

  // שולח
  sender_name: string | null
  sender_phone: string | null
  sender_phone_norm: string | null

  // ישות שחולצה
  contact_name: string | null
  org_name: string | null
  phone: string | null
  phone_norm: string | null
  second_phone: string | null
  second_phone_norm: string | null
  email: string | null
  email_norm: string | null
  second_email: string | null
  second_email_norm: string | null
  facebook_id: string | null
  facebook_url: string | null
  facebook_url_norm: string | null
  facebook_name: string | null
  unassigned_phones: string[]

  // סיווג
  content_type: ContentType
  is_active_request: boolean | null
  classify_reason: string | null
  evidence: string[]
  confidence_level: ConfidenceLevel | null
  needs_context: boolean
  role_raw: string | null
  role_id: number | null
  sub_role_ids: number[]
  city_raw: string | null
  city_id: number | null
  region_id: number | null

  // תיקון ידני — שכבה נפרדת, אינה נוגעת בפלט המנוע
  manual_override: Record<string, unknown>

  // התאמה
  match_contact: number | null
  match_account: number | null
  match_field: string | null
  match_type: MatchType | null
  match_candidates: MatchCandidate[]
  has_new_information: boolean
  suggested_updates: SuggestedUpdates

  // זהות מאוחדת — נשמרת במסד (§4, §7.1)
  identity_group_id: string | null
  canonical_contact_id: number | null
  identity_conflict: boolean
  identity_resolved_at: string | null

  // כפילות
  content_hash: string
  source_hash: string

  // הצעה וקישור לפעולה
  proposed_social_status: number | null
  proposed_action: ActionType | null
  last_action_id: number | null

  // מטא
  notes: string | null
  tags: string[]
  deleted_at: string | null
  engine_version: string | null
  rules_version: string | null
  created_at: string
  updated_at: string
}

/** שורה בטבלת `employment_intake_action` — פעולה אחת ברמת זהות (§7.2). */
export interface EmploymentIntakeAction {
  action_id: number
  anchor_key: string
  identity_group_id: string | null
  contact_id: number | null
  account_id: number | null
  action_type: ActionType
  details_sent_type: DetailsSentType | null
  performed_at: string
  performed_by: string
  result: ActionResult
  error_message: string | null
  source_intake_ids: number[]
  occurrence_count: number
  applied_patch: Record<string, unknown> | null
  applied_before: Record<string, unknown> | null
  bulk_run_id: string
  idempotency_key: string
  created_at: string
}

// ─────────────────────────────────────────────────────
// טיפוסי UI נגזרים — לא נשמרים כעמודה, מחושבים בזמן ריצה
// ─────────────────────────────────────────────────────

/** ציר #2 מ-§3.2 — "מצב ההתאמה למאגר". מחושב, לא נשמר. */
export type MatchStatus =
  | 'contact_found'
  | 'account_found'
  | 'both_found'
  | 'multiple'
  | 'none'
  | 'already_linked'

/**
 * זהות מחושבת של שורה, לצורך קיבוץ בפעולה גורפת (§4.5).
 * עדיפות ל-canonical_contact_id; אחרת identity_group_id; אחרת אין זהות (מוחרג).
 */
export interface ResolvedIdentity {
  key: string // 'c:<contact_id>' | 'g:<uuid>'
  contactId: number | null
  identityGroupId: string | null
}

/**
 * פלט מנוע ההקשר (§8.3) — יחידת ניתוח אחת.
 *
 * "אפס אובדן": כל הודעה גולמית הופכת לשורה משלה ב-employment_intake, גם
 * כשהיא התחברה ליחידה. `members` שומר את כל ההודעות המקוריות (הראשית
 * ראשונה) כדי שכל אחת תוכל להפוך לשורה עצמאית עם parent_seq שמצביע חזרה
 * לראשית. `combinedText` הוא הטקסט המאוחד ששימש לניתוח — הוא אינו מחליף
 * את original_text של אף הודעה בודדת.
 */
export interface ContextUnit {
  primarySeq: number
  members: RawParsedMessage[] // כולל את הראשית, בסדר seq עולה
  combinedText: string
}

/** פלט מנוע הסיווג (§8.1–8.2), לפני נרמול. */
export interface ClassificationResult {
  contentType: ContentType
  isActiveRequest: boolean | null
  classifyReason: string
  evidence: string[]
  confidenceLevel: ConfidenceLevel
  needsContext: boolean
}

export interface RawParsedMessage {
  seq: number
  text: string
  senderName: string | null
  senderPhone: string | null
  sentAt: string | null // ISO אם ידוע במקור
  messageId: string | null
}

export interface ParsedBatch {
  sourceType: number
  sourceName: string
  fileName: string | null
  fileHash: string | null
  messages: RawParsedMessage[]
}
