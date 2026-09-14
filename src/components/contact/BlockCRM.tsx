import { useState, type ReactNode } from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InlineEditableField } from "@/components/contact/InlineEditableField";
import { publicationOutcomeLabel } from '@/lib/fixPublications/deliveryOutcome'

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((item) => Number(item.id) === Number(id))?.name ?? "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("he-IL");
}

function ReadOnlyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-start text-sm font-medium text-slate-700">{value || "—"}</span>
    </div>
  );
}

export function BlockCRM({ contact, dicts, onUpdate }: Props) {
  const [technicalOpen, setTechnicalOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">CRM ותפעול</h2>
          <div>
            <InlineEditableField
              label="מקור הרשומה"
              value={contact.source}
              displayValue={dictName(dicts.sources, contact.source)}
              type="select"
              options={dicts.sources}
              onSave={(value) => onUpdate({ source: value })}
            />
            <InlineEditableField
              label="סטטוס תעסוקה"
              value={contact.work_status}
              displayValue={dictName(dicts.workStatuses, contact.work_status)}
              type="select"
              options={dicts.workStatuses}
              onSave={(value) => onUpdate({ work_status: value, candidate_status_date: new Date().toISOString() })}
            />
            <InlineEditableField
              label="קשר אחרון"
              value={contact.last_contact_date?.slice(0, 10) ?? null}
              displayValue={formatDate(contact.last_contact_date)}
              type="date"
              onSave={(value) => onUpdate({ last_contact_date: value })}
            />
            <InlineEditableField
              label="פולואפ הבא"
              value={contact.next_follow_up?.slice(0, 10) ?? null}
              displayValue={formatDate(contact.next_follow_up)}
              type="date"
              onSave={(value) => onUpdate({ next_follow_up: value })}
            />
            <InlineEditableField
              label="הערות מועמד/ת"
              value={contact.candidate_notes}
              type="textarea"
              onSave={(value) => onUpdate({ candidate_notes: value })}
            />
            <InlineEditableField
              label="הערות פנימיות"
              value={contact.notes}
              type="textarea"
              onSave={(value) => onUpdate({ notes: value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">מידע תפעולי ומערכתי</h2>
          <div>
            <ReadOnlyRow label="קמפיין WhatsApp אחרון" value={formatDate(contact.whatsapp_campaign_last_sent)} />
            <ReadOnlyRow
              label="מצב שליחת WhatsApp"
              value={publicationOutcomeLabel(contact.phone_norm, contact.whatsapp_campaign_last_sent, contact.whatsapp_last_delivery_status, contact.social_status)}
            />
            <ReadOnlyRow label="תאריך שינוי סטטוס תעסוקה" value={formatDate(contact.candidate_status_date)} />
            <ReadOnlyRow label="הגשות קודמות" value={contact.prev_applications_count?.toString() ?? "—"} />
            <ReadOnlyRow label="נוצר" value={formatDate(contact.created_timestamp)} />
            <ReadOnlyRow label="עודכן" value={formatDate(contact.updated_timestamp)} />
          </div>

          <button
            type="button"
            onClick={() => setTechnicalOpen((value) => !value)}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <span>מידע טכני</span>
            {technicalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {technicalOpen && (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3">
              <ReadOnlyRow label="Contact ID" value={<span className="font-mono" dir="ltr">{contact.contact_id}</span>} />
              <ReadOnlyRow label="טלפון מנורמל" value={<span className="font-mono" dir="ltr">{contact.phone_norm}</span>} />
              <ReadOnlyRow label="כפילות אימייל" value={contact.dup_email_flag ? "כן" : "לא"} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
