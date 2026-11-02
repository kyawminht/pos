import { flushQueue } from './saleService'
import { countPending, purgeDone } from '../db/queueAdapter'

const FLUSH_INTERVAL_MS = 30000

let started = false
let timer: ReturnType<typeof setInterval> | null = null

function onOnline(): void {
  void tryFlush()
}

/**
 * Sync orchestrator (US6): online event + app start + 30s interval when
 * pending sales exist; purge of terminal done records >7 days.
 */
export function startSync(): void {
  if (started) return
  started = true
  window.addEventListener('online', onOnline)
  // Small delay so an offline capture typed before reload can be enqueued first
  setTimeout(tryFlush, 800)
  timer = setInterval(tryFlush, FLUSH_INTERVAL_MS)
}

export function stopSync(): void {
  if (timer) clearInterval(timer)
  timer = null
  started = false
  window.removeEventListener('online', onOnline)
}

async function tryFlush(): Promise<void> {
  try {
    const pending = await countPending()
    if (pending > 0) await flushQueue()
    await purgeDone()
  } catch {
    /* offline/no config — retried by interval */
  }
}

/** Exposed for hooooks and manual replay (quickstart S8). */
export { tryFlush as flushNow }
