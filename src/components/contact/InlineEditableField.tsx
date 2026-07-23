import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DictionaryMultiSelect, type DictionaryOption } from "@/components/ui/DictionaryMultiSelect";
import { CityCombobox } from "@/components/ui/CityRegionPicker";
import { RoleSubRolePicker } from "@/components/ui/RoleSubRolePicker";

const BRAND_PRIMARY = "#008080";

type ScalarValue = string | number | boolean | null | undefined;
type FieldType = "text" | "email" | "tel" | "url" | "number" | "date" | "textarea" | "select" | "boolean";

type Option = { id: number | string; name: string };

type BaseProps = {
  label: string;
  value: ScalarValue;
  displayValue?: React.ReactNode;
  type?: FieldType;
  options?: Option[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  onSave: (value: string | number | boolean | null) => Promise<void> | void;
};

function normalizeDraft(value: ScalarValue, type: FieldType): string {
  if (value == null) return "";
  if (type === "boolean") return value ? "true" : "false";
  return String(value);
}

function parseDraft(value: string, type: FieldType): string | number | boolean | null {
  if (type === "boolean") return value === "true";
  if (type === "number") {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("יש להזין מספר תקין");
    return parsed;
  }
  if (type === "select") return value === "" ? null : Number.isNaN(Number(value)) ? value : Number(value);
  return value.trim() === "" ? null : value;
}

function ActionButtons({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={saving}
        className="h-9 rounded-xl px-3 text-white hover:bg-[#006666]"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        <span className="me-1">שמור</span>
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-9 rounded-xl border-slate-200 px-3">
        <X className="h-4 w-4" />
        <span className="me-1">ביטול</span>
      </Button>
    </div>
  );
}

export function InlineEditableField({
  label,
  value,
  displayValue,
  type = "text",
  options = [],
  placeholder,
  emptyText = "לא הוזן",
  disabled = false,
  onSave,
}: BaseProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => normalizeDraft(value, type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(normalizeDraft(value, type));
  }, [editing, type, value]);

  const visibleValue = displayValue ?? (value === null || value === undefined || value === "" ? null : String(value));

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(parseDraft(draft, type));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  function editor() {
    if (type === "textarea") {
      return (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="min-h-[110px] rounded-xl border-slate-200 text-base leading-7"
          dir="rtl"
        />
      );
    }

    if (type === "select") {
      return (
        <select
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#008080] focus:ring-2 focus:ring-teal-100"
          dir="rtl"
        >
          <option value="">— ללא ערך —</option>
          {options.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>{option.name}</option>
          ))}
        </select>
      );
    }

    if (type === "boolean") {
      return (
        <select
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#008080] focus:ring-2 focus:ring-teal-100"
          dir="rtl"
        >
          <option value="false">לא</option>
          <option value="true">כן</option>
        </select>
      );
    }

    const ltr = type === "email" || type === "tel" || type === "url" || type === "number" || type === "date";
    return (
      <Input
        type={type === "tel" ? "tel" : type === "url" ? "url" : type === "email" ? "email" : type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-slate-200 text-base"
        dir={ltr ? "ltr" : "rtl"}
        inputMode={type === "number" || type === "tel" ? "numeric" : undefined}
      />
    );
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>
        <div className="space-y-2">
          {editor()}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex min-h-12 items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <div className="flex min-w-0 items-start gap-2 text-start">
        <div className={`min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-6 ${visibleValue ? "text-slate-800" : "text-slate-400"}`}>
          {visibleValue || emptyText}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-0.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus:ring-2 focus:ring-teal-200"
            aria-label={`עריכת ${label}`}
            title={`עריכת ${label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

type MultiProps = {
  label: string;
  values: number[] | null | undefined;
  options: DictionaryOption[];
  onSave: (values: number[]) => Promise<void> | void;
  placeholder?: string;
  emptyText?: string;
};

export function InlineEditableMultiSelect({ label, values, options, onSave, placeholder = "חיפוש...", emptyText = "לא הוזן" }: MultiProps) {
  const normalized = useMemo(() => (Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : []), [values]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[]>(normalized);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(normalized);
  }, [editing, normalized]);

  const selected = options.filter((option) => normalized.includes(Number(option.id)));

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>
        <DictionaryMultiSelect options={options} value={draft} onChange={setDraft} placeholder={placeholder} maxHeightClassName="max-h-56" />
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-2"><ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} /></div>
      </div>
    );
  }

  return (
    <div className="group border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{label}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-[#008080] focus:outline-none focus:ring-2 focus:ring-teal-200"
          aria-label={`עריכת ${label}`}
          title={`עריכת ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span key={option.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700">{option.name}</span>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400">{emptyText}</div>
      )}
    </div>
  );
}

type CityItem = { id: number; name: string; region_id?: number | null };
type RegionItem = { id: number; name: string };

export function InlineEditableCity({
  cityId,
  regionId,
  cities,
  regions,
  onSave,
}: {
  cityId: number | null | undefined;
  regionId: number | null | undefined;
  cities: CityItem[];
  regions: RegionItem[];
  onSave: (cityId: number | null, regionId: number | null) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftCity, setDraftCity] = useState<number | null>(cityId ?? null);
  const [draftRegion, setDraftRegion] = useState<number | null>(regionId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraftCity(cityId ?? null);
      setDraftRegion(regionId ?? null);
    }
  }, [cityId, editing, regionId]);

  const cityName = cities.find((city) => Number(city.id) === Number(cityId))?.name;
  const regionName = regions.find((region) => Number(region.id) === Number(regionId))?.name;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(draftCity, draftRegion);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 text-sm font-medium text-slate-600">עיר ואזור</div>
        <CityCombobox
          cities={cities}
          value={draftCity}
          onChange={(nextCityId, nextRegionId) => {
            setDraftCity(nextCityId);
            setDraftRegion(nextRegionId);
          }}
          label="עיר"
          placeholder="חיפוש עיר..."
        />
        <div className="mt-2 text-sm text-slate-500">האזור יתעדכן לפי העיר שנבחרה.</div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-2"><ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} /></div>
      </div>
    );
  }

  return (
    <div className="group flex min-h-12 items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <span className="shrink-0 text-sm text-slate-500">עיר ואזור</span>
      <div className="flex items-start gap-2">
        <span className={`text-sm font-medium ${cityName || regionName ? "text-slate-800" : "text-slate-400"}`}>
          {[cityName, regionName].filter(Boolean).join(" · ") || "לא הוזן"}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080]" aria-label="עריכת עיר ואזור">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function InlineEditableName({
  firstName,
  lastName,
  displayName,
  onSave,
}: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  displayName?: string | null;
  onSave: (firstName: string | null, lastName: string | null) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      setFirst(firstName ?? "");
      setLast(lastName ?? "");
    }
  }, [editing, firstName, lastName]);

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || displayName || "לא הוזן";

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(first.trim() || null, last.trim() || null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 text-sm font-medium text-slate-600">שם</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="שם פרטי" className="h-11 rounded-xl border-slate-200 text-base" />
          <Input value={last} onChange={(event) => setLast(event.target.value)} placeholder="שם משפחה" className="h-11 rounded-xl border-slate-200 text-base" />
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-2"><ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} /></div>
      </div>
    );
  }

  return (
    <div className="group flex min-h-12 items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <span className="shrink-0 text-sm text-slate-500">שם מלא</span>
      <div className="flex items-start gap-2">
        <span className={`text-sm font-medium ${fullName === "לא הוזן" ? "text-slate-400" : "text-slate-800"}`}>{fullName}</span>
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080]" aria-label="עריכת שם">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function InlineEditableRoleSubRole({
  roleId,
  subRoleIds,
  roles,
  subRoles,
  onSave,
}: {
  roleId: number | null | undefined;
  subRoleIds: number[] | null | undefined;
  roles: { id: number; name: string }[];
  subRoles: { id: number; name: string; role_id: number | null }[];
  onSave: (roleId: number | null, subRoleIds: number[]) => Promise<void> | void;
}) {
  const normalizedSubRoles = useMemo(() => (Array.isArray(subRoleIds) ? subRoleIds.map(Number).filter(Number.isFinite) : []), [subRoleIds]);
  const [editing, setEditing] = useState(false);
  const [draftRole, setDraftRole] = useState<number | null>(roleId ?? null);
  const [draftSubRoles, setDraftSubRoles] = useState<number[]>(normalizedSubRoles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraftRole(roleId ?? null);
      setDraftSubRoles(normalizedSubRoles);
    }
  }, [editing, normalizedSubRoles, roleId]);

  const roleName = roles.find((role) => role.id === Number(roleId))?.name;
  const subRoleNames = subRoles.filter((subRole) => normalizedSubRoles.includes(Number(subRole.id))).map((subRole) => subRole.name);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(draftRole, draftSubRoles);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 text-sm font-medium text-slate-600">תפקיד ותת־תפקיד</div>
        <RoleSubRolePicker
          roleId={draftRole}
          subRoleIds={draftSubRoles}
          onRoleChange={setDraftRole}
          onSubRoleChange={setDraftSubRoles}
          variant="edit"
          roles={roles}
          subRoles={subRoles}
        />
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-2"><ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} /></div>
      </div>
    );
  }

  return (
    <div className="group border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">תפקיד ותת־תפקיד</span>
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080]" aria-label="עריכת תפקיד ותת־תפקיד">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {roleName || subRoleNames.length ? (
        <div className="flex flex-wrap gap-1.5">
          {roleName && <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-sm font-medium text-teal-800">{roleName}</span>}
          {subRoleNames.map((name) => <span key={name} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700">{name}</span>)}
        </div>
      ) : <div className="text-sm text-slate-400">לא הוזן</div>}
    </div>
  );
}

type PreviousEmployer = { name?: string; role?: string; years?: string; description?: string };

export function InlineEditablePreviousEmployers({
  value,
  onSave,
}: {
  value: PreviousEmployer[] | null | undefined;
  onSave: (value: PreviousEmployer[]) => Promise<void> | void;
}) {
  const normalized = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PreviousEmployer[]>(normalized);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(normalized.map((item) => ({ ...item })));
  }, [editing, normalized]);

  function update(index: number, field: keyof PreviousEmployer, nextValue: string) {
    setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: nextValue } : item));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const cleaned = draft
        .map((item) => ({
          name: item.name?.trim() || undefined,
          role: item.role?.trim() || undefined,
          years: item.years?.trim() || undefined,
          description: item.description?.trim() || undefined,
        }))
        .filter((item) => item.name || item.role || item.years || item.description);
      await onSave(cleaned);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="border-b border-slate-100 py-3 last:border-0" dir="rtl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">מעסיקים קודמים</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => [...current, {}])} className="h-9 rounded-xl border-slate-200">
            <Plus className="h-4 w-4" />
            <span className="me-1">הוסף</span>
          </Button>
        </div>
        <div className="space-y-3">
          {draft.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={item.name ?? ""} onChange={(event) => update(index, "name", event.target.value)} placeholder="שם המעסיק" className="h-10 rounded-xl" />
                <Input value={item.role ?? ""} onChange={(event) => update(index, "role", event.target.value)} placeholder="תפקיד" className="h-10 rounded-xl" />
                <Input value={item.years ?? ""} onChange={(event) => update(index, "years", event.target.value)} placeholder="תקופה / שנים" className="h-10 rounded-xl" dir="ltr" />
                <Button type="button" variant="outline" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  <span className="me-1">הסר</span>
                </Button>
              </div>
              <Textarea value={item.description ?? ""} onChange={(event) => update(index, "description", event.target.value)} placeholder="תיאור קצר" className="mt-2 min-h-[80px] rounded-xl" />
            </div>
          ))}
          {draft.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">אין מעסיקים קודמים. ניתן להוסיף.</div>}
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-2"><ActionButtons saving={saving} onSave={() => void save()} onCancel={() => { setEditing(false); setError(""); }} /></div>
      </div>
    );
  }

  return (
    <div className="group border-b border-slate-100 py-3 last:border-0" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">מעסיקים קודמים</span>
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-[#008080]" aria-label="עריכת מעסיקים קודמים">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {normalized.length ? (
        <div className="space-y-2">
          {normalized.map((employer, index) => (
            <div key={`${employer.name ?? "employer"}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">{employer.name || "מעסיק ללא שם"}</div>
              <div className="mt-1 text-sm text-slate-600">{[employer.role, employer.years].filter(Boolean).join(" · ")}</div>
              {employer.description && <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{employer.description}</div>}
            </div>
          ))}
        </div>
      ) : <div className="text-sm text-slate-400">לא הוזן</div>}
    </div>
  );
}
