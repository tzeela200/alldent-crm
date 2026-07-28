import { StatusBadge } from '@/components/admin/StatusBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { formatPhone } from '@/lib/normalizePhone'
import { openApplicationCv, personHasCv } from '@/lib/cv'
import { formatDate } from '@/lib/timeAgo'
import type { ApplicationRow } from '@/types/applications'

// תצוגת כרטיסים — משתמשת באותם תגים קנוניים של הטבלה, כדי שצבע/תווית
// יהיו זהים בשתי התצוגות.

interface Props {
  rows: ApplicationRow[]
  onRowClick: (id: number) => void
}

export function ApplicationsGrid({ rows, onRowClick }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.application_id}
          onClick={() => onRowClick(row.application_id)}
          className="cursor-pointer rounded-[18px] border border-[#D9D9D9] bg-white p-4 transition hover:border-[#008080] hover:shadow-[2px_2px_6px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-[#2D2D2D]">{row.candidate_name ?? '—'}</p>
              {row.candidate_phone && (
                <p className="text-[12px] text-[#6B6B6B]" dir="ltr">
                  {formatPhone(row.candidate_phone)}
                </p>
              )}
            </div>
            <StatusBadge statusType="application" statusId={row.application_status} />
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-[13px] text-[#6B6B6B]">
              <span className="font-semibold">{row.job_code}</span>
              {row.account_name && ` · ${row.account_name}`}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {row.job_role && <RoleBadge roleId={row.job_role_id} label={row.job_role} />}
              {row.job_region && (
                <RegionBadge regionId={row.job_region_id} label={row.job_region} />
              )}
            </div>
            <p className="text-[12px] text-[#9CA3AF]">{formatDate(row.submission_date)}</p>
          </div>

          {personHasCv(row) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openApplicationCv(row)
              }}
              className="mt-2 text-[13px] font-semibold text-[#3B82F6] hover:underline"
            >
              קו"ח ↗
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
