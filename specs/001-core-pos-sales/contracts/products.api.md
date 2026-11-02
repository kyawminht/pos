# Contract: Products API (Supabase, consumed via productService)

All access from the app goes through `productService.ts`, which wraps `supabase-js`. Contracts are the stable signatures the app (and future admin app) depends on.

```ts
type Product = {
  id: string;              // uuid
  name: string;            // Burmese
  priceMmk: number;        // integer >= 1
  imageUrl: string | null; // Storage public URL or null
  isActive: boolean;
  createdBy: string | null;
  createdAt: string; updatedAt: string;
};
```

## Operations

| Signature | Mode | Notes |
|---|---|---|
| `listActive(): Promise<Product[]>` | online | `select * from products where is_active order by updated_at desc` |
| `searchLocal(query: string): Product[]` | offline | client-side filter over cached list; normalized substring + Burmese-combining-strip (data-model R5) |
| `create(input: {name, priceMmk, imageFile})` | online required | client compresses image first (≤1024px, JPEG 0.8) → **Supabase Storage** bucket `products` (`products/{uuid}.jpg`) → insert row with `image_url`, `created_by = session.userId` |
| `subscribeChanges(cb): () => void` | online | realtime notify for catalog refresh; app triggers silent background refetch, never blocks UI |

## Error semantics (mapped to Burmese UI copy)
- `PRICE_INVALID` — price ≤ 0 / non-integer
- `NAME_REQUIRED`
- `IMAGE_UNREADABLE` / `IMAGE_TOO_LARGE` (post-compression safeguard >2.5MB)
- `NETWORK_ERROR` — thrown for create; callers keep form data intact
- `PERMISSION_DENIED` — inactive profile

## Caching key contract (TanStack Query)
- `['products','active']` — persisted to IndexedDB (staleTime 24h, background refetch on focus/online)
- `['product','image', imageUrl]` — not cached by TanStack; relies on browser HTTP cache

Source of truth: `contracts/schema.sql`. Any change to columns → bump both files in same PR.
Images: canonical store is **Supabase Storage** bucket `products` (DB holds `image_url` text only — never bytes). `cloudflare/` is a documented OPTIONAL alternative path for larger photo volumes.
