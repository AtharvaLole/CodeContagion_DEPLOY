import { env } from "@/config/env";

export type ProfileSummary = {
  profile: {
    id: string;
    email: string;
    handle: string;
    avatar: string;
    createdAt: string;
    memberSince: string;
    favoriteMode: string;
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
  achievements: Array<{
    id: string;
    icon: string;
    name: string;
    description: string;
    unlocked: boolean;
  }>;
  recentMatches: Array<{
    id: string;
    result: string;
    scenario: string;
    mode: string;
    date: string;
    eloChange: number;
    time: string;
  }>;
};

export async function fetchProfileSummary(token: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Unable to load profile.");
  }

  return body as ProfileSummary;
}
