import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function DatabaseRouteNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Database Route"
      accentClass="shadow-[0_0_24px_rgba(168,85,247,0.2)]"
    >
      {data.description}
    </EchoTraceNodeShell>
  );
}
