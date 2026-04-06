/**
 * Server-side Supabase client.
 * Uses the SERVICE_ROLE_KEY to bypass Row Level Security.
 * This file should ONLY be imported in server-side code (API routes, middleware).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables. Check .env.local");
}

export const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "", {
  auth: { persistSession: false },
});
