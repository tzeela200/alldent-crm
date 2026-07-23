import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import {
  InlineEditableField,
  InlineEditableMultiSelect,
  InlineEditablePreviousEmployers,
  InlineEditableRoleSubRole,
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

export default function BlockProfessional({ contact, dicts, onUpdate }: Props) {
  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">מקצועיות דנטלית</h2>
          <div>
            <InlineEditableField
              label="כותרת מקצועית"
              value={contact.professional_title}
              onSave={(value) => onUpdate({ professional_title: value })}
            />
            <InlineEditableField
              label="סיכום מקצועי"
              value={contact.personal_summary}
              type="textarea"
              onSave={(value) => onUpdate({ personal_summary: value })}
            />
            <InlineEditableRoleSubRole
              roleId={contact.role}
              subRoleIds={contact.sub_role}
              roles={dicts.roles}
              subRoles={dicts.subRoles}
              onSave={(roleId, subRoleIds) => onUpdate({ role: roleId, sub_role: subRoleIds })}
            />
            <InlineEditableField
              label="מספר רישיון"
              value={contact.license_no}
              onSave={(value) => onUpdate({ license_no: value })}
            />
            <InlineEditableField
              label="ניסיון"
              value={contact.experience}
              displayValue={dictName(dicts.experience, contact.experience)}
              type="select"
              options={dicts.experience}
              onSave={(value) => onUpdate({ experience: value })}
            />
            <InlineEditableMultiSelect
              label="פרוצדורות וניסיון קליני"
              values={contact.procedures_experience}
              options={dicts.procedures}
              placeholder="חיפוש פרוצדורה..."
              onSave={(values) => onUpdate({ procedures_experience: values })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">ניסיון תעסוקתי</h2>
          <div>
            <InlineEditableField
              label="מעסיק נוכחי"
              value={contact.current_employer}
              onSave={(value) => onUpdate({ current_employer: value })}
            />
            <InlineEditablePreviousEmployers
              value={contact.previous_employers}
              onSave={(value) => onUpdate({ previous_employers: value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold leading-[1.3] text-slate-900">השכלה וכישורים</h2>
          <div>
            <InlineEditableField
              label="השכלה אקדמית"
              value={contact.academic_education}
              type="textarea"
              onSave={(value) => onUpdate({ academic_education: value })}
            />
            <InlineEditableField
              label="קורסים מקצועיים"
              value={contact.professional_courses}
              type="textarea"
              onSave={(value) => onUpdate({ professional_courses: value })}
            />
            <InlineEditableField
              label="כישורים נוספים"
              value={contact.additional_skills_notes}
              type="textarea"
              onSave={(value) => onUpdate({ additional_skills_notes: value })}
            />
            <InlineEditableMultiSelect
              label="מערכות ותוכנות"
              values={contact.systems_used}
              options={dicts.systems}
              placeholder="חיפוש מערכת..."
              onSave={(values) => onUpdate({ systems_used: values })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
