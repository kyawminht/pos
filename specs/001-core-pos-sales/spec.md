# Feature Specification: Core POS Sales App

**Feature Branch**: `001-core-pos-sales`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Build the core sales app: Burmese login with fixed credentials, product grid with images and MMK prices, 1–2 word search, cart with running total, checkout summary with print button, offline support."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login with fixed credentials (Priority: P1)

A salesperson opens the app on a shop tablet and signs in with his/her assigned username and password (fixed accounts created by the shop). After signing in once, the salesperson can keep selling even if internet connection is lost.

**Why this priority**: Nothing else in the app is accessible until someone is signed in; this is the front door of the product.

**Independent Test**: Can be fully tested by launching the app, entering valid credentials, and reaching the sale screen; delivering "only authorized staff can sell".

**Acceptance Scenarios**:

1. **Given** the app is open, **When** a salesperson enters a correct username and password, **Then** the sale screen appears and stays signed in across app restarts.
2. **Given** the app is open, **When** a wrong password is entered 3 times, **Then** a large Burmese error message is shown and access is denied.
3. **Given** the device is offline, **When** a signed-in salesperson reopens the app, **Then** the sale screen still opens without requiring a new sign-in.

---

### User Story 2 - Pick products from the sale screen (Priority: P1)

A salesperson browses a large grid of product cards on the sale screen. Each card shows the product photo and its price in MMK with big, easy-to-read text. Tapping a card adds that product to the current order. Tapping the same product again increases the quantity rather than creating a duplicate line. A visible running total in MMK is always displayed.

**Why this priority**: This is the core daily activity — choosing what the customer is buying — and must be fast and mistake-proof for low-literacy users.

**Independent Test**: Can be fully tested by opening the sale screen, tapping several product cards, and verifying quantities and the total increase correctly.

**Acceptance Scenarios**:

1. **Given** the sale screen is open, **When** a product card is tapped once, **Then** the running total increases by that product's price and the cart indicator shows one item.
2. **Given** a product is already in the order, **When** the same card is tapped again, **Then** the quantity becomes 2 and the total doubles — no duplicate line appears.
3. **Given** the screen is in use, **When** the running total is displayed, **Then** it is shown in a large, high-contrast MMK format with thousands separators, understandable at arm's length.

---

### User Story 3 - Find a product by typing 1–2 words (Priority: P1)

A salesperson with dozens of products can type just one or two words of the product name (in Burmese or a recognizable fragment of it) and see a filtered, tappable list of matching products. If nothing matches, a clear Burmese empty state appears with a shortcut to add a new item.

**Why this priority**: Search directly determines how fast a customer is served; without it the sale screen becomes unusable as the catalog grows.

**Independent Test**: Can be fully tested by typing a 1–2 word fragment and verifying only matching products are offered and addable.

**Acceptance Scenarios**:

1. **Given** the sale screen is open, **When** the salesperson types a 1–2 word fragment of a product name, **Then** matching products appear near-instantly as large tappable cards.
2. **Given** the salesperson clears the search box, **When** the box is emptied, **Then** the full product grid returns.
3. **Given** the search text matches no product, **When** the search is executed, **Then** a Burmese "no results" message is shown together with an "add new item" shortcut.

---

### User Story 4 - Review the order, confirm, and print (Priority: P1)

The salesperson opens the order summary which lists every chosen product (photo thumbnail, name, quantity, line amount), allows quantity adjustments and removal, and shows the total amount prominently. Confirming finalizes the sale. A large print button produces a printable receipt for the customer; the print hand-off is designed so a Bluetooth printer can be integrated later without changing the flow.

**Why this priority**: This is the moment money is accepted — the total must be unambiguous and the sale must be recorded before the customer leaves.

**Independent Test**: Can be fully tested by building an order, adjusting quantities, confirming, and verifying the sale record and a printable receipt are produced.

**Acceptance Scenarios**:

1. **Given** an order with items, **When** the summary is opened, **Then** every item's name, quantity, line amount, and the grand total in MMK are shown with large text.
2. **Given** the summary is open, **When** a quantity is increased or decreased or an item is removed, **Then** the total updates immediately.
3. **Given** the cart is empty, **When** the summary is viewed, **Then** confirm and print are disabled/de-emphasized so an empty sale cannot be recorded.
4. **Given** an order is confirmed, **When** the print button is tapped, **Then** a receipt containing the item list and total is produced, and the same action can later be redirected to a Bluetooth printer without redesign.
5. **Given** a confirmed order, **When** the app is offline, **Then** the sale is saved locally and marked as pending, and the salesperson is told in Burmese that it was saved.

---

### User Story 5 - Add a new product from the app (Priority: P2)

A salesperson can add a new product when a customer asks for something not yet in the catalog: name, price in MMK, and a photo (taken with the camera or chosen from the device). The new product becomes immediately searchable and tappable on the sale screen.

**Why this priority**: Important for day-to-day flexibility, but the app delivers full selling value without it.

**Independent Test**: Can be fully tested by adding a product with a photo and price, then finding it via search and adding it to an order.

**Acceptance Scenarios**:

1. **Given** the add-product form, **When** a name, price, and image are provided and saved, **Then** the product appears in the catalog immediately.
2. **Given** the form, **When** the price is empty, zero, negative, or non-numeric, **Then** a large Burmese explanation blocks saving.
3. **Given** the form, **When** a photo is taken or selected, **Then** it is attached to the product and shows on its sale-screen card.

---

### User Story 6 - Sync offline sales when back online (Priority: P2)

Sales recorded while offline are uploaded automatically when connectivity returns, without duplicates or data loss. The salesperson sees a small Burmese indicator of offline/pending count of unpushed sales.

**Why this priority**: Protects revenue records in the shop's environment where connectivity is unreliable.

**Independent Test**: Can be fully tested by selling offline, reconnecting, and verifying the sale appears in the records exactly once.

**Acceptance Scenarios**:

1. **Given** offline sales exist, **When** connectivity is restored, **Then** all pending sales upload automatically and the indicator clears.
2. **Given** an offline sale already uploaded, **When** connectivity drops again before the indicator clears, **Then** the sale is not uploaded a second time.
3. **Given** an upload fails mid-transfer, **When** the app retries, **Then** no sale record is lost or duplicated.

---

## Edge Cases

- Broken or missing product image: a placeholder image is shown; the grid never breaks or leaves blank holes.
- Product removed/deactivated while in the current order: the item stays in the order with its captured name, price, and photo; totals stay consistent.
- Very large quantity or very large total: guarded (no negative or absurd totals), long numbers stay readable and cannot overflow the display.
- Zero-item cart print/confirm: disabled to prevent empty receipts or empty sales.
- Accidental cart clear: asks for confirmation with big Burmese buttons; the order survives an app reload.
- Network failure mid-confirmation: nothing is half-saved; retry happens automatically without losing or duplicating the sale.
- Session ends while selling: the current order is kept; re-authentication is requested at the next sensible point rather than losing the sale.
- Oversized or wrong-format photo upload: rejected with a large Burmese explanation before saving.
- Slow search: results appear near-instantly from locally stored catalog data even while the network is slow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST restrict access to selling features to authenticated sales staff using fixed, pre-registered credentials.
- **FR-002**: The app MUST keep a signed-in salesperson signed in until they sign out, including across app restarts, and MUST permit sale-screen use without connectivity once signed in.
- **FR-003**: The sale screen MUST display products as tappable cards, each showing the product image and price in MMK, with touch targets large enough for older staff.
- **FR-004**: The app MUST show a running order total in MMK, updated immediately after every product tap, quantity change, or removal.
- **FR-005**: Tapping a product already in the order MUST increase its quantity instead of creating a duplicate order line.
- **FR-006**: The sale screen MUST provide search that matches products from a 1–2 word fragment of the product name and returns results fast enough to feel instant.
- **FR-007**: The search with no results MUST show a Burmese empty state including a shortcut to add a new product.
- **FR-008**: The product catalog and product images MUST be available locally on the device so browsing and search work while offline.
- **FR-009**: The order summary MUST list all items with name, quantity controls, per-item removal, line amounts, and a prominent total.
- **FR-010**: Confirming an order MUST record a complete sale of the item list and total; orders confirmed while offline MUST be stored locally and uploaded automatically when back online, exactly once.
- **FR-011**: The order summary MUST include a print action that produces a receipt with the item list and total, designed so a future Bluetooth printer can replace the receipt channel without changing the user flow.
- **FR-012**: Print and confirm MUST be unavailable while the order is empty.
- **FR-013**: The app MUST allow a signed-in salesperson to add a new product with a name, price in MMK, and photo captured from camera or device gallery, subject to price validation and image format/size checks.
- **FR-014**: All user-visible text MUST be in Burmese, readable for low-literacy and older users; critical actions MUST rely on icon + color + image in addition to text.
- **FR-015**: The app MUST show a small, always-visible Burmese connectivity state (offline / pending sales count) on the sale screen.
- **FR-016**: The current order and offline-sale queue MUST survive an app restart.

### Key Entities *(include if feature involves data)*

- **Product**: a sellable item — name, price in MMK, photo, active status, creator. Referenced by orders; searchable by name fragments.
- **Sale**: one completed transaction — grand total in MMK, who completed it, when it happened and when it reached central storage, and a local uniqueness marker that prevents duplicate uploads.
- **Sale line**: one row inside a sale — product reference plus snapshot of name, unit price, quantity, and line amount (so history stays correct even if the product changes later).
- **Staff account**: fixed credential holder — username/name, role, active flag; only active accounts can sign in.
- **Pending offline record**: a locally stored sale (or product) waiting to be synced, including its upload state to guarantee once-only delivery.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in salesperson can start a sale and finish checkout in under 90 seconds for a typical 3-item order.
- **SC-002**: Typing a 1–2 word fragment returns matching products in under 1 second (from local data).
- **SC-003**: All sales made while offline are recorded with 100% accuracy — no lost and no duplicate sales — once connectivity returns.
- **SC-001A**: 90%+ of first-time low-literacy users can complete a full sale unaided on first exposure.
- **SC-004**: Every confirmed sale produces a receipt the customer can keep, containing item list, quantities, and total in MMK.
- **SC-005**: 100% of on-screen labels and messages are in Burmese; zero English-only controls.
- **SC-006**: Catalog browsing, search, and checkout all work with the network disconnected throughout.

## Assumptions

- Products and their photos are managed centrally by the shop; photos are optimized/proportioned consistently; hundreds—not tens of thousands—of products.
- One staff account per salesperson; fixed credentials (no self-registration); role model covers "sale" and "admin" (admin features are scoped in a later specification).
- The device is a shared shop tablet; orders are per-device, one active order at a time.
- Currency is MMK only; standard thousands-separator formatting is acceptable (no Burmese digit requirement in v1).
- Printing v1: produce a printable summary on the device (system print). Bluetooth printer integration is a later plug-in.
- No inventory/stock tracking; no discounts/promotions in this version.
- Reasonable data retention: sales history kept indefinitely.

**Out of scope**: admin dashboards/reports and admin product management (separate specification), Bluetooth printer hardware integration, multi-currency, discounts, stock management.
