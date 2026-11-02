import { supabase } from './supabaseClient'
import type { Sale, SaleItem } from '../types/domain'
import { enqueue, peekNext, markSyncing, updateState, countPending } from '../db/queueAdapter'

type ServiceError = { code: string }
export const err = (code: string): ServiceError => ({ code })

/** Idempotent, atomic sale insert (contracts/sales.api.md). */
export async function createSaleOnline(sale: Sale, items: SaleItem[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_sale', {
    p_sale: {
      idempotency_key: sale.idempotencyKey,
      total_mmk: sale.totalMmk,
      completed_by: sale.completedBy,
      created_at: sale.createdAt,
    },
    p_items: items.map((i) => ({
      product_id: i.productId,
      product_name_snapshot: i.nameSnapshot,
      image_url_snapshot: i.imageSnapshot,
      qty: i.qty,
      unit_price_mmk: i.unitPriceMmk,
      line_total_mmk: i.lineTotalMmk,
    })),
  })
  if (error) {
    if (/TOTAL_MISMATCH/.test(error.message)) throw err('TOTAL_MISMATCH')
    if (/EMPTY_SALE/.test(error.message)) throw err('EMPTY_SALE')
    throw err('NETWORK_ERROR')
  }
  return data.sale_id
}

/** confirmSale: online direct, offline enqueue. Returns offline flag (US4). */
export async function confirmSale(sale: Sale, isOnline: boolean): Promise<{ saleId: string | null; offline: boolean }> {
  if (!isOnline) {
    // Enqueue with idempotency — duplicate capture guarded in queueAdapter
    await enqueue(sale, sale.idempotencyKey)
    return { saleId: null, offline: true }
  }
  try {
    const saleId = await createSaleOnline(sale, sale.items)
    return { saleId, offline: false }
  } catch (e) {
    const code = (e as ServiceError).code
    if (code === 'NETWORK_ERROR' || code === undefined) {
      // Unknown/raw network-style errors are retryable → offline queue
      await enqueue(sale, sale.idempotencyKey)
      return { saleId: null, offline: true }
    }
    throw e
  }
}

/** Flush the offline queue (US6): oldest-first, one RPC per record, where dup = done. */
export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  let flushed = 0
  let failed = 0
  while (true) {
    const rec = await peekNext()
    if (!rec) break
    await markSyncing(rec.idempotencyKey)
    try {
      await createSaleOnline(rec.payload, rec.payload.items)
      await updateState(rec.idempotencyKey, 'done')
      flushed++
    } catch (e) {
      const code = (e as ServiceError).code
      failed++
      // retryable → back to 'pending' (updateState escalates to 'failed' after RETRY_LIMIT)
      await updateState(rec.idempotencyKey, 'pending', code)
      break
    }
  }
  return { flushed, failed }
}

export { countPending }
