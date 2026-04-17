import { readUsers, writeUsers } from "./auth.repository.js";
import type { SafeUser, UserRecord } from "./auth.types.js";
import { hasSupabaseServerConfig } from "../../config/supabase.js";
import {
  getLeaderboardProfile,
  listLeaderboardProfiles,
  upsertLeaderboardProfile
} from "../users/supabase-leaderboard.repository.js";

const starterAvatars = ["🛰️", "🧠", "🛡️", "⚡", "👾", "🔍", "🧪", "🕶️"];

function pickAvatar(handle: string) {
  const sum = handle.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return starterAvatars[sum % starterAvatars.length];
}

function createStarterStats() {
  return {
    elo: 600,
    rank: 999,
    winRate: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    streak: 0
  };
}

function normalizeStarterElo(elo: number | undefined) {
  return typeof elo === "number" && elo >= 600 ? elo : 600;
}

function slugifyHandle(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function deriveBaseHandle(input: { preferredHandle?: string | null; email: string }) {
  const preferred = slugifyHandle(input.preferredHandle ?? "");

  if (preferred.length >= 3) {
    return preferred;
  }

  const emailPrefix = slugifyHandle(input.email.split("@")[0] ?? "operator");
  return emailPrefix.length >= 3 ? emailPrefix : "operator";
}

function ensureUniqueHandle(users: UserRecord[], desiredHandle: string, userId?: string) {
  const taken = new Set(
    users
      .filter((user) => user.id !== userId)
      .map((user) => user.handle.toLowerCase())
  );

  if (!taken.has(desiredHandle.toLowerCase())) {
    return desiredHandle;
  }

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = `${desiredHandle.slice(0, Math.max(1, 24 - String(suffix).length - 1))}_${suffix}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${desiredHandle.slice(0, 18)}_${Date.now().toString().slice(-5)}`;
}

export async function ensureUserProfile(input: {
  id: string;
  email: string;
  preferredHandle?: string | null;
}) {
  const users = await readUsers();
  const email = input.email.trim().toLowerCase();
  const existing = users.find((user) => user.id === input.id);
  const remoteProfile = hasSupabaseServerConfig()
    ? await getLeaderboardProfile(input.id).catch(() => null)
    : null;
  const desiredHandle = ensureUniqueHandle(
    users,
    deriveBaseHandle({ preferredHandle: input.preferredHandle, email }),
    existing?.id
  );

  if (existing) {
    const updated: UserRecord = {
      ...existing,
      email,
      handle: input.preferredHandle ? desiredHandle : existing.handle
    };
    await writeUsers(users.map((user) => (user.id === updated.id ? updated : user)));

    if (hasSupabaseServerConfig()) {
      await upsertLeaderboardProfile({
        userId: updated.id,
        handle: updated.handle,
        avatar: updated.avatar,
        createdAt: updated.createdAt,
        stats: {
          elo: normalizeStarterElo(remoteProfile?.elo ?? updated.stats.elo),
          rank: remoteProfile?.rank ?? updated.stats.rank,
          winRate: remoteProfile?.win_rate ?? updated.stats.winRate,
          totalMatches: remoteProfile?.total_matches ?? updated.stats.totalMatches,
          wins: remoteProfile?.wins ?? updated.stats.wins,
          losses: remoteProfile?.losses ?? updated.stats.losses,
          streak: remoteProfile?.streak ?? updated.stats.streak
        }
      });
    }

    return updated;
  }

  const newUser: UserRecord = {
    id: input.id,
    email,
    handle: desiredHandle,
    avatar: pickAvatar(desiredHandle),
    createdAt: new Date().toISOString(),
    stats: createStarterStats()
  };

  users.push(newUser);
  await writeUsers(users);

  if (hasSupabaseServerConfig()) {
    await upsertLeaderboardProfile({
      userId: newUser.id,
      handle: newUser.handle,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
      stats: {
        elo: normalizeStarterElo(remoteProfile?.elo ?? newUser.stats.elo),
        rank: remoteProfile?.rank ?? newUser.stats.rank,
        winRate: remoteProfile?.win_rate ?? newUser.stats.winRate,
        totalMatches: remoteProfile?.total_matches ?? newUser.stats.totalMatches,
        wins: remoteProfile?.wins ?? newUser.stats.wins,
        losses: remoteProfile?.losses ?? newUser.stats.losses,
        streak: remoteProfile?.streak ?? newUser.stats.streak
      }
    });
  }

  return newUser;
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const users = await readUsers();
  const user = users.find((entry) => entry.id === userId) ?? null;

  if (!user) {
    return null;
  }

  if (!hasSupabaseServerConfig()) {
    return user;
  }

  const remoteStats = await getLeaderboardProfile(userId).catch(() => null);

  if (!remoteStats) {
    return user;
  }

  const rankedProfiles = await listLeaderboardProfiles().catch(() => []);
  const computedRank =
    rankedProfiles.findIndex((profile) => profile.user_id === userId) >= 0
      ? rankedProfiles.findIndex((profile) => profile.user_id === userId) + 1
      : remoteStats.rank;

  return {
    ...user,
    stats: {
      elo: normalizeStarterElo(remoteStats.elo),
      rank: computedRank,
      winRate: remoteStats.win_rate,
      totalMatches: remoteStats.total_matches,
      wins: remoteStats.wins,
      losses: remoteStats.losses,
      streak: remoteStats.streak
    }
  };
}
