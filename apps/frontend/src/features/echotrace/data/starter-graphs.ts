import type {
  EchoTraceFlowEdge,
  EchoTraceFlowNode,
  EchoTraceScenario,
  LogicGraphSnapshot,
  SabotageAction
} from "../echotrace-types";

function makeBaseNodes(scenario: EchoTraceScenario): EchoTraceFlowNode[] {
  return [
    {
      id: "entry-1",
      type: "entryPoint",
      position: { x: 90, y: 250 },
      data: {
        label: scenario.entryLabel,
        description: scenario.entryDescription,
        config: {
          mode: scenario.runtimeMode,
          policyName: scenario.policyName,
          incidentBrief: scenario.incidentBrief,
          repairTarget: scenario.repairTarget
        },
        riskLevel: "low"
      }
    },
    {
      id: "middleware-1",
      type: "middleware",
      position: { x: 390, y: 250 },
      data: {
        label: scenario.middlewareLabel,
        description: scenario.middlewareDescription,
        config: {
          rules: scenario.middlewareRules.join("|")
        },
        riskLevel: "low"
      }
    },
    {
      id: "auth-1",
      type: "authentication",
      position: { x: 710, y: 250 },
      data: {
        label: scenario.authLabel,
        description: scenario.authDescription,
        config: {
          strategy: scenario.authStrategy
        },
        riskLevel: "low"
      }
    },
    {
      id: "db-1",
      type: "databaseRoute",
      position: { x: 1030, y: 250 },
      data: {
        label: scenario.targetAsset,
        description: scenario.routeDescription,
        config: {
          resource: scenario.resourceName,
          action: scenario.routeAction
        },
        riskLevel: "medium"
      }
    }
  ];
}

function makeBaseEdges(): EchoTraceFlowEdge[] {
  return [
    { id: "e1", source: "entry-1", target: "middleware-1", animated: true },
    { id: "e2", source: "middleware-1", target: "auth-1", animated: true },
    { id: "e3", source: "auth-1", target: "db-1", animated: true }
  ];
}

export function createStarterGraph(scenario: EchoTraceScenario): LogicGraphSnapshot {
  return {
    nodes: makeBaseNodes(scenario),
    edges: makeBaseEdges()
  };
}

export function createBrokenGraph(scenario: EchoTraceScenario): LogicGraphSnapshot {
  const baseSnapshot = createStarterGraph(scenario);
  const baseNodes = baseSnapshot.nodes;
  const entryEdge = { id: "e1", source: "entry-1", target: "middleware-1", animated: true };
  const bypassNode: EchoTraceFlowNode = {
    id: "bypass-1",
    type: "bypassAuth",
    position: { x: 710, y: 420 },
    data: {
      label: "Manual Override",
      description: "Injected shortcut that skips the normal identity checkpoint.",
      riskLevel: "critical"
    }
  };
  const dropNode: EchoTraceFlowNode = {
    id: "drop-1",
    type: "dropTraffic",
    position: { x: 1030, y: 420 },
    data: {
      label: "Traffic Dropper",
      description: "Injected failure block that kills requests in the active path.",
      riskLevel: "high"
    }
  };

  switch (scenario.issueType) {
    case "db-before-auth":
      return {
        nodes: baseNodes,
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "db-1", animated: true },
          { id: "e3", source: "db-1", target: "auth-1", animated: true }
        ]
      };
    case "bypass-before-auth":
      return {
        nodes: [...baseNodes, bypassNode],
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "bypass-1", animated: true },
          { id: "e3", source: "bypass-1", target: "db-1", animated: true },
          { id: "e4", source: "auth-1", target: "db-1", animated: false }
        ]
      };
    case "drop-after-auth":
      return {
        nodes: [...baseNodes, dropNode],
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "auth-1", animated: true },
          { id: "e3", source: "auth-1", target: "drop-1", animated: true },
          { id: "e4", source: "drop-1", target: "db-1", animated: true }
        ]
      };
    case "auth-disconnected":
      return {
        nodes: baseNodes,
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "db-1", animated: true }
        ]
      };
    case "middleware-skipped":
      return {
        nodes: baseNodes,
        edges: [
          { id: "e1", source: "entry-1", target: "auth-1", animated: true },
          { id: "e2", source: "auth-1", target: "db-1", animated: true }
        ]
      };
    case "entry-shortcut":
      return {
        nodes: [...baseNodes, bypassNode],
        edges: [
          { id: "e1", source: "entry-1", target: "bypass-1", animated: true },
          { id: "e2", source: "bypass-1", target: "db-1", animated: true },
          { id: "e3", source: "middleware-1", target: "auth-1", animated: false },
          { id: "e4", source: "auth-1", target: "db-1", animated: false }
        ]
      };
    case "auth-after-drop":
      return {
        nodes: [...baseNodes, dropNode],
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "drop-1", animated: true },
          { id: "e3", source: "drop-1", target: "auth-1", animated: true },
          { id: "e4", source: "auth-1", target: "db-1", animated: true }
        ]
      };
    case "bypass-drop-chain":
      return {
        nodes: [...baseNodes, bypassNode, dropNode],
        edges: [
          entryEdge,
          { id: "e2", source: "middleware-1", target: "bypass-1", animated: true },
          { id: "e3", source: "bypass-1", target: "drop-1", animated: true },
          { id: "e4", source: "drop-1", target: "db-1", animated: true }
        ]
      };
    default:
      return baseSnapshot;
  }
}

export function applySabotageAction(
  snapshot: LogicGraphSnapshot,
  action: SabotageAction,
  options?: {
    attachToFlow?: boolean;
  }
): LogicGraphSnapshot {
  const attachToFlow = options?.attachToFlow ?? false;
  const sabotageCount = snapshot.nodes.filter(
    (node) => node.type === "bypassAuth" || node.type === "dropTraffic"
  ).length;
  const nextIndex = sabotageCount + 1;

  if (!attachToFlow) {
    if (action === "drop-after-auth") {
      return {
        nodes: [
          ...snapshot.nodes,
          {
            id: `drop-${nextIndex}`,
            type: "dropTraffic",
            position: { x: 840, y: 420 + sabotageCount * 88 },
            data: {
              label: "Request Dropper",
              description: "A sabotage block you can wire into the path yourself",
              riskLevel: "high"
            }
          }
        ],
        edges: snapshot.edges
      };
    }

    return {
      nodes: [
        ...snapshot.nodes,
        {
          id: `bypass-${nextIndex}`,
          type: "bypassAuth",
          position: { x: 760, y: 420 + sabotageCount * 88 },
          data: {
            label: action === "reroute-to-database" ? "Route Hijack" : "Manual Override",
            description:
              action === "reroute-to-database"
                ? "Use this block if you want to reroute traffic toward data early"
                : "Use this block if you want to create a login shortcut",
            riskLevel: "critical"
          }
        }
      ],
      edges: snapshot.edges
    };
  }

  const baseNodes = snapshot.nodes.filter(
    (node) => node.type !== "bypassAuth" && node.type !== "dropTraffic"
  );
  const entryEdge = { id: "e1", source: "entry-1", target: "middleware-1", animated: true };

  if (action === "insert-bypass") {
    return {
      nodes: [
        ...baseNodes,
        {
          id: "bypass-1",
          type: "bypassAuth",
          position: { x: 720, y: 420 },
          data: {
            label: "Manual Override",
            description: "Forces a path around auth",
            riskLevel: "critical"
          }
        }
      ],
      edges: [
        entryEdge,
        { id: "e2", source: "middleware-1", target: "bypass-1", animated: true },
        { id: "e3", source: "bypass-1", target: "db-1", animated: true },
        { id: "e4", source: "auth-1", target: "db-1", animated: false }
      ]
    };
  }

  if (action === "drop-after-auth") {
    return {
      nodes: [
        ...baseNodes,
        {
          id: "drop-1",
          type: "dropTraffic",
          position: { x: 1030, y: 420 },
          data: {
            label: "Traffic Dropper",
            description: "Silently drops requests after auth",
            riskLevel: "high"
          }
        }
      ],
      edges: [
        entryEdge,
        { id: "e2", source: "middleware-1", target: "auth-1", animated: true },
        { id: "e3", source: "auth-1", target: "drop-1", animated: true },
        { id: "e4", source: "drop-1", target: "db-1", animated: true }
      ]
    };
  }

  return {
    nodes: baseNodes,
    edges: [
      entryEdge,
      { id: "e2", source: "middleware-1", target: "db-1", animated: true },
      { id: "e3", source: "db-1", target: "auth-1", animated: true }
    ]
  };
}

export function applySabotageLoadout(
  scenario: EchoTraceScenario,
  actions: SabotageAction[]
): LogicGraphSnapshot {
  return actions.reduce(
    (snapshot, action) => applySabotageAction(snapshot, action, { attachToFlow: true }),
    createStarterGraph(scenario)
  );
}

export const starterNodes = makeBaseNodes({
  id: "starter-preview",
  title: "Starter Preview",
  sector: "SAAS",
  summary: "",
  stakes: "",
  targetAsset: "Customer Records",
  primaryObjective: "",
  saboteurGoal: "",
  developerGoal: "",
  aiSabotagePlan: [],
  runtimeMode: "request_pipeline",
  entryLabel: "Public API Gateway",
  middlewareLabel: "Request Middleware",
  middlewareRules: ["sanitize_headers", "validate_origin"],
  authLabel: "JWT Auth Guard",
  authStrategy: "jwt_session_guard",
  resourceName: "customer_records",
  routeAction: "read_write",
  issueType: "db-before-auth",
  policyName: "starter_preview_runtime",
  incidentBrief: "Preview incident",
  repairTarget: "Restore the safe trust chain.",
  entryDescription: "Public ingress for the business flow.",
  middlewareDescription: "Shared validation and request shaping before privileged logic.",
  authDescription: "Identity check before protected resources are reached.",
  routeDescription: "Protected business route that should only be reachable after auth."
});
export const starterEdges = makeBaseEdges();
