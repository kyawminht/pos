import { useState, type ReactNode, type JSX } from 'react'
import { Box, Button, Drawer, IconButton, Typography, Divider } from '@mui/material'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { useLocation, useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { visibleNav } from './navConfig'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import PointOfSaleRounded from '@mui/icons-material/PointOfSaleRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import type { SvgIconComponent } from '@mui/icons-material'

/**
 * Shared application shell (research R8): left sidebar on md+,
 * bottom/top navigation on phones. Sale + admin screens render inside it.
 * MVP: no session/sign-out — the device owns its local data.
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useNetworkStatus()
  const [menuOpen, setMenuOpen] = useState(false)

  const items = visibleNav()
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))
  const iconFor = (to: string): SvgIconComponent =>
    to === '/' ? PointOfSaleRounded : to === '/admin' ? BarChartRounded : Inventory2Rounded

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: 232,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          bgcolor: '#fff',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ px: 2.5, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{LABELS.shopName}</Typography>
          <Typography variant="caption">{LABELS.appName}</Typography>
        </Box>

        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1 }}>
          {items.map((item) => (
            <Button
              key={item.to}
              onClick={() => navigate(item.to)}
              variant={isActive(item.to) ? 'contained' : 'text'}
              color={isActive(item.to) ? 'primary' : 'inherit'}
              startIcon={(() => {
                const Icon = iconFor(item.to)
                return <Icon sx={{ fontSize: 20 }} />
              })()}
              sx={{
                justifyContent: 'flex-start',
                px: 2,
                minHeight: 42,
                fontSize: 14,
                color: isActive(item.to) ? '#fff' : 'text.secondary',
                '&:hover': { bgcolor: isActive(item.to) ? 'primary.main' : '#f2f4f3' },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ px: 2, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {isOnline ? LABELS.online : LABELS.offline}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar (replaces the old bottom navigation) */}
        <Box
          component="header"
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1,
            position: 'sticky',
            top: 0,
            zIndex: 15,
            bgcolor: '#fff',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            minHeight: 52,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setMenuOpen(true)}
            aria-label="menu"
            data-testid="mobile-menu-button"
            sx={{ width: 40, height: 40 }}
          >
            <MenuRounded />
          </IconButton>
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700 }}>
            {LABELS.shopName}
          </Typography>
        </Box>

        {children}
      </Box>

      {/* Mobile slide-out menu */}
      <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { width: 276 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>{LABELS.appName}</Typography>
          <IconButton size="small" onClick={() => setMenuOpen(false)} aria-label="close">
            <CloseRounded />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {items.map((item) => {
            const Icon = iconFor(item.to)
            return (
              <Button
                key={item.to}
                onClick={() => {
                  setMenuOpen(false)
                  navigate(item.to)
                }}
                variant={isActive(item.to) ? 'contained' : 'text'}
                color={isActive(item.to) ? 'primary' : 'inherit'}
                startIcon={<Icon sx={{ fontSize: 20 }} />}
                sx={{
                  justifyContent: 'flex-start',
                  px: 2,
                  minHeight: 46,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive(item.to) ? '#fff' : 'text.secondary',
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </Box>
        <Divider sx={{ mt: 'auto' }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="caption">{isOnline ? LABELS.online : LABELS.offline}</Typography>
        </Box>
      </Drawer>

    </Box>
  )
}
