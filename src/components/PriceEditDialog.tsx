import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, Alert } from '@mui/material'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { updateProductPrice } from '../services/productService'
import type { Product } from '../types/domain'
import type { JSX } from 'react'

const MAX_PRICE = 9_999_999_999

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

/** Quick price edit from the sale screen (FR: easy price change, big-error UI). */
export function PriceEditDialog({ product, onClose, onSaved }: Props): JSX.Element | null {
  const [priceText, setPriceText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevOpenProduct, setPrevProduct] = useState<Product | null>(product)

  if (product && prevOpenProduct !== product) {
    setPrevProduct(product)
    setPriceText(String(product.priceMmk))
    setError(null)
  }
  if (!product) return null

  const parsed = (): number | null => {
    const t = priceText.replace(/[,\s]/g, '')
    if (!/^\d+$/.test(t)) return null
    return Math.min(MAX_PRICE, parseInt(t, 10))
  }

  const onSave = async () => {
    const price = parsed()
    if (price === null || price < 1) {
      setError(LABELS.errCodeLabel('PRICE_INVALID'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateProductPrice(product.id, price)
      onSaved()
      onClose()
    } catch (e) {
      setError(LABELS.errCodeLabel((e as { code?: string }).code ?? 'UNKNOWN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth data-testid="price-edit-dialog">
      <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1 }}>{LABELS.editPriceTitle}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 0.5 }}>{product.name}</Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>
          {LABELS.total}: {fmtMMK(product.priceMmk)}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          inputMode="numeric"
          value={priceText}
          onChange={(e) => setPriceText(e.target.value.replace(/[^\d,]/g, ''))}
          sx={{ '& .MuiInputBase-input': { fontSize: 20, fontWeight: 700 } }}
          data-testid="price-edit-input"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.25 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy} sx={{ flex: 1 }}>
          {LABELS.back}
        </Button>
        <Button variant="contained" onClick={onSave} disabled={busy || parsed() === null} sx={{ flex: 1 }}>
          {busy ? LABELS.saving : LABELS.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
