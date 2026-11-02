# Research: Core POS Sales App

Settles every technical unknown from the plan. Each entry is final for this feature unless overridden via a new `/speckit.plan`.

## R1 — Auth approach for fixed credentials

- **Decision**: Supabase Auth (email+password mapped to fixed accounts) + a `profiles` table (id mirrors auth user) carrying `role` and display name. No self-service signup; registration only via SQL seed/admin console.
- **Rationale**: Native Supabase Auth gives session persistence, token refresh, and Sign-off for free; profiles table keeps the app's role/user data queryable with RLS without touching `auth`.
- **Alternatives considered**: custom users table with bcrypt (duplicates token refresh logic), Supabase magic links (requires network, email inbox at login time — poor for shop tablets).

## R2 — Fixed credentials seeding

- **Decision**: Provide `seeds.sql` in `supabase/migrations/` creating demo sale/admin accounts using `auth.admin`-level SQL (`create_user` RPC equivalent) NOT shipped in app code. Real deployment: admin creates accounts in Supabase dashboard using the provided SQL template.
- **Rationale**: Keeps credentials out of client code and satisfies constitution (no hardcoded credential material).
- **Alternatives considered**: hardcoding in `.env` (violates constitution gate); first-login auto-registration (defeats fixed-credentials requirement).

## R3 — Offline strategy

- **Decision**:
  - Catalog (products + image URLs) persisted via TanStack Query `persistQueryClient` with an IndexedDB persister; images cached by the browser cache/HTTP caching (long `max-age` from Supabase Storage). Catalog refresh happens silently in the background when online.
  - Confirm-sale flow: if online → insert via PostgREST (single `insert sale + items` RPC `create_sale`); if offline → append sale to an IndexedDB queue with a client-generated `idempotency_key`; `syncService` flushes after network reconnect with exponential backoff.
- **Rationale**: Query persistence is simplest/most robust for read-heavy catalog; a tiny dedicated queue for writes keeps sale integrity separate from cache invalidation semantics.
- **Alternatives considered**: full local RxDB/PouchDB replication (heavy; Postgres-only supabase doesn't do it natively), service-worker `background sync` event (unreliable outside Chrome; retries inside app are enough).

## R4 — Idempotency for sales sync (zero duplicates)

- **Decision**: `sales.idempotency_key uuid default gen_random_uuid()` unique index; `create_sale` RPC checks `(shop, idempotency_key)` — on conflict returns existing sale instead of error, making HTTP retries harmless. Client sets the key at sale creation time.
- **Rationale**: Network blips cause duplicate submits; server-side uniqueness is the only bulletproof fix.
- **Alternatives considered**: client-side de-dup flags only (lost when storage cleared).

## R5 — Search implementation (1–2 word fragments)

- **Decision**: Client-side filtering over the cached product list: normalized (lowercase, NFKC, trim) substring match across `name`; strip Burmese combining marks for forgiving typing (e.g. drop medials/vowel signts mismatch). Fuzzy prefix on each typed "word" of the fragment.
- **Rationale**: Catalog ≤1000 rows → in-memory match is <50ms, works fully offline, avoids Postgres full-text complexity for Burmese (pg FTS tokenizers don't Burmese-tokenize well).
- **Alternatives considered**: Postgres ILIKE via RPC (needs network; Burmese word boundaries unclear); elastic (out of scope).

## R6 — MMK formatting

- **Decision**: `fmtMMK(n)` using `Intl.NumberFormat('en-US', {maximumFractionDigits: 0})` + ` ကျပ်` suffix; no decimals (MMK is integer currency). Big total in Order summary uses `<formatNumerals: latn>` — Burmese numerals are a possible later toggle (kept in `mmk.ts` as an option).
- **Rationale**: Integer-only avoids floating point/rounding bugs; thousands separator aids readability.

## R7 — Printing abstraction

- **Decision**: `PrinterService` interface with `print(receipt: Receipt): Promise<void>`; two implementations:
  - `WebPrintService` (default): formats receipt into a hidden print-ready DOM node and calls `window.print()`.
  - `BluetoothPrinterService` (stub, not registered): future ESC/POS path. Selection key lives in `services/printerService.ts`.
- **Rationale**: Meets FR-011 spirit; spec stays "print produces receipt" today and Bluetooth later is one file swap.

## R8 — Image handling for add-product

- **Decision**: Client-side canvas downscale to max 1024px long edge, JPEG quality 0.8, before upload to **Supabase Storage** bucket `products` (`products/{uuid}.jpg`); public URL stored in `products.image_url` — Postgres stores only the URL text, never image bytes. Reject anything that can't be read as an image.
- **Rationale**: Raw phone/tablet camera shots are 2–6MB; compressing first protects slow links and keeps the 1GB Storage quota covering ~10,000 compressed photos. Keeping everything in Supabase means one backend (auth-gated, same project as DB), which the shop chose after reviewing R2 (a token-gated Worker needed; kept as optional documented alternative in `cloudflare/README.md`). DB storing bytes was rejected outright — it would exhaust DB quota in minutes.
- **Alternatives considered**: server-side transform via edge functions (extra latency/cost), no transform (network hog), Cloudflare R2 (10GB free but extra moving part; kept in `cloudflare/` for future growth), storing bytes in Postgres (rejected).

## R9 — State for the current order

- **Decision**: `zustand` store persisted to localStorage (`order` + per-item snapshot incl. `product_id` fallback). TanStack Query for server-state only. Clearing cart asks `ConfirmDialog`.
- **Rationale**: Mini store is simpler than wiring a server cache for local-only mutation; survives reloads (FR-016).
- **Alternatives considered**: React context + reducer (more boilerplate); keep cart inside TanStack Query cache (cache may evict, risking lost order).

## R10 — Routing & admin future-proofing

- **Decision**: `react-router-dom` v6 with `AuthLayout`; `RequireAuth` wrapper; future `/admin/*` guards via `RequireAdmin` reading `profiles.role`. Admin feature will reuse the same `QueryClient` + theme.
- **Rationale**: User confirmed protected `/admin` in the same SPA; routing must not paint us into a corner now.

## R11 — Connectivity indicator

- **Decision**: `navigator.onLine` + `online/offline` window events, plus a lightweight `HEAD` request to Supabase on interval (30s) when online to catch captive-portal lies. `useNetworkStatus` exposes `{isOnline, pendingSales}` for the sticky widget.
- **Rationale**: Pure `navigator.onLine` misses hotspot-without-internet cases; pending count reassures the salesperson.

## R12 — Theme & typography for low-literacy users

- **Decision**: MUI theme overrides: `fontSize` base 18-20px; buttons min-height 64px; Burmese font "Padauk" (falls back to "Noto Sans Myanmar", system `Myanmar Text`); color tokens: green = confirm/actions, red = destructive/back, amber = pending; icon + color paired with every label. Skeleton loader uses shimmer on grid.
- **Rationale**: Constitution mandates easy UI for low-literacy staff; these concrete tokens make it enforceable and testable.

## R13 — Testing approach

- **Decision**: Vitest + React Testing Library; unit tests for `mmk`, queue idempotency, search filter; integration test for sale flow with mocked `supabase-js`. `npm run build` + `npm run lint` remain the hard gates per constitution.
- **Rationale**: Balances confidence against a solo/small team shipping speed; heavy E2E (Playwright) deferred.
