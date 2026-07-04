import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import type { DictItem } from "@/hooks/useContact360";

export type FieldType = "text" | "number" | "textarea" | "select" | "multiselect";

export interface FieldDef {
  field: string;
  label: string;
  type: FieldType;
  options?: DictItem[]; // for select / multiselect
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
    for (const f of fields) init[f.field] = toLocal(f.type, values[f.field]);
    return init;
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: unknown) {
    setState((s) => ({ ...s, [field]: value }));
  }

  function toggleMulti(field: string, id: number) {
    setState((s) => {
      const cur = (s[field] as number[]) ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...s, [field]: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    for (const f of fields) patch[f.field] = toStored(f.type, state[f.field]);
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
          <label className="block text-sm font-bold text-slate-700">{f.label}</label>

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

          {f.type === "multiselect" && (
            <div className="flex flex-wrap gap-1.5">
              {(f.options ?? []).map((o) => {
                const active = ((state[f.field] as number[]) ?? []).includes(Number(o.id));
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleMulti(f.field, Number(o.id))}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                      active
                        ? "border-[#008080] bg-[#008080] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
                    }`}
                  >
                    {o.name}
                  </button>
                );
              })}
            </div>
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
