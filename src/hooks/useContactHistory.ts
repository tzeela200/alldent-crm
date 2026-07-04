import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { invalidateAllContactQueries } from "@/hooks/useContactMutations";

// ─── Profile change history ─────────────────────────────────────────────────

export interface ProfileHistoryRow {
  id: number;
  contact_id: number;
  changed_at: string;
  source: string | null;
  changed_fields: string[];
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
}

export function useContactHistory(contactId: number) {
  return useQuery({
    queryKey: ["contactHistory", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_profile_history")
        .select("*")
        .eq("contact_id", contactId)
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ProfileHistoryRow[];
    },
    enabled: !!contactId && contactId > 0,
    staleTime: 15_000,
  });
}

/** Restore a single field to a previous value (also recorded as a new history row). */
export function useRestoreField(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ field, value }: { field: string; value: unknown }) => {
      const { error } = await supabase
        .from("contact")
        .update({ [field]: value })
        .eq("contact_id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactHistory", contactId] });
      void invalidateAllContactQueries(qc);
    },
  });
}

// ─── Candidate ↔ admin messages ─────────────────────────────────────────────

export interface ContactMessageRow {
  id: number;
  contact_id: number;
  sender: "candidate" | "admin";
  body: string;
  created_at: string;
  read_by_admin_at: string | null;
  read_by_candidate_at: string | null;
}

export function useContactMessages(contactId: number) {
  return useQuery({
    queryKey: ["contactMessages", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContactMessageRow[];
    },
    enabled: !!contactId && contactId > 0,
    staleTime: 15_000,
  });
}

export function useReplyToCandidate(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .insert({ contact_id: contactId, sender: "admin", body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contactMessages", contactId] }),
  });
}

export function useMarkCandidateMessagesRead(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ read_by_admin_at: new Date().toISOString() })
        .eq("contact_id", contactId)
        .eq("sender", "candidate")
        .is("read_by_admin_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactMessages", contactId] });
      qc.invalidateQueries({ queryKey: ["unreadCandidateMessages"] });
    },
  });
}

// Dashboard feed: unread candidate messages across all candidates
export interface UnreadMessageRow {
  id: number;
  contact_id: number;
  body: string;
  created_at: string;
  contact: {
    display_name: string | null;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useUnreadCandidateMessages() {
  return useQuery({
    queryKey: ["unreadCandidateMessages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, contact_id, body, created_at, contact(display_name, full_name, first_name, last_name)")
        .eq("sender", "candidate")
        .is("read_by_admin_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as UnreadMessageRow[];
    },
    staleTime: 30_000,
  });
}
