import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

export const supabase = createClient(env.supabaseUrl || "http://127.0.0.1:54321", env.supabaseAnonKey || "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
