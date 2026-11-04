# Quickstart: run & validate Core POS Sales App (MVP — local IndexedDB)

Prereqs: Node 18+, Android Studio (only for the Android build). No backend, no `.env` needed.

## 1. Run app (web dev)
```bash
npm install
npm run dev
```
Open the LAN/dev host on the tablet browser or just desktop Chrome. Product data is stored in device IndexedDB (`pos-offline`); start empty and add products via အသစ်ထည့်.

## 2. Validate acceptance scenarios (maps to spec)
| # | Scenario | Expect |
|---|---|---|
| S1 | open app | sale screen immediately; **no sign-in** |
| S2 | tap 2 products ×2 | cart count +, total shows twice price; no duplicate lines |
| S3 | search fragment of name | filtered cards ~instant (local IndexedDB); clear → full grid |
| S4 | typo search | Burmese empty state + "add item" shortcut |
| S5 | wrong price add-product | blocked with big Burmese error |
| S6 | confirm sale | success toast; row visible in `/admin` sales history |
| S7 | airplane/offline: confirm more sales | everything keeps working (fully local) |
| S8 | reload/restart app | all sales still in history exactly once; cart intact |
| S9 | re-confirm the same idempotency key | still one record (no duplicate) |
| S10 | print button | receipt DOM with item list + MMK total; `window.print` |

## 3. Build gates (constitution)
```bash
npm run build
npm run lint
npm run test
```

## 4. Android build (Capacitor)
```bash
npm run cap:sync        # npm run build && npx cap sync  (web assets → android/)
npx cap run android     # run on a device/emulator
npm run cap:android     # open the project in Android Studio → Build APK
```
The Android WebView's IndexedDB persists app data across restarts; no connectivity required.
