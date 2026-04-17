import { Bug } from "lucide-react";

const RouteLoadingScreen = () => {
  return (
    <div className="min-h-screen bg-background cyber-grid scanlines relative flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(48,201,232,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(232,48,140,0.1),transparent_35%)]" />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl border border-primary/40 bg-primary/10 flex items-center justify-center glow-cyan animate-pulse">
          <Bug className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="font-display text-2xl tracking-[0.16em] text-primary text-glow-cyan">
            CODECONTAGION
          </p>
          <p className="mt-2 font-mono text-xs tracking-[0.28em] text-muted-foreground">
            LOADING NEXT MODULE
          </p>
        </div>
      </div>
    </div>
  );
};

export default RouteLoadingScreen;
