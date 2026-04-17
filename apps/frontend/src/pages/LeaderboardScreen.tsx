import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, Crown, Medal } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchLeaderboard,
  type LeaderboardEntry,
  type LeaderboardFilter,
  type LeaderboardLeague
} from "@/features/leaderboard/leaderboard-api";
import {
  getLeagueBadge,
  getLeagueColorClass,
  leaderboardLeagueOptions
} from "@/features/leaderboard/rank-utils";

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-neon-yellow" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-neon-yellow/60" />;
  return null;
};

const LeaderboardScreen = () => {
  const [filter, setFilter] = useState<LeaderboardFilter>("all-time");
  const [league, setLeague] = useState<LeaderboardLeague>("all");
  const { token, user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", filter, league, user?.id],
    queryFn: () => fetchLeaderboard(token!, filter, league),
    enabled: Boolean(token),
    refetchInterval: 1000,
    refetchOnWindowFocus: true
  });

  const entries = data?.leaderboard ?? [];
  const podiumEntries = entries.slice(0, 3);
  const podium = podiumEntries.length === 3 ? [podiumEntries[1], podiumEntries[0], podiumEntries[2]] : [];
  const currentUser = data?.currentUser ?? null;
  const userInTop = currentUser ? entries.some((entry) => entry.id === currentUser.id) : false;
  const lastVisibleEntry = entries[entries.length - 1];
  const pointsToOvertake =
    currentUser && lastVisibleEntry ? Math.max(lastVisibleEntry.elo - currentUser.elo + 1, 0) : 0;
  const scoreLabel = filter === "all-time" ? "RATING" : "SCORE";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="font-mono text-xs tracking-[0.3em] text-neon-yellow">// RANKINGS</span>
          <h1 className="font-display text-4xl mt-2">GLOBAL <span className="text-neon-yellow">LEADERBOARD</span></h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Live ranks now reflect real authenticated operators, with submitted match results shaping the board.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {(["daily", "weekly", "all-time"] as LeaderboardFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded font-mono text-xs tracking-widest transition-all ${
                filter === value
                  ? "bg-primary/10 border border-primary/50 text-primary glow-cyan"
                  : "border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {value.toUpperCase().replace("-", " ")}
            </button>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {leaderboardLeagueOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setLeague(option.value)}
              className={`px-4 py-2 rounded font-mono text-[10px] tracking-widest transition-all ${
                league === option.value
                  ? "bg-secondary/10 border border-secondary/50 text-secondary"
                  : "border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {podium.length === 3 ? (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto items-end">
            {podium.map((player, index) => {
              const isFirst = index === 1;
              const borderColor = isFirst ? "border-neon-yellow/50" : index === 0 ? "border-muted-foreground/50" : "border-neon-yellow/30";
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassPanel className={`p-4 text-center ${borderColor} ${isFirst ? "pb-6" : ""}`}>
                    <div className="text-3xl mb-1">{player.avatar}</div>
                    <div className="flex justify-center mb-1">{getRankBadge(player.rank)}</div>
                    <div className="font-mono text-xs text-foreground truncate">{player.handle}</div>
                    <div className={`mt-1 font-mono text-[10px] ${getLeagueColorClass(player.league)}`}>
                      {getLeagueBadge(player.league)} {player.league.toUpperCase()}
                    </div>
                    <div className="font-display text-lg text-primary">{player.elo}</div>
                    <div className="font-mono text-[9px] text-muted-foreground">{player.wins} wins</div>
                  </GlassPanel>
                </motion.div>
              );
            })}
          </div>
        ) : null}

        <GlassPanel className="overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_80px_80px] gap-4 px-6 py-3 bg-surface-2/50 font-mono text-[10px] tracking-widest text-muted-foreground border-b border-border/30">
            <span>RANK</span><span>PLAYER</span><span>{scoreLabel}</span><span>WINS</span><span>STREAK</span>
          </div>
          {entries.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="grid grid-cols-[60px_1fr_100px_80px_80px] gap-4 px-6 py-3 border-b border-border/10 hover:bg-primary/5 transition-colors"
            >
              <span className={`font-display text-sm ${index < 3 ? "text-neon-yellow" : "text-muted-foreground"}`}>#{player.rank}</span>
              <span className="font-mono text-sm flex items-center gap-2">
                <span>{player.avatar}</span>
                {player.handle}
              </span>
              <span>
                <span className="font-mono text-sm text-primary">{player.elo}</span>
                <span className={`ml-2 font-mono text-[10px] ${getLeagueColorClass(player.league)}`}>
                  {getLeagueBadge(player.league)} {player.league.toUpperCase()}
                </span>
              </span>
              <span className="font-mono text-sm text-muted-foreground">{player.wins}</span>
              <span className="font-mono text-sm text-neon-green">{player.streak > 0 ? `🔥${player.streak}` : "-"}</span>
            </motion.div>
          ))}

          {isLoading ? (
            <div className="px-6 py-4 font-mono text-xs text-muted-foreground">
                Pulling ranked operator data from Supabase and match history...
              </div>
            ) : null}
        </GlassPanel>

        {!userInTop && currentUser ? (
          <div className="sticky bottom-4 mt-4">
            <GlassPanel variant="elevated" className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-display text-sm text-foreground">#{currentUser.rank}</span>
                <span className="text-lg">{currentUser.avatar}</span>
                <span className="font-mono text-sm text-primary">{currentUser.handle}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-primary">{currentUser.elo}</span>
                <div className="flex items-center gap-1 font-mono text-[10px] text-neon-yellow">
                  <ChevronUp className="w-3 h-3" />
                  {pointsToOvertake} pts to climb
                </div>
              </div>
            </GlassPanel>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LeaderboardScreen;
