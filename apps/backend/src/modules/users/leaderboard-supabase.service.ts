import { hasSupabaseServerConfig } from "../../config/supabase.js";
import { listLeaderboardProfiles, listScoreEvents } from "./supabase-leaderboard.repository.js";
import { getLeagueFromElo } from "./score.service.js";

export type LeaderboardFilter = "daily" | "weekly" | "all-time";
export type LeaderboardLeague = "all" | "bronze" | "gold" | "platinum" | "ascendant" | "immortal" | "radiant";

function getFilterStart(filter: LeaderboardFilter) {
  const now = Date.now();

  if (filter === "daily") {
    return new Date(now - 24 * 60 * 60 * 1000);
  }

  if (filter === "weekly") {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  return null;
}

function matchesLeague(elo: number, league: LeaderboardLeague) {
  if (league === "all") {
    return true;
  }

  return getLeagueFromElo(Math.max(600, elo)).toLowerCase() === league;
}

export async function getSupabaseLeaderboard(filter: LeaderboardFilter, league: LeaderboardLeague = "all") {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  const [profiles, scoreEvents] = await Promise.all([
    listLeaderboardProfiles(),
    listScoreEvents(getFilterStart(filter))
  ]);

  if (filter === "all-time") {
    return profiles
      .filter((profile) => matchesLeague(profile.elo, league))
      .map((profile, index) => ({
        rank: index + 1,
        id: profile.user_id,
        handle: profile.handle,
        avatar: profile.avatar,
        elo: Math.max(600, profile.elo),
        wins: profile.wins,
        streak: profile.streak,
        league: getLeagueFromElo(Math.max(600, profile.elo))
      }));
  }

  const eventsByUserId = new Map<string, typeof scoreEvents>();

  for (const event of scoreEvents) {
    const bucket = eventsByUserId.get(event.user_id) ?? [];
    bucket.push(event);
    eventsByUserId.set(event.user_id, bucket);
  }

  return profiles
    .map((profile) => {
      const events = eventsByUserId.get(profile.user_id) ?? [];
      const elo = events.reduce((sum, event) => sum + event.points_delta, 0);
      const normalizedProfileElo = Math.max(600, profile.elo);

      return {
        id: profile.user_id,
        handle: profile.handle,
        avatar: profile.avatar,
        elo,
        wins: events.filter((event) => event.won).length,
        streak: profile.streak,
        league: getLeagueFromElo(normalizedProfileElo)
      };
    })
    .filter((profile) => matchesLeague(profile.elo, league))
    .sort((left, right) => right.elo - left.elo)
    .map((profile, index) => ({
      rank: index + 1,
      ...profile
    }));
}
