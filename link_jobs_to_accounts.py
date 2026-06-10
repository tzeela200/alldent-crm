"""
link_jobs_to_accounts.py (v2)
==============================
מקשר משרות למעסיקים לפי clinic_name + phone.
מקור: alldent_jobs_archive (1).json

הרצה:
    python link_jobs_to_accounts.py --dry-run    # תצוגה בלבד (ברירת מחדל)
    python link_jobs_to_accounts.py --execute    # ביצוע בפועל
"""

import sys, io, os, json, argparse, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

JSON_PATH = r"C:\Users\Allbi\OneDrive\שולחן העבודה\פרוייקטים\alldent_jobs_archive (1).json"


def normalize_name(s: str) -> str:
    if not s:
        return ''
    return str(s).strip().lower()


def normalize_phone(p: str) -> str:
    if not p:
        return ''
    digits = re.sub(r'\D', '', str(p))
    return digits[-9:] if len(digits) >= 9 else digits


def main():
    parser = argparse.ArgumentParser(description='קישור משרות למעסיקים לפי JSON archive')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    is_dry = not args.execute

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY לא מוגדר. הגדר עם: $env:SUPABASE_SERVICE_KEY='...'")
        sys.exit(1)

    s = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── שלב 1: קרא JSON archive ──────────────────────────────────────
    print(f"📂 קורא: {JSON_PATH}")
    with open(JSON_PATH, encoding='utf-8') as f:
        archive = json.load(f)
    job_map = {r['job_code']: r for r in archive if r.get('job_code')}
    print(f"  {len(job_map)} רשומות בארכיון")

    # ── שלב 2: שלוף accounts מסופרבייס ─────────────────────────────
    print("\n📋 שולף ארגונים מסופרבייס...")
    accs = s.table('accounts').select('account_id,account_name,phone').execute().data or []
    print(f"  {len(accs)} ארגונים")

    name_to_id: dict[str, int] = {}
    phone_to_id: dict[str, int] = {}
    for a in accs:
        n = normalize_name(a.get('account_name', ''))
        if n:
            name_to_id[n] = a['account_id']
        p = normalize_phone(a.get('phone', '') or '')
        if p:
            phone_to_id[p] = a['account_id']

    # ── שלב 3: שלוף משרות מסופרבייס ────────────────────────────────
    print("\n🔍 שולף משרות מסופרבייס...")
    jobs = s.table('job').select('job_code,account_link').execute().data or []
    print(f"  {len(jobs)} משרות סה\"כ")
    unlinked = [j for j in jobs if not j.get('account_link')]
    print(f"  {len(unlinked)} ללא קישור (account_link = null)")

    # ── שלב 4: התאמה ────────────────────────────────────────────────
    matched_name = []   # (job_code, account_id, clinic_name)
    matched_phone = []  # (job_code, account_id, clinic_name)
    not_in_archive = []
    unmatched = []

    for job in unlinked:
        code = job['job_code']
        rec = job_map.get(code)
        if not rec:
            not_in_archive.append(code)
            continue

        clinic = normalize_name(rec.get('clinic_name', ''))
        if clinic and clinic in name_to_id:
            matched_name.append((code, name_to_id[clinic], rec.get('clinic_name', '')))
            continue

        phone = normalize_phone(rec.get('phone1', '') or '')
        if phone and phone in phone_to_id:
            matched_phone.append((code, phone_to_id[phone], rec.get('clinic_name', '')))
            continue

        unmatched.append((code, rec.get('clinic_name', ''), rec.get('phone1', '')))

    all_matched = matched_name + matched_phone

    # ── דוח ─────────────────────────────────────────────────────────
    print(f"\n{'=' * 55}")
    print(f"  ✅ הותאמו לפי שם ארגון:   {len(matched_name)}")
    print(f"  ✅ הותאמו לפי טלפון:      {len(matched_phone)}")
    print(f"  ❌ לא הותאמו:             {len(unmatched)}")
    print(f"  ⚠️  לא בארכיון:            {len(not_in_archive)}")
    print(f"{'=' * 55}")

    print(f"\n{'job_code':>12}  {'account_id':>10}  ארגון")
    print("-" * 55)
    for code, aid, name in all_matched[:25]:
        print(f"  {code:>12}  {aid:>10}  {name[:30]}")
    if len(all_matched) > 25:
        print(f"  ... ועוד {len(all_matched) - 25}")

    if unmatched:
        print(f"\n⚠️  לא נמצאו ({len(unmatched)}):")
        for code, name, phone in unmatched[:15]:
            print(f"  {code:>12}  {name[:30]}  {phone}")
        if len(unmatched) > 15:
            print(f"  ... ועוד {len(unmatched) - 15}")

    if is_dry:
        print(f"\n[DRY RUN] לא בוצעו שינויים. הרץ עם --execute לביצוע.")
        return

    # ── שלב 5: עדכון ────────────────────────────────────────────────
    print(f"\n🚀 מעדכן {len(all_matched)} משרות...")
    updated = 0
    errors = []

    for job_code, account_id, _ in all_matched:
        try:
            s.table('job').update({'account_link': account_id}).eq('job_code', job_code).execute()
            updated += 1
        except Exception as e:
            errors.append({'job_code': job_code, 'error': str(e)})

        if updated % 50 == 0:
            print(f"  ✅ {updated}/{len(all_matched)}")

    print(f"\n=== סיכום ===")
    print(f"עודכנו:      {updated}")
    print(f"לא הותאמו:   {len(unmatched)}")
    print(f"לא בארכיון:  {len(not_in_archive)}")
    print(f"שגיאות:      {len(errors)}")

    if unmatched:
        out = [{'job_code': c, 'clinic_name': n, 'phone': p} for c, n, p in unmatched]
        with open('link_jobs_unmatched.json', 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print("  לא הותאמו → link_jobs_unmatched.json")

    if errors:
        with open('link_jobs_errors.json', 'w', encoding='utf-8') as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print("  שגיאות → link_jobs_errors.json")


if __name__ == '__main__':
    main()
