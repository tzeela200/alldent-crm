interface JobCardProps {
  public_image_url: string
  job_code: string
  job_title: string
  public_excerpt: string
  job_role_name: string
  city_name: string
  job_url: string
}

export function JobCard({
  public_image_url,
  job_code,
  job_title,
  public_excerpt,
  job_role_name,
  city_name,
  job_url,
}: JobCardProps) {
  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.13)]"
      style={{ fontFamily: 'Heebo, sans-serif' }}
    >
      {/* Image section */}
      <div className="relative h-[260px] overflow-hidden">
        <img
          src={public_image_url}
          alt={job_title}
          className="h-full w-full object-cover"
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <span
            className="mb-1.5 text-xs font-semibold tracking-wide"
            style={{ color: '#008080' }}
          >
            {job_role_name}
          </span>
          <h3 className="mb-4 text-xl font-bold leading-tight text-white">
            {job_title}
          </h3>
          <a
            href={job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            style={{ backgroundColor: '#008080' }}
          >
            לפרטי המשרה
          </a>
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-5 py-4">
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {public_excerpt}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{city_name}</span>
          <span className="text-slate-300">·</span>
          <span dir="ltr" className="font-mono">
            {job_code}
          </span>
        </div>
      </div>
    </div>
  )
}
