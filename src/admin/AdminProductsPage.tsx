import { useMemo, useState } from 'react'
import { Box, Button, Card, Container, Typography, Alert, Divider, TextField, Skeleton, IconButton } from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { listAllProducts, setActive } from '../services/productService'
import { ImageTile } from '../components/ImageTile'
import { ProductFormDialog } from '../components/ProductFormDialog'
import type { Product } from '../types/domain'
import type { JSX } from 'react'

export function AdminProductsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: products = [], isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: listAllProducts,
    staleTime: 30_000,
    retry: 1,
  })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, query])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const toggleActive = async (p: Product) => {
    setBusyId(p.id)
    setError(null)
    try {
      await setActive(p.id, !p.isActive)
      await invalidate()
    } catch (e) {
      setError(LABELS.errCodeLabel((e as { code?: string }).code ?? 'UNKNOWN'))
    } finally {
      setBusyId(null)
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditTarget(p)
    setDialogOpen(true)
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6">{LABELS.adminProductsTitle}</Typography>
          <Typography variant="caption">{products.length} {LABELS.itemsLabel}</Typography>
        </Box>
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={LABELS.searchPlaceholder}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <Button variant="contained" startIcon={<AddRounded />} onClick={openAdd} data-testid="admin-add-product">
          {LABELS.addProductBtn}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isPending ? (
        <Card sx={{ p: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.25, alignItems: 'center' }}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="40%" height={18} />
                <Skeleton width="25%" height={14} />
              </Box>
            </Box>
          ))}
        </Card>
      ) : isError ? (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>{LABELS.errCodeLabel('NETWORK_ERROR')}</Alert>
          <Button variant="outlined" size="small" onClick={() => refetch()}>
            {LABELS.refreshData}
          </Button>
        </Box>
      ) : visible.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
          {LABELS.noProducts}
        </Typography>
      ) : (
        <Card>
          {visible.map((p, idx) => (
            <Box key={p.id}>
              <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f2f4f3', flexShrink: 0 }}>
                  <ImageTile src={p.imageUrl} alt={p.name} height={44} width={44} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 600 }}>
                    {p.name}
                  </Typography>
                  <Typography variant="caption">
                    {fmtMMK(p.priceMmk)} · {p.isActive ? LABELS.activeLabel : LABELS.inactiveLabel}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => openEdit(p)} aria-label={LABELS.editProduct} sx={{ flexShrink: 0 }}>
                  <EditRounded sx={{ fontSize: 19 }} />
                </IconButton>
                <Button
                  size="small"
                  variant="outlined"
                  color={p.isActive ? 'error' : 'primary'}
                  onClick={() => toggleActive(p)}
                  disabled={busyId === p.id}
                  sx={{ flexShrink: 0 }}
                  data-testid={`toggle-active-${p.id}`}
                >
                  {p.isActive ? LABELS.deactivate : LABELS.reactivate}
                </Button>
              </Box>
              {idx < visible.length - 1 && <Divider />}
            </Box>
          ))}
        </Card>
      )}

      <ProductFormDialog open={dialogOpen} product={editTarget} onClose={() => setDialogOpen(false)} />
    </Container>
  )
}
