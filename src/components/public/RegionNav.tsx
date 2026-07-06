import { useNavigate } from 'react-router-dom'
import { ALL_REGION_SLUGS, REGION_PAGES } from '@/lib/publicRegionPages'

// ניווט אזורים משותף ללוח המשרות ולעמוד האזור.
// כותרת מפורשת כדי שלא ייווצר רושם שהסינון האזורי חל על כל התפקידים —
// הוא חל רק על סייעות ומזכירות.
export default function RegionNav({ activeSlug }: { activeSlug?: string }) {
  const navigate = useNavigate()

  return (
    <div dir="rtl" style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '18px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 15,
            fontWeight: 800,
            color: '#2D2D2D',
            textAlign: 'center',
            margin: '0 0 12px',
          }}
        >
          משרות סייעות ומזכירות לפי אזור
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          {ALL_REGION_SLUGS.map((slug) => {
            const region = REGION_PAGES[slug]
            const isActive = slug === activeSlug
            return (
              <button
                key={slug}
                onClick={() => navigate(`/jobs/${encodeURIComponent(slug)}`)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  background: isActive ? region.color : '#fff',
                  color: isActive ? '#fff' : region.color,
                  border: `2px solid ${region.color}`,
                  borderRadius: 999,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: 'Heebo, sans-serif',
                  cursor: 'pointer',
                  boxShadow: isActive ? `0 4px 12px -4px ${region.color}` : 'none',
                  outline: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.14s ease',
                }}
              >
                {region.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
