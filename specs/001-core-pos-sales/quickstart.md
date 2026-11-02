# Quickstart: run & validate Core POS Sales App

Prereqs: Node 18+, `.env` (copy `.env.example`), Supabase project, schema applied once (see below).

## 1. Apply backend
- Open Supabase Dashboard → SQL Editor → run `specs/001-core-pos-sales/contracts/schema.sql` end-to-end.
- Watch for: 4 tables, `create_sale` function, RLS policies, `products` storage bucket, demo profiles sale01/admin, 3 sample products.
- Test creds (demo only): `sale01` / demo-pass-1234, `admin` / demo-admin-1234.

## 2. Run app
```bash
npm install
npm run dev
```

## 3. Validate acceptance scenarios (maps to spec)
| # | Scenario | Expect |
|---|---|---|
| S1 | Login with sale01 | lands on sale screen; reload → still signed in |
| S2 | tap 2 products ×2 | cart count +, total shows twice price; no duplicate lines |
| S3 | search fragment of name | filtered cards in ~instant; clear → full grid |
| S4 | typo search | Burmese empty state + "add item" shortcut |
| S5 | wrong price add-product | blocked with big Burmese error |
| S6 | confirm sale online | success toast; rows appear supabase `sales`/`sale_items` |
| S7 | DEVTOOLS OFFLINE: confirm another sale | offline state widget; sale saved locally, marked pending |
| S8 | back online wall | auto-flush (≤30s); exactly 1 new row, no dup |
| S9 | reload mid-cart | cart intact |
| S10 | print button | receipt DOM with item list + MMK total; `window.print` |

## 4. Build gates (constitution)
```bash
npm run build
npm run lint
npm run test
```

## 5. Offline checks without booting the backend
`npm run dev` with `VITE_SUPABASE_URL` unset → should use `offline flagged mode` for dev smoke-testing; catalog seeded from a static fixture list. Useful for pure UI work.
