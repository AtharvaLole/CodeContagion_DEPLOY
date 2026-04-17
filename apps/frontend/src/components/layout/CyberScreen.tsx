import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type CyberScreenProps = PropsWithChildren<{
  className?: string;
  showScanlines?: boolean;
  withParticles?: boolean;
  navbar?: React.ReactNode;
}>;

const CyberScreen = ({
  children,
  className,
  navbar,
  showScanlines = false,
  withParticles = false
}: CyberScreenProps) => {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden bg-background cyber-grid",
        showScanlines && "scanlines",
        className
      )}
    >
      {withParticles ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(48,201,232,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(232,48,140,0.08),transparent_35%)]" />
      ) : null}
      {navbar}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default CyberScreen;
