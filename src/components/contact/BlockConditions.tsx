import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
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

function LV({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function Chips({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((name) => (
          <Badge key={name} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 shadow-none">
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function BlockConditions({ contact, dicts }: Props) {
  const preferredRegionNames = dictNames(dicts.regions, contact.preferred_regions);
  const preferredCityNames = dictNames(dicts.cities, contact.preferred_cities);
  const availabilityNames = dictNames(dicts.availability, contact.candidate_availability_ids);
  const scopeNames = dictNames(dicts.scopes, contact.preferred_scope);
  const salaryTypeNames = dictNames(dicts.salaryTypes, contact.candidate_salary_type_ids);

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">תנאים והעדפות לתעסוקה</h3>
        <div className="divide-y divide-slate-100">
          <LV label="ניידות" value={dictName(dicts.mobility, contact.mobility_id)} />
          <LV label="מיסוי" value={dictName(dicts.taxTypes, contact.tax_type_id)} />
          <LV label="שכר חודשי" value={contact.salary_expectation_monthly ? `₪${contact.salary_expectation_monthly.toLocaleString("he-IL")}` : undefined} />
          <LV label="שכר שעתי" value={contact.salary_expectation_hourly ? `₪${contact.salary_expectation_hourly.toLocaleString("he-IL")}` : undefined} />
          <LV label="הערות ימים ושעות" value={contact.work_schedule_text} />
          <LV label="רלוונטי לכל הארץ" value={contact.preferred_all_country ? "כן" : undefined} />
        </div>
        <Chips label="זמינות מועמד/ת" values={availabilityNames} />
        <Chips label="היקפי משרה רלוונטיים" values={scopeNames} />
        <Chips label="סוגי שכר רלוונטיים" values={salaryTypeNames} />
        <Chips label="אזורים רלוונטיים לעבודה" values={preferredRegionNames} />
        <Chips label="ערים רלוונטיות לעבודה" values={preferredCityNames} />
      </CardContent>
    </Card>
  );
}
