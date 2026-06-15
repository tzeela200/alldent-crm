import AdminEmployersPage from './AdminEmployersPage'

export default function AdminAccountsPage() {
  return (
    <AdminEmployersPage
      viewMode="accounts"
      initialTab="all"
      pageTitle="ארגונים"
      pageSubtitle="כל הארגונים במערכת — כולל ארגונים בלי משרות"
    />
  )
}
