/**
 * INC-3130 · HOME DENT — ניהול תמונות.
 *
 * שלושה כללים שנובעים ישירות מהסכמה:
 * 1. כל תמונה נכנסת לדלי הפרטי. סימון "לפרסום" מעתיק אותה פיזית לדלי
 *    הציבורי — אילוץ hd_img_pubpath_ck דוחה is_published בלי public_path,
 *    וזו ההגנה מפני דף שפורסם עם תמונות שבורות.
 * 2. התמונה הראשונה בסדר היא תמונת השער בדף ובכרטיס הלוח. אין דגל
 *    "ראשית" נפרד — הסדר הוא ההחלטה.
 * 3. Focal Point במקום חיתוך: אין שירות עיבוד תמונה בפרויקט. לחיצה על
 *    התצוגה קובעת object-position, והתוצאה זהה לחיתוך בכל יחס.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowLeft, Crosshair, Trash2, UploadCloud } from 'lucide-react'
import {
  privateImageUrl,
  publicImageUrl,
  type DentalAssetImage,
} from '@/hooks/useDentalAsset'
import { AdminCard, ADMIN_INPUT, FieldLabel } from '@/components/ui/AdminField'

function useImageUrl(image: DentalAssetImage) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const pub = publicImageUrl(image.public_path)
    if (pub) {
      setUrl(pub)
      return
    }
    // הדלי הפרטי דורש URL חתום. שעה מספיקה לסשן עבודה.
    void privateImageUrl(image.private_path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [image.private_path, image.public_path])
  return url
}

function ImageRow({
  image,
  index,
  total,
  assetCode,
  onPublish,
  onUnpublish,
  onUpdate,
  onDelete,
  onMove,
  busy,
}: {
  image: DentalAssetImage
  index: number
  total: number
  assetCode: string
  onPublish: (img: DentalAssetImage) => Promise<void>
  onUnpublish: (img: DentalAssetImage) => Promise<void>
  onUpdate: (id: string, patch: Partial<DentalAssetImage>) => Promise<void>
  onDelete: (img: DentalAssetImage) => Promise<void>
  onMove: (from: number, to: number) => Promise<void>
  busy: boolean
}) {
  const url = useImageUrl(image)
  const [focalMode, setFocalMode] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  function pickFocal(e: React.MouseEvent<HTMLDivElement>) {
    if (!focalMode || !boxRef.current) return
    const r = boxRef.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    void onUpdate(image.id, { focal_x: Number(x.toFixed(3)), focal_y: Number(y.toFixed(3)) })
    setFocalMode(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#D9D9D9] p-3 sm:flex-row">
      <div className="shrink-0">
        <div
          ref={boxRef}
          onClick={pickFocal}
          className={`relative h-[120px] w-[170px] overflow-hidden rounded-lg bg-[#F3F4F6] ${
            focalMode ? 'cursor-crosshair ring-2 ring-[#008080]' : ''
          }`}
        >
          {url ? (
            <img
              src={url}
              alt={image.alt_text ?? ''}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${image.focal_x * 100}% ${image.focal_y * 100}%` }}
            />
          ) : (
            <div className="grid h-full place-items-center text-[12px] text-[#9CA3AF]">טוען…</div>
          )}
          {index === 0 && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-[#008080] px-2 py-0.5 text-[10.5px] font-bold text-white">
              שער
            </span>
          )}
          {focalMode && (
            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[11px] font-semibold text-white">
              לחצי על נקודת המוקד
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            disabled={busy || index === 0}
            onClick={() => void onMove(index, index - 1)}
            title="הזזה קדימה"
            className="rounded-lg border border-[#D9D9D9] p-1.5 text-[#6B6B6B] transition hover:border-[#008080] hover:text-[#008080] disabled:opacity-30"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={busy || index === total - 1}
            onClick={() => void onMove(index, index + 1)}
            title="הזזה אחורה"
            className="rounded-lg border border-[#D9D9D9] p-1.5 text-[#6B6B6B] transition hover:border-[#008080] hover:text-[#008080] disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFocalMode((v) => !v)}
            title="נקודת מוקד"
            className={`rounded-lg border p-1.5 transition ${
              focalMode
                ? 'border-[#008080] bg-[#E6F3F3] text-[#008080]'
                : 'border-[#D9D9D9] text-[#6B6B6B] hover:border-[#008080] hover:text-[#008080]'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete(image)}
            title="מחיקה"
            className="rounded-lg border border-[#D9D9D9] p-1.5 text-[#6B6B6B] transition hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid min-w-0 flex-1 gap-2.5">
        <label className="block">
          <FieldLabel hint="תיאור לקוראי מסך ולמנועי חיפוש">טקסט חלופי</FieldLabel>
          <input
            className={ADMIN_INPUT}
            defaultValue={image.alt_text ?? ''}
            onBlur={(e) =>
              e.target.value !== (image.alt_text ?? '') &&
              void onUpdate(image.id, { alt_text: e.target.value || null })
            }
          />
        </label>
        <label className="block">
          <FieldLabel hint="מוצג מתחת לתמונה בגלריה">כיתוב</FieldLabel>
          <input
            className={ADMIN_INPUT}
            defaultValue={image.caption ?? ''}
            onBlur={(e) =>
              e.target.value !== (image.caption ?? '') &&
              void onUpdate(image.id, { caption: e.target.value || null })
            }
          />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FAFAF7] px-3 py-2">
          <span className="text-[13px] font-semibold text-[#2D2D2D]">
            {image.is_published ? 'מתפרסמת בדף' : 'לא מתפרסמת'}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              image.is_published ? void onUnpublish(image) : void onPublish(image)
            }
            className={`rounded-xl px-4 py-1.5 text-[13px] font-bold transition disabled:opacity-40 ${
              image.is_published
                ? 'border border-[#D9D9D9] text-[#6B6B6B] hover:border-[#DC2626] hover:text-[#DC2626]'
                : 'bg-[#008080] text-white hover:bg-[#006D6D]'
            }`}
          >
            {image.is_published ? 'הסרה מפרסום' : 'סימון לפרסום'}
          </button>
        </div>
        {!image.is_published && image.public_path && (
          <p className="text-[12px] text-[#9CA3AF]">הקובץ הציבורי כבר קיים — הסימון מיידי.</p>
        )}
        <p className="truncate text-[11.5px] text-[#9CA3AF]" dir="ltr">
          {assetCode} · {image.original_filename ?? image.private_path.split('/').pop()}
        </p>
      </div>
    </div>
  )
}

export function AssetImagesManager({
  images,
  assetCode,
  onUpload,
  onPublish,
  onUnpublish,
  onUpdate,
  onDelete,
  onReorder,
  busy,
}: {
  images: DentalAssetImage[]
  assetCode: string
  onUpload: (files: FileList) => Promise<void>
  onPublish: (img: DentalAssetImage) => Promise<void>
  onUnpublish: (img: DentalAssetImage) => Promise<void>
  onUpdate: (id: string, patch: Partial<DentalAssetImage>) => Promise<void>
  onDelete: (img: DentalAssetImage) => Promise<void>
  onReorder: (ordered: DentalAssetImage[]) => Promise<void>
  busy: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const publishedCount = images.filter((i) => i.is_published).length

  async function move(from: number, to: number) {
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    await onReorder(next)
  }

  return (
    <AdminCard
      title="תמונות"
      description={`${images.length} תמונות · ${publishedCount} מסומנות לפרסום. התמונה הראשונה היא תמונת השער בדף ובכרטיס הלוח. באדמין אין מגבלת כמות — מגבלת 15 חלה על הגשת הלקוח בלבד.`}
      grid={false}
    >
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files?.length) void onUpload(e.dataTransfer.files)
        }}
        className={`mb-4 flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition ${
          dragging ? 'border-[#008080] bg-[#E6F3F3]' : 'border-[#D9D9D9] bg-[#FAFAF7]'
        }`}
      >
        <UploadCloud className="h-6 w-6 text-[#008080]" />
        <span className="text-[13.5px] font-semibold text-[#2D2D2D]">
          גררי תמונות לכאן או בחרי קבצים
        </span>
        <span className="text-[12px] text-[#9CA3AF]">JPG · PNG · WEBP · עד 10MB לקובץ</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void onUpload(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      {!images.length ? (
        <p className="py-2 text-[13px] text-[#9CA3AF]">
          אין תמונות. שער הפרסום חוסם פרסום בלי לפחות תמונה אחת מסומנת.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {images.map((img, i) => (
            <ImageRow
              key={img.id}
              image={img}
              index={i}
              total={images.length}
              assetCode={assetCode}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={move}
              busy={busy}
            />
          ))}
        </div>
      )}
    </AdminCard>
  )
}
