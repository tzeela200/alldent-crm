import { Link } from 'react-router-dom'

// 404 מסודר — עבור slug שאינו תפקיד, אינו אזור ואינו קוד משרה תקין.
// לא להפנות אוטומטית ל-/jobs.
export default function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6"
      dir="rtl"
      style={{ fontFamily: 'Heebo, Assistant, Noto Sans Hebrew, sans-serif' }}
    >
      <div className="text-center" style={{ maxWidth: 460 }}>
        <p className="mb-2 text-6xl font-black text-[#008080]">404</p>
        <h1 className="mb-3 text-xl font-bold text-[#0F0F10]">הדף לא נמצא</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[#6B6B6B]">
          הכתובת שחיפשתם אינה קיימת. ייתכן שהיא הוסרה או שהוקלדה בטעות.
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
