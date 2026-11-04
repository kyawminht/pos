/** Integration: sale confirm flow against the local IndexedDB store (MVP). */
import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '../../state/useCartStore'
import { fmtMMK, calcCartTotal } from '../../utils/mmk'
import { randomUUID } from '../../utils/idempotency'
import { confirmSale, getSale } from '../../services/saleService'

beforeEach(async () => {
  useCartStore.setState({ items: [] })
  localStorage.clear()
  await new Promise((r) => setTimeout(r, 0))
})

describe('sale confirm flow (US4, local storage MVP)', () => {
  it('happy path: cart items → sale payload with recomputed total', async () => {
    const { addItem } = useCartStore.getState()
    addItem({ id: 'p1', name: 'ဆီမင့်', priceMmk: 9500, imageUrl: null })
    addItem({ id: 'p1', name: 'ဆီမင့်', priceMmk: 9500, imageUrl: null })
    const items = useCartStore.getState().items
    const total = calcCartTotal(items)
    expect(total).toBe(19000)

    const res = await confirmSale({
      idempotencyKey: randomUUID(),
      totalMmk: total,
      completedBy: 'local-device',
      completedByName: 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁',
      createdAt: new Date().toISOString(),
      items,
    })
    expect(res.offline).toBe(false)
    expect(res.saleId).toBeTypeOf('string')
    const stored = await getSale(res.saleId as string)
    expect(stored?.items).toHaveLength(1)
    expect(stored?.items[0].qty).toBe(2)
    expect(fmtMMK(19000)).toContain('19,000 ကျပ်')
  })

  it('same idempotency key confirmed twice stays a single record (FR-010)', async () => {
    const sale = {
      idempotencyKey: randomUUID(),
      totalMmk: 19000,
      completedBy: 'u1',
      completedByName: 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁',
      createdAt: new Date().toISOString(),
      items: [
        { productId: 'p1', nameSnapshot: 'ဆီမင့်', imageSnapshot: null, qty: 2, unitPriceMmk: 9500, lineTotalMmk: 19000 },
      ],
    }
    await confirmSale(sale)
    await confirmSale(sale)
    const again = await getSale(sale.idempotencyKey)
    expect(again?.idempotencyKey).toBe(sale.idempotencyKey)
  })

  it('TOTAL_MISMATCH is rejected at the local write (contracts/sales.api.md)', async () => {
    const items = [{ productId: 'p1', nameSnapshot: 'ဆီမင့်', imageSnapshot: null, qty: 1, unitPriceMmk: 9500, lineTotalMmk: 9500 }]
    await expect(
      confirmSale({ idempotencyKey: randomUUID(), totalMmk: 19000, completedBy: 'u1', completedByName: 'x', createdAt: new Date().toISOString(), items })
    ).rejects.toMatchObject({ code: 'TOTAL_MISMATCH' })
  })

  it('EMPTY_SALE is blocked at the service layer', async () => {
    await expect(
      confirmSale({ idempotencyKey: randomUUID(), totalMmk: 0, completedBy: 'u1', completedByName: 'x', createdAt: new Date().toISOString(), items: [] })
    ).rejects.toMatchObject({ code: 'EMPTY_SALE' })
  })
})
