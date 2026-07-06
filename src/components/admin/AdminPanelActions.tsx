// שורת פעולות אחידה ל-Footer של פאנל אדמין. תוכן לפי מצב:
// view: סגור, עריכה (אם מותר), פעולה מרכזית אחת. edit: ביטול, שמור, פעולה נוספת
// רק אם נדרשת. create: ביטול, צור/שמור בלבד.
interface AdminPanelActionsProps {
  mode: 'view' | 'edit' | 'create'
  onClose: () => void
  onEdit?: () => void
  onCancelEdit?: () => void
  onSave?: () => void
  saving?: boolean
  /** פעולה מרכזית נוספת במצב צפייה (למשל "מעבר למסך 360") */
  primaryAction?: { label: string; onClick: () => void }
  saveLabel?: string
}

export function AdminPanelActions({
  mode,
  onClose,
  onEdit,
  onCancelEdit,
  onSave,
  saving,
  primaryAction,
  saveLabel,
}: AdminPanelActionsProps) {
  if (mode === 'view') {
    return (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#D9D9D9] px-5 py-2.5 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]"
        >
          סגירה
        </button>
        <div className="flex items-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="rounded-full border border-[#008080] px-5 py-2.5 text-[13px] font-semibold text-[#008080] transition hover:bg-[#E6F3F3]"
            >
              {primaryAction.label}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full bg-[#008080] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#006D6D]"
            >
              עריכה
            </button>
          )}
        </div>
      </div>
    )
  }

  // edit | create
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={mode === 'edit' ? onCancelEdit ?? onClose : onClose}
        disabled={saving}
        className="rounded-full border border-[#D9D9D9] px-5 py-2.5 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6] disabled:opacity-50"
      >
        ביטול
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-[#008080] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#006D6D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'שומר…' : saveLabel ?? (mode === 'create' ? 'צור' : 'שמור')}
      </button>
    </div>
  )
}
