import { supabase, toErrorCode } from './supabaseClient'
import type { UserSession } from '../types/domain'
import { idbGet, idbSet, idbDelete } from '../db/offlineStore'

const SESSION_KEY = 'app-session'

type ServiceError = { code: string }
export const err = (code: string): ServiceError => ({ code })

function mapProfile(p: { id: string; username: string; full_name: string; role: string }): UserSession {
  return { userId: p.id, username: p.username, fullName: p.full_name, role: p.role as UserSession['role'] }
}

/**
 * Fixed-credential login (contracts/auth.api.md). Online required for first
 * login ever; subsequent sessions serve from cached copy when offline (FR-002).
 */
export async function login(username: string, password: string): Promise<UserSession> {
  // Accept a full email address as-is, or map a plain username to @pos.local
  const name = username.trim()
  const email = name.includes('@') ? name : `${name}@pos.local`
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (/(Invalid login|invalid_credentials)/i.test(error.message)) throw err('INVALID_CREDENTIALS')
    throw err(toErrorCode(error))
  }
  const authId = data.user!.id
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id,username,full_name,role,is_active')
    .eq('id', authId)
    .single()
  if (pErr || !profile) {
    await supabase.auth.signOut()
    throw err('PERMISSION_DENIED')
  }
  if (!profile.is_active) {
    await supabase.auth.signOut()
    throw err('PERMISSION_DENIED')
  }
  const session = mapProfile(profile)
  await idbSet(SESSION_KEY, session)
  return session
}

/** Cached-first (instant, offline-friendly), silent validation online. */
export async function getSession(): Promise<UserSession | null> {
  const cached = await idbGet<UserSession>(SESSION_KEY)
  const { data } = await supabase.auth.getSession()
  if (!data.session && cached) {
    await logout(false)
    return null
  }
  return cached ?? null
}

/**
 * Sign out. Offline sale queue intentionally preserved — it belongs to the
 * device, not the session (contracts/auth.api.md).
 */
export async function logout(clearSession = true): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined)
  if (clearSession) await idbDelete(SESSION_KEY)
}
