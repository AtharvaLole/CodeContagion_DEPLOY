import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bug, Network, Trophy, Zap, Clock, Users, Activity, ChevronRight, Star, Target } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import StatCard from "@/components/StatCard";
import { mockUserProfile, dailyChallenges, mockRecentActivity } from "@/data/mockData";

const TiltCard = ({ children, className, color }: { children: React.ReactNode; className?: string; color: string }) => {
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
      className={`tilt-card ${className}`}
      style={{ perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
};

const Dashboard = () => {
  const livePlayers = 1247;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg glass flex items-center justify-center text-2xl">
              {mockUserProfile.avatar}
            </div>
            <div>
              <h1 className="font-display text-xl text-foreground">{mockUserProfile.username}</h1>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>ELO: <span className="text-primary">{mockUserProfile.elo}</span></span>
                <span>Rank: <span className="text-neon-yellow">#{mockUserProfile.rank}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-[10px] text-neon-green tracking-widest">{livePlayers.toLocaleString()} ONLINE</span>
          </div>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TiltCard color="cyan" className="group">
            <Link to="/debug-arena">
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

          <TiltCard color="magenta" className="group">
            <Link to="/misinfo-sim">
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Win Rate" value={`${mockUserProfile.winRate}%`} sparklineData={mockUserProfile.weeklyWins} color="hsl(var(--neon-green))" />
          <StatCard title="Total Matches" value={mockUserProfile.totalMatches} />
          <StatCard title="ELO Trend" value={mockUserProfile.elo} sparklineData={mockUserProfile.weeklyEloHistory} color="hsl(var(--primary))" />
          <StatCard title="Win Streak" value={3} />
        </div>

        {/* Bottom Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Challenges */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-xs tracking-widest text-neon-yellow">DAILY CHALLENGES</span>
            </div>
            <div className="space-y-3">
              {dailyChallenges.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-1/50 border border-border/20">
                  <span className="text-lg">{c.icon}</span>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-yellow rounded-full transition-all" style={{ width: `${(c.progress / c.total) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">{c.progress}/{c.total}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-neon-green">{c.reward}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Recent Activity */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs tracking-widest text-primary">RECENT ACTIVITY</span>
            </div>
            <div className="space-y-2">
              {mockRecentActivity.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    a.type === "win" ? "bg-neon-green" :
                    a.type === "loss" ? "bg-accent" :
                    a.type === "achievement" ? "bg-neon-yellow" : "bg-primary"
                  }`} />
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{a.message}</div>
                    <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{a.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
