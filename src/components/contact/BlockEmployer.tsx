import { Link, useNavigate } from "react-router-dom";
import type { AccountRow, ContactRow, Contact360Dicts, LinkedJobRow } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

interface Props {
  contact: ContactRow;
  linkedJobs: LinkedJobRow[];
  dicts: Contact360Dicts | undefined;
  account: AccountRow | null;
}

function dictName(items: { id: number; name: string }[], value: number | null | undefined): string {
  if (value == null) return "—";
  return items.find((item) => Number(item.id) === Number(value))?.name ?? "—";
}

function jobStatusClass(status: number | null): string {
  switch (Number(status)) {
    case 1: return "border-blue-200 bg-blue-50 text-blue-700";
    case 2: return "border-amber-200 bg-amber-50 text-amber-700";
    case 3: return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 4: return "border-amber-200 bg-amber-50 text-amber-700";
    case 5: return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 8: return "border-red-200 bg-red-50 text-red-700";
    default: return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function roleLabel(job: LinkedJobRow, contactId: number): string {
  if (Number(job.rel_employer_contact) === contactId && Number(job.rel_recruiter_contact) === contactId) return "מגייס + מעסיק";
  if (Number(job.rel_employer_contact) === contactId) return "מעסיק";
  if (Number(job.rel_recruiter_contact) === contactId) return "מגייס";
  return "";
}

export function BlockEmployer({ contact, linkedJobs, dicts, account }: Props) {
  const navigate = useNavigate();
  const linkedJobOrgName = linkedJobs.find((job) => job.account_name)?.account_name;
  const orgName = account?.account_name ?? contact.linked_org_name ?? linkedJobOrgName;
  const orgId = account?.account_id ?? contact.account_link;
  const location = account
    ? [dictName(dicts?.cities ?? [], account.city_id), dictName(dicts?.regions ?? [], account.region_id)].filter((value) => value !== "—").join(" · ")
    : "";

  if (linkedJobs.length === 0 && !orgName) return null;

  return (
    <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#008080]" />
          <h2 className="text-lg font-semibold leading-[1.3] text-slate-900">ארגון ומשרות מקושרות</h2>
        </div>

        {orgName && (
          <div className="mb-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">ארגון מקושר</div>
                {orgId ? (
                  <Link to={`/admin/accounts/${orgId}`} className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-[#008080] hover:underline">
                    {orgName}<ExternalLink className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="mt-1 text-base font-semibold text-slate-900">{orgName}</div>
                )}
              </div>
              {orgId && (
                <Link to={`/admin/accounts/${orgId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:text-[#008080]">
                  פתח 360 ארגון
                </Link>
              )}
            </div>
            {account && (
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                {account.phone && <a href={`tel:${account.phone}`} dir="ltr" className="flex items-center gap-2 hover:text-[#008080]"><Phone className="h-4 w-4" />{account.phone}</a>}
                {account.email && <a href={`mailto:${account.email}`} dir="ltr" className="flex items-center gap-2 hover:text-[#008080]"><Mail className="h-4 w-4" />{account.email}</a>}
                {location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</span>}
              </div>
            )}
          </div>
        )}

        {linkedJobs.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Briefcase className="h-4 w-4" />
              <span>משרות מקושרות ({linkedJobs.length})</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
              {linkedJobs.map((job) => {
                const statusLabel = dictName(dicts?.jobStatuses ?? [], job.job_status);
                return (
                  <div key={job.job_code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <button type="button" onClick={() => navigate(`/admin/jobs/${job.job_code}`)} className="text-right text-sm font-semibold text-[#008080] hover:underline">
                        {job.job_code} · {job.job_title || "ללא כותרת"}
                      </button>
                      {roleLabel(job, contact.contact_id) && <span className="text-[13px] text-slate-500">תפקיד האדם במשרה: {roleLabel(job, contact.contact_id)}</span>}
                    </div>
                    {statusLabel !== "—" && (
                      <Badge className={`w-fit rounded-full border px-3 text-sm font-medium shadow-none ${jobStatusClass(job.job_status)}`}>{statusLabel}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">אין משרות מקושרות כרגע</p>
        )}
      </CardContent>
    </Card>
  );
}
