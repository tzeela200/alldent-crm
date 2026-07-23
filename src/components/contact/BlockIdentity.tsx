import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import {
  InlineEditableCity,
  InlineEditableField,
  InlineEditableMultiSelect,
  InlineEditableName,
} from "@/components/contact/InlineEditableField";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null || id === "") return "—";
  return list.find((item) => Number(item.id) === Number(id))?.name ?? "—";
}

export default function BlockIdentity({ contact, dicts, onUpdate }: Props) {
  return (
    <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <CardContent className="p-6">
        <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">פרטים אישיים ויצירת קשר</h2>
        <div>
          <InlineEditableName
            firstName={contact.first_name}
            lastName={contact.last_name}
            displayName={contact.display_name}
            onSave={async (firstName, lastName) => {
              const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
              const shouldSyncDisplay = !contact.display_name || contact.display_name === contact.full_name;
              await onUpdate({
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                ...(shouldSyncDisplay ? { display_name: fullName } : {}),
              });
            }}
          />
          <InlineEditableField
            label="שם תצוגה"
            value={contact.display_name}
            onSave={(value) => onUpdate({ display_name: value })}
          />
          <InlineEditableField
            label="נייד"
            value={contact.phone}
            type="tel"
            placeholder="05X-XXXXXXX"
            onSave={(value) => onUpdate({ phone: value })}
          />
          <InlineEditableField
            label="נייד נוסף"
            value={contact.second_phone}
            type="tel"
            placeholder="05X-XXXXXXX"
            onSave={(value) => onUpdate({ second_phone: value })}
          />
          <InlineEditableField
            label="אימייל"
            value={contact.email}
            type="email"
            placeholder="name@example.com"
            onSave={(value) => onUpdate({ email: value })}
          />
          <InlineEditableField
            label="אימייל נוסף"
            value={contact.second_email}
            type="email"
            placeholder="name@example.com"
            onSave={(value) => onUpdate({ second_email: value })}
          />
          <InlineEditableField
            label="מגדר"
            value={contact.gender}
            displayValue={dictName(dicts.genders, contact.gender)}
            type="select"
            options={dicts.genders}
            onSave={(value) => onUpdate({ gender: value })}
          />
          <InlineEditableField
            label="שנת לידה"
            value={contact.birth_year}
            type="number"
            placeholder="לדוגמה 1990"
            onSave={(value) => onUpdate({ birth_year: value })}
          />
          <InlineEditableCity
            cityId={contact.city_id}
            regionId={contact.region_id}
            cities={dicts.cities}
            regions={dicts.regions}
            onSave={(cityId, regionId) => onUpdate({ city_id: cityId, region_id: regionId })}
          />
          <InlineEditableMultiSelect
            label="שפות"
            values={contact.languages}
            options={dicts.languages}
            placeholder="חיפוש שפה..."
            onSave={(values) => onUpdate({ languages: values })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
