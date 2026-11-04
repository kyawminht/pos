import { LABELS } from '../data/labels.mm'

export interface NavItem {
  to: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: LABELS.navSale },
  { to: '/admin', label: LABELS.navReports },
  { to: '/admin/products', label: LABELS.navProducts },
]

/** MVP: no auth — every nav item is visible on the shared device. */
export function visibleNav(): NavItem[] {
  return NAV_ITEMS
}
