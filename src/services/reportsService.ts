import { supabase } from './supabaseClient'
import { SHOP_TZ } from '../hooks/usePeriod'
import type { PeriodReport, SaleDetail, SaleHeader } from '../types/domain'

interface ServiceError {
  code: string
}
const err = (code: string): ServiceError => ({ code })

function mapError(message: string | undefined): ServiceError {
  if (!message) return err('NETWORK_ERROR')
  if (/FORBIDDEN|permission denied/i.test(message)) return err('PERMISSION_DENIED')
  if (/INVALID_RANGE|INVALID_LIMIT/i.test(message)) return err('UNKNOWN')
  return err('NETWORK_ERROR')
}

export const reportKey = (from: string, to: string) => ['report', from, to, SHOP_TZ] as const
export const salesKey = (from: string, to: string, page: number) => ['admin', 'sales', from, to, page] as const
export const saleDetailKey = (id: string) => ['admin', 'sale', id] as const

export const SALES_PAGE_SIZE = 25

/** report_period RPC — admin only (contracts/reports.api.md). */
export async function reportPeriod(from: string, to: string): Promise<PeriodReport> {
  const { data, error } = await supabase.rpc('report_period', { p_from: from, p_to: to, p_tz: SHOP_TZ })
  if (error) throw mapError(error.message)
  const raw = data as {
    from: string
    to: string
    tz: string
    total_mmk: number
    sale_count: number
    per_day: { d: string; total_mmk: number; count: number }[]
    per_staff: { staff_id: string; name: string; total_mmk: number; count: number }[]
  }
  return {
    from: raw.from,
    to: raw.to,
    tz: raw.tz,
    totalMmk: Number(raw.total_mmk),
    saleCount: Number(raw.sale_count),
    perDay: (raw.per_day ?? []).map((r) => ({ d: r.d, totalMmk: Number(r.total_mmk), count: Number(r.count) })),
    perStaff: (raw.per_staff ?? []).map((r) => ({
      staffId: r.staff_id,
      name: r.name,
      totalMmk: Number(r.total_mmk),
      count: Number(r.count),
    })),
  }
}

/** sales_in_period RPC — admin only, newest first. */
export async function salesInPeriod(from: string, to: string, page: number): Promise<SaleHeader[]> {
  const { data, error } = await supabase.rpc('sales_in_period', {
    p_from: from,
    p_to: to,
    p_tz: SHOP_TZ,
    p_limit: SALES_PAGE_SIZE,
    p_offset: page * SALES_PAGE_SIZE,
  })
  if (error) throw mapError(error.message)
  const rows = (data ?? []) as {
    id: string
    created_at: string
    total_mmk: number
    completed_by_name: string
    item_count: number
  }[]
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    totalMmk: Number(r.total_mmk),
    completedByName: r.completed_by_name,
    itemCount: Number(r.item_count),
  }))
}

/** sale_detail RPC — admin or the sale owner; snapshot-frozen items. */
export async function saleDetail(id: string): Promise<SaleDetail> {
  const { data, error } = await supabase.rpc('sale_detail', { p_sale_id: id })
  if (error) throw mapError(error.message)
  const raw = data as {
    id: string
    created_at: string
    total_mmk: number
    status: 'completed' | 'void'
    completed_by_name: string
    items: {
      id: string
      product_id: string | null
      product_name_snapshot: string
      image_url_snapshot: string | null
      qty: number
      unit_price_mmk: number
      line_total_mmk: number
    }[]
  }
  return {
    id: raw.id,
    createdAt: raw.created_at,
    totalMmk: Number(raw.total_mmk),
    status: raw.status,
    completedByName: raw.completed_by_name,
    items: (raw.items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      nameSnapshot: i.product_name_snapshot,
      imageSnapshot: i.image_url_snapshot,
      qty: i.qty,
      unitPriceMmk: Number(i.unit_price_mmk),
      lineTotalMmk: Number(i.line_total_mmk),
    })),
  }
}
