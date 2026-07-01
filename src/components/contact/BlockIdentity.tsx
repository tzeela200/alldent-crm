import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
}

function LV({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((d) => Number(d.id) === Number(id))?.name ?? "—";
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter(Number.isFinite);
}

function dictNames(list: { id: number; name: string }[], value: unknown): string[] {
  return toNumberArray(value)
    .map((id) => dictName(list, id))
    .filter((name) => name !== "—");
}

export default function BlockIdentity({ contact, dicts }: Props) {
  const fullName = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.display_name || "—";
  const languages = dictNames(dicts.languages, contact.languages);

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">פרטים אישיים ויצירת קשר</h3>
        <div className="divide-y divide-slate-100">
          <LV label="שם מלא" value={fullName} />
          <LV label="שם תצוגה" value={contact.display_name && contact.display_name !== fullName ? contact.display_name : undefined} />
          <LV label="נייד" value={contact.phone} />
          <LV label="נייד נוסף" value={contact.second_phone} />
          <LV label="אימייל" value={contact.email} />
          <LV label="אימייל נוסף" value={contact.second_email} />
          <LV label="מגדר" value={dictName(dicts.genders, contact.gender)} />
          <LV label="שנת לידה" value={contact.birth_year?.toString()} />
          <LV label="עיר" value={dictName(dicts.cities, contact.city_id)} />
          <LV label="אזור" value={dictName(dicts.regions, contact.region_id)} />
          {languages.length > 0 && (
            <div className="py-2">
              <div className="mb-2 text-sm text-slate-500">שפות</div>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((name) => (
                  <Badge key={name} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 shadow-none">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
