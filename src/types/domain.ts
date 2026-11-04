/** Partner-facing product record (camelCase). `price >= 1` enforced by UI. */
export interface Product {
  id: string
  name: string
  priceMmk: number
  imageUrl: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  productId: string
  nameSnapshot: string
  imageSnapshot: string | null
  qty: number // >= 1
  unitPriceMmk: number
  lineTotalMmk: number // qty * unitPriceMmk
}

export interface SaleItem {
  productId: string | null
  nameSnapshot: string
  imageSnapshot: string | null
  qty: number
  unitPriceMmk: number
  lineTotalMmk: number
}

export type OfflineStatus = 'syncing' | 'offline-completed'

export interface Sale {
  idempotencyKey: string
  totalMmk: number
  completedBy: string
  completedByName: string
  createdAt: string
  items: SaleItem[]
}

export interface ReceiptLineItem {
  name: string
  qty: number
  unitPriceMmk: number
  lineTotalMmk: number
}

export interface SaleReceipt {
  header: { shopName: string; saleTime: string; completedByName: string }
  items: ReceiptLineItem[]
  totalMmk: number
}

export type PendingState = 'pending' | 'syncing' | 'done' | 'failed'

export interface PendingSaleRecord {
  idempotencyKey: string
  payload: Sale
  state: PendingState
  attempts: number
  lastError: string | null
  syncedAt: string | null
}

/** Local IndexedDB row shape (camelCase) removed; products are stored as-is. */
export interface ProductPatch {
  name?: string
  priceMmk?: number
  imageUrl?: string | null
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// Admin read models (feature 002) — see specs/002-admin-sales-reports/data-model.md
// ---------------------------------------------------------------------------

export type PeriodKey = 'day' | 'week' | 'month'

export interface ReportDay {
  d: string // YYYY-MM-DD (shop tz)
  totalMmk: number
  count: number
}

export interface ReportStaff {
  staffId: string
  name: string
  totalMmk: number
  count: number
}

export interface PeriodReport {
  from: string
  to: string
  tz: string
  totalMmk: number
  saleCount: number
  perDay: ReportDay[]
  perStaff: ReportStaff[]
}

export interface SaleHeader {
  id: string
  createdAt: string
  totalMmk: number
  completedByName: string
  itemCount: number
}

export interface SaleDetailItem {
  id: string
  productId: string | null
  nameSnapshot: string
  imageSnapshot: string | null
  qty: number
  unitPriceMmk: number
  lineTotalMmk: number
}

export interface SaleDetail {
  id: string
  createdAt: string
  totalMmk: number
  status: 'completed' | 'void'
  completedByName: string
  items: SaleDetailItem[]
}
