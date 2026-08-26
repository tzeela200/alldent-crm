/**
 * INC-3130 · HOME DENT — הוקים לצד הציבורי.
 *
 * שגיאה בשליפה אינה מפילה את הלוח: הוא ממשיך להציג את ששת הנכסים
 * הישנים שיושבים בקוד. זו התנהגות מכוונת — תקלת רשת לא אמורה למחוק
 * עמוד שעבד קודם.
 */
import { useQuery } from '@tanstack/react-query'
import {
  getPublicAssetByCode,
  getPublicAssetCards,
  type PublicAssetCard,
  type PublicAssetRow,
} from '@/services/publicDentalAssetsService'

export function usePublicDentalAssets() {
  return useQuery<PublicAssetCard[]>({
    queryKey: ['public-dental-assets', 'cards'],
    queryFn: getPublicAssetCards,
    staleTime: 120_000,
    retry: 1,
  })
}

export function usePublicDentalAsset(code: string | undefined) {
  return useQuery<PublicAssetRow | null>({
    queryKey: ['public-dental-assets', 'one', code?.toUpperCase()],
    queryFn: () => getPublicAssetByCode(code!),
    enabled: !!code,
    staleTime: 300_000,
    retry: 1,
  })
}
