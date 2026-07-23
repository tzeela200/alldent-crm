import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Download,
  Edit2,
  Facebook,
  FileText,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Upload,
  User2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  useCandidateProfile,
  useCandidateProfileByToken,
  useUpdateCandidateProfile,
} from "@/hooks/useCandidateProfile";
import type { CandidatePublicFields, CandidateProfileData } from "@/hooks/useCandidateProfile";
import { useContact360Dicts } from "@/hooks/useContact360";
import type { DictItem } from "@/hooks/useContact360";
import ProfileSectionEditForm from "@/components/candidate/ProfileSectionEditForm";
import type { FieldDef } from "@/components/candidate/ProfileSectionEditForm";
import PhotoUpload from "@/components/candidate/PhotoUpload";
import { EmptyState } from "@/components/ui/EmptyState";
import CandidateMessagesBox from "@/components/candidate/CandidateMessagesBox";
import AIProfileWriter from "@/components/candidate/AIProfileWriter";
import AIDocumentScanner from "@/components/candidate/AIDocumentScanner";

// ─── helpers ────────────────────────────────────────────────────────────────

function dictName(list: DictItem[], id: unknown): string {
  if (id == null) return "—";
  return list.find((d) => d.id === Number(id))?.name ?? "—";
}

function dictNames(list: DictItem[], values: unknown): string[] {
  if (!Array.isArray(values) || values.length === 0) return [];
  return values.map((v) => dictName(list, v)).filter((n) => n !== "—");
}

const COMPLETION_FIELDS = [
  "full_name", "professional_title", "phone", "email",
  "role", "experience", "candidate_availability_ids", "region_id",
  "personal_summary", "languages", "systems_used",
  "academic_education", "salary_expectation_monthly", "photo_url",
];

/** Candidate-facing names for COMPLETION_FIELDS, used by the hero nudge. */
const COMPLETION_FIELD_LABELS: Record<string, string> = {
  full_name: "שם מלא",
  professional_title: "כותרת מקצועית",
  phone: "נייד",
  email: "אימייל",
  role: "תפקיד",
  experience: "ניסיון",
  candidate_availability_ids: "זמינות",
  region_id: "אזור",
  personal_summary: "סיכום מקצועי",
  languages: "שפות",
  systems_used: "מערכות ותוכנות",
  academic_education: "השכלה אקדמית",
  salary_expectation_monthly: "ציפיות שכר חודשי",
  photo_url: "תמונה",
};

function calcCompletion(data: CandidateProfileData): number {
  let filled = 0;
  for (const f of COMPLETION_FIELDS) {
    const v = (data as Record<string, unknown>)[f];
    if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) filled++;
  }
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

type Employer = { name?: string; role?: string; years?: string; description?: string };

function parseEmployers(v: unknown): Employer[] {
  if (Array.isArray(v)) return v as Employer[];
  if (typeof v === "string") {
    try { return JSON.parse(v) as Employer[]; } catch { return []; }
  }
  return [];
}

// True once the profile holds enough to serve as a printable CV.
function hasCoreCvContent(p: Record<string, unknown>): boolean {
  const hasName = Boolean(p.full_name || (p.first_name && p.last_name) || p.display_name);
  const hasBody = Boolean(
    p.personal_summary ||
    p.academic_education ||
    p.current_employer ||
    (Array.isArray(p.previous_employers) && p.previous_employers.length > 0),
  );
  return hasName && hasBody;
}

function fmtDateTime(ts: string | null): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ─── progress circle ────────────────────────────────────────────────────────

function ProgressCircle({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width="68" height="68" className="shrink-0">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke="#008080" strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 34 34)"
        />
        <text x="34" y="39" textAnchor="middle" className="text-sm font-bold fill-slate-800">
          {pct}%
        </text>
      </svg>
      <span className="text-[13px] font-medium text-[#4B5563]">פרופיל הושלם</span>
    </div>
  );
}

// ─── section wrapper with optional inline editing ───────────────────────────

function Section({
  title,
  sectionKey,
  editingSection,
  onEditToggle,
  fields,
  values,
  onSave,
  emphasis = "compact",
  children,
}: {
  title: string;
  sectionKey?: string;
  editingSection?: string | null;
  onEditToggle?: (key: string | null) => void;
  fields?: FieldDef[];
  values?: Record<string, unknown>;
  onSave?: (patch: Record<string, unknown>) => Promise<void>;
  /** "primary" for the story-carrying sections, "compact" for supporting ones. */
  emphasis?: "primary" | "compact";
  children: React.ReactNode;
}) {
  const editable = Boolean(sectionKey && fields && onSave && onEditToggle);
  const isEditing = editable && editingSection === sectionKey;
  const isPrimary = emphasis === "primary";
  return (
    <Card className="card rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <CardContent className={isPrimary ? "p-6" : "p-5"}>
        <div className={`flex items-center justify-between gap-3 ${isPrimary ? "mb-5" : "mb-4"}`}>
          <div className="flex items-center gap-2.5">
            <h2 className={`font-bold text-[#111827] ${isPrimary ? "text-[19px]" : "text-[16px]"}`}>{title}</h2>
            <div className={`h-[2px] rounded-full bg-[#008080] ${isPrimary ? "w-10" : "w-6"}`} />
          </div>
          {editable && (
            <button
              onClick={() => onEditToggle!(isEditing ? null : sectionKey!)}
              className="no-print rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
              aria-label={`ערוך ${title}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {isEditing ? (
          <ProfileSectionEditForm
            fields={fields!}
            values={values ?? {}}
            onSave={onSave!}
            onCancel={() => onEditToggle!(null)}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function CandidateProfilePage() {
  const { contactId: contactIdParam, token } = useParams<{
    contactId?: string;
    token?: string;
  }>();

  const isTokenMode = !!token;
  const contactIdFromParam = Number(contactIdParam ?? 0);

  const byId = useCandidateProfile(isTokenMode ? 0 : contactIdFromParam);
  const byToken = useCandidateProfileByToken(token ?? "");

  const { data: profile, isLoading, error } = isTokenMode ? byToken : byId;
  const contactId = profile?.contact_id ?? contactIdFromParam;
  const updateMutation = useUpdateCandidateProfile(contactId, isTokenMode ? token : undefined);
  const { data: dicts } = useContact360Dicts();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showWriter, setShowWriter] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const completion = useMemo(() => (profile ? calcCompletion(profile) : 0), [profile]);
  const employers = useMemo(() => parseEmployers(profile?.previous_employers), [profile?.previous_employers]);

  // Save one section; auto-flip has_cv once the profile can act as a CV.
  async function handleSave(patch: Record<string, unknown>) {
    let finalPatch = patch;
    if (profile && !profile.has_cv) {
      const merged = { ...(profile as Record<string, unknown>), ...patch };
      if (hasCoreCvContent(merged)) finalPatch = { ...patch, has_cv: true };
    }
    await updateMutation.mutateAsync(finalPatch as Partial<CandidatePublicFields>);
    setEditingSection(null);
  }

  // ─── loading / error ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 font-['Heebo']">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#008080] border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-['Heebo']">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <User2 className="mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-700">הפרופיל לא נמצא</h2>
          <p className="text-sm text-slate-500 mt-1">ייתכן שהקישור אינו תקין.</p>
        </div>
      </div>
    );
  }

  // ─── derived data ───────────────────────────────────────────────────────

  const d = dicts;
  const name =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.display_name ||
    "—";
  const titleText = profile.professional_title || dictName(d?.roles ?? [], profile.role);
  const cityText = dictName(d?.cities ?? [], profile.city_id);
  const regionText = dictName(d?.regions ?? [], profile.region_id);
  const availNames = dictNames(d?.availability ?? [], profile.candidate_availability_ids);
  const availText = availNames.length ? availNames.join(", ") : "—";
  const subRoleNames = dictNames(d?.subRoles ?? [], profile.sub_role);
  const languageNames = dictNames(d?.languages ?? [], profile.languages);
  const systemNames = dictNames(d?.systems ?? [], profile.systems_used);
  const procedureNames = dictNames(d?.procedures ?? [], profile.procedures_experience);
  const regionPrefNames = dictNames(d?.regions ?? [], profile.preferred_regions);
  const cityPrefNames = dictNames(d?.cities ?? [], profile.preferred_cities);
  const salaryTypeNames = dictNames(d?.salaryTypes ?? [], profile.candidate_salary_type_ids);
  const scopeNames = dictNames(d?.scopes ?? [], profile.preferred_scope);
  const experienceText = dictName(d?.experience ?? [], profile.experience);
  const workStatusText = dictName(d?.workStatuses ?? [], profile.work_status);
  const taxTypeText = dictName(d?.taxTypes ?? [], profile.tax_type_id);
  const genderText = dictName(d?.genders ?? [], profile.gender);
  const mobilityText = dictName(d?.mobility ?? [], profile.mobility_id);
  const initial = name.charAt(0);
  const values = profile as unknown as Record<string, unknown>;
  const locationText = [cityText, regionText].filter((part) => part && part !== "—").join(" · ");

  // Which completion fields are still empty — drives the nudge in the hero.
  // Uses the same COMPLETION_FIELDS list the percentage is computed from, so the
  // two can never disagree.
  const missingLabels = COMPLETION_FIELDS.filter((field) => {
    const value = (profile as unknown as Record<string, unknown>)[field];
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  }).map((field) => COMPLETION_FIELD_LABELS[field] ?? field);

  const hasContactInfo = Boolean(
    cityText !== "—" || regionText !== "—" || profile.phone || profile.email ||
    profile.second_phone || profile.second_email,
  );
  const hasLinks = Boolean(
    profile.facebook_url || profile.linkedin_url || profile.portfolio_url || profile.recommendations_url,
  );
  const hasPersonalInfo = Boolean(
    genderText !== "—" || profile.birth_year || profile.candidate_notes,
  );
  const hasSkills =
    languageNames.length > 0 || systemNames.length > 0 || procedureNames.length > 0 ||
    Boolean(profile.additional_skills_notes);

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] profile-container">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav, header, .sidebar { display: none !important; }
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { background: white !important; font-size: 11pt; }
          .profile-container { max-width: 100% !important; padding: 0 !important; background: white !important; }
          .hero-strip { background: #008080 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .teal-accent { color: #008080 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
          .alldent-footer { position: fixed; bottom: 8mm; width: 100%; text-align: center; font-size: 8pt; color: #666; }
        }
      `}</style>

      {/* ───── PUBLIC BRANDED HEADER (no admin navigation) ───── */}
      <header className="no-print border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3.5">
          <img src="/images/logo.png" alt="AllDent" className="h-9 w-auto" />
          <span className="text-[13px] text-[#4B5563]">כרטיס פרופיל מקצועי</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] p-6">
        {/* ───── HERO ───── */}
        <div className="hero-strip h-1.5 rounded-t-2xl bg-[#008080]" />
        <Card className="card mb-6 rounded-b-2xl rounded-t-none border border-t-0 border-[#E5E7EB] bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-5">
                {/* Avatar / photo */}
                <PhotoUpload
                  contactId={contactId}
                  token={isTokenMode ? token : undefined}
                  currentUrl={profile.photo_url}
                  initial={initial}
                  onUploaded={(url) => updateMutation.mutateAsync({ photo_url: url } as Partial<CandidatePublicFields>)}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h1 className="text-[28px] font-extrabold leading-tight text-[#111827]">{name}</h1>
                    <button
                      onClick={() => setEditingSection(editingSection === "header" ? null : "header")}
                      className="no-print mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                      aria-label="ערוך פרטי זהות"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="teal-accent mt-1 text-base font-semibold" style={{ color: "#008080" }}>
                    {titleText}
                  </div>

                  {locationText && (
                    <div className="mt-2 flex items-center gap-1.5 text-[14px] text-[#4B5563]">
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: "#008080" }} aria-hidden="true" />
                      <span>{locationText}</span>
                    </div>
                  )}

                  {subRoleNames.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {subRoleNames.map((n) => (
                        <Badge key={n} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[13px] font-medium text-teal-700 shadow-none">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {availText !== "—" && (
                    <div className="mt-2.5">
                      <Badge className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[13px] text-[#4B5563] shadow-none">
                        {availText}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress + completion nudge */}
              <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 lg:w-[240px]">
                <ProgressCircle pct={completion} />
                {missingLabels.length > 0 ? (
                  <p className="text-center text-[13px] leading-6 text-[#4B5563]">
                    חסר עוד מעט: {missingLabels.slice(0, 3).join(" · ")}
                  </p>
                ) : (
                  <p className="text-center text-[13px] leading-6 text-[#4B5563]">הפרופיל שלך מלא. אפשר להוריד אותו כקובץ.</p>
                )}
              </div>
            </div>

            {/* Header inline edit form */}
            {editingSection === "header" && (
              <div className="mt-4">
                <ProfileSectionEditForm
                  fields={[
                    { field: "full_name", label: "שם מלא", type: "text" },
                    { field: "professional_title", label: "כותרת מקצועית", type: "text" },
                    { field: "role", label: "תפקיד ראשי", type: "select", options: d?.roles ?? [] },
                    { field: "sub_role", label: "תחומי תת-תפקיד", type: "multiselect", options: d?.subRoles ?? [] },
                    { field: "experience", label: "שנות ניסיון", type: "select", options: d?.experience ?? [] },
                  ]}
                  values={values}
                  onSave={handleSave}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
            )}

            {/* Action buttons — one primary, the rest secondary */}
            <div className="no-print mt-6 flex flex-col gap-3 border-t border-[#E5E7EB] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                className="h-11 w-full rounded-xl bg-[#008080] px-5 text-[15px] font-semibold text-white hover:bg-[#006666] sm:w-auto"
                onClick={() => setShowScanner(true)}
              >
                <Upload className="me-2 h-4 w-4" />
                {completion < 100 ? "השלמת הפרופיל מקורות חיים" : "העלאת קורות חיים"}
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-[#E5E7EB] px-5 text-[15px] text-[#111827] hover:bg-[#F9FAFB] sm:w-auto"
                onClick={() => setShowWriter(true)}
              >
                <Sparkles className="me-2 h-4 w-4 text-[#D97706]" />
                שדרוג AI
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-[#E5E7EB] px-5 text-[15px] text-[#111827] hover:bg-[#F9FAFB] sm:w-auto"
                onClick={() => window.print()}
              >
                <Download className="me-2 h-4 w-4" />
                הורדה / הדפסה כ-PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ───── CONTENT — two columns (main column appears right in RTL) ───── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          {/* MAIN COLUMN */}
          <div className="space-y-6">
            {/* Professional Summary */}
            <Section
              title="פרופיל מקצועי"
              sectionKey="summary"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[{ field: "personal_summary", label: "פרופיל מקצועי", type: "textarea" }]}
              values={values}
              onSave={handleSave}
              emphasis="primary"
            >
              {profile.personal_summary || profile.ai_profile_summary ? (
                <p className="whitespace-pre-wrap text-base leading-7 text-[#111827]">
                  {profile.personal_summary || profile.ai_profile_summary}
                </p>
              ) : (
                <EmptyState
                  text="כמה משפטים על מי את/ה מקצועית — זה החלק שמעסיקים קוראים ראשון."
                  actionLabel="כתיבת פרופיל מקצועי"
                  onAction={() => setEditingSection("summary")}
                />
              )}
            </Section>

            {/* Employment History */}
            <Section
              title="ניסיון תעסוקתי"
              sectionKey="experience"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "current_employer", label: "מעסיק נוכחי", type: "text" },
                {
                  field: "previous_employers",
                  label: "מקומות עבודה קודמים (פורמט JSON)",
                  type: "textarea",
                  placeholder: '[{"name":"...","role":"...","years":"...","description":"..."}]',
                  dir: "ltr",
                },
              ]}
              values={{ ...values, previous_employers: JSON.stringify(employers, null, 2) }}
              onSave={async (patch) => {
                const next = { ...patch };
                if (typeof next.previous_employers === "string") {
                  try { next.previous_employers = JSON.parse(next.previous_employers); }
                  catch { /* keep raw string; server will store as-is */ }
                }
                await handleSave(next);
              }}
              emphasis="primary"
            >
              {profile.current_employer && (
                <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                  <div className="mb-1 text-[13px] font-bold text-[#008080]">מעסיק נוכחי</div>
                  <div className="text-base font-semibold text-[#111827]">{profile.current_employer}</div>
                </div>
              )}
              {employers.length > 0 ? (
                <div className="space-y-5">
                  {employers.map((emp, i) => (
                    <div key={i} className="relative border-r-2 border-[#008080] pr-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-[#111827]">{emp.name || "—"}</div>
                          {emp.role && <div className="mt-0.5 text-[14px] font-medium text-[#008080]">{emp.role}</div>}
                        </div>
                        {emp.years && (
                          <Badge className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-0.5 text-[13px] font-medium text-[#4B5563] shadow-none">
                            {emp.years}
                          </Badge>
                        )}
                      </div>
                      {emp.description && <p className="mt-1.5 text-[14px] leading-6 text-[#4B5563]">{emp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                !profile.current_employer && (
                  <EmptyState
                    text="מקומות העבודה שלך מספרים את הסיפור המקצועי. אפשר גם להעלות קו״ח וניקח אותם משם."
                    actionLabel="הוספת ניסיון תעסוקתי"
                    onAction={() => setEditingSection("experience")}
                  />
                )
              )}
            </Section>

            {/* Education */}
            <Section
              title="השכלה והסמכות"
              sectionKey="education"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "academic_education", label: "השכלה אקדמית", type: "textarea" },
                { field: "professional_courses", label: "קורסים והשתלמויות", type: "textarea" },
                { field: "license_no", label: "מספר רישיון", type: "text" },
              ]}
              values={values}
              onSave={handleSave}
              emphasis="primary"
            >
              <div className="space-y-4">
                {profile.academic_education && (
                  <div>
                    <div className="mb-1 text-[13px] font-bold text-[#4B5563]">השכלה אקדמית</div>
                    <p className="whitespace-pre-wrap text-base leading-7 text-[#111827]">{profile.academic_education}</p>
                  </div>
                )}
                {profile.professional_courses && (
                  <div>
                    <div className="mb-1 text-[13px] font-bold text-[#4B5563]">קורסים והשתלמויות</div>
                    <p className="whitespace-pre-wrap text-base leading-7 text-[#111827]">{profile.professional_courses}</p>
                  </div>
                )}
                {profile.license_no && (
                  <div>
                    <div className="mb-1 text-[13px] font-bold text-[#4B5563]">מספר רישיון</div>
                    <p className="text-base text-[#111827]">{profile.license_no}</p>
                  </div>
                )}
                {!profile.academic_education && !profile.professional_courses && !profile.license_no && (
                  <EmptyState
                    text="תארים, קורסים והסמכות מחזקים את המועמדות."
                    actionLabel="הוספת השכלה והסמכות"
                    onAction={() => setEditingSection("education")}
                  />
                )}
              </div>
            </Section>

            {/* Availability & Preferences */}
            <Section
              title="זמינות והעדפות"
              sectionKey="availability"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "candidate_availability_ids", label: "זמינות", type: "multiselect", options: d?.availability ?? [] },
                { field: "preferred_scope", label: "היקף משרה", type: "multiselect", options: d?.scopes ?? [] },
                { field: "candidate_salary_type_ids", label: "סוג שכר", type: "multiselect", options: d?.salaryTypes ?? [] },
                { field: "salary_expectation_monthly", label: "ציפיית שכר חודשי (₪)", type: "number" },
                { field: "salary_expectation_hourly", label: "ציפיית שכר שעתי (₪)", type: "number" },
                { field: "work_status", label: "סטטוס תעסוקתי", type: "select", options: d?.workStatuses ?? [] },
                { field: "work_schedule_text", label: "הערות זמינות / משמרות", type: "textarea" },
                { field: "mobility_id", label: "ניידות", type: "select", options: d?.mobility ?? [] },
                { field: "tax_type_id", label: "סוג העסקה", type: "select", options: d?.taxTypes ?? [] },
                { field: "preferred_regions", label: "אזורים מועדפים", type: "multiselect", options: d?.regions ?? [] },
                { field: "preferred_cities", label: "ערים מועדפות", type: "multiselect", options: d?.cities ?? [] },
              ]}
              values={values}
              onSave={handleSave}
            >
              <div className="space-y-2 text-sm">
                <Row label="זמינות" value={availText} />
                {scopeNames.length > 0 && <Row label="היקף" value={scopeNames.join(", ")} />}
                {salaryTypeNames.length > 0 && <Row label="סוג שכר" value={salaryTypeNames.join(", ")} />}
                {profile.salary_expectation_monthly && (
                  <Row label="שכר חודשי" value={`₪${profile.salary_expectation_monthly.toLocaleString()}`} />
                )}
                {profile.salary_expectation_hourly && (
                  <Row label="שכר שעתי" value={`₪${profile.salary_expectation_hourly}`} />
                )}
                {workStatusText !== "—" && <Row label="סטטוס" value={workStatusText} />}
                {mobilityText !== "—" && <Row label="ניידות" value={mobilityText} />}
                {taxTypeText !== "—" && <Row label="סוג העסקה" value={taxTypeText} />}
                {experienceText !== "—" && <Row label="שנות ניסיון" value={experienceText} />}
                {profile.work_schedule_text && (
                  <div className="pt-1">
                    <span className="text-slate-500">הערות זמינות</span>
                    <div className="text-slate-700 mt-0.5 whitespace-pre-wrap">{profile.work_schedule_text}</div>
                  </div>
                )}
                {(regionPrefNames.length > 0 || cityPrefNames.length > 0 || profile.preferred_all_country) && (
                  <div className="pt-1">
                    <span className="text-slate-500">אזורים רלוונטיים</span>
                    <div className="text-slate-700 mt-0.5">
                      {profile.preferred_all_country
                        ? "כל הארץ"
                        : [...regionPrefNames, ...cityPrefNames].join(", ") || "—"}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Messages box — candidate only, never printed */}
            {isTokenMode && token && <CandidateMessagesBox token={token} />}
          </div>

          {/* SIDEBAR (visually on the left under RTL) */}
          <div className="space-y-6">
            {/* Personal details + contact — one card */}
            <Section
              title="פרטים אישיים ופרטי קשר"
              sectionKey="contact"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "phone", label: "נייד", type: "text", dir: "ltr" },
                { field: "second_phone", label: "נייד נוסף", type: "text", dir: "ltr" },
                { field: "email", label: "אימייל", type: "text", dir: "ltr" },
                { field: "second_email", label: "אימייל נוסף", type: "text", dir: "ltr" },
                {
                  field: "city_id",
                  label: "עיר ואזור",
                  type: "cityregion",
                  cities: d?.cities ?? [],
                  regions: d?.regions ?? [],
                  regionField: "region_id",
                },
                { field: "gender", label: "מגדר", type: "select", options: d?.genders ?? [] },
                { field: "birth_year", label: "שנת לידה", type: "number" },
                { field: "candidate_notes", label: "הערות / משהו נוסף שתרצה/י לספר", type: "textarea" },
              ]}
              values={values}
              onSave={handleSave}
            >
              {hasContactInfo || hasPersonalInfo ? (
                <div className="space-y-2.5 text-sm">
                  {(cityText !== "—" || regionText !== "—") && (
                    <div className="flex items-center gap-2 text-[#111827]">
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: "#008080" }} />
                      <span>{[cityText, regionText].filter((t) => t !== "—").join(" · ")}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-[#111827]">
                      <Phone className="h-4 w-4 shrink-0" style={{ color: "#008080" }} />
                      <span dir="ltr">{profile.phone}</span>
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex min-w-0 items-center gap-2 text-[#111827]">
                      <Mail className="h-4 w-4 shrink-0" style={{ color: "#008080" }} />
                      <span dir="ltr" className="truncate">{profile.email}</span>
                    </div>
                  )}
                  {hasPersonalInfo && (
                    <div className="space-y-2 border-t border-[#E5E7EB] pt-2.5">
                      {genderText !== "—" && <Row label="מגדר" value={genderText} />}
                      {profile.birth_year && <Row label="שנת לידה" value={String(profile.birth_year)} />}
                      {profile.candidate_notes && (
                        <div className="pt-1">
                          <span className="text-[#4B5563]">הערות</span>
                          <div className="mt-0.5 whitespace-pre-wrap text-[#111827]">{profile.candidate_notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  text="דרכי ההתקשרות שלך — כך מעסיקים יוכלו לחזור אליך."
                  actionLabel="הוספת פרטים ופרטי קשר"
                  onAction={() => setEditingSection("contact")}
                />
              )}
            </Section>

            {/* Links */}
            <Section
              title="קישורים"
              sectionKey="links"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "linkedin_url", label: "לינקדאין", type: "text", dir: "ltr" },
                { field: "facebook_url", label: "פייסבוק", type: "text", dir: "ltr" },
                { field: "portfolio_url", label: "תיק עבודות", type: "text", dir: "ltr" },
                { field: "recommendations_url", label: "המלצות", type: "text", dir: "ltr" },
              ]}
              values={values}
              onSave={handleSave}
            >
              {hasLinks ? (
                <div className="space-y-2 text-sm">
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#008080]">
                      <Linkedin className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>לינקדאין ↗</span>
                    </a>
                  )}
                  {profile.facebook_url && (
                    <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#008080]">
                      <Facebook className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>פייסבוק ↗</span>
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#008080]">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>תיק עבודות ↗</span>
                    </a>
                  )}
                  {profile.recommendations_url && (
                    <a href={profile.recommendations_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#008080]">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>המלצות ↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <EmptyState
                  text="קישור ללינקדאין או לתיק עבודות מוסיף אמינות."
                  actionLabel="הוספת קישורים"
                  onAction={() => setEditingSection("links")}
                />
              )}
            </Section>

            {/* Skills */}
            <Section
              title="כישורים ומערכות"
              sectionKey="skills"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[
                { field: "languages", label: "שפות", type: "multiselect", options: d?.languages ?? [] },
                { field: "systems_used", label: "מערכות וכלים", type: "multiselect", options: d?.systems ?? [] },
                { field: "procedures_experience", label: "פרוצדורות / תחומי ניסיון", type: "multiselect", options: d?.procedures ?? [] },
                { field: "additional_skills_notes", label: "כישורים נוספים", type: "textarea" },
              ]}
              values={values}
              onSave={handleSave}
            >
              {hasSkills ? (
                <div className="space-y-3">
                  {languageNames.length > 0 && (
                    <div>
                      <div className="mb-2 text-[13px] font-bold text-[#4B5563]">שפות</div>
                      <div className="flex flex-wrap gap-1.5">
                        {languageNames.map((n) => (
                          <Badge key={n} className="rounded-full border border-slate-200 bg-[#F9FAFB] text-[#4B5563] px-2.5 py-0.5 text-[13px] shadow-none">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {systemNames.length > 0 && (
                    <div>
                      <div className="mb-2 text-[13px] font-bold text-[#4B5563]">מערכות וכלים</div>
                      <div className="flex flex-wrap gap-1.5">
                        {systemNames.map((n) => (
                          <Badge key={n} className="rounded-full border border-slate-200 bg-[#F9FAFB] text-[#4B5563] px-2.5 py-0.5 text-[13px] shadow-none">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {procedureNames.length > 0 && (
                    <div>
                      <div className="mb-2 text-[13px] font-bold text-[#4B5563]">פרוצדורות / תחומי ניסיון</div>
                      <div className="flex flex-wrap gap-1.5">
                        {procedureNames.map((n) => (
                          <Badge key={n} className="rounded-full border border-teal-200 bg-teal-50 text-teal-700 px-2.5 py-0.5 text-[13px] shadow-none">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.additional_skills_notes && (
                    <div>
                      <div className="mb-1 text-[13px] font-bold text-[#4B5563]">כישורים נוספים</div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{profile.additional_skills_notes}</div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  text="שפות, מערכות ופרוצדורות שאת/ה שולט/ת בהן."
                  actionLabel="הוספת כישורים"
                  onAction={() => setEditingSection("skills")}
                />
              )}
            </Section>

            {/* Documents */}
            <Section
              title="מסמכים"
              sectionKey="documents"
              editingSection={editingSection}
              onEditToggle={setEditingSection}
              fields={[{ field: "cv_link", label: "קישור לקורות חיים", type: "text", dir: "ltr" }]}
              values={values}
              onSave={handleSave}
            >
              {profile.cv_link || profile.has_cv ? (
                <div className="space-y-2">
                  {profile.cv_link && (
                    <a href={profile.cv_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[#008080] hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0" />קורות חיים ↗
                    </a>
                  )}
                  {!profile.cv_link && profile.has_cv && (
                    <p className="text-[13px] text-[#4B5563]">קורות חיים במערכת ✓</p>
                  )}
                </div>
              ) : (
                <EmptyState
                  text="קורות חיים מעודכנים מזרזים תהליכי גיוס."
                  actionLabel="העלאת קורות חיים"
                  onAction={() => setShowScanner(true)}
                />
              )}
            </Section>
          </div>
        </div>

        {/* ───── FOOTER ───── */}
        <div className="alldent-footer mt-10 border-t border-[#E5E7EB] py-5 text-center text-[13px] text-[#4B5563]">
          <div>ALLDENT · פלטפורמת הגיוס הדנטלית המובילה בישראל · נוצר על ידי AllDent</div>
          {profile.updated_timestamp && (
            <div className="mt-1">עודכן לאחרונה: {fmtDateTime(profile.updated_timestamp)}</div>
          )}
        </div>
      </div>

      {/* ───── AI DIALOGS ───── */}
      {showWriter && profile && (
        <AIProfileWriter
          contactId={contactId}
          token={isTokenMode ? token : undefined}
          currentData={profile}
          onApply={async (fields) => { await handleSave(fields as Record<string, unknown>); }}
          onClose={() => setShowWriter(false)}
        />
      )}
      {showScanner && profile && (
        <AIDocumentScanner
          contactId={contactId}
          token={isTokenMode ? token : undefined}
          currentData={profile}
          onApply={async (fields) => {
            // Uploading/scanning a CV means the candidate has one.
            await handleSave({ ...(fields as Record<string, unknown>), has_cv: true });
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

// small key/value row used in the sidebar
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[14px]">
      <span className="shrink-0 text-[#4B5563]">{label}</span>
      <span className="text-end font-medium text-[#111827]">{value}</span>
    </div>
  );
}
