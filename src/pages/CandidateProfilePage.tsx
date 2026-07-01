import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Download,
  Edit2,
  Facebook,
  FileText,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useCandidateProfile,
  useCandidateProfileByToken,
  useUpdateCandidateProfile,
  CANDIDATE_PUBLIC_FIELDS,
} from "@/hooks/useCandidateProfile";
import type { CandidatePublicFields } from "@/hooks/useCandidateProfile";
import { useContact360Dicts } from "@/hooks/useContact360";
import type { DictItem } from "@/hooks/useContact360";
import ProfileEditForm from "@/components/candidate/ProfileEditForm";
import AIProfileWriter from "@/components/candidate/AIProfileWriter";
import AIDocumentScanner from "@/components/candidate/AIDocumentScanner";

// ─── helpers ────────────────────────────────────────────────────────────────

function dictName(list: DictItem[], id: unknown): string {
  if (id == null) return "—";
  return list.find((d) => d.id === Number(id))?.name ?? "—";
}

function dictNames(list: DictItem[], values: unknown): string {
  if (!Array.isArray(values) || values.length === 0) return "—";
  const names = values.map((v) => dictName(list, v)).filter((n) => n !== "—");
  return names.length ? names.join(", ") : "—";
}

const COMPLETION_FIELDS = [
  "full_name", "professional_title", "phone", "email",
  "role", "experience", "candidate_availability_ids", "region_id",
  "personal_summary", "languages", "systems_used",
  "academic_education", "salary_expectation_monthly",
];

function calcCompletion(data: CandidatePublicFields & { contact_id: number }): number {
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
      <span className="text-[11px] font-medium text-slate-400">פרופיל הושלם</span>
    </div>
  );
}

// ─── section component ──────────────────────────────────────────────────────

function Section({
  title,
  children,
  editField,
  onEdit,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  editField?: string;
  onEdit?: (field: string) => void;
}) {
  return (
    <Card className="card rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
            <div className="h-[2px] w-8 rounded-full bg-[#008080]" />
          </div>
          {editField && onEdit && (
            <button
              onClick={() => onEdit(editField)}
              className="text-slate-400 hover:text-[#008080] transition no-print"
              aria-label={`ערוך ${title}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
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
  const updateMutation = useUpdateCandidateProfile(contactId);
  const { data: dicts } = useContact360Dicts();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [showWriter, setShowWriter] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const completion = useMemo(() => (profile ? calcCompletion(profile) : 0), [profile]);
  const employers = useMemo(() => parseEmployers(profile?.previous_employers), [profile?.previous_employers]);

  async function handleFieldSave(field: string, value: unknown) {
    await updateMutation.mutateAsync({ [field]: value } as Partial<CandidatePublicFields>);
    setEditingField(null);
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

  const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";
  const titleText = profile.professional_title || dictName(dicts?.roles ?? [], profile.role);
  const cityText = dictName(dicts?.cities ?? [], profile.city_id);
  const availText = dictNames(dicts?.availability ?? [], profile.candidate_availability_ids);
  const subRoleNames = Array.isArray(profile.sub_role)
    ? profile.sub_role.map((id) => dictName(dicts?.subRoles ?? [], id)).filter((n) => n !== "—")
    : [];
  const hasContactInfo = Boolean(cityText !== "—" || profile.phone || profile.email || profile.facebook_url);
  const initial = name.charAt(0);

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-['Heebo'] profile-container">
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

      <div className="mx-auto max-w-4xl p-6">
        {/* ───── HERO ───── */}
        <div className="hero-strip h-1.5 rounded-t-2xl bg-[#008080]" />
        <Card className="card rounded-t-none rounded-b-2xl border border-t-0 border-slate-200 bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border-2 border-[#008080] bg-teal-50 text-2xl font-bold text-[#008080]">
                  {initial}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[26px] font-extrabold leading-tight text-slate-900">{name}</h1>
                <div className="text-base font-semibold teal-accent mt-0.5" style={{ color: "#008080" }}>
                  {titleText}
                </div>
                {subRoleNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {subRoleNames.map((n) => (
                      <Badge key={n} className="rounded-full border border-teal-200 bg-teal-50 text-teal-700 px-2.5 py-0.5 text-[11px] font-medium shadow-none">
                        {n}
                      </Badge>
                    ))}
                  </div>
                )}
                {availText !== "—" && (
                  <div className="mt-3">
                    <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-3 py-1 text-xs shadow-none">
                      {availText}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Progress */}
              <ProgressCircle pct={completion} />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-5 no-print">
              <Button size="sm" className="rounded-xl bg-[#008080] hover:bg-teal-700 text-white" onClick={() => window.print()}>
                <Download className="h-3.5 w-3.5 me-1.5" />
                הורדה כ-PDF
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowScanner(true)}>
                <Upload className="h-3.5 w-3.5 me-1.5" />
                העלאת מסמך
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowWriter(true)}>
                <Sparkles className="h-3.5 w-3.5 me-1.5" />
                שדרוג AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ───── CONTENT — two columns (main column appears right in RTL) ───── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          {/* MAIN COLUMN */}
          <div className="space-y-6">
            {/* Professional Summary */}
            <Section
              title="פרופיל מקצועי"
              editField="personal_summary"
              onEdit={setEditingField}
            >
              <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                {profile.personal_summary || profile.ai_profile_summary || "לא הוזן עדיין."}
              </p>
              {editingField === "personal_summary" && (
                <div className="mt-3">
                  <ProfileEditForm
                    field="personal_summary"
                    label="פרופיל מקצועי"
                    currentValue={profile.personal_summary}
                    onSave={(v) => handleFieldSave("personal_summary", v)}
                    onCancel={() => setEditingField(null)}
                  />
                </div>
              )}
            </Section>

            {/* Employment History */}
            <Section
              title="ניסיון תעסוקתי"
              editField="previous_employers"
              onEdit={setEditingField}
            >
              {profile.current_employer && (
                <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                  <div className="text-xs font-bold text-[#008080] mb-1">מעסיק נוכחי</div>
                  <div className="text-sm font-semibold text-slate-900">{profile.current_employer}</div>
                </div>
              )}
              {employers.length > 0 ? (
                <div className="space-y-5">
                  {employers.map((emp, i) => (
                    <div key={i} className="relative border-r-2 border-[#008080] pr-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{emp.name || "—"}</div>
                          {emp.role && <div className="text-sm text-[#008080] font-medium mt-0.5">{emp.role}</div>}
                        </div>
                        {emp.years && (
                          <Badge className="shrink-0 rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2.5 py-0.5 text-xs font-medium shadow-none">
                            {emp.years}
                          </Badge>
                        )}
                      </div>
                      {emp.description && <p className="text-sm text-slate-600 mt-1.5 leading-6">{emp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">לא הוזן עדיין.</p>
              )}
              {editingField === "previous_employers" && (
                <div className="mt-3">
                  <ProfileEditForm
                    field="previous_employers"
                    label="ניסיון תעסוקתי"
                    currentValue={typeof profile.previous_employers === "string" ? profile.previous_employers : JSON.stringify(profile.previous_employers, null, 2)}
                    onSave={(v) => {
                      let parsed = v;
                      if (typeof v === "string") { try { parsed = JSON.parse(v); } catch { /* keep as string */ } }
                      return handleFieldSave("previous_employers", parsed);
                    }}
                    onCancel={() => setEditingField(null)}
                  />
                </div>
              )}
            </Section>

            {/* Education */}
            <Section
              title="השכלה והסמכות"
              editField="academic_education"
              onEdit={setEditingField}
            >
              <div className="space-y-3">
                {profile.academic_education && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-1">השכלה אקדמית</div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.academic_education}</p>
                  </div>
                )}
                {profile.professional_courses && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-1">קורסים מקצועיים</div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.professional_courses}</p>
                  </div>
                )}
                {!profile.academic_education && !profile.professional_courses && (
                  <p className="text-sm text-slate-400">לא הוזן עדיין.</p>
                )}
              </div>
              {editingField === "academic_education" && (
                <div className="mt-3">
                  <ProfileEditForm
                    field="academic_education"
                    label="השכלה אקדמית"
                    currentValue={profile.academic_education}
                    onSave={(v) => handleFieldSave("academic_education", v)}
                    onCancel={() => setEditingField(null)}
                  />
                </div>
              )}
            </Section>
          </div>

          {/* SIDEBAR (visually on the left under RTL) */}
          <div className="space-y-6">
            {/* Contact info */}
            {hasContactInfo && (
              <Section title="פרטי קשר">
                <div className="space-y-2.5 text-sm">
                  {cityText !== "—" && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{cityText}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr">{profile.phone}</span>
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-center gap-2 text-slate-700 min-w-0">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr" className="truncate">{profile.email}</span>
                    </div>
                  )}
                  {profile.facebook_url && (
                    <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#008080]">
                      <Facebook className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>פייסבוק ↗</span>
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* Skills */}
            <Section title="כישורים">
              {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-slate-500 mb-2">שפות</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((lid) => (
                      <Badge key={lid} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">
                        {dictName(dicts?.languages ?? [], lid)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.additional_skills_notes && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-slate-500 mb-1">כישורים נוספים</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{profile.additional_skills_notes}</div>
                </div>
              )}
              {Array.isArray(profile.systems_used) && profile.systems_used.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-slate-500 mb-2">מערכות</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.systems_used.map((sid) => (
                      <Badge key={sid} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">
                        {dictName(dicts?.scopes ?? [], sid) !== "—" ? dictName(dicts?.scopes ?? [], sid) : String(sid)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!(Array.isArray(profile.languages) && profile.languages.length > 0) && !profile.additional_skills_notes && !(Array.isArray(profile.systems_used) && profile.systems_used.length > 0) && (
                <p className="text-sm text-slate-400">לא הוזן עדיין.</p>
              )}
            </Section>

            {/* Availability & Preferences */}
            <Section title="זמינות והעדפות">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">זמינות</span>
                  <span className="font-medium text-slate-900">{availText}</span>
                </div>
                {profile.preferred_scope && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">היקף</span>
                    <span className="font-medium text-slate-900">{profile.preferred_scope}</span>
                  </div>
                )}
                {profile.salary_expectation_monthly && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">שכר חודשי</span>
                    <span className="font-medium text-slate-900">₪{profile.salary_expectation_monthly.toLocaleString()}</span>
                  </div>
                )}
                {profile.salary_expectation_hourly && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">שכר שעתי</span>
                    <span className="font-medium text-slate-900">₪{profile.salary_expectation_hourly}</span>
                  </div>
                )}
                {profile.mobility_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ניידות</span>
                    <span className="font-medium text-slate-900">{profile.mobility_id}</span>
                  </div>
                )}
                {Array.isArray(profile.preferred_regions) && profile.preferred_regions.length > 0 && (
                  <div>
                    <span className="text-slate-500">אזורים רלוונטיים לעבודה</span>
                    <div className="text-slate-700 mt-0.5">
                      {profile.preferred_regions.map((id) => dictName(dicts?.regions ?? [], id)).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Documents */}
            {(profile.cv_link || profile.portfolio_url || profile.recommendations_url) && (
              <Section title="מסמכים">
                <div className="space-y-2">
                  {profile.cv_link && (
                    <a href={profile.cv_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[#008080] hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      קורות חיים ↗
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[#008080] hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      פורטפוליו ↗
                    </a>
                  )}
                  {profile.recommendations_url && (
                    <a href={profile.recommendations_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[#008080] hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      המלצות ↗
                    </a>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* ───── FOOTER ───── */}
        <div className="mt-10 py-4 text-center text-xs text-slate-400 alldent-footer">
          ALLDENT · פלטפורמת הגיוס הדנטלית המובילה בישראל · נוצר על ידי AllDent
        </div>
      </div>

      {/* ───── AI DIALOGS ───── */}
      {showWriter && profile && (
        <AIProfileWriter
          contactId={contactId}
          currentData={profile}
          onApply={async (fields) => { await updateMutation.mutateAsync(fields); }}
          onClose={() => setShowWriter(false)}
        />
      )}
      {showScanner && profile && (
        <AIDocumentScanner
          contactId={contactId}
          currentData={profile}
          onApply={async (fields) => { await updateMutation.mutateAsync(fields); }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}