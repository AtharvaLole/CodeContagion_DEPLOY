import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function MiddlewareNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Middleware"
      accentClass="shadow-[0_0_24px_rgba(59,130,246,0.18)]"
    >
      {data.description}
    </EchoTraceNodeShell>
  );
}
