import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare } from "lucide-react";

interface Msg {
  id: number;
  sender: "candidate" | "admin";
  body: string;
  created_at: string;
}

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function CandidateMessagesBox({ token }: { token: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["candidateMessages", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_candidate_messages_by_token", { p_token: token });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.rpc("submit_candidate_message", { p_token: token, p_body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["candidateMessages", token] });
    },
  });

  return (
    <div className="no-print rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-[#008080]" />
          <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">הודעות ובקשות אלינו</h3>
          <div className="h-[2px] w-8 rounded-full bg-[#008080]" />
        </div>

        <p className="mb-3 text-[14px] leading-6 text-[#4B5563]">
          יש לך בקשה, שאלה על משרה, או משהו שתרצה/י לספר לנו? כתוב/כתבי כאן ונחזור אליך.
        </p>

        {/* Thread */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#008080]" />
          </div>
        ) : messages.length > 0 ? (
          <div className="mb-3 max-h-64 space-y-2 overflow-y-auto pl-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "candidate" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "candidate"
                      ? "bg-slate-100 text-slate-800"
                      : "bg-teal-50 text-slate-800 border border-teal-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-6">{m.body}</div>
                  <div className="mt-1 text-[13px] text-[#4B5563]">
                    {m.sender === "admin" ? "צוות AllDent · " : ""}{fmt(m.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Composer */}
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            rows={3}
            dir="rtl"
            placeholder="כתוב/כתבי כאן..."
            className="rounded-xl border-slate-200 bg-white text-sm"
          />
          {sendMutation.isError && (
            <p className="text-[13px] text-red-600">שליחת ההודעה נכשלה, נסה/י שוב.</p>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-xl bg-[#008080] hover:bg-teal-700 text-white"
              disabled={!body.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate(body.trim())}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 me-1.5" />
              )}
              שליחה
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
