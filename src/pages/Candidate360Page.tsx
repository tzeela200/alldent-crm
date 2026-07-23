import type { ApplicationRow, DictItem } from "@/hooks/useContact360";
import { useContactMutations } from "@/hooks/useContactMutations";
import { openApplicationCv, applicationHasCv } from "@/lib/cv";
import { getRoleColorHex } from "@/lib/roleColors";
import ContactHistoryPanel from "@/components/admin/ContactHistoryPanel";
import ContactMessagesPanel from "@/components/admin/ContactMessagesPanel";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  User2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/lib/supabase";
import { isContactNotFoundError, useContact360, useContact360Dicts } from "@/hooks/useContact360";
import type { JobRow, LinkedJobRow } from "@/hooks/useContact360";
import { RoleSubRolePicker } from "@/components/ui/RoleSubRolePicker";
import { useQueryClient } from "@tanstack/react-query";
import { AdminTable, type AdminColumn } from "@/components/admin/AdminTable";
import { AdminActionsMenu } from "@/components/admin/AdminActionsMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { jobStatusColors } from "@/lib/statusColors";

import BlockIdentity from "@/components/contact/BlockIdentity";
import BlockProfessional from "@/components/contact/BlockProfessional";
import BlockConditions from "@/components/contact/BlockConditions";
import BlockSocial from "@/components/contact/BlockSocial";
import { Candidate360Hero } from "@/components/contact/Candidate360Hero";
import { BlockCRM } from "@/components/contact/BlockCRM";
import { BlockEmployer } from "@/components/contact/BlockEmployer";
import { CvUploadCard } from "@/components/contact/CvUploadCard";
import {
  Contact360TabPanel,
  Contact360Tabs,
  type Contact360TabDef,
  type Contact360TabId,
} from "@/components/contact/Contact360Tabs";
import { useContactMessages } from "@/hooks/useContactHistory";

const BRAND = { primary: "#008080", hover: "#006666", pageBg: "#F8FAFC", cardBorder: "#E5E7EB" };

type ToastState = { type: "success" | "error"; text: string } | null;

// ─── utils ───────────────────────────────────────────────────────────────────

function dictName(
  items: DictItem[],
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const found = items.find((item) => Number(item.id) === Number(value));
  if (found) return found.name;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return value;
  return "—";
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).map(Number).filter(Number.isFinite);
}

function dictNames(items: DictItem[], values: unknown): string {
  const ids = toNumberArray(values);
  if (!ids.length) return "—";
  const names = ids.map((id) => dictName(items, id)).filter((name) => name !== "—");
  return names.length ? names.join(", ") : "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

function applicationStatusClass(value?: number | string | null) {
  const statusId = Number(value ?? -1);
  if ([1, 2, 3, 4, 9].includes(statusId)) return "border-amber-200 bg-amber-50 text-amber-700";
  if ([6, 7, 8, 11].includes(statusId)) return "border-blue-200 bg-blue-50 text-blue-700";
  if (statusId === 12) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if ([5, 10, 13, 14, 15].includes(statusId)) return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function LabelValue({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-[14px] text-slate-500">{label}</span>
      <span className="text-end text-[14px] font-semibold text-slate-800">{value || "—"}</span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  accentColor = BRAND.primary,
}: {
  icon: string;
  title: string;
  subtitle: string;
  accentColor?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg leading-none"
          style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
        >
          {icon}
        </span>
        <div>
          <div className="text-base font-extrabold text-slate-900">{title}</div>
          <div className="mt-1 text-[14px] leading-[1.6] text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className="h-px w-full bg-[#E2E8F0]" />
    </div>
  );
}

/**
 * Two-line preview with a "הצג הכל" toggle. The toggle appears only when the
 * text really overflows — Hebrew wrapping in a narrow cell makes any
 * character-count heuristic wrong right at the boundary. Newlines are kept.
 */
function ClampedText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;
    setClamped(node.scrollHeight > node.clientHeight + 1);
  }, [expanded, text]);

  return (
    <div className="space-y-1">
      <div
        ref={textRef}
        className={`whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700 ${expanded ? "" : "line-clamp-2"}`}
        title={expanded ? undefined : text}
      >
        {text}
      </div>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-[13px] font-medium text-[#008080] hover:text-[#006666] hover:underline"
        >
          {expanded ? "הצג פחות" : "הצג הכל"}
        </button>
      )}
    </div>
  );
}

/**
 * applications.candidate_notes — what the candidate typed in the public
 * application form. Display only: it belongs to this one application and must
 * never be edited here, nor confused with internal_notes or contact.notes.
 */
function CandidateNotesCell({ value }: { value: string | null }) {
  const text = (value ?? "").trim();
  if (!text) return <span className="text-[13px] text-slate-300">—</span>;
  return (
    <div className="max-w-[260px]">
      <ClampedText text={text} />
    </div>
  );
}

/**
 * applications.internal_notes — the AllDent team's own note about this one
 * application. Editable in place. Writes only to applications.internal_notes:
 * never candidate_notes, never contact.notes.
 */
function EditableApplicationNotes({
  value,
  applicationId,
  onSave,
}: {
  value: string | null;
  applicationId: number;
  onSave: (notes: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [editing, value]);

  const text = (value ?? "").trim();

  if (!editing) {
    return (
      <div className="flex max-w-[260px] items-start gap-1.5">
        <div className="min-w-0 flex-1">
          {text ? <ClampedText text={text} /> : <span className="text-[13px] text-slate-300">—</span>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
          aria-label={text ? `עריכת הערת אדמין להגשה ${applicationId}` : `הוספת הערת אדמין להגשה ${applicationId}`}
          title={text ? "עריכת הערת אדמין" : "הוספת הערת אדמין"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] space-y-2">
      <Textarea
        value={draft}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
        placeholder="הערה פנימית של הצוות להגשה זו..."
        className="min-h-[88px] rounded-xl border-slate-200 text-[13px] leading-6"
        dir="rtl"
        aria-label={`הערת אדמין להגשה ${applicationId}`}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(draft.trim() ? draft : null);
              setEditing(false);
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-[#008080] px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#006666] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          שמור
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-500 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" />
          ביטול
        </button>
      </div>
    </div>
  );
}

function EditableApplicationStatus({
  application,
  statuses,
  onSave,
}: {
  application: ApplicationRow;
  statuses: DictItem[];
  onSave: (statusId: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(application.application_status == null ? "" : String(application.application_status));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(application.application_status == null ? "" : String(application.application_status));
  }, [application.application_status, editing]);

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge className={`h-[30px] rounded-full border px-3 text-sm font-medium shadow-none ${applicationStatusClass(application.application_status)}`}>
          {dictName(statuses, application.application_status)}
        </Badge>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080]"
          aria-label="עריכת סטטוס הגשה"
          title="עריכת סטטוס הגשה"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-[220px] items-center gap-2">
      <select
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#008080]"
      >
        <option value="">— ללא סטטוס —</option>
        {statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
      </select>
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(draft ? Number(draft) : null);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
        className="rounded-lg bg-[#008080] p-2 text-white hover:bg-[#006666] disabled:opacity-50"
        aria-label="שמירת סטטוס הגשה"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => setEditing(false)}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
        aria-label="ביטול עריכת סטטוס הגשה"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Candidate360Page() {
  const params = useParams<{ contactId?: string; id?: string }>();
  const rawId = params.contactId ?? params.id ?? "";
  const isNew = rawId === "new";
  const resolvedId = isNew ? 0 : Number(rawId);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { updateContact, insertContact } = useContactMutations();
  const { data, isLoading, error } = useContact360(resolvedId);
  const { data: dictsOnly, isLoading: dictsOnlyLoading, error: dictsOnlyError } = useContact360Dicts(isNew);

  // הגעה מ"בקשת גיוס ציבורית" (JobDetailsPage) עם פרטי איש קשר למילוי מוקדם.
  const prefillContact = (location.state as any)?.prefillContact as
    | { first_name?: string; last_name?: string; phone?: string; email?: string }
    | undefined;

  // ── create-new-contact form state ──
  const [newForm, setNewForm] = useState({
    first_name: prefillContact?.first_name ?? "", last_name: prefillContact?.last_name ?? "",
    phone: prefillContact?.phone ?? "", email: prefillContact?.email ?? "",
    role: "", sub_roles: [] as string[], city_id: "", region_id: "", gender: "", facebook_url: "",
  });
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState("");

  function setField(field: string, value: string) {
    setNewForm((f) => ({ ...f, [field]: value }));
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function handleCreateContact() {
    const hasName = newForm.first_name.trim() || newForm.last_name.trim();
    if (!hasName) { setNewError("יש להזין שם פרטי או שם משפחה"); return; }
    if (!newForm.phone.trim()) { setNewError("יש להזין מספר נייד"); return; }
    if (newForm.email.trim() && !isValidEmail(newForm.email.trim())) { setNewError("כתובת האימייל אינה תקינה"); return; }
    setNewSaving(true);
    setNewError("");
    const first = newForm.first_name.trim() || null;
    const last = newForm.last_name.trim() || null;
    const full_name = [first, last].filter(Boolean).join(" ");
    const { data: created, error: err } = await insertContact({
      first_name: first, last_name: last, full_name, display_name: full_name,
      phone: newForm.phone.trim() || null, email: newForm.email.trim() || null,
      role: newForm.role ? Number(newForm.role) : null,
      sub_role: newForm.sub_roles.length > 0 ? newForm.sub_roles.map(Number) : null,
      city_id: newForm.city_id ? Number(newForm.city_id) : null,
      gender: newForm.gender ? Number(newForm.gender) : null,
      facebook_url: newForm.facebook_url.trim() || null,
    });
    setNewSaving(false);
    if (err || !created) { setNewError("שמירת איש הקשר נכשלה. נסי שוב."); return; }
    navigate(`/admin/contacts/${created.contact_id}`, { replace: true });
  }

  // ── page state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJobCode, setSelectedJobCode] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [createAppNotes, setCreateAppNotes] = useState("");
  const [createError, setCreateError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [activeTab, setActiveTab] = useState<Contact360TabId>("person");

  // Same query key as ContactMessagesPanel — React Query dedupes it, so the
  // CRM badge costs no extra request. No counter is invented for a badge.
  const { data: contactMessages } = useContactMessages(resolvedId);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  };


  const contact = data?.contact ?? null;
  const applications = data?.applications ?? [];
  const profileTypeIds = data?.profileTypeIds ?? [];
  const tags = data?.tags ?? [];
  const account = data?.account ?? null;
  const jobs = data?.jobs ?? [];
  const linkedJobs: LinkedJobRow[] = data?.linkedJobs ?? [];
  const dicts = data?.dicts;

  const activeApplications = useMemo(() => {
    const activeJobCodes = new Set(jobs.filter((job) => Number(job.job_status) === 3).map((job) => String(job.job_code)));
    return applications.filter((application) =>
      ![5, 10, 13, 14, 15].includes(Number(application.application_status ?? 1)) &&
      Boolean(application.job_code) &&
      activeJobCodes.has(String(application.job_code))
    );
  }, [applications, jobs]);

  const availableJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return jobs
      .filter((job) => Number(job.job_status) === 3)
      .filter((job) => {
        if (!q) return true;
        return [job.job_code, job.job_title, job.account_name, dictName(dicts?.roles ?? [], job.job_role), dictName(dicts?.cities ?? [], job.city_id), dictName(dicts?.regions ?? [], job.region_id)]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const roleDelta = Number(b.job_role === contact?.role) - Number(a.job_role === contact?.role);
        if (roleDelta) return roleDelta;
        return String(a.job_code).localeCompare(String(b.job_code), "he");
      });
  }, [jobs, jobSearch, dicts, contact?.role]);

  const selectedJob = useMemo(
    () => availableJobs.find((job) => job.job_code === selectedJobCode) ?? jobs.find((job) => job.job_code === selectedJobCode) ?? null,
    [availableJobs, jobs, selectedJobCode],
  );

  const allRecommendedJobs = useMemo<Array<{ job: JobRow; score: number; reasons: string[] }>>(() => {
    if (!contact || !dicts) return [];
    const appliedCodes = new Set(applications.map((a) => String(a.job_code ?? "")));
    const preferredRegions = new Set<number>(contact.preferred_regions ?? []);
    const preferredCities = new Set<number>(contact.preferred_cities ?? []);
    return jobs
      .filter((job) => Number(job.job_status) === 3)
      .filter((job) => !appliedCodes.has(String(job.job_code ?? "")))
      .map((job) => {
        let score = 0;
        const reasons: string[] = [];
        if (job.job_role === contact.role) { score += 45; reasons.push("תפקיד מדויק"); }
        const subRoleIds = Array.isArray(contact.sub_role) ? contact.sub_role : (contact.sub_role != null ? [contact.sub_role] : []);
        const jobSubRoleIds = toNumberArray(job.job_sub_role);
        if (subRoleIds.some((id) => jobSubRoleIds.includes(Number(id)))) { score += 15; reasons.push("תת־תפקיד רלוונטי"); }
        if (preferredRegions.has(Number(job.region_id)) || Number(job.region_id) === Number(contact.region_id)) { score += 15; reasons.push("אזור תואם"); }
        if (preferredCities.has(Number(job.city_id)) || Number(job.city_id) === Number(contact.city_id)) { score += 10; reasons.push("עיר תואמת"); }
        const preferredScopeIds = toNumberArray(contact.preferred_scope);
        const jobScopeIds = toNumberArray(job.scope);
        if (preferredScopeIds.some((id) => jobScopeIds.includes(id))) { score += 10; reasons.push("היקף מתאים"); }
        const languageIds = toNumberArray(contact.languages);
        const jobLanguageIds = toNumberArray(job.required_languages);
        if (languageIds.length && jobLanguageIds.some((id) => languageIds.includes(id))) { score += 5; reasons.push("שפה תואמת"); }
        const systemIds = toNumberArray(contact.systems_used);
        const jobSystemIds = toNumberArray(job.systems_used);
        if (systemIds.length && jobSystemIds.some((id) => systemIds.includes(id))) { score += 5; reasons.push("מערכת תואמת"); }
        if (typeof contact.experience === "number" && typeof job.required_experience === "number" && contact.experience >= job.required_experience) { score += 5; reasons.push("ניסיון מתאים"); }
        const normalizedScore = Math.min(100, Math.round((score / 110) * 100));
        return { job, score: normalizedScore, reasons };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [contact, applications, jobs, dicts]);

  const recommendedJobs = useMemo(() => allRecommendedJobs.slice(0, 3), [allRecommendedJobs]);

  const aiSummary = useMemo(() => {
    if (!contact || !dicts) return { summary: "", risks: [] as string[], nextAction: "", isAi: false };
    const parts = [
      contact.full_name || contact.display_name,
      dictName(dicts.roles, contact.role) !== "—" ? `מוגדר/ת כ-${dictName(dicts.roles, contact.role)}` : null,
      dictName(dicts.experience, contact.experience) !== "—" ? `עם ניסיון ${dictName(dicts.experience, contact.experience)}` : null,
      dictNames(dicts.availability, contact.candidate_availability_ids) !== "—" ? `וזמינות ${dictNames(dicts.availability, contact.candidate_availability_ids)}` : null,
      dictName(dicts.cities, contact.city_id) !== "—" ? `באזור ${dictName(dicts.cities, contact.city_id)}` : null,
    ].filter(Boolean);
    const risks: string[] = [];
    if (!applicationHasCv(contact)) risks.push("חסר קו״ח זמין");
    if (!contact.salary_expectation_hourly && !contact.salary_expectation_monthly) risks.push("חסרים נתוני שכר");
    if (!contact.role) risks.push("חסר מיפוי תפקיד");
    const nextAction = contact.next_follow_up
      ? `לבצע פולואפ בתאריך ${formatDate(contact.next_follow_up)}`
      : applications.length > 0 ? "לעדכן סטטוס להגשה האחרונה" : "ליצור הגשה ראשונה למשרה מתאימה";
    const aiText = contact.ai_profile_summary?.trim() || "";
    return { summary: aiText || parts.join(" "), risks, nextAction, isAi: Boolean(aiText) };
  }, [contact, applications, dicts]);

  const completion = useMemo(() => {
    if (!contact) return 0;
    const fields = [
      contact.full_name,
      contact.phone,
      contact.email,
      contact.role,
      contact.experience,
      contact.candidate_availability_ids?.length,
      contact.city_id,
      applicationHasCv(contact),
      contact.professional_title,
      contact.preferred_scope?.length,
      contact.mobility_id,
      contact.preferred_cities?.length || contact.preferred_regions?.length || contact.preferred_all_country,
      contact.salary_expectation_hourly || contact.salary_expectation_monthly,
      contact.languages?.length,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [contact]);

  const applicationColumns = useMemo<AdminColumn<ApplicationRow>[]>(() => [
    {
      key: "application_id",
      label: "מספר הגשה",
      nowrap: true,
      render: (application) => (
        <Link
          to={`/admin/applications?application=${application.application_id}`}
          className="font-mono text-[13px] font-semibold text-[#008080] hover:underline"
        >
          {application.application_id}
        </Link>
      ),
    },
    {
      key: "job_code",
      label: "קוד משרה",
      nowrap: true,
      render: (application) => application.job_code ? (
        <Link
          to={`/admin/jobs/${application.job_code}`}
          className="font-mono text-[13px] font-semibold text-[#008080] hover:underline"
        >
          {application.job_code}
        </Link>
      ) : (
        <span className="font-mono text-[13px] text-slate-400">—</span>
      ),
    },
    {
      key: "job_role",
      label: "תפקיד",
      minWidth: "130px",
      render: (application) => (
        <span className="text-sm font-medium text-slate-900">{application.job_role || "—"}</span>
      ),
    },
    {
      key: "account_name",
      label: "מעסיק",
      minWidth: "150px",
      render: (application) => application.account_name || "—",
    },
    {
      key: "job_status_live",
      label: "סטטוס משרה",
      minWidth: "120px",
      nowrap: true,
      render: (application) => {
        if (application.job_status_live == null) {
          return <span className="text-[13px] text-slate-400">—</span>;
        }
        const statusId = Number(application.job_status_live);
        const tone = jobStatusColors[statusId];
        const label = dictName(dicts?.jobStatuses ?? [], statusId);
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-medium ${
              tone ? `${tone.bg} ${tone.text}` : "bg-slate-100 text-slate-600"
            }`}
          >
            {label !== "—" ? label : tone?.label ?? "—"}
          </span>
        );
      },
    },
    {
      key: "application_status",
      label: "סטטוס הגשה",
      minWidth: "150px",
      render: (application) => (
        <EditableApplicationStatus
          application={application}
          statuses={dicts?.applicationStatuses ?? []}
          onSave={async (statusId) => {
            const { error: updateError } = await supabase
              .from("applications")
              .update({ application_status: statusId, updated_timestamp: new Date().toISOString() })
              .eq("application_id", application.application_id);
            if (updateError) {
              showToast("error", `עדכון סטטוס ההגשה נכשל: ${updateError.message}`);
              throw updateError;
            }
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] }),
              queryClient.invalidateQueries({ queryKey: ["applications"] }),
            ]);
            showToast("success", "סטטוס ההגשה עודכן");
          }}
        />
      ),
    },
    {
      key: "candidate_notes",
      label: "הערות המועמד/ת בזמן ההגשה",
      minWidth: "260px",
      render: (application) => <CandidateNotesCell value={application.candidate_notes} />,
    },
    {
      key: "internal_notes",
      label: "הערות אדמין להגשה",
      minWidth: "280px",
      render: (application) => (
        <EditableApplicationNotes
          value={application.internal_notes}
          applicationId={application.application_id}
          onSave={async (notes) => {
            const { error: updateError } = await supabase
              .from("applications")
              .update({ internal_notes: notes, updated_timestamp: new Date().toISOString() })
              .eq("application_id", application.application_id);
            if (updateError) {
              showToast("error", `שמירת הערת האדמין נכשלה: ${updateError.message}`);
              throw updateError;
            }
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] }),
              queryClient.invalidateQueries({ queryKey: ["applications"] }),
            ]);
            showToast("success", "הערת האדמין נשמרה");
          }}
        />
      ),
    },
    {
      key: "submission_date",
      label: "תאריך הגשה",
      nowrap: true,
      render: (application) => <span className="text-slate-500">{formatDate(application.submission_date)}</span>,
    },
    {
      key: "updated_timestamp",
      label: "עדכון אחרון",
      nowrap: true,
      render: (application) => <span className="text-slate-500">{formatDate(application.updated_timestamp)}</span>,
    },
    {
      key: "cv",
      label: 'קו"ח',
      nowrap: true,
      render: (application) => applicationHasCv(application) ? (
        <button
          type="button"
          onClick={() => void openApplicationCv(application)}
          className="text-blue-600 hover:underline"
        >
          צפייה
        </button>
      ) : (
        <span className="text-slate-300">—</span>
      ),
    },
    {
      key: "actions",
      label: "פעולות",
      nowrap: true,
      render: (application) => (
        <AdminActionsMenu
          ariaLabel={`פעולות להגשה ${application.application_id}`}
          items={[
            {
              key: "open-application",
              icon: <ExternalLink className="h-4 w-4" />,
              label: "פתיחת ההגשה",
              onClick: () => navigate(`/admin/applications?application=${application.application_id}`),
            },
            {
              key: "open-job",
              icon: <Briefcase className="h-4 w-4" />,
              label: "פתיחת המשרה",
              disabled: !application.job_code,
              onClick: () => navigate(`/admin/jobs/${application.job_code}`),
            },
            {
              key: "open-cv",
              icon: <FileText className="h-4 w-4" />,
              label: 'צפייה בקו"ח',
              disabled: !applicationHasCv(application),
              onClick: () => void openApplicationCv(application),
            },
          ]}
        />
      ),
    },
  ], [dicts?.applicationStatuses, dicts?.jobStatuses, navigate, queryClient, resolvedId]);

  const availableCandidateTags = useMemo(() => (dicts?.candidateTags ?? []).filter((candidateTag) =>
    !tags.some((tag) =>
      Number(tag.tag_id) === candidateTag.id ||
      (!tag.tag_id && tag.tag.trim() === candidateTag.name.trim()),
    ),
  ), [dicts?.candidateTags, tags]);

  // ── actions ──
  async function saveContactPatch(patch: Record<string, unknown>) {
    if (!contact) return;
    const { error: updateError } = await updateContact(contact.contact_id, {
      ...patch,
      updated_timestamp: new Date().toISOString(),
    });
    if (updateError) {
      showToast("error", `השמירה נכשלה: ${updateError.message}`);
      throw updateError;
    }
    showToast("success", "הנתון עודכן");
  }

  async function addTag() {
    if (!contact || !dicts || !selectedTagId) return;
    const selectedTag = dicts.candidateTags.find((tag) => tag.id === Number(selectedTagId));
    if (!selectedTag) {
      showToast("error", "התגית שנבחרה אינה קיימת במילון");
      return;
    }
    const duplicate = tags.some((tag) =>
      Number(tag.tag_id) === selectedTag.id ||
      (!tag.tag_id && tag.tag.trim() === selectedTag.name.trim()),
    );
    if (duplicate) {
      showToast("error", "התגית כבר קיימת");
      return;
    }
    const { error: insertError } = await supabase.from("contact_tags").insert({
      contact_id: contact.contact_id,
      tag_id: selectedTag.id,
      tag: selectedTag.name,
    });
    if (insertError) {
      showToast("error", `שגיאה בהוספת תגית: ${insertError.message}`);
      return;
    }
    setSelectedTagId("");
    await queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] });
    showToast("success", "התגית נוספה");
  }

  async function removeTag(tagId: number) {
    const { error: err } = await supabase.from("contact_tags").delete().eq("id", tagId);
    if (err) showToast("error", "שגיאה במחיקת תגית");
    else queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] });
  }

  async function createApplication() {
    const code = selectedJobCode;
    setCreateError("");
    if (!code || !contact) { setCreateError("יש לבחור משרה לפני יצירת הגשה."); return; }
    const job = jobs.find((j) => j.job_code === code);
    if (!job) { setCreateError("לא נמצאה משרה פעילה מתאימה לבחירה."); return; }
    let duplicateQuery = supabase.from("applications").select("application_id", { count: "exact", head: true }).eq("job_code", code);
    duplicateQuery = contact.phone_norm
      ? duplicateQuery.or(`candidate_link.eq.${contact.contact_id},phone_norm.eq.${contact.phone_norm}`)
      : duplicateQuery.eq("candidate_link", contact.contact_id);
    const { count, error: duplicateError } = await duplicateQuery;
    if (duplicateError) { setCreateError(`בדיקת כפילות נכשלה: ${duplicateError.message}`); return; }
    if ((count ?? 0) > 0) { setCreateError("כבר קיימת הגשה עבור משרה זו למועמד/ת הזה/ו."); return; }
    const now = new Date().toISOString();
    const note = createAppNotes.trim() || null;
    const { error: err } = await supabase.from("applications").insert({
      job_code: code, candidate_link: contact.contact_id, phone_norm: contact.phone_norm,
      application_status: 1, submission_date: now, created_timestamp: now, updated_timestamp: now,
      candidate_name: contact.full_name ?? contact.display_name,
      candidate_email: contact.email ?? null, candidate_phone: contact.phone ?? null,
      account_name: job.account_name ?? null, account_link: job.account_link ?? null,
      job_role: dictName(dicts?.roles ?? [], job.job_role),
      job_city: dictName(dicts?.cities ?? [], job.city_id),
      job_region: dictName(dicts?.regions ?? [], job.region_id),
      job_city_id: job.city_id ?? null, candidate_notes: note || null,
      internal_notes: note ? `נוצר מתוך Contact 360. הערת אדמין: ${note}` : "נוצר מתוך Contact 360",
      has_cv: Boolean(contact.has_cv), cv_link: contact.cv_link ?? null, cv_storage_path: contact.cv_storage_path ?? null,
      source: 6, is_manual: true,
    });
    if (err) { showToast("error", `שגיאה ביצירת הגשה: ${err.message}`); return; }
    setSelectedJobCode(""); setJobSearch(""); setCreateAppNotes(""); setDialogOpen(false);
    showToast("success", `הגשה למשרה ${code} נוצרה`);
    queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] });
  }

  // ── create new contact ──
  if (isNew) {
    if (dictsOnlyLoading) {
      return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F8FAFC] font-['Heebo']">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      );
    }
    if (dictsOnlyError) {
      return (
        <div dir="rtl" className="min-h-screen bg-[#F8FAFC] p-6 font-['Heebo']">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900">טעינת המילונים נכשלה</h2>
            <p className="mt-2 max-w-xl text-sm text-red-700">
              {dictsOnlyError instanceof Error ? dictsOnlyError.message : "לא ניתן לטעון את מסך יצירת איש הקשר"}
            </p>
            <Link to="/admin/contacts" className="mt-6">
              <Button variant="outline" className="rounded-xl border-slate-200">חזרה לרשימת אנשי קשר</Button>
            </Link>
          </div>
        </div>
      );
    }
    const selectCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50";
    const roles = dictsOnly?.roles ?? [];
    const allCities = dictsOnly?.cities ?? [];
    const regions = dictsOnly?.regions ?? [];
    const genders = dictsOnly?.genders ?? [];
    const filteredCities = newForm.region_id
      ? allCities.filter((c) => Number(c.region_id) === Number(newForm.region_id))
      : allCities;
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] p-6 font-['Heebo']">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-6 text-2xl font-bold text-slate-800">איש קשר חדש</h1>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">שם פרטי</label>
                  <Input value={newForm.first_name} onChange={(e) => setField("first_name", e.target.value)} placeholder="שם פרטי" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">שם משפחה</label>
                  <Input value={newForm.last_name} onChange={(e) => setField("last_name", e.target.value)} placeholder="שם משפחה" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">נייד</label>
                <Input value={newForm.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="05X-XXXXXXX" type="tel" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">אימייל</label>
                <Input value={newForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="name@example.com" type="email" />
              </div>
              <RoleSubRolePicker
                variant="edit"
                roleId={newForm.role ? Number(newForm.role) : null}
                subRoleIds={newForm.sub_roles.map(Number)}
                onRoleChange={(id) => setNewForm((f) => ({ ...f, role: id ? String(id) : '', sub_roles: [] }))}
                onSubRoleChange={(ids) => setNewForm((f) => ({ ...f, sub_roles: ids.map(String) }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">אזור</label>
                  <select className={selectCls} value={newForm.region_id} onChange={(e) => setNewForm((f) => ({ ...f, region_id: e.target.value, city_id: "" }))}>
                    <option value="">— בחרי אזור —</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">עיר</label>
                  <select className={selectCls} value={newForm.city_id} disabled={!newForm.region_id} onChange={(e) => setField("city_id", e.target.value)}>
                    <option value="">{newForm.region_id ? "— בחרי עיר —" : "— בחרי אזור תחילה —"}</option>
                    {filteredCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">מגדר</label>
                <select className={selectCls} value={newForm.gender} onChange={(e) => setField("gender", e.target.value)}>
                  <option value="">— בחרי מגדר —</option>
                  {genders.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">פייסבוק</label>
                <Input value={newForm.facebook_url} onChange={(e) => setField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." type="url" />
              </div>
              {newError && <p className="text-sm text-red-600">{newError}</p>}
              <Button onClick={handleCreateContact} disabled={newSaving} className="w-full bg-teal-600 text-white hover:bg-[#006666]">
                {newSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                שמור איש קשר
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F8FAFC] font-['Heebo']">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    const notFound = isContactNotFoundError(error);
    const loadErrorMessage = (error as { message?: unknown }).message;
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] p-6 font-['Heebo']">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${notFound ? "bg-slate-100" : "bg-red-50"}`}>
            <AlertCircle className={`h-8 w-8 ${notFound ? "text-slate-400" : "text-red-500"}`} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {notFound ? "איש הקשר לא נמצא" : "שגיאה בטעינת איש הקשר"}
          </h2>
          <p className={`mt-2 max-w-xl text-sm ${notFound ? "text-slate-500" : "text-red-700"}`}>
            {notFound
              ? `לא נמצא איש קשר עם מזהה ${resolvedId}`
              : typeof loadErrorMessage === "string" ? loadErrorMessage : "לא ניתן לטעון את נתוני Contact 360"}
          </p>
          <Link to="/admin/contacts" className="mt-6">
            <Button variant="outline" className="rounded-xl border-slate-200">חזרה לרשימת אנשי קשר</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  // ─── render ───────────────────────────────────────────────────────────────

  const roleAccentColor = getRoleColorHex(contact.role);
  const hasOrgContext = Boolean(account || contact.linked_org_name || linkedJobs.length > 0);

  const tabs: Contact360TabDef[] = [
    { id: "person", label: "פרטי האדם", icon: <User2 className="h-4 w-4" /> },
    { id: "cv", label: "קו״ח ו-AI", icon: <FileText className="h-4 w-4" /> },
    { id: "applications", label: "הגשות והתאמות", icon: <Briefcase className="h-4 w-4" />, badge: applications.length },
    { id: "organization", label: "ארגון וקשרים", icon: <Building2 className="h-4 w-4" /> },
    { id: "crm", label: "CRM והיסטוריה", icon: <History className="h-4 w-4" />, badge: contactMessages?.length ?? null },
  ];

  return (
    <div dir="rtl" className="mx-auto min-h-screen max-w-[1600px] bg-[#F8FAFC] p-4 font-['Heebo'] sm:p-6">
      {/* ===== אזור קבוע מעל הטאבים ===== */}
      <div className="space-y-6">
      <div className="flex justify-start">
        <Link to="/admin/contacts">
          <Button variant="outline" className="rounded-xl border-slate-200 bg-white">
            חזרה לרשימת אנשי קשר
          </Button>
        </Link>
      </div>

      {/* ===== HERO + KPI ===== */}
      <Candidate360Hero
        contact={contact}
        dicts={dicts}
        profileTypeIds={profileTypeIds}
        completion={completion}
        recommendedJobsCount={allRecommendedJobs.length}
        applicationsCount={applications.length}
        activeApplicationsCount={activeApplications.length}
        resolvedId={resolvedId}
        onOpenCreateApp={() => setDialogOpen(true)}
        onUpdate={saveContactPatch}
        onCopyLink={async () => {
          if (!contact.profile_token) {
            showToast("error", "עדיין לא קיים קישור ציבורי למועמד/ת");
            return;
          }
          const link = `${window.location.origin}/profile/${encodeURIComponent(contact.profile_token)}`;
          try {
            await navigator.clipboard.writeText(link);
            showToast("success", "הלינק הועתק ללוח");
          } catch {
            showToast("error", "העתקת הקישור נכשלה");
          }
        }}
      />
      </div>

      {/* ===== סרגל טאבים פנימי ===== */}
      <Contact360Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* ═══════════ טאב 1 — פרטי האדם ═══════════ */}
      <Contact360TabPanel tabId="person" active={activeTab}>
        {/* ===== פרטים אישיים + מדיה חברתית ===== */}
        {dicts && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BlockIdentity contact={contact} dicts={dicts} onUpdate={saveContactPatch} />
            <BlockSocial contact={contact} dicts={dicts} onUpdate={saveContactPatch} />
          </div>
        )}

        {/* ===== מקצועיות + תנאים ===== */}
        {dicts && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BlockProfessional contact={contact} dicts={dicts} onUpdate={saveContactPatch} />
            <BlockConditions contact={contact} dicts={dicts} onUpdate={saveContactPatch} />
          </div>
        )}
      </Contact360TabPanel>

      {/* ═══════════ טאב 2 — קו״ח ו-AI ═══════════ */}
      <Contact360TabPanel tabId="cv" active={activeTab}>
        {dicts && <CvUploadCard contactId={resolvedId} contact={contact} dicts={dicts} />}
      </Contact360TabPanel>

      {/* ═══════════ טאב 3 — הגשות והתאמות ═══════════ */}
      <Contact360TabPanel tabId="applications" active={activeTab}>
      {/* ===== הגשות ומשרות ===== */}
      <section className="space-y-6">
        <SectionHeader icon="📋" title="הגשות ומשרות" subtitle="הגשות קיימות ומשרות מומלצות למועמד/ת" accentColor={roleAccentColor} />

        {/* Applications table */}
        <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">הגשות ({applications.length})</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 rounded-xl text-white" style={{ backgroundColor: BRAND.primary }}>
                    <Plus className="me-1.5 h-3.5 w-3.5" />
                    הגשה חדשה
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            <AdminTable<ApplicationRow>
              columns={applicationColumns}
              data={applications}
              keyField="application_id"
              emptyMessage="אין הגשות לאיש קשר זה"
              minWidth="900px"
            />
          </CardContent>
        </Card>

        {/* Recommended jobs */}
        {recommendedJobs.length > 0 && (
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">משרות מומלצות — 3 מובילות מתוך {allRecommendedJobs.length}</h2>
              <div className="grid gap-4 xl:grid-cols-3">
                {recommendedJobs.map((item) => (
                  <div key={item.job.job_code} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.job.job_title}</div>
                        {item.job.account_name && <div className="mt-0.5 text-[13px] text-slate-500">{item.job.account_name}</div>}
                        <div className="mt-0.5 text-[13px] text-slate-500">
                          {[dictName(dicts?.cities ?? [], item.job.city_id), dictName(dicts?.regions ?? [], item.job.region_id)]
                            .filter((t) => t && t !== "—").join(" · ")}
                        </div>
                      </div>
                      <Badge className={`h-[30px] rounded-full border px-3 text-sm shadow-none ${item.score >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : item.score >= 45 ? "border-amber-200 bg-amber-50 text-slate-600" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                        {item.score}%
                      </Badge>
                    </div>
                    <div className="mb-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                      <div className="mb-1 text-[13px] text-slate-500">למה זה מתאים</div>
                      <ul className="space-y-0.5 text-[13px] text-slate-900">{item.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
                    </div>
                    <Button size="sm" className="h-10 w-full rounded-xl text-white" style={{ backgroundColor: BRAND.primary }}
                      onClick={() => { setSelectedJobCode(item.job.job_code); setDialogOpen(true); }}>
                      <Plus className="me-1.5 h-3.5 w-3.5" />
                      יצירת הגשה
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
      </Contact360TabPanel>

      {/* ═══════════ טאב 4 — ארגון וקשרים ═══════════ */}
      <Contact360TabPanel tabId="organization" active={activeTab}>
        {/* ===== ארגון מקושר + משרות מגייס/מעסיק ===== */}
        {hasOrgContext ? (
          <BlockEmployer
            contact={contact}
            linkedJobs={linkedJobs}
            dicts={dicts}
            account={account}
          />
        ) : (
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <CardContent className="p-6">
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                text="לאיש קשר זה אין ארגון מקושר ואין משרות שבהן הוא מוגדר כמעסיק או כמגייס."
              />
            </CardContent>
          </Card>
        )}
      </Contact360TabPanel>

      {/* ═══════════ טאב 5 — CRM והיסטוריה ═══════════ */}
      <Contact360TabPanel tabId="crm" active={activeTab}>
      {/* ===== TAGS ===== */}
      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: BRAND.primary }} />
            <span className="text-sm font-bold text-slate-900">תגיות</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? tags.map((tag) => {
              const dictionaryName = tag.tag_id
                ? dicts?.candidateTags.find((candidateTag) => candidateTag.id === Number(tag.tag_id))?.name
                : null;
              return (
                <div key={tag.id} className="inline-flex min-h-[30px] items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 text-[13px] font-semibold text-slate-900">
                  {dictionaryName ?? tag.tag}
                  <button type="button" onClick={() => removeTag(tag.id)} className="text-slate-400 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }) : <span className="text-sm text-slate-400">אין תגיות עדיין</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <select
              value={selectedTagId}
              onChange={(event) => setSelectedTagId(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— בחירת תגית מהמילון —</option>
              {availableCandidateTags.map((candidateTag) => (
                <option key={candidateTag.id} value={candidateTag.id}>{candidateTag.name}</option>
              ))}
            </select>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200"
              onClick={addTag}
              disabled={!selectedTagId}
            >
              הוסף
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== CRM + מטאדאטה ===== */}
      {dicts && (
        <BlockCRM
          contact={contact}
          dicts={dicts}
          onUpdate={saveContactPatch}
        />
      )}

      {/* ===== הודעות מהמועמד + היסטוריית שינויים ===== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ContactMessagesPanel contactId={resolvedId} />
        <ContactHistoryPanel contactId={resolvedId} />
      </div>

      {/* ===== סיכום תפעולי ===== */}
      <section className="space-y-6">
        <SectionHeader icon="🧠" title="סיכום תפעולי" subtitle={aiSummary.isAi ? "סיכום AI מאושר, חוסרים ופעולה מומלצת" : "תקציר תפעולי מחושב, חוסרים ופעולה מומלצת"} accentColor={roleAccentColor} />
        <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
          <CardContent className="p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-3">
                {contact.personal_summary && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    <div className="mb-2 text-sm font-bold text-slate-800">פרופיל מקצועי</div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-900">{contact.personal_summary}</div>
                  </div>
                )}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-6 text-sm leading-7 text-slate-900">
                  <div className="mb-2 text-sm font-semibold text-slate-600">{aiSummary.isAi ? "סיכום AI" : "תקציר תפעולי מחושב"}</div>
                  {aiSummary.summary || "—"}
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="mb-2 text-sm font-bold text-slate-800">סיכונים מרכזיים</div>
                  {aiSummary.risks.length > 0 ? (
                    <ul className="space-y-1 text-sm text-slate-800">{aiSummary.risks.map((r) => <li key={r}>• {r}</li>)}</ul>
                  ) : (
                    <div className="text-sm text-slate-600">לא זוהו סיכונים מהותיים כרגע.</div>
                  )}
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] p-4" style={{ borderInlineStartColor: BRAND.primary, borderInlineStartWidth: 4, backgroundColor: "rgba(0,128,128,0.04)" }}>
                  <div className="mb-2 text-sm font-extrabold text-teal-900">פעולה מומלצת הבאה</div>
                  <div className="text-base font-bold leading-7 text-teal-900">{aiSummary.nextAction}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      </Contact360TabPanel>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 left-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#008080] text-lg text-white shadow-[0_1px_3px_rgba(0,0,0,.04)] transition hover:bg-[#006666]"
      >↑</button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[300] -translate-x-1/2">
          <div className={`flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-bold shadow-sm ${toast.type === "success" ? "bg-slate-900 text-white" : "bg-red-50 text-red-700"}`}>
            {toast.text}
          </div>
        </div>
      )}

      {/* ─── Create application dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl rounded-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-right">יצירת הגשה חדשה</DialogTitle>
            <DialogDescription className="text-right">
              בוחרים משרה, בודקים את הפרטים, מוסיפים הערה במידת הצורך ורק אז מאשרים יצירת הגשה.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-900">{contact.full_name || contact.display_name}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-[13px] text-slate-500">
                {contact.phone && <span>נייד: {contact.phone}</span>}
                {contact.email && <span>אימייל: {contact.email}</span>}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-900">חיפוש משרה</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} placeholder="קוד משרה, תפקיד, עיר או ארגון" className="h-11 rounded-xl border-slate-200 pr-9" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-900">בחירת משרה</label>
                  <select value={selectedJobCode} onChange={(e) => { setSelectedJobCode(e.target.value); setCreateError(""); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="">— בחר/י משרה —</option>
                    {availableJobs.map((job) => (
                      <option key={job.job_code} value={job.job_code}>
                        {job.job_code} · {dictName(dicts?.roles ?? [], job.job_role)} · {job.job_title || "ללא כותרת"} · {[dictName(dicts?.cities ?? [], job.city_id), dictName(dicts?.regions ?? [], job.region_id)].filter((t) => t !== "—").join(" / ")}
                      </option>
                    ))}
                  </select>
                </div>
                {recommendedJobs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[13px] text-slate-500">התאמות מהירות</div>
                    {recommendedJobs.map((item) => (
                      <button key={item.job.job_code} type="button" onClick={() => { setSelectedJobCode(item.job.job_code); setCreateError(""); }}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm font-bold text-slate-900 hover:bg-slate-50">
                        <span>{item.job.job_code} · {item.job.job_title}</span>
                        <span className="rounded-full bg-teal-50 px-2 py-1 text-[13px] text-teal-700">{item.score}%</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-extrabold text-slate-900">פרטי המשרה לפני אישור</div>
                {selectedJob ? (
                  <div className="divide-y divide-slate-100">
                    <LabelValue label="קוד משרה" value={<span className="font-mono">{selectedJob.job_code}</span>} />
                    <LabelValue label="כותרת" value={selectedJob.job_title || "—"} />
                    <LabelValue label="ארגון" value={selectedJob.account_name || "—"} />
                    <LabelValue label="תפקיד" value={dictName(dicts?.roles ?? [], selectedJob.job_role)} />
                    <LabelValue label="תת־תפקיד" value={dictNames(dicts?.subRoles ?? [], selectedJob.job_sub_role)} />
                    <LabelValue label="עיר / אזור" value={[dictName(dicts?.cities ?? [], selectedJob.city_id), dictName(dicts?.regions ?? [], selectedJob.region_id)].filter((t) => t !== "—").join(" · ") || "—"} />
                    <LabelValue label="היקף" value={dictNames(dicts?.scopes ?? [], selectedJob.scope)} />
                    <LabelValue label="ניסיון נדרש" value={dictName(dicts?.experience ?? [], selectedJob.required_experience)} />
                    <LabelValue label="שפות נדרשות" value={dictNames(dicts?.languages ?? [], selectedJob.required_languages)} />
                    <LabelValue label="מערכות" value={dictNames(dicts?.systems ?? [], selectedJob.systems_used)} />
                    <LabelValue label="סוגי שכר" value={dictNames(dicts?.salaryTypes ?? [], selectedJob.salary_type_ids)} />
                    <LabelValue label="ימים ושעות" value={selectedJob.work_schedule_text || "—"} />
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">בחרי משרה כדי לראות פרטים לפני יצירת ההגשה.</div>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">הערות להגשה</label>
              <Textarea value={createAppNotes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateAppNotes(e.target.value)}
                placeholder="הערה פנימית לפני יצירת ההגשה..." className="min-h-[88px] rounded-2xl border-slate-200 bg-slate-50 text-sm" />
            </div>
            {createError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{createError}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => { setSelectedJobCode(""); setJobSearch(""); setCreateAppNotes(""); setCreateError(""); }}>ניקוי</Button>
              <Button disabled={!selectedJobCode} className="h-10 rounded-xl text-white" style={{ backgroundColor: BRAND.primary }} onClick={() => createApplication()}>אישור יצירת הגשה</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
