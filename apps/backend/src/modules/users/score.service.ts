import { getSupabaseAdminClient, hasSupabaseServerConfig } from "../../config/supabase.js";
import { readUsers } from "../auth/auth.repository.js";
import { ensureUserProfile } from "../auth/auth.service.js";
import type { UserRecord } from "../auth/auth.types.js";
import type { ScoreEvent } from "./score.repository.js";
import {
  getLeaderboardProfile,
  getScoreEvent,
  insertScoreEvent,
  upsertLeaderboardProfile
} from "./supabase-leaderboard.repository.js";

type SubmittedResult = {
  score: number;
  contained: boolean;
};

type ScoreMode =
  | "misinfo-solo"
  | "misinfo-multiplayer"
  | "debug-arena"
  | "debug-arena-ranked"
  | "echo-trace"
  | "echo-trace-ranked";
type AppliedScoreEvent = ScoreEvent & {
  previousElo?: number;
  nextElo?: number;
  league?: string;
};

function normalizeElo(elo: number) {
  return Math.max(600, Math.min(1500, Number.isFinite(elo) ? elo : 600));
}

export function getLeagueFromElo(elo: number) {
  const normalized = normalizeElo(elo);

  if (normalized === 1500) {
    return "Radiant";
  }

  if (normalized >= 1401) {
    return "Immortal";
  }

  if (normalized >= 1201) {
    return "Ascendant";
  }

  if (normalized >= 1001) {
    return "Platinum";
  }

  if (normalized >= 801) {
    return "Gold";
  }

  return "Bronze";
}

function getRankBand(elo: number) {
  const normalized = normalizeElo(elo);

  if (normalized >= 1401) {
    return { win: 5, loss: 12 };
  }

  if (normalized >= 1201) {
    return { win: 7, loss: 11 };
  }

  if (normalized >= 1001) {
    return { win: 8, loss: 10 };
  }

  if (normalized >= 801) {
    return { win: 9, loss: 9 };
  }

  return { win: 10, loss: 8 };
}

function deriveEloChange(mode: ScoreMode, currentElo: number, result: SubmittedResult) {
  if (mode === "debug-arena-ranked" || mode === "echo-trace-ranked") {
    const band = getRankBand(currentElo);

    if (result.contained) {
      const scoreMultiplier = 0.5 + result.score / 200;
      return Math.max(1, Math.round(band.win * scoreMultiplier));
    }

    const lossMultiplier = 0.7 + (100 - result.score) / 333;
    return -Math.max(1, Math.round(band.loss * lossMultiplier));
  }

  if (result.contained) {
    return Math.max(14, Math.round(result.score / 7));
  }

  return -Math.max(8, Math.round((100 - result.score) / 8));
}

function computeNextStats(user: UserRecord, mode: ScoreMode, result: SubmittedResult) {
  const nextWins = user.stats.wins + (result.contained ? 1 : 0);
  const nextLosses = user.stats.losses + (result.contained ? 0 : 1);
  const nextTotalMatches = user.stats.totalMatches + 1;
  const nextStreak = result.contained ? user.stats.streak + 1 : 0;
  const currentElo = normalizeElo(user.stats.elo);
  const eloChange = deriveEloChange(mode, currentElo, result);
  const nextElo = normalizeElo(currentElo + eloChange);
  const nextWinRate = Math.round((nextWins / Math.max(1, nextTotalMatches)) * 100);

  return {
    eloChange,
    nextStats: {
      ...user.stats,
      elo: nextElo,
      rank: user.stats.rank,
      totalMatches: nextTotalMatches,
      wins: nextWins,
      losses: nextLosses,
      streak: nextStreak,
      winRate: nextWinRate
    }
  };
}

async function ensureLocalUserRecord(userId: string) {
  const users = await readUsers();
  const existing = users.find((user) => user.id === userId);

  if (existing) {
    return existing;
  }

  if (!hasSupabaseServerConfig()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data.user?.email) {
    return null;
  }

  return ensureUserProfile({
    id: data.user.id,
    email: data.user.email,
    preferredHandle:
      typeof data.user.user_metadata?.handle === "string" ? data.user.user_metadata.handle : undefined
  });
}

export async function applyScoreToUser(input: {
  userId: string;
  sourceId: string;
  mode: ScoreMode;
  result: SubmittedResult;
}): Promise<AppliedScoreEvent> {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Supabase leaderboard storage is required for score tracking.");
  }

  const existingEvent = await getScoreEvent(input.userId, input.sourceId);

  if (existingEvent) {
    return {
      id: existingEvent.id,
      userId: existingEvent.user_id,
      sourceId: existingEvent.source_id,
      mode: existingEvent.mode,
      score: existingEvent.score,
      pointsDelta: existingEvent.points_delta,
      won: existingEvent.won,
      createdAt: existingEvent.created_at
    };
  }

  const ensured = await ensureLocalUserRecord(input.userId);

  if (!ensured) {
    throw new Error("Unable to resolve local profile for score update.");
  }

  const localUsers = await readUsers();
  const localTarget = localUsers.find((user) => user.id === input.userId);

  if (!localTarget) {
    throw new Error("Unable to find user profile for score update.");
  }

  const remoteTarget = await getLeaderboardProfile(input.userId);
  const target: UserRecord =
    remoteTarget
      ? {
          ...localTarget,
          stats: {
            elo: remoteTarget.elo,
            rank: remoteTarget.rank,
            winRate: remoteTarget.win_rate,
            totalMatches: remoteTarget.total_matches,
            wins: remoteTarget.wins,
            losses: remoteTarget.losses,
            streak: remoteTarget.streak
          }
        }
      : localTarget;

  const normalizedTarget: UserRecord = {
    ...target,
    stats: {
      ...target.stats,
      elo: normalizeElo(target.stats.elo)
    }
  };

  const { nextStats } = computeNextStats(normalizedTarget, input.mode, input.result);

  await upsertLeaderboardProfile({
    userId: localTarget.id,
    handle: localTarget.handle,
    avatar: localTarget.avatar,
    createdAt: localTarget.createdAt,
    stats: {
      elo: nextStats.elo,
      rank: nextStats.rank,
      winRate: nextStats.winRate,
      totalMatches: nextStats.totalMatches,
      wins: nextStats.wins,
      losses: nextStats.losses,
      streak: nextStats.streak
    }
  });

  const inserted = await insertScoreEvent({
    userId: input.userId,
    sourceId: input.sourceId,
    mode: input.mode,
    score: input.result.score,
    pointsDelta: nextStats.elo - normalizedTarget.stats.elo,
    won: input.result.contained
  });

  return {
    id: inserted.id,
    userId: inserted.user_id,
    sourceId: inserted.source_id,
    mode: inserted.mode,
    score: inserted.score,
    pointsDelta: inserted.points_delta,
    won: inserted.won,
    createdAt: inserted.created_at,
    previousElo: normalizedTarget.stats.elo,
    nextElo: nextStats.elo,
    league: getLeagueFromElo(nextStats.elo)
  };
}

export async function applyScoreToUsers(input: {
  userIds: string[];
  sourceId: string;
  mode: ScoreMode;
  result: SubmittedResult;
}) {
  const applied: AppliedScoreEvent[] = [];

  for (const userId of input.userIds) {
    const event = await applyScoreToUser({
      userId,
      sourceId: `${input.sourceId}:${userId}`,
      mode: input.mode,
      result: input.result
    });
    applied.push(event);
  }

  return applied;
}
