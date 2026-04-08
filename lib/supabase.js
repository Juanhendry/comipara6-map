/**
 * Server-side Supabase client.
 * Uses the SERVICE_ROLE_KEY to bypass Row Level Security.
 * This file should ONLY be imported in server-side code (API routes, middleware).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Resolve the service role key regardless of which env var it was stored in.
// Supabase service role keys always start with "sb_secret_".
const keyA = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const keyB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = keyA.startsWith("sb_secret_") ? keyA : keyB;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables. Check your Secrets.");
}

export const supabase = createClient(supabaseUrl || "", supabaseServiceKey, {
  auth: { persistSession: false },
});
