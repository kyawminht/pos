import { useCallback, useEffect, useState } from 'react'
import { useNetworkStatus } from './useNetworkStatus'
import { countPending } from '../db/queueAdapter'

export interface SyncQueueState {
  isOnline: boolean
  pendingCount: number
  refresh: () => void
}

/** Parses pending sale count for the sticky indicator (T030). */
export function useSyncQueue(): SyncQueueState {
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)

  const refresh = useCallback(() => {
    countPending()
      .then(setPendingCount)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)  // matches syncService cadence loosely
    window.addEventListener('online', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('online', refresh)
    }
  }, [refresh, isOnline])

  return { isOnline, pendingCount, refresh }
}
