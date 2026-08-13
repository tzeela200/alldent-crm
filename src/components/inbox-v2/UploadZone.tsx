import { useState, useRef, useCallback, type DragEvent } from 'react'
import { Upload, ClipboardPaste, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Toolbar, SelectFilter, ActionButton } from '@/components/layout/Shell'
import { useInboxV2SourceTypes } from '@/hooks/useInboxV2SourceTypes'
import type { UploadMeta } from '@/types/inbox-v2'

interface UploadZoneProps {
  onFileSelected: (file: File, meta: UploadMeta) => void
  onPasteSubmit: (text: string, meta: UploadMeta) => void
  isProcessing: boolean
  progress?: { phase: string; current: number; total: number } | null
}

export function UploadZone({ onFileSelected, onPasteSubmit, isProcessing, progress }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: sourceTypes } = useInboxV2SourceTypes()

  const getMeta = useCallback((): UploadMeta => ({
    source_type: sourceType ? Number(sourceType) : null,
    source_name: sourceName,
    default_role: null,
    tags: tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }), [sourceType, sourceName, tagsInput])

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file, getMeta())
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file, getMeta())
    e.target.value = ''
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return
    onPasteSubmit(pasteText, getMeta())
    setPasteText('')
  }

  const phaseLabel: Record<string, string> = {
    parsing: 'מנתח...',
    inserting: 'מייבא...',
    matching: 'מחפש התאמות...',
    done: 'הושלם',
  }

  return (
    <Toolbar>
      {/* Meta fields */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">סוג מקור</label>
          <SelectFilter
            value={sourceType}
            onChange={setSourceType}
            options={(sourceTypes ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="בחר מקור..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">שם מקור</label>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="לדוגמה: קבוצת שיננים בפייסבוק"
            className="h-11 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-teal-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">תגיות (מופרדות בפסיק)</label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="לדוגמה: גיוס-פברואר, שיננים"
            className="h-11 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-teal-500"
          />
        </div>
      </div>

      {/* Upload areas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          ) : (
            <FileSpreadsheet className="h-8 w-8 text-slate-400" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              {isProcessing ? phaseLabel[progress?.phase ?? 'parsing'] : 'גרור קובץ לכאן או לחץ לבחירה'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Excel (.xlsx, .xls) או CSV</p>
          </div>
          {progress && isProcessing && (
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-slate-500">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Paste Zone */}
        <div className="flex flex-col gap-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="הדביקו כאן טלפונים, מיילים, קישורי פייסבוק, או טקסט חופשי..."
            rows={5}
            disabled={isProcessing}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 disabled:opacity-50"
            dir="rtl"
          />
          <ActionButton
            variant="primary"
            icon={ClipboardPaste}
            onClick={handlePaste}
            disabled={isProcessing || !pasteText.trim()}
          >
            ניתוח הדבקה
          </ActionButton>
        </div>
      </div>
    </Toolbar>
  )
}
