# Contract: Sales API + Offline Sync (saleService / syncService)

## Types

```ts
type SaleItem = {
  productId: string | null;      // null if product removed from catalog later
  nameSnapshot: string;
  imageSnapshot: string | null;
  qty: number;                   // >= 1
  unitPriceMmk: number;
  lineTotalMmk: number;          // qty * unitPriceMmk
};

type Sale = {
  idempotencyKey: string;        // client-gen uuid v4 — created BEFORE any confirm
  totalMmk: number;              // sum(lineTotalMmk), validated server-side
  completedBy: string;           // session userId
  createdAt: string;             // device ISO time at confirm
  items: SaleItem[];
};

type SaleReceipt = {
  header: { shopName: string; saleTime: string; completedByName: string };
  items: { name: string; qty: number; unitPriceMmk: number; lineTotalMmk: number }[];
  totalMmk: number;
};
```

## Operations

| Signature | Mode | Behavior |
|---|---|---|
| `confirmSale(order): Promise<{saleId, offline: boolean}>` | both | online → RPC `create_sale(p_sale, p_items)`; offline → enqueue to IndexedDB, return `{offline:true}` |
| `flushQueue(): Promise<number>` | online | drains pending records (oldest first); per-record RPC call; on success mark done; on failure attempts++ and re-enqueue |
| `getPendingCount(): Promise<number>` | any | count of `state in ('pending','failed')` |
| `buildReceipt(order, profile): SaleReceipt` | any | pure; shared by WebPrintService and future BluetoothPrinterService |

## `create_sale` RPC contract (server, see schema.sql)

Request body: `{ p_sale: {...}, p_items: [...] }` (jsonb as in data-model).
Response: `{ "sale_id": ..., "duplicate": false|true, "total_mmk": n }`.

Server rules (client MUST NOT repeat these):
1. `completed_by` must equal `auth.uid()` → else FORBIDDEN
2. recomputed item-sum must equal `p_sale.total_mmk` → else TOTAL_MISMATCH
3. zero items → EMPTY_SALE
4. existing `idempotency_key` → returns original sale (`duplicate:true`), client marks record done

## Sync rules
- Flush triggers: `online` event, app start, 30s interval while pending>0, after manual retry.
- Backoff: 5s, 15s, 60s (attempts ≤5 → state `failed`, still retried next flush cycle).
- Exactly-once: server idempotency on `(idempotency_key)` guarantees duplicates are impossible even across devices/reinstalls.
- Local record retention: `done` records purged after 7 days; `failed` kept until manually cleared (admins later).

## Total-display rule (UI contract)
Totals shown anywhere in the app MUST use `fmtMMK` (see data-model R6): integer + thousands separator + ` ကျပ်`. Receipt and summary show the same string.
