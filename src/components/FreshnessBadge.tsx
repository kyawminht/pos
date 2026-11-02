import { Typography } from '@mui/material'
import { LABELS } from '../data/labels.mm'

interface Props {
  dataUpdatedAt: number
  isOnline: boolean
  staleAfterMs?: number
}

/**
 * "Cached, HH:MM" freshness note (US5, research R3). Shown when offline or
 * when the rendered data is older than staleAfterMs (default 5 min).
 */
export function FreshnessBadge({ dataUpdatedAt, isOnline, staleAfterMs = 5 * 60_000 }: Props) {
  if (!dataUpdatedAt) return null
  const stale = Date.now() - dataUpdatedAt > staleAfterMs
  if (isOnline && !stale) return null
  const d = new Date(dataUpdatedAt)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return (
    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }} data-testid="freshness-badge">
      {LABELS.cachedAt(hhmm)}
    </Typography>
  )
}
