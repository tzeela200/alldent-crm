import type { ReactNode } from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { InlineEditableField } from "@/components/contact/InlineEditableField";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((item) => Number(item.id) === Number(id))?.name ?? "—";
}

function externalLink(value?: string | null): ReactNode {
  if (!value) return null;
  return (
    <a href={value} target="_blank" rel="noreferrer" className="text-[#008080] hover:underline">
      פתיחת קישור
    </a>
  );
}

export default function BlockSocial({ contact, dicts, onUpdate }: Props) {
  return (
    <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">מדיה חברתית וקישורים מקצועיים</h2>
        <div>
          <InlineEditableField
            label="סטטוס קשר במדיה חברתית"
            value={contact.social_status}
            displayValue={dictName(dicts.socialStatuses, contact.social_status)}
            type="select"
            options={dicts.socialStatuses}
            onSave={(value) => onUpdate({ social_status: value })}
          />
          <InlineEditableField
            label="Facebook URL"
            value={contact.facebook_url}
            displayValue={externalLink(contact.facebook_url)}
            type="url"
            placeholder="https://facebook.com/..."
            onSave={(value) => onUpdate({ facebook_url: value })}
          />
          <InlineEditableField
            label="שם בפייסבוק"
            value={contact.facebook_name}
            onSave={(value) => onUpdate({ facebook_name: value })}
          />
          <InlineEditableField
            label="Facebook ID"
            value={contact.facebook_id}
            type="number"
            onSave={(value) => onUpdate({ facebook_id: value })}
          />
          <InlineEditableField
            label="LinkedIn"
            value={contact.linkedin_url}
            displayValue={externalLink(contact.linkedin_url)}
            type="url"
            placeholder="https://linkedin.com/in/..."
            onSave={(value) => onUpdate({ linkedin_url: value })}
          />
          <InlineEditableField
            label="תיק עבודות"
            value={contact.portfolio_url}
            displayValue={externalLink(contact.portfolio_url)}
            type="url"
            onSave={(value) => onUpdate({ portfolio_url: value })}
          />
          <InlineEditableField
            label="המלצות"
            value={contact.recommendations_url}
            displayValue={externalLink(contact.recommendations_url)}
            type="url"
            onSave={(value) => onUpdate({ recommendations_url: value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
