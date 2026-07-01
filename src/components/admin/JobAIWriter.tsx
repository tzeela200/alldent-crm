import React, { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

type AIField = 'job_title' | 'public_excerpt' | 'job_description' | 'job_requirements' | 'work_schedule_text'

interface JobAIWriterProps {
  mode: 'admin' | 'employer'
  field: AIField
  currentValue: string
  jobContext?: { title?: string; role?: string; city?: string }
  onApply: (newValue: string) => void
}

const FIELD_LABELS: Record<AIField, string> = {
  job_title: 'כותרת משרה',
  public_excerpt: 'תקציר ציבורי',
  job_description: 'תיאור משרה',
  job_requirements: 'דרישות משרה',
  work_schedule_text: 'ימים ושעות עבודה',
}

const ADMIN_PROMPTS: Record<AIField, string> = {
  job_title: 'נסח כותרת משרה שיווקית, קצרה ומדויקת לתחום הדנטלי. החזר רק את הכותרת, בלי הסברים.',
  public_excerpt: 'כתוב תקציר ציבורי מושך של 2-3 משפטים שמתאר את המשרה לתחום הדנטלי. החזר רק את הטקסט.',
  job_description: 'שפר את תיאור המשרה — מקצועי, שיווקי, RTL. שמור על עובדות ואל תמציא נתונים. החזר רק את הטקסט.',
  job_requirements: 'סדר ושפר את דרישות המשרה — רשימה ברורה, לא מנפחת. החזר רק את הטקסט.',
  work_schedule_text: 'נסח את תנאי ימי ושעות העבודה בצורה אטרקטיבית ומסודרת. החזר רק את הטקסט.',
}

const EMPLOYER_PROMPTS: Record<AIField, string> = {
  job_title: 'שפר את ניסוח כותרת המשרה שכתב המעסיק. אל תשנה עיר, תפקיד, שכר, היקף או סטטוסים. החזר רק את הכותרת.',
  public_excerpt: 'שפר את התקציר שכתב המעסיק. אל תמציא נתונים. החזר רק את הטקסט.',
  job_description: 'שפר את תיאור המשרה שכתב המעסיק. אל תשנה עיר, תפקיד, שכר, היקף. החזר רק את הטקסט.',
  job_requirements: 'סדר ושפר את דרישות המשרה שכתב המעסיק. אל תמציא דרישות חדשות. החזר רק את הטקסט.',
  work_schedule_text: 'סדר את ימי ושעות העבודה שכתב המעסיק. אל תשנה ימים או שעות. החזר רק את הטקסט.',
}

const FUNCTION_NAME = 'ai-job-description'

async function callAIWriter(payload: {
  mode: 'admin' | 'employer'
  field: AIField
  currentValue: string
  prompt: string
  jobContext?: { title?: string; role?: string; city?: string }
}): Promise<string> {
  console.log('[JobAIWriter] payload:', payload)

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      description: payload.currentValue,
      jobTitle: payload.jobContext?.title,
      jobRole: payload.jobContext?.role,
    },
  })

  if (error) {
    console.warn('[JobAIWriter] Edge Function error:', error.message)
    throw new Error('שגיאה בשירות ה-AI. נסה שנית.')
  }

  const result = data?.improved
  if (typeof result !== 'string' || !result.trim()) {
    throw new Error('התקבלה תשובה ריקה מה-AI.')
  }
  return result.trim()
}

export default function JobAIWriter({ mode, field, currentValue, jobContext, onApply }: JobAIWriterProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [notConnected, setNotConnected] = useState(false)

  const fieldLabel = FIELD_LABELS[field]
  const prompts = mode === 'admin' ? ADMIN_PROMPTS : EMPLOYER_PROMPTS
  const prompt = prompts[field]

  const handleImprove = async () => {
    if (!currentValue.trim()) {
      setError('אין טקסט לשיפור — אנא מלאי את השדה תחילה.')
      return
    }
    setLoading(true)
    setError('')
    setNotConnected(false)
    setResult('')
    try {
      const improved = await callAIWriter({ mode, field, currentValue, prompt, jobContext })
      setResult(improved)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      if (msg.includes('ai-writer')) {
        setNotConnected(true)
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result.trim()) return
    onApply(result)
    setOpen(false)
    setResult('')
    setError('')
    setNotConnected(false)
  }

  const handleClose = () => {
    setOpen(false)
    setResult('')
    setError('')
    setNotConnected(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#008080] transition hover:bg-[#E6F3F3]"
        title={`שיפור ${fieldLabel} עם AI`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        שפר עם AI
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-['Heebo'] text-[#2D2D2D]">
              <Sparkles className="h-5 w-5 text-[#008080]" />
              שיפור {fieldLabel} עם AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {mode === 'employer' && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
                הנוסח הוא טיוטה בלבד. הפרסום יבוצע רק לאחר בדיקה ואישור של AllDent.
              </div>
            )}

            <div>
              <div className="mb-1 text-[13px] font-semibold text-[#6B6B6B]">טקסט נוכחי</div>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-[#FAFAF7] px-3 py-2 text-[13px] leading-6 text-[#2D2D2D] whitespace-pre-wrap">
                {currentValue.trim() || <span className="text-[#9CA3AF]">— ריק —</span>}
              </div>
            </div>

            {result && (
              <div>
                <div className="mb-1 text-[13px] font-semibold text-[#008080]">הצעת AI</div>
                <textarea
                  dir="rtl"
                  rows={6}
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full rounded-xl border border-[#008080] bg-white px-3 py-2 text-[13px] leading-6 text-[#2D2D2D] outline-none transition focus:ring-2 focus:ring-[#E6F3F3]"
                />
                <div className="mt-1 text-[11px] text-[#6B6B6B]">אפשר לערוך את הטקסט לפני החלה.</div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
                {error}
                {notConnected && (
                  <div className="mt-2 border-t border-[#FECACA] pt-2 text-[12px] text-[#7F1D1D] space-y-1">
                    <div className="font-bold">כדי לחבר AI אמיתי:</div>
                    <div>1. צור Edge Function בשם <code className="bg-[#FEE2E2] px-1 rounded">ai-writer</code> ב-Supabase</div>
                    <div>2. הוסף Secret בשם <code className="bg-[#FEE2E2] px-1 rounded">ANTHROPIC_API_KEY</code></div>
                    <div>3. Payload: <code className="bg-[#FEE2E2] px-1 rounded">{'{ mode, field, currentValue, prompt, jobContext }'}</code></div>
                    <div>4. Response: <code className="bg-[#FEE2E2] px-1 rounded">{'{ result: string }'}</code></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <button
              type="button"
              onClick={handleImprove}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#008080] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#006D6D] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'מעבד...' : 'שפר'}
            </button>
            {result && (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] px-5 py-2.5 text-[13px] font-bold text-[#166534] transition hover:bg-[#DCFCE7]"
              >
                החל בשדה
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-[#D9D9D9] bg-white px-5 py-2.5 text-[13px] font-bold text-[#6B6B6B] transition hover:bg-[#F3F4F6]"
            >
              ביטול
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
