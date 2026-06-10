import sys, io, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import openpyxl
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

EXCEL_PATH = r'C:\Users\Allbi\OneDrive\שולחן העבודה\אנשי קשר לסופרבייס חודש 6 מאוחדים3.xlsx'
ERRORS_PATH = r'C:\Users\Allbi\alldent-crm\import_errors.xlsx'
BATCH_SIZE = 500

def normalize_heb(s):
    if not s or not isinstance(s, str): return ''
    s = s.strip().replace('-', ' ')
    s = re.sub(r"['\"׳״]", '', s)
    s = s.replace('יי', 'י').replace('וו', 'ו')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def get_val(row, col):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return str(v).strip() if str(v).strip() else None

def load_role_lookup(supabase):
    result = supabase.table('dict_roles').select('id,name').execute()
    return {normalize_heb(r['name']): r['id'] for r in result.data}

def load_city_lookup(supabase):
    result = supabase.table('dict_cities').select('id,name,normalized_name,aliases,region_id').execute()
    lookup = {}
    for r in result.data:
        lookup[normalize_heb(r['name'])] = r
        if r.get('normalized_name'):
            lookup[normalize_heb(r['normalized_name'])] = r
        if r.get('aliases'):
            for a in r['aliases']:
                lookup[normalize_heb(a)] = r
    return lookup

def load_region_lookup(supabase):
    result = supabase.table('dict_regions').select('id,name').execute()
    lookup = {normalize_heb(r['name']): r['id'] for r in result.data}
    lookup['ארצי'] = 16
    lookup['כללי'] = 16
    return lookup

ROLE_MAP = {
    'דנטל': ('עובד/ת דנטלי', 'זכר'),
    'מועמדת': ('עובד/ת דנטלי', 'נקבה'),
}

def main():
    if not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_SERVICE_KEY environment variable")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading lookups...")
    role_lookup = load_role_lookup(supabase)
    city_lookup = load_city_lookup(supabase)
    region_lookup = load_region_lookup(supabase)

    # Read only the error rows from the errors file
    err_df = pd.read_excel(ERRORS_PATH)
    error_rows = set(err_df['row'].dropna().astype(int).tolist())
    print(f"  שורות לידים לייבוא: {len(error_rows)}")

    print("Reading Excel...")
    df = pd.read_excel(EXCEL_PATH)
    df.columns = [c.strip() for c in df.columns]

    COL_NAME   = 'שם מלא'
    COL_ROLE   = 'תפקיד'
    COL_CITY   = 'עיר'
    COL_REGION = 'אזור'

    contact_batch = []
    contact_rows_list = []
    inserted = 0
    errors = []

    def flush():
        nonlocal inserted
        if not contact_batch: return
        try:
            supabase.table('contact').insert(contact_batch).execute()
            inserted += len(contact_batch)
        except Exception as e:
            for i, payload in enumerate(contact_batch):
                try:
                    supabase.table('contact').insert(payload).execute()
                    inserted += 1
                except Exception as e2:
                    errors.append({'row': contact_rows_list[i], 'name': payload.get('full_name',''), 'reason': str(e2)})
        contact_batch.clear()
        contact_rows_list.clear()

    print("Processing lead rows...")
    for excel_row_idx, row in df.iterrows():
        excel_row_num = excel_row_idx + 2
        if excel_row_num not in error_rows:
            continue

        name = get_val(row, COL_NAME)
        role = get_val(row, COL_ROLE)
        city = get_val(row, COL_CITY)
        region = get_val(row, COL_REGION)

        if not name:
            continue

        city_id = None
        city_region_id = None
        if city:
            match = city_lookup.get(normalize_heb(city))
            if match:
                city_id = match['id']
                city_region_id = match['region_id']

        region_id = city_region_id
        if region:
            region_norm = normalize_heb(region)
            if 'ארצי' in region_norm or 'כללי' in region_norm:
                region_id = 16
            elif region_norm in region_lookup:
                region_id = region_lookup[region_norm]

        role_id = None
        gender = None
        if role:
            mapped = ROLE_MAP.get(role)
            if mapped:
                role_name_mapped, gender_str = mapped
                role_id = role_lookup.get(normalize_heb(role_name_mapped))
                gender = 1 if gender_str == 'זכר' else 2
            else:
                role_id = role_lookup.get(normalize_heb(role))

        payload = {
            'full_name': name,
            'display_name': name,
            'role': role_id,
            'gender': gender,
            'city_id': city_id,
            'region_id': region_id,
            'check_status': 1,  # ממתין לבדיקה — ליד
        }
        payload = {k: v for k, v in payload.items() if v is not None}
        contact_batch.append(payload)
        contact_rows_list.append(excel_row_num)
        if len(contact_batch) >= BATCH_SIZE:
            flush()
            print(f"  הוכנסו: {inserted}")

    flush()

    print(f"\n=== סיכום ייבוא לידים ===")
    print(f"לידים הוכנסו: {inserted}")
    print(f"שגיאות:       {len(errors)}")
    if errors:
        pd.DataFrame(errors).to_excel(r'C:\Users\Allbi\alldent-crm\import_leads_errors.xlsx', index=False)
        print("קובץ שגיאות: import_leads_errors.xlsx")

    # === תיקון display_name לכל מי שחסר ===
    print("\nמתקן display_name...")
    dn_fixed = 0
    result = supabase.table('contact').select('contact_id,full_name').is_('display_name', 'null').execute()
    rows_to_fix = [r for r in (result.data or []) if r.get('full_name')]
    for i in range(0, len(rows_to_fix), 500):
        batch = rows_to_fix[i:i+500]
        for r in batch:
            supabase.table('contact').update({'display_name': r['full_name']}).eq('contact_id', r['contact_id']).execute()
            dn_fixed += 1
        if dn_fixed % 2000 == 0:
            print(f"  display_name תוקן ל-{dn_fixed}")
    print(f"  display_name תוקן ל-{dn_fixed} רשומות")

    # === נורמליזציה של נייד ===
    print("\nמנרמל מספרי נייד...")
    ph_fixed = 0
    result2 = supabase.table('contact').select('contact_id,phone').is_('phone_norm', 'null').not_.is_('phone', 'null').execute()
    phone_rows = result2.data or []
    for i in range(0, len(phone_rows), 500):
        batch = phone_rows[i:i+500]
        for r in batch:
            norm = _normalize_phone(r.get('phone', ''))
            if norm:
                supabase.table('contact').update({'phone_norm': norm}).eq('contact_id', r['contact_id']).execute()
                ph_fixed += 1
        if ph_fixed % 2000 == 0 and ph_fixed:
            print(f"  נייד נורמל ל-{ph_fixed}")
    print(f"  נייד מנורמל ל-{ph_fixed} רשומות")

    # === rel_contact_profiles — profile_type_id=4 (אנשי קשר) ===
    print("\nמוסיף rel_contact_profiles לכל אנשי הקשר שחסרים (profile_type_id=4)...")
    existing_res = supabase.table('rel_contact_profiles').select('contact_id').eq('profile_type_id', 4).execute()
    existing_ids = {r['contact_id'] for r in (existing_res.data or [])}
    all_contacts_res = supabase.table('contact').select('contact_id').execute()
    all_ids = [r['contact_id'] for r in (all_contacts_res.data or []) if r['contact_id'] not in existing_ids]
    rel_added = 0
    for i in range(0, len(all_ids), 500):
        batch = [{'contact_id': cid, 'profile_type_id': 4} for cid in all_ids[i:i+500]]
        supabase.table('rel_contact_profiles').upsert(batch).execute()
        rel_added += len(batch)
    print(f"  rel_contact_profiles הוסף ל-{rel_added} רשומות")

    print("\n✅ הכל הסתיים בהצלחה")


def _normalize_phone(phone: str) -> str | None:
    """מחזיר מספר בפורמט 972XXXXXXXXX"""
    if not phone:
        return None
    p = re.sub(r'[^\d+]', '', str(phone).strip())
    if not p:
        return None
    # כבר בפורמט בינלאומי
    if p.startswith('972') and len(p) == 12:
        return p
    if p.startswith('+972'):
        p = p[1:]
        if len(p) == 12:
            return p
    # מספר מקומי 05X-XXXXXXX
    if p.startswith('0') and len(p) == 10:
        return '972' + p[1:]
    # 9 ספרות שמתחילות ב-5
    if len(p) == 9 and p.startswith('5'):
        return '972' + p
    return None

if __name__ == '__main__':
    main()
