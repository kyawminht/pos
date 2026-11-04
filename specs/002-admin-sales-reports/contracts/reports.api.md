# Contract: Reports (consumed by `reportsService`)

*MVP pivot (2026-11-04): the former Supabase RPC contract is now an in-memory aggregation over the device-local IndexedDB `sales` store (see `src/services/reportsService.ts`). The export shapes and query keys below are unchanged — only the source moved.*

## reportPeriod

```ts
reportPeriod(from: 'YYYY-MM-DD', to: 'YYYY-MM-DD'): Promise<PeriodReport>
```

```ts
type PeriodReport = {
  from: string; to: string; tz: string
  totalMmk: number; saleCount: number
  perDay: { d: string; totalMmk: number; count: number }[]
  perStaff: { staffId: string; name: string; totalMmk: number; count: number }[]
}
```

- All locally stored sales in range (none are 'void' in MVP).
- Day buckets use the shop timezone (`Asia/Yangon`, `Intl.DateTimeFormat`) against each sale's `createdAt`; `perDay` covers only days that actually have sales.
- `from > to` or non-date input → `UNKNOWN` error.

## salesInPeriod

```ts
salesInPeriod(from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', page: number): Promise<SaleHeader[]>
```

- Newest first; client-side pagination, 25 rows/page (`SALES_PAGE_SIZE`).

## saleDetail

```ts
saleDetail(id: string): Promise<SaleDetail>
```

- Items read ONLY from the stored sale's snapshot fields (frozen history, FR-206). Unknown id → `UNKNOWN`.

## Errors → Burmese labels
`UNKNOWN` → generic retry copy; `NETWORK_ERROR` copy reserved for the future backend path.

## Client query keys (persisted)
- `['report', from, to, SHOP_TZ]`
- `['admin','sales', from, to, page]`
- `['admin','sale', id]`
- `['admin','products']`

`SHOP_TZ = 'Asia/Yangon'` constant in `src/hooks/usePeriod.ts`.
