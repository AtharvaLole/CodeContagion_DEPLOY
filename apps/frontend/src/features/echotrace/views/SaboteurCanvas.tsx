import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  EchoTraceFlowEdge,
  EchoTraceFlowNode,
  EchoTraceGraphAnalysis,
  EchoTraceScenario,
  SabotageAction
} from "../echotrace-types";
import { AuthenticationNode } from "../nodes/AuthenticationNode";
import { BypassAuthNode } from "../nodes/BypassAuthNode";
import { DatabaseRouteNode } from "../nodes/DatabaseRouteNode";
import { DropTrafficNode } from "../nodes/DropTrafficNode";
import { EntryPointNode } from "../nodes/EntryPointNode";
import { MiddlewareNode } from "../nodes/MiddlewareNode";

type SaboteurCanvasProps = {
  scenario: EchoTraceScenario;
  nodes: EchoTraceFlowNode[];
  edges: EchoTraceFlowEdge[];
  analysis: EchoTraceGraphAnalysis;
  onApplyAction: (action: SabotageAction) => void;
  onNodesChange?: (nodes: EchoTraceFlowNode[]) => void;
  onEdgesChange?: (edges: EchoTraceFlowEdge[]) => void;
  onReset: () => void;
  disabled?: boolean;
};

const nodeTypes = {
  entryPoint: EntryPointNode,
  middleware: MiddlewareNode,
  authentication: AuthenticationNode,
  databaseRoute: DatabaseRouteNode,
  dropTraffic: DropTrafficNode,
  bypassAuth: BypassAuthNode
};

const sabotagePalette: Array<{
  type: SabotageAction;
  label: string;
  description: string;
}> = [
  {
    type: "reroute-to-database",
    label: "Move Data Early",
    description: "Put the protected data box before the login check"
  },
  {
    type: "insert-bypass",
    label: "Skip Login",
    description: "Add a shortcut that avoids the login step"
  },
  {
    type: "drop-after-auth",
    label: "Drop Requests",
    description: "Make requests fail after the login step"
  }
];

export function SaboteurCanvas({
  scenario,
  nodes,
  edges,
  analysis,
  onApplyAction,
  onNodesChange,
  onEdgesChange,
  onReset,
  disabled = false
}: SaboteurCanvasProps) {
  const panelItems = useMemo(() => sabotagePalette, []);

  return (
    <div className="overflow-hidden rounded-[32px] border border-border/40 bg-[radial-gradient(circle_at_top,#10233f,#040814_66%)] text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 border-b border-white/10 bg-black/20 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300">
            VISUAL MAP
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">{scenario.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            This map shows how a request moves through the system. Read it from left to right.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="font-mono text-[10px] tracking-[0.24em] text-slate-400">HOW TO PLAY</p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>1. Look at the boxes from left to right.</p>
            <p>2. Pick one move on the left to break the safe order.</p>
            <p>3. Your goal is to make the data box unsafe or make requests fail.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="border-r border-white/10 bg-slate-950/60 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
            YOUR MOVES
          </p>
          <div className="mt-4 space-y-3">
            {panelItems.map((item) => (
              <button
                key={item.type}
                onClick={() => onApplyAction(item.type)}
                disabled={disabled}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/85 p-4 text-left transition hover:border-cyan-400/40 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <p className="font-display text-sm text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-6 text-slate-400">{item.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={onReset}
            disabled={disabled}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-[11px] tracking-[0.22em] text-slate-200 transition hover:border-white/30 disabled:opacity-60"
          >
            RESET MAP
          </button>
        </aside>

        <div className="h-[820px] min-w-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={
          onNodesChange
            ? (changes: NodeChange[]) => {
                onNodesChange(applyNodeChanges(changes, nodes) as EchoTraceFlowNode[]);
              }
            : undefined
        }
        onEdgesChange={
          onEdgesChange
            ? (changes: EdgeChange[]) => {
                onEdgesChange(applyEdgeChanges(changes, edges) as EchoTraceFlowEdge[]);
              }
            : undefined
        }
        onConnect={
          !disabled && onEdgesChange
            ? (connection: Connection) => {
                onEdgesChange(
                  addEdge(
                    {
                      ...connection,
                      id: `edge-${crypto.randomUUID()}`,
                      animated: true,
                      style: { stroke: "#22d3ee", strokeWidth: 2.2 }
                    },
                    edges
                  ) as EchoTraceFlowEdge[]
                );
              }
            : undefined
        }
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.55 }}
        nodesDraggable={!disabled}
        nodesConnectable={!disabled}
        elementsSelectable={!disabled}
        deleteKeyCode={["Backspace", "Delete"]}
        panOnDrag={disabled}
        className="bg-transparent"
      >
        <Background color="#1e293b" gap={24} />
        <MiniMap
          pannable
          zoomable
          nodeColor="#0ea5e9"
          maskColor="rgba(2, 6, 23, 0.55)"
          className="!border !border-white/10 !bg-slate-950/90"
        />
        <Controls className="!border !border-white/10 !bg-slate-950/90 !text-white" />

        <Panel position="bottom-left">
          <div className="rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-md">
            <p className="font-mono text-[10px] tracking-[0.24em] text-cyan-300">CURRENT PATH</p>
            <p className="mt-2 text-sm text-slate-200">{analysis.routeLabels.join(" -> ")}</p>
            {!disabled ? (
              <p className="mt-2 text-xs text-slate-400">
                Drag boxes to reposition them. Delete edges and reconnect handles to break the flow.
              </p>
            ) : null}
          </div>
        </Panel>
      </ReactFlow>
        </div>

        <aside className="border-l border-white/10 bg-slate-950/65 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neon-yellow">
            WHAT THIS MEANS
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-mono text-[10px] text-slate-400">DANGER SCORE</p>
            <p className="mt-2 font-display text-4xl text-white">{analysis.attackSurfaceScore}</p>
            <p className="mt-2 text-xs text-slate-400">{analysis.exploitNarrative}</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-cyan-300">
              JSON VERDICT // {analysis.verdictLabel}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {(analysis.sabotageActionsDetected.length > 0
              ? analysis.sabotageActionsDetected
              : ["No exploit path locked yet. Use one sabotage move to create a playable incident."]).map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              )
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-mono text-[10px] tracking-[0.24em] text-cyan-300">JSON DERIVATION</p>
            <div className="mt-3 space-y-2">
              {analysis.derivedSteps.map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
