import { motion, useInView } from "framer-motion";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Network, Shield, Zap, ChevronRight, Skull, Brain, Target, Sparkles, ShieldAlert } from "lucide-react";
import { appRoutes } from "@/app/routes";
import GlitchText from "@/components/GlitchText";
import ParticleBackground from "@/components/ParticleBackground";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import { mockLeaderboard } from "@/data/mockData";
import {
  hasCompletedLandingSession,
  introExperienceLoader,
  markLandingSessionComplete,
  warmIntroExperience,
  warmApplicationShell
} from "@/app/preload";

const IntroSequenceExact = lazy(introExperienceLoader);

const IntroBootScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="rounded-3xl border border-primary/25 bg-card/80 px-8 py-10 text-center shadow-2xl shadow-primary/10 backdrop-blur-xl">
      <p className="font-mono text-[11px] tracking-[0.32em] text-primary">WARMING SESSION</p>
      <h1 className="mt-4 font-display text-3xl text-foreground">Loading the arena...</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        We are streaming the landing scene and preloading the next routes so the first session feels smoother.
      </p>
    </div>
  </div>
);

const AnimatedCounter = ({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl md:text-5xl text-primary text-glow-cyan">{count.toLocaleString()}{suffix}</div>
      <div className="font-mono text-xs text-muted-foreground mt-2 tracking-widest uppercase">{label}</div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, color, delay, link }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ scale: 1.02, y: -4 }}
  >
    <GlassPanel className="group relative overflow-hidden p-6 h-full hover:border-primary/30 transition-all duration-300">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color} pointer-events-none`} />
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center mb-4 ${
          color === "from-primary/10 to-transparent" ? "glow-cyan" :
          color === "from-secondary/10 to-transparent" ? "glow-purple" : "glow-pink"
        }`}>
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-display text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {link && (
          <Link to={link} className="inline-flex items-center gap-1 mt-4 text-xs font-mono text-primary hover:text-neon-cyan transition-colors tracking-widest">
            ENTER <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </GlassPanel>
  </motion.div>
);

const TimelineStep = ({ step, title, description, delay }: { step: number; title: string; description: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: step % 2 === 0 ? -40 : 40 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    className="flex gap-6 items-start"
  >
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center font-display text-sm text-primary glow-cyan">
        {step}
      </div>
      <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-transparent" />
    </div>
    <div className="pb-8">
      <h4 className="font-display text-sm mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </motion.div>
);

// Onboarding Modal
const OnboardingModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Sparkles className="w-8 h-8 text-neon-yellow mx-auto mb-3" />
            <h2 className="font-display text-xl text-foreground">SELECT YOUR DIRECTIVE</h2>
            <p className="font-mono text-xs text-muted-foreground mt-2">Choose your primary specialization</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link to={appRoutes.debugArena} onClick={onClose}>
              <div className="p-6 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-center cursor-pointer group">
                <Bug className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-display text-sm text-primary">DEVELOPER</div>
                <div className="font-mono text-[9px] text-muted-foreground mt-1">Debug Arena</div>
              </div>
            </Link>
            <Link to={appRoutes.misinfoSim} onClick={onClose}>
              <div className="p-6 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50 transition-all text-center cursor-pointer group">
                <Network className="w-8 h-8 text-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-display text-sm text-accent">ANALYST</div>
                <div className="font-mono text-[9px] text-muted-foreground mt-1">Misinfo Sim</div>
              </div>
            </Link>
            <Link to={appRoutes.echoTrace} onClick={onClose} className="col-span-2">
              <div className="p-6 rounded-lg border border-secondary/30 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/50 transition-all text-center cursor-pointer group">
                <ShieldAlert className="w-8 h-8 text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-display text-sm text-secondary">TACTICIAN</div>
                <div className="font-mono text-[9px] text-muted-foreground mt-1">EchoTrace</div>
              </div>
            </Link>
          </div>
          <button onClick={onClose} className="w-full mt-4 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors tracking-widest">
            SKIP FOR NOW
          </button>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};

const IndexContent = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="relative min-h-screen bg-background cyber-grid scanlines overflow-hidden">
      <ParticleBackground />
      <CyberNavbar />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-5xl mx-auto pt-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-primary">v2.0 // SYSTEM ACTIVE</span>
            </div>
          </motion.div>

          <GlitchText
            text="CODE"
            className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-foreground"
            glitchIntensity="medium"
          />
          <GlitchText
            text="CONTAGION"
            className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-primary text-glow-cyan"
            glitchIntensity="high"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-mono text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto"
          >
            <span className="text-primary">Debug.</span>{" "}
            <span className="text-secondary">Detect.</span>{" "}
            <span className="text-accent">Dominate.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto"
          >
            Gamified AI-powered platform for rapid-fire debugging challenges and real-time misinformation containment simulations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            <button
              onClick={() => setShowOnboarding(true)}
              className="group relative px-10 py-4 rounded-lg bg-primary text-primary-foreground font-mono text-sm tracking-widest font-bold hover:brightness-110 transition-all glow-cyan"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                ENTER THE CONTAGION
              </span>
            </button>
            <Link
              to={appRoutes.dashboard}
              className="group relative px-8 py-3 rounded-lg border border-primary/30 font-mono text-sm tracking-widest text-primary hover:bg-primary/10 transition-all"
            >
              <span className="flex items-center gap-2">
                VIEW DASHBOARD
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-20 animate-float"
          >
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-primary/50 to-transparent mx-auto" />
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">SCROLL</span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-[0.3em] text-primary">// MODULES</span>
            <h2 className="font-display text-3xl md:text-4xl mt-2">DUAL-MODE <span className="text-primary text-glow-cyan">WARFARE</span></h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Bug} title="DEBUG ARENA" description="Rapid-fire coding challenges where users diagnose unstable snippets, isolate root causes, and submit precise fixes under pressure." color="from-primary/10 to-transparent" delay={0} link={appRoutes.debugArena} />
            <FeatureCard icon={Network} title="MISINFO SIMULATION" description="Solo and multiplayer misinformation containment where users inspect infected nodes, assess evidence, and stop spread across the live network." color="from-secondary/10 to-transparent" delay={0.1} link={appRoutes.misinfoSim} />
            <FeatureCard icon={ShieldAlert} title="ECHOTRACE" description="Asymmetric multiplayer mode where one player sabotages business logic visually and the other restores secure flow through policy-like code." color="from-accent/10 to-transparent" delay={0.2} link={appRoutes.echoTrace} />
            <FeatureCard icon={Brain} title="AI COUNCIL" description="AI-assisted evaluation reviews debugging approach, containment quality, and decision patterns to create a more intelligent post-round breakdown." color="from-accent/10 to-transparent" delay={0.3} />
            <FeatureCard icon={Skull} title="AI HECKLER" description="An adversarial AI monitors your keystrokes and throws contextual pressure so players build resilience while solving under time stress." color="from-primary/10 to-transparent" delay={0.4} />
            <FeatureCard icon={Shield} title="SANDBOXED EXECUTION" description="Challenge code runs inside isolated execution flows with controlled inputs, strict limits, and safe validation boundaries." color="from-secondary/10 to-transparent" delay={0.5} />
            <FeatureCard icon={Target} title="ELO MATCHMAKING" description="Rank progression and leaderboard pressure keep each match tied to long-term performance and competitive growth." color="from-accent/10 to-transparent" delay={0.6} />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-[0.3em] text-secondary">// PROTOCOL</span>
            <h2 className="font-display text-3xl md:text-4xl mt-2">HOW IT <span className="text-secondary text-glow-purple">WORKS</span></h2>
          </motion.div>

          <div className="space-y-2">
            <TimelineStep step={1} title="MATCHMAKE" description="Choose a mode, enter the flow, and get assigned a challenge path that fits the system you want to investigate." delay={0} />
            <TimelineStep step={2} title="ENGAGE" description="Read the signals, stack traces, headlines, node alerts, and mission prompts before taking action." delay={0.1} />
            <TimelineStep step={3} title="RESPOND" description="Patch the bug, study the evidence, quarantine suspicious nodes, and make decisions while pressure keeps rising." delay={0.2} />
            <TimelineStep step={4} title="RESOLVE" description="Submit your result, review the outcome, and watch your score and ranking shift based on how well you handled the mission." delay={0.3} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-24 px-4 border-y border-border/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedCounter target={600} label="News Items Analyzed" />
          <AnimatedCounter target={3} label="Game Modes" />
          <AnimatedCounter target={90} label="Sec Decision Window" suffix="s" />
          <AnimatedCounter target={3} label="Detection Layers" />
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-[0.3em] text-accent">// RANKINGS</span>
            <h2 className="font-display text-3xl md:text-4xl mt-2">GLOBAL <span className="text-accent text-glow-pink">LEADERBOARD</span></h2>
          </motion.div>

          <GlassPanel className="overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_100px_80px] gap-4 px-6 py-3 bg-surface-2/50 font-mono text-[10px] tracking-widest text-muted-foreground border-b border-border/30">
              <span>RANK</span><span>PLAYER</span><span>ELO</span><span>WINS</span>
            </div>
            {mockLeaderboard.slice(0, 8).map((player, i) => (
              <motion.div
                key={player.rank}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[60px_1fr_100px_80px] gap-4 px-6 py-3 border-b border-border/10 hover:bg-primary/5 transition-colors"
              >
                <span className={`font-display text-sm ${i < 3 ? "text-neon-yellow" : "text-muted-foreground"}`}>#{player.rank}</span>
                <span className="font-mono text-sm flex items-center gap-2">
                  <span>{player.avatar}</span>
                  {player.username}
                </span>
                <span className="font-mono text-sm text-primary">{player.elo}</span>
                <span className="font-mono text-sm text-muted-foreground">{player.wins}</span>
              </motion.div>
            ))}
          </GlassPanel>

          <div className="text-center mt-6">
            <Link to={appRoutes.leaderboard} className="font-mono text-xs text-primary hover:text-neon-cyan transition-colors tracking-widest inline-flex items-center gap-1">
              VIEW FULL RANKINGS <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            <span className="font-display text-xs tracking-[0.2em] text-primary">CODE<span className="text-neon-pink">CONTAGION</span></span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-widest">
            © 2026 CODECONTAGION // ALL SYSTEMS NOMINAL
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-[10px] text-neon-green tracking-widest">UPTIME: 99.97%</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function Index() {
  const [introComplete, setIntroComplete] = useState(() => hasCompletedLandingSession());
  const [introReady, setIntroReady] = useState(() => hasCompletedLandingSession());

  useEffect(() => {
    warmApplicationShell();

    if (hasCompletedLandingSession()) {
      return;
    }

    void warmIntroExperience().then(() => {
      setIntroReady(true);
    });
  }, []);

  const handleIntroComplete = () => {
    markLandingSessionComplete();
    setIntroComplete(true);
  };

  if (!introComplete) {
    if (!introReady) {
      return <IntroBootScreen />;
    }

    return (
      <Suspense fallback={<IntroBootScreen />}>
        <IntroSequenceExact onComplete={handleIntroComplete} />
      </Suspense>
    );
  }

  return <IndexContent />;
}
