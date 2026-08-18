import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UploadMeta } from '@/types/inbox-v2'

/**
 * הכתיבה של אשף הייבוא — **רק אחרי אישור מפורש** (INC-3125).
 *
 * ⚠ זו הנקודה היחידה באשף שנוגעת במסד. כל השלבים שלפניה (ניתוח הקובץ,
 * מיפוי, ולידציה, זיהוי קיימים/חדשים) הם client-side + קריאה בלבד.
 * הזרימה הקודמת כתבה batch ושורות מיד עם בחירת הקובץ, בלי שום שער —
 * מה שאומר שקובץ שגוי כבר היה במסד לפני שמישהו ראה מה יש בו.
 */

export interface PreparedRow {
  parsed: Record<string, unknown>
  raw: Record<string, unknown>
}

export interface CommitProgress {
  phase: 'inserting' | 'matching' | 'done'
  current: number
  total: number
}

const CHUNK_SIZE = 100

export function useInboxImportCommit() {
  const qc = useQueryClient()
  const [isCommitting, setIsCommitting] = useState(false)
  const [progress, setProgress] = useState<CommitProgress | null>(null)

  const commit = useCallback(
    async (rows: PreparedRow[], meta: UploadMeta, fileName: string, fileType: string) => {
      if (!rows.length) throw new Error('אין שורות לייבוא')

      setIsCommitting(true)
      setProgress({ phase: 'inserting', current: 0, total: rows.length })
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
            total_rows: rows.length,
          })
          .select('batch_id')
          .single()
        if (batchErr) throw new Error(batchErr.message)
        const batchId = batch.batch_id as number

        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE)
          const payload = chunk.map(({ parsed, raw }) => ({
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
            facebook_group_name: (parsed.facebook_group_name as string) || null,
            linkedin_url: (parsed.linkedin_url as string) || null,
            notes: (parsed.notes as string) || null,
            raw_payload: raw,
            parsed_payload: parsed,
            merge_status: 1,
            tags: meta.tags,
          }))

          const { error: insertErr } = await supabase.from('inbox_v2').insert(payload)
          if (insertErr) throw new Error(insertErr.message)

          setProgress({
            phase: 'inserting',
            current: Math.min(i + CHUNK_SIZE, rows.length),
            total: rows.length,
          })
        }

        // ההתאמה רצה רק אחרי שכל השורות נכתבו, כדי שסיכומי האצווה יהיו נכונים
        setProgress({ phase: 'matching', current: rows.length, total: rows.length })
        const { error: matchErr } = await supabase.rpc('match_inbox_batch', { p_batch_id: batchId })
        if (matchErr) throw new Error(`הייבוא הצליח אך ההתאמה נכשלה: ${matchErr.message}`)

        await Promise.all([
          qc.invalidateQueries({ queryKey: ['inbox-v2'] }),
          qc.invalidateQueries({ queryKey: ['inbox-v2-stats'] }),
          qc.invalidateQueries({ queryKey: ['inbox-v2-batches'] }),
        ])

        setProgress({ phase: 'done', current: rows.length, total: rows.length })
        return batchId
      } finally {
        setIsCommitting(false)
      }
    },
    [qc]
  )

  return { commit, isCommitting, progress }
}
