import type { PeriodKey } from '../types/domain'

/** Shop timezone (research R1/R7; future: configurable setting). */
export const SHOP_TZ = 'Asia/Yangon'

export interface PeriodRange {
  key: PeriodKey
  from: string // YYYY-MM-DD (local/shop date)
  to: string // YYYY-MM-DD (local/shop date)
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Period ranges in the shop's local calendar (Monday-start weeks).
 * Pure for unit tests (spec US2, FR-202).
 */
export function rangeFor(key: PeriodKey, now: Date = new Date()): PeriodRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (key === 'day') return { key, from: fmtDate(today), to: fmtDate(today) }
  if (key === 'week') {
    const mondayOffset = (today.getDay() + 6) % 7 // Sunday=0 -> 6, Monday=1 -> 0
    const monday = new Date(today)
    monday.setDate(today.getDate() - mondayOffset)
    return { key, from: fmtDate(monday), to: fmtDate(today) }
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  return { key, from: fmtDate(first), to: fmtDate(today) }
}

export function periodLabel(key: PeriodKey): 'ယနေ့' | 'ယခုအပတ်' | 'ယခုလ' {
  // kept as literal Burmese to stay independent from labels module in this pure helper
  return key === 'day' ? 'ယနေ့' : key === 'week' ? 'ယခုအပတ်' : 'ယခုလ'
}
