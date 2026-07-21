// Tiny external store driving a single, app-wide in-app CV viewer dialog.
//
// Word documents (.doc/.docx) cannot be previewed inline by the browser — it
// force-downloads them. To let admins *view* a CV without it landing in their
// Downloads folder, `openApplicationCv` (see lib/cv.ts) routes Word files here
// instead of opening a new tab. A single <CvViewerDialog/> mounted at the app
// root subscribes to this store and renders the document in-app (privacy-
// preserving — the CV bytes never leave our origin).

type CvViewerState = { open: boolean; storagePath: string | null }

let state: CvViewerState = { open: false, storagePath: null }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export const cvViewerStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot() {
    return state
  },
  open(storagePath: string) {
    state = { open: true, storagePath }
    emit()
  },
  close() {
    state = { open: false, storagePath: null }
    emit()
  },
}
