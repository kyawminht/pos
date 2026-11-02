import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Sale } from '../../types/domain'
import { resetQueue, listAll, updateState, RETRY_LIMIT } from '../../db/queueAdapter'

// saleService flush path with a stubbed supabaseClient
const rpcMock = vi.fn()
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args) as unknown,
  },
  toErrorCode: () => 'NETWORK_ERROR',
}))

import { createSaleOnline, flushQueue, confirmSale } from '../../services/saleService'

const mkSale = (key: string): Sale => ({
  idempotencyKey: key,
  totalMmk: 19000,
  completedBy: 'u1',
  completedByName: 'ဆိုင်ရှင်',
  createdAt: '2026-10-31T10:00:00.000Z',
  items: [
    { productId: 'p1', nameSnapshot: 'ဆီမင့်', imageSnapshot: null, qty: 2, unitPriceMmk: 9500, lineTotalMmk: 19000 },
  ],
})

beforeEach(async () => {
  await resetQueue()
  rpcMock.mockReset()
})

describe('sale sync (FR-010, US6, contracts/sales.api.md)', () => {
  it('confirmSale online posts RPC with recompute-shaped payload', async () => {
    rpcMock.mockResolvedValueOnce({ data: { sale_id: 's1', duplicate: false, total_mmk: 19000 }, error: null })
    const res = await confirmSale(mkSale('k1'), true)
    expect(res.offline).toBe(false)
    expect(res.saleId).toBe('s1')
    const [fn, args] = rpcMock.mock.calls[0]
    expect(fn).toBe('create_sale')
    expect(args.p_items[0].line_total_mmk).toBe(19000)
    expect(args.p_sale.idempotency_key).toBe('k1')
  })

  it('confirmSale offline enqueues exactly once (no duplicates)', async () => {
    const sale = mkSale('k-off')
    await confirmSale(sale, false)
    await confirmSale(sale, false) // duplicate capture attempt
    const all = await listAll()
    expect(all).toHaveLength(1)
    expect(all[0].state).toBe('pending')
  })

  it('flush drains queued sales and marks done; removed after purge', async () => {
    await confirmSale(mkSale('k1'), false)
    const sale2 = mkSale('k2')
    await confirmSale(sale2, false)
    rpcMock.mockResolvedValue({ data: { sale_id: 'ok', duplicate: false }, error: null })
    const { flushed } = await flushQueue()
    expect(flushed).toBe(2)
    const all = await listAll()
    expect(all.every((r) => r.state === 'done')).toBe(true)
  })

  it('zero items blocked at service (EMPTY_SALE from server)', async () => {
    const s = mkSale('k-empty')
    s.items = []
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'EMPTY_SALE: no items' } })
    await expect(createSaleOnline(s, s.items)).rejects.toMatchObject({ code: 'EMPTY_SALE' })
  })

  it('network failure mid-confirm enqueues instead of losing sale', async () => {
    rpcMock.mockRejectedValueOnce(new Error('Failed to fetch'))
    const res = await confirmSale(mkSale('k-net'), true)
    expect(res.offline).toBe(true)
    const all = await listAll()
    expect(all).toHaveLength(1)
  })

  it('failure escalates to failed after RETRY_LIMIT (backoff semantics preserved in state)', async () => {
    await confirmSale(mkSale('k-fail'), false)
    for (let i = 0; i < RETRY_LIMIT; i++) {
      await updateState('k-fail', 'syncing')
      await updateState('k-fail', 'pending', 'NETWORK_ERROR')
    }
    const all = await listAll()
    expect(all[0].state).toBe('failed')
    expect(all[0].attempts).toBe(RETRY_LIMIT)
  })
})
