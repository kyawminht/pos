import { useState } from 'react'
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Container, Divider } from '@mui/material'
import { BackButton } from '../components/BackButton'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LABELS } from '../data/labels.mm'
import { createProduct } from '../services/productService'
import { compressImage } from '../utils/imageUtils'
import type { JSX } from 'react'

const MAX_PRICE = 9_999_999_999 // guards absurd totals (edge case)

export function AddProductPage(): JSX.Element {
  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const parsedPrice = (): number | null => {
    const t = priceText.replace(/[,\s]/g, '')
    if (!/^\d+$/.test(t)) return null
    return Math.min(MAX_PRICE, parseInt(t, 10))
  }

  const canSave = name.trim().length > 0 && parsedPrice() !== null && !!imageFile && !busy

  const onPickImage = (file: File | null) => {
    if (!file) return
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      setError(LABELS.errCodeLabel('IMAGE_UNREADABLE'))
      return
    }
    setError(null)
    setImageFile(file)
  }

  const onCompressAndSave = async () => {
    const price = parsedPrice()
    if (!price || price < 1) {
      setError(LABELS.errCodeLabel('PRICE_INVALID'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const compressed = imageFile ? await compressImage(imageFile) : null
      await createProduct({
        name: name.trim(),
        priceMmk: price,
        imageFile: compressed,
      })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setBanner(LABELS.productSaved)
      setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (e) {
      setError(LABELS.errCodeLabel((e as { code?: string }).code ?? 'UNKNOWN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        <Box sx={{ mb: 2 }}>
          <BackButton to="/" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {LABELS.addProductTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {LABELS.shopName}
            </Typography>
          </Box>

          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              {banner && <Alert severity="success" sx={{ mb: 2.5 }}>{banner}</Alert>}
              {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {LABELS.productName}
              </Typography>
              <TextField
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={LABELS.productNamePlaceholder}
                sx={{ mb: 2.5 }}
              />

              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {LABELS.priceLabel}
              </Typography>
              <TextField
                fullWidth
                inputMode="numeric"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value.replace(/[^\d,]/g, ''))}
                sx={{ mb: 2.5 }}
                data-testid="price-input"
              />

              <Divider sx={{ mb: 2.5 }} />

              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                {LABELS.choosePhoto}
              </Typography>
              <Button fullWidth variant="outlined" component="label" data-testid="photo-button" sx={{ mb: 2 }}>
                {imageFile ? LABELS.changePhoto : LABELS.choosePhoto}
                <input hidden accept="image/*" type="file" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
              </Button>

              {imageFile && (
                <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    style={{ maxHeight: 180, borderRadius: 8, border: '1px solid #e4e7ec' }}
                  />
                </Box>
              )}

              <Button fullWidth variant="contained" size="large" disabled={!canSave} onClick={onCompressAndSave} data-testid="save-product">
                {busy ? LABELS.saving : LABELS.save}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  )
}
