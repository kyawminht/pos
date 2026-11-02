const env = import.meta.env

export const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
