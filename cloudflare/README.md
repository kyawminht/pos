# Cloudflare R2 image storage — OPTIONAL alternative (NOT active)

**Current state**: the app uploads product photos to **Supabase Storage**
(bucket `products`) — see `specs/001-core-pos-sales/research.md` (R8) and
`contracts/products.api.md`. Free quota ≈ 1GB ≈ ~10,000 compressed product
photos (~100KB each), which fits this shop's catalog size.

**Why this folder exists**: if the photo volume ever outgrows Supabase Storage,
R2 gives 10GB free with the SAME schema — because Postgres stores only the
public URL text in `products.image_url`, swapping storage backends means zero
database changes.

## If you ever switch
1. Keep `upload-worker.js` + `wrangler.toml` here (they implement a token-gated
   upload Worker that puts the object in the bucket and returns the public URL).
2. Create bucket `pos-product-images`, enable its public r2.dev URL, then:
   `npx wrangler login && npx wrangler secret put UPLOAD_TOKEN && npx wrangler secret put PUBLIC_BASE && npx wrangler deploy` (run inside this folder).
3. Re-create an upload service in `src/services/` (fetch POST to the Worker with
   the token header → returns `{ url }`), call it from
   `productService.createProduct` before the insert.
4. Only new photos land in R2; existing URLs keep working (both hosts are
   public GETs, and the service worker caches either host the same way).
