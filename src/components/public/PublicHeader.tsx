import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'בית', to: '/' },
  { label: 'גיוס דנטלי', to: '/employers' },
  { label: 'לוח משרות', to: '/jobs' },
  { label: 'שירותים', to: '/business-services' },
  { label: 'צור קשר', to: '/contact' },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">

      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center">
          <img src="/images/logo.png" alt="AllDent" className="h-10 w-auto" />
        </Link>

        {/* MENU BUTTON */}
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md"
        >
          <Menu size={20} />
        </button>

      </div>

      {/* FULLSCREEN MENU */}
      {open && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">

          {/* CLOSE */}
          <div className="flex justify-end px-6 py-6">
            <button onClick={() => setOpen(false)}>
              <X className="w-6 h-6 text-gray-800 hover:rotate-90 transition" />
            </button>
          </div>

          {/* LINKS */}
          <div className="flex flex-col items-end justify-center flex-1 px-12 space-y-6 text-right">

            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="text-[20px] md:text-[24px] font-medium text-gray-900 hover:text-black transition"
              >
                {item.label}
              </Link>
            ))}

          </div>

        </div>
      )}

    </header>
  )
}
