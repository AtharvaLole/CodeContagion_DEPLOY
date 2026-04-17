import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient, hasSupabaseServerConfig } from "../../config/supabase.js";

export type LeaderboardProfileRow = {
  user_id: string;
  handle: string;
  avatar: string;
  created_at: string;
  updated_at: string;
  elo: number;
  rank: number;
  win_rate: number;
  total_matches: number;
  wins: number;
  losses: number;
  streak: number;
};

export type ScoreEventRow = {
  id: string;
  user_id: string;
  source_id: string;
  mode:
    | "misinfo-solo"
    | "misinfo-multiplayer"
    | "debug-arena"
    | "debug-arena-ranked"
    | "echo-trace"
    | "echo-trace-ranked";
  score: number;
  points_delta: number;
  won: boolean;
  created_at: string;
};

function requireSupabase() {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Supabase leaderboard storage is not configured.");
  }

  return getSupabaseAdminClient();
}

export async function upsertLeaderboardProfile(input: {
  userId: string;
  handle: string;
  avatar: string;
  createdAt: string;
  stats?: Partial<{
    elo: number;
    rank: number;
    winRate: number;
    totalMatches: number;
    wins: number;
    losses: number;
    streak: number;
  }>;
}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("leaderboard_profiles")
    .upsert(
      {
        user_id: input.userId,
        handle: input.handle,
        avatar: input.avatar,
        created_at: input.createdAt,
        updated_at: new Date().toISOString(),
        elo: input.stats?.elo ?? 600,
        rank: input.stats?.rank ?? 999,
        win_rate: input.stats?.winRate ?? 0,
        total_matches: input.stats?.totalMatches ?? 0,
        wins: input.stats?.wins ?? 0,
        losses: input.stats?.losses ?? 0,
        streak: input.stats?.streak ?? 0
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LeaderboardProfileRow;
}

export async function getLeaderboardProfile(userId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("leaderboard_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as LeaderboardProfileRow | null;
}

export async function listLeaderboardProfiles() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("leaderboard_profiles")
    .select("*")
    .order("elo", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LeaderboardProfileRow[];
}

export async function listScoreEvents(since?: Date | null) {
  const supabase = requireSupabase();
  let query = supabase.from("score_events").select("*").order("created_at", { ascending: false });

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ScoreEventRow[];
}

export async function getScoreEvent(userId: string, sourceId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("score_events")
    .select("*")
    .eq("user_id", userId)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ScoreEventRow | null;
}

export async function insertScoreEvent(input: {
  userId: string;
  sourceId: string;
  mode:
    | "misinfo-solo"
    | "misinfo-multiplayer"
    | "debug-arena"
    | "debug-arena-ranked"
    | "echo-trace"
    | "echo-trace-ranked";
  score: number;
  pointsDelta: number;
  won: boolean;
}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("score_events")
    .insert({
      id: randomUUID(),
      user_id: input.userId,
      source_id: input.sourceId,
      mode: input.mode,
      score: input.score,
      points_delta: input.pointsDelta,
      won: input.won,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ScoreEventRow;
}
