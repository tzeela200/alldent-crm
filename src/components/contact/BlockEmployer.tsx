import React from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ContactRow, Contact360Dicts, LinkedJobRow } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, ExternalLink } from "lucide-react";

interface Props {
  contact: ContactRow;
  linkedJobs: LinkedJobRow[];
  dicts: Contact360Dicts | undefined;
  account: { account_id: number; account_name: string } | null;
}

function dictName(items: { id: number; name: string }[], value: number | null | undefined): string {
  if (value == null) return "—";
  return items.find((item) => Number(item.id) === Number(value))?.name ?? "—";
}

function jobStatusClass(status: number | null): string {
  switch (Number(status)) {
    case 1:
      return "border-blue-200 bg-blue-50 text-blue-700";
    case 2:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 3:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 4:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 5:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 6:
      return "border-slate-200 bg-slate-100 text-slate-700";
    case 7:
      return "border-slate-200 bg-slate-100 text-slate-700";
    case 8:
      return "border-red-200 bg-red-50 text-red-700";
    case 9:
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function roleLabel(job: LinkedJobRow, contactId: number): string {
  if (Number(job.rel_employer_contact) === contactId && Number(job.rel_recruiter_contact) === contactId)
    return "מגייס + מעסיק";
  if (Number(job.rel_employer_contact) === contactId) return "מעסיק";
  if (Number(job.rel_recruiter_contact) === contactId) return "מגייס";
  return "";
}

export function BlockEmployer({ contact, linkedJobs, dicts, account }: Props) {
  const navigate = useNavigate();
  const linkedJobOrgName = linkedJobs.find((job) => job.account_name)?.account_name;
  const orgName = account?.account_name ?? contact.linked_org_name ?? linkedJobOrgName;
  const orgId = account?.account_id ?? contact.account_link;

  if (linkedJobs.length === 0 && !orgName) return null;

  return (
    <Card className="rounded-2xl border border-teal-100 bg-teal-50/30 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-600" />
          <h3 className="text-base font-bold text-teal-800">ארגון ומשרות מקושרות</h3>
        </div>

        {orgName && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-slate-500">ארגון:</span>
            {orgId ? (
              <Link
                to={`/admin/accounts/${orgId}`}
                className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
              >
                {orgName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate-800">{orgName}</span>
            )}
          </div>
        )}

        {linkedJobs.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Briefcase className="h-3 w-3" />
              <span>משרות ({linkedJobs.length})</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
              {linkedJobs.map((job) => {
                const statusLabel = dictName(dicts?.jobStatuses ?? [], job.job_status);
                return (
                  <div key={job.job_code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/jobs/${job.job_code}`)}
                        className="text-right text-sm font-semibold text-teal-700 hover:underline"
                      >
                        {job.job_code}
                      </button>
                      <span className="text-xs text-slate-500">{job.job_title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusLabel !== "—" && (
                        <Badge className={`w-fit rounded-full border px-2.5 text-xs font-semibold shadow-none ${jobStatusClass(job.job_status)}`}>
                          {statusLabel}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">{roleLabel(job, contact.contact_id)}</span>
                    </div>
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
