import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface APBatteryProps {
  current: number;
  max: number;
  className?: string;
}

const APBattery = ({ current, max, className }: APBatteryProps) => {
  const pct = (current / max) * 100;
  const color = pct > 50 ? "bg-neon-green" : pct > 25 ? "bg-neon-yellow" : "bg-accent";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Zap className="w-3 h-3 text-neon-yellow" />
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-4 rounded-sm transition-all duration-300",
              i < current ? color : "bg-muted/30"
            )}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{current}/{max}</span>
    </div>
  );
};

export default APBattery;
