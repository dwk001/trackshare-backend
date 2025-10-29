import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function to transform Supabase user to our AuthUser type
export const transformSupabaseUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
  avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
  provider: user.app_metadata?.provider || 'supabase'
})


