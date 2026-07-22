export type RolePageSlug =
  | 'dentists'
  | 'specialists'
  | 'hygienists'
  | 'assistants'
  | 'secretaries'
  | 'management-sales'
  | 'technicians'

export const ALL_ROLE_SLUGS: RolePageSlug[] = [
  'dentists', 'specialists', 'hygienists', 'assistants',
  'secretaries', 'management-sales', 'technicians',
]

export const SLUG_TO_JOB_ROLE_NAME: Record<RolePageSlug, string> = {
  dentists:           'רופאי שיניים',
  specialists:        'מומחים',
  hygienists:         'שינניות',
  assistants:         'סייעות',
  secretaries:        'מזכירות',
  'management-sales': 'ניהול מרפאה',
  technicians:        'טכנאי שיניים',
}

// סינון לפי job_role (מספר) — מדויק, ללא ilike
export const SLUG_TO_JOB_ROLE_IDS: Record<RolePageSlug, number[]> = {
  dentists:           [1],
  specialists:        [2, 3, 4, 5, 6, 7, 8],
  hygienists:         [10],
  assistants:         [9],
  secretaries:        [13],
  'management-sales': [12, 14, 15, 17],
  technicians:        [11],
}

// שורש לחיפוש ilike — נשמר לצרכי צבע/תצוגה בלבד
export const SLUG_TO_SEARCH_ROOT: Record<RolePageSlug, string> = {
  dentists:           'רופא',
  specialists:        'מומח',
  hygienists:         'שינ',
  assistants:         'סייע',
  secretaries:        'מזכיר',
  'management-sales': 'ניהול',
  technicians:        'טכנא',
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
  ['מזכיר',  '#076911'],
  ['ניהול',  '#ff751f'],
  ['מנהל',   '#ff751f'],
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
    color: '#076911',
    searchRoot: 'מזכיר',
  },
  'management-sales': {
    title: 'משרות לניהול מרפאה',
    subtitle: 'משרות ניהול, תפעול, שירות ומכירות במרפאות שיניים ורשתות דנטליות.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/managers.jpg',
    imageAlt: 'משרות לניהול מרפאה',
    color: '#ff751f',
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
