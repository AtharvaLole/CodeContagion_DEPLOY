import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function BypassAuthNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Sabotage // Bypass Auth"
      accentClass="border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.25)]"
    >
      Forces protected resources to become reachable without proper authentication.
    </EchoTraceNodeShell>
  );
}
