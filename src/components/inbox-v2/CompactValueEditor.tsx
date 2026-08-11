/**
 * עורך ערך קומפקטי לתוך שורת ההשוואה — האפשרות "ערך אחר" (INC-3123).
 *
 * הדרישה: לא לפתוח Picker גדול בכל שורה, אבל גם לא ליצור מנגנון שני.
 * לכן שדות מילוניים משתמשים **באותם מקורות אמת ובאותה לוגיקה** של
 * הרכיבים הקיימים:
 *
 *  עיר  → `CityCombobox` שכבר מיוצא מ-`CityRegionPicker`, ניזון מאותו
 *         queryKey `['dict_cities-all']`. אין שליפה שנייה ואין רשימת
 *         ערים מקבילה.
 *  תפקיד → `dict_roles` דרך `useApplicationDicts` (18 ערכים — select פשוט מספיק).
 *  סוג ארגון → `dict_account_types` דרך אותו queryKey שכבר בשימוש במסך.
 *
 * ⚠ אזור אינו נערך כאן. לשתי טבלאות הליבה יש טריגר שגוזר אזור מעיר
 *   (`trg_contact_fill_region_locality_from_city`,
 *    `trg_accounts_fill_region_from_city_id`) — כתיבה ידנית הייתה
 *   מתנגשת איתו.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CityCombobox } from '@/components/ui/CityRegionPicker'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useApplicationDicts } from '@/hooks/useApplicationDicts'
import type { FieldKind } from '@/lib/inbox-v2-merge'

/** אותו queryKey שכבר בשימוש ב-CreateAccountFromLeadDialog — cache משותף. */
function useAccountTypes() {
  return useQuery({
    queryKey: ['dict_account_types'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_types').select('id, name').order('id')
      if (error) throw new Error(`טעינת סוגי ארגון נכשלה: ${error.message}`)
      return (data ?? []) as { id: number; name: string }[]
    },
  })
}

const INPUT_CLASS =
  'h-9 w-full rounded-[10px] border border-[#D9D9D9] bg-white px-2.5 text-[12px] text-[#2D2D2D] outline-none focus:border-[#008080]'

interface Props {
  kind: FieldKind
  value: unknown
  onChange: (value: unknown) => void
}

export function CompactValueEditor({ kind, value, onChange }: Props) {
  const { data: cities = [] } = useInboxV2Cities()
  const { data: dicts } = useApplicationDicts()
  const { data: accountTypes = [] } = useAccountTypes()

  if (kind === 'city') {
    return (
      <CityCombobox
        variant="filter"
        cities={cities}
        value={typeof value === 'number' ? value : null}
        // regionId מוחזר ומתעלמים ממנו במכוון — הטריגר במסד גוזר אזור מעיר
        onChange={(cityId) => onChange(cityId)}
        placeholder="חיפוש עיר…"
      />
    )
  }

  if (kind === 'role') {
    return (
      <select
        className={INPUT_CLASS}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">בחרי תפקיד…</option>
        {(dicts?.roles ?? []).map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    )
  }

  if (kind === 'account_type') {
    return (
      <select
        className={INPUT_CLASS}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">בחרי סוג ארגון…</option>
        {accountTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    )
  }

  const inputType = kind === 'email' ? 'email' : kind === 'url' ? 'url' : 'text'
  const placeholder =
    kind === 'phone' ? '050-0000000' : kind === 'email' ? 'name@example.com' : kind === 'url' ? 'https://…' : 'ערך חדש'

  return (
    <input
      type={inputType}
      dir={kind === 'phone' || kind === 'email' || kind === 'url' || kind === 'fbid' ? 'ltr' : 'auto'}
      className={INPUT_CLASS}
      placeholder={placeholder}
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value || null)}
    />
  )
}
