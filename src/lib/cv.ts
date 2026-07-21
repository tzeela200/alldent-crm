import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cvViewerStore } from '@/lib/cvViewerStore'

type AppCvSource = {
  has_cv?: boolean | null
  cv_link?: string | null
  cv_storage_path?: string | null
}

/** True if an application row has a CV in any form (uploaded file or legacy link). */
export function applicationHasCv(row: AppCvSource): boolean {
  return Boolean(row.has_cv || row.cv_link || row.cv_storage_path)
}

/** Sanitize a filename for a storage key (mirrors the upload-candidate-cv edge fn). */
export function safeCvName(name: string): string {
  return (name || 'cv').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
}

/** Lowercase file extension of a storage path (without the dot), or '' if none. */
function cvExtension(path: string): string {
  const match = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/)
  return match ? match[1] : ''
}

/**
 * Open an application's CV in a new tab.
 * Prefers `cv_storage_path` — mints a short-lived signed URL as the authenticated
 * admin (anon cannot, since `candidate-cvs` is a private bucket). Falls back to a
 * stored `cv_link` for legacy records saved before this flow.
 */
export async function openApplicationCv(row: AppCvSource): Promise<void> {
  if (row.cv_storage_path) {
    // Word docs (.doc/.docx) can't be previewed inline — the browser force-downloads
    // them. Route them to the in-app viewer so admins can *view* without downloading.
    const ext = cvExtension(row.cv_storage_path)
    if (ext === 'doc' || ext === 'docx') {
      cvViewerStore.open(row.cv_storage_path)
      return
    }
    // PDF / images render inline in a new tab via a short-lived signed URL.
    // Pre-open synchronously so the async signed-URL fetch doesn't trip popup blockers.
    const win = window.open('about:blank', '_blank')
    const { data, error } = await supabase.storage
      .from('candidate-cvs')
      .createSignedUrl(row.cv_storage_path, 60 * 60)
    if (error || !data?.signedUrl) {
      win?.close()
      toast.error('לא ניתן לפתוח את קובץ קורות החיים')
      return
    }
    if (win) win.location.href = data.signedUrl
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (row.cv_link) {
    window.open(row.cv_link, '_blank', 'noopener,noreferrer')
    return
  }
  toast.error('אין קובץ קורות חיים לרשומה זו')
}
