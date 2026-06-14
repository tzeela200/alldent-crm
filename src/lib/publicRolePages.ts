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

// ⚠️ ערכים אלה חייבים להתאים בדיוק לעמודת job_role_name בDB
export const SLUG_TO_JOB_ROLE_NAME: Record<RolePageSlug, string> = {
  dentists:    'רופאי שיניים',
  specialists: 'מומחים',
  hygienists:  'שינניות',
  assistants:  'סייעות',
  secretaries: 'מזכירות',
  managers:    'ניהול מרפאה',
  technicians: 'טכנאי שיניים',
}

export type PublicRolePage = {
  title: string
  subtitle: string
  badge: string
  image: string
  imageAlt: string
}

export const PUBLIC_ROLE_PAGES: Record<RolePageSlug, PublicRolePage> = {
  dentists: {
    title: 'משרות לרופאי שיניים',
    subtitle: 'לוח משרות ייעודי לרופאי ורופאות שיניים במרפאות פרטיות, רשתות ומרכזים דנטליים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/dentists.jpg',
    imageAlt: 'משרות לרופאי שיניים',
  },
  specialists: {
    title: 'משרות לרופאים מומחים',
    subtitle: 'משרות לרופאים מומחים בתחומי אנדודונטיה, פריודונטיה, אורתודונטיה, שיקום ועוד.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/specialists.jpg',
    imageAlt: 'משרות לרופאים מומחים',
  },
  hygienists: {
    title: 'משרות לשינניות',
    subtitle: 'לוח משרות לשינניות במרפאות שיניים ברחבי הארץ, במשרה מלאה או חלקית.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/hygienists.jpg',
    imageAlt: 'משרות לשינניות',
  },
  assistants: {
    title: 'משרות לסייעות',
    subtitle: 'משרות לסייעות שיניים במרפאות פרטיות, רשתות, מומחים ומרכזים דנטליים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/assistants.jpg',
    imageAlt: 'משרות לסייעות',
  },
  secretaries: {
    title: 'משרות למזכירות רפואיות',
    subtitle: 'משרות למזכירות דנטליות, אדמיניסטרציה וקבלה במרפאות שיניים.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/secretaries.jpg',
    imageAlt: 'משרות למזכירות רפואיות',
  },
  managers: {
    title: 'משרות לניהול מרפאה',
    subtitle: 'משרות ניהול, תפעול, שירות ומכירות במרפאות שיניים ורשתות דנטליות.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/managers.jpg',
    imageAlt: 'משרות לניהול מרפאה',
  },
  technicians: {
    title: 'משרות לטכנאי שיניים',
    subtitle: 'משרות לטכנאי וטכנאיות שיניים במעבדות, מרפאות וחברות דנטליות.',
    badge: 'לוח משרות דנטלי',
    image: '/images/page-heroes/technicians.jpg',
    imageAlt: 'משרות לטכנאי שיניים',
  },
}

export function getRolePage(slug: string): PublicRolePage | undefined {
  return PUBLIC_ROLE_PAGES[slug as RolePageSlug]
}

export function getJobRoleName(slug: string): string | undefined {
  return SLUG_TO_JOB_ROLE_NAME[slug as RolePageSlug]
}
