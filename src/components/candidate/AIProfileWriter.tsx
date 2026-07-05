import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Check, RotateCcw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CandidatePublicFields } from "@/hooks/useCandidateProfile";

interface AIProfileWriterProps {
  contactId: number;
  token?: string;
  currentData: CandidatePublicFields & { contact_id: number };
  onApply: (fields: Partial<CandidatePublicFields>) => Promise<void>;
  onClose: () => void;
}

type ProposedFields = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  professional_title: "כותרת מקצועית",
  personal_summary: "פרופיל מקצועי",
  previous_employers: "ניסיון תעסוקתי",
  current_employer: "מעסיק נוכחי",
  academic_education: "השכלה אקדמית",
  professional_courses: "קורסים מקצועיים",
  additional_skills_notes: "כישורים נוספים",
  languages: "שפות",
};

export default function AIProfileWriter({ contactId, token, currentData, onApply, onClose }: AIProfileWriterProps) {
  const [userInput, setUserInput] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "preview" | "applying">("idle");
  const [proposed, setProposed] = useState<ProposedFields>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!userInput.trim()) return;
    setState("loading");
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-profile-writer", {
        body: { currentData, userInput: userInput.trim(), token },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setProposed(data);
      // Default: check fields where current is empty
      const defaults: Record<string, boolean> = {};
      for (const key of Object.keys(data)) {
        if (key === "raw") continue;
        const cur = (currentData as Record<string, unknown>)[key];
        defaults[key] = cur == null || cur === "" || (Array.isArray(cur) && cur.length === 0);
      }
      setChecked(defaults);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשדרוג");
      setState("idle");
    }
  }

  async function handleApply() {
    setState("applying");
    const selected: Partial<CandidatePublicFields> = {};
    for (const [key, val] of Object.entries(proposed)) {
      if (checked[key]) {
        (selected as Record<string, unknown>)[key] = val;
      }
    }
    await onApply(selected);
    onClose();
  }

  function displayValue(v: unknown): string {
    if (v == null || v === "") return "—";
    if (Array.isArray(v)) return JSON.stringify(v, null, 1);
    return String(v);
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent dir="rtl" className="font-['Heebo'] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#008080]" />
            שדרוג פרופיל עם AI
          </DialogTitle>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            <Textarea
              value={userInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
              rows={8}
              placeholder="כתבי כאן בחופשיות — על הניסיון שלך, מקומות עבודה, כישורים, השכלה, שפות, כל מה שתרצי לספר. ה-AI ישדרג ויכתוב את זה בצורה מקצועית."
              className="rounded-xl border-slate-200 text-sm"
              dir="rtl"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              onClick={handleGenerate}
              disabled={!userInput.trim()}
              className="w-full rounded-xl bg-[#008080] hover:bg-teal-700 text-white"
            >
              <Sparkles className="h-4 w-4 me-2" />
              שדרג
            </Button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#008080]" />
            <p className="text-sm text-slate-500">AI מנסח את הפרופיל שלך...</p>
          </div>
        )}

        {state === "preview" && (
          <div className="space-y-4">
            <div className="space-y-3">
              {Object.entries(proposed).filter(([k]) => k !== "raw" && FIELD_LABELS[k]).map(([key, val]) => {
                const curVal = (currentData as Record<string, unknown>)[key];
                return (
                  <div key={key} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">{FIELD_LABELS[key] || key}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!checked[key]}
                          onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))}
                          className="accent-teal-600"
                        />
                        <span className="text-xs text-slate-500">להחיל</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="font-bold text-slate-400 mb-1">לפני</div>
                        <div className="text-slate-600 whitespace-pre-wrap">{displayValue(curVal)}</div>
                      </div>
                      <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-2">
                        <div className="font-bold text-[#008080] mb-1">אחרי</div>
                        <div className="text-slate-700 whitespace-pre-wrap">{displayValue(val)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1 rounded-xl bg-[#008080] hover:bg-teal-700 text-white">
                <Check className="h-4 w-4 me-2" />
                החל שינויים
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setState("idle")}>
                <RotateCcw className="h-4 w-4 me-2" />
                נסה שוב
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={onClose}>
                <X className="h-4 w-4 me-2" />
                ביטול
              </Button>
            </div>
          </div>
        )}

        {state === "applying" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#008080]" />
            <p className="text-sm text-slate-500">שומר שינויים...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
