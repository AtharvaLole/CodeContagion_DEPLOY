import { env } from "@/config/env";

export type LeaderboardFilter = "daily" | "weekly" | "all-time";
export type LeaderboardLeague = "all" | "bronze" | "gold" | "platinum" | "ascendant" | "immortal" | "radiant";

export type LeaderboardEntry = {
  id: string;
  rank: number;
  handle: string;
  avatar: string;
  elo: number;
  wins: number;
  streak: number;
  league: string;
};

export type LeaderboardResponse = {
  filter: LeaderboardFilter;
  league: LeaderboardLeague;
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
};

export async function fetchLeaderboard(token: string, filter: LeaderboardFilter, league: LeaderboardLeague) {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/users/leaderboard?filter=${encodeURIComponent(filter)}&league=${encodeURIComponent(league)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Unable to load leaderboard.");
  }

  return body as LeaderboardResponse;
}
