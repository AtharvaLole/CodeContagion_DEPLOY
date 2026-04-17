import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Award, History } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/features/auth/auth-context";
import { fetchProfileSummary } from "@/features/profile/profile-api";
import { getLeagueBadge, getLeagueColorClass, getLeagueFromElo } from "@/features/leaderboard/rank-utils";

const ProfileScreen = () => {
  const { token, user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfileSummary(token!),
    enabled: Boolean(token)
  });

  const profile = data?.profile ?? user;
  const league = getLeagueFromElo(profile?.stats.elo ?? 600);

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        <GlassPanel className="p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-20 h-20 rounded-xl glass flex items-center justify-center text-4xl border border-primary/30 glow-cyan">
              {profile?.avatar ?? "🛰️"}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-3xl text-foreground">{profile?.handle ?? "Loading Agent"}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 font-mono text-xs text-muted-foreground">
                <span>ELO: <span className="text-primary font-display">{profile?.stats.elo ?? "--"}</span></span>
                <span>Rank: <span className="text-neon-yellow">#{profile?.stats.rank ?? "--"}</span></span>
                <span>League: <span className={getLeagueColorClass(league)}>{getLeagueBadge(league)} {league}</span></span>
                <span>Member since: <span className="text-foreground">{data?.profile.memberSince ?? "--"}</span></span>
                <span>Mode: <span className="text-accent">{data?.profile.favoriteMode ?? "Debug Arena"}</span></span>
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl text-primary text-glow-cyan">{profile?.stats.winRate ?? 0}%</div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest">WIN RATE</div>
            </div>
          </div>
        </GlassPanel>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Matches" value={profile?.stats.totalMatches ?? 0} />
          <StatCard title="Wins" value={profile?.stats.wins ?? 0} color="hsl(var(--neon-green))" />
          <StatCard title="Losses" value={profile?.stats.losses ?? 0} />
          <StatCard title="ELO History" value={profile?.stats.elo ?? 0} color="hsl(var(--primary))" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-xs tracking-widest text-neon-yellow">ACHIEVEMENTS</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {(data?.achievements ?? []).filter((achievement) => achievement.unlocked).length}/{data?.achievements.length ?? 0}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(data?.achievements ?? []).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.unlocked
                      ? "border-neon-yellow/20 bg-neon-yellow/5"
                      : "border-border/20 bg-surface-1/30 opacity-40"
                  }`}
                >
                  <div className="text-xl mb-1">{achievement.icon}</div>
                  <div className="font-mono text-[10px] text-foreground">{achievement.name}</div>
                  <div className="font-mono text-[8px] text-muted-foreground mt-0.5">{achievement.description}</div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs tracking-widest text-primary">MATCH HISTORY</span>
            </div>
            <div className="space-y-2">
              {(data?.recentMatches ?? []).map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-1/30 border border-border/10"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                    match.result === "WIN" ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-accent/10 text-accent border border-accent/20"
                  }`}>
                    {match.result === "WIN" ? "W" : match.result === "LOSS" ? "L" : "..."}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{match.scenario}</div>
                    <div className="font-mono text-[9px] text-muted-foreground">{match.mode} · {match.date}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-xs ${match.eloChange > 0 ? "text-neon-green" : match.eloChange < 0 ? "text-accent" : "text-muted-foreground"}`}>
                      {match.eloChange > 0 ? "+" : ""}{match.eloChange}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">{match.time}</div>
                  </div>
                </motion.div>
              ))}

              {isLoading ? (
                <div className="rounded-lg border border-border/20 bg-surface-1/30 px-4 py-3 font-mono text-xs text-muted-foreground">
                  Pulling profile telemetry...
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
