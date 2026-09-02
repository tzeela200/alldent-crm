import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ActionButton } from '@/components/layout/Shell'
import { useInboxBulkCreate, type BulkCreateCandidate } from '@/hooks/useInboxBulkCreate'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useInboxV2Cities } from '@/hooks/useInboxV2Cities'
import { useGenders } from '@/hooks/useGenders'
import { formatPhone } from '@/lib/normalizePhone'
import { toast } from 'sonner'

/**
 * הקמה גורפת של אנשי קשר מהשורות הנבחרות (INC-3137).
 *
 * שני מסכים: **תוכנית** (קריאה בלבד — מה ייווצר ומה ידולג ולמה), ואז
 * כתיבה אחרי אישור מפורש. זו אותה תבנית של אשף הייבוא, ומאותה סיבה:
 * פעולה שכותבת עשרות רשומות ל-`contact` לא מתחילה מלחיצה אחת.
 *
 * מה שמדולג **מוצג עם הסיבה** ולא נעלם בשקט — שורה שדולגה בלי שהמשתמשת
 * יודעת למה היא בדיוק סוג התקלה שהמסך הזה נבנה כדי למנוע.
 */

interface Props {
  leadIds: number[]
  onClose: () => void
  /** נקרא אחרי הרצה מוצלחת — לניקוי הבחירה ורענון הטבלה. */
  onDone: () => void
}

export function BulkCreateDialog({ leadIds, onClose, onDone }: Props) {
  const { plan, run, planning, running, progress } = useInboxBulkCreate()
  const { data: dicts } = useApplicationDicts()
  const { data: cities } = useInboxV2Cities()
  const { data: genders } = useGenders()

  const [candidates, setCandidates] = useState<BulkCreateCandidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    plan(leadIds)
      .then((result) => alive && setCandidates(result))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'בניית התוכנית נכשלה'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadIds.join(',')])

  const eligible = (candidates ?? []).filter((c) => !c.skipReason)
  const skipped = (candidates ?? []).filter((c) => c.skipReason)

  const cityName = (id: number | null) =>
    id != null ? (cities?.find((c) => c.id === id)?.name ?? '—') : '—'
  const genderName = (id: number | null) =>
    id != null ? (genders?.find((g) => g.id === id)?.name ?? '—') : 'לא נקבע'

  const handleRun = async () => {
    if (!candidates) return
    const outcome = await run(candidates)

    if (outcome.created) {
      toast.success(`הוקמו ${outcome.created} אנשי קשר חדשים`)
    }
    if (outcome.failed.length) {
      toast.error(
        `${outcome.failed.length} שורות לא הוקמו. הראשונה: ${outcome.failed[0].name} — ${outcome.failed[0].message}`
      )
    }
    if (!outcome.created && !outcome.failed.length) {
      toast.error('לא הוקמה אף רשומה — כל השורות שנבחרו דולגו')
    }

    if (outcome.created) {
      onDone()
      onClose()
    } else {
      // נשארים במסך כדי שהסיבות יישארו לעיון.
      setCandidates(await plan(leadIds))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#008080]" />
            הקמה גורפת של אנשי קשר
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="py-4 text-sm font-medium text-[#B42318]">{error}</p>
        ) : planning || !candidates ? (
          <p className="py-6 text-center text-sm text-slate-400">בונה תוכנית…</p>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-[#6B6B6B]">
              נבחרו <strong className="text-[#2D2D2D]">{candidates.length}</strong> שורות.
              יוקמו <strong className="text-[#067647]">{eligible.length}</strong>
              {skipped.length > 0 && (
                <>
                  {' · '}ידולגו <strong className="text-[#B54708]">{skipped.length}</strong>
                </>
              )}
              . הערכים נלקחים מהשורה עצמה וניתן לערוך כל רשומה אחרי ההקמה.
            </p>

            {eligible.length > 0 && (
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#067647]">
                  <CheckCircle2 className="h-4 w-4" />
                  יוקמו ({eligible.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[#6B6B6B]">
                      <tr>
                        <th className="p-2 text-right font-semibold">שם</th>
                        <th className="p-2 text-right font-semibold">תפקיד</th>
                        <th className="p-2 text-right font-semibold">עיר</th>
                        <th className="p-2 text-right font-semibold">מגדר</th>
                        <th className="p-2 text-right font-semibold">נייד</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eligible.map((c) => (
                        <tr key={c.leadId}>
                          <td className="p-2 font-medium text-[#2D2D2D]">{c.name}</td>
                          <td className="p-2 text-[#6B6B6B]">
                            {c.roleId != null ? getDictLabel(dicts?.roles, c.roleId) : '—'}
                          </td>
                          <td className="p-2 text-[#6B6B6B]">{cityName(c.cityId)}</td>
                          <td
                            className={
                              c.genderId == null ? 'p-2 text-[#B54708]' : 'p-2 text-[#6B6B6B]'
                            }
                          >
                            {genderName(c.genderId)}
                          </td>
                          <td className="p-2 text-[#6B6B6B]" dir="ltr">
                            {c.phone ? formatPhone(c.phone) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {skipped.length > 0 && (
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#B54708]">
                  <AlertTriangle className="h-4 w-4" />
                  ידולגו ({skipped.length})
                </h3>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {skipped.map((c) => (
                    <div key={c.leadId} className="flex items-start justify-between gap-3 p-2">
                      <span className="text-[12px] font-medium text-[#2D2D2D]">{c.name}</span>
                      <span className="text-[11px] text-[#B54708]">{c.skipReason}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="text-[11px] text-[#9CA3AF]">
                {running ? `מקים… ${progress}/${eligible.length}` : 'הפעולה כותבת רשומות חדשות למאגר.'}
              </span>
              <div className="flex gap-2">
                <ActionButton variant="secondary" size="sm" onClick={onClose} disabled={running}>
                  ביטול
                </ActionButton>
                <ActionButton
                  variant="primary"
                  size="sm"
                  icon={UserPlus}
                  onClick={handleRun}
                  disabled={running || eligible.length === 0}
                >
                  {running ? 'מקים…' : `אשר והקם ${eligible.length}`}
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
