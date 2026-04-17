import { motion } from "framer-motion";
import { User, Award, Clock, TrendingUp, Swords, Shield, History } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import StatCard from "@/components/StatCard";
import { mockUserProfile } from "@/data/mockData";

const Profile = () => {
  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        {/* Profile Header */}
        <GlassPanel className="p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-20 h-20 rounded-xl glass flex items-center justify-center text-4xl border border-primary/30 glow-cyan">
              {mockUserProfile.avatar}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-3xl text-foreground">{mockUserProfile.username}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 font-mono text-xs text-muted-foreground">
                <span>ELO: <span className="text-primary font-display">{mockUserProfile.elo}</span></span>
                <span>Rank: <span className="text-neon-yellow">#{mockUserProfile.rank}</span></span>
                <span>Member since: <span className="text-foreground">{mockUserProfile.memberSince}</span></span>
                <span>Mode: <span className="text-accent">{mockUserProfile.favoriteMode}</span></span>
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl text-primary text-glow-cyan">{mockUserProfile.winRate}%</div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest">WIN RATE</div>
            </div>
          </div>
        </GlassPanel>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Matches" value={mockUserProfile.totalMatches} />
          <StatCard title="Wins" value={mockUserProfile.wins} sparklineData={mockUserProfile.weeklyWins} color="hsl(var(--neon-green))" />
          <StatCard title="Losses" value={mockUserProfile.losses} />
          <StatCard title="ELO History" value={mockUserProfile.elo} sparklineData={mockUserProfile.weeklyEloHistory} color="hsl(var(--primary))" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Achievements */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-xs tracking-widest text-neon-yellow">ACHIEVEMENTS</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {mockUserProfile.achievements.filter((a) => a.unlocked).length}/{mockUserProfile.achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockUserProfile.achievements.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    a.unlocked
                      ? "border-neon-yellow/20 bg-neon-yellow/5"
                      : "border-border/20 bg-surface-1/30 opacity-40"
                  }`}
                >
                  <div className="text-xl mb-1">{a.icon}</div>
                  <div className="font-mono text-[10px] text-foreground">{a.name}</div>
                  <div className="font-mono text-[8px] text-muted-foreground mt-0.5">{a.description}</div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>

          {/* Match History */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs tracking-widest text-primary">MATCH HISTORY</span>
            </div>
            <div className="space-y-2">
              {mockUserProfile.recentMatches.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-1/30 border border-border/10"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                    m.result === "WIN" ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-accent/10 text-accent border border-accent/20"
                  }`}>
                    {m.result === "WIN" ? "W" : "L"}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground">{m.scenario}</div>
                    <div className="font-mono text-[9px] text-muted-foreground">{m.mode} · {m.date}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-xs ${m.elo_change > 0 ? "text-neon-green" : "text-accent"}`}>
                      {m.elo_change > 0 ? "+" : ""}{m.elo_change}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">{m.time}</div>
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

export default Profile;
