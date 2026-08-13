import { useEffect, useRef } from 'react'
import { MessageSquareText } from 'lucide-react'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { useEmploymentIntakeSource } from '@/hooks/useEmploymentIntakeSource'
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_TONE } from '@/lib/employment-intake/labels'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

function formatDateTime(iso: string | null): string {
  if (!iso) return 'ללא זמן מקור'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

interface Props {
  selectedRow: RowWithAction | null
  /** בתוך SidePanel במובייל: בלי מעטפת sticky/כותרת כפולה. */
  embedded?: boolean
}

/**
 * פאנל מקור קבוע. לחיצה על שורה בטבלה אינה פותחת Debug: היא ממקמת את
 * ההודעה בתוך רצף המקור ומדגישה אותה בצהוב, עם ההודעות הסמוכות סביב.
 */
export function IntakeSourceContext({ selectedRow, embedded = false }: Props) {
  const source = useEmploymentIntakeSource(selectedRow?.import_id ?? null)
  const selectedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedRow || source.isLoading) return
    requestAnimationFrame(() => selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [selectedRow?.id, source.isLoading])

  return (
    <aside
      className={embedded
        ? 'min-h-0 overflow-hidden bg-white'
        : 'overflow-hidden rounded-[18px] border border-[#D9D9D9] bg-white lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]'}
      aria-label="המקור והקשר השיחה"
    >
      {!embedded && (
        <div className="border-b border-[#D9D9D9] px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#2D2D2D]">
            <MessageSquareText className="h-4 w-4 text-[#008080]" />
            המקור והקשר השיחה
          </div>
          <p className="mt-1 text-[12px] text-[#6B6B6B]">
            לחצי על שורה בטבלה כדי לאתר אותה כאן. הודעות מערכת נשארות במקור גם כשהן מוסתרות משולחן העבודה.
          </p>
        </div>
      )}

      {!selectedRow ? (
        <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-[13px] text-[#6B6B6B]">
          בחרי רשומה בטבלה כדי לראות את ההודעה המקורית ואת ההקשר שסביבה.
        </div>
      ) : source.isLoading ? (
        <div className="p-6 text-[13px] text-[#6B6B6B]">טוען את מקור השיחה…</div>
      ) : source.isError ? (
        <div className="p-6 text-[13px] text-[#DC2626]">לא ניתן לטעון את מקור השיחה.</div>
      ) : (
        <div className={embedded ? 'max-h-[calc(100vh-9rem)] space-y-2 overflow-y-auto p-1' : 'max-h-[calc(100vh-9rem)] space-y-2 overflow-y-auto p-3'}>
          {(source.data ?? []).map((message) => {
            const active = message.id === selectedRow.id
            const systemNoise = message.tags?.includes('system_noise')
            return (
              <div
                key={message.id}
                ref={active ? selectedRef : undefined}
                className={`rounded-[12px] border p-3 transition-colors ${
                  active
                    ? 'border-[#E0B238] bg-[#FFF7CC] shadow-sm'
                    : systemNoise
                      ? 'border-[#E5E7EB] bg-[#F9FAFB] opacity-70'
                      : 'border-[#E5E7EB] bg-white'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-[#2D2D2D]">{message.sender_name ?? 'הודעת מערכת'}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{formatDateTime(message.source_published_at)}</div>
                  </div>
                  {!systemNoise && (
                    <AdminBadge label={CONTENT_TYPE_LABEL[message.content_type]} variant={CONTENT_TYPE_TONE[message.content_type]} />
                  )}
                </div>
                <div className="whitespace-pre-wrap break-words text-[13px] leading-6 text-[#2D2D2D]" dir="auto">
                  {message.original_text}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
