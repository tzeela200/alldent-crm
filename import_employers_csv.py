import sys, io, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

CSV_PATH = r'C:\Users\Allbi\OneDrive\שולחן העבודה\פרוייקטים\AllDent_Employers_Import_Cleanסופרבייס .csv'


def normalize_phone(v):
    if not v or (isinstance(v, float) and pd.isna(v)):
        return None
    v = re.sub(r'[^\d]', '', str(v).strip())
    if not v:
        return None
    if len(v) == 9 and v.startswith('5'):
        v = '0' + v
    if len(v) == 10 and v.startswith('0'):
        return v
    if v.startswith('972') and len(v) == 12:
        return '0' + v[3:]
    return v if v else None


def get(row, col):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s if s else None


def load_accounts_by_phone(supabase):
    result = supabase.table('accounts').select('account_id,phone').execute()
    lookup = {}
    for r in result.data:
        p = normalize_phone(r.get('phone'))
        if p:
            lookup[p] = r['account_id']
    return lookup


def main():
    if not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_SERVICE_KEY")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading accounts by phone...")
    phone_to_id = load_accounts_by_phone(supabase)
    print(f"  {len(phone_to_id)} accounts with phone")

    print("Reading CSV...")
    df = pd.read_csv(CSV_PATH, encoding='utf-8-sig')
    df.columns = [c.strip() for c in df.columns]
    print(f"  {len(df)} rows")

    updated = 0
    inserted = 0
    errors = []

    for _, row in df.iterrows():
        name    = get(row, 'account_name')
        phone   = normalize_phone(get(row, 'phone'))
        phone2  = normalize_phone(get(row, 'second_phone'))
        email   = get(row, 'email')
        email2  = get(row, 'second_email')
        address = get(row, 'address')
        notes   = get(row, 'notes')
        contact = get(row, 'contact_name')
        city_n  = get(row, 'city_name')
        region_n = get(row, 'region_name')

        # region_id מתוך שם האזור
        region_id_raw = get(row, 'region_id')
        region_id = int(float(region_id_raw)) if region_id_raw else None

        # city_id
        city_id_raw = get(row, 'city_id')
        city_id = int(float(city_id_raw)) if city_id_raw else None

        if not name:
            continue

        # payload לעדכון/הוספה
        payload = {
            'account_status': 2,  # מגייס פעיל
            'account_type': 4,    # מרפאת שיניים
            'email': email,
            'second_email': email2,
            'second_phone': phone2,
            'address': address,
            'notes': notes,
            'contact_link': contact,
        }
        if region_id: payload['region_id'] = region_id
        if city_id:   payload['city_id'] = city_id
        payload = {k: v for k, v in payload.items() if v is not None}

        # חפש לפי טלפון ראשי
        existing_id = phone_to_id.get(phone) if phone else None
        # אם לא נמצא — נסה טלפון שני
        if not existing_id and phone2:
            existing_id = phone_to_id.get(phone2)

        try:
            if existing_id:
                supabase.table('accounts').update(payload).eq('account_id', existing_id).execute()
                updated += 1
            else:
                insert_payload = {**payload, 'account_name': name}
                if phone: insert_payload['phone'] = phone
                supabase.table('accounts').insert(insert_payload).execute()
                inserted += 1
        except Exception as e:
            errors.append({'name': name, 'reason': str(e)})

    print(f"\n=== סיכום ===")
    print(f"עודכנו:  {updated}")
    print(f"נוספו:   {inserted}")
    print(f"שגיאות:  {len(errors)}")
    if errors:
        for e in errors[:10]:
            print(f"  {e['name']}: {e['reason']}")


if __name__ == '__main__':
    main()
