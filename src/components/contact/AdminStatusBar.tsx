import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts | undefined;
  onEdit: () => void;
}

function dictName(items: { id: number; name: string }[], value: number | null | undefined): string {
  if (value == null) return "—";
  return items.find((d) => d.id === Number(value))?.name ?? "—";
}

function checkBadgeClass(status: number | string | null | undefined): string {
  const n = Number(status);
  if (n === 3) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (n === 2) return "border-red-200 bg-red-50 text-red-700";
  if (n === 4) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

interface StatusItem {
  label: string;
  value: string;
  badgeClass?: string;
}

function StatusBadge({ label, value, badgeClass }: StatusItem) {
  if (!value || value === "—") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <Badge
        className={`w-fit rounded-full border px-3 text-xs font-semibold shadow-none ${badgeClass ?? "border-slate-200 bg-[#F3F4F6] text-slate-600"}`}
      >
        {value}
      </Badge>
    </div>
  );
}

export function AdminStatusBar({ contact, dicts, onEdit }: Props) {
  const checkStatusName = dictName(dicts?.checkStatuses ?? [], contact.check_status);
  const workStatusName = dictName(dicts?.workStatuses ?? [], contact.work_status);
  const socialStatusName = dictName(dicts?.socialStatuses ?? [], contact.social_status);
  const sourceName = dictName(dicts?.sources ?? [], contact.source);
  const profileTypeName = dictName(dicts?.profileTypes ?? [], contact.profile_type);

  const hasAnyStatus =
    checkStatusName !== "—" ||
    workStatusName !== "—" ||
    socialStatusName !== "—" ||
    sourceName !== "—" ||
    profileTypeName !== "—";

  if (!hasAnyStatus) return null;

  return (
    <Card className="rounded-2xl border border-red-100 bg-red-50/30 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-red-700">🔒 אזור אדמין — סטטוסים</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-slate-200 text-xs"
            onClick={onEdit}
          >
            <Pencil className="me-1.5 h-3 w-3" />
            עריכה
          </Button>
        </div>
        <div className="flex flex-wrap gap-6">
          <StatusBadge
            label="סטטוס בדיקה"
            value={checkStatusName}
            badgeClass={checkBadgeClass(contact.check_status)}
          />
          <StatusBadge
            label="סטטוס תעסוקה"
            value={workStatusName}
            badgeClass="border-blue-100 bg-blue-50 text-blue-700"
          />
          <StatusBadge
            label="סטטוס קשר במדיה"
            value={socialStatusName}
          />
          <StatusBadge
            label="מקור"
            value={sourceName}
          />
          <StatusBadge
            label="סוג פרופיל"
            value={profileTypeName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
