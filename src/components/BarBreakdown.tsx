import { Box, Typography } from '@mui/material'
import { fmtMMK } from '../utils/mmk'

export interface BarRow {
  key: string
  label: string
  amount: number
  meta?: string
}

interface Props {
  rows: BarRow[]
  maxRows?: number // rows beyond this scroll
}

/**
 * Dependency-free per-day / per-staff breakdown (research R5).
 * Bar width is proportional to the largest amount in the list.
 */
export function BarBreakdown({ rows, maxRows = 8 }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.amount))
  const scrollable = rows.length > maxRows
  return (
    <Box sx={{ maxHeight: scrollable ? 360 : undefined, overflowY: scrollable ? 'auto' : 'visible' }}>
      {rows.map((r) => (
        <Box key={r.key} sx={{ py: 0.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
            <Typography noWrap sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 600 }}>
              {r.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
              {r.meta && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{r.meta}</Typography>}
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{fmtMMK(r.amount)}</Typography>
            </Box>
          </Box>
          <Box sx={{ height: 6, bgcolor: '#eef1ef', borderRadius: 99, overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${Math.round((r.amount / max) * 100)}%`,
                bgcolor: r.amount === 0 ? 'transparent' : 'primary.main',
                borderRadius: 99,
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  )
}
