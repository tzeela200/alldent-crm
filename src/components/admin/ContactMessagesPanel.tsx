import React, { useEffect, useState } from "react";
import { AlertCircle, MessageSquare, Send, Loader2 } from "lucide-react";
import {
  useContactMessages,
  useReplyToCandidate,
  useMarkCandidateMessagesRead,
} from "@/hooks/useContactHistory";

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

export default function ContactMessagesPanel({ contactId }: { contactId: number }) {
  const { data: messages = [], isLoading, isError, error } = useContactMessages(contactId);
  const reply = useReplyToCandidate(contactId);
  const markRead = useMarkCandidateMessagesRead(contactId);
  const [body, setBody] = useState("");

  const unread = messages.filter((m) => m.sender === "candidate" && !m.read_by_admin_at).length;

  // Mark candidate messages as read once the panel shows them.
  useEffect(() => {
    if (unread > 0) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread, contactId]);

  async function send() {
    if (!body.trim()) return;
    await reply.mutateAsync(body.trim());
    setBody("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-[#008080]" />
        <span className="text-sm font-bold text-slate-800">הודעות מהמועמד</span>
        {unread > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread} חדש</span>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : isError ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error instanceof Error ? error.message : "טעינת ההודעות נכשלה"}</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">אין הודעות עדיין.</p>
        ) : (
          <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "admin"
                      ? "border border-teal-200 bg-teal-50 text-slate-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-6">{m.body}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {m.sender === "candidate" ? "מועמד · " : "את · "}{fmt(m.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            dir="rtl"
            placeholder="כתבי תשובה למועמד..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={!body.trim() || reply.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-[#008080] px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {reply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              שליחה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
