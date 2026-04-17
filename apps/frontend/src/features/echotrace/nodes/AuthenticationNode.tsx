import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function AuthenticationNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Authentication"
      accentClass="shadow-[0_0_24px_rgba(34,197,94,0.18)]"
    >
      {data.description}
    </EchoTraceNodeShell>
  );
}
