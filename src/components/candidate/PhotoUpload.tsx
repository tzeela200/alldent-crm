import React, { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Camera, User2 } from "lucide-react";

interface PhotoUploadProps {
  contactId: number;
  token?: string;
  currentUrl?: string | null;
  /** Fallback letter shown when there is no photo. */
  initial?: string;
  onUploaded: (url: string) => void | Promise<void>;
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve({ base64: result.split(",")[1], mediaType: file.type });
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({
  contactId,
  token,
  currentUrl,
  initial = "—",
  onUploaded,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("יש להעלות תמונה בלבד");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { base64, mediaType } = await fileToBase64(file);

      if (token) {
        // Public/token flow → secure edge function validates the token server-side.
        const { data, error: fnErr } = await supabase.functions.invoke("upload-profile-photo", {
          body: { token, base64, mediaType },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        await onUploaded(data.url as string);
      } else {
        // Admin (authenticated) flow → upload directly, RLS-gated.
        const ext = mediaType.split("/")[1] || "jpg";
        const path = `${contactId}/photo_${Date.now()}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabase.storage
          .from("candidate-photos")
          .upload(path, bytes, { contentType: mediaType, upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("candidate-photos").getPublicUrl(path);
        await onUploaded(pub.publicUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border-2 border-[#008080] bg-teal-50 text-2xl font-bold text-[#008080]"
        aria-label="העלאת תמונה"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="תמונת פרופיל" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex no-print">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {error && <p className="absolute -bottom-5 right-0 whitespace-nowrap text-[13px] text-red-600 no-print">{error}</p>}
    </div>
  );
}
