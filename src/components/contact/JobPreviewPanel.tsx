import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Copy, ExternalLink, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPublicJobByCode } from "@/services/publicJobsService";
import { buildPublicJobUrl } from "@/lib/publicJobUtils";

interface Props {
  jobCode: string | null;
  onOpenChange: (open: boolean) => void;
  onEditFull: (jobCode: string) => void;
  onCopyLink: (url: string) => void;
}

/**
 * Read-only preview of a job exactly as the public site shows it, so an admin
 * doesn't have to leave Contact 360 to check requirements/description before
 * messaging a candidate. Sourced from v_job_public (getPublicJobByCode) — the
 * same query the public site itself uses, filtered to publicly-visible jobs.
 * A null result here means "not currently public" (draft/paused/closed), not
 * necessarily "job doesn't exist" — job_code still resolves fine for editing.
 */
export function JobPreviewPanel({ jobCode, onOpenChange, onEditFull, onCopyLink }: Props) {
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["public-job", jobCode],
    queryFn: () => getPublicJobByCode(jobCode as string),
    enabled: !!jobCode,
  });

  return (
    <Dialog open={!!jobCode} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-lg font-bold">תצוגה ציבורית — משרה {jobCode}</DialogTitle>
          <DialogDescription className="text-right text-xs text-slate-400">
            בדיוק כפי שמועמד/ת רואה אותה באתר
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            טוען פרטי משרה...
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            שגיאה בטעינת פרטי המשרה. נסי שוב, או עברי לעריכה המלאה.
          </div>
        )}

        {!isLoading && !isError && !job && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            המשרה הזו אינה מוצגת כרגע באתר הציבורי (ייתכן שאינה פעילה/מפורסמת). ניתן עדיין לעבור לעריכה המלאה.
          </div>
        )}

        {!isLoading && !isError && job && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{job.job_title}</h2>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                {job.city_name && <span>{job.city_name}</span>}
                {job.region_name && <span>{job.region_name}</span>}
                {job.scope_names && job.scope_names.length > 0 && <span>{job.scope_names.join(", ")}</span>}
                {job.required_experience_name && <span>ניסיון: {job.required_experience_name}</span>}
              </div>
            </div>

            {job.job_description && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-700">תיאור המשרה</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.job_description}</p>
              </div>
            )}

            {job.job_requirements && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-700">דרישות</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.job_requirements}</p>
              </div>
            )}

            {job.show_salary_public && (job.salary_expectation_monthly || job.salary_expectation_hourly) && (
              <div className="text-sm text-slate-700">
                <span className="font-bold">שכר: </span>
                {job.salary_expectation_monthly ? `${job.salary_expectation_monthly} ₪ לחודש` : `${job.salary_expectation_hourly} ₪ לשעה`}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-slate-200"
            onClick={() => jobCode && onCopyLink(buildPublicJobUrl(jobCode))}
          >
            <Copy className="me-1.5 h-3.5 w-3.5" />
            העתקת לינק
          </Button>
          <Button
            className="h-10 rounded-xl text-white"
            style={{ backgroundColor: "#008080" }}
            onClick={() => jobCode && onEditFull(jobCode)}
          >
            <Pencil className="me-1.5 h-3.5 w-3.5" />
            עריכה מלאה
          </Button>
          {job && (
            <a
              href={buildPublicJobUrl(jobCode as string)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              פתיחה באתר
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
