import { useMemo } from 'react'
import { Box, Button, Card, Container, Typography, Alert, Divider, Skeleton } from '@mui/material'
import { BackButton } from '../components/BackButton'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { rangeFor, fmtDate } from '../hooks/usePeriod'
import { salesInPeriod, salesKey, SALES_PAGE_SIZE } from '../services/reportsService'
import { FreshnessBadge } from '../components/FreshnessBadge'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import type { JSX } from 'react'

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AdminSalesListPage(): JSX.Element {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fallback = useMemo(() => rangeFor('day'), [])
  const from = params.get('from') ?? fallback.from
  const to = params.get('to') ?? fallback.to
  const { isOnline } = useNetworkStatus()

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage, dataUpdatedAt } = useInfiniteQuery({
    queryKey: salesKey(from, to, -1),
    queryFn: ({ pageParam }) => salesInPeriod(from, to, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === SALES_PAGE_SIZE ? allPages.length : undefined,
    staleTime: 60_000,
    retry: 1,
  })

  const rows = data?.pages.flat() ?? []

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6">{LABELS.historyTitle}</Typography>
          <Typography variant="caption">
            {from} — {to}
          </Typography>
          <FreshnessBadge dataUpdatedAt={dataUpdatedAt} isOnline={isOnline} />
        </Box>
        <BackButton to="/admin" />
      </Box>

      {isPending ? (
        <Card sx={{ p: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.25 }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton width="45%" height={18} />
                <Skeleton width="30%" height={14} />
              </Box>
              <Skeleton width={70} height={18} />
            </Box>
          ))}
        </Card>
      ) : isError ? (
        <Alert severity="warning">{LABELS.errCodeLabel('NETWORK_ERROR')}</Alert>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
          {LABELS.noSalesInPeriod}
        </Typography>
      ) : (
        <Card data-testid="sales-list">
          {rows.map((s, idx) => (
            <Box key={s.id}>
              <Box
                onClick={() => navigate(`/admin/sales/${s.id}`)}
                sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: '#fafbfa' } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>{fmtDateTime(s.createdAt)}</Typography>
                  <Typography variant="caption">
                    {s.completedByName} · {s.itemCount} {LABELS.itemsLabel}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{fmtMMK(s.totalMmk)}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>›</Typography>
              </Box>
              {idx < rows.length - 1 && <Divider />}
            </Box>
          ))}
        </Card>
      )}

      {hasNextPage && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="outlined" size="small" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? LABELS.loading : LABELS.loadMore}
          </Button>
        </Box>
      )}
    </Container>
  )
}
