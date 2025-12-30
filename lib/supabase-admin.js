// lib/supabase-admin.js
// Admin client for server-side operations that require elevated permissions
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
}

// Create admin client with service role key for elevated permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

