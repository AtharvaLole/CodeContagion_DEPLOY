import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bug, Network, Activity, ChevronRight, Target } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import StatCard from "@/components/StatCard";
import { appRoutes } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";
import { fetchDashboardSummary } from "@/features/dashboard/dashboard-api";

const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 20;
    const y = -(e.clientX - rect.left - rect.width / 2) / 20;
    setRotation({ x: Math.max(-8, Math.min(8, x)), y: Math.max(-8, Math.min(8, y)) });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotation({ x: 0, y: 0 })}
      animate={{ rotateX: rotation.x, rotateY: rotation.y }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`tilt-card ${className ?? ""}`}
      style={{ perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
};

const DashboardHome = () => {
  const { token, user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardSummary(token!),
    enabled: Boolean(token)
  });

  const profile = data?.profile ?? user;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg glass flex items-center justify-center text-2xl">
              {profile?.avatar ?? "🛰️"}
            </div>
            <div>
              <h1 className="font-display text-xl text-foreground">{profile?.handle ?? "Loading Agent"}</h1>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>ELO: <span className="text-primary">{profile?.stats.elo ?? "--"}</span></span>
                <span>Rank: <span className="text-neon-yellow">#{profile?.stats.rank ?? "--"}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-[10px] text-neon-green tracking-widest">{(data?.livePlayers ?? 0).toLocaleString()} ONLINE</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TiltCard className="group">
            <Link to={appRoutes.debugArena}>
              <GlassPanel className="p-8 h-full hover:border-primary/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-center mb-4 glow-cyan">
                    <Bug className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl text-primary text-glow-cyan mb-2">DEBUG ARENA</h2>
                  <p className="text-sm text-muted-foreground mb-4">90-second rapid-fire coding. Fix bugs under AI pressure.</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-primary group-hover:gap-3 transition-all">
                    ENTER MATCHMAKING <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </GlassPanel>
            </Link>
          </TiltCard>

          <TiltCard className="group">
            <Link to={appRoutes.misinfoSim}>
              <GlassPanel className="p-8 h-full hover:border-accent/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-lg border border-accent/30 bg-accent/5 flex items-center justify-center mb-4 glow-pink">
                    <Network className="w-7 h-7 text-accent" />
                  </div>
                  <h2 className="font-display text-2xl text-accent text-glow-pink mb-2">MISINFO SIM</h2>
                  <p className="text-sm text-muted-foreground mb-4">Multiplayer cooperative containment of viral misinformation.</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-accent group-hover:gap-3 transition-all">
                    JOIN ROOM <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </GlassPanel>
            </Link>
          </TiltCard>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Win Rate" value={data?.stats.winRate ?? "0%"} color="hsl(var(--neon-green))" />
          <StatCard title="Total Matches" value={data?.stats.totalMatches ?? 0} />
          <StatCard title="ELO Trend" value={data?.stats.elo ?? profile?.stats.elo ?? 0} color="hsl(var(--primary))" />
          <StatCard title="Win Streak" value={data?.stats.streak ?? profile?.stats.streak ?? 0} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-xs tracking-widest text-neon-yellow">DAILY CHALLENGES</span>
            </div>
            <div className="space-y-3">
              {(data?.dailyChallenges ?? []).map((challenge) => (
                <div key={challenge.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-1/50 border border-border/20">
                  <span className="text-lg">{challenge.icon}</span>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{challenge.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-yellow rounded-full transition-all" style={{ width: `${(challenge.progress / challenge.total) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">{challenge.progress}/{challenge.total}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-neon-green">{challenge.reward}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs tracking-widest text-primary">RECENT ACTIVITY</span>
            </div>
            <div className="space-y-2">
              {(data?.recentActivity ?? []).map((activity, index) => (
                <motion.div
                  key={`${activity.message}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded"
                >
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-primary" />
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{activity.message}</div>
                    <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{activity.time}</div>
                  </div>
                </motion.div>
              ))}

              {isLoading ? (
                <div className="rounded-lg border border-border/20 bg-surface-1/30 px-4 py-3 font-mono text-xs text-muted-foreground">
                  Synchronizing operator dashboard...
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
