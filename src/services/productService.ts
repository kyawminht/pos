import { supabase } from './supabaseClient'
import type { Product, ProductRow } from '../types/domain'

export interface SearchableProduct {
  id: string
  name: string
  priceMmk: number
  imageUrl: string | null
}

type ServiceError = { code: string }
export const err = (code: string): ServiceError => ({ code })

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    priceMmk: r.price_mmk,
    imageUrl: r.image_url,
    isActive: r.is_active,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** listActive (contracts/products.api.md) */
export async function listActive(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
  if (error) throw err('NETWORK_ERROR')
  return (data ?? []).map(rowToProduct)
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
// ---------------------------------------------------------------------------
// Update price (easy price change for sale staff/admin)
// ---------------------------------------------------------------------------

export async function updateProductPrice(id: string, priceMmk: number): Promise<void> {
  if (!Number.isInteger(priceMmk) || priceMmk < 1) throw err('PRICE_INVALID')
  const { error } = await supabase.from('products').update({ price_mmk: priceMmk }).eq('id', id)
  if (error) throw err('PERMISSION_DENIED')
}

// ---------------------------------------------------------------------------
// Image upload (Supabase Storage bucket `products`; DB stores URL text only)
// ---------------------------------------------------------------------------

export async function uploadProductImage(file: File): Promise<string | null> {
  if (!file) return null
  const path = `products/${globalThis.crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('products')
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw err('IMAGE_UNREADABLE')
  return supabase.storage.from('products').getPublicUrl(path).data.publicUrl
}

// ---------------------------------------------------------------------------
// Admin: list all (incl. inactive), update, activate/deactivate
// ---------------------------------------------------------------------------

export async function listAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('updated_at', { ascending: false })
  if (error) throw err('NETWORK_ERROR')
  return (data ?? []).map(rowToProduct)
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

  const { data, error } = await supabase.rpc('admin_update_product', {
    p_id: id,
    p_name: patch.name ?? null,
    p_price_mmk: patch.priceMmk ?? null,
    p_image_url: patch.imageUrl ?? null,
    p_is_active: patch.isActive ?? null,
  })
  if (error) {
    if (/NAME_REQUIRED/.test(error.message)) throw err('NAME_REQUIRED')
    if (/PRICE_INVALID/.test(error.message)) throw err('PRICE_INVALID')
    if (/FORBIDDEN/.test(error.message)) throw err('PERMISSION_DENIED')
    throw err('NETWORK_ERROR')
  }
  const r = data as { id: string; name: string; price_mmk: number; image_url: string | null; is_active: boolean }
  return {
    id: r.id,
    name: r.name,
    priceMmk: Number(r.price_mmk),
    imageUrl: r.image_url,
    isActive: r.is_active,
    createdBy: null,
    createdAt: '',
    updatedAt: new Date().toISOString(),
  }
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

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      price_mmk: input.priceMmk,
      image_url: imageUrl,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()
  if (error) throw err('NETWORK_ERROR')
  return rowToProduct(data)
}
