import { env } from "@/config/env";

export type AuthUser = {
  id: string;
  email: string;
  handle: string;
  avatar: string;
  createdAt: string;
  stats: {
    elo: number;
    rank: number;
    winRate: number;
    totalMatches: number;
    wins: number;
    losses: number;
    streak: number;
  };
};

type AuthResponse = {
  user: AuthUser;
  message?: string;
};

async function authRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Request failed.");
  }

  return body as T;
}

export function registerAuthUser(payload: { handle: string; email: string; password: string }) {
  return authRequest<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchCurrentUser(token: string) {
  return authRequest<{ user: AuthUser }>("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function syncAuthProfile(token: string, payload?: { handle?: string }) {
  return authRequest<AuthResponse>("/api/v1/auth/sync-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload ?? {})
  });
}
