import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null) return "—";
  return list.find((d) => d.id === Number(id))?.name ?? "—";
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

export default function BlockConditions({ contact, dicts }: Props) {
  const preferredRegionNames = Array.isArray(contact.preferred_regions)
    ? contact.preferred_regions.map((id) => dictName(dicts.regions, id)).filter((n) => n !== "—")
    : [];

  const preferredCityNames = Array.isArray(contact.preferred_cities)
    ? contact.preferred_cities.map((id) => dictName(dicts.cities, id)).filter((n) => n !== "—")
    : [];

  const showCities = preferredCityNames.slice(0, 5);
  const extraCities = preferredCityNames.length - 5;

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">תנאים והעדפות</h3>
        <div className="divide-y divide-slate-100">
          <LV label="זמינות" value={dictName(dicts.availability, contact.availability) !== "—" ? dictName(dicts.availability, contact.availability) : undefined} />
          <LV label="היקף מועדף" value={contact.preferred_scope} />
          <LV label="ניידות" value={dictName(dicts.mobility, contact.mobility_id) !== "—" ? dictName(dicts.mobility, contact.mobility_id) : undefined} />
          <LV label="מיסוי" value={dictName(dicts.taxTypes, contact.tax_type_id) !== "—" ? dictName(dicts.taxTypes, contact.tax_type_id) : undefined} />
          <LV label="שכר חודשי" value={contact.salary_expectation_monthly ? `₪${contact.salary_expectation_monthly.toLocaleString()}` : undefined} />
          <LV label="שכר שעתי" value={contact.salary_expectation_hourly ? `₪${contact.salary_expectation_hourly}` : undefined} />
        </div>

        {preferredRegionNames.length > 0 && (
          <div className="mt-3">
            <div className="text-sm text-slate-500 mb-2">אזורים מועדפים</div>
            <div className="flex flex-wrap gap-1.5">
              {preferredRegionNames.map((n) => (
                <Badge key={n} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">{n}</Badge>
              ))}
            </div>
          </div>
        )}

        {preferredCityNames.length > 0 && (
          <div className="mt-3">
            <div className="text-sm text-slate-500 mb-2">ערים מועדפות</div>
            <div className="flex flex-wrap gap-1.5">
              {showCities.map((n) => (
                <Badge key={n} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">{n}</Badge>
              ))}
              {extraCities > 0 && (
                <Badge className="rounded-full border border-slate-200 bg-slate-100 text-slate-500 px-2 py-0.5 text-xs shadow-none">
                  ועוד {extraCities}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
