import { Link } from 'react-router-dom'

// עמוד "תוכן בהקמה" זמני — יעד מכובד לכתובות ישנות שאין להן עדיין עמוד חדש,
// במקום 404 טכני. לא לשלוח כתובת ישנה ל-/jobs בטעות.
export default function UnderConstructionPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6"
      dir="rtl"
      style={{ fontFamily: 'Heebo, Assistant, Noto Sans Hebrew, sans-serif' }}
    >
      <div className="text-center" style={{ maxWidth: 460 }}>
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: '#E6F3F3', color: '#008080', fontSize: 30 }}
        >
          🚧
        </div>
        <h1 className="mb-3 text-2xl font-black text-[#0F0F10]">הדף בהקמה</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[#6B6B6B]">
          העמוד הזה בבנייה ויעלה בקרוב. בינתיים אפשר לגלוש ללוח המשרות או לחזור לעמוד הבית.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/jobs"
            className="rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
          >
            ללוח המשרות
          </Link>
          <Link
            to="/"
            className="rounded-full border border-[#D9D9D9] bg-white px-6 py-3 text-[14px] font-bold text-[#0F0F10] transition hover:bg-[#F5F5F5]"
          >
            לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  )
}
