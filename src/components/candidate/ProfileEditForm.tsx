import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";

const LONG_TEXT_FIELDS = [
  "personal_summary",
  "ai_profile_summary",
  "academic_education",
  "professional_courses",
  "additional_skills_notes",
];

const NUMBER_FIELDS = [
  "salary_expectation_hourly",
  "salary_expectation_monthly",
  "birth_year",
  "license_no",
];

interface ProfileEditFormProps {
  field: string;
  label: string;
  currentValue: unknown;
  onSave: (value: unknown) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileEditForm({
  field,
  label,
  currentValue,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const initial =
    currentValue == null ? "" : String(currentValue);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const parsed = NUMBER_FIELDS.includes(field)
      ? value === "" ? null : Number(value)
      : value === "" ? null : value;
    await onSave(parsed);
    setSaving(false);
  }

  const isLong = LONG_TEXT_FIELDS.includes(field);
  const isNumber = NUMBER_FIELDS.includes(field);
  const isPreviousEmployers = field === "previous_employers";

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 space-y-3">
      <div className="text-sm font-bold text-slate-700">{label}</div>
      {isLong || isPreviousEmployers ? (
        <Textarea
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
          rows={isPreviousEmployers ? 6 : 4}
          className="rounded-xl border-slate-200 bg-white text-sm"
          placeholder={isPreviousEmployers ? 'פורמט JSON: [{"name":"...", "role":"...", "years":"...", "description":"..."}]' : ""}
          dir="rtl"
        />
      ) : (
        <Input
          type={isNumber ? "number" : "text"}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          className="rounded-xl border-slate-200 bg-white text-sm"
          dir="rtl"
        />
      )}
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5 me-1" />
          ביטול
        </Button>
        <Button
          size="sm"
          className="rounded-xl bg-[#008080] hover:bg-teal-700 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}
          שמור
        </Button>
      </div>
    </div>
  );
}
