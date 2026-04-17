const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

function resolveDefaultApiBaseUrl() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }

  return "https://cc-deploy-pzl7.onrender.com";
}

const apiBaseUrl = configuredApiBaseUrl || resolveDefaultApiBaseUrl();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

export const env = {
  apiBaseUrl,
  supabaseUrl,
  supabaseAnonKey
};
