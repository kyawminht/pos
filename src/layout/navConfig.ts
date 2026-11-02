import { LABELS } from '../data/labels.mm'
import type { Role } from '../types/domain'

export interface NavItem {
  to: string
  label: string
  roles?: Role[] // undefined = every signed-in role
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: LABELS.navSale },
  { to: '/admin', label: LABELS.navReports, roles: ['admin'] },
  { to: '/admin/products', label: LABELS.navProducts, roles: ['admin'] },
]

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
