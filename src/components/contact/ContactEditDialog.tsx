import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DictionaryMultiSelect from "@/components/ui/DictionaryMultiSelect";
import { CityRegionPicker } from "@/components/ui/CityRegionPicker";
import { AdminPanelSection } from "@/components/admin/AdminPanelSection";
import { AdminPanelField } from "@/components/admin/AdminPanelField";
import { AdminPanelActions } from "@/components/admin/AdminPanelActions";
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

const inputClassName = "rounded-xl";
const selectClassName =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500";

function AccountPicker({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
  } = useQuery<{ account_id: number; account_name: string | null }[]>({
    queryKey: ["accounts_names"],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("accounts")
        .select("account_id,account_name")
        .order("account_name");
      if (queryError) throw queryError;
      return data ?? [];
    },
    staleTime: 600_000,
  });

  const selected = accounts.find((account) => account.account_id === value);
  const needle = q.trim().toLowerCase();
  const filtered = (needle
    ? accounts.filter((account) => (account.account_name ?? "").toLowerCase().includes(needle))
    : accounts
  ).slice(0, 50);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          className={selectClassName}
          dir="rtl"
          placeholder={isLoading ? "טוען ארגונים..." : "חיפוש ארגון..."}
          value={open ? q : selected?.account_name ?? ""}
          disabled={isLoading || isError}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
        />
        {value != null && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQ("");
            }}
            className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:text-red-600"
            title="ביטול שיוך"
          >
            ×
          </button>
        )}
      </div>
      {isError && (
        <p className="mt-1 text-xs font-medium text-red-600">
          {error instanceof Error ? error.message : "טעינת הארגונים נכשלה"}
        </p>
      )}
      {open && !isLoading && !isError && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.map((account) => (
            <button
              key={account.account_id}
              type="button"
              onMouseDown={() => {
                onChange(account.account_id);
                setOpen(false);
                setQ("");
              }}
              className="block w-full px-3 py-2 text-right text-sm text-slate-700 hover:bg-slate-50"
            >
              {account.account_name ?? `#${account.account_id}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactEditDialog({ open, onOpenChange, contact, dicts, onSaved }: Props) {
  const [adminForm, setAdminForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    let next: FormState = { ...(contact as unknown as FormState) };
    next = deriveRegionFromCity(next, dicts?.cities ?? []);
    setAdminForm(next);
  }, [open, contact, dicts]);

  const setAf = (field: string, value: unknown) =>
    setAdminForm((previous) => ({ ...previous, [field]: value }));

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
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
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

        <div className="py-2">
          <AdminPanelSection title="פרטים אישיים">
            <AdminPanelField
              label="שם מלא"
              mode="edit"
              fullWidth
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.full_name)}
                  onChange={(event) => setAf("full_name", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="שם תצוגה"
              mode="edit"
              fullWidth
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.display_name)}
                  onChange={(event) => setAf("display_name", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            {(
              [
                ["first_name", "שם פרטי", "rtl"],
                ["last_name", "שם משפחה", "rtl"],
                ["phone", "נייד", "ltr"],
                ["second_phone", "נייד נוסף", "ltr"],
                ["email", "אימייל", "ltr"],
                ["second_email", "אימייל נוסף", "ltr"],
              ] as const
            ).map(([field, label, direction]) => (
              <AdminPanelField
                key={field}
                label={label}
                mode="edit"
                editValue={(
                  <Input
                    dir={direction}
                    value={selectValue(adminForm[field])}
                    onChange={(event) => setAf(field, event.target.value)}
                    className={inputClassName}
                  />
                )}
              />
            ))}
            <div className="sm:col-span-2">
              <CityRegionPicker
                cityId={adminForm.city_id != null && adminForm.city_id !== "" ? Number(adminForm.city_id) : null}
                regionId={adminForm.region_id != null && adminForm.region_id !== "" ? Number(adminForm.region_id) : null}
                onRegionChange={(id) => setAf("region_id", id)}
                onCityChange={(id) => setAf("city_id", id)}
                regions={dicts?.regions}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12px] font-semibold text-[#6B6B6B]">ארגון מקושר</label>
              <AccountPicker
                value={adminForm.account_link != null && adminForm.account_link !== "" ? Number(adminForm.account_link) : null}
                onChange={(id) => setAf("account_link", id)}
              />
            </div>
            <AdminPanelField
              label="מגדר"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.gender)}
                  onChange={(event) => setAf("gender", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.genders.map((gender) => (
                    <option key={gender.id} value={gender.id}>{gender.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="שנת לידה"
              mode="edit"
              editValue={(
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.birth_year)}
                  onChange={(event) => setAf("birth_year", event.target.value ? Number(event.target.value) : null)}
                  className={inputClassName}
                />
              )}
            />
          </AdminPanelSection>

          <AdminPanelSection title="תפקיד מקצועי">
            <AdminPanelField
              label="תפקיד"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.role)}
                  onChange={(event) => {
                    setAdminForm((previous) => ({
                      ...previous,
                      role: event.target.value ? Number(event.target.value) : null,
                      sub_role: [],
                    }));
                  }}
                >
                  <option value="">— בחר תפקיד —</option>
                  {dicts?.roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="ניסיון"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.experience)}
                  onChange={(event) => setAf("experience", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.experience.map((experience) => (
                    <option key={experience.id} value={experience.id}>{experience.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="כותרת מקצועית"
              mode="edit"
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.professional_title)}
                  onChange={(event) => setAf("professional_title", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="מספר רישיון"
              mode="edit"
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.license_no)}
                  onChange={(event) => setAf("license_no", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            {!!adminForm.role && (
              <div className="sm:col-span-2">
                <DictionaryMultiSelect
                  label="תת-תפקיד"
                  options={(dicts?.subRoles ?? []).filter((subRole) => subRole.role_id === Number(adminForm.role))}
                  value={adminForm.sub_role}
                  onChange={(value) => setAf("sub_role", value)}
                  placeholder="חיפוש תת-תפקיד..."
                />
              </div>
            )}
            <AdminPanelField
              label="מעסיק נוכחי"
              mode="edit"
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.current_employer)}
                  onChange={(event) => setAf("current_employer", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="הערות ימים ושעות"
              mode="edit"
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.work_schedule_text)}
                  onChange={(event) => setAf("work_schedule_text", event.target.value)}
                  className={inputClassName}
                />
              )}
            />
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="מערכות"
                options={dicts?.systems ?? []}
                value={adminForm.systems_used}
                onChange={(value) => setAf("systems_used", value)}
                placeholder="חיפוש מערכת..."
                grid
              />
            </div>
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="פרוצדורות / תחומי ניסיון"
                options={dicts?.procedures ?? []}
                value={adminForm.procedures_experience}
                onChange={(value) => setAf("procedures_experience", value)}
                placeholder="חיפוש תחום ניסיון..."
              />
            </div>
          </AdminPanelSection>

          <AdminPanelSection title="תנאים והעדפות לתעסוקה">
            <AdminPanelField
              label="ניידות"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.mobility_id)}
                  onChange={(event) => setAf("mobility_id", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.mobility.map((mobility) => (
                    <option key={mobility.id} value={mobility.id}>{mobility.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="מיסוי"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.tax_type_id)}
                  onChange={(event) => setAf("tax_type_id", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.taxTypes.map((taxType) => (
                    <option key={taxType.id} value={taxType.id}>{taxType.name}</option>
                  ))}
                </select>
              )}
            />
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="אזורים רלוונטיים לעבודה"
                options={dicts?.regions ?? []}
                value={adminForm.preferred_regions}
                onChange={(value) => setAf("preferred_regions", value)}
                placeholder="חיפוש אזור..."
              />
            </div>
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="ערים רלוונטיות לעבודה"
                options={dicts?.cities ?? []}
                value={adminForm.preferred_cities}
                onChange={(value) => setAf("preferred_cities", value)}
                placeholder="חיפוש עיר..."
              />
            </div>
            <AdminPanelField
              label="רלוונטי לכל הארץ"
              mode="edit"
              fullWidth
              editValue={(
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span>{Boolean(adminForm.preferred_all_country) ? "כן" : "לא"}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(adminForm.preferred_all_country)}
                    onChange={(event) => setAf("preferred_all_country", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                  />
                </label>
              )}
            />
          </AdminPanelSection>

          <AdminPanelSection title="מדיה חברתית">
            <AdminPanelField
              label="לינק לפייסבוק"
              mode="edit"
              fullWidth
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.facebook_url)}
                  onChange={(event) => setAf("facebook_url", event.target.value)}
                  className={inputClassName}
                  placeholder="https://facebook.com/..."
                />
              )}
            />
            <AdminPanelField
              label="שם פייסבוק"
              mode="edit"
              editValue={(
                <Input
                  dir="rtl"
                  value={selectValue(adminForm.facebook_name)}
                  onChange={(event) => setAf("facebook_name", event.target.value)}
                  className={inputClassName}
                  placeholder="שם כפי שמופיע בפייסבוק"
                />
              )}
            />
            <AdminPanelField
              label="Facebook ID"
              mode="edit"
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.facebook_id)}
                  onChange={(event) => setAf("facebook_id", event.target.value ? Number(event.target.value) : null)}
                  className={inputClassName}
                  placeholder="מספר מזהה אם קיים"
                />
              )}
            />
          </AdminPanelSection>

          <AdminPanelSection title="CRM">
            <AdminPanelField
              label="פולואפ הבא"
              mode="edit"
              editValue={(
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.next_follow_up ?? "").slice(0, 10)}
                  onChange={(event) => setAf("next_follow_up", event.target.value || null)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="קשר אחרון"
              mode="edit"
              editValue={(
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.last_contact_date ?? "").slice(0, 10)}
                  onChange={(event) => setAf("last_contact_date", event.target.value || null)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="הערות פנימיות"
              mode="edit"
              fullWidth
              editValue={(
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.notes)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setAf("notes", event.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              )}
            />
          </AdminPanelSection>

          <AdminPanelSection title="פרופיל ציבורי">
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="זמינות מועמד/ת"
                options={dicts?.availability ?? []}
                value={adminForm.candidate_availability_ids}
                onChange={(value) => setAf("candidate_availability_ids", value)}
                placeholder="חיפוש זמינות..."
              />
            </div>
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="היקף משרה רלוונטי"
                options={dicts?.scopes ?? []}
                value={adminForm.preferred_scope}
                onChange={(value) => setAf("preferred_scope", value)}
                placeholder="חיפוש היקף משרה..."
              />
            </div>
            <AdminPanelField
              label="שכר חודשי"
              mode="edit"
              editValue={(
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.salary_expectation_monthly)}
                  onChange={(event) => setAf("salary_expectation_monthly", event.target.value ? Number(event.target.value) : null)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="שכר שעתי"
              mode="edit"
              editValue={(
                <Input
                  type="number"
                  dir="ltr"
                  value={selectValue(adminForm.salary_expectation_hourly)}
                  onChange={(event) => setAf("salary_expectation_hourly", event.target.value ? Number(event.target.value) : null)}
                  className={inputClassName}
                />
              )}
            />
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="שפות"
                options={dicts?.languages ?? []}
                value={adminForm.languages}
                onChange={(value) => setAf("languages", value)}
                placeholder="חיפוש שפה..."
                grid
              />
            </div>
            <div className="sm:col-span-2">
              <DictionaryMultiSelect
                label="סוגי שכר רלוונטיים"
                options={dicts?.salaryTypes ?? []}
                value={adminForm.candidate_salary_type_ids}
                onChange={(value) => setAf("candidate_salary_type_ids", value)}
                placeholder="חיפוש סוג שכר..."
              />
            </div>
            <AdminPanelField
              label="יש קורות חיים"
              mode="edit"
              fullWidth
              editValue={(
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span>{Boolean(adminForm.has_cv) ? "כן" : "לא"}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(adminForm.has_cv)}
                    onChange={(event) => setAf("has_cv", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                  />
                </label>
              )}
            />
            <AdminPanelField
              label="לינק לקורות חיים"
              mode="edit"
              fullWidth
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.cv_link)}
                  onChange={(event) => setAf("cv_link", event.target.value)}
                  className={inputClassName}
                  placeholder="https://..."
                />
              )}
            />
            <AdminPanelField
              label="תאריך קבלת קו״ח"
              mode="edit"
              editValue={(
                <Input
                  type="date"
                  dir="ltr"
                  value={String(adminForm.cv_received_date ?? "").slice(0, 10)}
                  onChange={(event) => setAf("cv_received_date", event.target.value || null)}
                  className={inputClassName}
                />
              )}
            />
            <AdminPanelField
              label="לינק תיק עבודות"
              mode="edit"
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.portfolio_url)}
                  onChange={(event) => setAf("portfolio_url", event.target.value)}
                  className={inputClassName}
                  placeholder="https://..."
                />
              )}
            />
            <AdminPanelField
              label="לינק המלצות"
              mode="edit"
              fullWidth
              editValue={(
                <Input
                  dir="ltr"
                  value={selectValue(adminForm.recommendations_url)}
                  onChange={(event) => setAf("recommendations_url", event.target.value)}
                  className={inputClassName}
                  placeholder="https://..."
                />
              )}
            />
            <AdminPanelField
              label="פרופיל מקצועי"
              mode="edit"
              fullWidth
              editValue={(
                <Textarea
                  dir="rtl"
                  rows={4}
                  value={selectValue(adminForm.personal_summary)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setAf("personal_summary", event.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              )}
            />
            <AdminPanelField
              label="השכלה"
              mode="edit"
              fullWidth
              editValue={(
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.academic_education)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setAf("academic_education", event.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              )}
            />
            <AdminPanelField
              label="קורסים והסמכות"
              mode="edit"
              fullWidth
              editValue={(
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={selectValue(adminForm.professional_courses)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setAf("professional_courses", event.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              )}
            />
            <AdminPanelField
              label="כישורים נוספים"
              mode="edit"
              fullWidth
              editValue={(
                <Textarea
                  dir="rtl"
                  rows={2}
                  value={selectValue(adminForm.additional_skills_notes)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setAf("additional_skills_notes", event.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              )}
            />
          </AdminPanelSection>

          <AdminPanelSection title="🔒 סטטוסים — אדמין בלבד">
            <AdminPanelField
              label="סטטוס בדיקה"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.check_status)}
                  onChange={(event) => setAf("check_status", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.checkStatuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="סטטוס קשר במדיה חברתית"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.social_status)}
                  onChange={(event) => setAf("social_status", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.socialStatuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="מקור"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.source)}
                  onChange={(event) => setAf("source", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.sources.map((source) => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="סוג פרופיל"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.profile_type)}
                  onChange={(event) => setAf("profile_type", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.profileTypes.map((profileType) => (
                    <option key={profileType.id} value={profileType.id}>{profileType.name}</option>
                  ))}
                </select>
              )}
            />
            <AdminPanelField
              label="סטטוס תעסוקה"
              mode="edit"
              editValue={(
                <select
                  className={selectClassName}
                  value={selectValue(adminForm.work_status)}
                  onChange={(event) => setAf("work_status", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">— בחר —</option>
                  {dicts?.workStatuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              )}
            />
          </AdminPanelSection>
        </div>

        <div className="mt-2 border-t border-slate-100 pt-4">
          <AdminPanelActions
            mode="edit"
            onClose={() => onOpenChange(false)}
            onCancelEdit={() => onOpenChange(false)}
            onSave={handleSave}
            saving={saving}
            saveLabel="שמור שינויים"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
