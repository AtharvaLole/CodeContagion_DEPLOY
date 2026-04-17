const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

export const env = {
  apiBaseUrl,
  supabaseUrl,
  supabaseAnonKey
};
