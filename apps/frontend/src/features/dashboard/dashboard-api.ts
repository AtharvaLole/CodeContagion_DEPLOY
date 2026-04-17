import { env } from "@/config/env";

export type DashboardSummary = {
  profile: {
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
  livePlayers: number;
  dailyChallenges: Array<{
    id: string;
    icon: string;
    title: string;
    progress: number;
    total: number;
    reward: string;
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    time: string;
  }>;
  stats: {
    winRate: string;
    totalMatches: number;
    elo: number;
    streak: number;
  };
};

export async function fetchDashboardSummary(token: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/users/me/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Unable to load dashboard.");
  }

  return body as DashboardSummary;
}
