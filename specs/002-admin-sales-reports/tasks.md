# Tasks: Admin Sales Reports & Product Management

**Input**: Design documents from `/specs/002-admin-sales-reports/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included where they protect shared logic (period math, guard, cache eligibility); manual acceptance in quickstart A1–A15.

**Organization**: Grouped by user story (US1–US5), each independently testable after Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on incomplete tasks
- **[Story]**: US1…US5

---

## Phase 1: Setup

- [X] T001 Copy `specs/002-admin-sales-reports/contracts/reports.sql` to `supabase/migrations/0002_admin_reports.sql` verbatim (verify idempotent `create or replace` functions + grants present)
- [X] T002 [P] Add read-model types to `src/types/domain.ts`: `PeriodReport` (from/to/tz/totalMmk/saleCount/perDay[{d,totalMmk,count}]/perStaff[{staffId,name,totalMmk,count}]), `SaleHeader` (id/createdAt/totalMmk/completedByName/itemCount), `SaleDetail` (id/createdAt/totalMmk/status/completedByName/items[{id,productId,nameSnapshot,imageSnapshot,qty,unitPriceMmk,lineTotalMmk}])
- [X] T003 [P] Extend `src/data/labels.mm.ts` with Burmese admin keys: nav (ရောင်းချမှု/အရောင်း/ပစ္စည်းများ), report tabs (ယနေ့/ယခုအပတ်/ယခုလ), totals, saleCount, perDay, perStaff, breakdown, cached badge template `cachedAt(hhmm)`, offlineReportNotice (operator decides), history titles, item list, product management (add/edit/deactivate/reactivate/active/inactive), empty states. No English.

---

## Phase 2: Foundational (blocking)

- [X] T004 Create `src/layout/navConfig.ts`: nav items [{ to:'/', label:LB.products, icon:null }, { to:'/admin', label:LB.reports, roles:['admin'] }, { to:'/admin/products', label:LB.adminProducts, roles:['admin'] }] with `visibleFor(role)` helper
- [X] T005 Build `src/layout/AppShell.tsx` (research R8): desktop `md+` fixed 232px left sidebar (brand block, nav list using navConfig, account+signOut at bottom); mobile top bar + bottom nav (max 4 items); renders `<Outlet/>`/children; hides chrome on `/login`
- [X] T006 Build `src/layout/AdminGuard.tsx`: reads session via `getSession()`; while loading spinner; non-admin or signed-out → `<Navigate to="/login" replace/>` (signed out) or `<Navigate to="/" replace/>` (sale role) per FR-201
- [X] T007 Restructure `src/router.tsx`: routes `/`, `/order`, `/add-product` inside `AppShell`; add `/admin` → `AdminGuard` + `AppShell` with children `/admin` (dashboard), `/admin/sales`, `/admin/sales/:id`, `/admin/products`; `/login` remains bare
- [X] T008 Implement `src/hooks/usePeriod.ts`: `SHOP_TZ='Asia/Yangon'`; returns `{key:'day'|'week'|'month', from, to}` with local-tz today; week Monday→today; month 1st→today; pure helper `rangeFor(key, now)` exported for tests
- [X] T009 Implement `src/services/reportsService.ts` per contracts/reports.api.md: `reportPeriod(from,to)`, `salesInPeriod(from,to,page)` (limit 25, offset), `saleDetail(id)` using `supabase.rpc`; map `FORBIDDEN`→PERMISSION_DENIED, other→NETWORK_ERROR; export query keys `reportKey/salesKey/saleKey`
- [X] T010 Extend `src/services/productService.ts`: `updateProduct(id, patch)` via RPC `admin_update_product` and `setActive(id,isActive)` sugar; mirror updates on `FIXTURE` in smoke mode; reuse validation codes NAME_REQUIRED/PRICE_INVALID/PERMISSION_DENIED (contracts/products-admin.api.md)
- [X] T011 Extend persister `dehydrateOptions.shouldDehydrateQuery` in `src/App.tsx` to also persist query keys starting `report` and `admin` (offline cached views, research R3)

**Checkpoint**: Shell + guard + services compile; app still passes existing tests.

---

## Phase 3: User Story 1 — Admin-only protected area (P1)

**Goal**: Only active admins reach `/admin*`; sale staff never see admin nav or content.

**Independent Test**: Sign in as admin → dashboard renders; as `sale01` → `/admin` redirects to `/` with no admin nav; signed-out → `/login`, then lands on intended admin page.

- [X] T012 [US1] Build `src/admin/AdminDashboardPage.tsx` minimal guarded page skeleton (title + placeholder content) so guard wiring is verifiable before reports exist
- [X] T013 [US1] Hide admin nav for non-admins in `src/layout/AppShell.tsx` (navConfig roles) and confirm deep-link path through `AdminGuard` (no admin content flash — guard blocks render)
- [X] T014 [P] [US1] Unit test `src/tests/unit/adminGuard.test.ts`: role 'sale' → redirect target `/`; no session → `/login`; role 'admin' → renders children

**Checkpoint**: US1 independently testable.

---

## Phase 4: User Story 2 — Daily / weekly / monthly reports (P1)

**Goal**: The dashboard shows MMK totals, sale counts, per-day bars, and per-staff breakdown for the selected period; works phone-first and widens on desktop.

**Independent Test**: After N recorded sales, day total equals their sum and count; week (Monday-start) and month views include those days with correct per-day rows; empty period shows zeros with Burmese note.

- [X] T015 [P] [US2] Build `src/components/PeriodTabs.tsx` (three tabs: day/week/month from labels; controlled `value/onChange`)
- [X] T016 [P] [US2] Build `src/components/BarBreakdown.tsx` (research R5): rows of `{label, amount, count?}`, bar width = amount/max*100%, right-aligned `fmtMMK`, scrollable when >8 rows
- [X] T017 [US2] Build `src/admin/AdminDashboardPage.tsx` full: `usePeriod` + `useQuery(reportKey)` → summary card (total, sale count), BarBreakdown per-day, staff breakdown, PeriodTabs, refresh action; loading/error/zero-data Burmese states; desktop 2-column (chart | staff) on `md+`
- [X] T018 [US2] Wire dashboard route `/admin` (T007 placeholder → real page) and link "view sales" button to `/admin/sales?from=..&to=..`
- [X] T019 [P] [US2] Unit test `src/tests/unit/reports.test.ts`: `rangeFor('week')` starts Monday and ends today; month starts on the 1st; day = today; `fmtMMK` totals formatting used by summary

**Checkpoint**: US2 independently functional (reads via RPC once migration applied).

---

## Phase 5: User Story 3 — Sales history drill-down (P2)

**Goal**: Period sales list (newest first, paginated) and itemized detail using frozen snapshots.

**Independent Test**: Open a sale from history; items/quantities/prices match the recorded sale and are unchanged after a product rename/price change.

- [X] T020 [US3] Build `src/admin/AdminSalesListPage.tsx`: reads `from/to` from URL search params (fallback `usePeriod('day')`); `useInfiniteQuery`-style paging via `salesInPeriod(page)` with "load more" (25/page); rows show date/time, staff, item count, `fmtMMK(total)`; tap → `/admin/sales/:id`
- [X] T021 [US3] Build `src/admin/AdminSaleDetailPage.tsx`: `saleDetail(id)` query; header (date, staff, status), item rows (snapshot name, qty × unit price, line total), grand total; read-only (no edits)
- [X] T022 [US3] Confirm routes `/admin/sales` + `/admin/sales/:id` render inside `AdminGuard`+`AppShell`; back navigation returns to list preserving period params

**Checkpoint**: US3 independently functional.

---

## Phase 6: User Story 4 — Admin product management (P2)

**Goal**: Add/edit products (name, MMK price ≥ 1, photo) and deactivate/reactivate; staff catalog reflects changes after refresh; history untouched.

**Independent Test**: Add a product → appears in admin list and staff catalog; edit price/name/photo → saves; deactivate → hidden from staff catalog after staff refresh while staff carts keep snapshots; re-activate restores.

- [X] T023 [P] [US4] Build `src/components/ProductFormDialog.tsx` shared add/edit: fields name + price (integer 1..9,999,999,999) + optional photo (reuse `compressImage` + `uploadProductImage`/Supabase Storage path from 001); Burmese inline errors NAME_REQUIRED/PRICE_INVALID; on save calls `createProduct`/`updateProduct` and invalidates `['products']` + `['admin','products']`
- [X] T024 [US4] Build `src/admin/AdminProductsPage.tsx`: table/list of all products (active + inactive) with name, price, status chip, small thumbnail; actions edit (dialog), deactivate/reactivate (`setActive`); add-product button; search box filtering locally; empty state
- [X] T025 [US4] Wire `/admin/products` route and keep the sale screen's quick price edit working (now backed by `updateProduct` too)

**Checkpoint**: US4 independently functional.

---

## Phase 7: User Story 5 — Offline-tolerant admin (P3)

**Goal**: Past periods render from cache with a freshness badge; "today" shows an offline notice instead of stale numbers; device-local pending-sync note.

**Independent Test**: Load reports online → go offline → reopen yesterday/week views (cached totals + `cached HH:MM` badge) → open today with no cache (Burmese offline notice); pending note reflects this device's queue only.

- [X] T026 [P] [US5] Build `src/components/FreshnessBadge.tsx`: shows `LB.cachedAt(HH:MM)` derived from `query.dataUpdatedAt` when `!isOnline` or data older than 5 min; hidden when fresh online
- [X] T027 [US5] Integrate FreshnessBadge into dashboard + sales list; today tab offline-without-cache → `LB.offlineReportNotice`; add device pending note via `useSyncQueue().pendingCount` phrasing as this-device (research R4)
- [X] T028 [P] [US5] Unit test `src/tests/unit/cacheEligibility.test.ts`: dehydrate predicate returns true for `['report',...]` and `['admin',...]`, false for cart/ephemeral keys

**Checkpoint**: US5 independently functional.

---

## Phase 8: Polish & Cross-Cutting

- [X] T029 Burmese copy sweep of `src/admin/*` + `src/layout/*`: no English visible strings; verify nav labels, badges, errors use `labels.mm.ts` (SC-205)
- [X] T030 Responsive QA pass: 360px phone (bottom nav, single column), 768px tablet, 1280px desktop (sidebar + two-column dashboard); no horizontal scroll
- [X] T031 Run `npm run build` + `npm run lint` + `npm run test` — all green (constitution gates)
- [ ] T032 Validate quickstart A1–A15 against a configured Supabase (apply `0002_admin_reports.sql`); record results in `specs/002-admin-sales-reports/checklists/requirements.md` Notes — PENDING backend availability (smoke-mode UI review of reports/products done instead)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US1 (guard/shell) unblocks US2–US5.
- US2 needs T008/T009/T011; US3 needs T009; US4 needs T010; US5 needs T011 + T009.
- T015/T016 (components) can run parallel with T008/T009; T019/T028 tests are parallel-safe.
- Route wiring (T018, T022, T025) depends on its page existing; keep sequential within a story.

### Parallel examples
- Phase 4: `PeriodTabs` (T015) + `BarBreakdown` (T016) + `reports.test.ts` (T019) in parallel.
- Phase 6: `ProductFormDialog` (T023) parallel with dashboard polish; `AdminProductsPage` (T024) after T010.
- Phase 7: `FreshnessBadge` (T026) parallel with cache test (T028).

---

## Implementation Strategy

1. **MVP = US1 + US2** (Phases 1–4): an owner can sign in as admin on a phone/desktop and see daily/weekly/monthly MMK totals with breakdowns. Ship/validate that first.
2. Then US3 (trust via drill-down) and US4 (catalog management) — independent increments.
3. US5 offline layer + polish last; gates before "done".

## Notes
- Backend prerequisite: `0002_admin_reports.sql` applied in Supabase; report tests remain pending until then (T032 documented).
- Smoke mode (no env): report RPCs unavailable — dashboard should surface the Burmese offline/error notice cleanly; product admin uses fixture mutations so UI can be reviewed.
- Update `contracts/*.md` in the same commit as any signature change.
