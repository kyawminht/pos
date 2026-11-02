# Contract: Auth Service (fixed credentials)

## Session shape

```ts
type UserSession = {
  userId: string;        // auth uid (= profiles.id)
  username: string;
  fullName: string;      // Burmese; used on receipt
  role: 'sale' | 'admin';
};
```

## Operations

| Signature | Mode | Behavior |
|---|---|---|
| `login(username, password): Promise<UserSession>` | online required | email mapping `{username}@pos.local` → `signInWithPassword`; then fetch profile; BLOCK if `is_active=false` (PERMISSION_DENIED) |
| `getSession(): Promise<UserSession \| null>` | any | reads cached session first (instant, offline-friendly), silently validates against Supabase when online |
| `logout(): Promise<void>` | any | `signOut()`; clears cached session; offline sale queue is preserved (belongs to the device data, not the session) |
| `sessionChanges(cb): () => void` | any | subscribes to auth state changes |

## Rules
- Accounts are created ONLY by SQL seed / dashboard (no self-registration, FR/nFR fixed credentials).
- 3 consecutive failures → show Burmese error (no lockout on device; server `auto_reload` rate limits apply).
- Session persistence: `supabase-js` localStorage session keeps sale screen usable offline (FR-002).
- Role gates: future `/admin/*` routes require `role === 'admin'`; this feature only exposes `login`,`logout` to sale users.
- Passwords never logged; no credential material in repo (constitution gate).

## Error semantics (Burmese copy mapping)
- `INVALID_CREDENTIALS`
- `NETWORK_ERROR` — first login ever while offline → forbidden with Burmese explanation
- `PERMISSION_DENIED` — `is_active=false`
