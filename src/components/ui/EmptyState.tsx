import type { ReactNode } from "react";

/**
 * Shared empty state for AllDent screens — admin and candidate-facing alike.
 *
 * A missing value is an invitation, not an error: the card says what belongs
 * there and, when the viewer may fill it, offers the action that does. Use this
 * instead of repeating a bare "לא הוזן" down a page.
 */
export function EmptyState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-5 text-center">
      {icon && (
        <div className="mb-2 flex justify-center text-slate-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-[14px] leading-6 text-[#4B5563]">{text}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="no-print mt-2 rounded-lg text-[14px] font-semibold text-[#008080] transition hover:text-[#006666] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
