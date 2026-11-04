import { useState, useEffect } from 'react'

/**
 * navigator.onLine + window events, plus a lightweight local-asset HEAD ping
 * every 30s to catch hotspot-without-internet cases.
 *
 * MVP note: nothing depends on connectivity — products and sales live in
 * local IndexedDB. The status is surfaced only as a passive indicator.
 */
export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const ping = () => {
      // A failed ping only downgrades when navigator.saysOnline
      if (!navigator.onLine) return
      fetch('/favicon.svg', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false))
    }
    const t = setInterval(ping, 30000)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(t)
    }
  }, [])

  return { isOnline }
}
