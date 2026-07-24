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
import { toast } from "sonner";
import { ContactPicker } from "@/components/ui/ContactPicker";
import { CityRegionPicker } from "@/components/ui/CityRegionPicker";
import { OrgContactPicker } from "@/components/ui/OrgContactPicker";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { whatsappLink, formatPhone } from "@/lib/normalizePhone";

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
  job_description: string | null;
  job_requirements: string | null;
  job_url: string | null;
  rel_employer_contact: number | null;
  rel_recruiter_contact: number | null;
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
  candidate_availability_ids: number[] | null;
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
  submission_date: string | null;
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
  check_status: number | null;
  application_status: number | null;
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
  scopes: Map<number, string>;
  subRoles: Map<number, string>;
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

// שליפות המסך משתמשות ב-select('*') (כמו useApplications/useJobs) — חסינות לדריפט סכמה.
// אין לפרט רשימות עמודות: כל דריפט (עמודה שנמחקה/שונה) גרם 400 חוזר (salary_range/availability/applications).

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
    job_description: "דרושה סייעת אחראית ומסורה לעבודה במשמרות במרפאה מתקדמת.",
    job_requirements: "ניסיון מוכח של שנה לפחות, יחסי אנוש מעולים, נכונות למשמרות ערב.",
    job_url: null,
    rel_employer_contact: null,
    rel_recruiter_contact: null,
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
    candidate_availability_ids: [1],
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
    submission_date: "2026-05-23T19:16:53.879744+00:00",
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
    check_status: 3,
    application_status: 1,
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
  scopes: new Map([[1, "משרה מלאה"]]),
  subRoles: new Map(),
};

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

// WhatsApp/טלפון — מקור אמת יחיד: src/lib/normalizePhone.ts (whatsappLink/formatPhone).
// whatsappLink מטפל נכון גם ב-9 ספרות בלי 0/972.

// המרת ערך שדה-מערך (bigint[]) / מחרוזת / מספר לרשימת מזהים נקייה
function toIdArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  if (value === null || value === undefined) return [];
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? [value] : [];
  // מחרוזת: "3", "3,5", "{3,5}"
  return String(value)
    .replace(/[{}]/g, "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// מיפוי מזהי-מערך לשמות דרך מילון, מחזיר מחרוזת מופרדת בפסיקים
function idsToNames(value: unknown, dict: Map<number, string>): string {
  const names = toIdArray(value).map((id) => dict.get(id) ?? String(id));
  return names.length ? names.join(", ") : "—";
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

// משרה פעילה = job_status===3 ("פעילה") בלבד (החלטת המשתמשת 2026-07-12).
// 7="סגורה־אחר" ושאר הסטטוסים אינם פעילים. תואם JOB_STATUS_IDS.active + v_job_public.
function isActiveJob(job: JobRow): boolean {
  return Number(job.job_status) === 3;
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

// סטטוסים טרמינליים/סגורים של הגשה (מקור אמת: useApplications / FINAL_APP_STATUSES).
// "הגשה פתוחה" = application_status שאינו באחד מאלה: 5,10,13,14,15.
const CLOSED_APP_STATUSES = new Set([5, 10, 13, 14, 15]);
function isOpenApplication(statusId: number | null | undefined): boolean {
  if (statusId === null || statusId === undefined) return true;
  return !CLOSED_APP_STATUSES.has(Number(statusId));
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

// ─── UI Primitives ────────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
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
  const scopes = useDictRows("dict_scopes");
  const subRoles = useDictRows("dict_sub_roles");

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
      scopes: mapFromRows(scopes.data),
      subRoles: mapFromRows(subRoles.data),
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
    scopes.data,
    subRoles.data,
  ]);
}

function useAccountQuery(accountId: number | null, previewMode: boolean) {
  return useQuery({
    queryKey: ["employer360", "account", accountId, previewMode],
    queryFn: async () => {
      if (previewMode) return PREVIEW_ACCOUNT;
      if (!accountId) return null;

      const { data, error } = await supabase.from("accounts").select("*").eq("account_id", accountId).maybeSingle();

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
        .select("*")
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
        .select("*")
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
        .select("*")
        .in("job_code", jobCodes)
        .order("submission_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ApplicationRow[];
    },
    enabled: previewMode || jobCodes.length > 0,
  });
}

// ─── עריכה inline (במסך עצמו — אין דיאלוג נפרד) ───────────────────────────────

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
  specialties: string; // text[] — נשמר כמחרוזת מופרדת-פסיקים בעריכה
  hiring_roles: string; // text[] — מחרוזת מופרדת-פסיקים
  rel_role: string;
  systems_used: number[]; // int8[] — multi-select מ-dict_systems
};

// פיצול קלט מופרד-פסיקים ל-text[] (null אם ריק)
function splitCsv(value: string): string[] | null {
  const arr = value.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

// אתחול שדות עריכה מרשומת הארגון
function buildEditFields(a: AccountRow): EditFields {
  return {
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
    specialties: (a.specialties ?? []).join(", "),
    hiring_roles: (a.hiring_roles ?? []).join(", "),
    rel_role: a.rel_role ?? "",
    systems_used: a.systems_used ?? [],
  };
}

// המרת שדות עריכה ל-payload לעדכון accounts (coercion string→number/null + trim)
function editFieldsToUpdates(fields: EditFields, account: AccountRow): Record<string, unknown> {
  return {
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
    specialties: splitCsv(fields.specialties),
    hiring_roles: splitCsv(fields.hiring_roles),
    rel_role: fields.rel_role.trim() || null,
    systems_used: fields.systems_used.length ? fields.systems_used : null,
  };
}

// הקשר עריכה שמועבר לפאנלים; null = מצב תצוגה
type EditCtx = {
  fields: EditFields;
  setField: (key: keyof EditFields) => (value: string) => void;
  setSystems: (ids: number[]) => void;
};

const EDIT_INPUT_CLASS =
  "w-1/2 min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]";

// שדה טקסט/מספר/תאריך לעריכה inline בתוך כרטיס
function EditRow({
  label,
  value,
  onChange,
  ltr = false,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ltr?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <label className="shrink-0 text-[13px] text-slate-500">{label}</label>
      <input
        className={EDIT_INPUT_CLASS}
        dir={ltr ? "ltr" : "rtl"}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// בחירה מרובה (צ'יפים) לעריכה inline — לשדות מערך מבוססי-מילון (systems_used)
function EditChipsMultiSelect({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: number[];
  options: Array<{ id: number; name: string }>;
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="border-b border-slate-100 py-2 last:border-b-0">
      <div className="mb-2 text-[13px] text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 ? (
          <span className="text-sm text-slate-400">—</span>
        ) : (
          options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${on ? "border-[#008080] bg-[#E6F3F3] text-[#006D6D]" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {o.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// שדה בחירה (select) לעריכה inline
function EditSelectRow({
  label,
  value,
  onChange,
  options,
  placeholder = "— בחר —",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: number; name: string }>;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <label className="shrink-0 text-[13px] text-slate-500">{label}</label>
      <select className={EDIT_INPUT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
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
  editing,
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
  onEdit: () => void;
  editing: boolean;
}) {
  const website = normalizeUrl(account.website_url);
  const facebook = normalizeUrl(account.facebook_url);
  const wa = whatsappLink(account.phone) || null;

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
                  <StatusBadge statusType="account" statusId={account.account_status} label={dictName(dicts.accountStatuses, account.account_status, "סטטוס ארגון לא הוגדר")} />
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
              {!editing && (
                <Button
                  onClick={onEdit}
                  className="rounded-xl bg-white text-[#008080] hover:bg-slate-50"
                >
                  <Edit2 className="h-4 w-4" />
                  עריכה
                </Button>
              )}
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
  const activeJobs = useMemo(() => jobs.filter((job) => isActiveJob(job)), [dicts, jobs]);

  const uniqueCandidates = useMemo(
    () => uniqueCount(applications, (application) => application.candidate_link ?? application.phone_norm ?? application.candidate_phone ?? application.candidate_email),
    [applications],
  );

  const openApplications = useMemo(
    () => applications.filter((application) => isOpenApplication(application.application_status)).length,
    [applications],
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

function OrganizationDetails({ account, dicts, onCopy, edit }: { account: AccountRow; dicts: DictBundle; onCopy: (value: string | null | undefined) => void; edit?: EditCtx | null }) {
  const statusOptions = Array.from(dicts.accountStatuses.entries()).map(([id, name]) => ({ id, name }));
  const typeOptions = Array.from(dicts.accountTypes.entries()).map(([id, name]) => ({ id, name }));

  return (
    <SectionCard
      title="פרטי ארגון"
      icon={<Building2 className="h-4 w-4" />}
      action={
        edit ? null : (
          <Button variant="ghost" size="sm" className="rounded-xl text-[#008080]" onClick={() => onCopy([account.account_name, account.address].filter(Boolean).join(" | "))}>
            <ClipboardCopy className="h-4 w-4" />
            העתקה
          </Button>
        )
      }
    >
      {edit ? (
        <>
          <EditRow label="שם הארגון" value={edit.fields.account_name} onChange={edit.setField("account_name")} />
          <EditRow label="ח.פ / עוסק" value={edit.fields.bus_id} onChange={edit.setField("bus_id")} ltr placeholder="מספר ח.פ או עוסק מורשה" />
          <EditSelectRow label="סוג ארגון" value={edit.fields.account_type} onChange={edit.setField("account_type")} options={typeOptions} placeholder="— בחר סוג ארגון —" />
          <EditSelectRow label="סטטוס ארגון" value={edit.fields.account_status} onChange={edit.setField("account_status")} options={statusOptions} placeholder="— בחר סטטוס ארגון —" />
          <div className="border-b border-slate-100 py-2">
            <OrgContactPicker
              accountId={account.account_id}
              employerValue={edit.fields.contact_link}
              onEmployerChange={(id) => edit.setField("contact_link")(id ?? "")}
            />
          </div>
          <div className="border-b border-slate-100 py-2">
            <CityRegionPicker
              variant="edit"
              regionId={edit.fields.region_id ? Number(edit.fields.region_id) : null}
              cityId={edit.fields.city_id ? Number(edit.fields.city_id) : null}
              onRegionChange={(regionId) => {
                edit.setField("region_id")(regionId != null ? String(regionId) : "");
                edit.setField("city_id")("");
              }}
              onCityChange={(cityId) => edit.setField("city_id")(cityId != null ? String(cityId) : "")}
            />
          </div>
          <EditRow label="כתובת" value={edit.fields.address} onChange={edit.setField("address")} />
          <EditRow label="סוג מרפאה" value={edit.fields.clinic_type} onChange={edit.setField("clinic_type")} />
          <EditRow label="מספר כיסאות" value={edit.fields.chairs_count} onChange={edit.setField("chairs_count")} ltr type="number" />
          <EditRow label="גודל צוות" value={edit.fields.team_size} onChange={edit.setField("team_size")} ltr type="number" />
        </>
      ) : (
        <>
          <LabelValue label="שם הארגון" value={account.account_name} />
          <LabelValue label="ח.פ / עוסק" value={account.bus_id} ltr />
          <LabelValue label="סוג ארגון" value={dictName(dicts.accountTypes, account.account_type)} />
          <LabelValue label="סטטוס ארגון" value={<StatusBadge statusType="account" statusId={account.account_status} label={dictName(dicts.accountStatuses, account.account_status)} />} />
          <LabelValue label="אזור" value={dictName(dicts.regions, account.region_id)} />
          <LabelValue label="עיר" value={dictName(dicts.cities, account.city_id)} />
          <LabelValue label="כתובת" value={account.address} />
          <LabelValue label="סוג מרפאה" value={account.clinic_type} />
          <LabelValue label="מספר כיסאות" value={account.chairs_count} />
          <LabelValue label="גודל צוות" value={account.team_size} />
        </>
      )}
    </SectionCard>
  );
}

function CommunicationDetails({ account, edit }: { account: AccountRow; edit?: EditCtx | null }) {
  if (edit) {
    return (
      <SectionCard title="תקשורת" icon={<Phone className="h-4 w-4" />}>
        <EditRow label="טלפון ראשי" value={edit.fields.phone} onChange={edit.setField("phone")} ltr />
        <EditRow label="טלפון נוסף" value={edit.fields.second_phone} onChange={edit.setField("second_phone")} ltr />
        <EditRow label="אימייל ראשי" value={edit.fields.email} onChange={edit.setField("email")} ltr type="email" />
        <EditRow label="אימייל נוסף" value={edit.fields.second_email} onChange={edit.setField("second_email")} ltr type="email" />
        <EditRow label="אימייל לחיוב" value={edit.fields.billing_email} onChange={edit.setField("billing_email")} ltr type="email" />
        <EditRow label="אתר" value={edit.fields.website_url} onChange={edit.setField("website_url")} ltr />
        <EditRow label="פייסבוק" value={edit.fields.facebook_url} onChange={edit.setField("facebook_url")} ltr />
        <LabelValue label="WhatsApp אחרון" value={formatDateTime(account.whatsapp_last_sent)} />
      </SectionCard>
    );
  }
  return (
    <SectionCard title="תקשורת" icon={<Phone className="h-4 w-4" />}>
      <LabelValue label="טלפון ראשי" value={account.phone ? formatPhone(account.phone) : "—"} ltr />
      <LabelValue label="טלפון נוסף" value={account.second_phone ? formatPhone(account.second_phone) : "—"} ltr />
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
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מספר משרה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">כותרת</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תפקיד</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תת תפקיד</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">עיר</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">היקף משרה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תאריך פתיחה</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">תאריך פרסום</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">מועמדים</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">סטטוס משרה</th>
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
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{dictName(dicts.roles, job.job_role)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{idsToNames(job.job_sub_role, dicts.subRoles)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{dictName(dicts.cities, job.city_id)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{idsToNames(job.scope, dicts.scopes)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700" dir="ltr">{formatDate(job.created_time)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700" dir="ltr">{formatDate(job.last_publish_date)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{job.total_applicants ?? 0}</td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <StatusBadge statusType="job" statusId={Number(job.job_status)} label={dictName(dicts.jobStatuses, job.job_status)} />
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

function ContactsPanel({ contacts, jobs, dicts, isLoading, error }: { contacts: ContactRow[]; jobs: JobRow[]; dicts: DictBundle; isLoading: boolean; error: unknown }) {
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

  // תפקיד פר-ארגון: נגזר ממשרות הארגון (מעסיק/מגייס), + עובד ארגון/איש קשר לשאר
  const empIds = new Set((jobs ?? []).map((j) => Number(j.rel_employer_contact)).filter((v) => v > 0));
  const recIds = new Set((jobs ?? []).map((j) => Number(j.rel_recruiter_contact)).filter((v) => v > 0));
  const employers = contacts.filter((c) => empIds.has(Number(c.contact_id)));
  const recruiters = contacts.filter((c) => recIds.has(Number(c.contact_id)) && !empIds.has(Number(c.contact_id)));
  const others = contacts.filter((c) => !empIds.has(Number(c.contact_id)) && !recIds.has(Number(c.contact_id)));

  const renderCard = (contact: ContactRow) => {
    const name = contact.full_name || contact.display_name || compactArray([contact.first_name, contact.last_name]).join(" ") || "איש קשר ללא שם";
    const isEmp = empIds.has(Number(contact.contact_id));
    const isRec = recIds.has(Number(contact.contact_id));
    return (
      <div key={contact.contact_id} className="rounded-2xl border border-slate-200 p-3 transition hover:border-[#008080]/30 hover:bg-[#F0FDFC]/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/admin/contacts/${contact.contact_id}`} className="font-bold text-slate-900 hover:text-[#008080] hover:underline">
              {name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isEmp ? <span className="rounded-full bg-[#E6F3F3] px-2 py-0.5 text-[11px] font-bold text-[#008080]">מעסיק</span> : null}
              {isRec ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">מגייס</span> : null}
              <span className="text-xs text-slate-500">{dictName(dicts.roles, contact.role, contact.professional_title ?? "תפקיד לא הוגדר")}</span>
            </div>
          </div>
          {isPast(contact.next_follow_up) ? <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">פולואפ</Badge> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(contact.phone)}
            </a>
          ) : null}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
              <Mail className="h-3.5 w-3.5" />
              {contact.email}
            </a>
          ) : null}
          {whatsappLink(contact.phone) ? (
            <a href={whatsappLink(contact.phone) || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 hover:text-[#008080]">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  };

  const renderGroup = (title: string, list: ContactRow[]) =>
    list.length ? (
      <div className="space-y-2">
        <h4 className="text-[13px] font-bold text-slate-500">{title} ({list.length})</h4>
        {list.map(renderCard)}
      </div>
    ) : null;

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
        <EmptyState title="אין אנשי קשר משויכים" description="שייכי מעסיק/מגייס דרך המשרה, או איש קשר דרך המאגר." />
      ) : (
        <div className="space-y-4">
          {renderGroup("מעסיקים", employers)}
          {renderGroup("מגייסים", recruiters)}
          {renderGroup("עובדי ארגון / אנשי קשר", others)}
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
                    <StatusBadge statusType="application" statusId={application.application_status} label={dictName(dicts.applicationStatuses, application.application_status)} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <StatusBadge statusType="check" statusId={application.check_status} label={dictName(dicts.checkStatuses, application.check_status)} />
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

function CrmPanel({ account, edit }: { account: AccountRow; edit?: EditCtx | null }) {
  if (edit) {
    return (
      <SectionCard title="CRM ומעקב" icon={<Clock3 className="h-4 w-4" />}>
        <EditRow label="תאריך קשר אחרון" value={edit.fields.last_contact_date} onChange={edit.setField("last_contact_date")} ltr type="date" />
        <EditRow label="פולואפ הבא" value={edit.fields.next_follow_up} onChange={edit.setField("next_follow_up")} ltr type="date" />
        <div className="mt-4">
          <label className="mb-1 block text-[13px] text-slate-500">הערות CRM</label>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-[#008080] focus:outline-none focus:ring-1 focus:ring-[#008080]"
            value={edit.fields.notes}
            onChange={(e) => edit.setField("notes")(e.target.value)}
          />
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title="CRM ומעקב"
      icon={<Clock3 className="h-4 w-4" />}
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

function ProfessionalDnaPanel({ account, jobs, dicts, edit }: { account: AccountRow; jobs: JobRow[]; dicts: DictBundle; edit?: EditCtx | null }) {
  const roleFrequency = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((job) => {
      const role = dictName(dicts.roles, job.job_role, job.job_sub_role ?? "לא הוגדר");
      map.set(role, (map.get(role) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [dicts.roles, jobs]);

  const systems = useMemo(() => (account.systems_used ?? []).map((id) => dictName(dicts.systems, id, String(id))), [account.systems_used, dicts.systems]);
  const systemOptions = useMemo(() => Array.from(dicts.systems.entries()).map(([id, name]) => ({ id, name })), [dicts.systems]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title="DNA קליני־עסקי" icon={<ShieldAlert className="h-4 w-4" />}>
        <LabelValue label="סוג מרפאה" value={account.clinic_type} />
        {edit ? (
          <>
            <EditRow label="תחומי התמחות" value={edit.fields.specialties} onChange={edit.setField("specialties")} placeholder="מופרד בפסיקים" />
            <EditChipsMultiSelect label="מערכות בשימוש" selected={edit.fields.systems_used} options={systemOptions} onChange={edit.setSystems} />
          </>
        ) : (
          <>
            <LabelValue label="תחומי התמחות" value={(account.specialties ?? []).join(", ") || "—"} />
            <LabelValue label="מערכות בשימוש" value={systems.join(", ") || "—"} />
          </>
        )}
        <LabelValue label="מספר כיסאות" value={account.chairs_count} />
        <LabelValue label="גודל צוות" value={account.team_size} />
      </SectionCard>

      <SectionCard title="פרופיל גיוס" icon={<Briefcase className="h-4 w-4" />}>
        {edit ? (
          <>
            <EditRow label="תפקידי גיוס מועדפים" value={edit.fields.hiring_roles} onChange={edit.setField("hiring_roles")} placeholder="מופרד בפסיקים" />
            <EditRow label="תפקיד יחסי" value={edit.fields.rel_role} onChange={edit.setField("rel_role")} />
          </>
        ) : (
          <>
            <LabelValue label="תפקידי גיוס מועדפים" value={(account.hiring_roles ?? []).join(", ") || "—"} />
            <LabelValue label="תפקיד יחסי" value={account.rel_role} />
          </>
        )}
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

function buildRecommendedActions(account: AccountRow, jobs: JobRow[], contacts: ContactRow[], applications: ApplicationRow[], dicts: DictBundle): RecommendedAction[] {
  const activeJobs = jobs.filter((job) => isActiveJob(job));
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
      href: whatsappLink(account.phone) || undefined,
      label: whatsappLink(account.phone) ? "שליחת WhatsApp" : "עדכון פולואפ",
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
  const [editMode, setEditMode] = useState(false);
  const [fields, setFields] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>("overview");
  const { updateAccount } = useAccountMutations();

  const previewMode = searchParams.get("preview") === "1" || params.id === "preview" || params.accountId === "preview" || params.employerId === "preview";
  const accountId = useMemo(() => asNumber(params.accountId ?? params.id ?? params.employerId), [params.accountId, params.employerId, params.id]);

  const dicts = useDictBundle(true, previewMode);
  const accountQuery = useAccountQuery(accountId, previewMode);
  const jobsQuery = useAccountJobs(accountId, previewMode);
  const contactsQuery = useAccountContacts(accountId, previewMode);

  const jobCodes = useMemo(() => (jobsQuery.data ?? []).map((job) => job.job_code).filter(Boolean), [jobsQuery.data]);
  const applicationsQuery = useAccountApplications(jobCodes, previewMode);

  const setField = useCallback(
    (key: keyof EditFields) => (value: string) => {
      setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

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
  const contacts = contactsQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];

  // INC-3110: total_applicants on `job` is never maintained by any DB
  // trigger/RPC — overridden here with a live count of every application tied
  // to the job_code (status-agnostic: an application counts regardless of its
  // current application_status, since status changes over time but doesn't
  // change whether the candidate applied). Reuses `applications`, already
  // fetched for this account — no extra query.
  const jobApplicantCounts = useMemo(() => {
    const map = new Map<string, number>();
    applications.forEach((application) => {
      if (!application.job_code) return;
      map.set(application.job_code, (map.get(application.job_code) ?? 0) + 1);
    });
    return map;
  }, [applications]);

  const jobs = useMemo(
    () => (jobsQuery.data ?? []).map((job) => ({
      ...job,
      total_applicants: jobApplicantCounts.get(job.job_code) ?? 0,
    })),
    [jobsQuery.data, jobApplicantCounts],
  );

  const activeJobs = useMemo(() => jobs.filter((job) => isActiveJob(job)), [dicts, jobs]);
  const completion = useMemo(() => (account ? computeAccountCompletion(account) : 0), [account]);

  const location = useMemo(() => {
    if (!account) return "—";
    return compactArray([dictName(dicts.cities, account.city_id, ""), dictName(dicts.regions, account.region_id, "")]).join(" · ") || "—";
  }, [account, dicts.cities, dicts.regions]);

  const recommendedActions = useMemo(
    () => (account ? buildRecommendedActions(account, jobs, contacts, applications, dicts) : []),
    [account, applications, contacts, dicts, jobs],
  );

  const startEdit = useCallback(() => {
    if (account) setFields(buildEditFields(account));
    setEditMode(true);
    setTab("details");
  }, [account]);

  const cancelEdit = useCallback(() => {
    if (account) setFields(buildEditFields(account));
    setEditMode(false);
  }, [account]);

  const saveEdit = useCallback(async () => {
    if (!account || !fields) return;
    setSaving(true);
    try {
      const { error } = await updateAccount(account.account_id, editFieldsToUpdates(fields, account));
      if (error) throw error;
      // רענון כרטסת ה-360 (invalidation של כל שאילתות employer360 בתחילית) — כך העריכה משתקפת מיד
      await queryClient.invalidateQueries({ queryKey: ["employer360"] });
      toast.success("הארגון עודכן בהצלחה");
      setEditMode(false);
    } catch (err) {
      toast.error("שגיאה בשמירה: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }, [account, fields, updateAccount, queryClient]);

  const editCtx: EditCtx | null =
    editMode && fields
      ? {
          fields,
          setField,
          setSystems: (ids: number[]) => setFields((prev) => (prev ? { ...prev, systems_used: ids } : prev)),
        }
      : null;

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
          onEdit={startEdit}
          editing={editMode}
        />

        {editMode ? (
          <div className="sticky top-2 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#008080]/30 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <span className="text-sm font-semibold text-slate-700">מצב עריכה — כל הפרטים בכרטסת ניתנים לעריכה בלשוניות "פרטים ומנהלה" ו-"CRM ו-DNA"</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit} disabled={saving} className="rounded-xl">
                <X className="h-4 w-4" />
                ביטול
              </Button>
              <Button onClick={saveEdit} disabled={saving} className="rounded-xl bg-[#008080] text-white hover:bg-[#006B6B]">
                <Save className="h-4 w-4" />
                {saving ? "שומר..." : "שמירה"}
              </Button>
            </div>
          </div>
        ) : null}

        <KpiStrip account={account} jobs={jobs} applications={applications} dicts={dicts} />

        <Tabs value={tab} onValueChange={setTab} dir="rtl" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-3 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              סקירה
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              פרטים ומנהלה
            </TabsTrigger>
            <TabsTrigger value="crm" className="rounded-xl data-[state=active]:bg-[#008080] data-[state=active]:text-white">
              CRM ו-DNA
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
                  <ContactsPanel contacts={contacts} jobs={jobs} dicts={dicts} isLoading={contactsQuery.isLoading} error={contactsQuery.error} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-0 grid gap-4 xl:grid-cols-2">
            <OrganizationDetails account={account} dicts={dicts} onCopy={handleCopy} edit={editCtx} />
            <CommunicationDetails account={account} edit={editCtx} />
            <LinkContactToAccountPanel accountId={account.account_id} />
            <BillingAdminPanel account={account} />
          </TabsContent>

          <TabsContent value="crm" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <CrmPanel account={account} edit={editCtx} />
              <ProfessionalDnaPanel account={account} jobs={jobs} dicts={dicts} edit={editCtx} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
