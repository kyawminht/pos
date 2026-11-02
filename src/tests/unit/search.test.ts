import { describe, expect, it } from 'vitest'
import { searchLocal, normalizeBurmese } from '../../services/productService'
import type { SearchableProduct } from '../../services/productService'

const catalog: SearchableProduct[] = [
  { id: '1', name: 'ဆီမင့်', priceMmk: 9500, imageUrl: null },
  { id: '2', name: 'အုတ် ၁၀၀၀', priceMmk: 85000, imageUrl: null },
  { id: '3', name: 'သံပူရှက်', priceMmk: 4800, imageUrl: null },
]

describe('searchLocal (FR-006, SC-002)', () => {
  it('1 word fragment matches Burmese name', () => {
    expect(searchLocal(catalog, 'ဆီမင့်').map((p) => p.id)).toEqual(['1'])
  })

  it('2 words match product with space', () => {
    expect(searchLocal(catalog, 'အုတ် ၁၀၀၀').map((p) => p.id)).toEqual(['2'])
  })

  it('Burmese combining-mark mismatch still matches (forgiving typing)', () => {
    // Handled: marks stripped → identical normalized keys
    expect(normalizeBurmese('ဆီမင့်')).toBe(normalizeBurmese('ဆီမင'))
    expect(searchLocal(catalog, 'ဆီမင').map((p) => p.id)).toEqual(['1'])
  })

  it('multiple typed words must all be found (AND semantics)', () => {
    expect(searchLocal(catalog, 'ဆီ မင့်').map((p) => p.id)).toEqual(['1'])
  })

  it('no match → [] (drives EmptyResults state)', () => {
    expect(searchLocal(catalog, 'xyz')).toEqual([])
  })

  it('empty query → [] (grid stays full)', () => {
    expect(searchLocal(catalog, '')).toEqual([])
    expect(searchLocal(catalog, '   ')).toEqual([])
  })
})
