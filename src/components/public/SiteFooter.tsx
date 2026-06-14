import { Link } from 'react-router-dom'
import { NAV_ITEMS } from './PublicHeader'

export function SiteFooter() {
  const year = new Date().getFullYear()

  // רשימה שטוחה: קישורים ראשיים + כל ה-children
  const flatLinks = NAV_ITEMS.flatMap((item) =>
    item.children
      ? [{ label: item.label, to: item.to }, ...item.children]
      : [{ label: item.label, to: item.to }]
  )

  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-16 md:mt-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16 text-right">

        {/* לוגו */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center" aria-label="AllDent — דף הבית">
            <img src="/images/logo.png" alt="AllDent" className="h-10 w-auto" />
          </Link>
        </div>

        {/* ניווט ראשי — הקישורים הראשיים בלבד */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-10">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative group text-[15px] font-medium text-[#2D2D2D] transition-colors hover:text-[#008080]"
            >
              {item.label}
              <span className="absolute right-0 -bottom-1 h-[2px] w-0 bg-[#008080] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* קישורים משניים */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
          {flatLinks
            .filter((l) => !NAV_ITEMS.some((n) => n.to === l.to && !n.children))
            .map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="text-[13px] text-[#6B6B6B] hover:text-[#008080] transition-colors"
              >
                {link.label}
              </Link>
            ))}
        </div>

        {/* תחתית */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#E5E7EB] pt-6 text-[13px] text-[#6B6B6B]">
          <span>© {year} AllDent. כל הזכויות שמורות.</span>
          <span dir="ltr" className="tracking-wide">Maximizing dental potential</span>
        </div>

      </div>
    </footer>
  )
}
