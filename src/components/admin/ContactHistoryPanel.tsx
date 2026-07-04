import React, { useState } from "react";
import { History, RotateCcw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useContactHistory, useRestoreField } from "@/hooks/useContactHistory";

const FIELD_LABELS: Record<string, string> = {
  full_name: "שם מלא", first_name: "שם פרטי", last_name: "שם משפחה", display_name: "שם תצוגה",
  professional_title: "כותרת מקצועית", phone: "טלפון", second_phone: "טלפון נוסף",
  email: "אימייל", second_email: "אימייל נוסף", role: "תפקיד", sub_role: "תת-תפקיד",
  experience: "שנות ניסיון", candidate_availability_ids: "זמינות", preferred_scope: "היקף",
  preferred_regions: "אזורים מועדפים", preferred_cities: "ערים מועדפות", languages: "שפות",
  region_id: "אזור", city_id: "עיר", personal_summary: "פרופיל מקצועי",
  academic_education: "השכלה", professional_courses: "קורסים", previous_employers: "ניסיון תעסוקתי",
  current_employer: "מעסיק נוכחי", systems_used: "מערכות", procedures_experience: "פרוצדורות",
  salary_expectation_hourly: "שכר שעתי", salary_expectation_monthly: "שכר חודשי",
  portfolio_url: "תיק עבודות", recommendations_url: "המלצות", cv_link: "קישור קו״ח",
  has_cv: "יש קו״ח", birth_year: "שנת לידה", gender: "מגדר", license_no: "רישיון",
  tax_type_id: "סוג העסקה", mobility_id: "ניידות", additional_skills_notes: "כישורים נוספים",
  facebook_url: "פייסבוק", photo_url: "תמונה", linkedin_url: "לינקדאין",
  candidate_notes: "הערות מועמד", work_status: "סטטוס תעסוקתי", work_schedule_text: "הערות משמרות",
  candidate_salary_type_ids: "סוג שכר", preferred_all_country: "כל הארץ",
};

function label(f: string): string { return FIELD_LABELS[f] ?? f; }

function display(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

const SOURCE_LABEL: Record<string, string> = { admin: "מנהל", candidate: "מועמד", system: "מערכת" };

export default function ContactHistoryPanel({ contactId }: { contactId: number }) {
  const { data: history = [], isLoading } = useContactHistory(contactId);
  const restore = useRestoreField(contactId);
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function handleRestore(field: string, value: unknown) {
    const key = `${field}`;
    setRestoring(key);
    try {
      await restore.mutateAsync({ field, value });
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-800">היסטוריית שינויים</span>
          {history.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{history.length}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400">אין שינויים מתועדים.</p>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{fmt(h.changed_at)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      {SOURCE_LABEL[h.source ?? ""] ?? h.source ?? "—"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {h.changed_fields.map((f) => (
                      <div key={f} className="rounded-md bg-slate-50 p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">{label(f)}</span>
                          <button
                            onClick={() => handleRestore(f, h.old_data[f] ?? null)}
                            disabled={restoring === f}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:border-teal-300 hover:text-[#008080] disabled:opacity-50"
                          >
                            {restoring === f ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            שחזר
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded bg-white p-1.5">
                            <div className="mb-0.5 font-bold text-slate-400">לפני</div>
                            <div className="whitespace-pre-wrap break-words text-slate-600">{display(h.old_data[f])}</div>
                          </div>
                          <div className="rounded bg-white p-1.5">
                            <div className="mb-0.5 font-bold text-[#008080]">אחרי</div>
                            <div className="whitespace-pre-wrap break-words text-slate-700">{display(h.new_data[f])}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
