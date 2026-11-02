import { useEffect, useState } from 'react'
import type { UserSession } from '../types/domain'
import { getSession } from '../services/authService'

/** Cached-first session (instant offline), used by guards and the app shell. */
export function useSession(): UserSession | null | 'loading' {
  const [session, setSession] = useState<UserSession | null | 'loading'>('loading')
  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (alive) setSession(s)
    })
    return () => {
      alive = false
    }
  }, [])
  return session
}
