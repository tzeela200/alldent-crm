import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, Check, X, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CandidatePublicFields } from "@/hooks/useCandidateProfile";

interface AIDocumentScannerProps {
  contactId: number;
  token?: string;
  currentData: CandidatePublicFields & { contact_id: number };
  onApply: (fields: Partial<CandidatePublicFields>) => Promise<void>;
  onClose: () => void;
}

type ProposedFields = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  first_name: "שם פרטי",
  last_name: "שם משפחה",
  phone: "טלפון",
  email: "אימייל",
  professional_title: "כותרת מקצועית",
  personal_summary: "פרופיל מקצועי",
  languages: "שפות",
  academic_education: "השכלה אקדמית",
  professional_courses: "קורסים מקצועיים",
  current_employer: "מעסיק נוכחי",
  previous_employers: "ניסיון תעסוקתי",
  salary_expectation_monthly: "שכר חודשי",
  salary_expectation_hourly: "שכר שעתי",
  additional_skills_notes: "כישורים נוספים",
  city_name: "עיר (טקסט)",
};

const ACCEPTED = ".pdf,.txt,.jpg,.jpeg,.png";

function readFile(file: File): Promise<{ text?: string; base64?: string; mediaType?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = (e) =>
        resolve({
          base64: (e.target?.result as string).split(",")[1],
          mediaType: file.type,
        });
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => resolve({ text: e.target?.result as string });
      reader.readAsText(file, "UTF-8");
    }
  });
}

export default function AIDocumentScanner({ contactId, token, currentData, onApply, onClose }: AIDocumentScannerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "reading" | "scanning" | "preview" | "applying">("idle");
  const [fileName, setFileName] = useState("");
  const [proposed, setProposed] = useState<ProposedFields>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [rawFile, setRawFile] = useState<File | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setRawFile(file);
    setState("reading");
    setError("");

    try {
      const { text, base64, mediaType } = await readFile(file);
      setState("scanning");

      const { data, error: fnError } = await supabase.functions.invoke("ai-document-scanner", {
        body: { fileText: text, base64, mediaType },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setProposed(data);
      const defaults: Record<string, boolean> = {};
      for (const key of Object.keys(data)) {
        if (key === "raw") continue;
        if (key === "city_name") { defaults[key] = false; continue; }
        const cur = (currentData as Record<string, unknown>)[key];
        defaults[key] = cur == null || cur === "" || (Array.isArray(cur) && cur.length === 0);
      }
      setChecked(defaults);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בסריקה");
      setState("idle");
    }
  }

  async function handleApply() {
    setState("applying");
    const selected: Partial<CandidatePublicFields> = {};
    for (const [key, val] of Object.entries(proposed)) {
      if (checked[key] && key !== "city_name") {
        (selected as Record<string, unknown>)[key] = val;
      }
    }
    // Persist the original CV file so it lands in the candidate-cvs bucket and
    // flips has_cv / cv_received_date server-side (best-effort, non-blocking).
    if (token && rawFile) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onerror = () => reject(new Error("read_failed"));
          r.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
          r.readAsDataURL(rawFile);
        });
        await supabase.functions.invoke("upload-candidate-cv", {
          body: { token, base64, mediaType: rawFile.type, fileName: rawFile.name },
        });
      } catch {
        /* CV storage is best-effort; the extracted fields still get applied */
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
            <Upload className="h-5 w-5 text-[#008080]" />
            סריקת מסמך אוטומטית
          </DialogTitle>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 cursor-pointer hover:border-[#008080] transition"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="h-10 w-10 text-slate-400" />
              <p className="text-sm text-slate-600 font-medium">לחצי להעלאת קובץ</p>
              <p className="text-xs text-slate-400">PDF, TXT, JPG, PNG</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {(state === "reading" || state === "scanning") && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#008080]" />
            <p className="text-sm text-slate-500">
              {state === "reading" ? `קורא ${fileName}...` : "AI סורק את המסמך..."}
            </p>
          </div>
        )}

        {state === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">נסרק: {fileName}</p>
            <div className="space-y-3">
              {Object.entries(proposed).filter(([k]) => k !== "raw" && FIELD_LABELS[k]).map(([key, val]) => {
                const curVal = (currentData as Record<string, unknown>)[key];
                const isCityName = key === "city_name";
                return (
                  <div key={key} className={`rounded-xl border p-3 ${isCityName ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">
                        {FIELD_LABELS[key] || key}
                        {isCityName && <span className="text-xs text-amber-600 ms-2">⚠️ יצריך התאמה ידנית</span>}
                      </span>
                      {!isCityName && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!checked[key]}
                            onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))}
                            className="accent-teal-600"
                          />
                          <span className="text-xs text-slate-500">להחיל</span>
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="font-bold text-slate-400 mb-1">ערך נוכחי</div>
                        <div className="text-slate-600 whitespace-pre-wrap">{isCityName ? "—" : displayValue(curVal)}</div>
                      </div>
                      <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-2">
                        <div className="font-bold text-[#008080] mb-1">ערך מוצע</div>
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
