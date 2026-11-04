# Quickstart: validate Admin Sales Reports & Product Management (MVP)

Prereq: feature 001 app running (`npm run dev`). No backend — reports read the device-local sales store; make a few sales first so the dashboard has data.

## 1. Run
```bash
npm run dev
```
No sign-in in the MVP — the admin nav is visible on the shared device; open `/admin` directly.

## 2. Acceptance walkthrough
| # | Scenario | Expect |
|---|---|---|
| A1 | Open `/admin` | dashboard, today tab selected |
| A2 | Switch to week / month | totals + per-day bar rows update; Monday-start week |
| A3 | Staff breakdown | each seller row with totals for period (MVP: single "device" seller) |
| A4 | Empty period (e.g. month before install) | zero totals + Burmese empty note, no errors |
| A5 | Open history of a period | sales newest-first with date/amount/seller |
| A6 | Open one sale | items with snapshot names/prices; total matches |
| A7 | Rename product, reopen old sale | old sale still shows the captured name/price |
| A8 | Add product (name/price/photo) in admin | appears in admin list + staff catalog after refresh |
| A9 | Edit name/price/photo | saves; staff catalog refreshes; history unchanged |
| A10 | Deactivate product | disappears from staff screen after refresh; staff cart keeps it |
| A11 | Re-activate | returns to staff catalog |
| A12 | Invalid price (0 / text) | Burmese error blocks save |
| A13 | Fully offline (no network at all) | everything still works — reports are computed locally |

Deferred to the backend revision: sign-in/role gate (former A15) and server-side RLS.

## 4. Gates
```bash
npm run build
npm run lint
npm run test
```

## Known scope notes
- Pending-sales note counts only the current device’s unsynced queue (see research R4).
- Product edits require connectivity in this scope; queued admin edits remain a documented follow-up.
- No stock/inventory appear anywhere (explicitly out of scope).
