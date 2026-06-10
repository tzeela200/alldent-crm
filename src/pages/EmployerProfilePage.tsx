import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Download,
  Edit2,
  ExternalLink,
  Facebook,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountRow = {
  account_id: number;
  account_name: string;
  bus_id: string | null;
  account_status: number | null;
  account_type: number | null;
  phone: string | null;
  second_phone: string | null;
  email: string | null;
  second_email: string | null;
  billing_email: string | null;
  website_url: string | null;
  facebook_url: string | null;
  region_id: number | null;
  city_id: number | null;
  address: string | null;
  notes: string | null;
  active_job_count_auto: number | null;
  total_jobs_count: number | null;
  rel_role: string | null;
  all_applicants_names: string | null;
  last_contact_date: string | null;
  next_follow_up: string | null;
  whatsapp_last_sent: string | null;
  created_timestamp: string | null;
  updated_timestamp: string | null;
  clinic_type: string | null;
  chairs_count: number | null;
  specialties: string[] | null;
  team_size: number | null;
  hiring_roles: string[] | null;
  systems_used: number[] | null;
  extended_data: Record<string, unknown> | null;
  contact_link: string | null;
};

type DictRow = { id: number; name: string | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(d);
}

function dictLabel(rows: DictRow[], id: number | null | undefined): string {
  if (id == null) return "—";
  return rows.find((r) => r.id === id)?.name ?? "—";
}

function mapFromRows(rows: DictRow[]): Map<number, string> {
  const m = new Map<number, string>();
  rows.forEach((r) => { if (r.id != null) m.set(Number(r.id), r.name ?? "—"); });
  return m;
}

const COMPLETION_FIELDS: Array<keyof AccountRow> = [
  "account_name", "bus_id", "account_status", "account_type",
  "phone", "email", "region_id", "city_id", "address",
  "billing_email", "website_url", "clinic_type", "chairs_count",
  "team_size", "notes", "next_follow_up",
];

function calcCompletion(account: AccountRow): number {
  const weights: Partial<Record<keyof AccountRow, number>> = {
    account_name: 12, bus_id: 9, account_status: 7, account_type: 7,
    phone: 8, email: 8, region_id: 6, city_id: 6, address: 6,
    billing_email: 5, website_url: 5, clinic_type: 5,
    chairs_count: 4, team_size: 4, notes: 4, next_follow_up: 4,
  };
  return Math.min(100, COMPLETION_FIELDS.reduce((sum, key) => {
    const v = account[key];
    const w = weights[key] ?? 0;
    if (Array.isArray(v)) return v.length > 0 ? sum + w : sum;
    return (v !== null && v !== undefined && String(v).trim() !== "") ? sum + w : sum;
  }, 0));
}

// ─── ProgressCircle ───────────────────────────────────────────────────────────

function ProgressCircle({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="76" height="76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="#008080" strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 38 38)"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
      />
      <text x="38" y="43" textAnchor="middle" className="text-sm font-bold fill-slate-800">
        {pct}%
      </text>
    </svg>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  onEdit,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-slate-400 hover:text-[#008080] transition no-print"
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

function Row({ label, value, ltr = false }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className="text-end text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Inline edit dialog ───────────────────────────────────────────────────────

type EditSection = "general" | "crm";
type EditFields = {
  account_name: string; account_status: string; account_type: string;
  phone: string; second_phone: string; email: string; second_email: string;
  billing_email: string; website_url: string; facebook_url: string;
  address: string; clinic_type: string; chairs_count: string; team_size: string;
  notes: string; last_contact_date: string; next_follow_up: string;
};

function buildEditFields(a: AccountRow): EditFields {
  return {
    account_name: a.account_name ?? "",
    account_status: String(a.account_status ?? ""),
    account_type: String(a.account_type ?? ""),
    phone: a.phone ?? "",
    second_phone: a.second_phone ?? "",
    email: a.email ?? "",
    second_email: a.second_email ?? "",
    billing_email: a.billing_email ?? "",
    website_url: a.website_url ?? "",
    facebook_url: ("facebook_url" in a ? (a as any).facebook_url : null) ?? "",
    address: a.address ?? "",
    clinic_type: a.clinic_type ?? "",
    chairs_count: a.chairs_count != null ? String(a.chairs_count) : "",
    team_size: a.team_size != null ? String(a.team_size) : "",
    notes: a.notes ?? "",
    last_contact_date: a.last_contact_date ? a.last_contact_date.slice(0, 10) : "",
    next_follow_up: a.next_follow_up ? a.next_follow_up.slice(0, 10) : "",
  };
}

function AccountEditDialog({
  open,
  section,
  account,
  statusOptions,
  typeOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  section: EditSection;
  account: AccountRow;
  statusOptions: { id: number; name: string }[];
  typeOptions: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<EditSection>(section);
  const [fields, setFields] = useState<EditFields>(() => buildEditFields(account));

  useEffect(() => {
    if (open) {
      setActiveSection(section);
      setFields(buildEditFields(account));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section]);

  const set = (key: keyof EditFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("accounts").update({
        account_name: fields.account_name.trim() || account.account_name,
        account_status: fields.account_status ? Number(fields.account_status) : null,
        account_type: fields.account_type ? Number(fields.account_type) : null,
        phone: fields.phone.trim() || null,
        second_phone: fields.second_phone.trim() || null,
        email: fields.email.trim() || null,
        second_email: fields.second_email.trim() || null,
        billing_email: fields.billing_email.trim() || null,
        website_url: fields.website_url.trim() || null,
        facebook_url: fields.facebook_url.trim() || null,
        address: fields.address.trim() || null,
        clinic_type: fields.clinic_type.trim() || null,
        chairs_count: fields.chairs_count ? Number(fields.chairs_count) : null,
        team_size: fields.team_size ? Number(fields.team_size) : null,
        notes: fields.notes.trim() || null,
        last_contact_date: fields.last_contact_date || null,
        next_follow_up: fields.next_follow_up || null,
      }).eq("account_id", account.account_id);
      if (error) throw error;
      toast.success("הארגון עודכן בהצלחה");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("שגיאה בשמירה: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const ic = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]";
  const lc = "mb-1 block text-xs font-semibold text-slate-500";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto font-['Heebo']">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            עריכת ארגון — {account.account_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-slate-200 pb-3">
          {(["general", "crm"] as EditSection[]).map((s) => (
            <button key={s} type="button" onClick={() => setActiveSection(s)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${activeSection === s ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {s === "general" ? "פרטים כלליים" : "CRM ומעקב"}
            </button>
          ))}
        </div>

        {activeSection === "general" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={lc}>שם הארגון *</label>
              <input className={ic} value={fields.account_name} onChange={set("account_name")} />
            </div>
            <div>
              <label className={lc}>סטטוס</label>
              <select className={ic} value={fields.account_status} onChange={set("account_status")}>
                <option value="">— בחר —</option>
                {statusOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>סוג ארגון</label>
              <select className={ic} value={fields.account_type} onChange={set("account_type")}>
                <option value="">— בחר —</option>
                {typeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><label className={lc}>טלפון ראשי</label><input className={ic} dir="ltr" value={fields.phone} onChange={set("phone")} /></div>
            <div><label className={lc}>טלפון נוסף</label><input className={ic} dir="ltr" value={fields.second_phone} onChange={set("second_phone")} /></div>
            <div><label className={lc}>אימייל</label><input className={ic} dir="ltr" type="email" value={fields.email} onChange={set("email")} /></div>
            <div><label className={lc}>אימייל לחיוב</label><input className={ic} dir="ltr" type="email" value={fields.billing_email} onChange={set("billing_email")} /></div>
            <div><label className={lc}>אתר</label><input className={ic} dir="ltr" value={fields.website_url} onChange={set("website_url")} /></div>
            <div><label className={lc}>פייסבוק</label><input className={ic} dir="ltr" value={fields.facebook_url} onChange={set("facebook_url")} /></div>
            <div className="sm:col-span-2"><label className={lc}>כתובת</label><input className={ic} value={fields.address} onChange={set("address")} /></div>
            <div><label className={lc}>סוג מרפאה</label><input className={ic} value={fields.clinic_type} onChange={set("clinic_type")} /></div>
            <div><label className={lc}>מספר כיסאות</label><input className={ic} type="number" dir="ltr" value={fields.chairs_count} onChange={set("chairs_count")} /></div>
            <div><label className={lc}>גודל צוות</label><input className={ic} type="number" dir="ltr" value={fields.team_size} onChange={set("team_size")} /></div>
          </div>
        )}

        {activeSection === "crm" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={lc}>קשר אחרון</label><input className={ic} type="date" dir="ltr" value={fields.last_contact_date} onChange={set("last_contact_date")} /></div>
            <div><label className={lc}>פולואפ הבא</label><input className={ic} type="date" dir="ltr" value={fields.next_follow_up} onChange={set("next_follow_up")} /></div>
            <div className="sm:col-span-2">
              <label className={lc}>הערות</label>
              <textarea className={`${ic} min-h-[120px] resize-y`} value={fields.notes} onChange={set("notes")} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={saving}>
            <X className="h-4 w-4" />ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#008080] text-white hover:bg-[#006B6B]">
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ACCOUNT_SELECT = "account_id, account_name, bus_id, account_status, account_type, phone, second_phone, email, second_email, billing_email, website_url, facebook_url, region_id, city_id, address, contact_link, notes, active_job_count_auto, total_jobs_count, rel_role, all_applicants_names, last_contact_date, next_follow_up, whatsapp_last_sent, created_timestamp, updated_timestamp, clinic_type, chairs_count, specialties, team_size, hiring_roles, extended_data, systems_used";

export default function EmployerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const accountId = asNumber(id);

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>("general");

  const { data: account, isLoading, error } = useQuery({
    queryKey: ["employer-profile", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase.from("accounts").select(ACCOUNT_SELECT).eq("account_id", accountId).maybeSingle();
      if (error) throw error;
      return data as unknown as AccountRow | null;
    },
    enabled: !!accountId,
  });

  // Dict queries
  const { data: accountStatuses = [] } = useQuery<DictRow[]>({
    queryKey: ["dict", "dict_account_statuses"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("dict_account_statuses").select("id, name").order("id");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: accountTypes = [] } = useQuery<DictRow[]>({
    queryKey: ["dict", "dict_account_types"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("dict_account_types").select("id, name").order("id");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: regions = [] } = useQuery<DictRow[]>({
    queryKey: ["dict", "dict_regions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("dict_regions").select("id, name").order("id");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: cities = [] } = useQuery<DictRow[]>({
    queryKey: ["dict", "dict_cities"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("dict_cities").select("id, name").order("id");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: systems = [] } = useQuery<DictRow[]>({
    queryKey: ["dict", "dict_systems"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("dict_systems").select("id, name").order("id");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const systemsMap = useMemo(() => mapFromRows(systems), [systems]);

  const handleEditSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ["employer-profile", accountId] });
    void queryClient.invalidateQueries({ queryKey: ["employer360", "account", accountId] });
  };

  const openEdit = (section: EditSection = "general") => {
    setEditSection(section);
    setEditOpen(true);
  };

  const statusOptions = accountStatuses.map((r) => ({ id: r.id, name: r.name ?? "" }));
  const typeOptions = accountTypes.map((r) => ({ id: r.id, name: r.name ?? "" }));

  // ─── loading / error ─────────────────────────────────────────────────────

  if (!accountId) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-['Heebo'] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-700">חסר מזהה ארגון</h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 font-['Heebo']">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#008080] border-t-transparent" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-['Heebo']">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Building2 className="mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-700">ארגון לא נמצא</h2>
          <p className="text-sm text-slate-500 mt-1">ייתכן שהקישור אינו תקין.</p>
          <Button asChild className="mt-4 rounded-xl bg-[#008080] hover:bg-[#006B6B] no-print">
            <Link to="/admin/accounts"><ArrowRight className="h-4 w-4" />חזרה למאגר</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ─── derived ─────────────────────────────────────────────────────────────

  const completion = calcCompletion(account);
  const cityText = dictLabel(cities, account.city_id);
  const regionText = dictLabel(regions, account.region_id);
  const locationText = [cityText !== "—" ? cityText : "", regionText !== "—" ? regionText : ""].filter(Boolean).join(" · ") || "—";
  const typeText = dictLabel(accountTypes, account.account_type);
  const statusText = dictLabel(accountStatuses, account.account_status);
  const systemsList = (account.systems_used ?? []).map((id) => systemsMap.get(id) ?? String(id));
  const initial = account.account_name?.trim()?.charAt(0) || "?";
  const websiteHref = normalizeUrl(account.website_url);
  const facebookHref = normalizeUrl((account as any).facebook_url);

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-['Heebo'] profile-container">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav, header, aside, .sidebar { display: none !important; }
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { background: white !important; font-size: 11pt; }
          .profile-container { max-width: 100% !important; padding: 0 !important; }
          .hero-strip { background: #008080 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .teal-accent { color: #008080 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .card { break-inside: avoid; page-break-inside: avoid; }
          .alldent-footer { position: fixed; bottom: 8mm; width: 100%; text-align: center; font-size: 8pt; color: #666; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl p-6">

        {/* ─── HERO ─── */}
        <div className="hero-strip h-1.5 rounded-t-2xl bg-[#008080]" />
        <Card className="rounded-t-none rounded-b-2xl border border-t-0 border-slate-200 bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-xl border-2 border-[#008080] bg-teal-50 text-2xl font-bold teal-accent" style={{ color: "#008080" }}>
                {initial}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-slate-900">{account.account_name}</h1>
                <div className="text-base font-medium teal-accent" style={{ color: "#008080" }}>
                  {typeText !== "—" ? typeText : "ארגון"}
                  {account.clinic_type ? ` · ${account.clinic_type}` : ""}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                  {locationText !== "—" && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{locationText}</span>
                  )}
                  {account.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{account.phone}</span>
                  )}
                  {account.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{account.email}</span>
                  )}
                  {websiteHref && (
                    <a href={websiteHref} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#008080]">
                      <Globe className="h-3.5 w-3.5" />
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {facebookHref && (
                    <a href={facebookHref} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#008080]">
                      <Facebook className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {statusText !== "—" && (
                  <Badge className="mt-3 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                    {statusText}
                  </Badge>
                )}
              </div>

              {/* Progress */}
              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                <ProgressCircle pct={completion} />
                <span className="text-xs text-slate-500">מילוי פרופיל</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-5 no-print">
              <Button
                size="sm"
                className="rounded-xl bg-[#008080] hover:bg-teal-700 text-white"
                onClick={() => window.print()}
              >
                <Download className="h-3.5 w-3.5 me-1.5" />
                הורדה כ-PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => openEdit("general")}
              >
                <Edit2 className="h-3.5 w-3.5 me-1.5" />
                עריכת פרופיל
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to={`/admin/accounts/${account.account_id}`}>
                  <ArrowRight className="h-3.5 w-3.5 me-1.5" />
                  360° ארגון
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTIONS ─── */}
        <div className="space-y-4">

          {/* זהות ארגון */}
          <Section title="זהות הארגון" icon={<Building2 className="h-4 w-4 teal-accent" style={{ color: "#008080" }} />} onEdit={() => openEdit("general")}>
            <Row label="שם הארגון" value={account.account_name} />
            <Row label="ח.פ / עוסק מורשה" value={account.bus_id} ltr />
            <Row label="סוג ארגון" value={typeText} />
            <Row label="סוג מרפאה / קליניקה" value={account.clinic_type} />
            <Row label="מספר כיסאות" value={account.chairs_count} />
            <Row label="גודל צוות" value={account.team_size ? `${account.team_size} עובדים` : null} />
            <Row label="סטטוס" value={statusText !== "—" ? (
              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                {statusText}
              </Badge>
            ) : "—"} />
            <Row label="אזור" value={regionText !== "—" ? regionText : null} />
            <Row label="עיר" value={cityText !== "—" ? cityText : null} />
            <Row label="כתובת" value={account.address} />
          </Section>

          {/* תקשורת */}
          <Section title="פרטי תקשורת" icon={<Phone className="h-4 w-4 teal-accent" style={{ color: "#008080" }} />} onEdit={() => openEdit("general")}>
            <Row label="טלפון ראשי" value={account.phone} ltr />
            <Row label="טלפון נוסף" value={account.second_phone} ltr />
            <Row label="אימייל ראשי" value={account.email} ltr />
            <Row label="אימייל נוסף" value={account.second_email} ltr />
            <Row label="אימייל לחיוב" value={account.billing_email} ltr />
            <Row label="אתר" value={websiteHref ? (
              <a href={websiteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008080] hover:underline" dir="ltr">
                {account.website_url}<ExternalLink className="h-3 w-3" />
              </a>
            ) : null} />
          </Section>

          {/* DNA קליני */}
          <Section title="DNA קליני" icon={<Briefcase className="h-4 w-4 teal-accent" style={{ color: "#008080" }} />} onEdit={() => openEdit("general")}>
            <Row label="תחומי התמחות" value={(account.specialties ?? []).join(", ") || null} />
            <Row label="מערכות בשימוש" value={systemsList.length ? systemsList.join(", ") : null} />
            <Row label="תפקידי גיוס מועדפים" value={(account.hiring_roles ?? []).join(", ") || null} />
            <Row label="מועמדים היסטוריים" value={account.all_applicants_names} />
          </Section>

          {/* CRM */}
          <Section title="CRM ומעקב" icon={<Mail className="h-4 w-4 teal-accent" style={{ color: "#008080" }} />} onEdit={() => openEdit("crm")}>
            <Row label="קשר אחרון" value={formatDate(account.last_contact_date)} />
            <Row label="פולואפ הבא" value={formatDate(account.next_follow_up)} />
            {account.notes && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500 mb-1">הערות</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{account.notes}</p>
              </div>
            )}
          </Section>

        </div>

        {/* Footer */}
        <div className="alldent-footer mt-8 text-center text-xs text-slate-400 no-print">
          הופק על ידי AllDent CRM · {new Date().toLocaleDateString("he-IL")}
        </div>
        <div className="alldent-footer">
          AllDent CRM · הופק ב-{new Date().toLocaleDateString("he-IL")}
        </div>
      </div>

      {/* Edit dialog */}
      {account && (
        <AccountEditDialog
          open={editOpen}
          section={editSection}
          account={account}
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          onClose={() => setEditOpen(false)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
