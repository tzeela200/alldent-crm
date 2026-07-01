import type { DictItem } from "@/hooks/useContact360";
import { useContactMutations } from "@/hooks/useContactMutations";
import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Tag,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/lib/supabase";
import { useContact360, useContact360Dicts } from "@/hooks/useContact360";
import type { JobRow, LinkedJobRow } from "@/hooks/useContact360";
import { RoleSubRolePicker } from "@/components/ui/RoleSubRolePicker";
import { useQueryClient } from "@tanstack/react-query";

import BlockIdentity from "@/components/contact/BlockIdentity";
import BlockProfessional from "@/components/contact/BlockProfessional";
import BlockConditions from "@/components/contact/BlockConditions";
import BlockSocial from "@/components/contact/BlockSocial";
import { Candidate360Hero } from "@/components/contact/Candidate360Hero";
import { BlockCRM } from "@/components/contact/BlockCRM";
import { AdminStatusBar } from "@/components/contact/AdminStatusBar";
import { ContactEditDialog } from "@/components/contact/ContactEditDialog";
import { BlockEmployer } from "@/components/contact/BlockEmployer";

const BRAND = { primary: "#008080", pageBg: "#F3F4F6", cardBorder: "#E2E8F0" };

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

function isValidHttpUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function applicationBadgeClass(value?: number | string | null) {
  const n = Number(value ?? -1);
  if (n === 8 || n === 15) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if ([4, 5, 6, 7].includes(n)) return "border-blue-200 bg-blue-50 text-blue-700";
  if ([1, 2, 3].includes(n)) return "border-amber-200 bg-amber-50 text-slate-600";
  if ([9, 10, 11, 12, 13, 14].includes(n)) return "border-red-200 bg-red-50 text-red-700";
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

// ─── main component ───────────────────────────────────────────────────────────

export default function Candidate360Page() {
  const params = useParams<{ contactId?: string; id?: string }>();
  const rawId = params.contactId ?? params.id ?? "";
  const isNew = rawId === "new";
  const resolvedId = isNew ? 0 : Number(rawId);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateContact, insertContact } = useContactMutations();
  const { data, isLoading, error } = useContact360(resolvedId);
  const { data: dictsOnly } = useContact360Dicts();

  // ── create-new-contact form state ──
  const [newForm, setNewForm] = useState({
    first_name: "", last_name: "", phone: "", email: "",
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
  const [notes, setNotes] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [adminEditOpen, setAdminEditOpen] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (data?.contact?.notes !== undefined) {
      setNotes(data.contact.notes ?? "");
    }
  }, [data?.contact?.notes]);

  const contact = data?.contact ?? null;
  const applications = data?.applications ?? [];
  const tags = data?.tags ?? [];
  const account = data?.account ?? null;
  const jobs = data?.jobs ?? [];
  const linkedJobs: LinkedJobRow[] = data?.linkedJobs ?? [];
  const dicts = data?.dicts;

  const activeApplications = useMemo(
    () => applications.filter((app) => ![9, 10, 11, 12, 13, 14, 15].includes(Number(app.application_status))),
    [applications],
  );

  const availableJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return jobs
      .filter((job) => job.job_status === 3)
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

  const recommendedJobs = useMemo<Array<{ job: JobRow; score: number; reasons: string[] }>>(() => {
    if (!contact || !dicts) return [];
    const appliedCodes = new Set(applications.map((a) => String(a.job_code ?? "")));
    const preferredRegions = new Set<number>(contact.preferred_regions ?? []);
    const preferredCities = new Set<number>(contact.preferred_cities ?? []);
    return jobs
      .filter((job) => job.job_status === 3)
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
        return { job, score, reasons };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [contact, applications, jobs, dicts]);

  const aiSummary = useMemo(() => {
    if (!contact || !dicts) return { summary: "", risks: [], nextAction: "" };
    const parts = [
      contact.full_name || contact.display_name,
      dictName(dicts.roles, contact.role) !== "—" ? `מוגדר/ת כ-${dictName(dicts.roles, contact.role)}` : null,
      dictName(dicts.experience, contact.experience) !== "—" ? `עם ניסיון ${dictName(dicts.experience, contact.experience)}` : null,
      dictNames(dicts.availability, contact.candidate_availability_ids) !== "—" ? `וזמינות ${dictNames(dicts.availability, contact.candidate_availability_ids)}` : null,
      dictName(dicts.cities, contact.city_id) !== "—" ? `באזור ${dictName(dicts.cities, contact.city_id)}` : null,
    ].filter(Boolean);
    const risks: string[] = [];
    if (!contact.has_cv || !isValidHttpUrl(contact.cv_link)) risks.push("חסר קו״ח זמין");
    if (!contact.salary_expectation_hourly && !contact.salary_expectation_monthly) risks.push("חסרים נתוני שכר");
    if (!contact.role) risks.push("חסר מיפוי תפקיד");
    const nextAction = contact.next_follow_up
      ? `לבצע פולואפ בתאריך ${formatDate(contact.next_follow_up)}`
      : applications.length > 0 ? "לעדכן סטטוס להגשה האחרונה" : "ליצור הגשה ראשונה למשרה מתאימה";
    return { summary: contact.ai_profile_summary?.trim() || parts.join(" "), risks, nextAction };
  }, [contact, applications, dicts]);

  const completion = useMemo(() => {
    if (!contact) return 0;
    const fields = [
      contact.full_name, contact.phone, contact.phone_norm, contact.email,
      contact.role, contact.experience, contact.candidate_availability_ids, contact.region_id,
      contact.city_id, contact.has_cv, contact.cv_link, contact.professional_title,
      contact.current_employer, contact.preferred_scope, contact.check_status,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [contact]);

  // ── actions ──
  async function saveNotes() {
    if (!contact) return;
    setNotesSaving(true);
    const { error: err } = await updateContact(contact.contact_id, { notes, updated_timestamp: new Date().toISOString() });
    setNotesSaving(false);
    if (err) showToast("error", "שגיאה בשמירת הערות");
    else showToast("success", "הערות נשמרו");
  }

  async function addTag() {
    const value = newTag.trim();
    if (!value || !contact) return;
    if (tags.some((t) => t.tag === value)) { setNewTag(""); return; }
    const { error: err } = await supabase.from("contact_tags").insert({ contact_id: contact.contact_id, tag: value });
    if (err) showToast("error", "שגיאה בהוספת תגית");
    else { setNewTag(""); queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] }); }
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
      has_cv: Boolean(contact.has_cv), cv_link: contact.cv_link ?? null,
      source: 6, is_manual: true,
    });
    if (err) { showToast("error", `שגיאה ביצירת הגשה: ${err.message}`); return; }
    setSelectedJobCode(""); setJobSearch(""); setCreateAppNotes(""); setDialogOpen(false);
    showToast("success", `הגשה למשרה ${code} נוצרה`);
    queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] });
  }

  // ── create new contact ──
  if (isNew) {
    const selectCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50";
    const roles = dictsOnly?.roles ?? [];
    const allCities = dictsOnly?.cities ?? [];
    const regions = dictsOnly?.regions ?? [];
    const genders = dictsOnly?.genders ?? [];
    const filteredCities = newForm.region_id
      ? allCities.filter((c) => Number(c.region_id) === Number(newForm.region_id))
      : allCities;
    return (
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] p-6 font-['Heebo']">
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
              <Button onClick={handleCreateContact} disabled={newSaving} className="w-full bg-teal-600 text-white hover:bg-teal-700">
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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F3F4F6] font-['Heebo']">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] p-6 font-['Heebo']">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">איש הקשר לא נמצא</h2>
          <p className="mt-2 text-sm text-slate-500">לא נמצא איש קשר עם מזהה {resolvedId}</p>
          <Link to="/contacts" className="mt-6">
            <Button variant="outline" className="rounded-xl border-slate-200">חזרה לרשימת אנשי קשר</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────

  const roleAccentColor = (() => {
    const name = (dicts?.roles ?? []).find((r) => r.id === contact.role)?.name ?? "";
    const n = name.toLowerCase();
    if (n.includes("רופא")) return "#0cc0df";
    if (n.includes("שיננ")) return "#d10383";
    if (n.includes("סייע")) return "#774196";
    if (n.includes("מזכיר")) return "#ff751f";
    if (n.includes("ניהול") || n.includes("מנהל")) return "#076911";
    if (n.includes("טכנ")) return "#d4a800";
    if (n.includes("מומח")) return "#086df4";
    return BRAND.primary;
  })();

  return (
    <div dir="rtl" className="min-h-screen space-y-8 bg-[#F3F4F6] p-4 font-['Heebo'] sm:p-6">

      {/* ===== HERO + KPI ===== */}
      <Candidate360Hero
        contact={contact}
        dicts={dicts}
        completion={completion}
        recommendedJobsCount={recommendedJobs.length}
        applicationsCount={applications.length}
        activeApplicationsCount={activeApplications.length}
        resolvedId={resolvedId}
        onEdit={() => setAdminEditOpen(true)}
        onOpenCreateApp={() => setDialogOpen(true)}
        onUpdateCheckStatus={async (statusId) => {
          setStatusDropdownOpen(false);
          await updateContact(resolvedId, { check_status: statusId });
          showToast("success", "סטטוס עודכן");
        }}
        onCopyLink={async () => {
          const { data: tokenData } = await supabase.from("contact").select("profile_token").eq("contact_id", resolvedId).single();
          if (tokenData?.profile_token) {
            const link = `${window.location.origin}/profile/${tokenData.profile_token}`;
            await navigator.clipboard.writeText(link);
            showToast("success", "הלינק הועתק ללוח");
          }
        }}
        statusDropdownOpen={statusDropdownOpen}
        onToggleStatusDropdown={() => setStatusDropdownOpen((v) => !v)}
      />

      {/* ===== TAGS (near top) ===== */}
      <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: BRAND.primary }} />
            <span className="text-sm font-bold text-slate-900">תגיות</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? tags.map((tag) => (
              <div key={tag.id} className="inline-flex h-[28px] items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-slate-900">
                {tag.tag}
                <button type="button" onClick={() => removeTag(tag.id)} className="text-slate-400 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )) : <span className="text-sm text-slate-400">אין תגיות עדיין</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={newTag}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") addTag(); }}
              placeholder="תגית חדשה..."
              className="rounded-xl border-slate-200 bg-[#F3F4F6]"
            />
            <Button variant="outline" className="h-10 rounded-xl border-slate-200" onClick={addTag}>הוסף</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== פרטים אישיים + מדיה חברתית ===== */}
      {dicts && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BlockIdentity contact={contact} dicts={dicts} />
          <BlockSocial contact={contact} dicts={dicts} />
        </div>
      )}

      {/* ===== מקצועיות + תנאים ===== */}
      {dicts && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BlockProfessional contact={contact} dicts={dicts} />
          <BlockConditions contact={contact} dicts={dicts} />
        </div>
      )}

      {/* ===== סיכום תפעולי ===== */}
      <section className="space-y-6">
        <SectionHeader icon="🧠" title="סיכום תפעולי" subtitle="ניתוח AI, סיכונים ופעולה מומלצת" accentColor={roleAccentColor} />
        <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
          <CardContent className="p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-6 text-sm leading-7 text-slate-900">
                {aiSummary.summary || "—"}
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4">
                  <div className="mb-2 text-sm font-bold text-slate-800">סיכונים מרכזיים</div>
                  {aiSummary.risks.length > 0 ? (
                    <ul className="space-y-1 text-sm text-slate-800">{aiSummary.risks.map((r) => <li key={r}>• {r}</li>)}</ul>
                  ) : (
                    <div className="text-sm text-slate-600">לא זוהו סיכונים מהותיים כרגע.</div>
                  )}
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] p-4" style={{ borderInlineStartColor: BRAND.primary, borderInlineStartWidth: 4, backgroundColor: "rgba(0,128,128,0.04)" }}>
                  <div className="mb-2 text-sm font-extrabold text-teal-900">פעולה מומלצת הבאה</div>
                  <div className="text-base font-bold leading-7 text-teal-900">{aiSummary.nextAction}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===== הגשות ומשרות ===== */}
      <section className="space-y-6">
        <SectionHeader icon="📋" title="הגשות ומשרות" subtitle="הגשות קיימות ומשרות מומלצות למועמד/ת" accentColor={roleAccentColor} />

        {/* Applications table */}
        <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
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
            {applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">אין הגשות לאיש קשר זה</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-[52px] bg-[#F3F4F6] hover:bg-[#F3F4F6]">
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">קוד / תפקיד</TableHead>
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">מעסיק</TableHead>
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">סטטוס הגשה</TableHead>
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">תאריך הגשה</TableHead>
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">עדכון אחרון</TableHead>
                        <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">קו"ח</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.application_id} className="h-[60px] hover:bg-[#F3F4F6]">
                          <TableCell className="px-4 text-sm font-semibold text-slate-900">
                            <span className="me-1 font-mono text-xs text-slate-500">{app.job_code}</span>
                            {app.job_role || "—"}
                          </TableCell>
                          <TableCell className="px-4 text-sm text-slate-900">{app.account_name || "—"}</TableCell>
                          <TableCell className="px-4">
                            <Badge className={`h-[30px] rounded-full border px-3 text-xs shadow-none ${applicationBadgeClass(app.application_status)}`}>
                              {dictName(dicts?.applicationStatuses ?? [], app.application_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 text-sm text-slate-500">{formatDate(app.submission_date)}</TableCell>
                          <TableCell className="px-4 text-sm text-slate-500">{formatDate(app.updated_timestamp)}</TableCell>
                          <TableCell className="px-4 text-sm">
                            {app.has_cv && app.cv_link ? (
                              <a href={app.cv_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">צפייה</a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended jobs */}
        {recommendedJobs.length > 0 && (
          <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">משרות מומלצות ({recommendedJobs.length})</h2>
              <div className="grid gap-4 xl:grid-cols-3">
                {recommendedJobs.map((item) => (
                  <div key={item.job.job_code} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.job.job_title}</div>
                        {item.job.account_name && <div className="mt-0.5 text-xs text-slate-500">{item.job.account_name}</div>}
                        <div className="mt-0.5 text-xs text-slate-500">
                          {[dictName(dicts?.cities ?? [], item.job.city_id), dictName(dicts?.regions ?? [], item.job.region_id)]
                            .filter((t) => t && t !== "—").join(" · ")}
                        </div>
                      </div>
                      <Badge className={`h-[30px] rounded-full border px-3 text-xs shadow-none ${item.score >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : item.score >= 45 ? "border-amber-200 bg-amber-50 text-slate-600" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                        {item.score}%
                      </Badge>
                    </div>
                    <div className="mb-3 rounded-xl border border-slate-200 bg-[#F3F4F6] p-3">
                      <div className="mb-1 text-[12px] text-slate-500">למה זה מתאים</div>
                      <ul className="space-y-0.5 text-xs text-slate-900">{item.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
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

      {/* ===== ארגון מקושר + משרות מגייס/מעסיק ===== */}
      {(account || contact.linked_org_name || linkedJobs.length > 0) && (
        <BlockEmployer
          contact={contact}
          linkedJobs={linkedJobs}
          dicts={dicts}
          account={account}
        />
      )}

      {/* ===== CRM + מטאדאטה ===== */}
      {dicts && (
        <BlockCRM
          contact={contact}
          dicts={dicts}
          notes={notes}
          onNotesChange={setNotes}
          onSaveNotes={saveNotes}
          notesSaving={notesSaving}
        />
      )}

      {/* ===== אזור אדמין — סטטוסים ===== */}
      {dicts && (
        <AdminStatusBar
          contact={contact}
          dicts={dicts}
          onEdit={() => setAdminEditOpen(true)}
        />
      )}

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 left-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#008080] text-lg text-white shadow-[0_1px_3px_rgba(0,0,0,.04)] transition hover:bg-teal-700"
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
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
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
                        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">{item.score}%</span>
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

      {/* ─── Admin Edit Dialog ─── */}
      <ContactEditDialog
        open={adminEditOpen}
        onOpenChange={setAdminEditOpen}
        contact={contact}
        dicts={dicts}
        onSaved={async (patch) => {
          const { error: saveError } = await updateContact(resolvedId, patch);
          if (saveError) showToast("error", "שגיאה בשמירה");
          else {
            setAdminEditOpen(false);
            showToast("success", "הפרטים עודכנו בהצלחה");
          }
        }}
      />
    </div>
  );
}
