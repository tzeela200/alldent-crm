import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
}

function LV({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null) return "—";
  return list.find((d) => d.id === Number(id))?.name ?? "—";
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BlockIdentity({ contact, dicts }: Props) {
  const fullName = contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">זהות ופרטי קשר</h3>
        <div className="divide-y divide-slate-100">
          <LV label="שם מלא" value={fullName} />
          <LV label="שם פרטי / משפחה"
            value={[contact.first_name, contact.last_name].filter(Boolean).join(" ") || undefined} />
          <LV label="נייד ראשי" value={contact.phone} />
          <LV label="נייד נוסף" value={contact.second_phone} />
          <LV label="אימייל" value={contact.email} />
          <LV label="אימייל נוסף" value={contact.second_email} />
          <LV label="מגדר" value={dictName(dicts.genders, contact.gender) !== "—" ? dictName(dicts.genders, contact.gender) : undefined} />
          <LV label="שנת לידה" value={contact.birth_year?.toString()} />
          <LV label="אזור" value={dictName(dicts.regions, contact.region_id) !== "—" ? dictName(dicts.regions, contact.region_id) : undefined} />
          <LV label="עיר" value={dictName(dicts.cities, contact.city_id) !== "—" ? dictName(dicts.cities, contact.city_id) : undefined} />
          {(contact.languages || dicts.languages.length > 0) && (
            <div className="py-2">
              <div className="text-sm text-slate-500 mb-2">שפות</div>
              {contact.languages && (
                <div className="text-sm font-medium text-slate-800 mb-1">{contact.languages}</div>
              )}
              {dicts.languages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {dicts.languages.map((l) => (
                    <Badge key={l.id} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">
                      {l.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
