# Tasks: Core POS Sales App

**Input**: Design documents from `/specs/001-core-pos-sales/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Vitest unit/integration tests included per plan.md (R13) — unit Gates (mmk, cart, queue, search) + build/lint hard gates.

**Organization**: Grouped by user story; every story independently implementable/testable after Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on incomplete tasks
- **[Story]**: US1…US6 per spec.md

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Install dependencies per plan.md (react-router-dom v6, zustand, @mui/material, @emotion/react, @emotion/styled, @supabase/supabase-js, @tanstack/react-query, @tanstack/react-query-persist-client, @vitest covers via vitest, @testing-library/react, @testing-library/jest-dom, vite-plugin-pwa, padauk/noto-sans-myanmar fontsource) in package.json
- [X] T002 Configure Vitest in vite.config.ts (`test` block: jsdom environment, setupFiles, path aliases) + add `npm run test` script
- [X] T003 [P] Add `.env.example` keys to `src/` loader wiring: create `src/env.ts` reading VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY with typed exports (fail-fast at build in prod)
- [X] T004 [P] Commit Supabase schema by copying `specs/001-core-pos-sales/contracts/schema.sql` to `supabase/migrations/0001_init.sql` (verbatim; source of truth stays contracts/schema.sql)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [X] T005 Create domain types in `src/types/domain.ts` (Product, SaleItem, Sale, UserSession, SaleReceipt, PendingSaleRecord, CartItem — exact shapes from contracts/products.api.md, sales.api.md, auth.api.md; snapshot fields: product_name_snapshot, image_url_snapshot; constraints: price_mmk integer ≥ 1, qty ≥ 1)
- [X] T006 Create Burmese labels module `src/data/labels.mm.ts` — every UI string used by all stories (login, sale screen, search, cart, summary, add-product, sync, errors mapped per contract files: INVALID_CREDENTIALS, NETWORK_ERROR, PERMISSION_DENIED, PRICE_INVALID, NAME_REQUIRED, IMAGE_UNREADABLE, IMAGE_TOO_LARGE, TOTAL_MISMATCH, EMPTY_SALE + confirm dialogs, offline pending, no-results). NO English visible text.
- [X] T007 Create MUI theme `src/theme.ts` per plan.md R12: Burmese font stack (Padauk → Noto Sans Myanmar → Myanmar Text → sans-serif), base font 18-20px, buttons min-height 64px, color tokens (green=confirm, red=destructive, amber=pending), high contrast
- [X] T008 Create MMK util `src/utils/mmk.ts` (`fmtMMK(n)` = Intl.NumberFormat('en-US') integer + ` ကျပ်`; `computeTotal(items)` sum of lineTotalMmk; zero-decimal) + unit tests in `src/tests/unit/mmk.test.ts`
- [X] T009 Implement Supabase client `src/services/supabaseClient.ts` (from src/env.ts; exports `supabase`; graceful `isConfigured` flag for offline dev smoke mode) 
- [X] T010 Implement offline store `src/db/offlineStore.ts` (IndexedDB via idb-keyval-style minimal wrapper in-file): TanStack query persistence key + generic KV; plus `src/db/queueAdapter.ts` (typed enqueue/dequeue/listPending/updateState over PendingSaleRecord, key=idempotencyKey, states pending→syncing→done/failed, attempts≤5)
- [X] T011 Implement cart store `src/state/useCartStore.ts` (zustand + persist to localStorage): addItem (same productId+unitPrice → qty++ per FR-005), setQty, removeItem, clear (pass through ConfirmDialog at page level), snapshot fields captured at add-time per data-model.md; survives reload per FR-016 + unit tests `src/tests/unit/cartStore.test.ts`
- [X] T012 Install app shell `src/main.tsx` + `src/App.tsx`: QueryClient with persistQueryClient-persisted IndexedDB persister (offline catalog per FR-008), ThemeProvider (T007), BrowserRouter from `src/router.tsx` (paths: /login, /sale, /order; RequireAuth wrapper reading authService session, redirect /login; JSX routes only — admin routes deferred to later feature but guard hook left in place)
- [X] T013 Create shared components: `src/components/ConfirmDialog.tsx` (two large buttons ✅/❌, Burmese labels), `src/components/ImageTile.tsx` (onError → `public/placeholder.png`, lazy load), `src/components/CartButton.tsx` (sticky widget: count + running fmtMMK total, navigates to /order), `src/components/EmptyResults.tsx` (no-results Burmese copy + add-item shortcut button)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Login with fixed credentials (P1) 🎯 MVP

**Goal**: Only staff can sell; session persists across restarts and offline.

**Independent Test**: Launch app → login sale01 → sale screen → reload → still signed in → airplane mode → still usable.

### Implementation for User Story 1

- [X] T014 [US1] Implement auth service `src/services/authService.ts` per contracts/auth.api.md (login maps `{username}@pos.local` → signInWithPassword, fetch profile row, block is_active=false, cache session via offlineStore KV, getSession cached-first, logout clears session but NOT sale queue, sessionChanges)
- [X] T015 [US1] Build `src/pages/LoginPage.tsx`: username+password fields, giant Sign-in button (T007 theme), Burmese errors for INVALID_CREDENTIALS / NETWORK_ERROR / PERMISSION_DENIED per FR-002; 3-failure Burmese hint; on success navigate /sale
- [X] T016 [US1] Wire RequireAuth in `src/router.tsx`: no session → redirect /login (already scaffolded in T012, this completes the enforcement + test with signed-out render)

**Checkpoint**: US1 independently functional.

---

## Phase 4: User Story 2 — Pick products from sale screen (P1)

**Goal**: Tap-to-add grid with images, MMK prices, qty merge, live total.

**Independent Test**: Tap products → quantity merges + total correct per FR-005/FR-004.

### Implementation for User Story 2

- [X] T017 [US2] Implement product service `src/services/productService.ts` per contracts/products.api.md (listActive via supabase query; searchLocal client-side filter w/ Burmese combining-mark strip + normalized substring per research R5)
- [X] T018 [US2] Build `src/pages/SaleScreen.tsx`: product grid of tappable MUI Cards (ImageTile + price in fmtMMK, ≥64px targets), uses `useQuery(['products','active'])`; tap → useCartStore.addItem; sticky top search bar slot (US3) + sticky CartButton
- [X] T019 [US2] Add network indicator widget `src/hooks/useNetworkStatus.ts` (navigator.onLine + events + 30s HEAD ping; exposes isOnline) + pending badge (from useSyncQueue, default 0) rendering from labels

**Checkpoint**: US2 independently functional (grid works offline from persisted cache).

---

## Phase 5: User Story 3 — Search 1–2 words (P1)

**Goal**: Fast fragment search + Burmese empty state + add shortcut.

**Independent Test**: type 1–2 word fragment → matches <1s; clear → grid; no match → EmptyResults.

### Implementation for User Story 3

- [X] T020 [US3] Search implemented inside `src/pages/SaleScreen.tsx` sticky search bar (deviation: no separate SearchOverlay file — the in-screen filter delivers the same UX per FR-006): filters cached products, EmptyResults zero-state with add-item nav, clear restores grid; results immediately addable via useCartStore.addItem
- [X] T021 [US3] Unit tests `src/tests/unit/search.test.ts`: fragment match, Burmese combining-mark tolerance, empty query returns []

**Checkpoint**: US3 independently functional.

---

## Phase 6: User Story 4 — Order summary, confirm, print (P1)

**Goal**: Review order, adjust/remove, prominent total, confirm records sale, print receipt.

**Independent Test**: adjust qtys → total updates; empty cart disables confirm/print (FR-012); confirm → sale recorded (or queued offline); print → receipt.

### Implementation for User Story 4

- [X] T022 [US4] Implement printer abstraction `src/services/printerService.ts`: `PrinterService` interface `print(receipt: SaleReceipt)` (contracts/sales.api.md); `WebPrintService` builds hidden print-ready DOM from receipt (Burmese font, item list, fmtMMK total) → window.print(); `BluetoothPrinterService` exported stub (not registered) per research R7; `buildReceipt(order, profile)` pure function here
- [X] T023 [US4] Implement sale service `src/services/saleService.ts` per contracts/sales.api.md: confirmSale → online via RPC `create_sale` (idempotencyKey from `src/utils/idempotency.ts`), offline → queueAdapter.enqueue + return offline=true; getPendingCount; server error codes mapped to Burmese labels
- [X] T024 [US4] Build `src/pages/OrderSummaryPage.tsx`: items list (nameSnapshot, imageSnapshot thumb, qty stepper ≥1, remove), grand total in huge fmtMMK, confirm button raises ConfirmDialog (labels EMPTY_SALE prevention): enabled only when items>0; print button (same guard) calls printerService.print(buildReceipt(...)); on confirm show success toast (labels), navigate /sale, clear cart ONLY after confirmSale resolved (queued offline counts as success)
- [X] T025 [US4] Integration test `src/tests/integration/saleFlow.test.ts` (mocked supabase-js): happy-path confirm posts RPC with recomputed total; empty cart blocked; offline path enqueues

**Checkpoint**: US1–US4 all functional → MVP sellable end-to-end.

---

## Phase 7: User Story 5 — Add a new product (P2)

**Goal**: Staff adds product (name, MMK price, photo) → instantly in catalog.

**Independent Test**: fill form + photo → appears in grid & search; invalid price blocked (FR-013).

### Implementation for User Story 5

- [X] T026 [P] [US5] Implement image utils `src/utils/imageUtils.ts` per research R8 (canvas downscale ≤1024px long edge, JPEG 0.8, readable-format guard) + unit test `src/tests/unit/imageUtils.test.ts`
- [X] T027 [US5] Extend `src/services/productService.ts` with `create(input)` per contracts/products.api.md (compress → Storage `products/{uuid}.jpg` public URL → insert with created_by=auth.uid(); error codes NAME_REQUIRED/PRICE_INVALID/IMAGE_TOO_LARGE/NETWORK_ERROR)
- [X] T028 [US5] Build `src/pages/AddProductPage.tsx` (+ route in router.tsx): name field, price stepper/input (integer ≥1 enforced client-side per contracts), camera/gallery image attach preview, giant save button, big Burmese error surface; on success invalidate `['products','active']` and navigate back

**Checkpoint**: US5 independently functional.

---

## Phase 8: User Story 6 — Sync offline sales (P2)

**Goal**: Queued sales auto-uploaded once, backoff retries, visible pending state.

**Independent Test**: sell offline → reconnect → exactly one new sales row; indicator clears (FR-010/S3).

### Implementation for User Story 6

- [X] T029 [US6] Implement sync service `src/services/syncService.ts` per contracts/sales.api.md: flushQueue (oldest-first RPC per record; success → state done w/ syncedAt; duplicate=true marks record done; failure attempts++ re-enqueue; ≥5 → failed); triggers: online event, app start, 30s interval when pending>0; backoff 5s/15s/60s; purge done records >7 days; expose getPendingCount subscription
- [X] T030 [US6] Implement `src/hooks/useSyncQueue.ts`: react-adapter over syncService + useNetworkStatus → {pendingCount, isOnline, state} consumed by T019 badge and OrderSummary offline notes (labels pending copy)
- [X] T031 [US6] Unit test `src/tests/unit/syncQueue.test.ts` (mock queueAdapter + supabase): once-only via idempotency duplicate path, backoff attempts, failed state, reconnect flush

**Checkpoint**: All six stories functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T032 [P] PWA wiring in `vite.config.ts`: vite-plugin-pwa with offline precache of app shell + runtime-caching for Storage image URLs (long max-age per R3) so reload works offline (FR-016)
- [X] T033 [P] Verify whole-app Burmese-only copy: grep UI sources for un-tracked English strings; fix via `src/data/labels.mm.ts` (SC-005)
- [X] T034 Edge-case hardening pass per spec: deactivated product in cart safety (cart keeps snapshot; no crash in SaleScreen), oversized/absurd qty guard input clamps, network drop mid-confirm mid-write, page-reload mid-sync (queue state integrity)
- [X] T035 Run `npm run build` + `npm run lint` + `npm run test` — all green (constitution gates)
- [ ] T036 Execute `specs/001-core-pos-sales/quickstart.md` scenario table S1–S10 manually on dev server (incl. DevTools offline replay); record results in checklist file `specs/001-core-pos-sales/checklists/requirements.md` Notes — PENDING: requires a configured Supabase backend (apply `contracts/schema.sql` first); dev server smoke test without backend passed

---

## Dependencies & Execution Order

### Phase Dependencies
- Phase 1 Setup → Phase 2 Foundational → stories in order (US1→US2→US3→US4 → MVP; then US5/US6 in parallel) → Polish.
- US3 depends on US2's SaleScreen+productService; US4 depends on US2 cart + US1 session; US6 depends on US4 queue enqueue; US5 depends on Foundational + authService (created routes).

### Within Stories
Services before pages; store/db before services; pages consume services only via TanStack Query hooks/legacy service exports (no supabase-js imports in components).

### Parallel Opportunities
- T003, T004 (Setup) run parallel.
- T026 (US5 image utils) parallel anytime after Phase 2.
- After Phase 6 MVP: US5 and US6 phases run fully parallel.
- [P] tests inside same story (T021 with T020; T031 with T029).

---

## Implementation Strategy

1. **MVP = Phases 1–6 (US1–US4)**: a signed-in salesperson can browse/search, build an order, confirm, and print — including online-offline capture. STOP and validate with quickstart S1–S9 before US5/US6.
2. Then US5 (catalog self-service) and US6 (durable sync) — independent tracks.
3. Polish phase hardens edge cases + gates before feature is called done.

## Notes
- Commit after each checkpoint.
- Contracts at `contracts/*.api.md` + `contracts/schema.sql` are authoritative; any change = same-commit update.
- Hold the no-English, ≥64px, fmtMMK-everywhere rules in code review.
