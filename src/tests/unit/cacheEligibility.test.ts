import { describe, expect, it } from 'vitest'
import { shouldPersistQueryKey } from '../../db/persistPolicy'

describe('persisted query keys (US5, research R3)', () => {
  it('persists catalog, reports and admin views', () => {
    expect(shouldPersistQueryKey(['products', 'active'])).toBe(true)
    expect(shouldPersistQueryKey(['report', '2026-11-01', '2026-11-02', 'Asia/Yangon'])).toBe(true)
    expect(shouldPersistQueryKey(['admin', 'products'])).toBe(true)
    expect(shouldPersistQueryKey(['admin', 'sales', 'a', 'b', 0])).toBe(true)
    expect(shouldPersistQueryKey(['admin', 'sale', 'uuid'])).toBe(true)
  })

  it('does not persist ephemeral keys', () => {
    expect(shouldPersistQueryKey(['cart'])).toBe(false)
    expect(shouldPersistQueryKey(['session'])).toBe(false)
  })
})
