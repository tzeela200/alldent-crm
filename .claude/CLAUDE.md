# ALLDENT — Project Operating Contract

## Current phase

The current priority is stabilization, bug investigation, flow verification,
regression prevention, and safe incremental repair of the existing ALLDENT
system.

This is not a rewrite project.

Do not replace the existing operational core. Preserve and improve it.

## Sources of truth

Use this order of authority:

1. Live Supabase is the source of truth for:
   - schema
   - tables
   - columns
   - relationships
   - data
   - views
   - RLS
   - policies
   - functions
   - triggers
   - RPCs
   - Edge Functions
   - Storage configuration

2. The active repository, active branch, current commit, and running
   application are the source of truth for the implemented frontend and
   application behavior.

3. Runtime evidence is authoritative:
   - browser behavior
   - Console
   - Network
   - API responses
   - database state before and after an action
   - logs

4. Historical project files provide context and must be verified:
   - MEMORY_DUMP.md
   - HISTORY_AUDIT.md
   - SECURITY_LOG.md
   - audit_report.txt
   - project-audit.txt
   - docs/plans
   - Git history
   - previous agent reports

5. Old specifications, mock applications, dream-project folders, screenshots,
   and legacy UI are inspiration only. They are not evidence of current
   implementation, database structure, permissions, or correct flow.

Do not assume a ZIP snapshot is the newest repository state.

Do not assume a previous report is still correct.

Do not assume a success message proves that data was saved.

## Core entities

The current operational core includes:

- contact
- accounts
- job
- applications
- live dict_* tables and relation tables

Do not replace these entities as part of a bug fix.

Do not create duplicate core entities without a separately approved
architecture decision.

Do not invent status values. Verify live dict_* values and all consumers.

## Evidence-first rule

A hypothesis may guide an investigation, but it must be labeled as a
hypothesis.

A hypothesis is not a finding.

Before recommending a final fix, collect evidence from:

- the active code path
- runtime behavior
- Supabase
- permissions and RLS
- functions, triggers, views, and RPCs
- history and previous changes
- every known consumer of the affected field, function, or table

When evidence is incomplete, stop and state what is missing.

When sources conflict, show the conflict and do not guess.

## Default permission model

Default mode:

- inspect
- reproduce
- diagnose
- report
- prepare a proposed fix
- prepare acceptance tests
- prepare regression tests

Default mode does not authorize changes.

Separate explicit approvals are required for:

1. Code changes
2. Supabase/schema/RLS/function/trigger changes
3. Production data corrections

A general response such as "yes", "okay", or "continue" is not sufficient
approval for a database or production-data change.

## Required approval phrases

Code approval:

מאשרת תיקון קוד עבור INC-XXXX לפי התוכנית שהוצגה.

Supabase approval:

מאשרת שינוי Supabase עבור INC-XXXX לפי ה-Migration שהוצג.

Production data approval:

מאשרת תיקון נתונים עבור INC-XXXX בטבלה ובמספר הרשומות שהוצגו.

Approval for one category does not authorize another category.

## Incident workflow

Work on one incident or one user flow at a time:

1. Establish the active baseline.
2. Reproduce.
3. Trace the complete flow.
4. Collect evidence.
5. Prove the root cause.
6. Assess impact and risk.
7. Propose the smallest safe change.
8. Obtain explicit approval.
9. Implement atomically.
10. Run acceptance and regression tests.
11. Verify the result in Supabase.
12. Update documentation and project memory.

## Safety rules

Never:

- expose secrets, tokens, service-role keys, passwords, or personal data
- use service role to bypass a permission defect
- weaken RLS merely to make a UI action work
- perform destructive SQL without explicit approval, preview, and rollback
- perform direct production schema changes without an approved Migration
- close an incident with "seems fixed" or "probably works"
- mix unrelated refactoring into a bug fix
- rewrite a working module because a local fix is inconvenient

Before any approved change, verify:

- active repository
- branch
- commit
- working-tree state
- connected environment
- connected Supabase project
- backup or rollback requirement

## Completion language

A repair may be closed only as:

"תוקן ואומת על בסיס הראיות, בדיקות הקבלה, הרגרסיה ואימות Supabase."

Otherwise:

"האירוע אינו סגור. החסם שנותר הוא: ..."
