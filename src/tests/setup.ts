/**
 * Local-first test setup: jsdom has no IndexedDB, so we shim the
 * fake-indexeddb implementation globally for every test.
 */
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
