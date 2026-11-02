import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, Alert, Box, Divider } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { LABELS } from '../data/labels.mm'
import { createProduct, updateProduct, uploadProductImage } from '../services/productService'
import { getSession } from '../services/authService'
import { compressImage } from '../utils/imageUtils'
import type { Product } from '../types/domain'
import type { JSX } from 'react'

const MAX_PRICE = 9_999_999_999

interface Props {
  open: boolean
  product: Product | null // null = add mode
  onClose: () => void
}

/** Shared add/edit product form (research R6). */
export function ProductFormDialog({ open, product, onClose }: Props): JSX.Element {
  const isEdit = Boolean(product)
  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setPriceText(product ? String(product.priceMmk) : '')
    setImageFile(null)
    setError(null)
  }, [open, product])

  const parsed = (): number | null => {
    const t = priceText.replace(/[,\s]/g, '')
    if (!/^\d+$/.test(t)) return null
    const n = parseInt(t, 10)
    return n >= 1 && n <= MAX_PRICE ? n : null
  }

  const canSave = name.trim().length > 0 && parsed() !== null && (isEdit || !!imageFile) && !busy

  const onPickImage = (file: File | null) => {
    if (!file) return
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      setError(LABELS.errCodeLabel('IMAGE_UNREADABLE'))
      return
    }
    setError(null)
    setImageFile(file)
  }

  const onSave = async () => {
    const price = parsed()
    if (!name.trim()) {
      setError(LABELS.errCodeLabel('NAME_REQUIRED'))
      return
    }
    if (price === null) {
      setError(LABELS.errCodeLabel('PRICE_INVALID'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const compressed = imageFile ? await compressImage(imageFile) : null
      if (isEdit && product) {
        const imageUrl = compressed ? await uploadProductImage(compressed) : undefined
        await updateProduct(product.id, {
          name: name.trim(),
          priceMmk: price,
          ...(imageUrl ? { imageUrl } : {}),
        })
      } else {
        const session = await getSession()
        await createProduct({
          name: name.trim(),
          priceMmk: price,
          imageFile: compressed,
          createdBy: session?.userId ?? null,
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      onClose()
    } catch (e) {
      setError(LABELS.errCodeLabel((e as { code?: string }).code ?? 'UNKNOWN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth data-testid="product-form-dialog">
      <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1 }}>
        {isEdit ? LABELS.editProductTitle : LABELS.addProductTitle}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
          {LABELS.productName}
        </Typography>
        <TextField
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={LABELS.productNamePlaceholder}
          sx={{ mb: 2 }}
          data-testid="product-form-name"
        />

        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
          {LABELS.priceLabel}
        </Typography>
        <TextField
          fullWidth
          inputMode="numeric"
          value={priceText}
          onChange={(e) => setPriceText(e.target.value.replace(/[^\d,]/g, ''))}
          sx={{ mb: 2 }}
          data-testid="product-form-price"
        />

        <Divider sx={{ mb: 2 }} />

        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
          {LABELS.choosePhoto}
        </Typography>
        <Button fullWidth variant="outlined" component="label" sx={{ mb: 1.5 }}>
          {imageFile ? LABELS.changePhoto : LABELS.choosePhoto}
          <input hidden accept="image/*" type="file" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
        </Button>
        {imageFile && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <img
              src={URL.createObjectURL(imageFile)}
              alt="preview"
              style={{ maxHeight: 140, borderRadius: 8, border: '1px solid #e4e7ec' }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.25 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy} sx={{ flex: 1 }}>
          {LABELS.back}
        </Button>
        <Button variant="contained" onClick={onSave} disabled={!canSave} sx={{ flex: 1 }} data-testid="product-form-save">
          {busy ? LABELS.saving : LABELS.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
