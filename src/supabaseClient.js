import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Players type a username; behind the scenes we turn it into a hidden email
export const toEmail = (username) =>
  `${username.trim().toLowerCase()}@lepro.example.com`
