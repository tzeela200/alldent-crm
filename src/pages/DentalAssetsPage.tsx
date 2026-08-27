import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, MessageCircle } from 'lucide-react'
import { usePublicDentalAssets } from '@/hooks/usePublicDentalAssets'
import { assetImageUrl, type PublicAssetCard } from '@/services/publicDentalAssetsService'
import { HD_OFFER_LABELS } from '@/lib/homeDentStatuses'

const PROPERTIES = [
  {
    id: 'p1',
    index: '01',
    title: 'מרפאת שיניים מאובזרת להשכרה — דיזנגוף סנטר',
    location: 'דיזנגוף סנטר ת"א, בניין B קומה 2',
    type: 'להשכרה',
    description: '32 מ"ר עם 2 חדרי טיפולים מאובזרים בלב דיזנגוף סנטר. מוכנה לעבודה מיידית — אוטוקלב, כסא רופא, קומפרסור, ואקום, יחידה דנטלית, מכשיר הלבנה ורנטגן חדש. חדר קבלה מרוהט, חדר סטריליזציה ושירותים. תחבורה ציבורית וחניון ציבורי במקום.',
    highlights: ['32 מ"ר | 2 חדרי טיפול', 'שכירות 8,000 ₪/חודש', 'מוכנה לעבודה מיידית'],
    image: '/images/properties/property-1.jpg',
    contact: 'https://wa.me/972502108501',
    contactName: 'אפי — 050-210-8501',
  },
  {
    id: 'p2',
    index: '02',
    title: 'חדרי טיפול להשכרה — מרפאת הופמן',
    location: 'פועלי הרכבת 39, קומה 1, גבעתיים',
    type: 'להשכרה',
    description: 'מרפאה פרטית בגבעתיים — חדר טיפול מאובזר עם סייעות מיומנות, מזכירה, מכשור מלא (משמרת, שיקום, אנדודונטיה, כירורגיה), סורק דיגיטלי מתקדם, מכון רנטגן ופנורמי, מעבדה צמודה עם יכולות PMMA וזירקוניה. גמישות מלאה — שוכרים חדר בלבד או עם שירותים משלימים.',
    highlights: ['מכשור מלא + מעבדה צמודה', 'PMMA | זירקוניה', 'גמישות תפעולית מלאה'],
    image: '/images/properties/property-2.jpg',
    contact: 'https://wa.me/972526189998',
    contactName: 'ברוך — 052-618-9998',
  },
  {
    id: 'p3',
    index: '03',
    title: 'מרפאה אקסקלוסיבית למכירה — מנחם בגין',
    location: 'רחוב מנחם בגין, תל אביב (קרוב לרכבת)',
    type: 'למכירה',
    description: '200 מ"ר מעוצבים בבניין משרדים פרימיום. 3 יוניטים חדישים, חדר סטרול גדול, משרד פרטי, מרפסת. תשתית מתקדמת: CBCT, סורק אינטראוראלי, פנורמי + רנטגן דיגיטלי, הרדמה כללית + גזים, מעבדה דיגיטלית עם CAD/CAM ו-2 עמדות טכנאים. חניון + 2 מקומות חניה לרופאים.',
    highlights: ['200 מ"ר | 3 יוניטים', 'CBCT + CAD/CAM + הרדמה כללית', 'מחיר: 1,500,000 ₪'],
    image: '/images/properties/property-3.jpg',
    contact: 'https://wa.me/972544401560',
    contactName: 'יגאל בלן — 054-440-1560',
  },
  {
    id: 'p4',
    index: '04',
    title: 'מרפאת ד"ר רן שייט — 27 שנות מוניטין',
    location: 'שכונת הפלגות ושיט, נתניה',
    type: 'למכירה',
    description: 'מרפאה בוטיק פרטית עם מאגר אלפי מטופלים שנצבר לאורך 27 שנים. מכירה Turnkey — כולל כל הציוד הדנטלי, אפשרות להמשיך ולהעסיק שיננית וסייעות. ניתן לרכוש את כל העסק הפעיל, או מאגר מטופלים בלבד. כניסה נפרדת, פטיו נעים, חלל קבלה והמתנה.',
    highlights: ['27 שנות מוניטין', 'מאגר אלפי מטופלים', 'Turnkey — פעילות מיידית'],
    image: '/images/properties/property-4.jpg',
    contact: 'https://wa.me/972546479929',
    contactName: 'ד"ר רן שייט — 054-647-9929',
  },
  {
    id: 'p5',
    index: '05',
    title: 'חדר טיפול במרפאת מומחים — מערב ראשון לציון',
    location: 'שכונת פרס נובל, ראשון לציון מערב, קומה 1',
    type: 'להשכרה',
    description: '"הקליניקה הפרטית שלך — בלי כאב הראש." מרפאת מומחים פרטית פעילה 19 שנה במרכז הרפואי והמסחרי של שכונת פרס נובל. 2 יוניטים חדישים, סורק פלטה פוספורית דיגיטלי. השכרה לפי משמרות — מיועד למומחים בפריודונטיה, אנדודונטיה ורפואת הפה בלבד.',
    highlights: ['19 שנות מוניטין', 'פריודונטיה | אנדודונטיה | רפואת הפה', 'השכרה גמישה למשמרות'],
    image: '/images/properties/property-5.png',
    contact: 'https://wa.me/972506243637',
    contactName: 'WhatsApp — 050-624-3637',
  },
  {
    id: 'p6',
    index: '06',
    title: 'חדר טיפולים במרפאת ד"ר שני — גבעתיים',
    location: 'סירקין 18, קומה 2, גבעתיים',
    type: 'להשכרה',
    description: 'מרפאה פרטית מושקעת בסטנדרט גבוה, פעילה 42 שנה בלב גבעתיים. 3 יוניטים במצב חדש לחלוטין, לייזר דנטלי ומדפסת 3D — גישה חופשית לרופאים. כניסה נפרדת לפרטיות מלאה. אידיאלי לרופאים מומחים ולאסתטיקה רפואית (בוטוקס).',
    highlights: ['42 שנות מוניטין', 'לייזר + מדפסת 3D', 'אסתטיקה רפואית | מומחים'],
    image: '/images/properties/property-6.jpg',
    contact: 'https://wa.me/972509799790',
    contactName: 'ד"ר שני — 050-979-9790',
  },
]

// ─── Property card — cinematic split reveal ────────────────────────────────────

/**
 * INC-3130 — הכרטיס מקבל עכשיו שני מקורות: ששת הנכסים הישנים שיושבים
 * בקוד, ונכסי HOME DENT שמגיעים מ-v_dental_asset_public. הצורה זהה,
 * ולכן ההבדל היחיד הוא `href`: קיים ⇒ Link לדף הנכס, חסר ⇒ הקישור
 * הישיר לוואטסאפ כמו עד היום.
 */
type PropertyItem = (typeof PROPERTIES)[number] & { href?: string }

function PropertyRevealCard({
  prop,
  reversed,
}: {
  prop: PropertyItem
  reversed: boolean
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className="grid items-center gap-10 py-20 md:grid-cols-2 md:gap-16 md:py-28"
      dir="rtl"
    >
      {/* Image — directional slide from its side */}
      <motion.div
        className={`${reversed ? 'md:order-2' : 'md:order-1'} group relative overflow-hidden rounded-[24px]`}
        initial={{ opacity: 0, x: reversed ? 60 : -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        {!imgError ? (
          <img
            src={prop.image}
            alt={prop.title}
            onError={() => setImgError(true)}
            className="h-[340px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[500px]"
          />
        ) : (
          <div className="h-[340px] w-full bg-gradient-to-br from-[#1a3a3a] to-[#2D2D2D] md:h-[500px]" />
        )}
        <div className="absolute inset-0 rounded-[24px] ring-1 ring-white/10" />
      </motion.div>

      {/* Content — slides from the opposite side */}
      <motion.div
        className={`${reversed ? 'md:order-1' : 'md:order-2'} flex flex-col gap-4`}
        initial={{ opacity: 0, x: reversed ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] font-bold text-[#008080]/60">{prop.index}</span>
          <span className="rounded-full bg-[#D97706]/20 px-3 py-1 text-[11px] font-extrabold tracking-widest text-[#D97706]">
            {prop.type}
          </span>
        </div>

        <h2 className="text-[clamp(21px,2.6vw,32px)] font-black leading-[1.12] tracking-[-0.02em] text-white">
          {prop.title}
        </h2>

        <div className="flex items-center gap-1.5 text-[13px] text-white/50">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{prop.location}</span>
        </div>

        <p className="text-[15px] leading-7 text-white/65 md:text-[16px]">
          {prop.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {prop.highlights.map((h) => (
            <span key={h} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70">
              {h}
            </span>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {prop.href ? (
            <Link
              to={prop.href}
              className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
            >
              לפרטים נוספים ←
            </Link>
          ) : (
            <a
              href={prop.contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
            >
              לפרטים נוספים ←
            </a>
          )}
          <span className="font-mono text-[12px] text-white/40">{prop.contactName}</span>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * public_card → אותו prop שהכרטיס כבר מקבל. אין כאן שום lookup: כל
 * הערכים כבר פתורים לעברית בתוך ה-snapshot שנבנה ב-Publish.
 */
function cardToProperty(card: PublicAssetCard): PropertyItem {
  const types = (card.offer_types ?? []).map((t) => HD_OFFER_LABELS[t] ?? t)
  return {
    id: card.asset_code,
    index: '',
    title: card.title || 'נכס דנטלי',
    location: card.location || '',
    type: card.type_label || types.join(' · ') || 'נכס דנטלי',
    description: card.excerpt || '',
    highlights: card.highlights ?? [],
    image: assetImageUrl(card.image?.path) ?? '',
    contact: `/dental-assets/${card.asset_code}`,
    contactName: card.asset_code,
    href: `/dental-assets/${card.asset_code}`,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DentalAssetsPage() {
  // כשל שליפה לא מפיל את הלוח — ששת הנכסים הישנים ממשיכים להיות מוצגים.
  const { data: published } = usePublicDentalAssets()

  const items = useMemo<PropertyItem[]>(
    () =>
      [...(published ?? []).map(cardToProperty), ...PROPERTIES].map((p, i) => ({
        ...p,
        index: String(i + 1).padStart(2, '0'),
      })),
    [published],
  )

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(0,128,128,0.22),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(217,119,6,0.14),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-[12px] font-extrabold tracking-[0.28em] text-[#D97706]" dir="ltr">
              HOME DENT
            </p>
            <h1
              className="text-[clamp(32px,5.6vw,68px)] font-black leading-[1.04] tracking-[-0.03em] text-white"
              
            >
              נכסים דנטליים
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-white/70">
              מרפאות, מעבדות והזדמנויות עסקיות בעולם הדנטל — מכירה, השכרה, שותפויות והעברת פעילות.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/dental-assets/terms"
                className="inline-flex items-center gap-2 rounded-full bg-[#B45309] px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-[#92400E]"
              >
                <MessageCircle className="h-4 w-4" />
                פרסמו נכס
              </Link>
              <a
                href="#properties"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-white/15"
              >
                לכל הנכסים ↓
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Properties list */}
      <section id="properties" className="mx-auto max-w-5xl overflow-x-clip px-5 md:px-8">
        <div className="divide-y divide-white/[0.07]">
          {items.map((prop, i) => (
            <motion.div
              key={prop.id}
              initial={{ opacity: 0, y: 80, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
            >
              <PropertyRevealCard prop={prop} reversed={i % 2 !== 0} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/10 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 text-[12px] font-extrabold tracking-[0.28em] text-[#D97706]" dir="ltr">
            HOME DENT
          </p>
          <h2 className="text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em] text-white">
            יש לכם נכס דנטלי?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/55">
            פרסמו את הנכס שלכם ותגיעו לאלפי אנשי מקצוע בעולם הדנטל בישראל.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/dental-assets/terms"
              className="inline-flex items-center gap-2 rounded-full bg-[#B45309] px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-[#92400E]"
            >
              <MessageCircle className="h-4 w-4" />
              פרסמו נכס
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-white/15"
            >
              חזרה לדף הבית
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
