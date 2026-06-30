import type { DictItem } from "@/hooks/useContact360";
import { useContactMutations } from "@/hooks/useContactMutations";
import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Clock3,
  Facebook,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Sparkles,
  Tag,
  User2,
  X,
  Loader2,
  Link2,
  Pencil,
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
// Tabs removed — using stacked sections with sticky headers
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/lib/supabase";
import { useContact360, useContact360Dicts } from "@/hooks/useContact360";
import BlockIdentity from "@/components/contact/BlockIdentity";
import BlockProfessional from "@/components/contact/BlockProfessional";
import BlockConditions from "@/components/contact/BlockConditions";
import BlockSocial from "@/components/contact/BlockSocial";
import type { JobRow } from "@/hooks/useContact360";
import { RoleSubRolePicker } from "@/components/ui/RoleSubRolePicker";
import { useQueryClient } from "@tanstack/react-query";

const BRAND = { primary: "#008080", pageBg: "#F8FAFC", cardBorder: "#E2E8F0" };

const ROLE_COLORS = {
  specialists: "#086df4",
  dentists: "#0cc0df",
  hygienist: "#d10383",
  assistant: "#774196",
  secretary: "#ff751f",
  management: "#076911",
  technician: "#d4a800",
} as const;

function getRoleAccentColor(roleName?: string | null) {
  const normalized = String(roleName ?? "").toLowerCase();
  if (normalized.includes("רופא") || normalized.includes("dent")) return ROLE_COLORS.dentists;
  if (normalized.includes("שיננ") || normalized.includes("hygien")) return ROLE_COLORS.hygienist;
  if (normalized.includes("סייע") || normalized.includes("assist")) return ROLE_COLORS.assistant;
  if (normalized.includes("מזכיר") || normalized.includes("secret")) return ROLE_COLORS.secretary;
  if (normalized.includes("ניהול") || normalized.includes("מנהל") || normalized.includes("management")) return ROLE_COLORS.management;
  if (normalized.includes("טכנ") || normalized.includes("technician")) return ROLE_COLORS.technician;
  if (normalized.includes("מומח") || normalized.includes("special")) return ROLE_COLORS.specialists;
  return BRAND.primary;
}

type ToastState = { type: "success" | "error"; text: string } | null;

// ─── utils ───────────────────────────────────────────────────────────────────

function dictName(
  items: DictItem[],
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return items.find((item) => item.id === Number(value))?.name ?? String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.toLocaleDateString("he-IL")} · ${d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `₪${Number(value).toLocaleString("he-IL")}`;
}

function buildWhatsAppLink(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
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

function renderUnknownValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value))
    return value.length ? value.map(renderUnknownValue).join(", ") : "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function availabilityBadgeClass(value?: number | null) {
  if (value === 1) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === 2 || value === 3) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === 4) return "border-amber-200 bg-amber-50 text-slate-600";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function checkBadgeClass(value?: number | null) {
  if (value === 2) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === 1) return "border-amber-200 bg-amber-50 text-slate-600";
  if (value === 3) return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function applicationBadgeClass(value?: number | null) {
  if (value === 8 || value === 15) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === 4 || value === 5 || value === 6 || value === 7) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === 1 || value === 2 || value === 3) return "border-amber-200 bg-amber-50 text-slate-600";
  if ([9, 10, 11, 12, 13, 14].includes(value ?? -1)) return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function LabelValue({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className="text-end text-sm font-semibold text-slate-800">{value || "—"}</span>
    </div>
  );
}

function LabelValueMuted({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 leading-[1.6]">
      <span className="shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-end text-xs font-medium text-slate-400">{value || "—"}</span>
    </div>
  );
}

function KpiCard({
  value,
  label,
  icon,
  accentColor = BRAND.primary,
  onClick,
  children,
}: {
  value: React.ReactNode;
  label: string;
  icon: React.ReactNode;
  accentColor?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex h-24 flex-col justify-center rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,.04)] ${onClick ? "cursor-pointer" : ""}`}
      style={{ borderTopColor: accentColor, borderTopWidth: 3 }}
      onClick={onClick}
    >
      <div className="text-2xl font-extrabold text-slate-900">{value ?? "—"}</div>
      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      {children}
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
          <div className="mt-1 text-[13px] leading-[1.6] text-slate-400">{subtitle}</div>
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
      first_name: first,
      last_name: last,
      full_name,
      display_name: full_name,
      phone: newForm.phone.trim() || null,
      email: newForm.email.trim() || null,
      role: newForm.role ? Number(newForm.role) : null,
      sub_role: newForm.sub_roles.length > 0 ? newForm.sub_roles.map(Number) : null,
      city_id: newForm.city_id ? Number(newForm.city_id) : null,
      region_id: newForm.region_id ? Number(newForm.region_id) : null,
      gender: newForm.gender ? Number(newForm.gender) : null,
      facebook_url: newForm.facebook_url.trim() || null,
    });
    setNewSaving(false);
    if (err || !created) { setNewError("שמירת איש הקשר נכשלה. נסי שוב."); return; }
    navigate(`/admin/contacts/${created.contact_id}`, { replace: true });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJobCode, setSelectedJobCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [notes, setNotes] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<Record<string, unknown>>({});
  const [adminSaving, setAdminSaving] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  };

  React.useEffect(() => {
    if (data?.contact?.notes !== undefined) {
      setNotes(data.contact.notes ?? "");
    }
  }, [data?.contact?.notes]);

  useEffect(() => {
    if (data?.contact) setAdminForm(data.contact as unknown as Record<string, unknown>);
  }, [data?.contact]);

  const contact = data?.contact ?? null;
  const applications = data?.applications ?? [];
  const tags = data?.tags ?? [];
  const account = data?.account ?? null;
  const jobs = data?.jobs ?? [];
  const dicts = data?.dicts;

  const activeApplications = useMemo(
    () => applications.filter((app) => ![9, 10, 11, 12, 13, 14, 15].includes(Number(app.application_status))),
    [applications],
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
        const contactSubRoleNames = subRoleIds.map((id) => dictName(dicts.subRoles, id)).filter((n) => n !== "—");
        const contactSubRole = contactSubRoleNames[0] ?? "—";
        if (contactSubRole !== "—" && typeof job.job_sub_role === "string" && job.job_sub_role.includes(contactSubRole)) {
          score += 15; reasons.push("תת־תפקיד רלוונטי");
        }
        if (preferredRegions.has(Number(job.region_id)) || Number(job.region_id) === Number(contact.region_id)) {
          score += 15; reasons.push("אזור תואם");
        }
        if (preferredCities.has(Number(job.city_id)) || Number(job.city_id) === Number(contact.city_id)) {
          score += 10; reasons.push("עיר תואמת");
        }
        if (contact.preferred_scope && job.scope === contact.preferred_scope) { score += 10; reasons.push("היקף מתאים"); }
        if (typeof contact.experience === "number" && typeof job.required_experience === "number" && contact.experience >= job.required_experience) {
          score += 5; reasons.push("ניסיון מתאים");
        }
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
      dictName(dicts.availability, contact.availability) !== "—" ? `וזמינות ${dictName(dicts.availability, contact.availability)}` : null,
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
      contact.role, contact.experience, contact.availability, contact.region_id,
      contact.city_id, contact.has_cv, contact.cv_link, contact.professional_title,
      contact.current_employer, contact.preferred_scope, contact.check_status,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [contact]);

  const canOpenCv = Boolean(contact?.has_cv && isValidHttpUrl(contact?.cv_link));
  const roleText = contact
    ? contact.professional_title ||
      [dictName(dicts?.roles ?? [], contact.role), ...(Array.isArray(contact.sub_role) ? contact.sub_role : contact.sub_role != null ? [contact.sub_role] : []).map((id) => dictName(dicts?.subRoles ?? [], id))]
        .filter((t) => t && t !== "—").join(" · ")
    : "";
  const roleAccentColor = getRoleAccentColor(dictName(dicts?.roles ?? [], contact?.role));

  // ─── actions ──────────────────────────────────────────────────────────────

  async function saveNotes() {
    if (!contact) return;
    setNotesSaving(true);
    const { error: err } = await updateContact(contact.contact_id, { notes, updated_timestamp: new Date().toISOString() });
    setNotesSaving(false);
    if (err) showToast("error", "שגיאה בשמירת הערות");
    else {
      showToast("success", "הערות נשמרו");
    }
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

  async function createApplication(jobCode?: string) {
    const code = jobCode ?? selectedJobCode;
    setCreateError("");
    if (!code || !contact) { setCreateError("יש לבחור משרה לפני יצירת הגשה."); return; }
    const { count } = await supabase
      .from("applications").select("*", { count: "exact", head: true })
      .eq("job_code", code).eq("phone_norm", contact.phone_norm);
    if ((count ?? 0) > 0) { setCreateError("כבר קיימת הגשה עבור משרה זו למועמד/ת הזה/ו."); return; }
    const job = jobs.find((j) => j.job_code === code);
    if (!job) { setCreateError("לא נמצאה משרה."); return; }
    const now = new Date().toISOString();
    const { error: err } = await supabase.from("applications").insert({
      job_code: job.job_code, candidate_link: contact.contact_id,
      phone_norm: contact.phone_norm, application_status: 1,
      submission_date: now, created_timestamp: now, updated_timestamp: now,
      candidate_name: contact.full_name ?? contact.display_name,
      account_name: job.account_name ?? null,
      internal_notes: "נוצר מתוך Contact 360",
    });
    if (err) { showToast("error", `שגיאה ביצירת הגשה: ${err.message}`); return; }
    setSelectedJobCode(""); setDialogOpen(false);
    showToast("success", `הגשה למשרה ${code} נוצרה`);
    queryClient.invalidateQueries({ queryKey: ["contact360", resolvedId] });
  }

  // ─── create new contact ───────────────────────────────────────────────────

  if (isNew) {
    const selectCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50";
    const roles = dictsOnly?.roles ?? [];
    const allSubRoles = dictsOnly?.subRoles ?? [];
    const allCities = dictsOnly?.cities ?? [];
    const regions = dictsOnly?.regions ?? [];
    const genders = dictsOnly?.genders ?? [];
    const filteredSubRoles = newForm.role
      ? allSubRoles.filter((r) => r.role_id === Number(newForm.role))
      : [];
    const filteredCities = newForm.region_id
      ? allCities.filter((c) => c.region_id === Number(newForm.region_id))
      : allCities;
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] p-6 font-['Heebo']">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-6 text-2xl font-bold text-slate-800">איש קשר חדש</h1>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* שם פרטי + שם משפחה */}
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
              {/* נייד */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">נייד</label>
                <Input value={newForm.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="05X-XXXXXXX" type="tel" />
              </div>
              {/* אימייל */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">אימייל</label>
                <Input value={newForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="name@example.com" type="email" />
              </div>
              {/* תפקיד + תת-תפקיד */}
              <RoleSubRolePicker
                variant="edit"
                roleId={newForm.role ? Number(newForm.role) : null}
                subRoleIds={newForm.sub_roles.map(Number)}
                onRoleChange={(id) => setNewForm((f) => ({ ...f, role: id ? String(id) : '', sub_roles: [] }))}
                onSubRoleChange={(ids) => setNewForm((f) => ({ ...f, sub_roles: ids.map(String) }))}
              />
              {/* אזור + עיר — עיר מסוננת לפי אזור */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">אזור</label>
                  <select
                    className={selectCls}
                    value={newForm.region_id}
                    onChange={(e) => {
                      setNewForm((f) => ({ ...f, region_id: e.target.value, city_id: "" }));
                    }}
                  >
                    <option value="">— בחרי אזור —</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">עיר</label>
                  <select
                    className={selectCls}
                    value={newForm.city_id}
                    disabled={!newForm.region_id}
                    onChange={(e) => setField("city_id", e.target.value)}
                  >
                    <option value="">{newForm.region_id ? "— בחרי עיר —" : "— בחרי אזור תחילה —"}</option>
                    {filteredCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {/* מגדר */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">מגדר</label>
                <select className={selectCls} value={newForm.gender} onChange={(e) => setField("gender", e.target.value)}>
                  <option value="">— בחרי מגדר —</option>
                  {genders.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              {/* פייסבוק */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">פייסבוק</label>
                <Input value={newForm.facebook_url} onChange={(e) => setField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." type="url" />
              </div>
              {newError && <p className="text-sm text-red-600">{newError}</p>}
              <Button onClick={handleCreateContact} disabled={newSaving} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                {newSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                שמור איש קשר
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── loading / error ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F8FAFC] font-['Heebo']">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] p-6 font-['Heebo']">
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

  return (
    <div dir="rtl" className="min-h-screen space-y-8 bg-[#F8FAFC] p-4 font-['Heebo'] sm:p-6">

      {/* ===== HERO ===== */}
      <Card className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <div className="h-1.5 w-full" style={{ backgroundColor: roleAccentColor }} />
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex gap-6">
              <div
                className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[20px] text-3xl font-extrabold"
                style={{ backgroundColor: `${roleAccentColor}18`, color: roleAccentColor }}
              >
                {(contact.full_name || contact.display_name || "?").charAt(0)}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div className="space-y-2">
                  <h1 className="text-[32px] font-extrabold leading-tight text-slate-900">
                    {contact.full_name || contact.display_name || "—"}
                  </h1>
                  <div className="h-1 w-16 rounded-full" style={{ backgroundColor: roleAccentColor }} />
                  {roleText && (
                    <div className="text-[17px] font-medium text-slate-600">{roleText}</div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] pt-4">
                  <Badge className="h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none" style={{ borderColor: `${roleAccentColor}33`, backgroundColor: `${roleAccentColor}12`, color: roleAccentColor }}>
                    {dictName(dicts?.roles ?? [], contact.role)}
                  </Badge>
                  <Badge className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${availabilityBadgeClass(contact.availability)}`}>
                    {dictName(dicts?.availability ?? [], contact.availability)}
                  </Badge>
                  <Badge className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${checkBadgeClass(contact.check_status)}`}>
                    {dictName(dicts?.checkStatuses ?? [], contact.check_status)}
                  </Badge>
                  <Badge
                    className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${canOpenCv ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
                  >
                    {canOpenCv ? "קו״ח זמין" : "ללא קו״ח"}
                  </Badge>
                  {contact.profile_type && (
                    <Badge variant="outline" className="h-[30px] rounded-full border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold">
                      {dictName(dicts?.profileTypes ?? [], contact.profile_type)}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4 border-t border-[#E2E8F0] pt-4 xl:grid-cols-[1fr_260px] xl:items-center">
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-teal-600">
                        <Phone size={14} style={{ color: BRAND.primary }} />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-teal-600">
                        <Mail size={14} style={{ color: BRAND.primary }} />
                        {contact.email}
                      </a>
                    )}
                    {contact.facebook_url && (
                      <a href={contact.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-teal-600">
                        <Facebook size={14} style={{ color: BRAND.primary }} />
                        פייסבוק
                      </a>
                    )}
                    {(contact.city_id || contact.region_id) && (
                      <span className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} style={{ color: BRAND.primary }} />
                        {[dictName(dicts?.cities ?? [], contact.city_id), dictName(dicts?.regions ?? [], contact.region_id)]
                          .filter((v) => v !== "—").join(" · ")}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm font-bold text-slate-900">
                      <span>{completion}% שלמות פרופיל</span>
                      <Sparkles className="h-4 w-4" style={{ color: BRAND.primary }} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className="h-full rounded-full" style={{ width: `${completion}%`, backgroundColor: BRAND.primary }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4" onClick={() => setAdminEditOpen(true)}>
                <Pencil className="me-2 h-4 w-4" />
                עריכת פרטים
              </Button>

              {contact.phone && (
                <a href={buildWhatsAppLink(contact.phone)} target="_blank" rel="noreferrer">
                  <Button className="h-10 rounded-xl bg-green-500 px-4 text-white hover:bg-green-600">
                    <MessageCircle className="me-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}

              {canOpenCv ? (
                <a href={contact.cv_link ?? undefined} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-800 hover:bg-[#F8FAFC]">
                    <FileText className="me-2 h-4 w-4" />
                    קו״ח
                  </Button>
                </a>
              ) : null}

              <a href={`/profile/${contact.profile_token ?? resolvedId}`} target="_blank" rel="noreferrer">
                <Button className="h-10 rounded-xl px-4 text-white hover:opacity-90" style={{ backgroundColor: BRAND.primary }}>
                  <User2 className="me-2 h-4 w-4" />
                  פתח פרופיל
                </Button>
              </a>

              <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-800 hover:bg-[#F8FAFC]" onClick={async () => {
                const { data: tokenData } = await supabase.from("contact").select("profile_token").eq("contact_id", resolvedId).single();
                if (tokenData?.profile_token) {
                  const link = `${window.location.origin}/profile/${tokenData.profile_token}`;
                  await navigator.clipboard.writeText(link);
                  showToast("success", "הלינק הועתק ללוח");
                }
              }}>
                <Link2 className="me-2 h-4 w-4" />
                שלח לינק למועמד
              </Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent dir="rtl" className="max-w-xl rounded-2xl border border-slate-200">
                  <DialogHeader>
                    <DialogTitle className="text-right">יצירת הגשה חדשה</DialogTitle>
                    <DialogDescription className="text-right">
                      בחירת משרה פעילה + בדיקת כפילות לפי job_code + phone_norm
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">{contact.full_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{contact.phone} · {contact.phone_norm}</div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-900">בחירת משרה</label>
                      <select
                        value={selectedJobCode}
                        onChange={(e) => { setSelectedJobCode(e.target.value); setCreateError(""); }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">— בחר/י משרה —</option>
                        {jobs.filter((j) => j.job_status === 3).map((job) => (
                          <option key={job.job_code} value={job.job_code}>
                            {job.job_code} · {job.job_title}{job.account_name ? ` · ${job.account_name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {createError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{createError}</div>
                    )}
                    {recommendedJobs.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[13px] text-slate-500">התאמות מהירות</div>
                        {recommendedJobs.map((item) => (
                          <button
                            key={item.job.job_code} type="button"
                            onClick={() => createApplication(item.job.job_code)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm font-bold text-slate-900 hover:bg-slate-50"
                          >
                            <span>{item.job.job_title} · {item.job.job_code}</span>
                            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">{item.score}%</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => { setSelectedJobCode(""); setCreateError(""); }}>ניקוי</Button>
                      <Button className="h-10 rounded-xl text-white" style={{ backgroundColor: BRAND.primary }} onClick={() => createApplication()}>יצירת הגשה</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== KPI STRIP ===== */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          value={applications.length}
          label="סה״כ הגשות"
          icon={<FileText className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={activeApplications.length}
          label="הגשות פעילות"
          icon={<Briefcase className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={<span className="text-lg">{formatDate(contact.last_contact_date)}</span>}
          label="קשר אחרון"
          icon={<Clock3 className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={<span className="text-sm">{dictName(dicts?.checkStatuses ?? [], contact.check_status)}</span>}
          label="סטטוס בדיקה ▾"
          icon={<User2 className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
          onClick={() => setStatusDropdownOpen(v => !v)}
        >
          {statusDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-[#E2E8F0] bg-white text-right shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              {(dicts?.checkStatuses ?? []).map(s => (
                <button key={s.id} className="block w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-[#F8FAFC]" onClick={async (e) => {
                  e.stopPropagation();
                  setStatusDropdownOpen(false);
                  await updateContact(resolvedId, { check_status: s.id });
                  showToast("success", "סטטוס עודכן");
                }}>{s.name}</button>
              ))}
            </div>
          )}
        </KpiCard>
        <KpiCard
          value={<span className="text-sm">{dictName(dicts?.availability ?? [], contact.availability)}</span>}
          label="זמינות"
          icon={<User2 className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
      </div>

      {/* ===== SECTION 1 — פרטים ויצירת קשר ===== */}
      <section className="mb-8 space-y-6">
        <SectionHeader icon="👤" title="פרטים ויצירת קשר" subtitle="סיכום מועמד, הגשות ומשרות רלוונטיות" accentColor={roleAccentColor} />

          {/* AI Summary */}
          <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-bold text-slate-900">סיכום תפעולי</h3>
              <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-6 text-sm leading-7 text-slate-900">
                  {aiSummary.summary || "—"}
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
                  <div className="rounded-2xl border border-[#E2E8F0] bg-teal-50/40 p-4" style={{ borderInlineStartColor: BRAND.primary, borderInlineStartWidth: 4 }}>
                    <div className="mb-2 text-sm font-extrabold text-teal-900">פעולה מומלצת הבאה</div>
                    <div className="text-base font-bold leading-7 text-teal-900">{aiSummary.nextAction}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications */}
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
                        <TableRow className="h-[52px] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">קוד / תפקיד</TableHead>
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">ארגון</TableHead>
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">סטטוס</TableHead>
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">תאריך</TableHead>
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">אזור</TableHead>
                          <TableHead className="px-4 text-right text-xs font-semibold text-slate-500">קו"ח</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.application_id} className="h-[60px] hover:bg-[#F8FAFC]">
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
                            <TableCell className="px-4 text-sm text-slate-500">
                              {[app.job_region, app.job_city].filter(Boolean).join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="px-4 text-sm">
                              {app.has_cv && app.cv_link ? (
                                <a
                                  href={app.cv_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  צפייה
                                </a>
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

          {/* Recommended Jobs */}
          {recommendedJobs.length > 0 && (
            <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  משרות מומלצות ({recommendedJobs.length})
                </h2>
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
                      <div className="mb-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                        <div className="mb-1 text-[12px] text-slate-500">למה זה מתאים</div>
                        <ul className="space-y-0.5 text-xs text-slate-900">{item.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
                      </div>
                      <Button size="sm" className="h-10 w-full rounded-xl text-white" style={{ backgroundColor: BRAND.primary }} onClick={() => createApplication(item.job.job_code)}>
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

      {/* ===== SECTION 2 — זהות ומקצועיות ===== */}
      <section className="mb-8 space-y-6">
        <SectionHeader icon="🧭" title="זהות ומקצועיות" subtitle="מידע מקצועי, ניסיון ופרטי רקע" accentColor={roleAccentColor} />
        {dicts && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BlockIdentity contact={contact} dicts={dicts} />
            <BlockProfessional contact={contact} dicts={dicts} />
          </div>
        )}
      </section>

      {/* ===== SECTION 2b — תנאים ומדיה ===== */}
      <section className="mb-8 space-y-6">
        <SectionHeader icon="⚙️" title="תנאים והעדפות" subtitle="זמינות, תנאים, העדפות ומדיה" accentColor={roleAccentColor} />
        {dicts && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BlockConditions contact={contact} dicts={dicts} />
            <BlockSocial contact={contact} />
          </div>
        )}
      </section>

      {/* ===== SECTION 3 — CRM ותפעול ===== */}
      <section className="mb-8 space-y-6">
        <SectionHeader icon="🗂️" title="CRM ותפעול" subtitle="כלי עבודה למעקב, תגיות ונתונים טכניים" accentColor={roleAccentColor} />
          <div className="space-y-5">
              {/* Org */}
              {(account || contact.linked_org_name) && (
                <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">ארגון מקושר</h3>
                    {account ? (
                      <Link to={`/accounts/${account.account_id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:bg-[#F8FAFC]">
                        <div>
                          <div className="font-semibold text-slate-900">{account.account_name}</div>
                          {account.phone && <div className="mt-0.5 text-xs text-slate-500">{account.phone}</div>}
                        </div>
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </Link>
                    ) : (
                      <div className="px-4 text-sm text-slate-500">{contact.linked_org_name}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* CRM */}
              <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">CRM</h3>
                  <div className="divide-y divide-slate-100">
                    <LabelValue label="מקור" value={dictName(dicts?.sources ?? [], contact.source)} />
                    <LabelValue label="בדיקת תוכן" value={
                      <Badge className={`h-[30px] rounded-full border px-3 text-xs shadow-none ${checkBadgeClass(contact.check_status)}`}>
                        {dictName(dicts?.checkStatuses ?? [], contact.check_status)}
                      </Badge>
                    } />
                    <LabelValue label="מצב משפחתי" value={dictName(dicts?.socialStatuses ?? [], contact.social_status)} />
                    <LabelValue label="קשר אחרון" value={formatDateTime(contact.last_contact_date)} />
                    <LabelValue label="פולואפ הבא" value={formatDateTime(contact.next_follow_up)} />
                    <LabelValue label="וואטסאפ אחרון" value={formatDateTime(contact.whatsapp_campaign_last_sent)} />
                    <LabelValue label="הגשות קודמות" value={contact.prev_applications_count ?? 0} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-[13px] font-medium text-slate-500">הערות</div>
                    <Textarea
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      className="min-h-[100px] rounded-2xl border-slate-200 bg-[#F8FAFC] text-sm"
                      placeholder="הוסף/י הערה חופשית..."
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" className="h-10 rounded-xl text-white" style={{ backgroundColor: BRAND.primary }} onClick={saveNotes} disabled={notesSaving}>
                        <Save className="me-1.5 h-3.5 w-3.5" />
                        {notesSaving ? "שומר..." : "שמור הערות"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">
                    <Tag className="me-2 inline h-4 w-4" />
                    תגיות
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? tags.map((tag) => (
                      <div key={tag.id} className="inline-flex h-[30px] items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-slate-900">
                        {tag.tag}
                        <button type="button" onClick={() => removeTag(tag.id)} className="text-slate-400 hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )) : <div className="px-4 text-sm text-slate-500">אין תגיות עדיין</div>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") addTag(); }}
                      placeholder="תגית חדשה..."
                      className="rounded-xl border-slate-200 bg-[#F8FAFC]"
                    />
                    <Button variant="outline" className="h-10 rounded-xl border-slate-200" onClick={addTag}>הוסף</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-xs font-bold text-slate-400">מטאדאטה</h3>
                  <div className="divide-y divide-slate-100 text-xs leading-[1.6] text-slate-400">
                    <LabelValueMuted label="contact_id" value={<span className="font-mono text-xs">{contact.contact_id}</span>} />
                    <LabelValueMuted label="phone_norm" value={<span className="font-mono text-xs">{contact.phone_norm}</span>} />
                    <LabelValueMuted label="סוג פרופיל" value={dictName(dicts?.profileTypes ?? [], contact.profile_type)} />
                    <LabelValueMuted label="dup_email_flag" value={contact.dup_email_flag ? "כן" : "לא"} />
                    <LabelValueMuted label="נוצר" value={formatDateTime(contact.created_timestamp)} />
                    <LabelValueMuted label="עודכן" value={formatDateTime(contact.updated_timestamp)} />
                  </div>
                </CardContent>
              </Card>
          </div>
      </section>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 left-6 z-50 bg-[#008080] text-white rounded-full w-10 h-10 shadow-[0_1px_3px_rgba(0,0,0,.04)] text-lg hover:bg-teal-700 transition"
      >↑</button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[300] -translate-x-1/2">
          <div className={`flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-bold shadow-sm ${toast.type === "success" ? "bg-slate-900 text-white" : "bg-red-50 text-red-700"}`}>
            {toast.text}
          </div>
        </div>
      )}

      {/* ─── Admin Edit Dialog ─── */}
      <Dialog open={adminEditOpen} onOpenChange={setAdminEditOpen}>
        <DialogContent dir="rtl" className="max-w-2xl rounded-2xl border border-slate-200 max-h-[85vh] overflow-y-auto font-['Heebo']">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold">✏️ עריכת פרטי איש קשר</DialogTitle>
            <DialogDescription className="text-right text-xs text-slate-400">כל השדות כולל שדות מערכת פנימיים</DialogDescription>
          </DialogHeader>
          {(() => {
            const selectCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500";
            const af = (field: string) => (adminForm[field] as string) ?? "";
            const setAf = (field: string, val: unknown) => setAdminForm(prev => ({ ...prev, [field]: val }));
            const sectionTitle = (title: string, red = false) => (
              <h3 className={`text-sm font-bold mb-3 border-b pb-1 ${red ? "text-red-600 border-red-100" : "text-teal-700 border-teal-100"}`}>{title}</h3>
            );
            const filteredCities = dicts?.cities.filter(c =>
              !adminForm.region_id || c.region_id === Number(adminForm.region_id)
            ) ?? [];

            return (
              <div className="space-y-6 py-2">
                {/* פרטים אישיים */}
                <div>
                  {sectionTitle("פרטים אישיים")}
                  <div className="grid grid-cols-2 gap-3">
                    {[["first_name","שם פרטי","rtl"],["last_name","שם משפחה","rtl"],["phone","טלפון ראשי","ltr"],["second_phone","טלפון נוסף","ltr"],["email","אימייל","ltr"],["second_email","אימייל נוסף","ltr"]].map(([f,l,d]) => (
                      <div key={f} className="space-y-1">
                        <label className="text-xs text-slate-500">{l}</label>
                        <Input dir={d as "rtl"|"ltr"} value={af(f)} onChange={e => setAf(f, e.target.value)} className="rounded-xl" />
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">אזור</label>
                      <select className={selectCls} value={af("region_id")} onChange={e => { setAf("region_id", e.target.value ? Number(e.target.value) : null); setAf("city_id", null); }}>
                        <option value="">— בחר אזור —</option>
                        {dicts?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">עיר</label>
                      <select className={selectCls} value={af("city_id")} onChange={e => setAf("city_id", e.target.value ? Number(e.target.value) : null)} disabled={!adminForm.region_id}>
                        <option value="">{adminForm.region_id ? "— בחר עיר —" : "— בחר אזור תחילה —"}</option>
                        {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">מגדר</label>
                      <select className={selectCls} value={af("gender")} onChange={e => setAf("gender", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.genders.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">שנת לידה</label>
                      <Input type="number" dir="ltr" value={af("birth_year")} onChange={e => setAf("birth_year", e.target.value ? Number(e.target.value) : null)} className="rounded-xl" />
                    </div>
                  </div>
                </div>

                {/* תפקיד מקצועי */}
                <div>
                  {sectionTitle("תפקיד מקצועי")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">תפקיד</label>
                      <select className={selectCls} value={af("role")} onChange={e => setAf("role", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר תפקיד —</option>
                        {dicts?.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">ניסיון</label>
                      <select className={selectCls} value={af("experience")} onChange={e => setAf("experience", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.experience.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">כותרת מקצועית</label>
                      <Input dir="rtl" value={af("professional_title")} onChange={e => setAf("professional_title", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">מספר רישיון</label>
                      <Input dir="ltr" value={af("license_no")} onChange={e => setAf("license_no", e.target.value)} className="rounded-xl" />
                    </div>
                  </div>
                  {/* תת-תפקיד — checkboxes מסוננים לפי role */}
                  {!!adminForm.role && (
                    <div className="mt-3 space-y-1">
                      <label className="text-xs text-slate-500">תת-תפקיד (בחירה מרובה)</label>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-40 overflow-y-auto space-y-1">
                        {(dicts?.subRoles ?? []).filter(r => r.role_id === Number(adminForm.role)).map(r => (
                          <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                            <input type="checkbox" className="accent-teal-600"
                              checked={Array.isArray(adminForm.sub_role) && (adminForm.sub_role as number[]).includes(r.id)}
                              onChange={e => {
                                const cur = Array.isArray(adminForm.sub_role) ? (adminForm.sub_role as number[]) : [];
                                setAf("sub_role", e.target.checked ? [...cur, r.id] : cur.filter(id => id !== r.id));
                              }} />
                            {r.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* תנאים */}
                <div>
                  {sectionTitle("תנאים והעדפות")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">ניידות</label>
                      <select className={selectCls} value={af("mobility_id")} onChange={e => setAf("mobility_id", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.mobility.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">מיסוי</label>
                      <select className={selectCls} value={af("tax_type_id")} onChange={e => setAf("tax_type_id", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.taxTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="text-xs text-slate-500">אזורים מועדפים (בחירה מרובה)</label>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-36 overflow-y-auto space-y-1">
                      {(dicts?.regions ?? []).map(r => (
                        <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                          <input type="checkbox" className="accent-teal-600"
                            checked={Array.isArray(adminForm.preferred_regions) && (adminForm.preferred_regions as number[]).includes(r.id)}
                            onChange={e => {
                              const cur = Array.isArray(adminForm.preferred_regions) ? (adminForm.preferred_regions as number[]) : [];
                              setAf("preferred_regions", e.target.checked ? [...cur, r.id] : cur.filter(id => id !== r.id));
                            }} />
                          {r.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* מדיה חברתית */}
                <div>
                  {sectionTitle("מדיה חברתית")}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">פייסבוק URL</label>
                      <Input dir="ltr" value={af("facebook_url")} onChange={e => setAf("facebook_url", e.target.value)} className="rounded-xl" placeholder="https://facebook.com/..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">אינסטגרם URL</label>
                      <Input dir="ltr"
                        value={((adminForm.extended_data ?? {}) as Record<string,string>).instagram_url ?? ""}
                        onChange={e => setAf("extended_data", { ...((adminForm.extended_data ?? {}) as Record<string,string>), instagram_url: e.target.value || undefined })}
                        className="rounded-xl" placeholder="https://instagram.com/..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">לינקדאין URL</label>
                      <Input dir="ltr"
                        value={((adminForm.extended_data ?? {}) as Record<string,string>).linkedin_url ?? ""}
                        onChange={e => setAf("extended_data", { ...((adminForm.extended_data ?? {}) as Record<string,string>), linkedin_url: e.target.value || undefined })}
                        className="rounded-xl" placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>
                </div>

                {/* אדמין בלבד */}
                <div>
                  {sectionTitle("🔒 סטטוסים — אדמין בלבד", true)}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">סטטוס בדיקה</label>
                      <select className={selectCls} value={af("check_status")} onChange={e => setAf("check_status", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.checkStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">סטטוס חברתי</label>
                      <select className={selectCls} value={af("social_status")} onChange={e => setAf("social_status", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.socialStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">מקור</label>
                      <select className={selectCls} value={af("source")} onChange={e => setAf("source", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">סוג פרופיל</label>
                      <select className={selectCls} value={af("profile_type")} onChange={e => setAf("profile_type", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.profileTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CRM */}
                <div>
                  {sectionTitle("CRM")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">פולואפ הבא</label>
                      <Input type="date" dir="ltr" value={af("next_follow_up")?.toString().slice(0,10) ?? ""} onChange={e => setAf("next_follow_up", e.target.value || null)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">קשר אחרון</label>
                      <Input type="date" dir="ltr" value={af("last_contact_date")?.toString().slice(0,10) ?? ""} onChange={e => setAf("last_contact_date", e.target.value || null)} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">הערות פנימיות</label>
                      <Textarea dir="rtl" rows={3} value={af("notes")} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAf("notes", e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                    </div>
                  </div>
                </div>

                {/* פרופיל ציבורי */}
                <div>
                  {sectionTitle("פרופיל ציבורי")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">זמינות</label>
                      <select className={selectCls} value={af("availability")} onChange={e => setAf("availability", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— בחר —</option>
                        {dicts?.availability.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">היקף משרה</label>
                      <Input dir="rtl" value={af("preferred_scope")} onChange={e => setAf("preferred_scope", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">שכר חודשי</label>
                      <Input type="number" dir="ltr" value={af("salary_expectation_monthly")} onChange={e => setAf("salary_expectation_monthly", e.target.value ? Number(e.target.value) : null)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">שכר שעתי</label>
                      <Input type="number" dir="ltr" value={af("salary_expectation_hourly")} onChange={e => setAf("salary_expectation_hourly", e.target.value ? Number(e.target.value) : null)} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">שפות</label>
                      <Input dir="rtl" value={af("languages")} onChange={e => setAf("languages", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">פרופיל מקצועי</label>
                      <Textarea dir="rtl" rows={4} value={af("personal_summary")} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAf("personal_summary", e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">השכלה</label>
                      <Textarea dir="rtl" rows={3} value={af("academic_education")} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAf("academic_education", e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">קורסים והסמכות</label>
                      <Textarea dir="rtl" rows={3} value={af("professional_courses")} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAf("professional_courses", e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-500">כישורים נוספים</label>
                      <Textarea dir="rtl" rows={2} value={af("additional_skills_notes")} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAf("additional_skills_notes", e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
            <Button variant="outline" onClick={() => setAdminEditOpen(false)} className="rounded-xl">ביטול</Button>
            <Button
              disabled={adminSaving}
              className="rounded-xl text-white"
              style={{ backgroundColor: BRAND.primary }}
              onClick={async () => {
                setAdminSaving(true);
                try {
                  const { error: saveError } = await updateContact(resolvedId, adminForm);
                  if (saveError) throw saveError;
                  setAdminEditOpen(false);
                  showToast("success", "הפרטים עודכנו בהצלחה");
                } catch {
                  showToast("error", "שגיאה בשמירה");
                } finally {
                  setAdminSaving(false);
                }
              }}
            >
              {adminSaving ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />שומר...</> : "שמור שינויים"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
