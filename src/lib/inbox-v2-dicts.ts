import type { DictItem } from '@/types'

export const INBOX_STATUSES: DictItem[] = [
  { id: 1, name: 'חדש', slug: 'new', color: '#3B82F6' },
  { id: 2, name: 'נותח', slug: 'analyzed', color: '#8B5CF6' },
  { id: 3, name: 'התאמה חזקה', slug: 'strong-match', color: '#10B981' },
  { id: 4, name: 'התאמה חלקית', slug: 'partial-match', color: '#F59E0B' },
  { id: 5, name: 'ממתין לאישור', slug: 'pending', color: '#EAB308' },
  { id: 6, name: 'מוזג', slug: 'merged', color: '#008080' },
  { id: 7, name: 'נדחה', slug: 'rejected', color: '#EF4444' },
  { id: 8, name: 'התעלמות', slug: 'ignored', color: '#6B7280' },
  { id: 9, name: 'לא דנטלי', slug: 'non-dental', color: '#94A3B8' },
  { id: 10, name: 'שגיאה', slug: 'error', color: '#F43F5E' },
  { id: 11, name: 'קיים במערכת', slug: 'exists', color: '#06B6D4' },
]

export const SOURCE_TYPES: DictItem[] = [
  { id: 1, name: 'Facebook Group' },
  { id: 2, name: 'Facebook Page' },
  { id: 3, name: 'Facebook Profile' },
  { id: 4, name: 'WhatsApp' },
  { id: 5, name: 'Google Contacts' },
  { id: 6, name: 'Excel' },
  { id: 7, name: 'CSV' },
  { id: 8, name: 'CRM' },
  { id: 9, name: 'Email' },
  { id: 10, name: 'Fillout' },
  { id: 11, name: 'Manual' },
  { id: 12, name: 'Other' },
]

export const ACTION_TYPES: DictItem[] = [
  { id: 1, name: 'מיזוג' },
  { id: 2, name: 'יצירת איש קשר' },
  { id: 3, name: 'יצירת ארגון' },
  { id: 4, name: 'דילוג' },
  { id: 5, name: 'דחייה' },
  { id: 6, name: 'התעלמות' },
  { id: 7, name: 'סימון לבדיקה' },
  { id: 8, name: 'עדכון רשומה קיימת' },
]

export const inboxStatusVariant: Record<number, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'> = {
  1: 'info',
  2: 'default',
  3: 'success',
  4: 'warning',
  5: 'warning',
  6: 'teal',
  7: 'danger',
  8: 'default',
  9: 'default',
  10: 'danger',
  11: 'info',
}

export function getDictName(items: DictItem[], id: number | null | undefined): string {
  if (id == null) return '—'
  return items.find((i) => i.id === id)?.name ?? String(id)
}
