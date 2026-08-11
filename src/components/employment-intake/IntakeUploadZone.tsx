/**
 * לשונית "קליטה" — הדבקת טקסט / גרירת קובץ, מטא-דאטה של המקור, ו-Preview
 * לפני עיבוד (§3.1). המסך אינו כותב כלום ל-Supabase בשלב הזה — הפרסור
 * וה-Scan הקל רצים בזיכרון בלבד; רק בדיקת "קובץ כבר נקלט" קוראת מ-DB.
 */

import { useState } from 'react'
import { Upload, FileText, ClipboardPaste, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Toolbar, ActionButton, KPICard } from '@/components/layout/Shell'
import { FileDropZone } from '@/components/ui/FileDropZone'
import { useAuth } from '@/contexts/AuthContext'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useEmploymentIntakePreview, type IntakePreviewResult } from '@/hooks/useEmploymentIntakeParse'
import { useCityIndex } from '@/hooks/useEmploymentIntakeNormalize'
import { useRunClassificationPipeline, type PipelineResult } from '@/hooks/useEmploymentIntakePipeline'
import { autoDetectFamily, autoDetectFamilyForFile, resolveParserFamily, type ParserFamily } from '@/lib/employment-intake/parsers'
import { errorDuplicateFile, LOADING_LABEL } from '@/lib/employment-intake/labels'

type InputMode = 'paste' | 'file'

interface Props {
  onPipelineComplete?: (result: PipelineResult) => void
}

export function IntakeUploadZone({ onPipelineComplete }: Props) {
  const { user } = useAuth()
  const dicts = useEmploymentIntakeDicts()
  const cityIndex = useCityIndex()
  const preview = useEmploymentIntakePreview()
  const pipeline = useRunClassificationPipeline()

  const [mode, setMode] = useState<InputMode>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sourceTypeId, setSourceTypeId] = useState<number | ''>('')
  const [sourceName, setSourceName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [result, setResult] = useState<IntakePreviewResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedSourceTypeName = dicts.data?.sourceTypes.find((s) => s.id === sourceTypeId)?.name ?? null

  const runPreview = async () => {
    setErrorMessage(null)
    setResult(null)
    try {
      let family: ParserFamily
      if (selectedSourceTypeName) {
        family = resolveParserFamily(selectedSourceTypeName)
      } else if (mode === 'file' && file) {
        family = await autoDetectFamilyForFile(file)
      } else {
        family = autoDetectFamily(pastedText)
      }

      const res = await preview.mutateAsync(
        mode === 'file' && file ? { family, source: { kind: 'file', file } } : { family, source: { kind: 'text', text: pastedText } },
      )
      setResult(res)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  const runClassification = async () => {
    if (!result || result.duplicateOf) return
    setErrorMessage(null)
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      const pipelineResult = await pipeline.mutateAsync({
        messages: result.messages,
        sourceTypeId: sourceTypeId || null,
        sourceName,
        fileName: result.fileName,
        fileHash: result.fileHash,
        tags,
        importedBy: user?.email ?? 'לא ידוע',
        cityIndex: cityIndex.data ?? [],
      })
      toast.success(`המיון הושלם: ${pipelineResult.rows.length} הודעות נקלטו.`)
      onPipelineComplete?.(pipelineResult)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  const canRunPreview = mode === 'paste' ? pastedText.trim().length > 0 : !!file

  return (
    <div className="space-y-4">
      <Toolbar className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs text-[#6B6B6B]">סוג מקור</span>
            <select
              value={sourceTypeId}
              onChange={(e) => setSourceTypeId(e.target.value ? Number(e.target.value) : '')}
              className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
            >
              <option value="">זיהוי אוטומטי</option>
              {dicts.data?.sourceTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs text-[#6B6B6B]">שם קבוצה / דף / קובץ</span>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="למשל: קבוצת סייעות רמת גן"
              className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
            />
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs text-[#6B6B6B]">תגיות (מופרדות בפסיק)</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="למשל: דחוף, אזור מרכז"
              className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
            />
          </label>
        </div>

        <div className="flex items-center gap-1 rounded-[14px] border border-[#D9D9D9] bg-[#F9FAFB] p-1">
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'paste' ? 'bg-white shadow-sm text-[#008080]' : 'text-[#6B6B6B]'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            הדבקת טקסט
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'file' ? 'bg-white shadow-sm text-[#008080]' : 'text-[#6B6B6B]'
            }`}
          >
            <Upload className="h-4 w-4" />
            העלאת קובץ
          </button>
        </div>

        {mode === 'paste' ? (
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="הדביקי כאן טקסט — ייצוא שיחת WhatsApp, תגובות מפייסבוק, או כל טקסט חופשי אחר"
            rows={8}
            dir="auto"
            className="w-full resize-y rounded-[14px] border border-[#D9D9D9] bg-white p-3 text-sm outline-none focus:border-[#008080]"
          />
        ) : (
          <FileDropZone
            accept=".txt,.csv,.xlsx,.xls"
            onFile={(f) => setFile(f)}
            icon={FileText}
            title={file ? file.name : 'גררי לכאן קובץ, או לחצי לבחירה'}
            description="קובץ טקסט (ייצוא WhatsApp) · קובץ CSV · קובץ Excel"
          />
        )}

        <div className="flex justify-end">
          <ActionButton variant="primary" icon={Upload} disabled={!canRunPreview || preview.isPending} onClick={runPreview}>
            {preview.isPending ? 'מעבד…' : 'הצג תצוגה מקדימה'}
          </ActionButton>
        </div>
      </Toolbar>

      {preview.isPending && (
        <Toolbar>
          <div className="flex items-center justify-center gap-2 py-6 text-[#6B6B6B]">
            <Loader2 className="h-5 w-5 animate-spin text-[#008080]" />
            {LOADING_LABEL.processingFile}
          </div>
        </Toolbar>
      )}

      {errorMessage && (
        <Toolbar className="border-r-4 !border-r-[#DC2626]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#DC2626]" />
            <p className="text-sm text-[#2D2D2D]">{errorMessage}</p>
          </div>
        </Toolbar>
      )}

      {result?.duplicateOf && (
        <Toolbar className="border-r-4 !border-r-[#E8A85C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E8A85C]" />
            <p className="text-sm text-[#2D2D2D]">{errorDuplicateFile()}</p>
          </div>
        </Toolbar>
      )}

      {result && !result.duplicateOf && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard label="הודעות שזוהו" value={result.scan.messageCount} />
            <KPICard label="טלפונים שנמצאו" value={result.scan.phoneMatches} />
            <KPICard label="מיילים שנמצאו" value={result.scan.emailMatches} />
            <KPICard label="קישורי Facebook שנמצאו" value={result.scan.facebookUrlMatches} />
          </div>
          <div className="flex justify-end">
            <ActionButton variant="success" icon={Sparkles} disabled={pipeline.isPending} onClick={runClassification}>
              {pipeline.isPending ? 'מריץ מיון…' : 'הפעל מיון'}
            </ActionButton>
          </div>
        </>
      )}

      {pipeline.isPending && (
        <Toolbar>
          <div className="flex items-center justify-center gap-2 py-6 text-[#6B6B6B]">
            <Loader2 className="h-5 w-5 animate-spin text-[#008080]" />
            {LOADING_LABEL.matching}
          </div>
        </Toolbar>
      )}
    </div>
  )
}
