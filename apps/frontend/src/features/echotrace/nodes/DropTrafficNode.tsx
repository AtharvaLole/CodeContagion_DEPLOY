import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function DropTrafficNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Sabotage // Drop Traffic"
      accentClass="border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.25)]"
    >
      Injects denial behavior into the flow and causes request loss or disruption.
    </EchoTraceNodeShell>
  );
}
