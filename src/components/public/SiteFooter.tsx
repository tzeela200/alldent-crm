import { Link } from 'react-router-dom'
import { NAV_ITEMS } from './PublicHeader'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-20">

      <div className="max-w-7xl mx-auto px-6 py-16 text-right">

        {/* לוגו */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/images/logo.png"
              alt="AllDent"
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* ניווט */}
        <div className="flex flex-wrap gap-8 mb-12 text-[16px] text-gray-700">

          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative group transition-colors hover:text-black"
            >
              {item.label}

              {/* underline animation */}
              <span className="absolute right-0 -bottom-1 h-[2px] w-0 bg-gray-900 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}

        </div>

        {/* תחתית */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6 text-[14px] text-gray-500">

          <span>© {year} AllDent. כל הזכויות שמורות.</span>

          <span dir="ltr" className="tracking-wide">
            Maximizing dental potential
          </span>

        </div>

      </div>

    </footer>
  )
}
