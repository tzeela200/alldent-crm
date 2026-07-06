// תג תפקיד — נגזר ממקור-האמת היחיד לצבעי תפקיד (lib/roleColors.ts).
// צ'יפ פסטלי (רקע בהיר + טקסט כהה) במכוון שונה מצ'יפ אזור המלא.
import { getRoleColor, getRoleColorHex } from '@/lib/roleColors'

export { getRoleColor, getRoleColorHex }

export function RoleBadge({ roleId, label }: { roleId: number | null | undefined; label: string }) {
  const c = getRoleColor(roleId)
  return (
    <span
      className="inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.chipBg, color: c.chipText }}
    >
      {label}
    </span>
  )
}
