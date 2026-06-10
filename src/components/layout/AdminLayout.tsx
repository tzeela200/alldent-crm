import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen" dir="rtl">
      <AppSidebar />
      <main className="flex-1 mr-56">
        <Outlet />
      </main>
    </div>
  )
}
