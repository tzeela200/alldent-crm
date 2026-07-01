export function getRoleColor(roleId: number | null | undefined): string {
  if (!roleId) return 'bg-slate-100 text-slate-600'
  if (roleId >= 1 && roleId <= 8) return 'bg-blue-100 text-blue-800'    // רופאים/מומחים
  if (roleId === 9)  return 'bg-violet-100 text-violet-800'              // סייעות
  if (roleId === 10) return 'bg-pink-100 text-pink-800'                  // שינניות
  if (roleId === 11) return 'bg-amber-100 text-amber-800'                // טכנאים
  if (roleId === 12) return 'bg-indigo-100 text-indigo-800'              // מנהלים
  if (roleId === 13) return 'bg-green-100 text-green-800'                // מזכירות
  if (roleId === 14) return 'bg-teal-100 text-teal-800'                  // עובד דנטלי
  if (roleId === 15 || roleId === 17 || roleId === 18) return 'bg-sky-100 text-sky-800' // מכירות/רכש/צילום
  if (roleId === 16) return 'bg-rose-100 text-rose-800'                  // בעלים
  return 'bg-slate-100 text-slate-600'
}

// גוון hex מלא לכל תפקיד — לשימוש בברים/גרפיקה (inline style), ללא סיכון purge של Tailwind.
export function getRoleColorHex(roleId: number | null | undefined): string {
  if (!roleId) return '#94a3b8'
  if (roleId >= 1 && roleId <= 8) return '#2563eb' // רופאים/מומחים — כחול
  if (roleId === 9) return '#7c3aed'  // סייעות — סגול
  if (roleId === 10) return '#db2777' // שינניות — ורוד
  if (roleId === 11) return '#d97706' // טכנאים — ענבר
  if (roleId === 12) return '#4f46e5' // מנהלים — אינדיגו
  if (roleId === 13) return '#16a34a' // מזכירות — ירוק
  if (roleId === 14) return '#0d9488' // עובד דנטלי — טורקיז
  if (roleId === 15 || roleId === 17 || roleId === 18) return '#0284c7' // מכירות/רכש/צילום — תכלת
  if (roleId === 16) return '#e11d48' // בעלים — רוז
  return '#94a3b8'
}

export function RoleBadge({ roleId, label }: { roleId: number | null | undefined; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[12px] font-semibold ${getRoleColor(roleId)}`}>
      {label}
    </span>
  )
}
