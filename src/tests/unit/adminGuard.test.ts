import { describe, expect, it } from 'vitest'
import { guardRedirect } from '../../layout/AdminGuard'
import { visibleNav } from '../../layout/navConfig'
import type { UserSession } from '../../types/domain'

const admin: UserSession = { userId: 'a', username: 'admin', fullName: 'စီမံ', role: 'admin' }
const sale: UserSession = { userId: 's', username: 'sale01', fullName: 'ဆိုင်ဝန်ထမ်း', role: 'sale' }

describe('AdminGuard redirect (US1, FR-201, SC-206)', () => {
  it('signed out → login', () => {
    expect(guardRedirect(null)).toBe('/login')
  })
  it('sale role → sale screen', () => {
    expect(guardRedirect(sale)).toBe('/')
  })
  it('admin → allowed', () => {
    expect(guardRedirect(admin)).toBeNull()
  })
  it('loading → no redirect decision yet', () => {
    expect(guardRedirect('loading')).toBeNull()
  })
})

describe('nav visibility by role', () => {
  it('sale staff see only the sale screen item', () => {
    expect(visibleNav('sale').map((i) => i.to)).toEqual(['/'])
  })
  it('admin sees reports + products', () => {
    expect(visibleNav('admin').map((i) => i.to)).toEqual(['/', '/admin', '/admin/products'])
  })
})
