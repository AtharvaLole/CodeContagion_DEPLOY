import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import type { Session } from "@supabase/supabase-js";
import { fetchCurrentUser, registerAuthUser, syncAuthProfile, type AuthUser } from "./auth-api";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<AuthUser>;
  register: (payload: { handle: string; email: string; password: string }) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function ensureSupabaseConfigured() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase frontend auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  async function hydrateFromSession(session: Session | null, preferredHandle?: string) {
    if (!session?.access_token) {
      setToken(null);
      setUser(null);
      return null;
    }

    await syncAuthProfile(session.access_token, preferredHandle ? { handle: preferredHandle } : undefined);
    const response = await fetchCurrentUser(session.access_token);
    setToken(session.access_token);
    setUser(response.user);
    return response.user;
  }

  useEffect(() => {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setIsBootstrapping(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await hydrateFromSession(data.session).catch(() => {
          setToken(null);
          setUser(null);
        });
      })
      .finally(() => {
        setIsBootstrapping(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateFromSession(session).catch(() => {
        setToken(null);
        setUser(null);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function login(payload: { email: string; password: string }) {
    ensureSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword(payload);

    if (error || !data.session) {
      throw new Error(error?.message ?? "Unable to log in.");
    }

    const nextUser = await hydrateFromSession(data.session);

    if (!nextUser) {
      throw new Error("Unable to restore user session after login.");
    }

    return nextUser;
  }

  async function register(payload: { handle: string; email: string; password: string }) {
    ensureSupabaseConfigured();
    await registerAuthUser(payload);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (error || !data.session) {
      throw new Error(error.message);
    }

    const nextUser = await hydrateFromSession(data.session, payload.handle);

    if (!nextUser) {
      throw new Error("Unable to finish account setup.");
    }

    return nextUser;
  }

  async function loginWithGoogle() {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function logout() {
    if (env.supabaseUrl && env.supabaseAnonKey) {
      await supabase.auth.signOut();
    }
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isBootstrapping,
        login,
        register,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
