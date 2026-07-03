export type RoleSlug =
  | "dentists"
  | "specialists"
  | "hygienists"
  | "assistants"
  | "secretaries"
  | "management-sales"
  | "technicians";

export type Role = {
  slug: RoleSlug;
  label: string;
  longTitle: string;
  description: string;
  image: string;
};

export const ROLES: Role[] = [
  {
    slug: "dentists",
    label: "רופאי שיניים",
    longTitle: "משרות לרופאי/ות שיניים",
    description:
      "משרות לרופאי שיניים במרפאות מובילות ברחבי הארץ — מגוון משרות, אזורים והיקפים.",
    image: "/images/professions/dentists.jpg",
  },
  {
    slug: "specialists",
    label: "מומחים",
    longTitle: "משרות לרופאים מומחים",
    description:
      "משרות בכירות לרופאי שיניים מומחים — אנדודונטיה, פריודונטיה, אורתודונטיה, שיקום ועוד.",
    image: "/images/professions/specialists.jpg",
  },
  {
    slug: "hygienists",
    label: "שינניות",
    longTitle: "משרות לשינניות",
    description:
      "משרות לשינניות במרפאות פרטיות וברשתות מובילות, במשרה מלאה או חלקית.",
    image: "/images/professions/hygienists.jpg",
  },
  {
    slug: "assistants",
    label: "סייעות",
    longTitle: "משרות לסייעות רפואיות",
    description:
      "משרות לסייעות שיניים בצוותים מקצועיים ובסביבת עבודה איכותית.",
    image: "/images/professions/assistants.jpg",
  },
  {
    slug: "secretaries",
    label: "מזכירות רפואיות",
    longTitle: "משרות למזכירות רפואיות",
    description:
      "משרות מזכירות רפואית במרפאות שיניים מהמובילות בארץ.",
    image: "/images/professions/secretaries.jpg",
  },
  {
    slug: "management-sales",
    label: "ניהול מרפאה",
    longTitle: "משרות ניהול מרפאת שיניים",
    description:
      "תפקידי ניהול, תפעול ומכירות במרפאות שיניים וברשתות דנטליות.",
    image: "/images/professions/managers.jpg",
  },
  {
    slug: "technicians",
    label: "טכנאי שיניים",
    longTitle: "משרות לטכנאי/ות שיניים",
    description:
      "משרות לטכנאי שיניים במעבדות וברשתות דנטליות מובילות.",
    image: "/images/professions/technicians.jpg",
  },
];

export const ROLES_BY_SLUG: Record<string, Role> = Object.fromEntries(
  ROLES.map((r) => [r.slug, r]),
);

export function getRole(slug: string): Role | undefined {
  return ROLES_BY_SLUG[slug];
}
