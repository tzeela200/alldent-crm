import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { FileText, Loader2, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { applicationHasCv, openApplicationCv, safeCvName } from "@/lib/cv";
import { useContactMutations } from "@/hooks/useContactMutations";

const BRAND_PRIMARY = "#008080";
const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

type CvContact = {
  has_cv?: boolean | null;
  cv_link?: string | null;
  cv_storage_path?: string | null;
  cv_received_date?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

/**
 * Visible CV upload card on the Contact 360 screen. Admins can drag-and-drop (or
 * click) a CV file; the *original* file is stored in the private candidate-cvs
 * bucket and cv_storage_path / has_cv / cv_received_date are saved immediately.
 * updateContact invalidates the contact360 query, so the screen (and hero CV
 * button) refresh on their own.
 */
export function CvUploadCard({
  contactId,
  contact,
}: {
  contactId: number;
  contact: CvContact;
}) {
  const { updateContact } = useContactMutations();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCv = applicationHasCv(contact);
  const receivedDate = formatDate(contact.cv_received_date);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!contactId) return;
      setUploading(true);
      try {
        const path = `${contactId}/${Date.now()}_${safeCvName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("candidate-cvs")
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { error: saveError } = await updateContact(contactId, {
          cv_storage_path: path,
          has_cv: true,
          cv_received_date: new Date().toISOString().slice(0, 10),
          updated_timestamp: new Date().toISOString(),
        });
        if (saveError) throw saveError;

        toast.success("קורות החיים הועלו ונשמרו");
      } catch (err) {
        toast.error(
          "העלאת הקובץ נכשלה: " + (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setUploading(false);
      }
    },
    [contactId, updateContact],
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  };

  return (
    <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
            <span className="text-sm font-bold text-slate-900">קורות חיים</span>
          </div>
          {hasCv ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-[26px] items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700">
                יש קו״ח{receivedDate ? ` · ${receivedDate}` : ""}
              </span>
              <button
                type="button"
                onClick={() => void openApplicationCv(contact)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-600 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
              >
                <Eye className="h-3.5 w-3.5" />
                צפייה
              </button>
            </div>
          ) : (
            <span className="inline-flex h-[26px] items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 text-xs font-semibold text-slate-500">
              אין קו״ח
            </span>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? "border-teal-500 bg-teal-50"
              : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50"
          } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          ) : (
            <Upload className="h-7 w-7 text-slate-400" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              {uploading ? "מעלה קובץ..." : "גרור קובץ קו״ח לכאן או לחץ לבחירה"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {hasCv ? "העלאת קובץ חדש תחליף את הקיים · " : ""}PDF, Word (.doc/.docx) או תמונה
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}
