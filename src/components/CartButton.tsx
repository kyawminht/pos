import { Box, Button, Typography } from '@mui/material'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import { useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { useCartStore } from '../state/useCartStore'

/**
 * Bottom summary bar (FR-004 live total). Flat, information-dense, sits on a
 * bordered surface like a checkout bar in professional POS systems.
 */
export function CartButton({ offlineChip }: { offlineChip?: React.ReactNode }) {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const itemCount = items.reduce((n, i) => n + i.qty, 0)
  const total = items.reduce((t, i) => t + i.lineTotalMmk, 0)

  return (
    <Box sx={{ position: 'sticky', bottom: 0, zIndex: 6, bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
      <Box
        sx={{
          maxWidth: 'lg',
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {offlineChip && <Box sx={{ mr: 'auto' }}>{offlineChip}</Box>}
        <Box sx={{ mr: 'auto', minWidth: 0 }}>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
            {LABELS.selected} · {itemCount} {LABELS.items}
          </Typography>
          <Typography noWrap sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25 }} data-testid="cart-total">
            {fmtMMK(total)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          disabled={itemCount === 0}
          onClick={() => navigate('/order')}
          data-testid="cart-view-order"
          startIcon={<ShoppingCartRounded />}
          sx={{ flexShrink: 0, minWidth: 180 }}
        >
          {LABELS.viewOrder}
        </Button>
      </Box>
    </Box>
  )
}
