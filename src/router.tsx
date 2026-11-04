import type { JSX, ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SaleScreen } from './pages/SaleScreen'
import { OrderSummaryPage } from './pages/OrderSummaryPage'
import { AddProductPage } from './pages/AddProductPage'
import { AdminDashboardPage } from './admin/AdminDashboardPage'
import { AdminSalesListPage } from './admin/AdminSalesListPage'
import { AdminSaleDetailPage } from './admin/AdminSaleDetailPage'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { AppShell } from './layout/AppShell'

/**
 * MVP router: no auth gates — this is a single shared-device app and data
 * stays local on the device. Role-based admin guarding returns with the
 * first backend-backed release.
 */
const shell = (node: ReactNode) => <AppShell>{node}</AppShell>

export function router(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={shell(<SaleScreen />)} />
        <Route path="/order" element={shell(<OrderSummaryPage />)} />
        <Route path="/add-product" element={shell(<AddProductPage />)} />
        <Route path="/admin" element={shell(<AdminDashboardPage />)} />
        <Route path="/admin/sales" element={shell(<AdminSalesListPage />)} />
        <Route path="/admin/sales/:id" element={shell(<AdminSaleDetailPage />)} />
        <Route path="/admin/products" element={shell(<AdminProductsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
