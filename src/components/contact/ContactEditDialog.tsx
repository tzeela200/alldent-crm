import React, { useState, useEffect } from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import DictionaryMultiSelect from "@/components/ui/DictionaryMultiSelect";
import {
  selectValue,
  buildContactPatch,
  deriveRegionFromCity,
  type FormState,
} from "@/lib/contactForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactRow | null;
  dicts: Contact360Dicts | undefined;
  onSaved: (patch: Record<string, unknown>) => Promise<void>;
}

const BRAND_PRIMARY = "#008080";

export function ContactEditDialog({ open, onOpenChange, contact, dicts, onSaved }: Props) {
  const [adminForm, setAdminForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    let next: FormState = { ...(contact as unknown as FormState) };
    next = deriveRegionFromCity(next, dicts?.cities ?? []);
    setAdminForm(next);
  }, [open, contact, dicts]);

  const setAf = (field: string, val: unknown) =>
    setAdminForm((prev) => ({ ...prev, [field]: val }));

  const selectCls =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500";

  const sectionTitle = (title: string, red = false) => (
    <h3
      className={`mb-3 border-b pb-1 text-sm font-bold ${red ? "border-red-100 text-red-600" : "border-teal-100 text-teal-700"}`}
    >
      {title}
    </h3>
  );

  const filteredCities = (dicts?.cities ?? [])
    .filter(
      (c) =>
        !adminForm.region_id ||
        Number(c.region_id) === Number(adminForm.region_id) ||
        Number(c.id) === Number(adminForm.city_id),
    )
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "he"));

  async function handleSave() {
    if (!contact) return;
    setSaving(true);
    try {
      const patch = buildContactPatch(adminForm, contact as unknown as FormState);
      await onSaved(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 font-['Heebo']"
      >
        <DialogHeader>
          <DialogTitle className="text-right text-lg font-bold">✏️ עריכת פרטי איש קשר</DialogTitle>
          <DialogDescription className="text-right text-xs text-slate-400">
            כל השדות כולל שדות מערכת פנימיים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* פרטים אישיים */}
          <div>
            {sectionTitle("פרטים אישיים")}
            <div className="grid grid-cols-2 gap-3">
              {/* שם מלא ושם תצוגה — שדות ראשיים */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">שם מלא</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.full_name)}
                  onChange={(e) => setAf("full_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">שם תצוגה</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.display_name)}
                  onChange={(e) => setAf("display_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* שם פרטי + שם משפחה (אופציונלי) */}
              {(
                [
                  ["first_name", "שם פרטי", "rtl"],
                  ["last_name", "שם משפחה", "rtl"],
                  ["phone", "נייד", "ltr"],
                  ["second_phone", "נייד נוסף", "ltr"],
                  ["email", "אימייל", "ltr"],
                  ["second_email", "אימייל נוסף", "ltr"],
                ] as const
              ).map(([f, l, d]) => (
                <div key={f} className="space-y-1">
                  <label className="text-xs text-slate-500">{l}</label>
                  <Input
                    dir={d}
                    value={selectValue(adminForm[f])}
                    onChange={(e) => setAf(f, e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              ))}

              {/* אזור */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">אזור</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.region_id)}
                  onChange={(e) => {
                    setAf("region_id", e.target.value ? Number(e.target.value) : null);
                    setAf("city_id", null);
                  }}
                >
                  <option value="">— בחר אזור —</option>
                  {dicts?.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* עיר */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">עיר</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.city_id)}
                  onChange={(e) => setAf("city_id", e.target.value ? Number(e.target.value) : null)}
                  disabled={!adminForm.region_id && adminForm.city_id == null}
                >
                  <option value="">
                    {adminForm.region_id ? "— בחר עיר —" : "— בחר אזור תחילה —"}
                  </option>
                  {filteredCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* מגדר */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">מגדר</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.gender)}
                  onChange={(e) => setAf("gender", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.genders.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* שנת לידה */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">שנת לידה</label>
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.birth_year)}
                  onChange={(e) =>
                    setAf("birth_year", e.target.value ? Number(e.target.value) : null)
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* תפקיד מקצועי */}
          <div>
            {sectionTitle("תפקיד מקצועי")}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">תפקיד</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.role)}
                  onChange={(e) => {
                    setAf("role", e.target.value ? Number(e.target.value) : null);
                    setAf("sub_role", []);
                  }}
                >
                  <option value="">— בחר תפקיד —</option>
                  {dicts?.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">ניסיון</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.experience)}
                  onChange={(e) =>
                    setAf("experience", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.experience.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">כותרת מקצועית</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.professional_title)}
                  onChange={(e) => setAf("professional_title", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">מספר רישיון</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.license_no)}
                  onChange={(e) => setAf("license_no", e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            {!!adminForm.role && (
              <div className="mt-3">
                <DictionaryMultiSelect
                  label="תת-תפקיד"
                  options={(dicts?.subRoles ?? []).filter(
                    (r) => r.role_id === Number(adminForm.role),
                  )}
                  value={adminForm.sub_role}
                  onChange={(value) => setAf("sub_role", value)}
                  placeholder="חיפוש תת-תפקיד..."
                />
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">מעסיק נוכחי</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.current_employer)}
                  onChange={(e) => setAf("current_employer", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">הערות ימים ושעות</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.work_schedule_text)}
                  onChange={(e) => setAf("work_schedule_text", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="מערכות"
                  options={dicts?.systems ?? []}
                  value={adminForm.systems_used}
                  onChange={(value) => setAf("systems_used", value)}
                  placeholder="חיפוש מערכת..."
                  grid
                />
              </div>
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="פרוצדורות / תחומי ניסיון"
                  options={dicts?.procedures ?? []}
                  value={adminForm.procedures_experience}
                  onChange={(value) => setAf("procedures_experience", value)}
                  placeholder="חיפוש תחום ניסיון..."
                />
              </div>
            </div>
          </div>

          {/* תנאים והעדפות לתעסוקה */}
          <div>
            {sectionTitle("תנאים והעדפות לתעסוקה")}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">ניידות</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.mobility_id)}
                  onChange={(e) =>
                    setAf("mobility_id", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.mobility.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">מיסוי</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.tax_type_id)}
                  onChange={(e) =>
                    setAf("tax_type_id", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.taxTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <DictionaryMultiSelect
                label="אזורים רלוונטיים לעבודה"
                options={dicts?.regions ?? []}
                value={adminForm.preferred_regions}
                onChange={(value) => setAf("preferred_regions", value)}
                placeholder="חיפוש אזור..."
              />
            </div>
            <div className="mt-3">
              <DictionaryMultiSelect
                label="ערים רלוונטיות לעבודה"
                options={dicts?.cities ?? []}
                value={adminForm.preferred_cities}
                onChange={(value) => setAf("preferred_cities", value)}
                placeholder="חיפוש עיר..."
              />
            </div>
            <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>רלוונטי לכל הארץ</span>
              <input
                type="checkbox"
                checked={Boolean(adminForm.preferred_all_country)}
                onChange={(e) => setAf("preferred_all_country", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-teal-600"
              />
            </label>
          </div>

          {/* מדיה חברתית */}
          <div>
            {sectionTitle("מדיה חברתית")}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">לינק לפייסבוק</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.facebook_url)}
                  onChange={(e) => setAf("facebook_url", e.target.value)}
                  className="rounded-xl"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">שם פייסבוק</label>
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.facebook_name)}
                  onChange={(e) => setAf("facebook_name", e.target.value)}
                  className="rounded-xl"
                  placeholder="שם כפי שמופיע בפייסבוק"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Facebook ID</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.facebook_id)}
                  onChange={(e) =>
                    setAf("facebook_id", e.target.value ? Number(e.target.value) : null)
                  }
                  className="rounded-xl"
                  placeholder="מספר מזהה אם קיים"
                />
              </div>
            </div>
          </div>

          {/* CRM */}
          <div>
            {sectionTitle("CRM")}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">פולואפ הבא</label>
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.next_follow_up ?? "").slice(0, 10)}
                  onChange={(e) => setAf("next_follow_up", e.target.value || null)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">קשר אחרון</label>
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.last_contact_date ?? "").slice(0, 10)}
                  onChange={(e) => setAf("last_contact_date", e.target.value || null)}
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">הערות פנימיות</label>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.notes)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAf("notes", e.target.value)
                  }
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* פרופיל ציבורי */}
          <div>
            {sectionTitle("פרופיל ציבורי")}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="זמינות מועמד/ת"
                  options={dicts?.availability ?? []}
                  value={adminForm.candidate_availability_ids}
                  onChange={(value) => setAf("candidate_availability_ids", value)}
                  placeholder="חיפוש זמינות..."
                />
              </div>
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="היקף משרה רלוונטי"
                  options={dicts?.scopes ?? []}
                  value={adminForm.preferred_scope}
                  onChange={(value) => setAf("preferred_scope", value)}
                  placeholder="חיפוש היקף משרה..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">שכר חודשי</label>
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.salary_expectation_monthly)}
                  onChange={(e) =>
                    setAf(
                      "salary_expectation_monthly",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">שכר שעתי</label>
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.salary_expectation_hourly)}
                  onChange={(e) =>
                    setAf(
                      "salary_expectation_hourly",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="שפות"
                  options={dicts?.languages ?? []}
                  value={adminForm.languages}
                  onChange={(value) => setAf("languages", value)}
                  placeholder="חיפוש שפה..."
                  grid
                />
              </div>
              <div className="col-span-2">
                <DictionaryMultiSelect
                  label="סוגי שכר רלוונטיים"
                  options={dicts?.salaryTypes ?? []}
                  value={adminForm.candidate_salary_type_ids}
                  onChange={(value) => setAf("candidate_salary_type_ids", value)}
                  placeholder="חיפוש סוג שכר..."
                />
              </div>
              <label className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span>יש קורות חיים</span>
                <input
                  type="checkbox"
                  checked={Boolean(adminForm.has_cv)}
                  onChange={(e) => setAf("has_cv", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
              </label>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">לינק לקורות חיים</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.cv_link)}
                  onChange={(e) => setAf("cv_link", e.target.value)}
                  className="rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">תאריך קבלת קו״ח</label>
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.cv_received_date ?? "").slice(0, 10)}
                  onChange={(e) => setAf("cv_received_date", e.target.value || null)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">לינק תיק עבודות</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.portfolio_url)}
                  onChange={(e) => setAf("portfolio_url", e.target.value)}
                  className="rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">לינק המלצות</label>
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.recommendations_url)}
                  onChange={(e) => setAf("recommendations_url", e.target.value)}
                  className="rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">פרופיל מקצועי</label>
                <Textarea
                  dir="rtl"
                  rows={4}
                  value={selectValue(adminForm.personal_summary)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAf("personal_summary", e.target.value)
                  }
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">השכלה</label>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.academic_education)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAf("academic_education", e.target.value)
                  }
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">קורסים והסמכות</label>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.professional_courses)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAf("professional_courses", e.target.value)
                  }
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500">כישורים נוספים</label>
                <Textarea
                  dir="rtl"
                  rows={2}
                  value={selectValue(adminForm.additional_skills_notes)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAf("additional_skills_notes", e.target.value)
                  }
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* סטטוסים — אדמין בלבד */}
          <div>
            {sectionTitle("🔒 סטטוסים — אדמין בלבד", true)}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">סטטוס בדיקה</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.check_status)}
                  onChange={(e) =>
                    setAf("check_status", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.checkStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">סטטוס קשר במדיה חברתית</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.social_status)}
                  onChange={(e) =>
                    setAf("social_status", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.socialStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">מקור</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.source)}
                  onChange={(e) =>
                    setAf("source", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">סוג פרופיל</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.profile_type)}
                  onChange={(e) =>
                    setAf("profile_type", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.profileTypes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">סטטוס תעסוקה</label>
                <select
                  className={selectCls}
                  value={selectValue(adminForm.work_status)}
                  onChange={(e) =>
                    setAf("work_status", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— בחר —</option>
                  {dicts?.workStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            ביטול
          </Button>
          <Button
            disabled={saving}
            className="rounded-xl text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              "שמור שינויים"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
