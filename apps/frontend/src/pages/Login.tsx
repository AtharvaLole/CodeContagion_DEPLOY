import { useState } from "react";
import { motion } from "framer-motion";
import { Github, Chrome, Bug, Lock, Mail, Eye, EyeOff } from "lucide-react";
import GlitchText from "@/components/GlitchText";
import ParticleBackground from "@/components/ParticleBackground";
import GlassPanel from "@/components/GlassPanel";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="min-h-screen bg-background cyber-grid scanlines relative flex items-center justify-center px-4">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center glow-cyan">
              <Bug className="w-5 h-5 text-primary" />
            </div>
          </div>
          <GlitchText text="CODE" className="font-display text-3xl font-black text-foreground" glitchIntensity="low" />
          <GlitchText text="CONTAGION" className="font-display text-3xl font-black text-primary text-glow-cyan" glitchIntensity="medium" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="p-8">
            <h2 className="font-display text-lg text-center mb-6 text-foreground">
              {isSignup ? "CREATE ACCOUNT" : "AUTHENTICATE"}
            </h2>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border/50 bg-surface-1/50 font-mono text-xs text-foreground hover:bg-surface-2/50 hover:border-border transition-all">
                <Github className="w-4 h-4" />
                GitHub
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border/50 bg-surface-1/50 font-mono text-xs text-foreground hover:bg-surface-2/50 hover:border-border transition-all">
                <Chrome className="w-4 h-4" />
                Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border/50" />
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">OR</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Form */}
            <div className="space-y-4">
              {isSignup && (
                <div>
                  <label className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1.5 block">HANDLE</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="CyberOp_Alpha"
                      className="w-full bg-surface-1/50 border border-border/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1.5 block">EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="operator@cyber.net"
                    className="w-full bg-surface-1/50 border border-border/50 rounded-lg pl-10 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1.5 block">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    className="w-full bg-surface-1/50 border border-border/50 rounded-lg pl-10 pr-10 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-mono text-sm tracking-widest font-bold hover:brightness-110 transition-all glow-cyan">
                {isSignup ? "INITIALIZE ACCOUNT" : "ENTER THE CONTAGION"}
              </button>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors tracking-widest"
              >
                {isSignup ? "ALREADY HAVE ACCESS? LOGIN" : "NEW RECRUIT? CREATE ACCOUNT"}
              </button>
            </div>
          </GlassPanel>
        </motion.div>

        <p className="text-center font-mono text-[9px] text-muted-foreground/50 mt-6 tracking-widest">
          SECURE CONNECTION // AES-256 ENCRYPTED
        </p>
      </div>
    </div>
  );
};

export default Login;
