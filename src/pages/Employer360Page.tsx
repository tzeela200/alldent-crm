import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccountMutations } from "@/hooks/useAccountMutations";
import { useContactMutations } from "@/hooks/useContactMutations";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  Edit2,
  ExternalLink,
  Facebook,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Save,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ContactPicker } from "@/components/ui/ContactPicker";
import { CityRegionPicker } from "@/components/ui/CityRegionPicker";
import { OrgContactPicker } from "@/components/ui/OrgContactPicker";

// ─── Types ───────────────────────────────────────────────────────────────────

type DictRow = {
  id: number;
  name: string | null;
};

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
  contact_link: string | null;
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
  extended_data: Record<string, unknown> | null;
  systems_used: number[] | null;
};

type JobRow = {
  job_code: string;
  account_link: number | null;
  job_status: number | null;
  job_title: string;
  job_role: number | null;
  job_sub_role: string | null;
  scope: string | null;
  required_experience: number | null;
  required_languages: string | null;
  region_id: number | null;
  city_id: number | null;
  address: string | null;
  salary_range: string | null;
  job_description: string | null;
  job_requirements: string | null;
  job_url: string | null;
  rel_employer_contact: number | null;
  total_applicants: number | null;
  date_facebook: string | null;
  date_website: string | null;
  date_whatsapp: string | null;
  last_publish_date: string | null;
  notes: string | null;
  created_time: string | null;
  updated_timestamp: string | null;
};

type ContactRow = {
  contact_id: number;
  phone: string | null;
  phone_norm: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  second_phone: string | null;
  second_email: string | null;
  role: number | null;
  sub_role: number | null;
  availability: number | null;
  experience: number | null;
  preferred_scope: string | null;
  languages: string | null;
  region_id: number | null;
  city_id: number | null;
  cv_link: string | null;
  has_cv: boolean | null;
  account_link: number | null;
  profile_type: number | null;
  source: number | null;
  check_status: number | null;
  social_status: number | null;
  facebook_url: string | null;
  facebook_name: string | null;
  facebook_id: number | null;
  last_contact_date: string | null;
  next_follow_up: string | null;
  prev_applications_count: number | null;
  notes: string | null;
  created_timestamp: string | null;
  updated_timestamp: string | null;
  professional_title: string | null;
  current_employer: string | null;
};

type ApplicationRow = {
  application_id: number;
  record_name: string | null;
  submission_date: string | null;
  display_date: string | null;
  form_title: string | null;
  job_code: string | null;
  job_link: string | null;
  account_name: string | null;
  job_role: string | null;
  job_city: string | null;
  job_region: string | null;
  candidate_phone: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  cv_link: string | null;
  candidate_link: number | null;
  candidate_notes: string | null;
  status_in_master: string | null;
  check_status: number | null;
  job_status_view: string | null;
  application_status: number | null;
  master_availability: string | null;
  master_role: string | null;
  master_city: string | null;
  master_region: string | null;
  internal_notes: string | null;
  created_timestamp: string | null;
  updated_timestamp: string | null;
  phone_norm: string | null;
};

type DictBundle = {
  accountStatuses: Map<number, string>;
  accountTypes: Map<number, string>;
  jobStatuses: Map<number, string>;
  applicationStatuses: Map<number, string>;
  checkStatuses: Map<number, string>;
  roles: Map<number, string>;
  regions: Map<number, string>;
  cities: Map<number, string>;
  systems: Map<number, string>;
};

type RecommendedAction = {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  label: string;
  severity: "info" | "warning" | "error" | "success";
};

// ─── Select strings ───────────────────────────────────────────────────────────

const ACCOUNT_SELECT =
  "account_id, account_name, bus_id, account_status, account_type, phone, second_phone, email, second_email, billing_email, website_url, facebook_url, region_id, city_id, address, contact_link, notes, active_job_count_auto, total_jobs_count, rel_role, all_applicants_names, last_contact_date, next_follow_up, whatsapp_last_sent, created_timestamp, updated_timestamp, clinic_type, chairs_count, specialties, team_size, hiring_roles, extended_data, systems_used";

const JOB_SELECT =
  "job_code, account_link, job_status, job_title, job_role, job_sub_role, scope, required_experience, required_languages, region_id, city_id, address, salary_range, job_description, job_requirements, job_url, rel_employer_contact, total_applicants, date_facebook, date_website, date_whatsapp, last_publish_date, notes, created_time, updated_timestamp";

const CONTACT_SELECT =
  "contact_id, phone, phone_norm, display_name, first_name, last_name, full_name, email, second_phone, second_email, role, sub_role, availability, experience, preferred_scope, languages, region_id, city_id, cv_link, has_cv, account_link, profile_type, source, check_status, social_status, facebook_url, facebook_name, facebook_id, last_contact_date, next_follow_up, prev_applications_count, notes, created_timestamp, updated_timestamp, professional_title, current_employer";

const APPLICATION_SELECT =
  "application_id, record_name, submission_date, display_date, form_title, job_code, job_link, account_name, job_role, job_city, job_region, candidate_phone, candidate_name, candidate_email, cv_link, candidate_link, candidate_notes, status_in_master, check_status, job_status_view, application_status, master_availability, master_role, master_city, master_region, internal_notes, created_timestamp, updated_timestamp, phone_norm";

// ─── Preview mock data ────────────────────────────────────────────────────────

const PREVIEW_ACCOUNT: AccountRow = {
  account_id: 1,
  account_name: "מרפאת שיניים סמייל קליניק - דמה",
  bus_id: "MOCK_516273849",
  account_status: 7,
  account_type: 1,
  phone: "03-5554433",
  second_phone: null,
  email: "hr@smile-clinic-mock.co.il",
  second_email: null,
  billing_email: null,
  website_url: null,
  facebook_url: null,
  region_id: 1,
  city_id: 231,
  address: "הרצל 50, בת ים",
  contact_link: null,
  notes: null,
  active_job_count_auto: 0,
  total_jobs_count: 0,
  rel_role: null,
  all_applicants_names: null,
  last_contact_date: null,
  next_follow_up: null,
  whatsapp_last_sent: null,
  created_timestamp: "2026-05-23T19:16:53.879744+00:00",
  updated_timestamp: "2026-05-23T19:16:53.879744+00:00",
  clinic_type: null,
  chairs_count: 4,
  specialties: [],
  team_size: 12,
  hiring_roles: [],
  extended_data: {},
  systems_used: [],
};

const PREVIEW_JOBS: JobRow[] = [
  {
    job_code: "MOCK_JOB_001",
    account_link: 1,
    job_status: 3,
    job_title: "סייעת רופא שיניים מנוסה למרכז חדיש",
    job_role: 9,
    job_sub_role: "סייעת מן המניין",
    scope: "משרה מלאה",
    required_experience: 2,
    required_languages: null,
    region_id: 1,
    city_id: 231,
    address: null,
    salary_range: '45-55 ש"ח לשעה',
    job_description: "דרושה סייעת אחראית ומסורה לעבודה במשמרות במרפאה מתקדמת.",
    job_requirements: "ניסיון מוכח של שנה לפחות, יחסי אנוש מעולים, נכונות למשמרות ערב.",
    job_url: null,
    rel_employer_contact: null,
    total_applicants: 0,
    date_facebook: null,
    date_website: null,
    date_whatsapp: null,
    last_publish_date: null,
    notes: null,
    created_time: "2026-05-23T19:16:53.879744+00:00",
    updated_timestamp: "2026-05-23T19:16:53.879744+00:00",
  },
];

const PREVIEW_CONTACTS: ContactRow[] = [
  {
    contact_id: 1,
    phone: "050-1234567",
    phone_norm: "972500000001",
    display_name: null,
    first_name: "דנה",
    last_name: "כהן",
    full_name: "דנה כהן",
    email: "dana.cohen.mock@gmail.com",
    second_phone: null,
    second_email: null,
    role: 9,
    sub_role: null,
    availability: 1,
    experience: 2,
    preferred_scope: null,
    languages: null,
    region_id: 1,
    city_id: 231,
    cv_link: null,
    has_cv: false,
    account_link: 1,
    profile_type: 1,
    source: null,
    check_status: 3,
    social_status: null,
    facebook_url: null,
    facebook_name: null,
    facebook_id: null,
    last_contact_date: null,
    next_follow_up: null,
    prev_applications_count: 0,
    notes: null,
    created_timestamp: "2026-05-23T19:16:53.879744+00:00",
    updated_timestamp: "2026-05-23T19:16:53.879744+00:00",
    professional_title: null,
    current_employer: null,
  },
];

const PREVIEW_APPLICATIONS: ApplicationRow[] = [
  {
    application_id: 1,
    record_name: "MOCK_APP_001",
    submission_date: "2026-05-23T19:16:53.879744+00:00",
    display_date: null,
    form_title: null,
    job_code: "MOCK_JOB_001",
    job_link: null,
    account_name: "מרפאת שיניים סמייל קליניק - דמה",
    job_role: "סייעת",
    job_city: "בת-ים",
    job_region: "גוש-דן",
    candidate_phone: "050-1234567",
    candidate_name: "דנה כהן",
    candidate_email: "dana.cohen.mock@gmail.com",
    cv_link: null,
    candidate_link: 1,
    candidate_notes: null,
    status_in_master: null,
    check_status: 3,
    job_status_view: null,
    application_status: 1,
    master_availability: null,
    master_role: null,
    master_city: null,
    master_region: null,
    internal_notes: null,
    created_timestamp: "2026-05-23T19:16:53.879744+00:00",
    updated_timestamp: "2026-05-23T19:16:53.879744+00:00",
    phone_norm: "972500000001",
  },
];

const PREVIEW_DICTS: DictBundle = {
  accountStatuses: new Map([[7, "פעיל"]]),
  accountTypes: new Map([[1, "מרפאת שיניים"]]),
  jobStatuses: new Map([[3, "פעילה"]]),
  applicationStatuses: new Map([[1, "חדשה"]]),
  checkStatuses: new Map([[3, "לבדיקה"]]),
  roles: new Map([[9, "סייעת"]]),
  regions: new Map([[1, "גוש-דן"]]),
  cities: new Map([[231, "בת ים"]]),
  systems: new Map(),
};

const ACCOUNT_FIELD_KEYS: Array<keyof AccountRow> = [
  "account_id",
  "account_name",
  "bus_id",
  "account_status",
  "account_type",
  "phone",
  "second_phone",
  "email",
  "second_email",
  "billing_email",
  "website_url",
  "facebook_url",
  "region_id",
  "city_id",
  "address",
  "contact_link",
  "notes",
  "active_job_count_auto",
  "total_jobs_count",
  "rel_role",
  "all_applicants_names",
  "last_contact_date",
  "next_follow_up",
  "whatsapp_last_sent",
  "created_timestamp",
  "updated_timestamp",
  "clinic_type",
  "chairs_count",
  "specialties",
  "team_size",
  "hiring_roles",
  "extended_data",
  "systems_used",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function whatsappUrl(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  return normalized ? `https://wa.me/${normalized}` : null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dictName(map: Map<number, string>, id: number | null | undefined, fallback = "—"): string {
  if (id === null || id === undefined) return fallback;
  return map.get(id) ?? fallback;
}

function isPast(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isActiveJob(job: JobRow, dicts: DictBundle): boolean {
  const statusName = dictName(dicts.jobStatuses, job.job_status, "");
  if (/פעיל|פתוח|בגיוס/i.test(statusName)) return true;
  return job.job_status === 3 || job.job_status === 7;
}

function uniqueCount<T>(items: T[], getKey: (item: T) => string | number | null | undefined): number {
  const keys = new Set<string>();
  items.forEach((item) => {
    const key = getKey(item);
    if (key !== null && key !== undefined && String(key).trim()) {
      keys.add(String(key));
    }
  });
  return keys.size;
}

function mapFromRows(rows: DictRow[] | undefined): Map<number, string> {
  const map = new Map<number, string>();
  (rows ?? []).forEach((row) => {
    if (row.id !== null && row.id !== undefined) {
      map.set(Number(row.id), row.name ?? "—");
    }
  });
  return map;
}

function statusTone(label: string, id?: number | null): "success" | "warning" | "danger" | "neutral" | "info" {
  const value = label.toLowerCase();
  if (/פעיל|חדש|פתוח|מאושר|תקין|נמסר|נקרא/.test(value) || id === 7 || id === 3) return "success";
  if (/ממתין|לבדיקה|בהמתנה|טיוטה|חלקי/.test(value)) return "warning";
  if (/סגור|לא פעיל|נכשל|שגיאה|בוטל|נדחה/.test(value)) return "danger";
  if (/בטיפול|בתהליך|פולואפ|מעקב/.test(value)) return "info";
  return "neutral";
}

export function computeAccountCompletion(account: AccountRow): number {
  const weightedFields: Array<[keyof AccountRow, number]> = [
    ["account_name", 12],
    ["bus_id", 9],
    ["account_status", 7],
    ["account_type", 7],
    ["phone", 8],
    ["email", 8],
    ["region_id", 6],
    ["city_id", 6],
    ["address", 6],
    ["billing_email", 5],
    ["website_url", 5],
    ["clinic_type", 5],
    ["chairs_count", 4],
    ["team_size", 4],
    ["notes", 4],
    ["next_follow_up", 4],
  ];

  return Math.min(
    100,
    weightedFields.reduce((sum, [key, weight]) => {
      const value = account[key];
      if (Array.isArray(value)) return value.length > 0 ? sum + weight : sum;
      return value !== null && value !== undefined && String(value).trim() !== "" ? sum + weight : sum;
    }, 0),
  );
}

function compactArray(values: Array<string | null | undefined>): string[] {
  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function fieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") {
    const json = JSON.stringify(value, null, 2);
    return json === "{}" || json === "[]" ? (
      "—"
    ) : (
      <pre className="max-h-72 overflow-auto rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-700 ring-1 ring-slate-200" dir="ltr">
        {json}
      </pre>
    );
  }
  return String(value);
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

function StatusBadge({ label, id }: { label: string; id?: number | null }) {
  const tone = statusTone(label, id);
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return <Badge className={`rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-inherit ${classes}`}>{label || "—"}</Badge>;
}

function SectionCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900">
            {icon ? <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDFC] text-[#008080]">{icon}</span> : null}
            <h2 className="text-base font-bold sm:text-lg">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function LabelValue({ label, value, ltr = false }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className="text-end text-sm font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}

function KpiCard({ icon, value, label, hint }: { icon: React.ReactNode; value: React.ReactNode; label: string; hint?: string }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-bold text-[#008080]">{value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
            {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <div className="mx-auto mt-1 max-w-xl text-sm text-slate-500">{description}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function ErrorBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
      <div className="flex items-center gap-2 text-sm font-bold">
        <AlertCircle className="h-4 w-4" />
        {title}
      </div>
      <div className="mt-1 text-sm">{description}</div>
    </div>
  );
}

function CommunicationButton({
  href,
  icon,
  children,
  disabled,
}: {
  href: string | null;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (!href || disabled) {
    return (
      <Button variant="outline" size="sm" disabled className="rounded-xl border-slate-200 bg-slate-50 text-slate-400">
        {icon}
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-[#F0FDFC] hover:text-[#008080]">
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
        {icon}
        {children}
      </a>
    </Button>
  );
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useDictRows(table: string) {
  return useQuery({
    queryKey: ["dict", table],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(table).select("id, name").order("id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DictRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

function useDictBundle(enabled: boolean, previewMode: boolean): DictBundle {
  const accountStatuses = useDictRows("dict_account_statuses");
  const accountTypes = useDictRows("dict_account_types");
  const jobStatuses = useDictRows("dict_job_statuses");
  const applicationStatuses = useDictRows("dict_application_statuses");
  const checkStatuses = useDictRows("dict_check_statuses");
  const roles = useDictRows("dict_roles");
  const regions = useDictRows("dict_regions");
  const cities = useDictRows("dict_cities");
  const systems = useDictRows("dict_systems");

  return useMemo(() => {
    if (!enabled || previewMode) return PREVIEW_DICTS;

    return {
      accountStatuses: mapFromRows(accountStatuses.data),
      accountTypes: mapFromRows(accountTypes.data),
      jobStatuses: mapFromRows(jobStatuses.data),
      applicationStatuses: mapFromRows(applicationStatuses.data),
      checkStatuses: mapFromRows(checkStatuses.data),
      roles: mapFromRows(roles.data),
      regions: mapFromRows(regions.data),
      cities: mapFromRows(cities.data),
      systems: mapFromRows(systems.data),
    };
  }, [
    accountStatuses.data,
    accountTypes.data,
    applicationStatuses.data,
    checkStatuses.data,
    cities.data,
    enabled,
    jobStatuses.data,
    previewMode,
    regions.data,
    roles.data,
    systems.data,
  ]);
}

function useAccountQuery(accountId: number | null, previewMode: boolean) {
  return useQuery({
    queryKey: ["employer360", "account", accountId, previewMode],
    queryFn: async () => {
      if (previewMode) return PREVIEW_ACCOUNT;
      if (!accountId) return null;

      const { data, error } = await supabase.from("accounts").select(ACCOUNT_SELECT).eq("account_id", accountId).maybeSingle();

      if (error) throw error;
      return data as unknown as AccountRow | null;
    },
    enabled: previewMode || !!accountId,
  });
}

function useAccountJobs(accountId: number | null, previewMode: boolean) {
  return useQuery({
    queryKey: ["employer360", "jobs", accountId, previewMode],
    queryFn: async () => {
      if (previewMode) return PREVIEW_JOBS;
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("job")
        .select(JOB_SELECT)
        .eq("account_link", accountId)
        .order("created_time", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as JobRow[];
    },
    enabled: previewMode || !!accountId,
  });
}

function useAccountContacts(accountId: number | null, previewMode: boolean) {
  return useQuery({
    queryKey: ["employer360", "contacts", accountId, previewMode],
    queryFn: async () => {
      if (previewMode) return PREVIEW_CONTACTS;
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("contact")
        .select(CONTACT_SELECT)
        .eq("account_link", accountId)
        .order("updated_timestamp", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ContactRow[];
    },
    enabled: previewMode || !!accountId,
  });
}

function useAccountApplications(jobCodes: string[], previewMode: boolean) {
  return useQuery({
    queryKey: ["employer360", "applications", jobCodes, previewMode],
    queryFn: async () => {
      if (previewMode) return PREVIEW_APPLICATIONS;
      if (jobCodes.length === 0) return [];

      const { data, error } = await supabase
        .from("applications")
        .select(APPLICATION_SELECT)
        .in("job_code", jobCodes)
        .order("submission_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ApplicationRow[];
    },
    enabled: previewMode || jobCodes.length > 0,
  });
}

// ─── AccountEditSheet ─────────────────────────────────────────────────────────

type EditSection = "general" | "crm";


type EditFields = {
  account_name: string;
  bus_id: string;
  contact_link: string;
  account_status: string;
  account_type: string;
  phone: string;
  second_phone: string;
  email: string;
  second_email: string;
  billing_email: string;
  website_url: string;
  facebook_url: string;
  region_id: string;
  city_id: string;
  address: string;
  clinic_type: string;
  chairs_count: string;
  team_size: string;
  notes: string;
  last_contact_date: string;
  next_follow_up: string;
};

function AccountEditSheet({
  open,
  section,
  account,
  dicts,
  onClose,
  onSaved,
}: {
  open: boolean;
  section: EditSection;
  account: AccountRow;
  dicts: DictBundle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { updateAccount } = useAccountMutations();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<EditSection>(section);

  const buildFields = (a: AccountRow): EditFields => ({
    account_name: a.account_name ?? "",
    bus_id: (a as any).bus_id ?? "",
    contact_link: String(a.contact_link ?? ""),
    account_status: String(a.account_status ?? ""),
    account_type: String(a.account_type ?? ""),
    phone: a.phone ?? "",
    second_phone: a.second_phone ?? "",
    email: a.email ?? "",
    second_email: a.second_email ?? "",
    billing_email: a.billing_email ?? "",
    website_url: a.website_url ?? "",
    facebook_url: a.facebook_url ?? "",
    region_id: String(a.region_id ?? ""),
    city_id: String(a.city_id ?? ""),
    address: a.address ?? "",
    clinic_type: a.clinic_type ?? "",
    chairs_count: a.chairs_count != null ? String(a.chairs_count) : "",
    team_size: a.team_size != null ? String(a.team_size) : "",
    notes: a.notes ?? "",
    last_contact_date: a.last_contact_date ? a.last_contact_date.slice(0, 10) : "",
    next_follow_up: a.next_follow_up ? a.next_follow_up.slice(0, 10) : "",
  });

  const [fields, setFields] = useState<EditFields>(() => buildFields(account));

  useEffect(() => {
    if (open) {
      setActiveSection(section);
      setFields(buildFields(account));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section]);

  const set = (key: keyof EditFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };




  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        account_name: fields.account_name.trim() || account.account_name,
        bus_id: fields.bus_id.trim() || null,
        contact_link: fields.contact_link || null,
        account_status: fields.account_status ? Number(fields.account_status) : null,
        account_type: fields.account_type ? Number(fields.account_type) : null,
        phone: fields.phone.trim() || null,
        second_phone: fields.second_phone.trim() || null,
        email: fields.email.trim() || null,
        second_email: fields.second_email.trim() || null,
        billing_email: fields.billing_email.trim() || null,
        website_url: fields.website_url.trim() || null,
        facebook_url: fields.facebook_url.trim() || null,
        region_id: fields.region_id ? Number(fields.region_id) : null,
        city_id: fields.city_id ? Number(fields.city_id) : null,
        address: fields.address.trim() || null,
        clinic_type: fields.clinic_type.trim() || null,
        chairs_count: fields.chairs_count ? Number(fields.chairs_count) : null,
        team_size: fields.team_size ? Number(fields.team_size) : null,
        notes: fields.notes.trim() || null,
        last_contact_date: fields.last_contact_date || null,
        next_follow_up: fields.next_follow_up || null,
      };

      const { error } = await updateAccount(account.account_id, updates);

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

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]";
  const labelClass = "mb-1 block text-xs font-semibold text-slate-500";

  const statusOptions = Array.from(dicts.accountStatuses.entries()).map(([id, name]) => ({ id, name }));
  const typeOptions = Array.from(dicts.accountTypes.entries()).map(([id, name]) => ({ id, name }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] max-w-2xl overflow-y-auto font-['Heebo']"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            עריכת ארגון — {account.account_name}
          </DialogTitle>
        </DialogHeader>

        {/* Section tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveSection("general")}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${activeSection === "general" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            פרטים כלליים
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("crm")}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${activeSection === "crm" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            CRM ומעקב
          </button>
        </div>

        {activeSection === "general" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>שם הארגון *</label>
                <input className={inputClass} value={fields.account_name} onChange={set("account_name")} />
              </div>

              <div>
                <label className={labelClass}>ח.פ / עוסק מורשה</label>
                <input className={inputClass} value={fields.bus_id} onChange={set("bus_id")} placeholder="מספר ח.פ או עוסק מורשה" />
              </div>

              <div className="sm:col-span-2">
                <OrgContactPicker
                  accountId={account.account_id}
                  employerValue={fields.contact_link}
                  onEmployerChange={(id) => setFields((prev) => ({ ...prev, contact_link: id ?? "" }))}
                />
              </div>

              <div>
                <label className={labelClass}>סטטוס</label>
                <select className={inputClass} value={fields.account_status} onChange={set("account_status")}>
                  <option value="">— בחר סטטוס —</option>
                  {statusOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>סוג ארגון</label>
                <select className={inputClass} value={fields.account_type} onChange={set("account_type")}>
                  <option value="">— בחר סוג —</option>
                  {typeOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>טלפון ראשי</label>
                <input className={inputClass} dir="ltr" value={fields.phone} onChange={set("phone")} />
              </div>

              <div>
                <label className={labelClass}>טלפון נוסף</label>
                <input className={inputClass} dir="ltr" value={fields.second_phone} onChange={set("second_phone")} />
              </div>

              <div>
                <label className={labelClass}>אימייל ראשי</label>
                <input className={inputClass} dir="ltr" type="email" value={fields.email} onChange={set("email")} />
              </div>

              <div>
                <label className={labelClass}>אימייל נוסף</label>
                <input className={inputClass} dir="ltr" type="email" value={fields.second_email} onChange={set("second_email")} />
              </div>

              <div>
                <label className={labelClass}>אימייל לחיוב</label>
                <input className={inputClass} dir="ltr" type="email" value={fields.billing_email} onChange={set("billing_email")} />
              </div>

              <div>
                <label className={labelClass}>אתר</label>
                <input className={inputClass} dir="ltr" value={fields.website_url} onChange={set("website_url")} />
              </div>

              <div>
                <label className={labelClass}>פייסבוק</label>
                <input className={inputClass} dir="ltr" value={fields.facebook_url} onChange={set("facebook_url")} />
              </div>

              <div className="sm:col-span-2">
                <CityRegionPicker
                  variant="edit"
                  regionId={fields.region_id ? Number(fields.region_id) : null}
                  cityId={fields.city_id ? Number(fields.city_id) : null}
                  onRegionChange={(regionId) => setFields((prev) => ({ ...prev, region_id: regionId != null ? String(regionId) : "", city_id: "" }))}
                  onCityChange={(cityId) => setFields((prev) => ({ ...prev, city_id: cityId != null ? String(cityId) : "" }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>כתובת</label>
                <input className={inputClass} value={fields.address} onChange={set("address")} />
              </div>

              <div>
                <label className={labelClass}>סוג מרפאה / קליניקה</label>
                <input className={inputClass} value={fields.clinic_type} onChange={set("clinic_type")} />
              </div>

              <div>
                <label className={labelClass}>מספר כיסאות</label>
                <input className={inputClass} type="number" dir="ltr" value={fields.chairs_count} onChange={set("chairs_count")} />
              </div>

              <div>
                <label className={labelClass}>גודל צוות</label>
                <input className={inputClass} type="number" dir="ltr" value={fields.team_size} onChange={set("team_size")} />
              </div>
            </div>
          </div>
        )}

        {activeSection === "crm" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>תאריך קשר אחרון</label>
                <input className={inputClass} type="date" dir="ltr" value={fields.last_contact_date} onChange={set("last_contact_date")} />
              </div>

              <div>
                <label className={labelClass}>פולואפ הבא</label>
                <input className={inputClass} type="date" dir="ltr" value={fields.next_follow_up} onChange={set("next_follow_up")} />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>הערות CRM</label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  value={fields.notes}
                  onChange={set("notes")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={saving}>
            <X className="h-4 w-4" />
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#008080] text-white hover:bg-[#006B6B]"
          >
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────

function HeroSection({
  account,
  dicts,
  location,
  activeJobsCount,
  totalJobsCount,
  completion,
  overdueFollowUp,
  onCopy,
  onScrollToContacts,
  onEdit,
}: {
  account: AccountRow;
  dicts: DictBundle;
  location: string;
  activeJobsCount: number;
  totalJobsCount: number;
  completion: number;
  overdueFollowUp: boolean;
  onCopy: (value: string | null | undefined) => void;
  onScrollToContacts: () => void;
  onEdit: (section?: EditSection) => void;
}) {
  const website = normalizeUrl(account.website_url);
  const facebook = normalizeUrl(account.facebook_url);
  const wa = whatsappUrl(account.phone);

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="bg-gradient-to-l from-[#008080] to-[#006B6B] p-5 text-white sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">
                {account.account_name?.trim()?.charAt(0) || <Building2 className="h-8 w-8" />}
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge label={dictName(dicts.accountStatuses, account.account_status, "סטטוס לא הוגדר")} id={account.account_status} />
                  <Badge className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15">
                    {dictName(dicts.accountTypes, account.account_type, "סוג ארגון לא הוגדר")}
                  </Badge>
                  {overdueFollowUp ? (
                    <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                      פולואפ באיחור
                    </Badge>
                  ) : null}
                </div>
                <h1 className="truncate text-2xl font-black sm:text-3xl">{account.account_name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/85">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {activeJobsCount} משרות פעילות מתוך {totalJobsCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4" />
                    פרופיל {completion}% מלא
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                onClick={() => onEdit("general")}
                className="rounded-xl bg-white text-[#008080] hover:bg-slate-50"
              >
                <Edit2 className="h-4 w-4" />
                עריכת ארגון
              </Button>
              <Button asChild className="rounded-xl border border-white/30 bg-white/15 text-white hover:bg-white/25">
                <Link to={`/employer-profile/${account.account_id}`}>
                  <Printer className="h-4 w-4" />
                  פרופיל להדפסה
                </Link>
              </Button>
              <Button asChild className="rounded-xl bg-[#D97706] text-white hover:bg-[#B95F04]">
                <Link to={`/admin/jobs/new?account_id=${account.account_id}`}>
                  <Plus className="h-4 w-4" />
                  יצירת משרה
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <CommunicationButton href={wa} icon={<MessageCircle className="h-4 w-4" />}>
            WhatsApp
          </CommunicationButton>
          <CommunicationButton href={account.phone ? `tel:${account.phone}` : null} icon={<Phone className="h-4 w-4" />}>
            חיוג
          </CommunicationButton>
          <CommunicationButton href={account.email ? `mailto:${account.email}` : null} icon={<Mail className="h-4 w-4" />}>
            אימייל
          </CommunicationButton>
          <CommunicationButton href={website} icon={<Globe className="h-4 w-4" />}>
            אתר
          </CommunicationButton>
          <CommunicationButton href={facebook} icon={<Facebook className="h-4 w-4" />}>
            פייסבוק
          </CommunicationButton>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onCopy(account.bus_id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-50 hover:text-[#008080] disabled:pointer-events-none disabled:opacity-40"
            disabled={!account.bus_id}
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            ח.פ / עוסק: <span dir="ltr">{account.bus_id || "—"}</span>
          </button>
          <button type="button" onClick={onScrollToContacts} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-50 hover:text-[#008080]">
            <Users className="h-3.5 w-3.5" />
            מעבר לאנשי קשר
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiStrip({ account, jobs, applications, dicts }: { account: AccountRow; jobs: JobRow[]; applications: ApplicationRow[]; dicts: DictBundle }) {
  const activeJobs = useMemo(() => jobs.filter((job) => isActiveJob(job, dicts)), [dicts, jobs]);

  const uniqueCandidates = useMemo(
    () => uniqueCount(applications, (application) => application.candidate_link ?? application.phone_norm ?? application.candidate_phone ?? application.candidate_email),
    [applications],
  );

  const openApplications = useMemo(
    () =>
      applications.filter((application) => {
        const label = dictName(dicts.applicationStatuses, application.application_status, application.status_in_master ?? "");
        return !/סגור|נדחה|בוטל|הושם/i.test(label);
      }).length,
    [applications, dicts.applicationStatuses],
  );

  const overdueFollowUps = isPast(account.next_follow_up) ? 1 : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={<Briefcase className="h-5 w-5" />} value={activeJobs.length} label="משרות פעילות" hint="מחושב לפי משרות הארגון" />
      <KpiCard icon={<FileText className="h-5 w-5" />} value={jobs.length} label='סה"כ משרות' hint="פעילות והיסטוריות" />
      <KpiCard icon={<Users className="h-5 w-5" />} value={uniqueCandidates} label="מועמדים ייחודיים" hint={`${openApplications} הגשות פתוחות`} />
      <KpiCard icon={<CalendarClock className="h-5 w-5" />} value={overdueFollowUps} label="פולואפים באיחור" hint={account.next_follow_up ? `הבא: ${formatDate(account.next_follow_up)}` : "לא נקבע פולואפ"} />
    </div>
  );
}

function LinkContactToAccountPanel({ accountId }: { accountId: number }) {
  const { updateContact } = useContactMutations()
  const [pendingId, setPendingId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)

  const handleLink = async () => {
    if (!pendingId) return
    setSaving(true)
    const { error } = await updateContact(pendingId, { account_link: accountId })
    setSaving(false)
    if (error) {
      toast.error('שגיאה בשיוך איש הקשר')
    } else {
      toast.success('איש הקשר שויך לארגון בהצלחה')
      setPendingId(null)
    }
  }

  return (
    <SectionCard title="שיוך איש קשר לארגון" icon={<Users className="h-4 w-4" />}>
      <p className="mb-3 text-[13px] text-[#6B6B6B]">חפש איש קשר קיים ושייך אותו לארגון זה</p>
      <ContactPicker
        label="חיפוש איש קשר"
        value={pendingId}
        onChange={(id) => setPendingId(id)}
      />
      {pendingId && (
        <Button
          className="mt-3 w-full rounded-xl bg-[#008080] text-white hover:bg-[#006D6D]"
          onClick={handleLink}
          disabled={saving}
        >
          {saving ? 'משייך...' : 'שייך לארגון'}
        </Button>
      )}
    </SectionCard>
  )
}

function OrganizationDetails({ account, dicts, onCopy }: { account: AccountRow; dicts: DictBundle; onCopy: (value: string | null | undefined) => void }) {
  return (
    <SectionCard
      title="פרטי ארגון"
      icon={<Building2 className="h-4 w-4" />}
      action={
        <Button variant="ghost" size="sm" className="rounded-xl text-[#008080]" onClick={() => onCopy([account.account_name, account.address].filter(Boolean).join(" | "))}>
          <ClipboardCopy className="h-4 w-4" />
          העתקה
        </Button>
      }
    >
      <LabelValue label="שם הארגון" value={account.account_name} />
      <LabelValue label="ח.פ / עוסק" value={account.bus_id} ltr />
      <LabelValue label="סוג ארגון" value={dictName(dicts.accountTypes, account.account_type)} />
      <LabelValue label="סטטוס" value={<StatusBadge label={dictName(dicts.accountStatuses, account.account_status)} id={account.account_status} />} />
      <LabelValue label="אזור" value={dictName(dicts.regions, account.region_id)} />
      <LabelValue label="עיר" value={dictName(dicts.cities, account.city_id)} />
      <LabelValue label="כתובת" value={account.address} />
      <LabelValue label="סוג מרפאה" value={account.clinic_type} />
      <LabelValue label="מספר כיסאות" value={account.chairs_count} />
      <LabelValue label="גודל צוות" value={account.team_size} />
    </SectionCard>
  );
}

function CommunicationDetails({ account }: { account: AccountRow }) {
  return (
    <SectionCard title="תקשורת" icon={<Phone className="h-4 w-4" />}>
      <LabelValue label="טלפון ראשי" value={account.phone} ltr />
      <LabelValue label="טלפון נוסף" value={account.second_phone} ltr />
      <LabelValue label="אימייל ראשי" value={account.email} ltr />
      <LabelValue label="אימייל נוסף" value={account.second_email} ltr />
      <LabelValue label="אימייל לחיוב" value={account.billing_email} ltr />
      <LabelValue
        label="אתר"
        value={
          normalizeUrl(account.website_url) ? (
            <a href={normalizeUrl(account.website_url) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008080] hover:underline" dir="ltr">
              {account.website_url}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            "—"
          )
        }
      />
      <LabelValue
        label="פייסבוק"
        value={
          normalizeUrl(account.facebook_url) ? (
            <a href={normalizeUrl(account.facebook_url) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008080] hover:underline" dir="ltr">
              {account.facebook_url}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            "—"
          )
        }
      />
      <LabelValue label="WhatsApp אחרון" value={formatDateTime(account.whatsapp_last_sent)} />
    </SectionCard>
  );
}

function RecommendedActionsPanel({ actions }: { actions: RecommendedAction[] }) {
  const severityClasses = {
    info: "border-sky-200 bg-sky-50 text-sky-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  if (actions.length === 0) {
    return (
      <SectionCard title="פעולות מומלצות" icon={<Sparkles className="h-4 w-4" />}>
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-bold">הכל תקין</div>
            <div className="text-sm">אין פעולות דחופות כרגע.</div>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="פעולות מומלצות" icon={<Sparkles className="h-4 w-4" />}>
      <div className="space-y-3">
        {actions.map((action) => {
          const content = (
            <div className={`rounded-2xl border p-3 ${severityClasses[action.severity]}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{action.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                  <div className="mt-2 text-xs font-bold">{action.label}</div>
                </div>
              </div>
            </div>
          );

          return action.href && action.href.startsWith("/") ? (
            <Link key={action.key} to={action.href} className="block transition hover:scale-[1.01]">
              {content}
            </Link>
          ) : action.href ? (
            <a key={action.key} href={action.href} target="_blank" rel="noreferrer" className="block transition hover:scale-[1.01]">
              {content}
            </a>
          ) : (
            <div key={action.key}>{content}</div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function JobsPanel({ jobs, dicts, isLoading, error, accountId }: { jobs: JobRow[]; dicts: DictBundle; isLoading: boolean; error: unknown; accountId: number }) {
  if (isLoading) {
    return (
      <SectionCard title="משרות" icon={<Briefcase className="h-4 w-4" />}>
        <div className="space-y-3">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="משרות" icon={<Briefcase className="h-4 w-4" />}>
        <ErrorBlock title="שגיאה בטעינת משרות" description="לא ניתן היה לטעון את המשרות המקושרות לארגון." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={`משרות (${jobs.length})`}
      icon={<Briefcase className="h-4 w-4" />}
      action={
        <Button asChild size="sm" className="rounded-xl bg-[#008080] text-white hover:bg-[#006B6B]">
          <Link to={`/admin/jobs/new?account_id=${accountId}`}>
            <Plus className="h-4 w-4" />
            משרה חדשה
          </Link>
        </Button>
      }
    >
      {jobs.length === 0 ? (
        <EmptyState
          title="אין משרות לארגון זה"
          description="אפשר לפתוח משרה חדשה מתוך כרטסת הארגון, כשהארגון כבר מקושר להקמת המשרה."
          action={
            <Button asChild className="rounded-xl bg-[#008080] hover:bg-[#006B6B]">
              <Link to={`/admin/jobs/new?account_id=${accountId}`}>יצירת משרה</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מספר משרה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">כותרת</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תפקיד</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מיקום</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">היקף</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מועמדים</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_code} className="group hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-3 font-mono text-[#008080]" dir="ltr">
                    <Link to={`/admin/jobs/${job.job_code}`} className="hover:underline">
                      {job.job_code}
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{job.job_title}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{dictName(dicts.roles, job.job_role, job.job_sub_role ?? "—")}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                    {compactArray([dictName(dicts.cities, job.city_id, ""), dictName(dicts.regions, job.region_id, "")]).join(" · ") || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{job.scope || "—"}</td>
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{job.total_applicants ?? 0}</td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <StatusBadge label={dictName(dicts.jobStatuses, job.job_status)} id={job.job_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function ContactsPanel({ contacts, dicts, isLoading, error }: { contacts: ContactRow[]; dicts: DictBundle; isLoading: boolean; error: unknown }) {
  if (isLoading) {
    return (
      <SectionCard title="אנשי קשר" icon={<Users className="h-4 w-4" />}>
        <div className="space-y-3">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="אנשי קשר" icon={<Users className="h-4 w-4" />}>
        <ErrorBlock title="שגיאה בטעינת אנשי קשר" description="לא ניתן היה לטעון את אנשי הקשר המקושרים לארגון." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={`אנשי קשר (${contacts.length})`}
      icon={<Users className="h-4 w-4" />}
      action={
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link to="/admin/contacts">
            <Users className="h-4 w-4" />
            מאגר אנשי קשר
          </Link>
        </Button>
      }
    >
      {contacts.length === 0 ? (
        <EmptyState title="אין אנשי קשר משויכים" description="יש לשייך אנשי קשר דרך כרטסת איש קשר או מאגר אנשי הקשר." />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => {
            const name = contact.full_name || contact.display_name || compactArray([contact.first_name, contact.last_name]).join(" ") || "איש קשר ללא שם";
            return (
              <div key={contact.contact_id} className="rounded-2xl border border-slate-200 p-3 transition hover:border-[#008080]/30 hover:bg-[#F0FDFC]/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/contacts/${contact.contact_id}`} className="font-bold text-slate-900 hover:text-[#008080] hover:underline">
                      {name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{dictName(dicts.roles, contact.role, contact.professional_title ?? "תפקיד לא הוגדר")}</div>
                  </div>
                  {isPast(contact.next_follow_up) ? <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">פולואפ</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone}
                    </a>
                  ) : null}
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </a>
                  ) : null}
                  {whatsappUrl(contact.phone) ? (
                    <a href={whatsappUrl(contact.phone) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function ApplicationsPanel({
  applications,
  dicts,
  isLoading,
  error,
}: {
  applications: ApplicationRow[];
  dicts: DictBundle;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <SectionCard title="הגשות דרך משרות" icon={<FileText className="h-4 w-4" />}>
        <div className="space-y-3">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="הגשות דרך משרות" icon={<FileText className="h-4 w-4" />}>
        <ErrorBlock title="שגיאה בטעינת הגשות" description="לא ניתן היה לטעון את ההגשות המשויכות למשרות הארגון." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={`הגשות דרך משרות (${applications.length})`}
      icon={<FileText className="h-4 w-4" />}
      action={
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link to="/admin/applications">
            <FileText className="h-4 w-4" />
            כל ההגשות
          </Link>
        </Button>
      }
    >
      {applications.length === 0 ? (
        <EmptyState title="אין הגשות לארגון זה" description="כאשר מועמדים יגישו למשרות של הארגון, ההגשות יופיעו כאן." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מועמד</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">משרה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תפקיד</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תאריך הגשה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">סטטוס הגשה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">בדיקה</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.application_id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">
                    {application.candidate_link ? (
                      <Link to={`/admin/contacts/${application.candidate_link}`} className="hover:text-[#008080] hover:underline">
                        {application.candidate_name || "מועמד ללא שם"}
                      </Link>
                    ) : (
                      application.candidate_name || "—"
                    )}
                    <div className="mt-1 text-xs font-normal text-slate-500" dir="ltr">
                      {application.candidate_phone || application.candidate_email || ""}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 font-mono text-[#008080]" dir="ltr">
                    {application.job_code ? (
                      <Link to={`/admin/jobs/${application.job_code}`} className="hover:underline">
                        {application.job_code}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{application.job_role || application.master_role || "—"}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{formatDate(application.submission_date)}</td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <StatusBadge label={dictName(dicts.applicationStatuses, application.application_status, application.status_in_master ?? "—")} id={application.application_status} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <StatusBadge label={dictName(dicts.checkStatuses, application.check_status)} id={application.check_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function CrmPanel({ account, onEdit }: { account: AccountRow; onEdit: (section: EditSection) => void }) {
  return (
    <SectionCard
      title="CRM ומעקב"
      icon={<Clock3 className="h-4 w-4" />}
      action={
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onEdit("crm")}>
          <Edit2 className="h-4 w-4" />
          עדכון CRM
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">קשר אחרון</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(account.last_contact_date)}</div>
        </div>
        <div className={`rounded-2xl p-4 ${isPast(account.next_follow_up) ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-900"}`}>
          <div className="text-xs opacity-70">פולואפ הבא</div>
          <div className="mt-1 text-sm font-bold">{formatDateTime(account.next_follow_up)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">WhatsApp אחרון</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(account.whatsapp_last_sent)}</div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-1 text-sm font-bold text-slate-900">הערות CRM</div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{account.notes || "אין הערות CRM שמורות לארגון זה."}</p>
      </div>
    </SectionCard>
  );
}

function ProfessionalDnaPanel({ account, jobs, dicts }: { account: AccountRow; jobs: JobRow[]; dicts: DictBundle }) {
  const roleFrequency = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((job) => {
      const role = dictName(dicts.roles, job.job_role, job.job_sub_role ?? "לא הוגדר");
      map.set(role, (map.get(role) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [dicts.roles, jobs]);

  const systems = useMemo(() => (account.systems_used ?? []).map((id) => dictName(dicts.systems, id, String(id))), [account.systems_used, dicts.systems]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title="DNA קליני־עסקי" icon={<ShieldAlert className="h-4 w-4" />}>
        <LabelValue label="סוג מרפאה" value={account.clinic_type} />
        <LabelValue label="תחומי התמחות" value={(account.specialties ?? []).join(", ") || "—"} />
        <LabelValue label="מערכות בשימוש" value={systems.join(", ") || "—"} />
        <LabelValue label="מספר כיסאות" value={account.chairs_count} />
        <LabelValue label="גודל צוות" value={account.team_size} />
      </SectionCard>

      <SectionCard title="פרופיל גיוס" icon={<Briefcase className="h-4 w-4" />}>
        <LabelValue label="תפקידי גיוס מועדפים" value={(account.hiring_roles ?? []).join(", ") || "—"} />
        <LabelValue label="תפקיד יחסי" value={account.rel_role} />
        <LabelValue label="מועמדים משויכים היסטורית" value={account.all_applicants_names} />
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 text-sm font-bold text-slate-900">תדירות תפקידים לפי משרות</div>
          {roleFrequency.length === 0 ? (
            <div className="text-sm text-slate-500">אין מספיק משרות לחישוב תדירות.</div>
          ) : (
            roleFrequency.map(([role, count]) => (
              <div key={role} className="mb-2 flex items-center justify-between gap-4 last:mb-0">
                <span className="text-sm text-slate-700">{role}</span>
                <Badge className="rounded-full bg-white text-[#008080] ring-1 ring-slate-200 hover:bg-white">{count}</Badge>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function BillingAdminPanel({ account }: { account: AccountRow }) {
  return (
    <SectionCard title="הנהלת חשבונות ומנהלה" icon={<FileText className="h-4 w-4" />}>
      <LabelValue label="אימייל לחיוב" value={account.billing_email} ltr />
      <LabelValue label="מזהה עסקי" value={account.bus_id} ltr />
      <LabelValue label="כתובת" value={account.address} />
      <LabelValue label="תאריך יצירה" value={formatDateTime(account.created_timestamp)} />
      <LabelValue label="עדכון אחרון" value={formatDateTime(account.updated_timestamp)} />
    </SectionCard>
  );
}

function AdditionalDataPanel({ account }: { account: AccountRow }) {
  const entries = useMemo(() => {
    const record = account as Record<string, unknown>;
    return ACCOUNT_FIELD_KEYS.map((key) => [key, record[key as string]] as const);
  }, [account]);

  return (
    <SectionCard title="כל שדות החשבון" icon={<FileText className="h-4 w-4" />}>
      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 text-xs font-bold text-slate-500" dir="ltr">
              {key}
            </div>
            <div className="text-sm font-semibold text-slate-800">{fieldValue(value)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function buildRecommendedActions(account: AccountRow, jobs: JobRow[], contacts: ContactRow[], applications: ApplicationRow[], dicts: DictBundle): RecommendedAction[] {
  const activeJobs = jobs.filter((job) => isActiveJob(job, dicts));
  const jobCodesWithApplications = new Set(applications.map((application) => application.job_code).filter(Boolean));
  const jobsWithoutApplicants = activeJobs.filter((job) => !jobCodesWithApplications.has(job.job_code));
  const actions: RecommendedAction[] = [];

  if (activeJobs.length === 0) {
    actions.push({
      key: "no-active-jobs",
      icon: <Briefcase className="h-4 w-4" />,
      title: "אין משרות פעילות",
      description: "כדאי לפתוח משרה חדשה או לבדוק האם סטטוס המשרות עודכן נכון.",
      href: `/admin/jobs/new?account_id=${account.account_id}`,
      label: "יצירת משרה",
      severity: "warning",
    });
  }

  if (contacts.length === 0) {
    actions.push({
      key: "no-contacts",
      icon: <Users className="h-4 w-4" />,
      title: "אין אנשי קשר משויכים",
      description: "מומלץ לשייך איש קשר כדי לשמור רצף CRM תקין מול הארגון.",
      href: "/admin/contacts",
      label: "פתיחת מאגר אנשי קשר",
      severity: "warning",
    });
  }

  if (jobsWithoutApplicants.length > 0) {
    actions.push({
      key: "jobs-without-applicants",
      icon: <Sparkles className="h-4 w-4" />,
      title: `${jobsWithoutApplicants.length} משרות פעילות ללא הגשות`,
      description: "אפשר לפתוח Smart Match או לבדוק את פרסום המשרות.",
      href: `/admin/smart-match?account_id=${account.account_id}`,
      label: "פתיחת Smart Match",
      severity: "info",
    });
  }

  if (isPast(account.next_follow_up)) {
    actions.push({
      key: "overdue-follow-up",
      icon: <Clock3 className="h-4 w-4" />,
      title: "פולואפ באיחור",
      description: `הפולואפ הבא נקבע ל-${formatDate(account.next_follow_up)}.`,
      href: whatsappUrl(account.phone) ?? undefined,
      label: whatsappUrl(account.phone) ? "שליחת WhatsApp" : "עדכון פולואפ",
      severity: "error",
    });
  }

  return actions;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Employer360Page() {
  const params = useParams<{ id?: string; accountId?: string; employerId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const contactsRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>("general");

  const previewMode = searchParams.get("preview") === "1" || params.id === "preview" || params.accountId === "preview" || params.employerId === "preview";
  const accountId = useMemo(() => asNumber(params.accountId ?? params.id ?? params.employerId), [params.accountId, params.employerId, params.id]);

  const dicts = useDictBundle(true, previewMode);
  const accountQuery = useAccountQuery(accountId, previewMode);
  const jobsQuery = useAccountJobs(accountId, previewMode);
  const contactsQuery = useAccountContacts(accountId, previewMode);

  const jobCodes = useMemo(() => (jobsQuery.data ?? []).map((job) => job.job_code).filter(Boolean), [jobsQuery.data]);
  const applicationsQuery = useAccountApplications(jobCodes, previewMode);

  const handleEdit = useCallback((section: EditSection = "general") => {
    setEditSection(section);
    setEditOpen(true);
  }, []);

  const handleEditSaved = useCallback(() => {
    if (accountId) {
      void queryClient.invalidateQueries({ queryKey: ["employer360", "account", accountId] });
    }
  }, [accountId, queryClient]);

  useEffect(() => {
    if (!accountId || previewMode) return;

    const channel = supabase
      .channel(`employer-360-${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `account_id=eq.${accountId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["employer360", "account", accountId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "job", filter: `account_link=eq.${accountId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["employer360", "jobs", accountId] });
        void queryClient.invalidateQueries({ queryKey: ["employer360", "applications"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contact", filter: `account_link=eq.${accountId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["employer360", "contacts", accountId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["employer360", "applications"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accountId, previewMode, queryClient]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (value: string | null | undefined) => {
    const text = String(value ?? "").trim();
    if (!text) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }

    setCopied(true);

    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimeoutRef.current = null;
    }, 1500);
  }, []);

  const scrollToContacts = useCallback(() => {
    contactsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const account = accountQuery.data ?? null;
  const jobs = jobsQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];

  const activeJobs = useMemo(() => jobs.filter((job) => isActiveJob(job, dicts)), [dicts, jobs]);
  const completion = useMemo(() => (account ? computeAccountCompletion(account) : 0), [account]);

  const location = useMemo(() => {
    if (!account) return "—";
    return compactArray([dictName(dicts.cities, account.city_id, ""), dictName(dicts.regions, account.region_id, "")]).join(" · ") || "—";
  }, [account, dicts.cities, dicts.regions]);

  const recommendedActions = useMemo(
    () => (account ? buildRecommendedActions(account, jobs, contacts, applications, dicts) : []),
    [account, applications, contacts, dicts, jobs],
  );

  if (!previewMode && !accountId) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#F8FAFC] p-4 font-['Heebo'] text-slate-900 sm:p-6">
        <div className="mx-auto max-w-3xl py-24">
          <ErrorBlock title="חסר מזהה ארגון" description="לא התקבל account_id תקין בכתובת המסך." />
          <Button asChild className="mt-4 rounded-xl bg-[#008080] hover:bg-[#006B6B]">
            <Link to="/admin/accounts">
              <ArrowRight className="h-4 w-4" />
              חזרה למאגר ארגונים
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (accountQuery.isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#F8FAFC] p-4 font-['Heebo'] text-slate-900 sm:p-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <SkeletonBlock className="h-56" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonBlock className="h-96 lg:col-span-2" />
            <SkeletonBlock className="h-96" />
          </div>
        </div>
      </main>
    );
  }

  if (accountQuery.error) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#F8FAFC] p-4 font-['Heebo'] text-slate-900 sm:p-6">
        <div className="mx-auto max-w-3xl py-24">
          <ErrorBlock title="שגיאה בטעינת הארגון" description="אירעה שגיאה בעת טעינת כרטסת הארגון מ-Supabase." />
          <Button asChild className="mt-4 rounded-xl bg-[#008080] hover:bg-[#006B6B]">
            <Link to="/admin/accounts">
              <ArrowRight className="h-4 w-4" />
              חזרה למאגר ארגונים
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#F8FAFC] p-4 font-['Heebo'] text-slate-900 sm:p-6">
        <div className="mx-auto max-w-3xl py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-900">ארגון לא נמצא</h1>
          <p className="mt-2 text-sm text-slate-500">לא נמצאה רשומת accounts עבור המזהה המבוקש.</p>
          <Button asChild className="mt-5 rounded-xl bg-[#008080] hover:bg-[#006B6B]">
            <Link to="/admin/accounts">
              <ArrowRight className="h-4 w-4" />
              חזרה למאגר ארגונים
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#F8FAFC] p-4 font-['Heebo'] text-slate-900 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        {previewMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            מצב תצוגת דמה פעיל. הנתונים מוצגים לפי ערכי Mock נקיים התואמים לשדות Supabase.
          </div>
        ) : null}

        {copied ? <div className="fixed bottom-4 left-4 z-50 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">הועתק ללוח</div> : null}

        <HeroSection
          account={account}
          dicts={dicts}
          location={location}
          activeJobsCount={activeJobs.length}
          totalJobsCount={jobs.length}
          completion={completion}
          overdueFollowUp={isPast(account.next_follow_up)}
          onCopy={handleCopy}
          onScrollToContacts={scrollToContacts}
          onEdit={handleEdit}
        />

        <KpiStrip account={account} jobs={jobs} applications={applications} dicts={dicts} />

        <Tabs defaultValue="overview" dir="rtl" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 md:grid-cols-4">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              תפעולי
            </TabsTrigger>
            <TabsTrigger value="crm" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              CRM
            </TabsTrigger>
            <TabsTrigger value="dna" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              DNA מקצועי
            </TabsTrigger>
            <TabsTrigger value="admin" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              מנהלה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <JobsPanel jobs={jobs} dicts={dicts} isLoading={jobsQuery.isLoading} error={jobsQuery.error} accountId={account.account_id} />
                <ApplicationsPanel applications={applications} dicts={dicts} isLoading={applicationsQuery.isLoading} error={applicationsQuery.error} />
              </div>
              <div className="space-y-4">
                <RecommendedActionsPanel actions={recommendedActions} />
                <div ref={contactsRef}>
                  <ContactsPanel contacts={contacts} dicts={dicts} isLoading={contactsQuery.isLoading} error={contactsQuery.error} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="crm" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <CrmPanel account={account} onEdit={handleEdit} />
              </div>
              <RecommendedActionsPanel actions={recommendedActions} />
            </div>
          </TabsContent>

          <TabsContent value="dna" className="mt-0">
            <ProfessionalDnaPanel account={account} jobs={jobs} dicts={dicts} />
          </TabsContent>

          <TabsContent value="admin" className="mt-0 grid gap-4 xl:grid-cols-2">
            <OrganizationDetails account={account} dicts={dicts} onCopy={handleCopy} />
            <CommunicationDetails account={account} />
            <LinkContactToAccountPanel accountId={account.account_id} />
            <BillingAdminPanel account={account} />
          </TabsContent>

        </Tabs>
      </div>

      {/* Inline edit sheet */}
      <AccountEditSheet
        open={editOpen}
        section={editSection}
        account={account}
        dicts={dicts}
        onClose={() => setEditOpen(false)}
        onSaved={handleEditSaved}
      />
    </main>
  );
}
