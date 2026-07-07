import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { getRoleColorHex } from "@/lib/roleColors";
import { applicationHasCv, openApplicationCv } from "@/lib/cv";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Facebook,
  FileText,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Sparkles,
  User2,
} from "lucide-react";

const BRAND_PRIMARY = "#008080";

function dictName(items: { id: number; name: string }[], value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const found = items.find((item) => Number(item.id) === Number(value));
  if (found) return found.name;
  // Only return the raw string if it's clearly not a numeric ID
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return value;
  return "—";
}

function dictNames(items: { id: number; name: string }[], values: unknown): string {
  if (!Array.isArray(values) || !values.length) return "—";
  const names = (values as unknown[]).map((id) => dictName(items, id as number)).filter((n) => n !== "—");
  return names.length ? names.join(", ") : "—";
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).map(Number).filter(Number.isFinite);
}

function buildWhatsAppLink(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("0") ? "972" + cleaned.slice(1) : cleaned;
  return `https://wa.me/${intl}`;
}

function availabilityBadgeClass(id: number | null): string {
  const n = Number(id);
  if (n === 1 || n === 2 || n === 7) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (n === 3) return "border-blue-200 bg-blue-50 text-blue-700";
  if (n === 4) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-[#F3F4F6] text-slate-600";
}

function checkBadgeClass(status: number | null | undefined): string {
  switch (Number(status)) {
    case 1:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 2:
      return "border-red-200 bg-red-50 text-red-700";
    case 3:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 4:
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

interface KpiCardProps {
  value: React.ReactNode;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

function KpiCard({ value, label, icon, accentColor, onClick, children }: KpiCardProps) {
  return (
    <div
      className="relative rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]"
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      {children}
    </div>
  );
}

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts | undefined;
  completion: number;
  recommendedJobsCount: number;
  applicationsCount: number;
  activeApplicationsCount: number;
  resolvedId: number;
  onEdit: () => void;
  onOpenCreateApp: () => void;
  onUpdateCheckStatus: (statusId: number) => void;
  onCopyLink: () => void;
  statusDropdownOpen: boolean;
  onToggleStatusDropdown: () => void;
}

export function Candidate360Hero({
  contact,
  dicts,
  completion,
  recommendedJobsCount,
  applicationsCount,
  activeApplicationsCount,
  resolvedId,
  onEdit,
  onOpenCreateApp,
  onUpdateCheckStatus,
  onCopyLink,
  statusDropdownOpen,
  onToggleStatusDropdown,
}: Props) {
  const roleName = dictName(dicts?.roles ?? [], contact.role);
  const roleAccentColor = getRoleColorHex(contact.role);

  const subRoleParts = toNumberArray(contact.sub_role).map((id) =>
    dictName(dicts?.subRoles ?? [], id),
  );
  const roleText =
    contact.professional_title ||
    [roleName, ...subRoleParts].filter((t) => t && t !== "—").join(" · ");

  const cityName = dictName(dicts?.cities ?? [], contact.city_id);
  const regionName = dictName(dicts?.regions ?? [], contact.region_id);
  const roleLocationText = [cityName, regionName]
    .filter((t) => t && t !== "—" && !/^\d+$/.test(t))
    .join(" · ");

  const hasCv = applicationHasCv(contact);
  const firstAvailabilityId = toNumberArray(contact.candidate_availability_ids)[0] ?? null;

  return (
    <>
      {/* Hero card */}
      <Card className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <div className="h-1.5 w-full" style={{ backgroundColor: roleAccentColor }} />
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            {/* Left — identity */}
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
                  {(roleText || roleLocationText) && (
                    <div className="text-[17px] font-medium text-slate-600">
                      {[roleText, roleLocationText].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] pt-4">
                  {roleName !== "—" && (
                    <RoleBadge roleId={contact.role} label={roleName} />
                  )}
                  {toNumberArray(contact.candidate_availability_ids).length > 0 && (
                    <Badge
                      className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${availabilityBadgeClass(firstAvailabilityId)}`}
                    >
                      {dictNames(dicts?.availability ?? [], contact.candidate_availability_ids)}
                    </Badge>
                  )}
                  <Badge
                    className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${checkBadgeClass(contact.check_status)}`}
                  >
                    {dictName(dicts?.checkStatuses ?? [], contact.check_status)}
                  </Badge>
                  <Badge
                    className={`h-[30px] rounded-full border px-3 text-xs font-semibold shadow-none ${hasCv ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
                  >
                    {hasCv ? "קו״ח זמין" : "ללא קו״ח"}
                  </Badge>
                  {contact.cv_received_date && (
                    <Badge variant="outline" className="h-[30px] rounded-full border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                      קו״ח התקבלו: {formatDate(contact.cv_received_date)}
                    </Badge>
                  )}
                  {contact.experience != null && (
                    <Badge
                      variant="outline"
                      className="h-[30px] rounded-full border-slate-200 bg-[#F3F4F6] px-3 text-xs font-semibold"
                    >
                      ניסיון: {dictName(dicts?.experience ?? [], contact.experience)}
                    </Badge>
                  )}
                  {contact.work_status != null && (
                    <Badge
                      variant="outline"
                      className="h-[30px] rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700"
                    >
                      {dictName(dicts?.workStatuses ?? [], contact.work_status)}
                    </Badge>
                  )}
                  {toNumberArray(contact.languages).length > 0 && (
                    <Badge
                      variant="outline"
                      className="h-[30px] rounded-full border-slate-200 bg-[#F3F4F6] px-3 text-xs font-semibold"
                    >
                      {dictNames(dicts?.languages ?? [], contact.languages)}
                    </Badge>
                  )}
                  {contact.profile_type && (
                    <Badge
                      variant="outline"
                      className="h-[30px] rounded-full border-slate-200 bg-[#F3F4F6] px-3 text-xs font-semibold"
                    >
                      {dictName(dicts?.profileTypes ?? [], contact.profile_type)}
                    </Badge>
                  )}
                </div>

                {/* Contact info + completion */}
                <div className="grid gap-4 border-t border-[#E2E8F0] pt-4 xl:grid-cols-[1fr_260px] xl:items-center">
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-teal-600">
                        <Phone size={14} style={{ color: BRAND_PRIMARY }} />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-teal-600">
                        <Mail size={14} style={{ color: BRAND_PRIMARY }} />
                        {contact.email}
                      </a>
                    )}
                    {contact.facebook_url && (
                      <a
                        href={contact.facebook_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 hover:text-teal-600"
                      >
                        <Facebook size={14} style={{ color: BRAND_PRIMARY }} />
                        פייסבוק
                      </a>
                    )}
                    {(contact.city_id || contact.region_id) && roleLocationText && (
                      <span className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} style={{ color: BRAND_PRIMARY }} />
                        {roleLocationText}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm font-bold text-slate-900">
                      <span>{completion}% שלמות פרופיל</span>
                      <Sparkles className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${completion}%`, backgroundColor: BRAND_PRIMARY }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4"
                onClick={onEdit}
              >
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

              {hasCv && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-800 hover:bg-[#F3F4F6]"
                  onClick={() => void openApplicationCv(contact)}
                >
                  <FileText className="me-2 h-4 w-4" />
                  קו״ח
                </Button>
              )}

              <a
                href={contact.profile_token ? `/profile/${encodeURIComponent(contact.profile_token)}` : `/candidate/${resolvedId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  className="h-10 rounded-xl px-4 text-white hover:opacity-90"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  <User2 className="me-2 h-4 w-4" />
                  פתח פרופיל
                </Button>
              </a>

              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-800 hover:bg-[#F3F4F6]"
                onClick={onCopyLink}
              >
                <Link2 className="me-2 h-4 w-4" />
                שלח לינק למועמד
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          value={recommendedJobsCount}
          label="משרות מתאימות"
          icon={<FileText className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={applicationsCount}
          label="הגשות שנשלחו"
          icon={<FileText className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={activeApplicationsCount}
          label="הגשות לא מטופלות"
          icon={<FileText className="h-3.5 w-3.5" />}
          accentColor={activeApplicationsCount > 0 ? "#e11d48" : roleAccentColor}
        />
        <KpiCard
          value={<span className="text-sm">{formatDate(contact.last_contact_date)}</span>}
          label="קשר אחרון"
          icon={<FileText className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
        />
        <KpiCard
          value={
            <span className="text-sm">
              {dictName(dicts?.checkStatuses ?? [], contact.check_status)}
            </span>
          }
          label="סטטוס בדיקה ▾"
          icon={<User2 className="h-3.5 w-3.5" />}
          accentColor={roleAccentColor}
          onClick={onToggleStatusDropdown}
        >
          {statusDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-[#E2E8F0] bg-white text-right shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              {(dicts?.checkStatuses ?? []).map((s) => (
                <button
                  key={s.id}
                  className="block w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-[#F3F4F6]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCheckStatus(s.id);
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </KpiCard>
      </div>
    </>
  );
}
