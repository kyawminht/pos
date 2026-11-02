# Data Model: Admin Sales Reports & Product Management

Additions only — base entities are defined in `specs/001-core-pos-sales/data-model.md`.

## Read models (server-produced, client-cached)

### PeriodReport
Produced by `report_period(p_from, p_to, p_tz)`.

```ts
type PeriodReport = {
  from: string            // YYYY-MM-DD (shop tz)
  to: string              // YYYY-MM-DD (shop tz)
  tz: string              // 'Asia/Yangon'
  totalMmk: number
  saleCount: number
  perDay: { d: string; totalMmk: number; count: number }[]
  perStaff: { staffId: string; name: string; totalMmk: number; count: number }[]
}
```

Rules: only `status='completed'`; day buckets from `(created_at AT TIME ZONE tz)::date`; totals are Postgres `bigint` → numbers.

### SaleHeader (history row)

```ts
type SaleHeader = {
  id: string
  createdAt: string      // ISO (device renders locally)
  totalMmk: number
  completedByName: string
  itemCount: number      // sum(qty)
}
```

### SaleDetail

```ts
type SaleDetail = {
  id: string
  createdAt: string
  totalMmk: number
  status: 'completed' | 'void'
  completedByName: string
  items: {
    id: string
    productId: string | null
    productNameSnapshot: string
    imageUrlSnapshot: string | null
    qty: number
    unitPriceMmk: number
    lineTotalMmk: number
  }[]
}
```

Invariant: detail values come ONLY from `sale_items.*_snapshot` columns; later product edits never alter them (FR-206).

## Client-side caches

| Key | Shape | Persisted | Invalidation |
|---|---|---|---|
| `['report', from, to, tz]` | PeriodReport | yes (IndexedDB) | refetch on focus/reconnect; manual refresh; staleTime 5m for today, 24h for closed periods |
| `['admin', 'sales', from, to, page]` | SaleHeader[] | yes | invalidated when a report is refreshed |
| `['admin', 'sale', id]` | SaleDetail | yes | immutable (append-only) |
| `['admin', 'products']` | Product[] (incl. inactive) | yes | invalidated on product create/edit/deactivate |

Freshness: `query.dataUpdatedAt` → `FreshnessBadge("cached HH:MM")` when `!isOnline` or data older than 5 min.

## Server objects (contracts/reports.sql)

- `public.is_admin(p_uid uuid) returns boolean` — active profile with role='admin'.
- `public.report_period(p_from date, p_to date, p_tz text default 'Asia/Yangon') returns jsonb` — raises FORBIDDEN for non-admin.
- `public.sales_in_period(p_from date, p_to date, p_tz text, p_limit int default 25, p_offset int default 0) returns table(...)` — admin only, newest first.
- `public.sale_detail(p_sale_id uuid) returns jsonb` — admin or owner; returns sale + items with snapshot columns.

RLS: unchanged (admins can select all sales/sale_items/products; sale-role keeps own-rows access). Product update policy stays "admin OR creator" (feature 001).

## Period helpers (client)

`usePeriod()` returns `{key:'day'|'week'|'month', from, to, label}`:
- day: today in shop tz
- week: Monday..today (spec: week starting Monday)
- month: 1st..today of the shop-tz month
Shop tz fixed constant `SHOP_TZ = 'Asia/Yangon'` (documented; future setting).
