import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  Users,
  UserCheck,
  Building2,
  Briefcase,
  ClipboardList,
  Columns3,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/admin', label: 'מרכז שליטה', icon: LayoutDashboard },
    ],
  },
  {
    title: 'מאגר אנשי קשר',
    items: [
      { to: '/admin/inbox', label: 'לידים / פניות', icon: Inbox, badge: 3 },
      { to: '/admin/contacts', label: 'ניהול מאגר', icon: Users },
      { to: '/admin/candidates', label: 'מועמדים', icon: UserCheck },
    ],
  },
  {
    title: 'ארגונים',
    items: [
      { to: '/admin/accounts', label: 'כל הארגונים', icon: Building2 },
      { to: '/admin/employers', label: 'מעסיקים', icon: Building2 },
    ],
  },
  {
    title: 'גיוס',
    items: [
      { to: '/admin/jobs', label: 'משרות', icon: Briefcase },
      { to: '/admin/applications', label: 'הגשות', icon: ClipboardList },
      { to: '/admin/pipeline', label: 'צינור גיוס', icon: Columns3 },
      { to: '/admin/smart-match', label: 'שידוך חכם', icon: Sparkles },
    ],
  },
]

export function AppSidebar() {
  return (
    <aside className="fixed right-0 top-0 z-30 flex h-screen w-56 flex-col border-l border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-xs font-black text-white">
          AD
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800">AllDent</div>
          <div className="text-[10px] text-slate-400">Ops · v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.title && (
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-semibold text-rose-700">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <NavLink
          to="/admin/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
          <span>הגדרות</span>
        </NavLink>
      </div>
    </aside>
  )
}
