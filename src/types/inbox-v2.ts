// =====================================================
// AllDent CRM — Inbox V2 Types
// Based on Supabase schema (inbox_v2, inbox_import_batches,
// inbox_merge_actions, inbox_ai_chat + 3 dict tables)
// =====================================================

export interface InboxV2Row {
  lead_id: number
  import_batch_id: number | null
  source_type: number | null
  source_name: string | null
  source_unique_key: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  phone_norm: string | null
  email: string | null
  facebook_name: string | null
  facebook_id: string | null
  facebook_url: string | null
  facebook_group_id: string | null
  facebook_group_name: string | null
  linkedin_url: string | null
  temp_role: number | null
  temp_city_id: number | null
  temp_region_id: number | null
  raw_payload: Record<string, unknown>
  parsed_payload: Record<string, unknown>
  ai_classification: Record<string, unknown>
  match_contact: number | null
  match_account: number | null
  match_confidence: number | null
  matched_by: string | null
  match_reason: string | null
  has_new_information: boolean
  suggested_updates: Record<string, { current: unknown; incoming: unknown; conflict?: boolean }>
  merge_status: number | null
  industry_relevance_score: number | null
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
  seen_count: number
}

export interface InboxImportBatch {
  batch_id: number
  file_name: string | null
  file_type: string | null
  source_type: number | null
  source_name: string | null
  tags: string[]
  default_role: number | null
  total_rows: number
  new_records: number
  matched_records: number
  merged_records: number
  rejected_records: number
  ignored_records: number
  non_dental_records: number
  error_records: number
  uploaded_at: string
  processed_at: string | null
}

export interface InboxMergeAction {
  action_id: number
  lead_id: number | null
  target_type: string | null
  target_id: number | null
  action_type: number | null
  updates_applied: Record<string, unknown>
  approved_by: string | null
  created_at: string
}

export interface InboxAiChat {
  chat_id: number
  batch_id: number | null
  lead_id: number | null
  role: 'user' | 'assistant' | 'system'
  message: string
  created_at: string
}

export interface InboxV2Filters {
  search?: string
  status?: number[]
  source_type?: number[]
  batch_id?: number
  role?: number
  confidence_min?: number
  confidence_max?: number
  tags?: string[]
  has_new_info?: boolean
  seen_count_min?: number
  date_from?: string
  date_to?: string
  /** מסגור שומר הסף: הצג רק רשומות שעדיין דורשות החלטה (OPEN_STATUS_IDS) */
  open_only?: boolean
}

export interface UploadMeta {
  source_type: number | null
  source_name: string
  default_role: number | null
  tags: string[]
}
