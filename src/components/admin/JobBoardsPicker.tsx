/**
 * INC-3132 — בחירת לוחות ציבוריים נוספים למשרה.
 *
 * הלוח הציבורי חתוך לשבעה לוחות תפקיד, וכל משרה שייכת מטבעה ללוח אחד
 * לפי `job_role`. הרכיב הזה מאפשר להוסיף עליו לוחות נוספים — למשרה
 * משולבת כמו "סייעת לתפקיד מזכירה" או "רופא שיניים או מומחה שיקום".
 *
 * ⚠️ הלוח של התפקיד עצמו מוצג מסומן ומושבת. הוא נכלל תמיד ואינו נשמר
 * בעמודה: הסינון בצד הציבורי עושה OR על `job_role`, ולכן ההכללה שלו
 * מובטחת מבנית ולא תלויה במה שנשמר כאן.
 */
import {
  ALL_ROLE_SLUGS,
  PUBLIC_BOARD_LABELS,
  boardSlugForRoleId,
  type RolePageSlug,
} from '@/lib/publicRolePages'
import { FieldLabel } from '@/components/ui/AdminField'

export function JobBoardsPicker({
  roleId,
  value,
  onChange,
}: {
  /** job_role הנוכחי — קובע מהו הלוח הראשי */
  roleId: number | null
  value: string[]
  onChange: (next: string[]) => void
}) {
  const primary = boardSlugForRoleId(roleId)
  const selected = new Set(value)

  function toggle(slug: RolePageSlug) {
    if (slug === primary) return
    onChange(selected.has(slug) ? value.filter((s) => s !== slug) : [...value, slug])
  }

  const extraCount = value.filter((s) => s !== primary).length

  return (
    <div className="lg:col-span-2">
      <FieldLabel hint={extraCount ? `${extraCount} לוחות נוספים` : undefined}>
        לוחות ציבוריים
      </FieldLabel>

      {!roleId ? (
        <p className="rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-3 py-2.5 text-[13px] text-[#6B6B6B]">
          יש לבחור תפקיד תחילה — הלוח הראשי נגזר ממנו.
        </p>
      ) : (
        <>
          {!primary && (
            <p className="mb-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[13px] font-semibold text-[#B45309]">
              התפקיד שנבחר אינו משויך לשום לוח תפקיד, ולכן המשרה לא תופיע באף
              לוח אלא אם תסמני לוח כאן.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_ROLE_SLUGS.map((slug) => {
              const isPrimary = slug === primary
              const checked = isPrimary || selected.has(slug)
              return (
                <label
                  key={slug}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                    isPrimary
                      ? 'cursor-default border-[#008080]/40 bg-[#E6F3F3]'
                      : 'cursor-pointer border-[#D9D9D9] bg-[#FAFAF7] hover:border-[#008080]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPrimary}
                    onChange={() => toggle(slug)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#008080]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[#2D2D2D]">
                      {PUBLIC_BOARD_LABELS[slug]}
                    </span>
                    {isPrimary && (
                      <span className="mt-0.5 block text-[12px] leading-5 text-[#008080]">
                        נכלל אוטומטית לפי התפקיד
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          <p className="mt-2 text-[12px] leading-5 text-[#9CA3AF]">
            סימון לוח נוסף מוסיף את המשרה גם אליו. הכרטיס תמיד יציג את התפקיד
            האמיתי של המשרה, כך שברור שמדובר במשרה משולבת.
          </p>
        </>
      )}
    </div>
  )
}

/**
 * ניקוי לפני שמירה: מסיר את הלוח הראשי (מיותר — הוא נכלל ממילא), כפילויות
 * וערכים שאינם slug מוכר. בלי זה, ערך זר היה נדחה ע"י ה-CHECK ב-DB
 * והשמירה כולה הייתה נכשלת.
 */
export function cleanExtraBoards(value: string[], roleId: number | null): string[] {
  const primary = boardSlugForRoleId(roleId)
  const valid = new Set<string>(ALL_ROLE_SLUGS)
  return [...new Set(value)].filter((s) => valid.has(s) && s !== primary)
}
