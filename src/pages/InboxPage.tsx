import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Inbox,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
  Building2,
  CalendarClock,
  Mail,
  Facebook,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { mockInboxLeads, mockAccounts, mockContacts } from "@/mocks/data";
import {
  mockSources,
  mockSocialStatuses,
  mockAvailability,
  mockCheckStatuses,
  mockAccountStatuses,
} from "@/mocks/dicts";

type EntityTypeFilter = "all" | "מועמד" | "ארגון" | "unknown";
type OpenStateFilter = "all" | "open" | "handled" | "spam";
type SortField = "inbox_date" | "created_timestamp" | "dup_count" | "last_action_date";

const BRAND = {
  primary: "#008080",
  accent: "#D97706",
};

function dictName(
  items: Array<{ id: number; name: string }>,
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return items.find((item) => item.id === value)?.name ?? String(value);
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

function normalizePhone(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function buildWhatsAppLink(phone?: string | null) {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function isOpenLead(row: any) {
  const intent = String(row.action_intent ?? "").toLowerCase();
  return !intent || !["handled", "spam", "archived"].includes(intent);
}

function isSpamLead(row: any) {
  return String(row.action_intent ?? "").toLowerCase() === "spam";
}

function isHandledLead(row: any) {
  return String(row.action_intent ?? "").toLowerCase() === "handled";
}

function isOverdue(row: any) {
  if (!row.next_follow_up) return false;
  const d = new Date(row.next_follow_up);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function getDuplicateSignal(row: any) {
  if (row.is_duplicate || (row.dup_count ?? 0) > 0) return "כפילות";
  return null;
}

function getEntityBadgeClass(entityType?: string | null) {
  switch (entityType) {
    case "מועמד":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ארגון":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getMatchSummary(row: any) {
  if (row.match_contact && row.match_account) return "נמצא match לאיש קשר + ארגון";
  if (row.match_contact) return "נמצא match לאיש קשר";
  if (row.match_account) return "נמצא match לארגון";
  return "ללא match קיים";
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        {sub ? <div className="mt-2 text-xs text-slate-500">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [duplicateOnly, setDuplicateOnly] = useState(false);
  const [entityType, setEntityType] = useState<EntityTypeFilter>("all");
  const [openState, setOpenState] = useState<OpenStateFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("inbox_date");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const selectedLead = useMemo(
    () => mockInboxLeads.find((row) => row.lead_id === selectedLeadId) ?? null,
    [selectedLeadId],
  );

  const rows = useMemo(() => {
    let filtered = [...mockInboxLeads];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((row) =>
        [
          row.display_name,
          row.phone,
          row.phone_norm,
          row.candidate_email,
          row.facebook_name,
          row.facebook_id,
          row.record_key,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    if (duplicateOnly) {
      filtered = filtered.filter((row) => row.is_duplicate || (row.dup_count ?? 0) > 0);
    }

    if (entityType !== "all") {
      if (entityType === "unknown") {
        filtered = filtered.filter((row) => !row.entity_type);
      } else {
        filtered = filtered.filter((row) => row.entity_type === entityType);
      }
    }

    if (openState !== "all") {
      if (openState === "open") filtered = filtered.filter(isOpenLead);
      if (openState === "handled") filtered = filtered.filter(isHandledLead);
      if (openState === "spam") filtered = filtered.filter(isSpamLead);
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((row) => String(row.lead_source) === sourceFilter);
    }

    return filtered.sort((a, b) => {
      if (sortField === "dup_count") {
        return (b.dup_count ?? 0) - (a.dup_count ?? 0);
      }

      const av = new Date(a[sortField] ?? 0).getTime();
      const bv = new Date(b[sortField] ?? 0).getTime();
      return bv - av;
    });
  }, [search, duplicateOnly, entityType, openState, sourceFilter, sortField]);

  const kpis = useMemo(() => {
    const open = mockInboxLeads.filter(isOpenLead).length;
    const waiting = mockInboxLeads.filter(
      (row) => isOpenLead(row) && !row.action_intent,
    ).length;
    const duplicates = mockInboxLeads.filter(
      (row) => row.is_duplicate || (row.dup_count ?? 0) > 0,
    ).length;
    const requiresMapping = mockInboxLeads.filter(
      (row) => !row.entity_type || !row.action_intent,
    ).length;
    const overdue = mockInboxLeads.filter(isOverdue).length;
    const employerLeads = mockInboxLeads.filter((row) => row.entity_type === "ארגון").length;
    const candidateLeads = mockInboxLeads.filter((row) => row.entity_type === "מועמד").length;

    return {
      open,
      waiting,
      duplicates,
      requiresMapping,
      overdue,
      employerLeads,
      candidateLeads,
    };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-['Heebo']">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${BRAND.primary}15`,
                    color: BRAND.primary,
                  }}
                >
                  <Inbox className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Inbox</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    שער הכניסה של פניות, לידים ורשומות לבדיקה
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="me-2 h-4 w-4" />
                  רענון
                </Button>

                <Button
                  variant={duplicateOnly ? "default" : "outline"}
                  className="rounded-xl"
                  style={duplicateOnly ? { backgroundColor: BRAND.accent, color: "white" } : {}}
                  onClick={() => setDuplicateOnly((prev) => !prev)}
                >
                  <ShieldAlert className="me-2 h-4 w-4" />
                  כפילויות בלבד
                </Button>

                <Button
                  variant={openState === "open" ? "default" : "outline"}
                  className="rounded-xl"
                  style={openState === "open" ? { backgroundColor: BRAND.primary, color: "white" } : {}}
                  onClick={() => setOpenState((prev) => (prev === "open" ? "all" : "open"))}
                >
                  פתוחים בלבד
                </Button>

                <Button variant="outline" className="rounded-xl border-slate-200 bg-white">
                  export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <KpiCard label="סה״כ פתוחים" value={kpis.open} />
          <KpiCard label="ממתינים לטיפול" value={kpis.waiting} />
          <KpiCard label="כפילויות" value={kpis.duplicates} />
          <KpiCard label="דורש מיפוי" value={kpis.requiresMapping} />
          <KpiCard label="overdue follow-up" value={kpis.overdue} />
          <KpiCard label="candidate leads" value={kpis.candidateLeads} />
          <KpiCard label="employer leads" value={kpis.employerLeads} />
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,minmax(0,0.55fr))]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש שם / טלפון / phone_norm / מייל / facebook / record key"
                  className="rounded-xl border-slate-200 bg-slate-50 pe-10"
                />
              </div>

              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityTypeFilter)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              >
                <option value="all">כל סוגי הרשומה</option>
                <option value="מועמד">מועמד</option>
                <option value="ארגון">ארגון</option>
                <option value="unknown">unknown</option>
              </select>

              <select
                value={openState}
                onChange={(e) => setOpenState(e.target.value as OpenStateFilter)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              >
                <option value="all">כל המצבים</option>
                <option value="open">פתוחים</option>
                <option value="handled">טופלו</option>
                <option value="spam">spam</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              >
                <option value="all">כל המקורות</option>
                {mockSources.map((source) => (
                  <option key={source.id} value={String(source.id)}>
                    {source.name}
                  </option>
                ))}
              </select>

              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              >
                <option value="inbox_date">מיון: inbox_date</option>
                <option value="created_timestamp">מיון: created_timestamp</option>
                <option value="dup_count">מיון: dup_count</option>
                <option value="last_action_date">מיון: last_action_date</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" style={{ color: BRAND.primary }} />
                  <h2 className="text-lg font-bold text-slate-900">Inbox Table</h2>
                </div>
                <div className="text-sm text-slate-500">{rows.length} רשומות</div>
              </div>

              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  אין רשומות להצגה
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-3 text-right">שם</th>
                        <th className="px-3 py-3 text-right">טלפון</th>
                        <th className="px-3 py-3 text-right">אימייל</th>
                        <th className="px-3 py-3 text-right">מקור</th>
                        <th className="px-3 py-3 text-right">Entity</th>
                        <th className="px-3 py-3 text-right">Duplicate</th>
                        <th className="px-3 py-3 text-right">Match</th>
                        <th className="px-3 py-3 text-right">Action</th>
                        <th className="px-3 py-3 text-right">Follow-up</th>
                        <th className="px-3 py-3 text-right">תאריך</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.lead_id}
                          className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50"
                          onClick={() => setSelectedLeadId(row.lead_id)}
                        >
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{row.display_name || "—"}</div>
                            {row.temp_role ? (
                              <div className="mt-1 text-xs text-slate-500">{row.temp_role}</div>
                            ) : null}
                          </td>

                          <td className="px-3 py-3 text-slate-700">{row.phone || "—"}</td>

                          <td className="px-3 py-3 text-slate-700">{row.candidate_email || "—"}</td>

                          <td className="px-3 py-3 text-slate-700">
                            {dictName(mockSources, row.lead_source)}
                          </td>

                          <td className="px-3 py-3">
                            <Badge
                              className={`rounded-full border px-3 py-1 text-xs shadow-none ${getEntityBadgeClass(
                                row.entity_type,
                              )}`}
                            >
                              {row.entity_type || "unknown"}
                            </Badge>
                          </td>

                          <td className="px-3 py-3">
                            {getDuplicateSignal(row) ? (
                              <Badge className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 shadow-none">
                                {getDuplicateSignal(row)} ({row.dup_count ?? 0})
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-slate-700">{getMatchSummary(row)}</td>

                          <td className="px-3 py-3 text-slate-700">{row.action_intent || "—"}</td>

                          <td className="px-3 py-3">
                            {row.next_follow_up ? (
                              <div className="space-y-1">
                                <div className="text-slate-700">{formatDate(row.next_follow_up)}</div>
                                {isOverdue(row) ? (
                                  <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 shadow-none">
                                    overdue
                                  </Badge>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-slate-700">
                            {formatDate(row.inbox_date || row.created_timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: BRAND.primary }} />
                <h2 className="text-lg font-bold text-slate-900">Lead Decision Sheet</h2>
              </div>

              {!selectedLead ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  בחרי רשומה מהטבלה כדי לראות פירוט והחלטה
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          {selectedLead.display_name || "—"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge
                            className={`rounded-full border px-3 py-1 text-xs shadow-none ${getEntityBadgeClass(
                              selectedLead.entity_type,
                            )}`}
                          >
                            {selectedLead.entity_type || "unknown"}
                          </Badge>

                          {getDuplicateSignal(selectedLead) ? (
                            <Badge className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 shadow-none">
                              כפילות ({selectedLead.dup_count ?? 0})
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <DetailRow label="lead_id" value={selectedLead.lead_id} />
                    <DetailRow label="record_key" value={selectedLead.record_key || "—"} />
                    <DetailRow label="מקור" value={dictName(mockSources, selectedLead.lead_source)} />
                    <DetailRow label="תאריך כניסה" value={formatDateTime(selectedLead.inbox_date)} />
                    <DetailRow label="טלפון" value={selectedLead.phone || "—"} />
                    <DetailRow label="phone_norm" value={selectedLead.phone_norm || "—"} />
                    <DetailRow label="אימייל" value={selectedLead.candidate_email || "—"} />
                    <DetailRow label="facebook_name" value={selectedLead.facebook_name || "—"} />
                    <DetailRow label="facebook_id" value={selectedLead.facebook_id || "—"} />
                    <DetailRow
                      label="facebook_url"
                      value={
                        selectedLead.facebook_url ? (
                          <a
                            href={selectedLead.facebook_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold hover:underline"
                            style={{ color: BRAND.primary }}
                          >
                            פתיחה ↗
                          </a>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <DetailRow label="temp_role" value={selectedLead.temp_role || "—"} />
                    <DetailRow label="temp_city" value={selectedLead.temp_city || "—"} />
                    <DetailRow
                      label="social_status"
                      value={dictName(mockSocialStatuses, selectedLead.social_status)}
                    />
                    <DetailRow
                      label="availability_upd"
                      value={dictName(mockAvailability, selectedLead.availability_upd)}
                    />
                    <DetailRow
                      label="check_status_upd"
                      value={dictName(mockCheckStatuses, selectedLead.check_status_upd)}
                    />
                    <DetailRow
                      label="account_status_upd"
                      value={dictName(mockAccountStatuses, selectedLead.account_status_upd)}
                    />
                    <DetailRow label="match_contact" value={selectedLead.match_contact || "—"} />
                    <DetailRow label="match_account" value={selectedLead.match_account || "—"} />
                    <DetailRow label="action_intent" value={selectedLead.action_intent || "—"} />
                    <DetailRow label="last_action_date" value={formatDateTime(selectedLead.last_action_date)} />
                    <DetailRow label="next_follow_up" value={formatDateTime(selectedLead.next_follow_up)} />
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-900">original_content</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {selectedLead.original_content || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-900">notes</div>
                    <Textarea
                      defaultValue={selectedLead.notes || ""}
                      placeholder="הערות החלטה / follow-up / review"
                      className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      className="rounded-xl text-white"
                      style={{ backgroundColor: BRAND.primary }}
                    >
                      <UserRound className="me-2 h-4 w-4" />
                      Create / Link Contact
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200 bg-white"
                    >
                      <Building2 className="me-2 h-4 w-4" />
                      Create / Link Account
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200 bg-white"
                    >
                      <CheckCircle2 className="me-2 h-4 w-4" />
                      Mark Handled
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <AlertTriangle className="me-2 h-4 w-4" />
                      Mark Spam
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedLead.phone ? (
                      <a href={buildWhatsAppLink(selectedLead.phone)} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 bg-white">
                          <Phone className="me-2 h-4 w-4" />
                          WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <Button disabled variant="outline" className="rounded-xl border-slate-200 bg-white">
                        <Phone className="me-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                    )}

                    {selectedLead.candidate_email ? (
                      <a href={`mailto:${selectedLead.candidate_email}`}>
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 bg-white">
                          <Mail className="me-2 h-4 w-4" />
                          אימייל
                        </Button>
                      </a>
                    ) : (
                      <Button disabled variant="outline" className="rounded-xl border-slate-200 bg-white">
                        <Mail className="me-2 h-4 w-4" />
                        אימייל
                      </Button>
                    )}

                    {selectedLead.facebook_url ? (
                      <a href={selectedLead.facebook_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 bg-white">
                          <Facebook className="me-2 h-4 w-4" />
                          Facebook
                        </Button>
                      </a>
                    ) : (
                      <Button disabled variant="outline" className="rounded-xl border-slate-200 bg-white">
                        <Facebook className="me-2 h-4 w-4" />
                        Facebook
                      </Button>
                    )}

                    <Button variant="outline" className="rounded-xl border-slate-200 bg-white">
                      <CalendarClock className="me-2 h-4 w-4" />
                      Assign Follow-up
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    Match summary: {getMatchSummary(selectedLead)}
                    {selectedLead.match_contact ? (
                      <div className="mt-2">
                        contact:{" "}
                        {mockContacts.find((c) => c.contact_id === selectedLead.match_contact)?.full_name ||
                          selectedLead.match_contact}
                      </div>
                    ) : null}
                    {selectedLead.match_account ? (
                      <div className="mt-1">
                        account:{" "}
                        {mockAccounts.find((a) => a.account_id === selectedLead.match_account)?.account_name ||
                          selectedLead.match_account}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}