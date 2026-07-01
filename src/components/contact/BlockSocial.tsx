import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook, Link2 } from "lucide-react";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((d) => Number(d.id) === Number(id))?.name ?? "—";
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

function LinkRow({ label, href, children }: { label: string; href?: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-[#008080] hover:underline">
        {children}
      </a>
    </div>
  );
}

export default function BlockSocial({ contact, dicts }: Props) {
  const socialStatus = dictName(dicts.socialStatuses, contact.social_status);
  const hasContent = contact.facebook_url || contact.facebook_name || contact.facebook_id || contact.portfolio_url || contact.recommendations_url || socialStatus !== "—";

  if (!hasContent) return null;

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-900">מדיה חברתית וערוצי קשר</h3>
        <div className="divide-y divide-slate-100">
          <LV label="סטטוס קשר במדיה חברתית" value={socialStatus} />
          <LinkRow label="לינק לפייסבוק" href={contact.facebook_url}>
            <Facebook className="h-3.5 w-3.5" />
            {contact.facebook_name || "פתיחת פייסבוק"}
          </LinkRow>
          <LV label="שם פייסבוק" value={contact.facebook_name} />
          <LV label="Facebook ID" value={contact.facebook_id?.toString()} />
          <LinkRow label="תיק עבודות" href={contact.portfolio_url}>
            <Link2 className="h-3.5 w-3.5" />
            פתיחת תיק עבודות
          </LinkRow>
          <LinkRow label="המלצות" href={contact.recommendations_url}>
            <Link2 className="h-3.5 w-3.5" />
            פתיחת המלצות
          </LinkRow>
        </div>
      </CardContent>
    </Card>
  );
}