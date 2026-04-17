import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronUp, Filter, Crown, Medal } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import { mockLeaderboard, mockUserProfile } from "@/data/mockData";

type TimeFilter = "daily" | "weekly" | "all-time";

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-neon-yellow" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-neon-yellow/60" />;
  return null;
};

const Leaderboard = () => {
  const [filter, setFilter] = useState<TimeFilter>("all-time");

  const userInTop = mockLeaderboard.find((p) => p.rank === mockUserProfile.rank);
  const pointsToOvertake = userInTop ? 0 : mockLeaderboard[mockLeaderboard.length - 1].elo - mockUserProfile.elo;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="font-mono text-xs tracking-[0.3em] text-neon-yellow">// RANKINGS</span>
          <h1 className="font-display text-4xl mt-2">GLOBAL <span className="text-neon-yellow">LEADERBOARD</span></h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {(["daily", "weekly", "all-time"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded font-mono text-xs tracking-widest transition-all ${
                filter === f
                  ? "bg-primary/10 border border-primary/50 text-primary glow-cyan"
                  : "border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {f.toUpperCase().replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto items-end">
          {[mockLeaderboard[1], mockLeaderboard[0], mockLeaderboard[2]].map((p, idx) => {
            const isFirst = idx === 1;
            const borderColor = isFirst ? "border-neon-yellow/50" : idx === 0 ? "border-muted-foreground/50" : "border-neon-yellow/30";
            return (
              <motion.div
                key={p.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassPanel className={`p-4 text-center ${borderColor} ${isFirst ? "pb-6" : ""}`}>
                  <div className="text-3xl mb-1">{p.avatar}</div>
                  <div className="flex justify-center mb-1">{getRankBadge(p.rank)}</div>
                  <div className="font-mono text-xs text-foreground truncate">{p.username}</div>
                  <div className="font-display text-lg text-primary">{p.elo}</div>
                  <div className="font-mono text-[9px] text-muted-foreground">{p.wins} wins</div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>

        {/* Full List */}
        <GlassPanel className="overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_80px_80px] gap-4 px-6 py-3 bg-surface-2/50 font-mono text-[10px] tracking-widest text-muted-foreground border-b border-border/30">
            <span>RANK</span><span>PLAYER</span><span>ELO</span><span>WINS</span><span>STREAK</span>
          </div>
          {mockLeaderboard.map((player, i) => (
            <motion.div
              key={player.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[60px_1fr_100px_80px_80px] gap-4 px-6 py-3 border-b border-border/10 hover:bg-primary/5 transition-colors"
            >
              <span className={`font-display text-sm ${i < 3 ? "text-neon-yellow" : "text-muted-foreground"}`}>#{player.rank}</span>
              <span className="font-mono text-sm flex items-center gap-2">
                <span>{player.avatar}</span>
                {player.username}
              </span>
              <span className="font-mono text-sm text-primary">{player.elo}</span>
              <span className="font-mono text-sm text-muted-foreground">{player.wins}</span>
              <span className="font-mono text-sm text-neon-green">{player.streak > 0 ? `🔥${player.streak}` : "-"}</span>
            </motion.div>
          ))}
        </GlassPanel>

        {/* Sticky User Rank */}
        {!userInTop && (
          <div className="sticky bottom-4 mt-4">
            <GlassPanel variant="elevated" className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-display text-sm text-foreground">#{mockUserProfile.rank}</span>
                <span className="text-lg">{mockUserProfile.avatar}</span>
                <span className="font-mono text-sm text-primary">{mockUserProfile.username}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-primary">{mockUserProfile.elo}</span>
                <div className="flex items-center gap-1 font-mono text-[10px] text-neon-yellow">
                  <ChevronUp className="w-3 h-3" />
                  {pointsToOvertake} pts to #{mockLeaderboard[mockLeaderboard.length - 1].rank}
                </div>
              </div>
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
