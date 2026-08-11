/**
 * אזור גרירת קובץ משותף — Drag&Drop + בחירת קובץ + מצב טעינה.
 *
 * חולץ מהדפוס הקיים ב-AdminFixPublicationsPage.tsx (ImportPanel), שם הוא היה
 * ממומש inline. זהו רכיב ה-Upload הגנרי הראשון בפרויקט — ראה תוכנית
 * INC-3119 §11 ("רכיב משותף חדש אחד").
 */

import { useRef, useState } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'

interface FileDropZoneProps {
  /** ערך ה-accept של input[type=file], למשל ".csv,.xlsx,.xls,.txt" */
  accept: string
  onFile: (file: File) => void
  isPending?: boolean
  pendingLabel?: string
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

export function FileDropZone({
  accept,
  onFile,
  isPending = false,
  pendingLabel = 'מעבד את הקובץ…',
  icon: Icon,
  title,
  description,
  className = '',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragging ? 'border-[#008080] bg-[#E6F3F3]' : 'border-[#D9D9D9] bg-[#F9FAFB] hover:border-[#008080]'
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {isPending ? (
        <>
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#008080]" />
          <p className="text-sm text-[#6B6B6B]">{pendingLabel}</p>
        </>
      ) : (
        <>
          <Icon className="mb-3 h-8 w-8 text-[#6B6B6B]" />
          <p className="text-[15px] font-semibold text-[#2D2D2D]">{title}</p>
          {description && <p className="mt-1 text-sm text-[#6B6B6B]">{description}</p>}
        </>
      )}
    </div>
  )
}
