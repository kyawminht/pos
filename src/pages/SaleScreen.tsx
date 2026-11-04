import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  Skeleton,
} from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import ClearRounded from '@mui/icons-material/ClearRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { listActive, searchLocal } from '../services/productService'
import { useCartStore } from '../state/useCartStore'
import { ImageTile } from '../components/ImageTile'
import { CartButton } from '../components/CartButton'
import { EmptyResults } from '../components/EmptyResults'
import { PriceEditDialog } from '../components/PriceEditDialog'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import type { Product } from '../types/domain'
import type { JSX } from 'react'

export function SaleScreen(): JSX.Element {
  const [query, setQuery] = useState('')
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const qtyByProduct = useMemo(() => {
    const m: Record<string, number> = {}
    for (const i of cartItems) m[i.productId] = i.qty
    return m
  }, [cartItems])

  const { isOnline } = useNetworkStatus()

  const { data: products = [], isPending, isError, refetch } = useQuery<Product[]>({
    queryKey: ['products', 'active'],
    queryFn: listActive,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount) => failureCount < 2,
  })

  const q = query.trim()
  const visible = q ? searchLocal(products, q) : products

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box
        sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}
        data-testid="sale-header"
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, md: 4 }, pt: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box sx={{ mr: 'auto', minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {LABELS.shopName}
              </Typography>
              <Typography variant="caption">{LABELS.products}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isOnline && (
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'warning.dark' }} data-testid="offline-chip">
                  {LABELS.offline}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={LABELS.searchPlaceholder}
              data-testid="product-search"
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 48, height: 48 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: q ? (
                    <InputAdornment position="end">
                      <Box
                        component="button"
                        onClick={() => setQuery('')}
                        aria-label={LABELS.clearSearch}
                        data-testid="clear-search"
                        sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', display: 'flex', p: 0.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                      >
                        <ClearRounded sx={{ fontSize: 19 }} />
                      </Box>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={() => navigate('/add-product')}
              aria-label={LABELS.addNewItem}
              data-testid="add-product-button"
              sx={{ flexShrink: 0, minWidth: 48, px: 1.5 }}
            >
              <AddRounded />
            </Button>
          </Box>
        </Container>
      </Box>

      {isPending ? (
        <Container maxWidth="lg" sx={{ pt: 3, pb: 3, flexGrow: 1, px: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Box key={i}>
                <Skeleton variant="rounded" height={116} sx={{ borderRadius: 2 }} />
                <Skeleton width="72%" height={20} sx={{ mt: 1 }} />
                <Skeleton width="45%" height={20} />
              </Box>
            ))}
          </Box>
        </Container>
      ) : isError ? (
        <Container sx={{ py: 6, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {LABELS.catalogError}
          </Alert>
          <Button variant="contained" onClick={() => refetch()}>
            {LABELS.back}
          </Button>
        </Container>
      ) : visible.length === 0 ? (
        <EmptyResults onAddItem={() => navigate('/add-product')} />
      ) : (
        <Container maxWidth="lg" sx={{ pt: 3, pb: 3, flexGrow: 1, px: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
            {visible.map((p) => {
              const qty = qtyByProduct[p.id] ?? 0
              return (
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.name} — ${fmtMMK(p.priceMmk)}`}
                  onClick={() => addItem(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      addItem(p)
                    }
                  }}
                  data-testid={`product-card-${p.id}`}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 0,
                    transition: 'border-color .12s',
                    borderColor: qty > 0 ? 'primary.main' : '#e4e7ec',
                    '&:hover': { borderColor: qty > 0 ? 'primary.main' : '#98a2b3' },
                    '&:active': { bgcolor: '#fafafa' },
                  }}
                >
                  {qty > 0 && (
                    <Box
                      data-testid={`card-qty-${p.id}`}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 2,
                        bgcolor: 'primary.main',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1.5,
                      }}
                    >
                      ×{qty}
                    </Box>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    aria-label={`${LABELS.editPrice}: ${p.name}`}
                    data-testid={`price-edit-${p.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditTarget(products.find((x) => x.id === p.id) ?? null)
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      zIndex: 2,
                      minWidth: 0,
                      minHeight: 30,
                      px: 1,
                      fontSize: 12,
                      color: 'text.secondary',
                      bgcolor: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: '#fff', color: 'text.primary' },
                    }}
                  >
                    {LABELS.editShort}
                  </Button>
                  <Box sx={{ height: 116, bgcolor: '#f2f4f3', borderBottom: '1px solid #eef0ef', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageTile src={p.imageUrl} alt={p.name} height={116} />
                  </Box>
                  <CardContent sx={{ px: 1.5, py: 1.25, textAlign: 'left', width: '100%' }}>
                    <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary' }}>
                      {p.name}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 16, fontWeight: 700, color: 'primary.main' }}>
                      {fmtMMK(p.priceMmk)}
                    </Typography>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        </Container>
      )}

      <CartButton
        offlineChip={
          !isOnline ? (
            <Typography sx={{ fontSize: 13, color: 'warning.dark', fontWeight: 600 }}>{LABELS.offline}</Typography>
          ) : undefined
        }
      />

      <PriceEditDialog
        product={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
      />
    </Box>
  )
}
