# Implementation Plan: Admin Sales Reports & Product Management

**Branch**: `002-admin-sales-reports` | **Date**: 2026-11-02 | **Revised**: 2026-11-04 (MVP pivot) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-sales-reports/spec.md`

## Summary *(revised by MVP pivot)*

Add an admin area to the existing single SPA: a shared application shell with sidebar navigation (desktop) / top-bar drawer (mobile), a reports workspace with daily/weekly/monthly totals derived from the **device-local sales store** (timezone-corrected per day + per staff), drill-down into sale history with snapshot-frozen line items, and full product management (add / edit name·price·photo / deactivate–reactivate). Aggregates are cached in IndexedDB through the existing TanStack Query persister. The role gate is deferred with sign-in (see spec pivot note); no cloud backend in the MVP.

## Technical Context

**Language/Version**: TypeScript 5.5 / React 18 / Vite 5 (existing project — no new toolchain)

**Primary Dependencies**: existing MUI 9, TanStack Query v5 (+ IndexedDB persister), Zustand, Capacitor 7 (Android build), react-router-dom — **no Supabase**

**Storage**: IndexedDB `sales` store is the source of truth for reports (aggregated in-app by `reportsService.ts`); IndexedDB `products` store for product management; kv store as the rendered-view cache. No network.

**Testing**: Vitest + Testing Library (same harness) + `fake-indexeddb`; report aggregation unit tests

**Target Platform**: Android via Capacitor (primary), PWA/browser fallback — phone-first, widened desktop layouts (`md`+)

**Project Type**: Same single SPA; new `/admin/*` route subtree and a shared app shell

**Performance Goals**: Day/week/month report payload fetch < 700ms typical; cached repeat render < 100ms; history page 25 rows/page load on demand

**Constraints**: no chart library (CSS bar rows), Burmese-only copy, role enforcement on both client and DB, timezone-correct day buckets

**Scale/Scope**: 1–5 admin users; ~100–1000 products; 3 report tabs + 2 drill-down levels + product list/edit forms; ≤ 4 admin screens

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| React 18 + TS + Vite | PASS | reuse existing scaffold |
| TanStack Query for API/caching/offline | PASS | new query keys `['report',...]`, `['admin','products']`, `['admin','sales',...]` persisted via existing persister |
| MUI only for UI | PASS | no new UI dependency; charts as styled bars |
| Supabase SQL migrations | **N/A (deferred)** | MVP pivot: aggregation moved client-side (`reportsService.ts` over the local sales store); `reports.sql` withdrawn |
| Offline: reports always readable | PASS | data is local; `dataUpdatedAt` freshness badge still indicates recompute time |
| All visible copy in Burmese via labels module | PASS | extend `labels.mm.ts` with admin keys |
| MMK util everywhere | PASS | reuse `fmtMMK` |
| Printer abstraction untouched | PASS | admin doesn't print in this scope |
| No secrets in repo | PASS | reuse existing env |
| No new English UI | PASS | review gate |

Post-design re-check: PASS (no new storage backends, no schema-breaking changes; one additive migration).

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-sales-reports/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reports.sql          # 0002 migration source: is_admin(), report_period, sales_in_period, sale_detail
│   ├── reports.api.md       # RPC shapes consumed by reportsService
│   └── products-admin.api.md# product update/deactivate contract
└── tasks.md                 # /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── layout/
│   ├── AppShell.tsx          # sidebar (md+) / bottom nav (mobile) shell shared by sale + admin
│   ├── AdminGuard.tsx        # role gate -> redirect sale users
│   └── navConfig.ts          # nav items (Burmese labels), role visibility
├── admin/
│   ├── AdminDashboardPage.tsx  # report tabs + totals + CSS bars + staff breakdown + pending note
│   ├── AdminSalesListPage.tsx  # period sales list -> detail
│   ├── AdminSaleDetailPage.tsx # itemized, snapshot-frozen
│   └── AdminProductsPage.tsx   # product list, add/edit dialog, deactivate toggle
├── components/
│   ├── PeriodTabs.tsx          # ၒနေ့ / ယခုအပတ် / ယခုလ
│   ├── BarBreakdown.tsx        # dependency-free per-day bar rows
│   ├── FreshnessBadge.tsx      # "cached, HH:MM" note
│   └── ProductFormDialog.tsx   # shared add/edit product (name/price/photo)
├── services/
│   ├── reportsService.ts     # rpc wrappers + period range helpers (local tz)
│   └── productService.ts     # + updateProduct(), setActive()
├── hooks/
│   └── usePeriod.ts          # day/week/month ranges with Monday start + Asia/Yangon tz
├── pages/SaleScreen.tsx      # wrapped in AppShell; unchanged behavior
└── router.tsx                # /admin routes behind AdminGuard
supabase/migrations/0002_admin_reports.sql
```

**Structure Decision**: Feature-folder `src/admin/*` inside the existing SPA; a thin `src/layout/AppShell.tsx` gives the sidebar shell requested for desktop while keeping the sale screen’s flow intact. Contracts keep the report SQL as the single source, copied verbatim into the migration.

## Key design decisions (detail in research.md)

1. **Aggregation in SQL, not JS** — one `report_period(p_from, p_to, p_tz)` RPC returns totals + per-day + per-staff in one round trip; day buckets computed with `AT TIME ZONE` so “today” follows the shop clock (research R1).
2. **Role gate on both sides** — `AdminGuard` reads the cached session role; RPCs additionally assert an active admin (`is_admin()`), so a tampered client sees FORBIDDEN (R2).
3. **Offline = cached views, not offline analytics** — reports are read-only keys persisted by the existing persister; freshness uses TanStack `dataUpdatedAt`; “today” shows an offline notice instead of stale numbers (R3).
4. **Pending-sync visibility is device-local** — the pending count comes from the admin device’s own offline queue; the UI phrases it as “this device has N unsynced”, not global (spec FR-211 refinement) (R4).
5. **No chart dependency** — per-day breakdown is a ranked bar list (width % of max) which reads well at 360px and scales to desktop (R5).
6. **Product management reuses one form dialog** for add + edit, reusing compression/validation from feature 001; deactivate = `is_active=false` (R6).
7. **History is paginated, newest-first**, using indexed `created_at`; detail fetched per sale with items (R7).

## Complexity Tracking

No constitution violations.
