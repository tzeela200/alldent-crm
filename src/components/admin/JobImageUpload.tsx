import React, { useState } from 'react'
import { Image as ImageIcon, UploadCloud, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type JobImageUploadProps = {
  value: string
  onChange: (url: string) => void
  jobCode?: string | null
  label?: string
  helperText?: string
}

export default function JobImageUpload({
  value,
  onChange,
  jobCode,
  label = 'תמונת משרה',
  helperText = 'גררי תמונה לכאן או בחרי קובץ מהמחשב. התמונה נשמרת ב־job-images.',
}: JobImageUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('ניתן להעלות קובץ תמונה בלבד')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeJobCode = String(jobCode || 'draft').replace(/[^a-zA-Z0-9_-]/g, '') || 'draft'
      const path = `${safeJobCode}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('job-images')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('job-images').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת תמונה')
    } finally {
      setUploading(false)
      setDragging(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#2D2D2D]">{label}</h3>
          <p className="mt-1 text-[13px] leading-6 text-[#6B6B6B]">{helperText}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]">
          <ImageIcon className="h-5 w-5" />
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files?.[0]
          if (file) void uploadFile(file)
        }}
        className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragging ? 'border-[#008080] bg-[#E6F3F3]' : 'border-[#D9D9D9] bg-[#FAFAF7]'
        }`}
      >
        {value ? (
          <div className="w-full space-y-3">
            <img src={value} alt="תצוגה מקדימה של תמונת משרה" className="h-52 w-full rounded-2xl object-cover" />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#008080] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#006D6D]">
                <UploadCloud className="h-4 w-4" />
                החלפת תמונה
                <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadFile(file)
                }} />
              </label>
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-2 rounded-full border border-[#D9D9D9] bg-white px-4 py-2 text-[13px] font-bold text-[#6B6B6B] transition hover:bg-[#F3F4F6]"
              >
                <X className="h-4 w-4" />
                הסרת תמונה
              </button>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="mb-3 h-9 w-9 text-[#008080]" />
            <div className="text-[15px] font-bold text-[#2D2D2D]">גרירת תמונה לכאן</div>
            <p className="mt-1 text-[13px] text-[#6B6B6B]">PNG / JPG / WEBP</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[#008080] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#006D6D]">
              בחירת תמונה
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadFile(file)
              }} />
            </label>
          </>
        )}
      </div>

      {uploading && <p className="mt-2 text-[13px] font-semibold text-[#008080]">מעלה תמונה...</p>}
      {error && <p className="mt-2 text-[13px] font-semibold text-[#DC2626]">{error}</p>}
    </section>
  )
}
