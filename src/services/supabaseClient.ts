import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '../env'

if (!isSupabaseConfigured) {
  throw new Error(
    '[env] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are required. Set them in .env (local dev) or in Vercel Project Settings > Environment Variables (production).'
  )
}

export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: { persistSession: true, storageKey: 'pos-auth-session' },
})

/** Normalizes any thrown error into a stable UI code (see labels.mm.ts). */
export function toErrorCode(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/fetch|network|Failed to fetch|TypeError|offline/i.test(msg)) return 'NETWORK_ERROR'
  if (/duplicate|idempot/i.test(msg)) return 'UNKNOWN'
  if (/forbidden|PERMISSION/i.test(msg)) return 'PERMISSION_DENIED'
  return 'UNKNOWN'
}
