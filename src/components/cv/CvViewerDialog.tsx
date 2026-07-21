import { useEffect, useState, useSyncExternalStore } from "react";
import mammoth from "mammoth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { cvViewerStore } from "@/lib/cvViewerStore";

type Phase = "loading" | "ready" | "unsupported" | "error";

/**
 * App-wide in-app CV viewer for Word documents.
 *
 * Mounted once at the app root. Subscribes to `cvViewerStore`; when
 * `openApplicationCv` (lib/cv.ts) routes a `.doc`/`.docx` here, it mints a
 * short-lived signed URL from the private `candidate-cvs` bucket, converts
 * `.docx` to HTML with mammoth, and renders it inside a fully-sandboxed iframe
 * (no scripts) so a crafted CV can't run code. Legacy `.doc` (old binary
 * format) is not convertible → graceful download fallback.
 */
export function CvViewerDialog() {
  const state = useSyncExternalStore(
    cvViewerStore.subscribe,
    cvViewerStore.getSnapshot,
    cvViewerStore.getSnapshot,
  );
  const path = state.storagePath;

  const [phase, setPhase] = useState<Phase>("loading");
  const [html, setHtml] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!state.open || !path) return;
    let cancelled = false;
    setPhase("loading");
    setHtml("");
    setDownloadUrl(null);

    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("candidate-cvs")
          .createSignedUrl(path, 60 * 60);
        if (error || !data?.signedUrl) throw error ?? new Error("no_signed_url");
        if (cancelled) return;
        setDownloadUrl(data.signedUrl);

        const ext = path.toLowerCase().split(".").pop() ?? "";
        if (ext === "docx") {
          const res = await fetch(data.signedUrl);
          const buffer = await res.arrayBuffer();
          if (cancelled) return;
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (cancelled) return;
          setHtml(
            result.value ||
              '<p style="text-align:center;color:#64748b">המסמך ריק</p>',
          );
          setPhase("ready");
        } else {
          // Legacy .doc — mammoth only supports .docx (Office Open XML).
          setPhase("unsupported");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.open, path]);

  const srcDoc = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
    body{font-family:Heebo,Arial,sans-serif;margin:0;padding:24px;color:#0f172a;line-height:1.6}
    table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #cbd5e1;padding:4px 8px}
    img{max-width:100%;height:auto}h1,h2,h3{margin:.6em 0 .3em}
    p{margin:.4em 0}
  </style></head><body>${html}</body></html>`;

  return (
    <Dialog open={state.open} onOpenChange={(next) => { if (!next) cvViewerStore.close(); }}>
      <DialogContent
        dir="rtl"
        className="h-[85vh] max-w-3xl overflow-hidden p-0 font-['Heebo']"
      >
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="text-right text-base font-bold">
            צפייה בקורות חיים
          </DialogTitle>
        </DialogHeader>
        <div className="h-[calc(85vh-56px)] bg-slate-50">
          {phase === "loading" && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              טוען מסמך…
            </div>
          )}
          {phase === "ready" && (
            <iframe
              title="קורות חיים"
              sandbox=""
              srcDoc={srcDoc}
              className="h-full w-full border-0 bg-white"
            />
          )}
          {phase === "unsupported" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-600">
              <p>
                לא ניתן להציג קובץ מסוג ‎.doc‎ בתצוגה מקדימה בתוך המערכת.
                <br />
                אפשר להוריד ולפתוח ב-Word.
              </p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
                >
                  הורדת הקובץ
                </a>
              )}
            </div>
          )}
          {phase === "error" && (
            <div className="flex h-full items-center justify-center text-sm text-rose-600">
              שגיאה בטעינת המסמך
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
