"""
create_missing_employer_accounts.py
====================================
יוצר accounts חדשים לארגונים שפתחו משרות אבל אינם קיימים ב-accounts,
ואז מקשר את המשרות אליהם.

מקור: alldent_jobs_archive (1).json + link_jobs_unmatched.json

הרצה:
    python create_missing_employer_accounts.py --dry-run    (ברירת מחדל)
    python create_missing_employer_accounts.py --execute
"""

import sys, io, os, json, argparse, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

JSON_PATH    = r"C:\Users\Allbi\OneDrive\שולחן העבודה\פרוייקטים\alldent_jobs_archive (1).json"
UNMATCHED_PATH = r"C:\Users\Allbi\alldent-crm\link_jobs_unmatched.json"

# מיפוי אזור (טקסט מהארכיון) → region_id ב-DB
REGION_NAME_TO_ID = {
    # מיפוי לפי dict_regions בסופרבייס (id → name)
    'גוש דן':    1, 'גוש-דן': 1,
    'דרום':      2,                          # דרום - מישור החוף
    'נגב':       3, 'דרום נגב': 3,
    'שרון':      4, 'השרון': 4,
    'ירושלים':   5,
    'מרכז':      6,
    'חדרה':      7,
    'כרמיאל':    8,
    'עכו':       9,
    'גולן':      10,
    'גליל':      11,
    'גליל עליון':12,
    'חיפה':      13,
    'שפלה':      14,
    'תל אביב':   15, 'תל-אביב': 15,
    'ארצי':      16,
}


def normalize_phone(p: str) -> str:
    if not p:
        return ''
    digits = re.sub(r'\D', '', str(p))
    return digits[-9:] if len(digits) >= 9 else digits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    is_dry = not args.execute

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY לא מוגדר")
        sys.exit(1)

    s = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── קרא קבצי מקור ───────────────────────────────────────────────
    with open(JSON_PATH, encoding='utf-8') as f:
        archive = json.load(f)
    with open(UNMATCHED_PATH, encoding='utf-8') as f:
        unmatched = json.load(f)

    job_map = {r['job_code']: r for r in archive if r.get('job_code')}

    # ── שלוף cities מסופרבייס ────────────────────────────────────────
    cities_data = s.table('dict_cities').select('id,name,region_id').execute().data or []
    city_name_to_id = {c['name'].strip().lower(): c['id'] for c in cities_data}

    # ── שלוף accounts קיימים (לבדיקת כפילות + התאמה לפי נייד) ────────
    accs = s.table('accounts').select('account_id,account_name,phone,second_phone').execute().data or []
    # map: phone_norm → account_id (גם phone וגם second_phone)
    phone_to_account_id: dict[str, int] = {}
    for a in accs:
        for field in ('phone', 'second_phone'):
            p = normalize_phone(a.get(field, '') or '')
            if p:
                phone_to_account_id[p] = a['account_id']
    existing_phones = set(phone_to_account_id.keys())
    existing_names  = {str(a.get('account_name', '') or '').strip().lower() for a in accs}

    # ── קבץ unmatched לפי ארגון ייחודי ──────────────────────────────
    clinics: dict[str, dict] = {}   # key = clinic_name → first archive record
    clinic_jobs: dict[str, list] = {}  # key = clinic_name → [job_codes]

    for item in unmatched:
        code = item['job_code']
        rec  = job_map.get(code)
        if not rec:
            continue
        name = (rec.get('clinic_name') or '').strip()
        if not name:
            continue
        if name not in clinics:
            clinics[name] = rec
            clinic_jobs[name] = []
        clinic_jobs[name].append(code)

    print(f"📊 {len(clinics)} ארגונים ייחודיים לייצור")
    print()

    # ── סנן כפילויות + ניסיון התאמה לפי נייד ────────────────────────
    to_create  = []
    to_link_only = []   # נמצאו בחיפוש נייד — רק לקשר משרות, לא ליצור
    skipped    = []

    for name, rec in clinics.items():
        phone1_norm = normalize_phone(rec.get('phone1', '') or '')
        phone2_norm = normalize_phone(rec.get('phone2', '') or '')
        name_lower  = name.lower()

        # בדוק אם השם כבר קיים
        if name_lower in existing_names:
            skipped.append((name, 'שם כבר קיים'))
            continue

        # בדוק אם הנייד (phone1 או phone2) מותאם לחשבון קיים
        matched_id = phone_to_account_id.get(phone1_norm) or phone_to_account_id.get(phone2_norm)
        if matched_id:
            to_link_only.append((name, matched_id, clinic_jobs[name]))
            continue

        # בנה payload
        city_str   = (rec.get('city') or '').strip()
        region_str = (rec.get('region') or '').strip()
        city_id    = city_name_to_id.get(city_str.lower())
        # עדיף לקחת אזור מהעיר בDB (מדויק יותר מהארכיון)
        city_region = next((c['region_id'] for c in cities_data if c['id'] == city_id), None) if city_id else None
        region_id  = city_region or REGION_NAME_TO_ID.get(region_str)

        payload = {
            'account_name':   name,
            'account_status': 7,   # מגייס פעיל
            'account_type':   1,   # מרפאת שיניים (ברירת מחדל)
            'phone':          rec.get('phone1') or None,
            'second_phone':   rec.get('phone2') or None,
            'email':          rec.get('email1') or None,
            'city_id':        city_id,
            'region_id':      region_id,
        }
        to_create.append((name, payload, clinic_jobs[name]))

    print(f"✅ לייצור (חדשים):          {len(to_create)}")
    print(f"🔗 לקישור בלבד (נייד נמצא): {len(to_link_only)}")
    print(f"⏭️  דולגים (כפילות):         {len(skipped)}")
    print()

    # ── תצוגה — קישור בלבד ──────────────────────────────────────────
    if to_link_only:
        print("🔗 קישור משרות לארגונים קיימים (נייד מצא התאמה):")
        print(f"  {'שם ארגון':<40} {'account_id':>10}  משרות")
        print('  ' + '-' * 60)
        for name, acc_id, jobs in to_link_only[:15]:
            print(f"  {name[:38]:<40} {acc_id:>10}  {len(jobs)}")
        if len(to_link_only) > 15:
            print(f"  ... ועוד {len(to_link_only) - 15}")
        print()

    # ── תצוגה — ארגונים חדשים ───────────────────────────────────────
    if to_create:
        print("🆕 ארגונים חדשים לייצור:")
        print(f"  {'שם ארגון':<40} {'טלפון':<14} {'עיר':<15} משרות")
        print('  ' + '-' * 75)
        for name, payload, jobs in to_create[:20]:
            city_id   = payload.get('city_id')
            city_name = next((c['name'] for c in cities_data if c['id'] == city_id), '—') if city_id else '—'
            print(f"  {name[:38]:<40} {(payload.get('phone') or '—'):<14} {city_name:<15} {len(jobs)}")
        if len(to_create) > 20:
            print(f"  ... ועוד {len(to_create) - 20}")

    if is_dry:
        print(f"\n[DRY RUN] לא בוצעו שינויים. הרץ עם --execute לביצוע.")
        return

    # ── קישור בלבד (נייד מצא התאמה) ────────────────────────────────
    linked = 0
    errors = []

    print(f"\n🔗 מקשר {sum(len(j) for _, _, j in to_link_only)} משרות לארגונים קיימים...")
    for name, acc_id, job_codes in to_link_only:
        for code in job_codes:
            try:
                s.table('job').update({'account_link': acc_id}).eq('job_code', code).execute()
                linked += 1
            except Exception as e:
                errors.append({'job_code': code, 'error': str(e)})

    # ── ייצור accounts חדשים + קישור משרות ─────────────────────────
    print(f"\n🚀 יוצר {len(to_create)} ארגונים חדשים...")
    created = 0

    for name, payload, job_codes in to_create:
        try:
            res = s.table('accounts').insert(payload).execute()
            new_id = (res.data or [{}])[0].get('account_id')
            if not new_id:
                errors.append({'name': name, 'error': 'לא התקבל account_id'})
                continue
            created += 1
            for code in job_codes:
                s.table('job').update({'account_link': new_id}).eq('job_code', code).execute()
                linked += 1
        except Exception as e:
            errors.append({'name': name, 'error': str(e)})

        if created % 20 == 0 and created > 0:
            print(f"  ✅ {created}/{len(to_create)}")

    print(f"\n=== סיכום ===")
    print(f"ארגונים חדשים נוצרו:  {created}")
    print(f"משרות קושרו סה\"כ:     {linked}")
    print(f"דולגו (כפילות):       {len(skipped)}")
    print(f"שגיאות:               {len(errors)}")

    if errors:
        with open('create_accounts_errors.json', 'w', encoding='utf-8') as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print("  שגיאות → create_accounts_errors.json")


if __name__ == '__main__':
    main()
