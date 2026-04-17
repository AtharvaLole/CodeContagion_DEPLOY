import type { NodeProps } from "reactflow";
import { EchoTraceNodeShell } from "./EchoTraceNodeShell";

export function EntryPointNode({ data }: NodeProps) {
  return (
    <EchoTraceNodeShell
      title={data.label}
      subtitle="Entry Point"
      accentClass="shadow-[0_0_24px_rgba(34,211,238,0.15)]"
    >
      {data.description}
    </EchoTraceNodeShell>
  );
}
