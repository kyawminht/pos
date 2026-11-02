import { useState } from 'react'
import { Box, Button, Card, Container, Typography, Alert, CircularProgress, Divider, Snackbar, IconButton } from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import PrintRounded from '@mui/icons-material/PrintRounded'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { LABELS } from '../data/labels.mm'
import { fmtMMK, calcCartTotal } from '../utils/mmk'
import { randomUUID } from '../utils/idempotency'
import { useCartStore } from '../state/useCartStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImageTile } from '../components/ImageTile'
import { confirmSale } from '../services/saleService'
import { buildReceipt, printReceipt } from '../services/printerService'
import { getSession } from '../services/authService'
import { useSyncQueue } from '../hooks/useSyncQueue'
import type { Sale } from '../types/domain'
import type { JSX } from 'react'

export function OrderSummaryPage(): JSX.Element {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const setQty = useCartStore((s) => s.setQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const { isOnline, pendingCount, refresh: refreshPending } = useSyncQueue()

  const [busy, setBusy] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<null | 'clear' | 'confirm'>(null)

  const total = calcCartTotal(items)
  const isEmpty = items.length === 0

  const doConfirm = async () => {
    setConfirmDialog(null)
    const session = await getSession()
    const sale: Sale = {
      idempotencyKey: randomUUID(),
      totalMmk: total,
      completedBy: session?.userId ?? 'unknown-device-user',
      completedByName: session?.fullName ?? LABELS.appName,
      createdAt: new Date().toISOString(),
      items: items.map((i) => ({
        productId: i.productId,
        nameSnapshot: i.nameSnapshot,
        imageSnapshot: i.imageSnapshot,
        qty: i.qty,
        unitPriceMmk: i.unitPriceMmk,
        lineTotalMmk: i.lineTotalMmk,
      })),
    }
    setBusy(true)
    try {
      const result = await confirmSale(sale, isOnline)
      setSnack(result.offline ? LABELS.saleQueuedOffline : LABELS.saleSuccess)
      if (result.offline) refreshPending()
      clear()
      setTimeout(() => navigate('/', { replace: true }), 1400)
    } catch (e) {
      setSnack(LABELS.errCodeLabel((e as { code?: string }).code ?? 'UNKNOWN'))
    } finally {
      setBusy(false)
    }
  }

  const doPrint = () =>
    printReceipt(
      buildReceipt({ createdAt: new Date().toISOString(), completedByName: LABELS.appName, items, totalMmk: total })
    )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }} data-testid="order-summary">
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1.5, px: { xs: 2, md: 4 } }}>
          <BackButton to="/" />
          <Divider orientation="vertical" flexItem />
          <Typography noWrap sx={{ fontSize: 17, fontWeight: 700, mr: 'auto' }}>
            {LABELS.orderSummary}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: { xs: 'none', sm: 'block' },
              color: isOnline ? 'text.secondary' : 'warning.dark',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {isOnline ? LABELS.online : LABELS.offline}
          </Typography>
        </Container>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snack === LABELS.saleSuccess || snack === LABELS.saleQueuedOffline ? 'success' : 'error'} sx={{ boxShadow: 3 }}>
          {snack}
        </Alert>
      </Snackbar>

      {isEmpty ? (
        <Box sx={{ py: 10, textAlign: 'center', flexGrow: 1 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {LABELS.cartEmpty}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {LABELS.confirmDisabledEmpty}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            {LABELS.back}
          </Button>
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ pt: 3, pb: 4, flexGrow: 1, px: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 360px' }, gap: 3, alignItems: 'start' }}>
            {/* Items */}
            <Card>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{LABELS.cart}</Typography>
                <Typography variant="caption">
                  {items.reduce((n, i) => n + i.qty, 0)} {LABELS.items}
                </Typography>
              </Box>
              {items.map((i, idx) => (
                <Box
                  key={i.productId}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1.5,
                    borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  {/* top line: image, name, delete */}
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        flexShrink: 0,
                        bgcolor: '#f2f4f3',
                      }}
                    >
                      <ImageTile src={i.imageSnapshot} alt={i.nameSnapshot} height={44} width={44} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 600 }}>
                        {i.nameSnapshot}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                        {fmtMMK(i.unitPriceMmk)} × {i.qty}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeItem(i.productId)}
                      disabled={busy}
                      aria-label={LABELS.remove}
                      sx={{ width: 32, height: 32, flexShrink: 0 }}
                    >
                      <DeleteOutlineRounded sx={{ fontSize: 19 }} />
                    </IconButton>
                  </Box>

                  {/* bottom line: quantity stepper + line total */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mt: 1,
                      pl: { xs: 0, sm: 7 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <IconButton
                        size="small"
                        onClick={() => setQty(i.productId, i.qty - 1)}
                        aria-label={`${LABELS.quantity} -1`}
                        disabled={busy}
                        sx={{ width: 32, height: 32, border: '1px solid #d0d5dd' }}
                      >
                        <RemoveRounded sx={{ fontSize: 18 }} />
                      </IconButton>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{i.qty}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => setQty(i.productId, i.qty + 1)}
                        aria-label={`${LABELS.quantity} +1`}
                        disabled={busy}
                        sx={{ width: 32, height: 32, border: '1px solid #d0d5dd' }}
                      >
                        <AddRounded sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                    <Typography
                      sx={{ fontSize: 15, fontWeight: 700, textAlign: 'right' }}
                      data-testid={`line-total-${i.productId}`}
                    >
                      {fmtMMK(i.lineTotalMmk)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Card>

            {/* Summary */}
            <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>{LABELS.total}</Typography>
                  <Typography data-testid="order-total" sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: 'primary.dark' }}>
                    {fmtMMK(total)}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => setConfirmDialog('confirm')}
                  disabled={busy}
                  data-testid="confirm-button"
                  startIcon={busy ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : undefined}
                  sx={{ mb: 1.5 }}
                >
                  {busy ? LABELS.confirming : LABELS.confirmSale}
                </Button>
                <Button fullWidth variant="outlined" onClick={doPrint} disabled={busy} data-testid="print-button" startIcon={<PrintRounded />} sx={{ mb: 1 }}>
                  {LABELS.printReceipt}
                </Button>
                <Button fullWidth variant="text" color="error" onClick={() => setConfirmDialog('clear')} disabled={busy} data-testid="clear-cart" sx={{ fontSize: 13.5 }}>
                  {LABELS.clearCart}
                </Button>

                {pendingCount > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'warning.dark', fontWeight: 600 }}>
                    {LABELS.pendingSalesCount(pendingCount)}
                  </Typography>
                )}
              </Box>
            </Card>
          </Box>
        </Container>
      )}

      <ConfirmDialog
        open={confirmDialog === 'confirm'}
        question={`${LABELS.confirmSaleQuestion} ${fmtMMK(total)}`}
        onYes={doConfirm}
        onNo={() => setConfirmDialog(null)}
      />
      <ConfirmDialog
        open={confirmDialog === 'clear'}
        question={LABELS.confirmClearCartQuestion}
        onYes={() => {
          clear()
          setConfirmDialog(null)
        }}
        onNo={() => setConfirmDialog(null)}
      />
    </Box>
  )
}
