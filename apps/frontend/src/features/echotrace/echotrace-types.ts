import type { Edge, Node } from "reactflow";

export type EchoTraceNodeKind =
  | "entryPoint"
  | "middleware"
  | "authentication"
  | "databaseRoute"
  | "dropTraffic"
  | "bypassAuth";

export type EchoTraceNodeData = {
  label: string;
  description: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  config?: Record<string, string | number | boolean>;
};

export type EchoTraceFlowNode = Node<EchoTraceNodeData, EchoTraceNodeKind>;
export type EchoTraceFlowEdge = Edge;

export type LogicStep =
  | { type: "entry"; id: string; label: string }
  | { type: "middleware"; id: string; label: string; rules: string[] }
  | { type: "auth"; id: string; label: string; strategy: string }
  | { type: "database"; id: string; label: string; target: string; action: string }
  | { type: "drop"; id: string; label: string }
  | { type: "bypass"; id: string; label: string };

export type LogicGraphSnapshot = {
  nodes: EchoTraceFlowNode[];
  edges: EchoTraceFlowEdge[];
};

export type EchoTraceScenario = {
  id: string;
  title: string;
  sector: string;
  summary: string;
  stakes: string;
  targetAsset: string;
  primaryObjective: string;
  saboteurGoal: string;
  developerGoal: string;
  aiSabotagePlan: SabotageAction[];
  runtimeMode: string;
  entryLabel: string;
  middlewareLabel: string;
  middlewareRules: string[];
  authLabel: string;
  authStrategy: string;
  resourceName: string;
  routeAction: string;
  issueType:
    | "db-before-auth"
    | "bypass-before-auth"
    | "drop-after-auth"
    | "auth-disconnected"
    | "middleware-skipped"
    | "entry-shortcut"
    | "auth-after-drop"
    | "bypass-drop-chain";
  policyName: string;
  incidentBrief: string;
  repairTarget: string;
  entryDescription: string;
  middlewareDescription: string;
  authDescription: string;
  routeDescription: string;
};

export type SabotageAction = "reroute-to-database" | "insert-bypass" | "drop-after-auth";

export type EchoTraceGraphAnalysis = {
  routeLabels: string[];
  findings: string[];
  sabotageActionsDetected: string[];
  derivedSteps: string[];
  jsonAuditTrail: string[];
  criticalCount: number;
  sabotageCount: number;
  secure: boolean;
  severity: "secure" | "warning" | "critical";
  attackSurfaceScore: number;
  exploitNarrative: string;
  verdictLabel: string;
};

export type EchoTraceEvaluation = {
  passed: boolean;
  findings: string[];
  summary: string;
  tone: "success" | "failure";
  finalScore: number;
  patchQuality: number;
  cleanupScore: number;
  resilienceScore: number;
};
