import type { Sale } from '../types/domain'
import { saleStore } from '../db/offlineStore'

type ServiceError = { code: string }
export const err = (code: string): ServiceError => ({ code })

/**
 * MVP storage model (contracts/sales.api.md): every confirmed sale is written
 * straight to the local IndexedDB `sales` store. The idempotency key is the
 * record key, so retrying the same sale can never create a duplicate.
 */

/** Atomic local insert of a complete sale. Returns the stored sale key. */
export async function putSale(sale: Sale): Promise<string> {
  if (!sale.items.length) throw err('EMPTY_SALE')
  const recomputed = sale.items.reduce((n, i) => n + i.lineTotalMmk, 0)
  if (recomputed !== sale.totalMmk) throw err('TOTAL_MISMATCH')
  await saleStore.put(sale)
  return sale.idempotencyKey
}

/**
 * confirmSale: saves the sale locally and finalizes it immediately.
 * Kept returning `{ saleId, offline }` shape to match the order flow contract;
 * in the MVP there is no cloud push, so `offline` is always false.
 */
export async function confirmSale(sale: Sale): Promise<{ saleId: string | null; offline: boolean }> {
  const saleId = await putSale(sale)
  return { saleId, offline: false }
}

/** Total across all locally stored sales between two ISO dates (inclusive). */
export async function sumSales(fromIso: string, toIso: string): Promise<number> {
  const all = await saleStore.all()
  return all
    .filter((s) => s.createdAt >= fromIso && s.createdAt <= toIso)
    .reduce((n, s) => n + s.totalMmk, 0)
}

export async function getSale(idempotencyKey: string): Promise<Sale | undefined> {
  return saleStore.get(idempotencyKey)
}
