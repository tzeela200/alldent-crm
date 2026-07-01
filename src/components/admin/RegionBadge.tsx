import { getRegionColor } from '@/lib/regionColors'

export { getRegionColor }

export function RegionBadge({ regionId, label }: { regionId: number | null | undefined; label: string }) {
  if (!label || label === '—') return <span className="text-[#6B6B6B]">—</span>
  const { chip } = getRegionColor(regionId)
  return (
    <span className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[12px] font-semibold ${chip}`}>
      {label}
    </span>
  )
}
