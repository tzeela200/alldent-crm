import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  Tag,
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

/** תגית מועמד לתצוגה בכותרת — id של שורת contact_tags + השם לאחר פענוח מהמילון. */
export interface QuickTagChip {
  id: number;
  label: string;
}

const QUICK_TAG_PANEL_WIDTH = 256;

/**
 * תגיות מהירות בכותרת — הצגה והוספה של תגיות מועמד בלי לעבור ללשונית CRM.
 * הבורר אינו DropdownMenu של Radix כי הרשימה דורשת שדה חיפוש, ו-typeahead של
 * Radix חוטף את הקלדות המקלדת מתוך תפריט. הפאנל נפתח דרך Portal ל-document.body
 * ולא כ-absolute מקומי, כי כרטיס הכותרת הוא overflow-hidden והיה חותך אותו.
 */
function QuickTags({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
}: {
  tags: QuickTagChip[];
  availableTags: { id: number; name: string }[];
  onAddTag: (tagId: number) => Promise<void>;
  onRemoveTag: (rowId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      // RTL: יישור לקצה השמאלי של הכפתור, עם הצמדה לקצה החלון אם חורג.
      let left = rect.right - QUICK_TAG_PANEL_WIDTH;
      if (left + QUICK_TAG_PANEL_WIDTH > window.innerWidth - 8) left = window.innerWidth - QUICK_TAG_PANEL_WIDTH - 8;
      if (left < 8) left = 8;
      setCoords({ top: rect.bottom + 8, left });
    };
    reposition();
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Capture-phase scroll fires for the panel's own list too — closing on that
    // would make the tag list impossible to scroll.
    const onScroll = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim();
    if (!term) return availableTags;
    return availableTags.filter((tag) => tag.name.includes(term));
  }, [availableTags, search]);

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <Tag className="h-4 w-4 shrink-0" style={{ color: BRAND_PRIMARY }} />
      {tags.length === 0 && <span className="text-[13px] text-slate-400">אין תגיות</span>}
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[13px] font-semibold text-slate-900"
        >
          {tag.label}
          <button
            type="button"
            onClick={() => onRemoveTag(tag.id)}
            className="text-slate-400 hover:text-red-600"
            aria-label={`הסרת התגית ${tag.label}`}
            title="הסרת תגית"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <div>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={availableTags.length === 0}
          className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-dashed border-[#008080] bg-white px-2.5 text-[13px] font-semibold text-[#008080] hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          aria-haspopup="true"
          aria-expanded={open}
          title={availableTags.length === 0 ? "כל תגיות המילון כבר משויכות" : "הוספת תגית מהירה"}
        >
          <Plus className="h-3.5 w-3.5" />
          תגית
        </button>

        {open && createPortal(
          <div
            ref={panelRef}
            dir="rtl"
            style={{ position: "fixed", top: coords.top, left: coords.left, width: QUICK_TAG_PANEL_WIDTH }}
            className="z-[9999] rounded-2xl border border-[#D9D9D9] bg-white p-2 shadow-xl"
          >
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="חיפוש תגית..."
              className="mb-2 h-9 rounded-xl border-slate-200 text-[13px]"
            />
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2 py-3 text-center text-[13px] text-slate-400">לא נמצאה תגית</div>
              ) : (
                filtered.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={pendingId !== null}
                    onClick={async () => {
                      setPendingId(tag.id);
                      try {
                        await onAddTag(tag.id);
                        setOpen(false);
                      } finally {
                        setPendingId(null);
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-right text-[13px] text-slate-700 hover:bg-slate-100 hover:text-[#008080] disabled:opacity-50"
                  >
                    {tag.name}
                    {pendingId === tag.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts | undefined;
  profileTypeIds: number[];
  completion: number;
  tags: QuickTagChip[];
  availableTags: { id: number; name: string }[];
  onAddTag: (tagId: number) => Promise<void>;
  onRemoveTag: (rowId: number) => void;
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
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
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

          <div className="mt-5 grid gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
            <div>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                <span>{completion}% שלמות פרופיל</span>
                <Sparkles className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-full rounded-full" style={{ width: `${completion}%`, backgroundColor: BRAND_PRIMARY }} />
              </div>
            </div>
            <div className="border-t border-[#E5E7EB] pt-3 lg:border-s lg:border-t-0 lg:pe-4 lg:pt-0">
              <QuickTags
                tags={tags}
                availableTags={availableTags}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
              />
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
