import type { JSX } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { LoginPage } from './pages/LoginPage'
import { SaleScreen } from './pages/SaleScreen'
import { OrderSummaryPage } from './pages/OrderSummaryPage'
import { AddProductPage } from './pages/AddProductPage'
import { AdminDashboardPage } from './admin/AdminDashboardPage'
import { AdminSalesListPage } from './admin/AdminSalesListPage'
import { AdminSaleDetailPage } from './admin/AdminSaleDetailPage'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { AppShell } from './layout/AppShell'
import { AdminGuard } from './layout/AdminGuard'
import { useSession } from './hooks/useSession'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const session = useSession()
  if (session === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

const shell = (node: ReactNode) => (
  <RequireAuth>
    <AppShell>{node}</AppShell>
  </RequireAuth>
)

const adminShell = (node: ReactNode) => (
  <RequireAuth>
    <AdminGuard>
      <AppShell>{node}</AppShell>
    </AdminGuard>
  </RequireAuth>
)

export function router(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={shell(<SaleScreen />)} />
        <Route path="/order" element={shell(<OrderSummaryPage />)} />
        <Route path="/add-product" element={shell(<AddProductPage />)} />
        <Route path="/admin" element={adminShell(<AdminDashboardPage />)} />
        <Route path="/admin/sales" element={adminShell(<AdminSalesListPage />)} />
        <Route path="/admin/sales/:id" element={adminShell(<AdminSaleDetailPage />)} />
        <Route path="/admin/products" element={adminShell(<AdminProductsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
