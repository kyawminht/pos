import { describe, expect, it, beforeEach } from 'vitest'
import { buildReceipt, renderReceiptHtml } from '../../services/printerService'
import { randomUUID } from '../../utils/idempotency'
import { toJPEGFileOf } from '../../utils/compressHelpers'

beforeEach(() => {
  document.body.innerHTML = ''
})

const order = {
  createdAt: '2026-10-31T10:00:00.000Z',
  completedByName: 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁',
  items: [{ nameSnapshot: 'ဆီမင့်', qty: 3, unitPriceMmk: 9500, lineTotalMmk: 28500 }],
  totalMmk: 28500,
}

describe('receipt build/print (FR-011, SC-004)', () => {
  it('buildReceipt contains item list + MMK total + seller', () => {
    const r = buildReceipt(order)
    expect(r.totalMmk).toBe(28500)
    expect(r.items[0].lineTotalMmk).toBe(28500)
    expect(r.header.completedByName).toContain('ဆိုင်တွင်းလုပ်ဆောင်သူ')
  })

  it('receipt HTML includes total and title, escapes Burmese name', () => {
    const html = renderReceiptHtml(buildReceipt(order))
    expect(html).toContain('28,500 ကျပ်')
    expect(html).toContain('ဆီမင့်')
  })

  it('idempotency keys are unique per sale', () => {
    expect(randomUUID()).not.toBe(randomUUID())
  })
})

describe('image utils guard (US5)', () => {
  it('toJPEGFileOf renames to jpeg type', () => {
    const f = toJPEGFileOf(new Blob(['abc']), ' превiuw .png')
    expect(f.name.endsWith('.jpg')).toBe(true)
    expect(f.type).toBe('image/jpeg')
  })
})
