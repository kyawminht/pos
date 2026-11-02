/** Integration: sale confirm flow with mocked supabase-js (T025). */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCartStore } from '../../state/useCartStore'
import { fmtMMK, calcCartTotal } from '../../utils/mmk'
import { randomUUID } from '../../utils/idempotency'

const rpcMock = vi.fn()
vi.mock('../../services/supabaseClient', () => ({
    supabase: { rpc: (...a: unknown[]) => rpcMock(...a) as unknown },
  toErrorCode: () => 'UNKNOWN',
}))

import { confirmSale } from '../../services/saleService'

beforeEach(() => {
  useCartStore.setState({ items: [] })
  rpcMock.mockReset()
})

describe('sale confirm flow (US4, spec S6/S7)', () => {
  it('happy path: cart items → sale payload with recomputed total', async () => {
    const { addItem } = useCartStore.getState()
    addItem({ id: 'p1', name: 'ဆီမင့်', priceMmk: 9500, imageUrl: null })
    addItem({ id: 'p1', name: 'ဆီမင့်', priceMmk: 9500, imageUrl: null })
    const items = useCartStore.getState().items
    const total = calcCartTotal(items)
    expect(total).toBe(19000)
    rpcMock.mockResolvedValueOnce({ data: { sale_id: 's1', duplicate: false, total_mmk: 19000 }, error: null })

    const res = await confirmSale(
      {
        idempotencyKey: randomUUID(),
        totalMmk: total,
        completedBy: 'u1',
        completedByName: 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁',
        createdAt: new Date().toISOString(),
        items,
      },
      true
    )
    expect(res.offline).toBe(false)
    expect(res.saleId).toBe('s1')
    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(fmtMMK(19000)).toContain('19,000 ကျပ်')
  })

  it('offline: enqueued, cart can then be cleared safely (queue owns the data)', async () => {
    const { addItem } = useCartStore.getState()
    addItem({ id: 'p2', name: 'အုတ် ၁၀၀၀', priceMmk: 85000, imageUrl: null })
    const items = useCartStore.getState().items
    const res = await confirmSale(
      {
        idempotencyKey: randomUUID(),
        totalMmk: calcCartTotal(items),
        completedBy: 'u1',
        completedByName: 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁',
        createdAt: new Date().toISOString(),
        items,
      },
      false
    )
    expect(res.offline).toBe(true)
    expect(useCartStore.getState().items.length).toBe(1) // clear happens in page after resolve
  })

  it('server TOTAL_MISMATCH surfaces as retryable UI error, not enqueue', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'TOTAL_MISMATCH: client total does not match item sum' } })
    const items = [{ productId: 'p1', nameSnapshot: 'ဆီမင့်', imageSnapshot: null, qty: 1, unitPriceMmk: 9500, lineTotalMmk: 9500 }]
    await expect(
      confirmSale(
        { idempotencyKey: randomUUID(), totalMmk: 19000, completedBy: 'u1', completedByName: 'x', createdAt: new Date().toISOString(), items },
        true
      )
    ).rejects.toMatchObject({ code: 'TOTAL_MISMATCH' })
  })
})
