// קבוצות סינון למסך המשרות. המזהים אומתו מול dict_regions / dict_roles החיים (INC-3150).
// אין עמודת "אב" ב-dict_regions, לכן הקבוצות מוגדרות כאן במפורש ולא לפי התאמת שם.

export type FilterGroup = { id: string; label: string; ids: number[] }

export const NORTH_REGION_GROUP: FilterGroup = {
  id: 'north',
  label: 'כל הצפון',
  // חדרה, כרמיאל, עכו, רמת הגולן, גליל והעמקים, גליל עליון, חיפה וקריות
  ids: [7, 8, 9, 10, 11, 12, 13],
}

export const SPECIALISTS_ROLE_GROUP: FilterGroup = {
  id: 'specialists',
  label: 'כל המומחים',
  // אורתו, פריו, אנדו, כירורג, פדו, רפואת הפה, שיקום
  ids: [2, 3, 4, 5, 6, 7, 8],
}

export const REGION_GROUPS: FilterGroup[] = [NORTH_REGION_GROUP]
export const ROLE_GROUPS: FilterGroup[] = [SPECIALISTS_ROLE_GROUP]
