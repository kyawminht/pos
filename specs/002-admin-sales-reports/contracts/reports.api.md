# Contract: Reports RPCs (consumed by `reportsService`)

Source of truth: `contracts/reports.sql` → `supabase/migrations/0002_admin_reports.sql`.

All RPCs require an active admin (except `sale_detail`, which also allows the sale owner) and raise `FORBIDDEN` otherwise.

## report_period

```ts
rpc('report_period', { p_from: 'YYYY-MM-DD', p_to: 'YYYY-MM-DD', p_tz: 'Asia/Yangon' })
→ PeriodReport
```

```ts
type PeriodReport = {
  from: string; to: string; tz: string
  total_mmk: number; sale_count: number
  per_day: { d: string; total_mmk: number; count: number }[]
  per_staff: { staff_id: string; name: string; total_mmk: number; count: number }[]
}
```

- Only `status='completed'` sales.
- Day buckets use `(created_at AT TIME ZONE p_tz)::date`; `per_day` covers every date in range (zeros included).

## sales_in_period

```ts
rpc('sales_in_period', { p_from, p_to, p_tz, p_limit: 25, p_offset: 0 })
→ { id, created_at, total_mmk, completed_by, completed_by_name, item_count }[]
```

- Newest first; `p_limit` 1..100 else `INVALID_LIMIT`.

## sale_detail

```ts
rpc('sale_detail', { p_sale_id: uuid })
→ SaleDetail
```

- Items read ONLY from `sale_items` snapshot columns (frozen history, FR-206).

## Errors → Burmese labels
`FORBIDDEN` → `errCodeLabel('PERMISSION_DENIED')`; `INVALID_RANGE` / `INVALID_LIMIT` → generic retry copy; `NETWORK_ERROR` → existing copy.

## Client query keys (persisted)
- `['report', from, to, SHOP_TZ]`
- `['admin','sales', from, to, page]`
- `['admin','sale', id]`
- `['admin','products']`

`SHOP_TZ = 'Asia/Yangon'` constant in `src/services/reportsService.ts`.
