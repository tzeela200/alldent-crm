import React, { useState } from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save } from "lucide-react";

const BRAND_PRIMARY = "#008080";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts | undefined;
  notes: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => void;
  notesSaving: boolean;
}

function dictName(items: { id: number; name: string }[], value: number | null | undefined): string {
  if (value == null) return "—";
  return items.find((d) => d.id === Number(value))?.name ?? "—";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

function checkBadgeClass(status: number | null | undefined): string {
  if (status === 3) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === 2) return "border-red-200 bg-red-50 text-red-700";
  if (status === 4) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

function LVMuted({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—" || value === false) return null;
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1 last:border-0">
      <span className="shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-500">{value}</span>
    </div>
  );
}

export function BlockCRM({ contact, dicts, notes, onNotesChange, onSaveNotes, notesSaving }: Props) {
  const [techExpanded, setTechExpanded] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* CRM card */}
      <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">CRM</h3>
          <div className="divide-y divide-slate-100">
            <LV label="מקור" value={dictName(dicts?.sources ?? [], contact.source)} />
            <LV
              label="בדיקת תוכן"
              value={
                <Badge
                  className={`h-[30px] rounded-full border px-3 text-xs shadow-none ${checkBadgeClass(contact.check_status)}`}
                >
                  {dictName(dicts?.checkStatuses ?? [], contact.check_status)}
                </Badge>
              }
            />
            <LV label="קשר אחרון" value={formatDateTime(contact.last_contact_date)} />
            <LV label="פולואפ הבא" value={formatDateTime(contact.next_follow_up)} />
            <LV label="וואטסאפ אחרון" value={formatDateTime(contact.whatsapp_campaign_last_sent)} />
            <LV label="הגשות קודמות" value={contact.prev_applications_count != null ? String(contact.prev_applications_count) : undefined} />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[13px] font-medium text-slate-500">הערות</div>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(e.target.value)}
              className="min-h-[100px] rounded-2xl border-slate-200 bg-[#F3F4F6] text-sm"
              placeholder="הוסף/י הערה חופשית..."
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                className="h-10 rounded-xl text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
                onClick={onSaveNotes}
                disabled={notesSaving}
              >
                <Save className="me-1.5 h-3.5 w-3.5" />
                {notesSaving ? "שומר..." : "שמור הערות"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata card — collapsed by default */}
      <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">מטאדאטה</h3>
          <div className="divide-y divide-slate-100 text-sm">
            <LV label="סוג פרופיל" value={dictName(dicts?.profileTypes ?? [], contact.profile_type)} />
            <LV label="נוצר" value={formatDateTime(contact.created_timestamp)} />
            <LV label="עודכן" value={formatDateTime(contact.updated_timestamp)} />
          </div>

          {/* Collapsed technical section */}
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
            onClick={() => setTechExpanded((v) => !v)}
          >
            <span>מתקדם (טכני)</span>
            {techExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {techExpanded && (
            <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <LVMuted
                label="מזהה פנימי"
                value={<span className="font-mono">{contact.contact_id}</span>}
              />
              <LVMuted
                label="טלפון מנורמל"
                value={<span className="font-mono">{contact.phone_norm}</span>}
              />
              <LVMuted
                label="כפילות אימייל"
                value={contact.dup_email_flag ? "כן" : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
