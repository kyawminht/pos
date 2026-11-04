import { SHOP_TZ } from '../hooks/usePeriod'
import type { PeriodReport, SaleDetail, SaleHeader, PeriodKey } from '../types/domain'
import { saleStore } from '../db/offlineStore'

interface ServiceError {
  code: string
}
const err = (code: string): ServiceError => ({ code })

export const reportKey = (from: string, to: string) => ['report', from, to, SHOP_TZ] as const
export const salesKey = (from: string, to: string, page: number) => ['admin', 'sales', from, to, page] as const
export const saleDetailKey = (id: string) => ['admin', 'sale', id] as const

export const SALES_PAGE_SIZE = 25

/**
 * Reports are computed from the locally stored sales (IndexedDB `sales`
 * store) — no RPCs in the MVP. Day buckets follow the shop timezone.
 */

/** YYYY-MM-DD of an ISO timestamp in the shop timezone. */
export function shopDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(new Date(iso))
}

function inRange(iso: string, from: string, to: string): boolean {
  const day = shopDay(iso)
  return day >= from && day <= to
}

/** Aggregate period report over locally stored sales. */
export async function reportPeriod(from: string, to: string): Promise<PeriodReport> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw err('UNKNOWN')
  const all = await saleStore.all()
  const range = all.filter((s) => inRange(s.createdAt, from, to))

  const dayMap = new Map<string, { totalMmk: number; count: number }>()
  const staffMap = new Map<string, { name: string; totalMmk: number; count: number }>()
  let totalMmk = 0
  let saleCount = 0

  for (const s of range) {
    const total = Number(s.totalMmk) || 0
    totalMmk += total
    saleCount += 1
    const d = shopDay(s.createdAt)
    const dayAgg = dayMap.get(d) ?? { totalMmk: 0, count: 0 }
    dayAgg.totalMmk += total
    dayAgg.count += 1
    dayMap.set(d, dayAgg)

    const staffId = s.completedBy || 'local'
    const staffAgg = staffMap.get(staffId) ?? { name: s.completedByName, totalMmk: 0, count: 0 }
    staffAgg.totalMmk += total
    staffAgg.count += 1
    staffMap.set(staffId, staffAgg)
  }

  return {
    from,
    to,
    tz: SHOP_TZ,
    totalMmk,
    saleCount,
    perDay: [...dayMap.entries()]
      .map(([d, v]) => ({ d, totalMmk: v.totalMmk, count: v.count }))
      .sort((a, b) => a.d.localeCompare(b.d)),
    perStaff: [...staffMap.entries()]
      .map(([staffId, v]) => ({ staffId, name: v.name, totalMmk: v.totalMmk, count: v.count }))
      .sort((a, b) => b.totalMmk - a.totalMmk),
  }
}

/** Local sales list, newest first, client-side pagination. */
export async function salesInPeriod(from: string, to: string, page: number): Promise<SaleHeader[]> {
  if (page < 0) throw err('UNKNOWN')
  const all = await saleStore.all()
  return all
    .filter((s) => inRange(s.createdAt, from, to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(page * SALES_PAGE_SIZE, (page + 1) * SALES_PAGE_SIZE)
    .map((s) => ({
      id: s.idempotencyKey,
      createdAt: s.createdAt,
      totalMmk: Number(s.totalMmk),
      completedByName: s.completedByName,
      itemCount: s.items.reduce((n, i) => n + i.qty, 0),
    }))
}

/** Snapshot-frozen sale detail from the local store. */
export async function saleDetail(id: string): Promise<SaleDetail> {
  const s = await saleStore.get(id)
  if (!s) throw err('UNKNOWN')
  return {
    id: s.idempotencyKey,
    createdAt: s.createdAt,
    totalMmk: Number(s.totalMmk),
    status: 'completed',
    completedByName: s.completedByName,
    items: s.items.map((i, idx) => ({
      id: `${s.idempotencyKey}-${idx}`,
      productId: i.productId,
      nameSnapshot: i.nameSnapshot,
      imageSnapshot: i.imageSnapshot,
      qty: i.qty,
      unitPriceMmk: Number(i.unitPriceMmk),
      lineTotalMmk: Number(i.lineTotalMmk),
    })),
  }
}

export type { PeriodKey }
