import { useMemo, useState } from 'react'
import { Box, Button, Card, Container, Typography, Alert, Divider, Skeleton } from '@mui/material'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import { rangeFor, periodLabel } from '../hooks/usePeriod'
import { reportKey, reportPeriod } from '../services/reportsService'
import { PeriodTabs } from '../components/PeriodTabs'
import { BarBreakdown } from '../components/BarBreakdown'
import { FreshnessBadge } from '../components/FreshnessBadge'
import { useSyncQueue } from '../hooks/useSyncQueue'
import type { PeriodKey } from '../types/domain'
import type { JSX } from 'react'

export function AdminDashboardPage(): JSX.Element {
  const [period, setPeriod] = useState<PeriodKey>('day')
  const navigate = useNavigate()
  const { isOnline, pendingCount } = useSyncQueue()
  const range = useMemo(() => rangeFor(period), [period])

  const { data, isPending, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: reportKey(range.from, range.to),
    queryFn: () => reportPeriod(range.from, range.to),
    staleTime: period === 'day' ? 60_000 : 1000 * 60 * 30,
    retry: 1,
  })

  const dayRows = (data?.perDay ?? []).map((d) => ({
    key: d.d,
    label: d.d.slice(5),
    amount: d.totalMmk,
    meta: `${d.count} ${LABELS.itemsLabel}`,
  }))
  const staffRows = (data?.perStaff ?? []).map((s) => ({
    key: s.staffId,
    label: s.name,
    amount: s.totalMmk,
    meta: `${s.count} ${LABELS.itemsLabel}`,
  }))

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6">{LABELS.navReports}</Typography>
          <Typography variant="caption">
            {LABELS.shopName} · {periodLabel(period)}
          </Typography>
        </Box>
        <PeriodTabs value={period} onChange={setPeriod} />
        <Button variant="outlined" size="small" startIcon={<RefreshRounded />} onClick={() => refetch()}>
          {LABELS.refreshData}
        </Button>
      </Box>

      {!isOnline && !data && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {LABELS.offlineReportNotice}
        </Alert>
      )}
      {isError && isOnline && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {LABELS.errCodeLabel('NETWORK_ERROR')}
        </Alert>
      )}
      {pendingCount > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {LABELS.pendingThisDevice(pendingCount)}
        </Alert>
      )}

      {isPending ? (
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Skeleton variant="rounded" height={112} />
            <Skeleton variant="rounded" height={112} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Skeleton variant="rounded" height={260} />
            <Skeleton variant="rounded" height={260} />
          </Box>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption">{LABELS.totalSales}</Typography>
              <Typography data-testid="report-total" sx={{ fontSize: 30, fontWeight: 700, mt: 0.5, color: 'primary.dark' }}>
                {fmtMMK(data?.totalMmk ?? 0)}
              </Typography>
              <FreshnessBadge dataUpdatedAt={dataUpdatedAt} isOnline={isOnline} />
            </Card>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption">{LABELS.saleCountLabel}</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 700, mt: 0.5 }} data-testid="report-count">
                {data?.saleCount ?? 0}
              </Typography>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{LABELS.perDayTitle}</Typography>
                <Button size="small" variant="text" onClick={() => navigate(`/admin/sales?from=${range.from}&to=${range.to}`)}>
                  {LABELS.viewSalesList}
                </Button>
              </Box>
              <Divider sx={{ mb: 1 }} />
              {dayRows.length === 0 || (data?.saleCount ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  {LABELS.noSalesInPeriod}
                </Typography>
              ) : (
                <BarBreakdown rows={dayRows} />
              )}
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>{LABELS.perStaffTitle}</Typography>
              <Divider sx={{ mb: 1 }} />
              {staffRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  {LABELS.noSalesInPeriod}
                </Typography>
              ) : (
                <BarBreakdown rows={staffRows} maxRows={6} />
              )}
            </Card>
          </Box>
        </>
      )}
    </Container>
  )
}
