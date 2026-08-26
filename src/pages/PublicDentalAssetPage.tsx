/**
 * INC-3130 · HOME DENT — דף נכס ציבורי. /dental-assets/HD0001
 *
 * העמוד אחראי רק על נתונים ומצבים. כל הרינדור יושב ב-
 * `DentalAssetPageBody`, שהוא גם מה שה-Preview באדמין מרנדר — אותו
 * רכיב, אותו payload. שני עותקים היו מאפשרים ל-Preview לשקר (§59).
 *
 * פרסום שפג או הוסר: ה-view לא מחזיר אותו, ואז מוצג מסך "אינו פעיל"
 * ולא 404 ולא נתונים ישנים (§72).
 */
import { Link, useParams } from 'react-router-dom'
import { usePublicDentalAsset } from '@/hooks/usePublicDentalAssets'
import { DentalAssetPageBody } from '@/components/dental-assets/DentalAssetPageBody'

export default function PublicDentalAssetPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, error } = usePublicDentalAsset(slug)

  if (isLoading) {
    return (
      <div dir="rtl" className="grid min-h-[60vh] place-items-center bg-[#1E1E1E] text-white/40">
        <p className="font-mono text-[11px] tracking-[0.24em]">טוען…</p>
      </div>
    )
  }

  if (error || !data || !data.public_page) {
    return (
      <div dir="rtl" className="bg-[#1E1E1E] text-white">
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-5 px-7 py-[clamp(90px,14vw,190px)] text-center">
          <p className="font-mono text-[11px] tracking-[0.26em] text-[#D97706]" dir="ltr">
            HOME DENT
          </p>
          <h1 className="text-[clamp(28px,4.6vw,48px)] font-black leading-[1.05] tracking-[-0.03em]">
            הפרסום אינו פעיל כרגע
          </h1>
          <p className="text-[16px] font-light leading-[1.8] text-white/64">
            ייתכן שתקופת הפרסום הסתיימה או שהנכס הוסר מהאתר.
          </p>
          <Link
            to="/dental-assets"
            className="mt-2 rounded-full border border-white/15 px-7 py-3.5 text-[14px] font-bold transition hover:bg-white hover:text-[#1E1E1E]"
          >
            לכל הנכסים
          </Link>
        </div>
      </div>
    )
  }

  return <DentalAssetPageBody page={data.public_page} expiresAt={data.expires_at} />
}
