import { useEffect, useState, type ReactNode, type JSX } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import type { UserSession } from '../types/domain'

/**
 * Where a visitor of /admin should be sent (null = allowed).
 * Exported for unit tests (FR-201).
 */
export function guardRedirect(session: UserSession | null | 'loading'): string | null {
  if (session === 'loading') return null
  if (!session) return '/login'
  if (session.role !== 'admin') return '/'
  return null
}

export function AdminGuard({ children }: { children: ReactNode }): JSX.Element {
  const session = useSession()
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (session !== 'loading') setChecked(true)
  }, [session])

  const target = guardRedirect(session)
  if (target && checked) return <Navigate to={target} replace />
  if (session === 'loading' || !checked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={32} thickness={4} />
      </Box>
    )
  }
  return <>{children}</>
}
