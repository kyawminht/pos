import { describe, it, expect } from 'vitest'
import { fmtMMK, calcCartTotal } from '../../utils/mmk'

describe('fmtMMK', () => {
  it('formats with thousands separator + ကျပ်', () => {
    expect(fmtMMK(123450)).toBe('123,450 ကျပ်')
  })
  it('integers only', () => {
    expect(fmtMMK(999)).toBe('999 ကျပ်')
  })
  it('zero', () => {
    expect(fmtMMK(0)).toBe('0 ကျပ်')
  })
  it('truncates decimals (MMK has no cents)', () => {
    expect(fmtMMK(99.9)).toBe('99 ကျပ်')
  })
  it('large guard order total', () => {
    expect(fmtMMK(1234567)).toBe('1,234,567 ကျပ်')
  })
})

describe('calcCartTotal', () => {
  it('sums line totals', () => {
    expect(calcCartTotal([{ lineTotalMmk: 100 }, { lineTotalMmk: 250 }])).toBe(350)
  })
  it('empty cart → 0 (FR-012 guard)', () => {
    expect(calcCartTotal([])).toBe(0)
  })
})
