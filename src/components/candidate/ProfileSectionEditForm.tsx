import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DictionaryMultiSelect } from "@/components/ui/DictionaryMultiSelect";
import { CityRegionPicker } from "@/components/ui/CityRegionPicker";
import { Loader2, Check, X } from "lucide-react";
import type { CityItem, DictItem } from "@/hooks/useContact360";

export type FieldType = "text" | "number" | "textarea" | "select" | "multiselect" | "cityregion";

export interface FieldDef {
  field: string;
  label: string;
  type: FieldType;
  options?: DictItem[]; // for select / multiselect
  /** Live dict_cities rows — required for type "cityregion". */
  cities?: CityItem[];
  /** Live dict_regions rows — required for type "cityregion". */
  regions?: DictItem[];
  /**
   * The region column written alongside the city. Region is derived from
   * dict_cities.region_id and is never chosen in a way that contradicts the
   * selected city, so the two travel together as one field.
   */
  regionField?: string;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}

interface ProfileSectionEditFormProps {
  fields: FieldDef[];
  values: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

// Normalizes a stored value into local editable state.
function toLocal(type: FieldType, v: unknown): unknown {
  if (type === "multiselect") {
    return Array.isArray(v) ? (v as number[]).map(Number) : [];
  }
  if (type === "cityregion") {
    return v == null ? null : Number(v);
  }
  if (type === "select") {
    return v == null ? "" : String(v);
  }
  if (type === "number") {
    return v == null ? "" : String(v);
  }
  return v == null ? "" : String(v);
}

// Converts local editable state back into the value to persist.
function toStored(type: FieldType, v: unknown): unknown {
  if (type === "multiselect") {
    const arr = (v as number[]) ?? [];
    return arr.length ? arr : null;
  }
  if (type === "cityregion") {
    return v == null ? null : Number(v);
  }
  if (type === "select") {
    return v === "" || v == null ? null : Number(v);
  }
  if (type === "number") {
    return v === "" || v == null ? null : Number(v);
  }
  const s = (v as string) ?? "";
  return s.trim() === "" ? null : s;
}

export default function ProfileSectionEditForm({
  fields,
  values,
  onSave,
  onCancel,
}: ProfileSectionEditFormProps) {
  const [state, setState] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      init[f.field] = toLocal(f.type, values[f.field]);
      // Region is not a field of its own; seed it so the picker opens on the
      // person's current region instead of blank.
      if (f.type === "cityregion" && f.regionField) {
        init[f.regionField] = values[f.regionField] == null ? null : Number(values[f.regionField]);
      }
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: unknown) {
    setState((s) => ({ ...s, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    for (const f of fields) {
      patch[f.field] = toStored(f.type, state[f.field]);
      // Region rides along with the city; it is not a field of its own.
      if (f.type === "cityregion" && f.regionField) {
        const region = state[f.regionField];
        patch[f.regionField] = region == null ? null : Number(region);
      }
    }
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 space-y-4 no-print">
      {fields.map((f) => (
        <div key={f.field} className="space-y-1.5">
          {/* CityRegionPicker carries its own "עיר" / "אזור" labels. */}
          {f.type !== "cityregion" && (
            <label className="block text-sm font-bold text-slate-700">{f.label}</label>
          )}

          {f.type === "textarea" && (
            <Textarea
              value={(state[f.field] as string) ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set(f.field, e.target.value)}
              rows={4}
              dir={f.dir ?? "rtl"}
              placeholder={f.placeholder}
              className="rounded-xl border-slate-200 bg-white text-sm"
            />
          )}

          {(f.type === "text" || f.type === "number") && (
            <Input
              type={f.type === "number" ? "number" : "text"}
              value={(state[f.field] as string) ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(f.field, e.target.value)}
              dir={f.dir ?? "rtl"}
              placeholder={f.placeholder}
              className="rounded-xl border-slate-200 bg-white text-sm"
            />
          )}

          {f.type === "select" && (
            <select
              value={(state[f.field] as string) ?? ""}
              onChange={(e) => set(f.field, e.target.value)}
              dir="rtl"
              className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2"
            >
              <option value="">— בחר/י —</option>
              {(f.options ?? []).map((o) => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
          )}

          {f.type === "cityregion" && (
            <CityRegionPicker
              cityId={(state[f.field] as number | null) ?? null}
              regionId={f.regionField ? ((state[f.regionField] as number | null) ?? null) : null}
              onCityChange={(cityId) => set(f.field, cityId)}
              onRegionChange={(regionId) => f.regionField && set(f.regionField, regionId)}
              cities={f.cities ?? []}
              regions={f.regions ?? []}
              variant="edit"
            />
          )}

          {f.type === "multiselect" && (
            <DictionaryMultiSelect
              options={f.options ?? []}
              value={((state[f.field] as number[]) ?? []).map(Number)}
              onChange={(ids) => set(f.field, ids)}
              placeholder={f.placeholder ?? "חיפוש..."}
              maxHeightClassName="max-h-44"
            />
          )}

        </div>
      ))}

      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 me-1" />
          ביטול
        </Button>
        <Button
          size="sm"
          className="rounded-xl bg-[#008080] hover:bg-teal-700 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}
          שמור
        </Button>
      </div>
    </div>
  );
}
