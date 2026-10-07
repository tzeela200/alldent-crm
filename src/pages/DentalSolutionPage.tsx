/**
 * INC-3151 · דף פרסום/קורס. /dental-solutions/<slug>
 *
 * העמוד אחראי רק על איתור הרשומה ועל מצב "לא נמצא". כל הרינדור יושב
 * ב-DentalSolutionBody, שישמש גם Preview אם התוכן יעבור ל-DB.
 *
 * slug לא מוכר או פרסום שאינו published ⇒ 404 אמיתי, לא דף ריק —
 * באותו דפוס של DentalAssetSlugDispatch.
 */
import { useParams } from 'react-router-dom'
import { getSolution } from '@/content/dentalSolutions'
import { DentalSolutionBody } from '@/components/dental-solutions/DentalSolutionBody'
import NotFoundPage from '@/pages/NotFoundPage'

export default function DentalSolutionPage() {
  const { slug } = useParams<{ slug: string }>()
  const solution = getSolution(slug ? decodeURIComponent(slug).trim() : undefined)

  if (!solution) return <NotFoundPage />

  return <DentalSolutionBody solution={solution} />
}
