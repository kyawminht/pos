import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { idbDelete, idbGet, idbSet } from '../db/offlineStore'

const CACHE_KEY = 'query-cache'

/**
 * TanStack Query persister over IndexedDB (constitution: offline catalog data
 * lives in IndexedDB, research R3). Reserved for synchronous contexts.
 */
export function createIndexedDbPersister(): Persister {
  return {
    persistClient: (client: PersistedClient) => idbSet(CACHE_KEY, client),
    restoreClient: async () => (await idbGet<PersistedClient>(CACHE_KEY)) ?? undefined,
    removeClient: () => idbDelete(CACHE_KEY),
  }
}
