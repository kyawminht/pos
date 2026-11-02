import { describe, expect, it } from 'vitest'
import { rangeFor, fmtDate } from '../../hooks/usePeriod'

// 2026-11-02 is a Monday
const monday = new Date(2026, 10, 2, 10, 30)
const wednesday = new Date(2026, 10, 4, 9, 0)
const sunday = new Date(2026, 10, 8, 23, 59)

describe('period ranges (US2, FR-202)', () => {
  it('day = today', () => {
    expect(rangeFor('day', wednesday)).toMatchObject({ from: '2026-11-04', to: '2026-11-04' })
  })

  it('week starts Monday and ends today', () => {
    expect(rangeFor('week', wednesday)).toMatchObject({ from: '2026-11-02', to: '2026-11-04' })
  })

  it('week on a Monday is a single-day range', () => {
    expect(rangeFor('week', monday)).toMatchObject({ from: '2026-11-02', to: '2026-11-02' })
  })

  it('week on Sunday still starts the same Monday (Monday-start rule)', () => {
    expect(rangeFor('week', sunday)).toMatchObject({ from: '2026-11-02', to: '2026-11-08' })
  })

  it('month starts on the 1st', () => {
    expect(rangeFor('month', wednesday)).toMatchObject({ from: '2026-11-01', to: '2026-11-04' })
  })

  it('date formatting is zero-padded', () => {
    expect(fmtDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
