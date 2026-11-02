import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '../types/domain'

export interface CartState {
  items: CartItem[]
  addItem: (product: {
    id: string
    name: string
    priceMmk: number
    imageUrl: string | null
  }) => void
  setQty: (productId: string, qty: number) => void
  removeItem: (productId: string) => void
  clear: () => void
}

const MAX_QTY = 9999

/** Cart survives reload (FR-016). Tap-tap-merge: same product increments qty (FR-005). */
export const useCartStore = create<CartState>()(
  persist(
    (setState) => ({
      items: [],
      addItem: (product) =>
        setState((state) => {
          const existing = state.items.find((i) => i.productId === product.id)
          if (existing) {
            // Same product tapped again → qty++ (FR-005), never duplicate line
            const newQty = Math.min(MAX_QTY, existing.qty + 1)
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, qty: newQty, lineTotalMmk: i.unitPriceMmk * newQty }
                  : i
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                nameSnapshot: product.name,
                imageSnapshot: product.imageUrl,
                qty: 1,
                unitPriceMmk: product.priceMmk,
                lineTotalMmk: product.priceMmk * 1,
              },
            ],
          }
        }),
      setQty: (productId, qty) =>
        setState((state) => {
          const nextQty = Math.min(MAX_QTY, Math.max(0, Math.floor(qty)))
          const items =
            nextQty === 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, qty: nextQty, lineTotalMmk: i.unitPriceMmk * nextQty }
                    : i
                )
          return { items }
        }),
      removeItem: (productId) =>
        setState((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      clear: () => setState({ items: [] }),
    }),
    {
      name: 'pos-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
