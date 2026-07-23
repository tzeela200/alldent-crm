import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { InlineEditableField, InlineEditableMultiSelect } from "@/components/contact/InlineEditableField";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((item) => Number(item.id) === Number(id))?.name ?? "—";
}

function money(value: number | null | undefined): string | null {
  return value == null ? null : `₪${Number(value).toLocaleString("he-IL")}`;
}

export default function BlockConditions({ contact, dicts, onUpdate }: Props) {
  return (
    <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">תנאים והעדפות לתעסוקה</h2>
        <div>
          <InlineEditableField
            label="נגישות / אופן הגעה"
            value={contact.mobility_id}
            displayValue={dictName(dicts.mobility, contact.mobility_id)}
            type="select"
            options={dicts.mobility}
            onSave={(value) => onUpdate({ mobility_id: value })}
          />
          <InlineEditableField
            label="סוג העסקה / מיסוי"
            value={contact.tax_type_id}
            displayValue={dictName(dicts.taxTypes, contact.tax_type_id)}
            type="select"
            options={dicts.taxTypes}
            onSave={(value) => onUpdate({ tax_type_id: value })}
          />
          <InlineEditableField
            label="ציפיות שכר חודשי"
            value={contact.salary_expectation_monthly}
            displayValue={money(contact.salary_expectation_monthly)}
            type="number"
            onSave={(value) => onUpdate({ salary_expectation_monthly: value })}
          />
          <InlineEditableField
            label="ציפיות שכר שעתי"
            value={contact.salary_expectation_hourly}
            displayValue={money(contact.salary_expectation_hourly)}
            type="number"
            onSave={(value) => onUpdate({ salary_expectation_hourly: value })}
          />
          <InlineEditableField
            label="אילוצים בימים ובשעות"
            value={contact.work_schedule_text}
            type="textarea"
            onSave={(value) => onUpdate({ work_schedule_text: value })}
          />
          <InlineEditableField
            label="פתוח/ה לעבודה בכל הארץ"
            value={Boolean(contact.preferred_all_country)}
            displayValue={contact.preferred_all_country ? "כן" : "לא"}
            type="boolean"
            onSave={(value) => onUpdate({ preferred_all_country: value })}
          />
          <InlineEditableMultiSelect
            label="זמינות"
            values={contact.candidate_availability_ids}
            options={dicts.availability}
            placeholder="חיפוש זמינות..."
            onSave={(values) => onUpdate({ candidate_availability_ids: values })}
          />
          <InlineEditableMultiSelect
            label="היקף משרה"
            values={contact.preferred_scope}
            options={dicts.scopes}
            placeholder="חיפוש היקף..."
            onSave={(values) => onUpdate({ preferred_scope: values })}
          />
          <InlineEditableMultiSelect
            label="סוגי שכר"
            values={contact.candidate_salary_type_ids}
            options={dicts.salaryTypes}
            placeholder="חיפוש סוג שכר..."
            onSave={(values) => onUpdate({ candidate_salary_type_ids: values })}
          />
          <InlineEditableMultiSelect
            label="אזורים מתאימים לעבודה"
            values={contact.preferred_regions}
            options={dicts.regions}
            placeholder="חיפוש אזור..."
            onSave={(values) => onUpdate({ preferred_regions: values })}
          />
          <InlineEditableMultiSelect
            label="ערים מתאימות לעבודה"
            values={contact.preferred_cities}
            options={dicts.cities}
            placeholder="חיפוש עיר..."
            onSave={(values) => onUpdate({ preferred_cities: values })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
