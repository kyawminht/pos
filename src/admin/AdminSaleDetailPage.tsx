import { Box, Card, Container, Typography, Alert, Skeleton, Divider } from '@mui/material'
import { BackButton } from '../components/BackButton'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { saleDetail, saleDetailKey } from '../services/reportsService'
import { ImageTile } from '../components/ImageTile'
import { fmtDate } from '../hooks/usePeriod'
import type { JSX } from 'react'

export function AdminSaleDetailPage(): JSX.Element {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: saleDetailKey(id),
    queryFn: () => saleDetail(id),
    enabled: Boolean(id),
    retry: 1,
    staleTime: Infinity, // append-only history: immutable
  })

  const created = data ? new Date(data.createdAt) : null

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6">{LABELS.saleDetailTitle}</Typography>
          {created && (
            <Typography variant="caption">
              {fmtDate(created)} {String(created.getHours()).padStart(2, '0')}:{String(created.getMinutes()).padStart(2, '0')}
            </Typography>
          )}
        </Box>
        <BackButton />
      </Box>

      {isPending ? (
        <Card sx={{ p: 2 }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="25%" height={16} sx={{ mb: 2 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1 }} />
          ))}
        </Card>
      ) : isError || !data ? (
        <Alert severity="warning">{LABELS.notFound}</Alert>
      ) : (
        <Card>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{data.completedByName}</Typography>
              <Typography variant="caption">
                {LABELS.statusLabel}: {data.status}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'primary.dark' }} data-testid="sale-detail-total">
              {fmtMMK(data.totalMmk)}
            </Typography>
          </Box>
          <Divider />
          {data.items.map((i) => (
            <Box key={i.id} sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f2f4f3', flexShrink: 0 }}>
                <ImageTile src={i.imageSnapshot} alt={i.nameSnapshot} height={44} width={44} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>
                  {i.nameSnapshot}
                </Typography>
                <Typography variant="caption">
                  {fmtMMK(i.unitPriceMmk)} × {i.qty}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{fmtMMK(i.lineTotalMmk)}</Typography>
            </Box>
          ))}
        </Card>
      )}
    </Container>
  )
}
