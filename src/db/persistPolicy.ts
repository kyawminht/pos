/**
 * Which query keys are persisted to IndexedDB (feature 001 catalog + feature
 * 002 admin report views). Pure for unit tests (T028).
 */
export function shouldPersistQueryKey(key: readonly unknown[]): boolean {
  const root = key[0]
  return root === 'products' || root === 'report' || root === 'admin'
}
