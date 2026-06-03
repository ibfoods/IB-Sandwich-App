import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jrdylryrawprhvefzfid.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZHlscnlyYXdwcmh2ZWZ6ZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDAxNzgsImV4cCI6MjA5NjA3NjE3OH0.1b0xNZ2VznmsA_M6GvoCpN7X4KweT-D8_woZejydgN4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
