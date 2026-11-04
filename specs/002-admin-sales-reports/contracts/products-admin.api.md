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

- Server path *deferred*: was RPC `admin_update_product`; **MVP**: direct IndexedDB `products` record patch (`productService.updateProduct`), single trusted device (no role check until sign-in returns).
- Validation: non-empty name; integer price `1..9_999_999_999`; no-op patch allowed.
- Errors: `NAME_REQUIRED`, `PRICE_INVALID`; `PERMISSION_DENIED`/`NETWORK_ERROR` reserved for the backend path.

## setActive

```ts
setActive(id: string, isActive: boolean): Promise<Product>
// sugar over updateProduct(id, { isActive })
```

## Photo replacement

`uploadProductImage(file)` (existing compression pipeline from 001) → returns an **inline compressed data URL** → pass as `imageUrl` in the same `updateProduct` patch. `null` keeps the existing photo.

## Behavior notes
- Deactivating hides the product from the staff catalog (`is_active` filter) after the staff device's next refetch; current staff carts keep snapshots.
- No hard delete in this feature.
