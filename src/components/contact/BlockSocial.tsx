import React from "react";
import type { ContactRow } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook } from "lucide-react";

interface Props {
  contact: ContactRow;
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

export default function BlockSocial({ contact }: Props) {
  const ext = (contact.extended_data ?? {}) as Record<string, string>;
  const instagramUrl = ext.instagram_url;
  const linkedinUrl = ext.linkedin_url;

  const hasContent = contact.facebook_url || contact.facebook_name || contact.facebook_id ||
    instagramUrl || linkedinUrl || contact.portfolio_url || contact.recommendations_url;

  if (!hasContent) return null;

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">מדיה חברתית</h3>
        <div className="divide-y divide-slate-100">
          {contact.facebook_url && (
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500 shrink-0">פייסבוק</span>
              <a href={contact.facebook_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-semibold text-[#008080] hover:underline">
                <Facebook className="h-3.5 w-3.5" />
                {contact.facebook_name || "פתיחת פרופיל"}
              </a>
            </div>
          )}
          <LV label="שם פייסבוק" value={contact.facebook_name} />
          <LV label="ID פייסבוק" value={contact.facebook_id?.toString()} />
          {instagramUrl && (
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500 shrink-0">אינסטגרם</span>
              <a href={instagramUrl} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-[#008080] hover:underline">פתיחת פרופיל ↗</a>
            </div>
          )}
          {linkedinUrl && (
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500 shrink-0">לינקדאין</span>
              <a href={linkedinUrl} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-[#008080] hover:underline">פתיחת פרופיל ↗</a>
            </div>
          )}
          {contact.portfolio_url && (
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500 shrink-0">תיק עבודות</span>
              <a href={contact.portfolio_url} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-[#008080] hover:underline">פורטפוליו ↗</a>
            </div>
          )}
          {contact.recommendations_url && (
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-slate-500 shrink-0">המלצות</span>
              <a href={contact.recommendations_url} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-[#008080] hover:underline">המלצות ↗</a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
