/**
 * מיון בצד הלקוח לטבלאות שכל הנתונים שלהן כבר בזיכרון.
 *
 * מיועד **רק** לטבלאות שאינן מעומדות מהשרת — תצוגה מקדימה של קובץ, סיכום
 * קמפיינים וכדומה. בטבלה מעומדת מיון מקומי היה ממיין את העמוד המוצג בלבד
 * ומציג תוצאה שגויה; שם המיון חייב להיות בשרת.
 *
 * השוואת מחרוזות בעברית דרך localeCompare('he') — אחרת הסדר נקבע לפי קוד
 * התו והתוצאה נראית אקראית למשתמשת.
 */

import { useMemo, useState } from 'react'

export type SortValue = string | number | null | undefined

export function useClientTableSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => SortValue>,
  defaultKey = '',
  defaultDir: 'asc' | 'desc' = 'asc',
) {
  const [sortBy, setSortBy] = useState(defaultKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir)

  const onSort = (key: string) => {
    if (!accessors[key]) return
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const accessor = accessors[sortBy]
    if (!accessor) return rows

    const factor = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = accessor(a)
      const vb = accessor(b)

      // ערכים ריקים תמיד בסוף, בשני כיווני המיון
      const aEmpty = va == null || va === ''
      const bEmpty = vb == null || vb === ''
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1

      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), 'he', { numeric: true }) * factor
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortBy, sortDir])

  return { sorted, sortBy, sortDir, onSort }
}
