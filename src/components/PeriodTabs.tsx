import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { LABELS } from '../data/labels.mm'
import type { PeriodKey } from '../types/domain'

interface Props {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
}

/** ၒနေ့ / ယခုအပတ် / ယခုလ period switch (US2). */
export function PeriodTabs({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: PeriodKey | null) => next && onChange(next)}
      sx={{
        '& .MuiToggleButton-root': {
          px: 2,
          py: 0.75,
          fontSize: 13.5,
          fontWeight: 600,
          textTransform: 'none',
          borderColor: 'divider',
          color: 'text.secondary',
          '&.Mui-selected': { backgroundColor: 'primary.main', color: '#fff' },
        },
      }}
    >
      <ToggleButton value="day">{LABELS.periodDay}</ToggleButton>
      <ToggleButton value="week">{LABELS.periodWeek}</ToggleButton>
      <ToggleButton value="month">{LABELS.periodMonth}</ToggleButton>
    </ToggleButtonGroup>
  )
}
