export type RolePageSlug =
  | 'dentists'
  | 'specialists'
  | 'hygienists'
  | 'assistants'
  | 'secretaries'
  | 'managers'
  | 'technicians'

export const ALL_ROLE_SLUGS: RolePageSlug[] = [
  'dentists', 'specialists', 'hygienists', 'assistants',
  'secretaries', 'managers', 'technicians',
]

export const SLUG_TO_JOB_ROLE_NAME: Record<RolePageSlug, string> = {
  dentists:    'רופאי שיניים',
  specialists: 'מומחים',
  hygienists:  'שינניות',
  assistants:  'סייעות',
  secretaries: 'מזכירות',
  managers:    'ניהול מרפאה',
  technicians: 'טכנאי שיניים',
}

// שורש לחיפוש ilike — תופס את כל וריאציות התפקיד ב-DB
export const SLUG_TO_SEARCH_ROOT: Record<RolePageSlug, string> = {
  dentists:    'רופא',    // רופא/ת שיניים, רופאי שיניים
  specialists: 'מומח',   // מומחה שיקום, מומחה פדו, מומחה אנדו...
  hygienists:  'שינ',    // שיננית, שינניות
  assistants:  'סייע',   // סייעת, סייעות
  secretaries: 'מזכיר',  // מזכירה, מזכירות
  managers:    'ניהול',  // ניהול מרפאה, מנהל/ת דנטלי
  technicians: 'טכנא',   // טכנאי שיניים, טכנאית שיניים
}

export type PublicRolePage = {
  title: string
  subtitle: string
  badge: string
  image: string
  imageAlt: string
  color: string
  searchRoot: string   // שורש לחיפוש ilike ב-DB
  colorDark?: boolean
}

// צבע לפי שורש שם התפקיד — גמיש לכל וריאציה ב-DB
const ROLE_ROOT_COLORS: Array<[string, string]> = [
  ['רופא',   '#0cc0df'],
  ['מומח',   '#086df4'],
  ['שינ',    '#d10383'],
  ['סייע',   '#774196'],
  ['מזכיר',  '#ff751f'],
  ['ניהול',  '#076911'],
  ['מנהל',   '#076911'],
  ['טכנא',   '#d4a800'],
]

export function roleColorFromName(name?: string | null): string {
  if (!name) return '#008080'
  for (const [root, color] of ROLE_ROOT_COLORS) {
    if (name.includes(root)) return color
  }
  return '#008080'
}

export function roleDarkFromName(_name?: string | null): boolean {
  return false
}

export const PUBLIC_ROLE_PAGES: Record<RolePageSlug, PublicRolePage> = {
  dentists: {
    title: 'משרות לרופאי שיניים',
    subtitle: 'לוח משרות ייעודי לרופאי ורופאות שיניים במרפאות פרטיות, רשתות ומרכזים דנטליים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/dentists.jpg',
    imageAlt: 'משרות לרופאי שיניים',
    color: '#0cc0df',
    searchRoot: 'רופא',
  },
  specialists: {
    title: 'משרות לרופאים מומחים',
    subtitle: 'משרות לרופאים מומחים בתחומי אנדודונטיה, פריודונטיה, אורתודונטיה, שיקום ועוד.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/specialists.jpg',
    imageAlt: 'משרות לרופאים מומחים',
    color: '#086df4',
    searchRoot: 'מומח',
  },
  hygienists: {
    title: 'משרות לשינניות',
    subtitle: 'לוח משרות לשינניות במרפאות שיניים ברחבי הארץ, במשרה מלאה או חלקית.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/hygienists.jpg',
    imageAlt: 'משרות לשינניות',
    color: '#d10383',
    searchRoot: 'שינ',
  },
  assistants: {
    title: 'משרות לסייעות',
    subtitle: 'משרות לסייעות שיניים במרפאות פרטיות, רשתות, מומחים ומרכזים דנטליים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/assistants.jpg',
    imageAlt: 'משרות לסייעות',
    color: '#774196',
    searchRoot: 'סייע',
  },
  secretaries: {
    title: 'משרות למזכירות רפואיות',
    subtitle: 'משרות למזכירות דנטליות, אדמיניסטרציה וקבלה במרפאות שיניים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/secretaries.jpg',
    imageAlt: 'משרות למזכירות רפואיות',
    color: '#ff751f',
    searchRoot: 'מזכיר',
  },
  managers: {
    title: 'משרות לניהול מרפאה',
    subtitle: 'משרות ניהול, תפעול, שירות ומכירות במרפאות שיניים ורשתות דנטליות.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/managers.jpg',
    imageAlt: 'משרות לניהול מרפאה',
    color: '#076911',
    searchRoot: 'ניהול',
  },
  technicians: {
    title: 'משרות לטכנאי שיניים',
    subtitle: 'משרות לטכנאי וטכנאיות שיניים במעבדות, מרפאות וחברות דנטליות.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/technicians.jpg',
    imageAlt: 'משרות לטכנאי שיניים',
    color: '#d4a800',
    searchRoot: 'טכנא',
    colorDark: false,
  },
}

export function getRolePage(slug: string): PublicRolePage | undefined {
  return PUBLIC_ROLE_PAGES[slug as RolePageSlug]
}

export function getJobRoleName(slug: string): string | undefined {
  return SLUG_TO_JOB_ROLE_NAME[slug as RolePageSlug]
}

export function getRoleSearchRoot(slug: string): string | undefined {
  return SLUG_TO_SEARCH_ROOT[slug as RolePageSlug]
}
