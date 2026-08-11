/**
 * שלב 2 של תוכנית INC-3119: "Preview לפני עיבוד" — פרסור בלבד (ללא RPC,
 * ללא כתיבה ל-Supabase). מריץ Parser לפי המשפחה שנבחרה/זוהתה, מבצע סריקה
 * קלה לצורך KPI, ובודק אם קובץ בעל אותו Hash כבר נקלט.
 *
 * "הפעל מיון" (הפייפליין המלא — הקשר, סיווג, חילוץ, התאמה, זהות, כתיבה
 * ל-employment_intake) מורכב על גבי התוצאה הזו בשלבים הבאים של התוכנית.
 */

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RawParsedMessage } from '@/types/employment-intake'
import { runParser, type ParserFamily, type ParseInput } from '@/lib/employment-intake/parsers'
import { computeFileHash } from '@/lib/employment-intake/hashes'
import { quickScan, type QuickScanResult } from '@/lib/employment-intake/quickScan'
import { supabaseError } from '@/lib/employment-intake/errors'

export interface IntakePreviewInput {
  family: ParserFamily
  source: { kind: 'text'; text: string } | { kind: 'file'; file: File }
}

export interface IntakePreviewResult {
  messages: RawParsedMessage[]
  scan: QuickScanResult
  fileName: string | null
  fileHash: string | null
  duplicateOf: { id: number; import_id: string; ingested_at: string } | null
}

async function checkDuplicateFile(fileHash: string) {
  const { data, error } = await supabase
    .from('employment_intake')
    .select('id, import_id, ingested_at')
    .eq('file_hash', fileHash)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (error) throw supabaseError('בדיקת קובץ כפול נכשלה', error)
  return data
}

export function useEmploymentIntakePreview() {
  return useMutation({
    mutationFn: async (input: IntakePreviewInput): Promise<IntakePreviewResult> => {
      let fileHash: string | null = null
      let fileName: string | null = null

      if (input.source.kind === 'file') {
        fileName = input.source.file.name
        fileHash = await computeFileHash(input.source.file)
      }

      const parseInput: ParseInput =
        input.source.kind === 'file'
          ? { kind: 'file', file: input.source.file, family: input.family }
          : { kind: 'text', text: input.source.text, family: input.family }

      const messages = await runParser(parseInput)
      const scan = quickScan(messages)
      const duplicateOf = fileHash ? await checkDuplicateFile(fileHash) : null

      return { messages, scan, fileName, fileHash, duplicateOf }
    },
  })
}
