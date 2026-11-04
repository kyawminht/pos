# POS for Construction Shop

Offline-first Burmese (Myanmar-language) point-of-sale app for a construction materials shop. React + TypeScript + Vite + MUI, wrapped for **Android by Capacitor**.

**MVP storage model (2026-11-04)**: there is *no cloud backend*. The shop's internet provider blocks the Supabase endpoints, so all product and sales data lives in **device IndexedDB** (`pos-offline` database) and the app works with zero connectivity. Login is deferred (trusted shared device).

## Features

- Big-tap product grid with photos and MMK prices; 1–2 word Burmese-aware search
- Cart with running total; quantity merge; survives app reload
- Order summary → confirm (saved locally, idempotent — no duplicate sales) → receipt print (`window.print`, Bluetooth printer stub ready)
- Add products with on-device photo compression (≤1024px JPEG, stored inline)
- Admin area: daily/weekly/monthly reports computed from local sales + product management
- All UI text in Burmese (`src/data/labels.mm.ts`)

## Development

```bash
npm install
npm run dev        # web dev server (data stored in the browser's IndexedDB)
npm test           # vitest (fake-indexeddb shim for jsdom)
npm run build      # tsc + vite build → dist/
npm run lint
```

## Android (Capacitor)

```bash
npm run cap:sync        # build web assets and sync into android/
npx cap run android     # run on a connected device/emulator
npm run cap:android     # open the project in Android Studio → Build APK
```

The Android WebView's IndexedDB persists all data across restarts; no internet required.

## Project layout (key paths)

- `src/db/offlineStore.ts` — IndexedDB opener + `kv` / `products` / `sales` stores
- `src/services/productService.ts` — catalog CRUD (IndexedDB)
- `src/services/saleService.ts` — confirm sale → idempotent local write
- `src/services/reportsService.ts` — period aggregates over local sales (Asia/Yangon day buckets)
- `src/services/printerService.ts` — printer abstraction (Web print now, Bluetooth ESC/POS stub)
- `capacitor.config.ts` — Capacitor config (`mm.shopsale.pos`, `webDir: dist`)
- `specs/` — feature specs, plans, data models, contracts, quickstarts (see `specs/001-core-pos-sales/plan.md` for the full MVP pivot story)

## Deferred (backend revision)

Supabase (blocked by the local provider) + auth/sign-in with roles, cloud sync of sales/products, Bluetooth printer integration.
