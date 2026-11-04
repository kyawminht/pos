# Data Model: Core POS Sales App — MVP (local IndexedDB)

Entities, fields, validation, and state transitions for the **local-only MVP** (Supabase deleted; previously sketched SQL schema dropped with it).

All data lives in one IndexedDB database: `pos-offline` (version 2).

## Stores

### `products` — Product (keyPath: `id`)
A sellable item.

| Field | Type | Rules |
|---|---|---|
| id | uuid (key) | generated via `crypto.randomUUID()` |
| name | text | required; used for search; Burmese |
| priceMmk | integer | > 0; integer (MMK has no cents) |
| imageUrl | text nullable | **inline compressed JPEG data URL** (≤1024px long edge, q=0.8) stored directly on the record; app renders `placeholder.png` when missing/broken |
| isActive | boolean | inactive hidden from grid; items already in cart unaffected (snapshot) |
| createdBy | text nullable | informational only in MVP (no profiles table) |
| createdAt / updatedAt | ISO string | timestamps |

Validation: name non-empty; price integer ≥ 1; image jpeg/png/webp, compressed before save.

### `sales` — Sale (keyPath: `idempotencyKey`)
One completed transaction; **append-only, never modified or deleted in MVP**.

| Field | Type | Rules |
|---|---|---|
| idempotencyKey | uuid (key) | client-generated; unique; a retried confirm overwrites the same key instead of duplicating |
| totalMmk | integer | must equal Σ line totals — revalidated at write (`TOTAL_MISMATCH` otherwise) |
| completedBy | text | `'local-device'` in MVP (no session) |
| completedByName | text | display name for receipts/history |
| createdAt | ISO string | **client event time** to preserve true sale time |
| items | SaleItem[] | embedded array (snapshot-frozen) |

### SaleItem (embedded in Sale.items)
Line inside a sale. Stores a snapshot so later product edits/deactivations don't corrupt history.

| Field | Type | Rules |
|---|---|---|
| productId | uuid nullable | links to `products.id`; null if product hard-deleted |
| nameSnapshot | text | Burmese name at sale time |
| imageSnapshot | text nullable | data URL at sale time (receipt) |
| qty | integer | ≥ 1 |
| unitPriceMmk | integer | snapshot |
| lineTotalMmk | integer | qty × unitPriceMmk |

Redundancy rule: sale records are never modified after confirm (append-only → audit safety).

### `kv` — misc values
| Key | Content |
|---|---|
| `query-cache` | TanStack Query persisted client state (products/report/admin views) |

Cart state stays in `localStorage` under `pos-cart` (survives reload; FR-016).

## Relationships
- product 1—• sale_item (nullable, snapshot held)
- sale 1—• sale_item (embedded; sales append-only)

## Local logic (in-app, replacing former server RPCs)
- `confirmSale` (saleService): validates items non-empty (`EMPTY_SALE`) and recomputed total (`TOTAL_MISMATCH`) **before** the write; single IndexedDB put keyed by idempotencyKey → the same key can never become a second record.
- Reports (reportsService): aggregation over the local `sales` store, day-bucketed in the shop timezone (`Asia/Yangon`); no network involved.
- Search: client-side over the local catalog (Burmese combining-mark-insensitive substring match per word).
- Images: compressed on device, embedded as data URLs on the product record; no storage bucket needed.
