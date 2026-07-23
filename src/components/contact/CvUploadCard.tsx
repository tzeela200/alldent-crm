import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import * as mammoth from "mammoth";
import {
  AlertCircle,
  Bot,
  Check,
  Eye,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DictionaryMultiSelect } from "@/components/ui/DictionaryMultiSelect";
import { CityCombobox } from "@/components/ui/CityRegionPicker";
import { supabase } from "@/lib/supabase";
import { applicationHasCv, openApplicationCv, safeCvName } from "@/lib/cv";
import { useContactMutations } from "@/hooks/useContactMutations";
import type { Contact360Dicts, ContactRow } from "@/hooks/useContact360";

const BRAND_PRIMARY = "#008080";
const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "txt"]);

const FIELD_LABELS = {
  first_name: "שם פרטי",
  last_name: "שם משפחה",
  phone: "נייד",
  email: "אימייל",
  professional_title: "כותרת מקצועית",
  personal_summary: "סיכום מקצועי",
  academic_education: "השכלה אקדמית",
  professional_courses: "קורסים מקצועיים",
  current_employer: "מעסיק נוכחי",
  previous_employers: "מעסיקים קודמים",
  salary_expectation_monthly: "ציפיות שכר חודשי",
  salary_expectation_hourly: "ציפיות שכר שעתי",
  additional_skills_notes: "כישורים נוספים",
  city_id: "עיר",
  languages: "שפות",
} as const;

type AiFieldKey = keyof typeof FIELD_LABELS;
type PreviousEmployer = { name?: string; role?: string; years?: string; description?: string };

type ScannerResponse = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  professional_title?: string;
  personal_summary?: string;
  academic_education?: string;
  professional_courses?: string;
  current_employer?: string;
  previous_employers?: PreviousEmployer[];
  salary_expectation_monthly?: number;
  salary_expectation_hourly?: number;
  additional_skills_notes?: string;
  city_name?: string;
  languages?: string | string[];
  raw?: string;
  error?: string;
  details?: string;
};

type AiDraft = Partial<Record<AiFieldKey, unknown>>;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("he-IL");
}

function extension(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/["'׳״.,;:()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLanguages(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(/[,;|/\n]+/);
  return Array.from(new Set(parts.map((item) => String(item).trim()).filter(Boolean)));
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(blob);
  });
}

function currentValue(contact: ContactRow, key: AiFieldKey): unknown {
  if (key === "city_id") return contact.city_id;
  return contact[key as keyof ContactRow];
}

function currentDisplay(contact: ContactRow, key: AiFieldKey, dicts: Contact360Dicts): string {
  const value = currentValue(contact, key);
  if (key === "city_id") return dicts.cities.find((city) => city.id === Number(contact.city_id))?.name ?? "לא הוזן";
  if (key === "languages") {
    const ids = Array.isArray(contact.languages) ? contact.languages.map(Number) : [];
    const names = dicts.languages.filter((language) => ids.includes(language.id)).map((language) => language.name);
    return names.join(", ") || "לא הוזן";
  }
  if (key === "previous_employers") {
    const employers = Array.isArray(contact.previous_employers) ? contact.previous_employers : [];
    return employers.map((employer) => [employer.name, employer.role, employer.years].filter(Boolean).join(" · ")).filter(Boolean).join("\n") || "לא הוזן";
  }
  if (key === "salary_expectation_hourly" || key === "salary_expectation_monthly") {
    return value == null ? "לא הוזן" : `₪${Number(value).toLocaleString("he-IL")}`;
  }
  return isEmpty(value) ? "לא הוזן" : String(value);
}

function proposalDisplay(draft: AiDraft, key: AiFieldKey, dicts: Contact360Dicts): string {
  const value = draft[key];
  if (key === "city_id") return dicts.cities.find((city) => city.id === Number(value))?.name ?? "נדרש מיפוי לעיר";
  if (key === "languages") {
    const ids = Array.isArray(value) ? value.map(Number) : [];
    return dicts.languages.filter((language) => ids.includes(language.id)).map((language) => language.name).join(", ") || "נדרש מיפוי לשפה";
  }
  if (key === "previous_employers") {
    const employers = Array.isArray(value) ? value as PreviousEmployer[] : [];
    return employers.map((employer) => [employer.name, employer.role, employer.years].filter(Boolean).join(" · ")).filter(Boolean).join("\n") || "לא נמצא מידע";
  }
  if (key === "salary_expectation_hourly" || key === "salary_expectation_monthly") {
    return value == null ? "לא נמצא מידע" : `₪${Number(value).toLocaleString("he-IL")}`;
  }
  return isEmpty(value) ? "לא נמצא מידע" : String(value);
}

export function CvUploadCard({
  contactId,
  contact,
  dicts,
}: {
  contactId: number;
  contact: ContactRow;
  dicts: Contact360Dicts;
}) {
  const { updateContact } = useContactMutations();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [writing, setWriting] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [aiDraft, setAiDraft] = useState<AiDraft>({});
  const [visibleFields, setVisibleFields] = useState<AiFieldKey[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<AiFieldKey>>(new Set());
  const [scanError, setScanError] = useState("");
  const [sourceCityName, setSourceCityName] = useState("");
  const [unmatchedLanguages, setUnmatchedLanguages] = useState<string[]>([]);
  const [writerInput, setWriterInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCv = applicationHasCv(contact);
  const receivedDate = formatDate(contact.cv_received_date);
  const hasSuggestions = visibleFields.length > 0;

  const selectedCount = useMemo(
    () => visibleFields.filter((field) => selectedFields.has(field)).length,
    [selectedFields, visibleFields],
  );

  function validateFile(file: File): string | null {
    const ext = extension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) return "סוג הקובץ אינו נתמך. ניתן להעלות PDF, DOC, DOCX, תמונה או TXT.";
    if (file.size > MAX_FILE_SIZE) return "הקובץ גדול מ־10MB.";
    return null;
  }

  const uploadFile = useCallback(async (file: File) => {
    if (!contactId) return;
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

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

      setLastUploadedFile(file);
      setAiDraft({});
      setVisibleFields([]);
      setSelectedFields(new Set());
      toast.success("קורות החיים הועלו ונשמרו");
    } catch (err) {
      toast.error(`העלאת הקובץ נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  }, [contactId, updateContact]);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    event.target.value = "";
  };

  async function getCvBlob(): Promise<{ blob: Blob; name: string }> {
    if (lastUploadedFile) return { blob: lastUploadedFile, name: lastUploadedFile.name };
    if (!contact.cv_storage_path) {
      throw new Error("לסריקה נדרש קובץ שהועלה ל־AllDent. יש להעלות או להחליף את קורות החיים.");
    }
    const { data, error } = await supabase.storage.from("candidate-cvs").download(contact.cv_storage_path);
    if (error || !data) throw error ?? new Error("לא ניתן לקרוא את קובץ קורות החיים");
    return { blob: data, name: contact.cv_storage_path.split("/").pop() || "cv" };
  }

  async function prepareScannerPayload(blob: Blob, name: string): Promise<Record<string, unknown>> {
    const ext = extension(name);
    if (ext === "doc") {
      throw new Error("סריקת AI של קובץ DOC ישן אינה נתמכת. יש לשמור אותו כ־DOCX או PDF ולהעלות מחדש.");
    }
    if (ext === "docx") {
      const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
      const fileText = result.value.trim();
      if (!fileText) throw new Error("לא נמצא טקסט קריא בקובץ ה־DOCX");
      return { fileText, fileName: name };
    }
    if (ext === "txt") {
      const fileText = (await blob.text()).trim();
      if (!fileText) throw new Error("הקובץ ריק");
      return { fileText, fileName: name };
    }
    if (ext === "pdf") {
      return { base64: await blobToBase64(blob), mediaType: "application/pdf", fileName: name };
    }
    if (["jpg", "jpeg", "png"].includes(ext)) {
      const mediaType = ext === "png" ? "image/png" : "image/jpeg";
      return { base64: await blobToBase64(blob), mediaType, fileName: name };
    }
    throw new Error("סוג הקובץ אינו נתמך לסריקת AI");
  }

  function mapAiResult(result: ScannerResponse, merge = false) {
    const nextDraft: AiDraft = merge ? { ...aiDraft } : {};
    const nextFields = new Set<AiFieldKey>(merge ? visibleFields : []);
    const nextSelected = new Set<AiFieldKey>(merge ? selectedFields : []);

    const simpleFields: AiFieldKey[] = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "professional_title",
      "personal_summary",
      "academic_education",
      "professional_courses",
      "current_employer",
      "previous_employers",
      "salary_expectation_monthly",
      "salary_expectation_hourly",
      "additional_skills_notes",
    ];

    for (const key of simpleFields) {
      const value = result[key as keyof ScannerResponse];
      if (isEmpty(value)) continue;
      nextDraft[key] = value;
      nextFields.add(key);
      if (isEmpty(currentValue(contact, key))) nextSelected.add(key);
    }

    if (result.city_name?.trim()) {
      const sourceName = result.city_name.trim();
      setSourceCityName(sourceName);
      const normalized = normalizeLabel(sourceName);
      const matches = dicts.cities.filter((city) => normalizeLabel(city.name) === normalized);
      const mappedCity = matches.length === 1 ? matches[0] : null;
      nextDraft.city_id = mappedCity?.id ?? null;
      nextFields.add("city_id");
      if (!contact.city_id && mappedCity) nextSelected.add("city_id");
    }

    const sourceLanguages = splitLanguages(result.languages);
    if (sourceLanguages.length) {
      const mappedIds: number[] = [];
      const unmatched: string[] = [];
      for (const sourceName of sourceLanguages) {
        const normalized = normalizeLabel(sourceName);
        const matches = dicts.languages.filter((language) => normalizeLabel(language.name) === normalized);
        if (matches.length === 1) mappedIds.push(matches[0].id);
        else unmatched.push(sourceName);
      }
      const existingIds = Array.isArray(contact.languages) ? contact.languages.map(Number) : [];
      nextDraft.languages = Array.from(new Set([...existingIds, ...mappedIds]));
      nextFields.add("languages");
      setUnmatchedLanguages(unmatched);
      if (mappedIds.some((id) => !existingIds.includes(id))) nextSelected.add("languages");
    }

    setAiDraft(nextDraft);
    setVisibleFields(Array.from(nextFields));
    setSelectedFields(nextSelected);
  }

  async function scanCv() {
    setScanning(true);
    setScanError("");
    try {
      const { blob, name } = await getCvBlob();
      const validationError = blob.size > MAX_FILE_SIZE ? "הקובץ גדול מ־10MB." : null;
      if (validationError) throw new Error(validationError);
      const payload = await prepareScannerPayload(blob, name);
      const { data, error } = await supabase.functions.invoke("ai-document-scanner", { body: payload });
      if (error) throw error;
      const scannerData = data as ScannerResponse | null;
      if (!scannerData) throw new Error("לא התקבלה תשובה מסורק קורות החיים");
      if (scannerData.error) throw new Error(scannerData.error);
      if (scannerData.raw) throw new Error("הסריקה חזרה בפורמט לא תקין ולא תישמר");
      mapAiResult(scannerData, false);
      toast.success("הסריקה הסתיימה. יש לאשר את השדות הרצויים.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setScanError(message);
      toast.error(`סריקת קורות החיים נכשלה: ${message}`);
    } finally {
      setScanning(false);
    }
  }

  async function improveProfile() {
    setWriting(true);
    setScanError("");
    try {
      const structuredInput = {
        cv_scan: Object.fromEntries(visibleFields.map((field) => [field, aiDraft[field]])),
        admin_note: writerInput.trim() || undefined,
      };
      const { data, error } = await supabase.functions.invoke("ai-profile-writer", {
        body: {
          currentData: contact,
          userInput: JSON.stringify(structuredInput),
        },
      });
      if (error) throw error;
      const writerData = data as ScannerResponse | null;
      if (!writerData) throw new Error("לא התקבלה תשובה מכלי שיפור הפרופיל");
      if (writerData.error) throw new Error(writerData.error);
      if (writerData.raw) throw new Error("כלי שיפור הפרופיל חזר בפורמט לא תקין");
      mapAiResult(writerData, true);
      toast.success("התקבלו הצעות ניסוח. יש לאשר לפני שמירה.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setScanError(message);
      toast.error(`שיפור הפרופיל נכשל: ${message}`);
    } finally {
      setWriting(false);
    }
  }

  function toggleSelected(field: AiFieldKey) {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function setDraftValue(field: AiFieldKey, value: unknown) {
    setAiDraft((current) => ({ ...current, [field]: value }));
  }

  function updateEmployer(index: number, field: keyof PreviousEmployer, value: string) {
    const employers = Array.isArray(aiDraft.previous_employers) ? [...aiDraft.previous_employers as PreviousEmployer[]] : [];
    employers[index] = { ...employers[index], [field]: value };
    setDraftValue("previous_employers", employers);
  }

  async function saveApprovedFields() {
    if (!selectedCount) {
      toast.error("לא נבחרו שדות לשמירה");
      return;
    }
    setSavingAi(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const field of visibleFields) {
        if (!selectedFields.has(field)) continue;
        if (field === "city_id") {
          const cityId = aiDraft.city_id == null ? null : Number(aiDraft.city_id);
          const city = dicts.cities.find((item) => item.id === cityId);
          if (!city) throw new Error("יש לבחור עיר תקינה מהמילון לפני השמירה");
          patch.city_id = city.id;
          patch.region_id = city.region_id ?? null;
          continue;
        }
        if (field === "languages") {
          const languageIds = Array.isArray(aiDraft.languages) ? aiDraft.languages.map(Number).filter(Number.isFinite) : [];
          if (!languageIds.length) throw new Error("יש לבחור לפחות שפה אחת מהמילון");
          patch.languages = languageIds;
          continue;
        }
        patch[field] = aiDraft[field] ?? null;
      }

      const firstName = selectedFields.has("first_name") ? String(aiDraft.first_name ?? "").trim() || null : contact.first_name;
      const lastName = selectedFields.has("last_name") ? String(aiDraft.last_name ?? "").trim() || null : contact.last_name;
      if (selectedFields.has("first_name") || selectedFields.has("last_name")) {
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
        patch.full_name = fullName;
        if (!contact.display_name || contact.display_name === contact.full_name) patch.display_name = fullName;
      }
      patch.updated_timestamp = new Date().toISOString();

      const { error } = await updateContact(contactId, patch);
      if (error) throw error;
      toast.success(`${selectedCount} שדות עודכנו לאחר אישור`);
      setAiDraft({});
      setVisibleFields([]);
      setSelectedFields(new Set());
      setSourceCityName("");
      setUnmatchedLanguages([]);
      setWriterInput("");
    } catch (err) {
      toast.error(`שמירת ההצעות נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingAi(false);
    }
  }

  function proposedEditor(field: AiFieldKey) {
    const value = aiDraft[field];
    if (field === "city_id") {
      return (
        <div>
          <CityCombobox
            cities={dicts.cities}
            value={value == null ? null : Number(value)}
            onChange={(cityId) => setDraftValue("city_id", cityId)}
            label="עיר"
            placeholder="חיפוש והתאמה לעיר מהמילון..."
          />
          {sourceCityName && !value && (
            <div className="mt-1 text-sm text-amber-700">ה־AI מצא: {sourceCityName}. לא נמצאה התאמה חד־משמעית — יש לבחור ידנית.</div>
          )}
        </div>
      );
    }
    if (field === "languages") {
      return (
        <div>
          <DictionaryMultiSelect
            options={dicts.languages}
            value={Array.isArray(value) ? value : []}
            onChange={(ids) => setDraftValue("languages", ids)}
            placeholder="חיפוש שפה מהמילון..."
            maxHeightClassName="max-h-44"
          />
          {unmatchedLanguages.length > 0 && (
            <div className="mt-1 text-sm text-amber-700">לא נמצאה התאמה אוטומטית: {unmatchedLanguages.join(", ")}</div>
          )}
        </div>
      );
    }
    if (field === "previous_employers") {
      const employers = Array.isArray(value) ? value as PreviousEmployer[] : [];
      return (
        <div className="space-y-2">
          {employers.map((employer, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={employer.name ?? ""} onChange={(event) => updateEmployer(index, "name", event.target.value)} placeholder="שם המעסיק" className="h-10 rounded-xl" />
                <Input value={employer.role ?? ""} onChange={(event) => updateEmployer(index, "role", event.target.value)} placeholder="תפקיד" className="h-10 rounded-xl" />
                <Input value={employer.years ?? ""} onChange={(event) => updateEmployer(index, "years", event.target.value)} placeholder="תקופה" className="h-10 rounded-xl" dir="ltr" />
                <Button type="button" variant="outline" onClick={() => setDraftValue("previous_employers", employers.filter((_, itemIndex) => itemIndex !== index))} className="h-10 rounded-xl border-red-200 text-red-600">
                  <Trash2 className="h-4 w-4" />
                  <span className="me-1">הסר</span>
                </Button>
              </div>
              <Textarea value={employer.description ?? ""} onChange={(event) => updateEmployer(index, "description", event.target.value)} placeholder="תיאור" className="mt-2 min-h-[70px] rounded-xl" />
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setDraftValue("previous_employers", [...employers, {}])} className="h-9 rounded-xl border-slate-200">
            <Plus className="h-4 w-4" />
            <span className="me-1">הוסף מעסיק</span>
          </Button>
        </div>
      );
    }
    if (["personal_summary", "academic_education", "professional_courses", "additional_skills_notes"].includes(field)) {
      return <Textarea value={String(value ?? "")} onChange={(event) => setDraftValue(field, event.target.value)} className="min-h-[100px] rounded-xl text-base leading-7" />;
    }
    if (field === "salary_expectation_hourly" || field === "salary_expectation_monthly") {
      return <Input type="number" value={value == null ? "" : String(value)} onChange={(event) => setDraftValue(field, event.target.value === "" ? null : Number(event.target.value))} className="h-11 rounded-xl" dir="ltr" />;
    }
    const ltr = field === "phone" || field === "email";
    return <Input value={String(value ?? "")} onChange={(event) => setDraftValue(field, event.target.value)} className="h-11 rounded-xl" dir={ltr ? "ltr" : "rtl"} />;
  }

  return (
    <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: BRAND_PRIMARY }} />
              <h2 className="text-lg font-semibold leading-[1.3] text-slate-900">קורות חיים ומסמכים</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">העלאה, צפייה והשלמת פרופיל מקו״ח באישור אדמין.</p>
          </div>
          {hasCv ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-[30px] items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700">
                יש קו״ח{receivedDate ? ` · ${receivedDate}` : ""}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => void openApplicationCv(contact)} className="h-9 rounded-xl border-slate-200">
                <Eye className="h-4 w-4" />
                <span className="me-1">צפייה</span>
              </Button>
            </div>
          ) : (
            <span className="inline-flex h-[30px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">אין קו״ח</span>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-colors ${
            dragOver ? "border-teal-500 bg-teal-50" : "border-slate-300 bg-[#F9FAFB] hover:border-teal-400 hover:bg-teal-50/40"
          } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        >
          {uploading ? <Loader2 className="h-7 w-7 animate-spin text-teal-600" /> : <Upload className="h-7 w-7 text-slate-400" />}
          <div className="text-center">
            <p className="text-base font-medium text-slate-700">{uploading ? "מעלה קובץ..." : "גרירת קו״ח לכאן או לחיצה לבחירה"}</p>
            <p className="mt-1 text-sm text-slate-500">{hasCv ? "קובץ חדש יחליף את הקיים · " : ""}PDF, DOC, DOCX, תמונה או TXT · עד 10MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void scanCv()}
            disabled={!hasCv || scanning || uploading}
            className="h-11 rounded-xl bg-[#008080] px-4 text-white hover:bg-[#006666] disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            <span className="me-2">סרוק והשלם פרופיל עם AI</span>
          </Button>
          {hasSuggestions && (
            <Button type="button" variant="outline" onClick={() => void improveProfile()} disabled={writing} className="h-11 rounded-xl border-teal-200 text-teal-800 hover:bg-teal-50">
              {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="me-2">שפר ניסוח מקצועי</span>
            </Button>
          )}
        </div>

        {hasSuggestions && (
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/30 p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">הצעות AI — לא נשמרו עדיין</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">בחרי רק את השדות שברצונך לעדכן. נתון קיים אינו נדרס בלי בחירה ואישור.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <label className="mb-2 block text-sm font-medium text-slate-600">מידע נוסף לכלי שיפור הניסוח — לא חובה</label>
              <Textarea value={writerInput} onChange={(event) => setWriterInput(event.target.value)} placeholder="הערה או מידע נוסף שהאדמין רוצה לשלב, בלי להמציא עובדות..." className="min-h-[80px] rounded-xl" />
            </div>

            <div className="mt-4 space-y-3">
              {visibleFields.map((field) => (
                <div key={field} className={`rounded-2xl border p-4 ${selectedFields.has(field) ? "border-teal-200 bg-white" : "border-slate-200 bg-white/70"}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-base font-semibold text-slate-900">
                      <input type="checkbox" checked={selectedFields.has(field)} onChange={() => toggleSelected(field)} className="h-4 w-4 accent-[#008080]" />
                      {FIELD_LABELS[field]}
                    </label>
                    <span className="text-sm text-slate-500">{selectedFields.has(field) ? "יאושר לשמירה" : "לא יישמר"}</span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mb-1 text-sm font-medium text-slate-500">קיים היום</div>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{currentDisplay(contact, field, dicts)}</div>
                    </div>
                    <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
                      <div className="mb-2 text-sm font-medium text-teal-800">הצעת AI — ניתנת לעריכה</div>
                      {proposedEditor(field)}
                      <div className="mt-2 text-sm text-slate-500">תצוגה: {proposalDisplay(aiDraft, field, dicts)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-teal-100 pt-4">
              <div className="text-sm font-medium text-slate-600">נבחרו {selectedCount} מתוך {visibleFields.length} שדות</div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setAiDraft({}); setVisibleFields([]); setSelectedFields(new Set()); setScanError(""); }} className="h-10 rounded-xl border-slate-200">
                  <X className="h-4 w-4" />
                  <span className="me-1">בטל הצעות</span>
                </Button>
                <Button type="button" onClick={() => void saveApprovedFields()} disabled={!selectedCount || savingAi} className="h-10 rounded-xl bg-[#008080] text-white hover:bg-[#006666]">
                  {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="me-1">שמור שדות מאושרים</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          ה־AI מציע בלבד. אין עדכון אוטומטי, אין שינוי בסטטוסים תפעוליים ואין יצירת מועמדות. נשמרים רק שדות שאושרו במפורש ל־contact.
        </div>
      </CardContent>
    </Card>
  );
}
