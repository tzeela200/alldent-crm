import { formatDistanceToNow, format } from 'date-fns'
import { he } from 'date-fns/locale'

export function timeAgo(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: he })
  } catch {
    return ''
  }
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: he })
  } catch {
    return ''
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: he })
  } catch {
    return ''
  }
}
