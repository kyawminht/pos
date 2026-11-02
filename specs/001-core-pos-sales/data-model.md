# Data Model: Core POS Sales App

Entities, fields, validation, and state transitions. Physical SQL lives in `contracts/schema.sql` (source of truth for Supabase migrations).

## Entities

### Product
A sellable item.

| Field | Type | Rules |
|---|---|---|
| id | uuid pk | |
| name | text | required; used for search; Burmese |
| price_mmk | integer | > 0; integer (MMK has no cents) |
| image_url | text | nullable; Supabase Storage public URL; app renders placeholder when missing/broken |
| is_active | boolean | default true; inactive hidden from grid; items already in cart unaffected (snapshot) |
| created_by | uuid fk profiles.id | the salesperson/staff who created |
| created_at / updated_at | timestamptz | defaults |

Validation: name non-empty; price integer ≥ 1; image jpeg/png/webp ≤ ~5MB post-compression.

### Profile (staff account)
Fixed-credential staff. Mirrors Supabase `auth.users`.

| Field | Type | Rules |
|---|---|---|
| id | uuid pk (= auth.users.id) | |
| username | text unique | login hint/display |
| full_name | text | shown in receipts |
| role | enum('sale','admin') | gates protected routes |
| is_active | boolean | inactive cannot sign in; existing sessions soft-invalidated by RLS |

### Sale
One completed transaction.

| Field | Type | Rules |
|---|---|---|
| id | uuid pk | |
| idempotency_key | uuid | client-generated; unique; duplicate upload returns original row |
| total_mmk | integer | sum of line totals; computed server-side in `create_sale` |
| completed_by | uuid fk profiles.id | signed-in user |
| created_at | timestamptz | **client event time** to preserve true sale time offline |
| synced_at | timestamptz nullable | set when first accepted server-side |
| status | text | enum('completed','void') — void is admin-side later; only 'completed' in v1 |

### SaleItem
Line inside a sale. Stores a snapshot so later product edits/deletions don't corrupt history.

| Field | Type | Rules |
|---|---|---|
| id | uuid pk | |
| sale_id | uuid fk sales.id | on delete cascade |
| product_id | uuid fk products.id nullable | null if product later hard-deleted |
| product_name_snapshot | text | Burmese name at sale time |
| image_url_snapshot | text nullable | at sale time (receipt) |
| qty | integer | ≥ 1 |
| unit_price_mmk | integer | snapshot |
| line_total_mmk | integer | qty × unit_price_mmk |

Redundancy rule: `sale_items` never modified after `create_sale` (append-only → audit safety).

### PendingSaleRecord (client-only, IndexedDB)
Offline queue entry.

| Field | Type | Rules |
|---|---|---|
| idempotency_key | uuid key | also used as the store key |
| payload | Sale + SaleItem[] | full create_sale payload |
| state | enum('pending','syncing','done','failed') | terminal: done; failed keeps data for inspection |
| attempts | int | backoff counter |
| last_error | text nullable | for a future admin debug view |

State machine: `pending → syncing → done` (or back to `pending` on failure; `failed` after N=5 attempts, still flushed again on next successful manual app open → auto-reset).

## Relationships
- profile 1—* product (created_by), 1—* sale (completed_by)
- product 1—* sale_item (nullable, snapshot held)
- sale 1—* sale_item (cascade delete only in cascades — never in practice since sales are append-only)

## Server-side logic (in schema.sql)
- `create_sale(p_sale jsonb, p_items jsonb)` RPC: validates totals server-side (recompute from items), inserts atomically, resolves idempotency conflict by returning the existing sale id, sets `synced_at`.
- `match_products(q text)` helper SQL function? **No** — search is client-side (R5). Search stays off the wire.
- Triggers: `updated_at` on products; nothing else.
- RLS: profiles read own; products readable by any authenticated user, writable by authenticated users (v1 lets salespeople add — spec US5) with update limited to admin or creator; sales/sale-items insert only self (`completed_by = auth.uid()`), read only self + admin role.
