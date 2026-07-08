const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES_TO_EXPORT = [
  'dict_publication_tracks',
  'dict_regions',
  'dict_cities',
  'dict_languages',
  'dict_skills',
  'dict_job_roles',
  'dict_benefits'
];

async function exportData() {
  console.log('--- ?? מתחיל בייצוא נתוני מילון וליבה מסופרבייס ---');
  const dump = {};

  for (const table of TABLES_TO_EXPORT) {
    try {
      console.log(`שולף נתונים מטבלת: ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`? שגיאה בשליפת טבלת ${table}:`, error.message);
        dump[table] = { error: error.message };
      } else {
        dump[table] = data;
        console.log(`? נשמרו ${data.length} רשומות.`);
      }
    } catch (err) {
      console.error(`? כשל בטבלת ${table}:`, err.message);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'supabase-data-dump.json'), JSON.stringify(dump, null, 2), 'utf-8');
  console.log('\n?? הייצוא הושלם! הקובץ supabase-data-dump.json נוצר בהצלחה בפרוייקט.');
}

exportData();
