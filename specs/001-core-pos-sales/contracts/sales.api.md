# Contract: Sales Service (local IndexedDB, consumed via saleService)

*MVP pivot (2026-11-04): the former `create_sale` RPC contract is now a local write. Validation and idempotency semantics are preserved.*

## Operations

| Function | Contract |
|---|---|
| `confirmSale(sale): Promise<{saleId, offline}>` | validates then **writes the sale immediately to IndexedDB `sales`** as a final record; returns `{saleId: idempotencyKey, offline: false}` (offline kept in the return shape for the future sync path) |
| `putSale(sale)` | single-sale write; errors: `EMPTY_SALE` (no items), `TOTAL_MISMATCH` (recomputed Σ lineTotalMmk ≠ totalMmk) |
| `getSale(idempotencyKey)` / `sumSales(fromIso, toIso)` | local reads for tests/admin |
| `countPending` etc. | **removed with the MVP sync queue**; `createSaleOnline`/`flushQueue` return with the deferred cloud backend |

## Record shape (see data-model.md)
- Key: `idempotencyKey` (uuid, client-generated) — a retried confirm overwrites the same key, so a sale can never be recorded twice (was: server-side rpc duplicate resolution).
- Append-only: confirmed sales are never modified or deleted in MVP.
- Snapshots (`nameSnapshot`, `imageSnapshot`, `unitPriceMmk`) freeze at confirm time.

## Timezone
- Sale `createdAt` is a client ISO timestamp; report day-bucketing uses `Asia/Yangon` (contracts with reportsService).
