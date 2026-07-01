import React from "react";
import type { ContactRow, Contact360Dicts } from "@/hooks/useContact360";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  contact: ContactRow;
  dicts: Contact360Dicts;
}

function dictName(list: { id: number; name: string }[], id: unknown): string {
  if (id == null) return "—";
  return list.find((d) => d.id === Number(id))?.name ?? "—";
}

function LV({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-bold text-teal-700 border-b border-teal-100 pb-1 mb-3">{children}</h4>;
}

export default function BlockProfessional({ contact, dicts }: Props) {
  const subRoleNames = Array.isArray(contact.sub_role)
    ? contact.sub_role.map((id) => dictName(dicts.subRoles, id)).filter((n) => n !== "—")
    : [];

  const procedureNames = Array.isArray(contact.procedures_experience)
    ? contact.procedures_experience.map((id) => dictName(dicts.procedures, id)).filter((n) => n !== "—")
    : [];

  const systemNames = Array.isArray(contact.systems_used)
    ? contact.systems_used.map((id) => dictName(dicts.systems, id)).filter((n) => n !== "—")
    : [];

  const employers = Array.isArray(contact.previous_employers) ? contact.previous_employers : [];

  return (
    <div className="space-y-5">
      {/* בלוק 2: מקצועיות דנטלית */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-lg font-bold text-slate-900">מקצועיות דנטלית</h3>
          <div className="divide-y divide-slate-100">
            <LV label="כותרת מקצועית" value={contact.professional_title} />
            <LV label="תפקיד" value={dictName(dicts.roles, contact.role) !== "—" ? dictName(dicts.roles, contact.role) : undefined} />
            {subRoleNames.length > 0 && (
              <div className="py-2">
                <div className="text-sm text-slate-500 mb-2">תת-תפקיד</div>
                <div className="flex flex-wrap gap-1.5">
                  {subRoleNames.map((n) => (
                    <Badge key={n} className="rounded-full border border-teal-200 bg-teal-50 text-teal-700 px-2 py-0.5 text-xs shadow-none">{n}</Badge>
                  ))}
                </div>
              </div>
            )}
            <LV label="מס׳ רישיון" value={contact.license_no?.toString()} />
            <LV label="ניסיון" value={dictName(dicts.experience, contact.experience) !== "—" ? dictName(dicts.experience, contact.experience) : undefined} />
            <div className="py-2">
              <div className="text-sm text-slate-500 mb-2">פרוצדורות</div>
              {procedureNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {procedureNames.map((n) => (
                    <Badge key={n} className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 px-2 py-0.5 text-xs shadow-none">{n}</Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">טרם הוגדרו פרוצדורות</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* בלוק 3: מקצועיות תעסוקתית */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-lg font-bold text-slate-900">מקצועיות תעסוקתית</h3>
          <div className="divide-y divide-slate-100">
            <LV label="מעסיק נוכחי" value={contact.current_employer} />
          </div>
          {employers.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-slate-500 mb-2">מעסיקים קודמים</div>
              <div className="space-y-3">
                {employers.map((emp, i) => (
                  <div key={i} className="border-r-2 border-teal-200 pr-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{emp.name ?? "—"}</span>
                      {emp.years && <span className="text-xs text-slate-500">{emp.years}</span>}
                    </div>
                    {emp.role && <div className="text-xs text-teal-700 mt-0.5">{emp.role}</div>}
                    {emp.description && <div className="text-xs text-slate-600 mt-1">{emp.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {employers.length === 0 && !contact.current_employer && (
            <p className="text-sm text-slate-400 mt-2">לא הוזן עדיין</p>
          )}
        </CardContent>
      </Card>

      {/* בלוק 4: השכלה וכישורים */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-lg font-bold text-slate-900">השכלה וכישורים</h3>
          <div className="divide-y divide-slate-100">
            <LV label="השכלה אקדמית" value={contact.academic_education} />
            <LV label="קורסים מקצועיים" value={contact.professional_courses} />
            <LV label="כישורים נוספים" value={contact.additional_skills_notes} />
          </div>
          {systemNames.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-slate-500 mb-2">מערכות</div>
              <div className="flex flex-wrap gap-1.5">
                {systemNames.map((n) => (
                  <Badge key={n} className="rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-xs shadow-none">{n}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
