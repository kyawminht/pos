import type { Product } from '../types/domain'
import { productStore } from '../db/offlineStore'
import { fileToDataUrl } from './imageDataService'

export interface SearchableProduct {
  id: string
  name: string
  priceMmk: number
  imageUrl: string | null
}

type ServiceError = { code: string }
export const err = (code: string): ServiceError => ({ code })

/**
 * All product data lives in the local IndexedDB `products` store — the whole
 * app is offline-first; there is no cloud backend in the MVP.
 */

/** listActive: active products, newest-updated first. */
export async function listActive(): Promise<Product[]> {
  const all = await productStore.all()
  return all.filter((p) => p.isActive).sort(byUpdatedDesc)
}

// ---------------------------------------------------------------------------
// Search (research R5): client-side, offline, Burmese-friendly
// ---------------------------------------------------------------------------

const isMyanmarCombining = (cp: number): boolean =>
  (cp >= 0x102b && cp <= 0x103e) ||
  (cp >= 0x1056 && cp <= 0x1059) ||
  (cp >= 0x105a && cp <= 0x105b) ||
  (cp >= 0x1078 && cp <= 0x107f) ||
  (cp >= 0x1087 && cp <= 0x108f)

export function normalizeBurmese(s: string): string {
  return [...s]
    .filter((ch) => !isMyanmarCombining(ch.codePointAt(0)!))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Matches products from a 1–2 word fragment; every typed word must be found. */
export function searchLocal(products: SearchableProduct[], query: string): SearchableProduct[] {
  const words = normalizeBurmese(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  return products.filter((p) => {
    const hay = normalizeBurmese(p.name)
    return words.every((w) => hay.includes(w))
  })
}

// ---------------------------------------------------------------------------
// Update price (easy price change for sale staff/admin)
// ---------------------------------------------------------------------------

export async function updateProductPrice(id: string, priceMmk: number): Promise<void> {
  if (!Number.isInteger(priceMmk) || priceMmk < 1) throw err('PRICE_INVALID')
  const existing = await productStore.get(id)
  if (!existing) throw err('UNKNOWN')
  await productStore.put({ ...existing, priceMmk, updatedAt: new Date().toISOString() })
}

// ---------------------------------------------------------------------------
// Images: stored as compressed data URLs directly on the product record
// ---------------------------------------------------------------------------

export async function uploadProductImage(file: File): Promise<string | null> {
  if (!file) return null
  try {
    return await fileToDataUrl(file)
  } catch {
    throw err('IMAGE_UNREADABLE')
  }
}

// ---------------------------------------------------------------------------
// Admin: list all (incl. inactive), update, activate/deactivate, create
// ---------------------------------------------------------------------------

export async function listAllProducts(): Promise<Product[]> {
  const all = await productStore.all()
  return all.sort(byUpdatedDesc)
}

function byUpdatedDesc(a: Product, b: Product): number {
  return b.updatedAt.localeCompare(a.updatedAt)
}

export interface ProductPatch {
  name?: string
  priceMmk?: number
  imageUrl?: string | null
  isActive?: boolean
}

export async function updateProduct(id: string, patch: ProductPatch): Promise<Product> {
  if (patch.name !== undefined && !patch.name.trim()) throw err('NAME_REQUIRED')
  if (patch.priceMmk !== undefined && (!Number.isInteger(patch.priceMmk) || patch.priceMmk < 1 || patch.priceMmk > 9_999_999_999)) {
    throw err('PRICE_INVALID')
  }
  const existing = await productStore.get(id)
  if (!existing) throw err('UNKNOWN')
  const updated: Product = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    priceMmk: patch.priceMmk !== undefined ? patch.priceMmk : existing.priceMmk,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : existing.imageUrl,
    isActive: patch.isActive !== undefined ? patch.isActive : existing.isActive,
    updatedAt: new Date().toISOString(),
  }
  await productStore.put(updated)
  return updated
}

export async function setActive(id: string, isActive: boolean): Promise<Product> {
  return updateProduct(id, { isActive })
}

// Create (US5, FR-013) — image compress-first policy handled in imageUtils
// ---------------------------------------------------------------------------

export async function createProduct(input: {
  name: string
  priceMmk: number
  imageFile?: File | null
  createdBy?: string | null
}): Promise<Product> {
  const name = input.name?.trim() as string
  if (!name) throw err('NAME_REQUIRED')
  if (!Number.isInteger(input.priceMmk) || input.priceMmk < 1) throw err('PRICE_INVALID')

  let imageUrl: string | null = null
  if (input.imageFile) {
    imageUrl = await uploadProductImage(input.imageFile)
  }

  const now = new Date().toISOString()
  const product: Product = {
    id: globalThis.crypto.randomUUID(),
    name,
    priceMmk: input.priceMmk,
    imageUrl,
    isActive: true,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await productStore.put(product)
  return product
}
