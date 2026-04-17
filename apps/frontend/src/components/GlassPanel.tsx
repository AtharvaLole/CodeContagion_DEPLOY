import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "elevated";
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg",
        variant === "default" && "glass",
        variant === "subtle" && "glass-subtle",
        variant === "elevated" && "glass border-white/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
