"""
import_jobs_from_csv.py
=======================
מייבא משרות חסרות מ-CSV לטבלת job בסופרבייס.
מדלג על job_code שכבר קיים ב-DB.

הרצה:
    python import_jobs_from_csv.py --dry-run    # תצוגה בלבד (ברירת מחדל)
    python import_jobs_from_csv.py --execute    # ביצוע
"""

import sys, io, os, argparse, csv, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

CSV_PATH = r"C:\Users\Allbi\OneDrive\שולחן העבודה\פרוייקטים\AllDent_Jobs_Import_Cleanסופרבייס.csv"

# שדות מספריים שצריך המרה ל-int
INT_FIELDS = {
    'job_status', 'job_role', 'job_sub_role', 'scope',
    'required_experience', 'region_id', 'city_id',
    'rel_employer_contact', 'total_applicants', 'account_link',
}

# שדות תאריך — None אם ריק
DATE_FIELDS = {
    'date_facebook', 'date_website', 'date_whatsapp',
    'last_publish_date', 'created_time', 'updated_timestamp',
}

# שדות ב-CSV שאולי לא קיימים ב-DB — לוודא לפי הטבלה
DB_COLUMNS = {
    'job_code', 'account_link', 'job_status', 'job_title', 'job_role',
    'job_sub_role', 'scope', 'required_experience', 'required_languages',
    'region_id', 'city_id', 'address', 'salary_range', 'job_description',
    'job_requirements', 'job_url', 'rel_employer_contact', 'total_applicants',
    'date_facebook', 'date_website', 'date_whatsapp', 'last_publish_date',
    'notes', 'created_time', 'updated_timestamp',
    'image_url', 'job_description_short', 'publication_track',
}


def to_int(val):
    if val is None or str(val).strip() == '':
        return None
    try:
        f = float(val)
        if math.isnan(f):
            return None
        return int(f)
    except (ValueError, TypeError):
        return None


def to_date(val):
    if val is None or str(val).strip() == '':
        return None
    return str(val).strip()


def parse_row(row: dict) -> dict:
    payload = {}
    for key, val in row.items():
        if key not in DB_COLUMNS:
            continue
        if key in INT_FIELDS:
            payload[key] = to_int(val)
        elif key in DATE_FIELDS:
            payload[key] = to_date(val)
        else:
            v = str(val).strip() if val is not None else ''
            payload[key] = v if v else None
    # הסר None מוחלט רק עבור שדות לא חובה (job_code תמיד שמור)
    return {k: v for k, v in payload.items() if k == 'job_code' or v is not None}


def main():
    parser = argparse.ArgumentParser(description='ייבוא משרות מ-CSV לסופרבייס')
    parser.add_argument('--dry-run', action='store_true', default=True, help='תצוגה בלבד (ברירת מחדל)')
    parser.add_argument('--execute', action='store_true', help='ביצוע בפועל')
    args = parser.parse_args()

    is_dry = not args.execute

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY לא מוגדר")
        sys.exit(1)

    s = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --- שלב 1: שלוף job_codes קיימים ---
    print("📋 שולף job_codes קיימים מסופרבייס...")
    existing_res = s.table('job').select('job_code').execute()
    existing_codes = {r['job_code'].strip().lower() for r in (existing_res.data or [])}
    print(f"  קיימים: {len(existing_codes)} משרות")

    # --- שלב 2: קרא CSV ---
    print(f"\n📂 קורא CSV: {CSV_PATH}")
    with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"  סה\"כ שורות ב-CSV: {len(rows)}")

    # --- שלב 3: סנן חסרים ---
    to_insert = [r for r in rows if r.get('job_code', '').strip().lower() not in existing_codes]
    to_skip = len(rows) - len(to_insert)
    print(f"  דולגים (כבר קיימים): {to_skip}")
    print(f"  לייבוא: {len(to_insert)}")

    if not to_insert:
        print("\n✅ אין משרות חסרות. DB מעודכן.")
        return

    # --- שלב 4: תצוגה מקדימה ---
    print(f"\n{'job_code':>10} {'status':>7} {'role':>6} {'region':>7}  {'כותרת'[:20]}")
    print("-" * 70)
    for r in to_insert[:20]:
        print(f"  {r.get('job_code',''):>10} {r.get('job_status',''):>7} {r.get('job_role',''):>6} {r.get('region_id',''):>7}  {str(r.get('job_title','') or '')[:30]}")
    if len(to_insert) > 20:
        print(f"  ... ועוד {len(to_insert) - 20} משרות")

    if is_dry:
        print(f"\n[DRY RUN] לא בוצעו שינויים. הרץ עם --execute לביצוע.")
        return

    # --- שלב 5: ייבוא ---
    print(f"\n🚀 מייבא {len(to_insert)} משרות...")
    inserted = 0
    errors = []

    BATCH = 50
    for i in range(0, len(to_insert), BATCH):
        batch = to_insert[i:i + BATCH]
        payloads = []
        for r in batch:
            try:
                payloads.append(parse_row(r))
            except Exception as e:
                errors.append({'job_code': r.get('job_code'), 'error': str(e)})

        if not payloads:
            continue
        try:
            s.table('job').upsert(payloads, on_conflict='job_code').execute()
            inserted += len(payloads)
            print(f"  ✅ {inserted}/{len(to_insert)}")
        except Exception as e:
            for p in payloads:
                errors.append({'job_code': p.get('job_code'), 'error': str(e)})
            print(f"  ❌ שגיאה ב-batch {i//BATCH + 1}: {e}")

    print(f"\n=== סיכום ===")
    print(f"יובאו:    {inserted}")
    print(f"דולגו:    {to_skip}")
    print(f"שגיאות:   {len(errors)}")
    if errors:
        import json
        with open('import_jobs_errors.json', 'w', encoding='utf-8') as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print("  פרטי שגיאות: import_jobs_errors.json")


if __name__ == '__main__':
    main()
