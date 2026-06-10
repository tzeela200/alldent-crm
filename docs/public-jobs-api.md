# API ציבורי — לוח משרות AllDent

מסמך זה למפתחת/מפתח חיצוני שבונה את לוח המשרות הציבורי באתר WordPress/Wix/Framer.

## נתוני התחברות

| | |
|---|---|
| **Supabase URL** | `https://urcdxdcyiedbdwegcebq.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2R4ZGN5aWVkYmR3ZWdjZWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjQzOTUsImV4cCI6MjA4NzgwMDM5NX0.oPb6fBl2Wq3tYoicBvGlszwRtNN3abPH-eZryTT11XM` |

⚠️ ה-Anon Key בטוח לחשיפה בצד לקוח. RLS policy על שרת מגנה את הנתונים.

---

## אבטחה (RLS)

הוגדרה policy שמאפשרת לקרוא **רק** משרות עם `job_status = 3` (פעיל).
משרות לא פעילות, ערוך, מחיקה — כולן חסומות לציבור.

---

## endpoint #1 — כל המשרות הפעילות

```http
GET https://urcdxdcyiedbdwegcebq.supabase.co/rest/v1/job?select=job_code,job_title,job_description,image_url,job_role,city_id,region_id,scope,job_url,last_publish_date&job_status=eq.3&order=last_publish_date.desc
apikey: <ANON_KEY>
```

**מחזיר:** Array של עד 98 משרות. דוגמה:
```json
[
  {
    "job_code": "as85",
    "job_title": "סייעת אחראית למרפאת בוטיק בגן-יבנה",
    "job_description": "...",
    "image_url": "https://irp.cdn-website.com/...",
    "job_role": 9,
    "city_id": 1226,
    "region_id": 14,
    "scope": 1,
    "job_url": "https://www.alldent.co.il/as85",
    "last_publish_date": "2026-06-07"
  }
]
```

---

## endpoint #2 — משרה ספציפית

```http
GET https://urcdxdcyiedbdwegcebq.supabase.co/rest/v1/job?select=*&job_code=eq.as85&job_status=eq.3
apikey: <ANON_KEY>
```

---

## endpoint #3 — משרה עם שמות מלאים (JOIN)

```http
GET https://urcdxdcyiedbdwegcebq.supabase.co/rest/v1/job?select=*,role:dict_roles(name),city:dict_cities(name),region:dict_regions(name),scope_dict:dict_scopes(name)&job_status=eq.3&order=last_publish_date.desc
apikey: <ANON_KEY>
```

**מחזיר משרה + שמות:**
```json
{
  "job_code": "as85",
  "job_title": "סייעת אחראית למרפאת בוטיק בגן-יבנה",
  "role": { "name": "סייעת" },
  "city": { "name": "גן-יבנה" },
  "region": { "name": "שפלה" },
  "scope_dict": { "name": "משרה מלאה" }
}
```

---

## טיפוסי שדות

| שדה | טיפוס | הערה |
|---|---|---|
| `job_code` | text | PK ייחודי (as85, doc86, ...) |
| `job_title` | text | כותרת |
| `job_description` | text | תיאור ארוך, יכול להיות NULL |
| `image_url` | text | URL ל-CDN חיצוני |
| `job_role` | bigint | FK ל-dict_roles |
| `city_id` | bigint | FK ל-dict_cities (NULL = משרה ארצית) |
| `region_id` | bigint | FK ל-dict_regions (NULL = משרה ארצית) |
| `scope` | bigint | FK ל-dict_scopes |
| `job_url` | text | URL לעמוד באתר הישן |
| `last_publish_date` | date | תאריך פרסום |
| `job_status` | bigint | 3 = פעיל (אחרת לא יוחזר) |

---

## דוגמת קוד JavaScript

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://urcdxdcyiedbdwegcebq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // anon key
)

// כל המשרות הפעילות עם שמות
const { data: jobs } = await supabase
  .from('job')
  .select(`
    job_code, job_title, job_description, image_url, last_publish_date,
    role:dict_roles(name),
    city:dict_cities(name),
    region:dict_regions(name),
    scope_dict:dict_scopes(name)
  `)
  .eq('job_status', 3)
  .order('last_publish_date', { ascending: false })

// משרה בודדת
const { data: job } = await supabase
  .from('job')
  .select('*, role:dict_roles(name), city:dict_cities(name)')
  .eq('job_code', 'as85')
  .eq('job_status', 3)
  .single()
```

---

## סטטוס נוכחי

- ✅ 98 משרות פעילות הוטמעו
- ✅ 95 ממופות לעיר + אזור (3 ארציות = NULL)
- ✅ 98 ממופות לתפקיד והיקף
- ✅ 91 עם תמונה (7 ללא — שדה image_url יהיה NULL)
- ✅ RLS policy פעיל

---

## עדכון משרות

המשתמשת מנהלת משרות דרך **CRM** (alldent-crm) במסך AdminJobsPage.
משרות חדשות שהיא תוסיף — יופיעו אוטומטית באתר תוך 30 שניות.
משרות שהיא תכבה (status≠3) — ייעלמו מיד מהאתר.
