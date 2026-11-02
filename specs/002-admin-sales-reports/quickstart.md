# Quickstart: validate Admin Sales Reports & Product Management

Prereq: feature 001 applied (`0001_init.sql`) and app running; demo admin account seeded (`admin` / `demo-admin-1234`).

## 1. Apply the new migration
Supabase Dashboard → SQL Editor → run `specs/002-admin-sales-reports/contracts/reports.sql` (or `supabase/migrations/0002_admin_reports.sql`).

Sanity checks:
```sql
select public.is_admin(auth.uid());                -- true when signed in as admin
select public.report_period(current_date, current_date);  -- returns totals jsonb with per_day/per_staff
```

## 2. Run
```bash
npm run dev
```
Sign in as `admin` → the shell shows the admin nav; sign in as `sale01` → admin nav hidden and `/admin` redirects to `/`.

## 3. Acceptance walkthrough
| # | Scenario | Expect |
|---|---|---|
| A1 | Admin opens `/admin` | dashboard, today tab selected |
| A2 | Switch to week / month | totals + per-day bar rows update; Monday-start week |
| A3 | Staff breakdown | each staff row with totals for period |
| A4 | Empty period (e.g. month before install) | zero totals + Burmese empty note, no errors |
| A5 | Open history of a period | sales newest-first with date/amount/staff |
| A6 | Open one sale | items with snapshot names/prices; total matches |
| A7 | Rename product, reopen old sale | old sale still shows the captured name/price |
| A8 | Add product (name/price/photo) in admin | appears in admin list + staff catalog after refresh |
| A9 | Edit name/price/photo | saves; staff catalog refreshes; history unchanged |
| A10 | Deactivate product | disappears from staff screen after refresh; staff cart keeps it |
| A11 | Re-activate | returns to staff catalog |
| A12 | Invalid price (0 / text) | Burmese error blocks save |
| A13 | DevTools offline, reopen yesterday/week | cached totals + "cached HH:MM" badge |
| A14 | Offline, open today tab with no cache | Burmese offline notice, not stale numbers |
| A15 | sale-role staff deep-links `/admin/reports` | redirected to sale screen; no admin content flashes |

## 4. Gates
```bash
npm run build
npm run lint
npm run test
```

## Known scope notes
- Pending-sales note counts only the current device’s unsynced queue (see research R4).
- Product edits require connectivity in this scope; queued admin edits remain a documented follow-up.
- No stock/inventory appear anywhere (explicitly out of scope).
