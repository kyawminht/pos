/**
 * Minimal IndexedDB storage for the local-first MVP (FR-008/FR-016).
 *
 * Stores:
 *  - 'kv'         : TanStack Query cache ('query-cache'), misc values
 *  - 'products'   : full product catalog, keyPath 'id'
 *  - 'sales'      : completed sale history, keyPath 'idempotencyKey'
 *
 * All writes are local; there is no cloud backend in the MVP.
 */

import type { Product, Sale } from '../types/domain'

const DB_NAME = 'pos-offline'
const DB_VERSION = 2
const KV_STORE = 'kv'
const PRODUCTS_STORE = 'products'
const SALES_STORE = 'sales'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE)
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        // Sale records keyed by their idempotency key — unique insert prevents duplicates
        db.createObjectStore(SALES_STORE, { keyPath: 'idempotencyKey' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

// ---------------------------------------------------------------------------
// KV helpers (query cache, misc)
// ---------------------------------------------------------------------------

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readonly')
      const req = tx.objectStore(KV_STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readwrite')
      const req = tx.objectStore(KV_STORE).put(value, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // storage unavailable (private mode) — degrade gracefully, data stays in memory
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readwrite')
      const req = tx.objectStore(KV_STORE).delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Generic record-store helpers (products, sales). Records carry their 'id'.
// ---------------------------------------------------------------------------

async function recordGet<T>(storeName: string, id: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(id)
      req.onsuccess = () => resolve((req.result ?? undefined) as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

async function recordPut(storeName: string, record: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function recordDelete(storeName: string, id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function recordAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve((req.result ?? []) as T[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export const productStore = {
  all: () => recordAll<Product>('products'),
  get: (id: string) => recordGet<Product>('products', id),
  put: (record: Product) => recordPut('products', record),
  delete: (id: string) => recordDelete('products', id),
}

export const saleStore = {
  all: () => recordAll<Sale>('sales'),
  get: (idempotencyKey: string) => recordGet<Sale>('sales', idempotencyKey),
  put: (record: Sale) => recordPut('sales', record),
  delete: (idempotencyKey: string) => recordDelete('sales', idempotencyKey),
}
