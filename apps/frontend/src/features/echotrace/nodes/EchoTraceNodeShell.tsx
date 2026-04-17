import type { PropsWithChildren } from "react";
import { Handle, Position } from "reactflow";

type EchoTraceNodeShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  accentClass: string;
}>;

export function EchoTraceNodeShell({
  title,
  subtitle,
  accentClass,
  children
}: EchoTraceNodeShellProps) {
  return (
    <div
      className={`min-w-[220px] rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-md ${accentClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />

      <div className="mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
          {subtitle}
        </p>
        <h3 className="mt-1 font-display text-sm text-white">{title}</h3>
      </div>

      <div className="text-xs leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}
