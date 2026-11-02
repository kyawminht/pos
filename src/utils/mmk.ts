const numberFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatInteger(n: number): string {
  return numberFmt.format(Math.trunc(n))
}

/** Integers only (MMK has no cents). "123,450 ကျပ်" */
export function fmtMMK(n: number): string {
  return `${formatInteger(n)} ကျပ်`
}

/**
 * Sum of line totals. Integers only (MMK has no cents).
 * Burmese numerals toggle is reserved for a later revision.
 */
export function calcCartTotal(items: { lineTotalMmk: number }[]): number {
  return items.reduce((sum, i) => sum + i.lineTotalMmk, 0)
}
