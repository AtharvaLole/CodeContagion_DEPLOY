import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArenaTimerProps {
  timeLeft: number;
  totalTime: number;
  className?: string;
}

const ArenaTimer = ({ timeLeft, totalTime, className }: ArenaTimerProps) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const pct = (timeLeft / totalTime) * 100;

  const colorClass = timeLeft > 30 ? "text-neon-green" : timeLeft > 15 ? "text-neon-yellow" : "text-accent";
  const glowClass = timeLeft > 30 ? "text-glow-green" : timeLeft > 15 ? "" : "text-glow-pink";
  const pulseClass = timeLeft <= 15 ? "heartbeat" : "";

  return (
    <div className={cn("flex items-center gap-2", pulseClass, className)}>
      <Clock className={cn("w-4 h-4", colorClass)} />
      <span className={cn("font-display text-2xl tabular-nums", colorClass, glowClass)}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
};

export default ArenaTimer;
