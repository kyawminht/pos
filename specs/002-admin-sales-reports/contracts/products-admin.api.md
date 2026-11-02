# Contract: Admin product management

Reuses `Product` from feature 001 (`contracts/products.api.md`). Adds:

## updateProduct

```ts
updateProduct(id: string, patch: {
  name?: string
  priceMmk?: number
  imageUrl?: string | null
  isActive?: boolean
}): Promise<Product>
```

- Server path: RPC `admin_update_product(p_id, p_name, p_price_mmk, p_image_url, p_is_active)`
  (admin OR the product's creator; see `contracts/reports.sql`).
- Validation: non-empty name; integer price `1..9_999_999_999`; no-op patch allowed.
- Errors: `NAME_REQUIRED`, `PRICE_INVALID`, `PERMISSION_DENIED`, `NETWORK_ERROR`.

## setActive

```ts
setActive(id: string, isActive: boolean): Promise<Product>
// sugar over updateProduct(id, { isActive })
```

## Photo replacement

`uploadProductImage(file)` (existing compression pipeline from 001) → returns public URL → pass as `imageUrl` in the same `updateProduct` patch. `null` keeps the existing photo.

## Behavior notes
- Deactivating hides the product from the staff catalog (`is_active` filter) after the staff device's next refetch; current staff carts keep snapshots.
- No hard delete in this feature.
