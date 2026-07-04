import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useUnreadCandidateMessages } from "@/hooks/useContactHistory";

function contactName(c: { display_name: string | null; full_name: string | null; first_name: string | null; last_name: string | null } | null): string {
  if (!c) return "מועמד";
  return (
    c.full_name ||
    [c.first_name, c.last_name].filter(Boolean).join(" ") ||
    c.display_name ||
    "מועמד"
  );
}

function timeShort(ts: string): string {
  try {
    return new Date(ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function DashboardCandidateMessages() {
  const { data: messages = [], isLoading } = useUnreadCandidateMessages();

  if (isLoading || messages.length === 0) return null;

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#008080]" />
        <span className="text-sm font-bold text-slate-900">הודעות חדשות ממועמדים</span>
        <span className="rounded-full bg-[#008080] px-2 py-0.5 text-[11px] font-bold text-white">{messages.length}</span>
      </div>
      <div className="space-y-2">
        {messages.slice(0, 6).map((m) => (
          <Link
            key={m.id}
            to={`/candidates/${m.contact_id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white px-3 py-2 text-sm transition hover:border-teal-300"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-900">{contactName(m.contact)}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500">{timeShort(m.created_at)}</span>
              <div className="truncate text-slate-600">{m.body}</div>
            </div>
            <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
