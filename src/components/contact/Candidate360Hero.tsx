import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { getRoleColorHex } from "@/lib/roleColors";
import { applicationHasCv, openApplicationCv } from "@/lib/cv";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CityCombobox } from "@/components/ui/CityRegionPicker";
import PhotoUpload from "@/components/candidate/PhotoUpload";
import {
  CalendarClock,
  Check,
  Facebook,
  FileText,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  User2,
  X,
} from "lucide-react";

const BRAND_PRIMARY = "#008080";

function dictName(items: { id: number; name: string }[], value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const found = items.find((item) => Number(item.id) === Number(value));
  if (found) return found.name;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return value;
  return "—";
}

function dictNames(items: { id: number; name: string }[], values: unknown): string {
  if (!Array.isArray(values) || !values.length) return "—";
  const names = values.map((id) => dictName(items, id as number)).filter((name) => name !== "—");
  return names.length ? names.join(", ") : "—";
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter(Number.isFinite);
}

function buildWhatsAppLink(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("0") ? `972${cleaned.slice(1)}` : cleaned;
  return `https://wa.me/${intl}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("he-IL");
}

function availabilityBadgeClass(id: number | null): string {
  const value = Number(id);
  if (value === 1 || value === 2 || value === 7) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === 3) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === 4) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function KpiCard({ value, label, icon, accentColor }: { value: ReactNode; label: string; icon: ReactNode; accentColor: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div className="text-2xl font-bold leading-[1.1] text-slate-900">{value}</div>
    </div>
  );
}

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts | undefined;
  profileTypeIds: number[];
  completion: number;
  recommendedJobsCount: number;
  applicationsCount: number;
  activeApplicationsCount: number;
  resolvedId: number;
  onOpenCreateApp: () => void;
  onCopyLink: () => void;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}

export function Candidate360Hero({
  contact,
  dicts,
  profileTypeIds,
  completion,
  recommendedJobsCount,
  applicationsCount,
  activeApplicationsCount,
  resolvedId,
  onOpenCreateApp,
  onCopyLink,
  onUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    professional_title: contact.professional_title ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    city_id: contact.city_id ?? null as number | null,
    region_id: contact.region_id ?? null as number | null,
  });

  useEffect(() => {
    if (!editing) {
      setDraft({
        first_name: contact.first_name ?? "",
        last_name: contact.last_name ?? "",
        professional_title: contact.professional_title ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        city_id: contact.city_id ?? null,
        region_id: contact.region_id ?? null,
      });
    }
  }, [contact, editing]);

  const roleName = dictName(dicts?.roles ?? [], contact.role);
  const roleAccentColor = getRoleColorHex(contact.role);
  const subRoleParts = toNumberArray(contact.sub_role).map((id) => dictName(dicts?.subRoles ?? [], id)).filter((name) => name !== "—");
  const roleText = contact.professional_title || [roleName, ...subRoleParts].filter((text) => text && text !== "—").join(" · ");
  const cityName = dictName(dicts?.cities ?? [], contact.city_id);
  const regionName = dictName(dicts?.regions ?? [], contact.region_id);
  const locationText = [cityName, regionName].filter((text) => text && text !== "—").join(" · ");
  const hasCv = applicationHasCv(contact);
  const firstAvailabilityId = toNumberArray(contact.candidate_availability_ids)[0] ?? null;

  const profileNames = useMemo(
    () => profileTypeIds.map((id) => dictName(dicts?.profileTypes ?? [], id)).filter((name) => name !== "—"),
    [dicts?.profileTypes, profileTypeIds],
  );

  async function saveHero() {
    setSaving(true);
    setError("");
    try {
      const firstName = draft.first_name.trim() || null;
      const lastName = draft.last_name.trim() || null;
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
      const shouldSyncDisplay = !contact.display_name || contact.display_name === contact.full_name;
      await onUpdate({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        ...(shouldSyncDisplay ? { display_name: fullName } : {}),
        professional_title: draft.professional_title.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        city_id: draft.city_id,
        region_id: draft.region_id,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <div className="h-1.5 w-full" style={{ backgroundColor: roleAccentColor }} />
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex min-w-0 gap-5">
              <PhotoUpload
                contactId={contact.contact_id}
                currentUrl={contact.photo_url}
                initial={(contact.full_name || contact.display_name || "?").charAt(0)}
                onUploaded={async (url) => {
                  await onUpdate({ photo_url: url });
                }}
              />

              <div className="min-w-0 flex-1">
                {!editing ? (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <h1 className="break-words text-[32px] font-bold leading-[1.2] text-slate-900">
                          {contact.full_name || contact.display_name || "ללא שם"}
                        </h1>
                        {(roleText || locationText) && (
                          <div className="mt-2 text-base font-medium leading-7 text-slate-600">
                            {[roleText, locationText].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus:ring-2 focus:ring-teal-200"
                        aria-label="עריכת פרטי הכותרת"
                        title="עריכת פרטי הכותרת"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-4">
                      {roleName !== "—" && <RoleBadge roleId={contact.role} label={roleName} />}
                      {toNumberArray(contact.candidate_availability_ids).length > 0 && (
                        <Badge className={`h-[30px] rounded-full border px-3 text-sm font-medium shadow-none ${availabilityBadgeClass(firstAvailabilityId)}`}>
                          {dictNames(dicts?.availability ?? [], contact.candidate_availability_ids)}
                        </Badge>
                      )}
                      <Badge className={`h-[30px] rounded-full border px-3 text-sm font-medium shadow-none ${hasCv ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                        {hasCv ? "קו״ח קיים · ניתן לסריקה" : "אין קו״ח"}
                      </Badge>
                      {contact.experience != null && (
                        <Badge variant="outline" className="h-[30px] rounded-full border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                          ניסיון: {dictName(dicts?.experience ?? [], contact.experience)}
                        </Badge>
                      )}
                      {profileNames.map((name) => (
                        <Badge key={name} variant="outline" className="h-[30px] rounded-full border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                          {name}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#E5E7EB] pt-4 text-sm text-slate-600">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-[#008080]" dir="ltr">
                          <Phone className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-[#008080]" dir="ltr">
                          <Mail className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                          {contact.email}
                        </a>
                      )}
                      {contact.facebook_url && (
                        <a href={contact.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#008080]">
                          <Facebook className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                          פייסבוק
                        </a>
                      )}
                      {locationText && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                          {locationText}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                    <div className="mb-3 text-base font-semibold text-slate-900">עריכת פרטי הכותרת</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input value={draft.first_name} onChange={(event) => setDraft((current) => ({ ...current, first_name: event.target.value }))} placeholder="שם פרטי" className="h-11 rounded-xl bg-white" />
                      <Input value={draft.last_name} onChange={(event) => setDraft((current) => ({ ...current, last_name: event.target.value }))} placeholder="שם משפחה" className="h-11 rounded-xl bg-white" />
                      <Input value={draft.professional_title} onChange={(event) => setDraft((current) => ({ ...current, professional_title: event.target.value }))} placeholder="כותרת מקצועית" className="h-11 rounded-xl bg-white sm:col-span-2" />
                      <Input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="נייד" className="h-11 rounded-xl bg-white" dir="ltr" />
                      <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="אימייל" className="h-11 rounded-xl bg-white" dir="ltr" />
                      <div className="sm:col-span-2">
                        <CityCombobox
                          cities={dicts?.cities ?? []}
                          value={draft.city_id}
                          onChange={(cityId, regionId) => setDraft((current) => ({ ...current, city_id: cityId, region_id: regionId }))}
                          label="עיר"
                          placeholder="חיפוש עיר..."
                        />
                      </div>
                    </div>
                    {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
                    <div className="mt-3 flex gap-2">
                      <Button type="button" onClick={() => void saveHero()} disabled={saving} className="h-10 rounded-xl bg-[#008080] text-white hover:bg-[#006666]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span className="me-1">שמור</span>
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setEditing(false); setError(""); }} disabled={saving} className="h-10 rounded-xl border-slate-200">
                        <X className="h-4 w-4" />
                        <span className="me-1">ביטול</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[390px] lg:justify-end">
              <Button onClick={onOpenCreateApp} className="h-10 rounded-xl bg-[#008080] px-4 text-white hover:bg-[#006666]">
                <Plus className="h-4 w-4" />
                <span className="me-2">הגשה חדשה</span>
              </Button>
              {contact.phone && (
                <a href={buildWhatsAppLink(contact.phone)} target="_blank" rel="noreferrer">
                  <Button className="h-10 rounded-xl bg-green-600 px-4 text-white hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" />
                    <span className="me-2">WhatsApp</span>
                  </Button>
                </a>
              )}
              {hasCv && (
                <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4" onClick={() => void openApplicationCv(contact)}>
                  <FileText className="h-4 w-4" />
                  <span className="me-2">קו״ח</span>
                </Button>
              )}
              <a href={contact.profile_token ? `/profile/${encodeURIComponent(contact.profile_token)}` : `/candidate/${resolvedId}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4">
                  <User2 className="h-4 w-4" />
                  <span className="me-2">פתח פרופיל</span>
                </Button>
              </a>
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4" onClick={onCopyLink}>
                <Link2 className="h-4 w-4" />
                <span className="me-2">העתק קישור</span>
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-slate-900">
              <span>{completion}% שלמות פרופיל</span>
              <Sparkles className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div className="h-full rounded-full" style={{ width: `${completion}%`, backgroundColor: BRAND_PRIMARY }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard value={recommendedJobsCount} label="משרות מתאימות" icon={<FileText className="h-4 w-4" />} accentColor={roleAccentColor} />
        <KpiCard value={applicationsCount} label="סך הגשות" icon={<FileText className="h-4 w-4" />} accentColor={roleAccentColor} />
        <KpiCard value={activeApplicationsCount} label="הגשות פעילות" icon={<FileText className="h-4 w-4" />} accentColor={activeApplicationsCount > 0 ? "#DC2626" : roleAccentColor} />
        <KpiCard value={<span className="text-base">{formatDate(contact.last_contact_date)}</span>} label="קשר אחרון" icon={<CalendarClock className="h-4 w-4" />} accentColor={roleAccentColor} />
        <KpiCard value={<span className="text-base">{formatDate(contact.next_follow_up)}</span>} label="פולואפ הבא" icon={<CalendarClock className="h-4 w-4" />} accentColor={roleAccentColor} />
      </div>
    </>
  );
}
