import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  parseExcelFile,
  parseCsvFile,
  parsePastedText,
  normalizeRawRow,
  detectFileType,
  type RawRow,
} from '@/lib/inbox-v2-parser'
import type { UploadMeta } from '@/types/inbox-v2'

interface UploadProgress {
  phase: 'parsing' | 'inserting' | 'matching' | 'done'
  current: number
  total: number
}

export function useInboxV2Upload(onBatchReady?: (batchId: number) => void) {
  const qc = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [lastBatchId, setLastBatchId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processRows = useCallback(
    async (rawRows: RawRow[], meta: UploadMeta, fileName: string, fileType: string) => {
      if (!rawRows.length) {
        toast.error('לא נמצאו רשומות לייבוא')
        return null
      }

      setIsProcessing(true)
      setError(null)
      setProgress({ phase: 'parsing', current: 0, total: rawRows.length })

      try {
        const { data: batch, error: batchErr } = await supabase
          .from('inbox_import_batches')
          .insert({
            file_name: fileName,
            file_type: fileType,
            source_type: meta.source_type,
            source_name: meta.source_name || null,
            tags: meta.tags,
            default_role: meta.default_role,
            total_rows: rawRows.length,
          })
          .select('batch_id')
          .single()

        if (batchErr) throw batchErr
        const batchId = batch.batch_id

        setProgress({ phase: 'inserting', current: 0, total: rawRows.length })

        const CHUNK_SIZE = 100
        for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
          const chunk = rawRows.slice(i, i + CHUNK_SIZE)
          const rows = chunk.map((raw) => {
            const parsed = normalizeRawRow(raw)
            return {
              import_batch_id: batchId,
              source_type: meta.source_type,
              source_name: meta.source_name || null,
              display_name: (parsed.display_name as string) || null,
              first_name: (parsed.first_name as string) || null,
              last_name: (parsed.last_name as string) || null,
              phone: (parsed.phone as string) || null,
              phone_norm: (parsed.phone_norm as string) || null,
              email: (parsed.email as string) || null,
              facebook_name: (parsed.facebook_name as string) || null,
              facebook_id: (parsed.facebook_id as string) || null,
              facebook_url: (parsed.facebook_url as string) || null,
              facebook_group_id: (parsed.facebook_group_id as string) || null,
              facebook_group_name: (parsed.facebook_group_name as string) || null,
              linkedin_url: (parsed.linkedin_url as string) || null,
              raw_payload: raw,
              parsed_payload: parsed,
              merge_status: 1,
              tags: meta.tags,
            }
          })

          const { error: insertErr } = await supabase.from('inbox_v2').insert(rows)
          if (insertErr) throw insertErr

          setProgress({ phase: 'inserting', current: Math.min(i + CHUNK_SIZE, rawRows.length), total: rawRows.length })
        }

        setLastBatchId(batchId)

        qc.invalidateQueries({ queryKey: ['inbox-v2'] })
        qc.invalidateQueries({ queryKey: ['inbox-v2-batches'] })

        toast.success(`יובאו ${rawRows.length} רשומות מ-${fileName}`)

        setProgress({ phase: 'matching', current: 0, total: rawRows.length })
        onBatchReady?.(batchId)

        setProgress({ phase: 'done', current: rawRows.length, total: rawRows.length })
        return batchId
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'שגיאה בייבוא'
        setError(msg)
        toast.error(msg)
        return null
      } finally {
        setIsProcessing(false)
      }
    },
    [qc]
  )

  const uploadFile = useCallback(
    async (file: File, meta: UploadMeta) => {
      const type = detectFileType(file)
      let rawRows: RawRow[]

      if (type === 'excel') {
        rawRows = await parseExcelFile(file)
      } else if (type === 'csv') {
        rawRows = await parseCsvFile(file)
      } else {
        toast.error('סוג קובץ לא נתמך. נא להעלות Excel או CSV.')
        return null
      }

      return processRows(rawRows, meta, file.name, type)
    },
    [processRows]
  )

  const uploadPaste = useCallback(
    async (text: string, meta: UploadMeta) => {
      const rawRows = parsePastedText(text)
      return processRows(rawRows, meta, 'הדבקה ידנית', 'paste')
    },
    [processRows]
  )

  return { uploadFile, uploadPaste, isProcessing, progress, lastBatchId, error }
}
