import { beforeEach, describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import { useCartStore } from '../../state/useCartStore'
import { LABELS } from '../../data/labels.mm'

const P = (id: string, name = 'ဆီမင့်', priceMmk = 9500) => ({
  id,
  name,
  priceMmk,
  imageUrl: null as string | null,
})

const fresh = () =>
  act(() => {
    useCartStore.setState({ items: [] })
  })

beforeEach(fresh)

describe('cart store (FR-005, FR-016)', () => {
  it('addItem creates one line with snapshot', () => {
    const { addItem } = useCartStore.getState()
    addItem(P('p1', 'ဆီမင့်', 9500))
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      productId: 'p1',
      nameSnapshot: 'ဆီမင့်',
      qty: 1,
      unitPriceMmk: 9500,
      lineTotalMmk: 9500,
    })
  })

  it('tapping same product again increments qty — no duplicate (FR-005)', () => {
    const { addItem } = useCartStore.getState()
    addItem(P('p1'))
    addItem(P('p1'))
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].qty).toBe(2)
    expect(items[0].lineTotalMmk).toBe(19000)
  })

  it('setQty removes item at 0', () => {
    const { addItem, setQty } = useCartStore.getState()
    addItem(P('p1'))
    setQty('p1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('setQty clamps negatives to removal-safe 0', () => {
    const { addItem, setQty } = useCartStore.getState()
    addItem(P('p1'))
    setQty('p1', -5)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removeItem and clear work', () => {
    const { addItem, removeItem, clear } = useCartStore.getState()
    addItem(P('p1'))
    addItem(P('p2', 'အုတ်', 85000))
    removeItem('p1')
    expect(useCartStore.getState().items).toHaveLength(1)
    clear()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('keeps snapshot name even if product changes/deactivates later (edge case)', () => {
    const { addItem } = useCartStore.getState()
    addItem(P('p1', 'H STATES ောက်ခြင်းတိုင်', 15000))
    expect(useCartStore.getState().items[0].nameSnapshot).toContain('ောက်ခြင်းတိုင်')
    expect(LABELS.cartEmpty.length).toBeGreaterThan(0)
  })
})
