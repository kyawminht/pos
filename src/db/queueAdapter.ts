import type { PendingSaleRecord, PendingState, Sale } from '../types/domain'
import { idbGet, idbSet, idbDelete } from './offlineStore'

const QUEUE_KEY = 'offline-sale-queue'
export const RETRY_LIMIT = 5

/** In-memory mirror so tests + UI stay reactive without awaiting IDB repeatedly. */
let cache: PendingSaleRecord[] | null = null

function emptyList(): PendingSaleRecord[] {
  return []
}

async function load(): Promise<PendingSaleRecord[]> {
  if (cache) return cache
  cache = (await idbGet<PendingSaleRecord[]>(QUEUE_KEY)) ?? emptyList()
  return cache
}

async function save(list: PendingSaleRecord[]): Promise<void> {
  cache = list
  await idbSet(QUEUE_KEY, list)
}

/** Contains duplicate in queue
 * enqueue(payload): returns null if already queued; Otherwise no action is taken. */
export async function enqueue(payload: Sale, idempotencyKey: string): Promise<void> {
  const list = await load()
  // Idempotency at capture (FR-010, edge case): same sale enqueued twice must remain one record
  if (list.some((r) => r.idempotencyKey === idempotencyKey)) return
  const record: PendingSaleRecord = {
    idempotencyKey,
    payload,
    state: 'pending',
    attempts: 0,
    lastError: null,
    syncedAt: null,
  }
  list.push(record)
  await save(list)
}

export async function listPending(): Promise<PendingSaleRecord[]> {
  const list = await load()
  return list.filter((r) => r.state === 'pending' || r.state === 'failed' || r.state === 'syncing')
}

export async function listAll(): Promise<PendingSaleRecord[]> {
  return [...(await load())]
}

export async function countPending(): Promise<number> {
  return (await listPending()).length
}

/**
 * Returns the next pending record, or null when empty.
 * 'syncing' records left behind by a mid-flight crash are retried (recovery).
 * Caller MUST call updateState() afterwards (success/duplicate → done, failure → re-pending/failed).
 */
export async function peekNext(): Promise<PendingSaleRecord | null> {
  const list = await load()
  const rec = list.find((r) => r.state === 'pending' || r.state === 'failed' || r.state === 'syncing')
  return rec ?? null
}

export async function markSyncing(idempotencyKey: string): Promise<void> {
  const list = await load()
  const rec = list.find((r) => r.idempotencyKey === idempotencyKey)
  if (rec && rec.state !== 'done') {
    rec.state = 'syncing'
    await save(list)
  }
}

export async function updateState(
  idempotencyKey: string,
  state: PendingState,
  lastError: string | null = null
): Promise<void> {
  const list = await load()
  const rec = list.find((r) => r.idempotencyKey === idempotencyKey)
  if (!rec) return
  rec.state = state
  rec.lastError = lastError
  if (state === 'syncing') rec.attempts += 1
  if (state === 'done') rec.syncedAt = new Date().toISOString()
  if (state === 'pending') rec.state = rec.attempts >= RETRY_LIMIT ? 'failed' : 'pending'
  await save(list)
}

export async function remove(idempotencyKey: string): Promise<void> {
  const list = await load()
  await save(list.filter((r) => r.idempotencyKey !== idempotencyKey))
}

/** Purge terminal 'done' records older than 7 days (contracts/sales.api.md). */
export async function purgeDone(olderThanMs = 7 * 24 * 3600 * 1000): Promise<void> {
  const list = await load()
  const now = Date.now()
  const keep = list.filter((r) => {
    if (r.state !== 'done') return true
    if (!r.syncedAt) return false
    return now - new Date(r.syncedAt).getTime() < olderThanMs
  })
  if (keep.length !== list.length) await save(keep)
}

export async function clearFailed(idempotencyKey?: string): Promise<void> {
  if (idempotencyKey) await remove(idempotencyKey)
  else await idbDelete(QUEUE_KEY)
  cache = null
}

/** Test helper. */
export async function resetQueue(): Promise<void> {
  cache = null
  await idbDelete(QUEUE_KEY)
}
