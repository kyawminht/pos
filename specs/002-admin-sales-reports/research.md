# Research: Admin Sales Reports & Product Management

## R1 — Aggregation location & period semantics

- **Decision**: One SQL RPC `report_period(p_from date, p_to date, p_tz text default 'Asia/Yangon')` returning `jsonb` with `{total_mmk, sale_count, per_day:[{d,total_mmk,n}], per_staff:[{staff_id,name,total_mmk,n}]}`. Day buckets computed as `((s.created_at AT TIME ZONE p_tz)::date)`. Week = Monday..Sunday computed client-side in the shop timezone; month = calendar month.
- **Rationale**: Keeps payload small (one round trip, no full-history download), correct around midnight boundaries, and lets the admin phone/desktop reuse identical math. `sales_created_at_idx` already supports range scans.
- **Alternatives considered**: fetching raw sales and aggregating in JS (bandwidth + correctness risk), materialized daily rollup table (premature at this scale; revisit if tens of thousands of sales/month), Postgres `date_trunc` with server timezone (wrong around Yangon midnight).

## R2 — Admin authorization

- **Decision**: Client `AdminGuard` uses cached `UserSession.role` (from feature 001) and redirects `sale` users to `/`. The new RPCs are `security invoker` and additionally raise `FORBIDDEN` unless `is_admin(auth.uid())` — an active profile with role `admin`. RLS on `sales`/`sale_items`/`products` already grants admins broad read/update.
- **Rationale**: Defense in depth; UI gating alone is bypassable, and RLS alone would allow a sale-role user to read their own rows via the RPC (misleading partial reports).
- **Alternatives considered**: separate admin app/repo (breaks FR-214 one-project rule), JWT custom claims role (needs Auth hooks setup; profiles lookup is fine at this scale).

## R3 — Offline strategy for admin

- **Decision**: Report/sales queries live under `['report', ...]`, `['admin','sales',...]`, `['admin','products']` and are included in the existing IndexedDB persister (`shouldDehydrateQuery` extended). Each cached report renders a freshness badge from `query.dataUpdatedAt` (`"cached, HH:MM"`). The “today” tab, when offline with no same-day cache, shows the offline notice instead of an empty chart. Product edits require connectivity in this scope (queued edits were specced as P3; implementation defers to a follow-up, documented as such).
- **Rationale**: Simple, consistent with feature 001's "cached views, authoritative server" model; prevents silently stale “today” numbers which owners would over-trust.
- **Alternatives considered**: offline queue for admin writes (more surface, low value: price edits happen at a desk), service-worker background sync (Chrome-only).

## R4 — Pending-sync visibility (spec refinement)

- **Decision**: The pending-sales note in admin comes from the **admin device's own** offline queue (`countPending()`), phrased as “this device has N unsynced sales”. Global “any staff device unsynced” cannot be known server-side without staff devices reporting in; the spec's FR-211 intent (explainable gaps) is served by this local statement.
- **Rationale**: Honest UI; avoid implying cloud-wide sync state we cannot know.
- **Alternatives considered**: device heartbeat table (extra infra, privacy overhead) — out of scope.

## R5 — Visual breakdown without a chart library

- **Decision**: `BarBreakdown` renders per-day rows: date label (MM-DD), a proportional bar (`width = day/max*100%`), and the amount right-aligned; 7 rows for week, ~30 compact rows for month (scrollable card). Staff breakdown uses the same component with names.
- **Rationale**: Zero dependencies, perfectly legible on 360px phones, reads like a ledger (professional), scales to desktop columns.
- **Alternatives considered**: Recharts (bundle + maintenance), MUI X charts (license/weight), sparkline canvas (less accessible).

## R6 — Product management model

- **Decision**: `ProductFormDialog` handles add and edit (name / integer MMK price ≥ 1 / optional photo with existing compression + placeholder rules). Deactivate/re-activate = `updateProduct(id, {isActive})`; the staff catalog filters `is_active`, so the item disappears after the next refetch while sale-history snapshots remain intact. RLS update policy (admin OR creator) from feature 001 covers edits.
- **Rationale**: One form, one contract, gesture-consistent with the sale screen's quick price edit. Soft delete preserves historical integrity (snapshot columns already frozen).
- **Alternatives considered**: hard delete (destroys referential intent), separate stock flags (out of scope).

## R7 — History drill-down

- **Decision**: `sales_in_period(p_from, p_to, p_tz, p_limit, p_offset)` returns sale headers (id, created_at, total_mmk, staff name, item count). `sale_detail(p_sale_id)` returns the sale + items using snapshot columns. List paginates 25/page, newest first; detail cached by `['admin','sale',id]`.
- **Rationale**: Avoids N+1 and keeps phone scrolling fast; detail stays read-only.
- **Alternatives considered**: PostgREST embedded selects with joins (fine, but RPC keeps the payload exact and one round trip).

## R8 — Shared app shell (sidebar / bottom nav)

- **Decision**: `AppShell` — desktop (`md+`): fixed 232px left sidebar with brand block, nav items (pos + admin sections), account block at the bottom; content area with max width. Mobile: top bar + bottom navigation (4 items) hidden on `/login`. Sale screen keeps its own compact header content but inside the shell.
- **Rationale**: The requested professional “left sidebar” look on desktop, familiar native-app bottom tabs on phones; a single shell avoids duplicate chrome between sale and admin.
- **Alternatives considered**: admin-only shell (inconsistent app feel), drawer hamburger on desktop (extra click).
