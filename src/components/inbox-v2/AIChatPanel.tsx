import { Sparkles, X } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function AIChatPanel({ onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 top-0 z-50 flex w-[380px] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">עוזר AI</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <Sparkles className="h-8 w-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-slate-700">העוזר החכם יחובר בשלב הבא</h4>
            <p className="text-sm leading-relaxed text-slate-400">
              בקרוב תוכלו לשאול שאלות על אצוות, רשומות והתאמות.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <input
            type="text"
            disabled
            placeholder="שאל את העוזר..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-300"
          />
        </div>
      </div>
    </>
  )
}
