# Implementation Plan: Core POS Sales App

**Branch**: `001-core-pos-sales` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-pos-sales/spec.md`

## Summary

Tablet-first Burmese POS for a construction shop: fixed-credential login, big-tap product grid with images and MMK prices, 1–2 word search, order summary with confirm + receipt print (printer abstraction for a future Bluetooth printer), and offline capture with once-only sync. Built as a React + TypeScript Vite SPA using MUI for a large, icon-heavy UI; TanStack Query with persistence for offline product data; Supabase (Postgres + Auth + Storage) as backend; SQL migrations generated in `supabase/migrations/`. Sales made offline are queued locally and synced idempotently.

## Technical Context

**Language/Version**: TypeScript 5.5+ on React 18, built with Vite 5

**Primary Dependencies**: MUI (Material UI) v5/6, TanStack Query v5 + `@tanstack/react-query-persist-client` (IndexedDB persistence), `@supabase/supabase-js` v2, vite-plugin-pwa (service worker), `@fontsource/noto-sans-myanmar` or Padauk for Burmese text

**Storage**: Supabase Postgres (products, sales, sale_items, profiles); browser IndexedDB/localStorage for persisted query cache, order state, offline sale queue, and auth session

**Testing**: Vitest + React Testing Library; build/lint as quality gates (`npm run build`, `npm run lint`)

**Target Platform**: Modern mobile/tablet browsers (Chrome-based, tablet-sized ~800×1280), desktop browsers for support; installable PWA on the shop tablet

**Project Type**: Single SPA (web app); admin section lives in the same SPA later as protected routes (`/admin`) — not in this feature's scope except that routing/auth store must not preclude it

**Performance Goals**: Product grid renders 100+ cards smoothly (<300ms); local search responds <1s (typically <50ms from IndexedDB); sale confirm writes locally <200ms

**Constraints**: Fully offline-capable (browse, search, checkout); zero lost/duplicate sales; all UI copy in Burmese; min 64×64px touch targets; works on mid-range Android tablets

**Scale/Scope**: ~100–1000 products, 1–10 salespeople, one active order per device; ~6 screens (login, sale grid, search results, order summary, add product, sync indicator is a widget)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| React 18 + TS + Vite | PASS | matches repo scaffold |
| TanStack Query for API + caching + offline persistence | PASS | persist-client + IndexedDB persister planned |
| MUI for UI | PASS | large touch target overrides via theme |
| Supabase backend with agent-generated SQL in `supabase/migrations/` | PASS | `contracts/schema.sql` will be the source |
| Offline support (catalog + sales + queue sync) | PASS | local queue with idempotency key |
| All UI text in Burmese via labels module | PASS | `src/data/labels.mm.ts`; lint rule deferred, checked in review |
| MMK formatting util used everywhere | PASS | `src/utils/mmk.ts` |
| Printer behind `PrinterService` interface | PASS | escalation point: `window.print` now, Bluetooth later |
| Login with fixed credéntials, seeded accounts | PASS | Supabase Auth + seeded `profiles` |
| Secrets via `.env` only | PASS | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

## Project Structure

### Documentation (this feature)

```text
specs/001-core-pos-sales/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── schema.sql       # Supabase SQL: tables, RLS, triggers, seeds
│   ├── products.api.md  # DB access contract for products
│   ├── sales.api.md     # DB access contract for sales + sync
│   └── auth.api.md      # Auth/session contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
.env.example
index.html                         # <html lang="my">, v1: app root mounts here
public/
├── placeholder.png                # image placeholder for broken/missing images
src/
├── main.tsx                       # app entry; mounts React root
├── App.tsx                        # root; sets up providers (QueryClient, Theme, Router)
├── theme.ts                       # MUI theme: Burmese font, large touch targets, high contrast
├── data/
│   └── labels.mm.ts               # ALL Burmese UI strings (single source)
├── types/
│   └── domain.ts                  # Product, Sale, SaleItem, UserSession types
├── utils/
│   ├── mmk.ts                     # MMK formatting (123,450), totals
│   ├── idempotency.ts             # uuid master key generator
│   └── imageUtils.ts              # client-side downscale/compress of added product images
├── components/
│   ├── CartButton.tsx             # sticky cart summary widget with count and total
│   ├── ConfirmDialog.tsx          # reusable two-button dialog for app-level confirms
│   ├── EmptyResults.tsx           # Burmese "no results" state + add-item button
│   └── ImageTile.tsx              # image loader with placeholder fallback
├── services/
│   ├── supabaseClient.ts          # client; fails gracefully when offline flag set
│   ├── authService.ts             # login via Supabase auth; caches session locally
│   ├── productService.ts          # catalog fetch + search (powers TanStack queries)
│   ├── saleService.ts             # confirm sale (online direct, offline queue), queue sync
│   ├── printerService.ts          # PrinterService interface + EscPosPrinterService (stub) + PrintWindowService (Default: window.print)
│   └── syncService.ts             # background queue flush; idempotent; backoff retry
├── state/
│   └── useCartStore.ts            # zustand store (order survives reload; add/remove/qty)
├── hooks/
│   ├── useNetworkStatus.ts        # online/offline detection (window online events + ping)
│   └── useSyncQueue.ts            # pending sale count + flush orchestration
├── pages/
│   ├── LoginPage.tsx
│   ├── SaleScreen.tsx             # product grid + sticky search bar + cart widget
│   ├── SearchOverlay.tsx          # search results modal/screen (also used by grid filter)
│   ├── AddProductPage.tsx         # image attach + price validation
│   └── OrderSummaryPage.tsx       # items list + qty controls + total + confirm + print
├── router.tsx                     # routes; auth guard (no auth => /login)
├── db/
│   ├── offlineStore.ts            # IndexedDB/TanStack persisted cache + offline sale queue
│   └── queueAdapter.ts            # typed enqueue/dequeue + idempotency
├── tests/
│   ├── unit/                      # mmk, cart, search, sync queue tests
│   └── integration/               # sale flow happy-path; offline queue replay
```

**Structure Decision**: Single SPA matching existing Vite scaffold (`src/`). Services isolate Supabase/printer/sync; pages consume hooks backed by TanStack Query. Admin routes will be added to the same SPA in a later feature under `src/admin/`.

## Complexity Tracking

No constitution violations to justify.
