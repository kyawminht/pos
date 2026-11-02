import { Box, Button, Typography } from '@mui/material'
import SearchOffRounded from '@mui/icons-material/SearchOffRounded'
import { LABELS } from '../data/labels.mm'

interface Props {
  onAddItem?: () => void
}

/** Burmese "no results" empty state (FR-007, spec US3). */
export function EmptyResults({ onAddItem }: Props) {
  return (
    <Box sx={{ py: 10, px: 2, textAlign: 'center', flexGrow: 1 }}>
      <SearchOffRounded sx={{ fontSize: 44, color: '#98a2b3', mb: 1.5 }} />
      <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>{LABELS.searchNoResults}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {LABELS.searchPlaceholder}
      </Typography>
      {onAddItem && (
        <Button variant="outlined" onClick={onAddItem} data-testid="empty-add-item">
          {LABELS.addNewItem}
        </Button>
      )}
    </Box>
  )
}
