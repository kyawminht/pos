# Feature Specification: Admin Sales Reports & Product Management

**Feature Branch**: `002-admin-sales-reports`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Admin backend: mobile-first + desktop app in the same project folder, protected route, see daily/weekly/monthly sales, admin can add products. No stock view needed. Offline-cached reports where sensible. Tech: React TS SPA with TanStack Query + Material UI (per existing constitution)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin-only protected area (Priority: P1)

A staff member with the admin role signs in and reaches the admin area; a sale-role staff member (or anyone not signed in) never sees it. Wrong role is redirected to the sales screen.

**Why this priority**: Everything below sits behind this door; wrong-role access would expose business-wide revenue data.

**Independent Test**: Can be fully tested by signing in as admin (dashboard loads) vs as sale staff (redirected to sales screen with no admin menu visible) vs signed-out (login screen).

**Acceptance Scenarios**:

1. **Given** an admin is signed in, **When** they open the admin area, **Then** the sales dashboard loads.
2. **Given** a sale-role staff is signed in, **When** they try to open the admin area (typed address, stale link), **Then** they are redirected to the sales screen and see no admin navigation.
3. **Given** no one is signed in, **When** any admin route is opened, **Then** the login screen appears, and after successful admin sign-in the intended admin page opens.
4. **Given** an admin session ends while viewing admin pages, **When** the admin tries a further action, **Then** they are asked to sign in again (data is not silently stale).

---

### User Story 2 - Daily / weekly / monthly sales view (Priority: P1)

The admin opens the reports dashboard and switches between today (daily), this week (weekly), and this month (monthly) views. Each view shows total sales amount in MMK, number of sales, and a simple visual breakdown by day/staff so a non-technical owner can see "how did the shop do?" at a glance. View fits a phone first, and uses the wider space when opened on a desktop/laptop.

**Why this priority**: This is the core reason the admin app exists — the owner wants numbers, anytime, on the phone or a desktop.

**Independent Test**: Can be fully tested by opening each period view and checking totals against recorded sales (e.g., after making N sales the daily total equals their sum, and the monthly view contains those days).

**Acceptance Scenarios**:

1. **Given** recorded sales exist for today, **When** the daily view opens, **Then** the total for today in MMK and the count of sales are shown prominently and match the recorded sales.
2. **Given** the admin switches to weekly, **When** the view loads, **Then** totals for this week (starting Monday) are shown with a per-day breakdown for the last 7 days.
3. **Given** the admin switches to monthly, **When** the view loads, **Then** totals are shown with a per-day breakdown for up to 31 days (or a compact monthly summary + last 30 days detail).
4. **Given** two staff sold on the same day, **When** a by-staff breakdown is opened, **Then** each person's totals for the period are shown separately.
5. **Given** a period with no sales, **When** the view loads, **Then** a clear Burmese "nothing sold yet" state appears (zeroes, not errors, never a blank wall).

---

### User Story 3 - Sales history drill-down (Priority: P2)

From any period view, the admin can open the list of sales in that period (date, amount, staff, number of items) and open one sale to see its items (name, quantity, unit price, line amount). This is read-only history — snapshots stay frozen even if products were renamed/price-changed later.

**Why this priority**: Owners trust totals only when they can check what's inside; also needed to resolve customer disputes.

**Independent Test**: Can be fully tested by opening a recorded sale from the history list and verifying its items match what was sold, and that it is untouched by later product edits.

**Acceptance Scenarios**:

1. **Given** sales in a period, **When** the history is opened, **Then** sales are listed newest first with date, amount, and staff name.
2. **Given** a sale in history, **When** tapped, **Then** its items with names/quantities/price snapshots and the grand total are shown.
3. **Given** a product was renamed or its price changed after a sale, **When** the old sale is opened, **Then** the snapshot name/price at sale time is shown, not today's values.

---

### User Story 4 - Admin product management (Priority: P2)

The admin can add a new product (name, MMK price, photo) and edit existing products' name, price, or photo, and can deactivate (hide) a product — all from the admin area. Deactivation hides the product from the sales screen but keeps it in past sale history. Already partially lived in v1 (price edit); this story completes the admin-grade surface (mobile form first, desktop layout comfortable) and reuses the same product row rules (integer price ≥ 1, photo, Burmese-only visible text).

**Why this priority**: completing catalog management rounds out ownership; still secondary to reports.

**Independent Test**: Can be fully tested by adding, editing, deactivating, and re-activating a product and observing sales-screen behavior from an admin-facing expectation (staff device shows/hides it on next refresh).

**Acceptance Scenarios**:

1. **Given** the product list, **When** the admin adds a product with name/price/photo, **Then** it appears in the catalog (and later on the sales screen).
2. **Given** an existing product, **When** the admin edits its name/price/photo, **Then** changes save and show after refresh/staff-device refresh; sales history snapshots are unchanged.
3. **Given** an active product, **When** the admin deactivates it, **Then** it disappears from the sales screen catalog after the staff device's next refresh; any product already tapped into a current order stays usable (snapshot preserved).
4. **Given** an inactive product, **When** the admin re-activates it, **Then** it returns to the sales screen catalog after refresh.
5. **Given** invalid input (empty name, price 0/negative/non-integer), **When** save is attempted, **Then** a clear Burmese error blocks saving.

---

### User Story 5 - Offline-tolerant admin (Priority: P3)

The admin can open past periods' reports and product management even when the shop's internet is down: yesterday-and-earlier aggregated numbers come from the locally cached store, and the admin clearly sees "showing cached data" + how fresh it is. Today's live number and brand-new uncached data require a connection.

**Why this priority**: The shop's owner may want to browse figures during outages; core report freshness needs a connection, so this is a comfort layer.

**Independent Test**: Can be fully tested by loading reports online, dropping connectivity, then re-opening past-period views (still shown from cache, labeled as cached) while today's view shows the offline notice.

**Acceptance Scenarios**:

1. **Given** reports were viewed online earlier today, **When** the admin opens yesterday's/monthly view offline, **Then** cached totals are shown with a visible "cached, last updated HH:MM" notice.
2. **Given** the offline admin, **When** they open the today view with no cached copy for it, **Then** a Burmese offline notice explains that today's numbers need a connection.
3. **Given** the offline admin, **When** they edit a product, **Then** edits are stored locally and flagged pending; they apply centrally when connectivity returns (later confirm/adjust flows allowed; no data silently lost).

---

## Edge Cases

- Sale recorded offline on the staff tablet but not yet synced: admin reports exclude it until it appears centrally; the admin sees a pending-sales count chip so totals don't look silently inconsistent.
- Timezone/day boundaries: a sale belongs to the day it happened in the shop's local time; weekly starts Monday.
- Very large history: only the selected period is fetched; older months open on demand (no full-history download on login).
- Deleted/deactivated products in history: sale line items keep their capture-time name and price.
- Same admin on phone and desktop: data stays consistent because it is server-side; caches are just views (cache only.
- Duplicate syncs from the staff side: excluded at the source (idempotency), so reports never double-count.
- Admin tries to edit while offline: product edit queues locally (story 5) with exactly-once rules for price/name changes.
- Zero data day-1 (fresh install): all views show helpful empty Burmese states instead of blank charts.
- Photos for products added by admin must handle the same compression/missing/broken cases as the staff app (placeholder, client-side compression).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: Admin routes are reachable ONLY by signed-in users whose role is admin; any non-admin or signed-out visitor is redirected away with no admin content shown.
- **FR-202**: The reports view MUST offer daily (today), weekly (current week, Monday-start), and monthly (current month) period views, each showing grand total in MMK and count of sales.
- **FR-203**: Weekly and monthly views MUST include a readable per-day breakdown; a compact visual (chart or bar list) plus total rows must work on a phone AND scale comfortably on desktop.
- **FR-204**: A by-staff breakdown of totals for the selected period MUST be viewable.
- **FR-205**: From a period view, the admin MUST be able to list that period's sales (newest first, with date/amount/staff) and open one sale's itemized details.
- **FR-206**: Sale details MUST use capture-time snapshots (name, unit price) so later product edits/price changes/renames do not alter recorded history.
- **FR-207**: The admin MUST be able to add a product (name, integer MMK price ≥ 1, photo) and edit an existing product's name, price, or photo.
- **FR-208**: The admin MUST be able to deactivate a product (hidden from the sales screen after refresh) and re-activate it; staff-device current orders that already contain the product are unaffected.
- **FR-209**: Product validation matches the staff app: non-empty Burmese name, integer 1..9,999,999,999 price; photos reuse compression/placeholder rules.
- **FR-210**: Past periods (yesterday and earlier; finished months) MUST be viewable from locally cached aggregates when offline, with a visible freshness notice; live "today" needs connectivity and shows that notice offline.
- **FR-211**: When staff-side sales are recorded but not yet synced to central storage, the admin area MUST show a pending count so report gaps are explainable.
- **FR-212**: All admin-area text is in Burmese (same labels module) with the same large-target, low-literacy conventions as the sales app; the admin area additionally optimizes desktop width (mobile-first but not mobile-only).
- **FR-213**: Period figures are derived ONLY from completed sales exactly once (server idempotency already guarantees this); reports never include locally queued unsynced staff sales.
- **FR-214**: The admin app lives in the SAME project as the sales app, sharing login/session, theme font (Burmese), labels, MMK utils, and offline plumbing — no second repository or separate build.

### Key Entities *(include if feature involves data)*

- **Sale / Sale line**: already defined in 001-core-pos-sales; history is read-only here and snapshot-frozen.
- **Product**: same entity plus admin-grade edit semantics (deactivate/re-activate; edit name/price/photo).
- **Period report cache (client-side)**: per-period aggregate (period, totals, per-day rows, per-staff rows, cached-at) stored locally so past periods open offline; keyed by period range + refreshed whenever viewed online.
- **Staff member**: referenced by sales for by-staff breakdowns; role constraints come from 001 (profiles).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: An owner can check "how much did we sell today?" in under 10 seconds from unlocking the phone to seeing the total.
- **SC-202**: Report totals match recorded central sales 100% (no double counting from re-syncs; no missed sales once synced).
- **SC-203**: Weekly/monthly per-day breakdowns load in under 3 seconds on a mid-range phone and repeat visits from cache render near-instantly.
- **SC-204**: A product added or edited by the admin is visible on a staff device after its next refresh within 2 minutes (background refetch), without app reinstall.
- **SC-205**: 100% of admin UI copy is Burmese; period views pass the same low-literacy conventions (large text, clear zero/empty states).
- **SC-206**: A sale-role staff member cannot reach admin pages by any means (deep link navigation included).

## Assumptions

- Role model already exists (profiles.role = sale | admin) — extended use, no new accounts infra.
- "No stock" stays true: nothing about remaining quantities appears in admin v1.
-voiding/refunding sales is out of scope for this feature (future spec); corrections are via new sales/records as needed.
- Time zone: shop-local (device) time defines day boundaries; weekly = Monday start; monthly = calendar month.
- Charts: keep to a simple, readable form (per-day bars/rows), not complex analytics.
- History depth on-demand: recent months quick; "total history ever" is not preloaded.
- Offline product edits from the admin adopt a simple "queue like a sale upload" policy; conflicts (two admins editing the same product) resolve last-write-wins with a small history entry left on screen.
- Money formatting reuses the same integer-MMK formatting (no Burmese numerals change this round).

**Out of scope**: stock/inventory counts; payment methods; void/refund; staff management/creation; salesperson targets; import/export; notification/push.
