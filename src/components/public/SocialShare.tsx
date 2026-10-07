/**
 * אזור שיתוף שמופיע בכל דף ציבורי (מוזרק ב-PublicLayout).
 *
 * ⚠️ מובייל מול דסקטופ — שתי התנהגויות שונות בכוונה:
 *
 * בדסקטופ יש מקום לרצועה אנכית של שלושה כפתורים בפינה.
 * במובייל אותה רצועה היא 58x150 פיקסלים שמכסים תוכן בכל גלילה — נמדד
 * שהיא הסתירה את תמונת הקורס. לכן במובייל יש **כפתור אחד**, והוא פותח
 * את תפריט השיתוף של המכשיר דרך Web Share API: שם כבר יש וואטסאפ,
 * פייסבוק, מסרונים וכל אפליקציה שהמשתמשת התקינה — יותר ממה שהרצועה
 * הציעה, בשטח קטן יותר.
 *
 * אם הדפדפן אינו תומך ב-navigator.share (דסקטופ, דפדפנים ישנים) הכפתור
 * פותח את אותה רצועה בלחיצה, כך שאף אחד לא נשאר בלי אפשרות לשתף.
 */

import { useEffect, useState } from 'react'

type SocialShareProps = {
  elevatedOnMobile?: boolean
}

function shareUrl(): string {
  return typeof window !== 'undefined'
    ? window.location.href
    : 'https://www.alldent.co.il'
}

function openShare(href: string) {
  window.open(
    href,
    '_blank',
    'noopener,noreferrer,width=600,height=500',
  )
}

export default function SocialShare({
  elevatedOnMobile = false,
}: SocialShareProps) {
  const onWhatsApp = () =>
    openShare(
      `https://wa.me/?text=${encodeURIComponent(shareUrl())}`,
    )

  const onFacebook = () =>
    openShare(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl(),
      )}`,
    )

  // INC-3151 — העתקת קישור. clipboard אינו זמין ב-http או בלי הרשאה,
  // ולכן יש נפילה ל-execCommand ולא כשל שקט.
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    const url = shareUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(el)
      }
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const mobilePositionClass = elevatedOnMobile
    ? 'bottom-24 md:bottom-5'
    : 'bottom-5'

  /* תמיכה ב-Web Share נבדקת פעם אחת אחרי ה-mount ולא בזמן הרינדור,
     כדי שהשרת והלקוח יסכימו על אותו HTML. */
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  async function onNativeShare() {
    try {
      await navigator.share({ title: document.title, url: shareUrl() })
    } catch {
      /* המשתמשת ביטלה את התפריט — לא שגיאה */
    }
  }

  return (
    <>
      {/* ── מובייל: כפתור אחד ── */}
      <div
        dir="rtl"
        className={`fixed start-4 z-40 md:hidden ${mobilePositionClass}`}
      >
        <button
          onClick={() => (canNativeShare ? onNativeShare() : setMobileOpen((v) => !v))}
          aria-label="שיתוף הדף"
          aria-expanded={canNativeShare ? undefined : mobileOpen}
          title="שיתוף הדף"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white/95 text-[#2D2D2D] shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] backdrop-blur transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>

      {/* ── דסקטופ, ובמובייל רק כשאין Web Share והמשתמשת פתחה ── */}
      <div
        dir="rtl"
        className={`fixed start-4 z-40 flex-col items-center gap-2 rounded-full border border-black/5 bg-white/95 p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] backdrop-blur md:flex ${mobilePositionClass} ${
          !canNativeShare && mobileOpen ? 'bottom-20 flex md:bottom-5' : 'hidden'
        }`}
        aria-label="שיתוף הדף"
      >
      <span className="px-0.5 text-[10px] font-bold text-[#6B6B6B]">
        שיתוף
      </span>

      <button
        onClick={onWhatsApp}
        aria-label="שיתוף בוואטסאפ"
        title="שיתוף בוואטסאפ"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:brightness-95"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.46 9.46 0 01-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.45 9.45 0 01-1.45-5.05c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 012.77 6.69c0 5.22-4.25 9.48-9.48 9.48zm8.06-17.54A11.4 11.4 0 0012.04.5C5.75.5.64 5.61.64 11.9c0 2.02.53 3.99 1.53 5.73L.5 23.5l6.03-1.58a11.36 11.36 0 005.51 1.4h.01c6.29 0 11.4-5.11 11.4-11.4 0-3.05-1.19-5.91-3.35-8.06z" />
        </svg>
      </button>

      <button
        onClick={onFacebook}
        aria-label="שיתוף בפייסבוק"
        title="שיתוף בפייסבוק"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:brightness-95"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
      </button>

      <button
        onClick={onCopy}
        aria-label={copied ? 'הקישור הועתק' : 'העתקת קישור'}
        title={copied ? 'הועתק' : 'העתקת קישור'}
        className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:brightness-95 ${
          copied ? 'bg-[#008080]' : 'bg-[#6B6B6B]'
        }`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

        <span aria-live="polite" className="sr-only">
          {copied ? 'הקישור הועתק' : ''}
        </span>
      </div>
    </>
  )
}