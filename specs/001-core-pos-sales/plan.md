# Implementation Plan: Core POS Sales App

**Branch**: `001-core-pos-sales` | **Date**: 2026-10-30 | **Revised**: 2026-11-04 (MVP pivot) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-pos-sales/spec.md`

## Summary

Tablet/phone-first Burmese POS for a construction shop: big-tap product grid with images and MMK prices, 1–2 word search, order summary with confirm + receipt print (printer abstraction for a future Bluetooth printer). **MVP pivot (2026-11-04)**: the shop's internet provider blocks Supabase, so the backend is deferred — the app is a React + Capacitor **Android** app that stores products (with inline compressed photos) and sales entirely in device **IndexedDB**; works with zero connectivity. Login is dropped for the MVP (trusted shared device). Offline capture with once-only sync returns with the backend revision.

## Technical Context

**Language/Version**: TypeScript 5.5+ on React 18, built with Vite 5

**Primary Dependencies**: MUI (Material UI) v9, TanStack Query v5 + `@tanstack/react-query-persist-client` (IndexedDB persistence), zustand (cart), **Capacitor 7** (`@capacitor/core` + `@capacitor/android`, `@capacitor/cli`) for the Android build, vite-plugin-pwa (still works as a browser/PWA fallback), Padauk font for Burmese text

**Storage**: **Local-only IndexedDB** (`pos-offline` DB): `products` store (catalog, photos as inline compressed JPEG data URLs), `sales` store (completed sales keyed by idempotency key), `kv` store (TanStack Query cache, misc). localStorage persists cart state. No cloud backend in the MVP.

**Testing**: Vitest + React Testing Library + `fake-indexeddb` (jsdom has no IndexedDB); build/lint as quality gates (`npm run build`, `npm run lint`, `npm run test`)

**Target Platform**: **Android device via Capacitor** (primary); modern Chrome-based browsers (tablet ~800×1280 and phones) as the development/PWA fallback

**Project Type**: Single SPA wrapped by Capacitor; admin section lives in the same SPA under `/admin` (open on the shared device in the MVP; role gating returns with sign-in)

**Performance Goals**: Product grid renders 100+ cards smoothly (<300ms); local search responds <1s (typically <50ms from IndexedDB); sale confirm writes locally <200ms

**Constraints**: 100% offline-capable (browse, search, checkout); zero lost/duplicate sales; all UI copy in Burmese; min 64×64px touch targets; works on mid-range Android devices

**Scale/Scope**: ~100–1000 products, device-local sales history, one active order per device; screens: sale grid, order summary, add product, admin reports/products

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| React 18 + TS + Vite | PASS | matches repo scaffold |
| TanStack Query for data hooks + offline persistence | PASS | persist-client + IndexedDB persister in place |
| MUI for UI | PASS | large touch target overrides via theme |
| **Local-first storage (IndexedDB)** — no Supabase in MVP | PASS | provider blocks Supabase endpoints; storage is the `pos-offline` IndexedDB DB |
| Offline support (catalog + sales) | PASS | everything local; idempotency key prevents duplicate sales |
| All UI text in Burmese via labels module | PASS | `src/data/labels.mm.ts` |
| MMK formatting util used everywhere | PASS | `src/utils/mmk.ts` |
| Printer behind `PrinterService` interface | PASS | escalation point: `window.print` now, Bluetooth later |
| Android platform via Capacitor | PASS | `capacitor.config.ts`, `npx cap sync` / `npm run cap:sync` |
| No secrets needed in MVP | PASS | `.env` removed with the Supabase client |

## Project Structure

### Documentation (this feature)

```text
specs/001-core-pos-sales/
├── plan.md              # This file
├── research.md          # Phase 0 output (historical; R1–R2/R5–R6 superseded by MVP pivot)
├── data-model.md        # Phase 1 output (revised: IndexedDB entities)
├── quickstart.md        # Phase 1 output (revised: no backend)
├── contracts/           # Phase 1 output (revised to local-store contracts)
│   ├── products.api.md  # Local products contract
│   └── sales.api.md     # Local sale + idempotency contract
└── tasks.md             # Phase 2 output (historical record of the Supabase-era implementation)
```

### Source Code (repository root)

```text
capacitor.config.ts                 # Capacitor: appId mm.shopsale.pos, webDir dist
index.html                         # <html lang="my">, app root mounts here
public/
├── placeholder.png                # image placeholder for broken/missing images
src/
├── main.tsx                       # app entry; mounts React root
├── App.tsx                        # providers (QueryClient, Theme, Router)
├── theme.ts                       # MUI theme: Burmese font, large touch targets, high contrast
├── data/
│   └── labels.mm.ts               # ALL Burmese UI strings (single source)
├── types/
│   └── domain.ts                  # Product, Sale, SaleItem, report types
├── utils/
│   ├── mmk.ts                     # MMK formatting (123,450), totals
│   ├── idempotency.ts             # uuid generator (sale keys)
│   └── imageUtils.ts              # client-side downscale/compress of added product images
├── components/
│   ├── CartButton.tsx             # sticky cart summary widget
│   ├── ConfirmDialog.tsx          # reusable two-button dialog
│   ├── EmptyResults.tsx           # Burmese "no results" state + add-item button
│   └── ImageTile.tsx              # image loader with placeholder fallback
├── services/
│   ├── productService.ts          # catalog CRUD against IndexedDB `products` store
│   ├── saleService.ts             # confirm sale → local `sales` store (idempotent)
│   ├── reportsService.ts          # period aggregation from local `sales` store
│   ├── imageDataService.ts        # compressed file → data URL (inline image storage)
│   └── printerService.ts          # PrintWindowService (window.print) + Bluetooth stub
├── state/
│   └── useCartStore.ts            # zustand store (cart survives reload; add/remove/qty)
├── hooks/
│   ├── useNetworkStatus.ts        # passive online/offline indicator (nothing depends on it)
│   └── usePeriod.ts               # day/week/month ranges, shop TZ (Asia/Yangon)
├── pages/
│   ├── SaleScreen.tsx             # product grid + sticky search bar + cart widget
│   ├── AddProductPage.tsx         # image attach + price validation
│   └── OrderSummaryPage.tsx       # items list + qty controls + total + confirm + print
├── admin/                         # reports dashboard, sales list/detail, product management
├── router.tsx                     # routes; no auth gates in MVP
├── db/
│   ├── offlineStore.ts            # IndexedDB opener + kv/product/sale store helpers
│   ├── queryPersister.ts          # TanStack persisted cache over IndexedDB
│   └── persistPolicy.ts           # which query keys persist
└── tests/
    ├── setup.ts                   # fake-indexeddb shim
    ├── unit/                      # mmk, cart, search, reports, printer tests
    └── integration/               # sale confirm flow against local IndexedDB
```

**Structure Decision**: Single SPA matching the Vite scaffold (`src/`), wrapped for Android by Capacitor (`capacitor.config.ts`, `android/`). Services own all IndexedDB access; pages consume services via TanStack Query hooks. When a cloud backend returns later, only the services change — pages, labels, and the cart flow stay put.

## Complexity Tracking

No constitution violations to justify.
