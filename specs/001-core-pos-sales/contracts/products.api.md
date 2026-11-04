# Contract: Products API (local IndexedDB, consumed via productService)

*MVP pivot (2026-11-04): Supabase Storage/DB removed — all access goes through `productService.ts` against the IndexedDB `products` store. Signatures the UI depends on are unchanged.*

## Operations (async, all local)

| Function | Contract |
|---|---|
| `listActive(): Promise<Product[]>` | active products, newest `updatedAt` first |
| `listAllProducts(): Promise<Product[]>` | all products (admin), newest first |
| `createProduct(input {name, priceMmk, imageFile})` | client compresses image first (≤1024px, JPEG 0.8) → embedded as **data URL** on the record (no external storage). Errors: `NAME_REQUIRED`, `PRICE_INVALID`, `IMAGE_UNREADABLE` |
| `updateProduct(id, patch {name?, priceMmk?, imageUrl?, isActive?})` | full patch update; bumps `updatedAt`. Errors: `NAME_REQUIRED`, `PRICE_INVALID` |
| `setActive(id, isActive)` | alias of `updateProduct` |
| `updateProductPrice(id, priceMmk)` | quick price edit; errors `PRICE_INVALID` |
| `uploadProductImage(file): Promise<string>` | compressed file → inline data URL |
| `searchLocal(products, query)` / `normalizeBurmese(s)` | pure client-side search: strip Burmese combining marks, split query; **every word must be found** in the product name |

## Storage rules
- Catalog lives entirely in IndexedDB `products` store keyed by `id`.
- Images: canonical storage is the inline compressed data URL on the product record; broken/missing renders placeholder. No storage quota beyond IndexedDB (~hundreds of products safe).
- No network at any point; TanStack Query (`['products']` keys) serves the UI, persisted via the IndexedDB kv `query-cache`.
