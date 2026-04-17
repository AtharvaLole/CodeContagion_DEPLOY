import type {
  EchoTraceGraphAnalysis,
  EchoTraceEvaluation,
  EchoTraceFlowEdge,
  EchoTraceFlowNode,
  LogicStep
} from "./echotrace-types";

function getOutgoingEdges(nodeId: string, edges: EchoTraceFlowEdge[]) {
  return edges.filter((edge) => edge.source === nodeId);
}

function getNodeById(nodeId: string, nodes: EchoTraceFlowNode[]) {
  return nodes.find((node) => node.id === nodeId) ?? null;
}

function toLogicStep(node: EchoTraceFlowNode): LogicStep {
  switch (node.type) {
    case "entryPoint":
      return { type: "entry", id: node.id, label: node.data.label };
    case "middleware":
      return {
        type: "middleware",
        id: node.id,
        label: node.data.label,
        rules:
          typeof node.data.config?.rules === "string"
            ? node.data.config.rules.split("|").filter(Boolean)
            : ["sanitize_headers", "validate_origin"]
      };
    case "authentication":
      return {
        type: "auth",
        id: node.id,
        label: node.data.label,
        strategy:
          typeof node.data.config?.strategy === "string"
            ? node.data.config.strategy
            : "jwt_session_guard"
      };
    case "databaseRoute":
      return {
        type: "database",
        id: node.id,
        label: node.data.label,
        target:
          typeof node.data.config?.resource === "string"
            ? node.data.config.resource
            : "customer_records",
        action:
          typeof node.data.config?.action === "string"
            ? node.data.config.action
            : "read_write"
      };
    case "dropTraffic":
      return { type: "drop", id: node.id, label: node.data.label };
    case "bypassAuth":
      return { type: "bypass", id: node.id, label: node.data.label };
    default:
      throw new Error(`Unsupported node type: ${node.type satisfies never}`);
  }
}

function findEntryNode(nodes: EchoTraceFlowNode[]) {
  return nodes.find((node) => node.type === "entryPoint") ?? null;
}

function expectedStepLabel(stepType: LogicStep["type"]) {
  switch (stepType) {
    case "entry":
      return "entry";
    case "middleware":
      return "middleware";
    case "auth":
      return "authentication";
    case "database":
      return "protected route";
    case "drop":
      return "traffic control";
    case "bypass":
      return "policy override";
  }
}

function buildLinearExecutionPath(nodes: EchoTraceFlowNode[], edges: EchoTraceFlowEdge[]) {
  const entry = findEntryNode(nodes);
  if (!entry) {
    return [];
  }

  const visited = new Set<string>();
  const result: LogicStep[] = [];
  let current: EchoTraceFlowNode | null = entry;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.push(toLogicStep(current));

    const nextEdge = getOutgoingEdges(current.id, edges).sort((left, right) => {
      const leftTarget = getNodeById(left.target, nodes);
      const rightTarget = getNodeById(right.target, nodes);

      return (leftTarget?.position.x ?? 0) - (rightTarget?.position.x ?? 0);
    })[0];
    if (!nextEdge) {
      break;
    }

    current = getNodeById(nextEdge.target, nodes);
  }

  return result;
}

function detectFindings(path: LogicStep[]) {
  const findings: string[] = [];
  const middlewareIndex = path.findIndex((step) => step.type === "middleware");
  const authIndex = path.findIndex((step) => step.type === "auth");
  const dbIndex = path.findIndex((step) => step.type === "database");
  const bypassIndex = path.findIndex((step) => step.type === "bypass");

  if (middlewareIndex === -1) {
    findings.push("HIGH: shared validation layer is missing from the active flow.");
  }

  if (middlewareIndex !== -1 && authIndex !== -1 && middlewareIndex > authIndex) {
    findings.push("HIGH: middleware runs after authentication instead of before it.");
  }

  if (dbIndex !== -1 && authIndex === -1) {
    findings.push("CRITICAL: database route is reachable without authentication.");
  }

  if (authIndex !== -1 && dbIndex !== -1 && dbIndex < authIndex) {
    findings.push("CRITICAL: database route appears before authentication in execution order.");
  }

  if (bypassIndex !== -1) {
    findings.push("HIGH: manual auth bypass node detected in active flow.");
  }

  if (path.some((step) => step.type === "drop")) {
    findings.push("MEDIUM: traffic disruption rule injected into request path.");
  }

  return findings;
}

function pickVariant(source: string, variants: string[]) {
  const hash = Array.from(source).reduce(
    (total, character, index) => total + character.charCodeAt(0) * (index + 1),
    0
  );

  return variants[Math.abs(hash) % variants.length];
}

function extractDeclaredBlocks(source: string) {
  const blockMatches = source.matchAll(
    /\b(entry|middleware|authentication|route|traffic_control|policy_override)\s+"/g
  );

  return Array.from(blockMatches, (match) => match[1]);
}

function countFindingsBySeverity(findings: string[]) {
  return findings.reduce(
    (totals, finding) => {
      if (finding.startsWith("CRITICAL")) totals.critical += 1;
      else if (finding.startsWith("HIGH")) totals.high += 1;
      else if (finding.startsWith("MEDIUM")) totals.medium += 1;
      else totals.other += 1;
      return totals;
    },
    { critical: 0, high: 0, medium: 0, other: 0 }
  );
}

function buildJsonAuditTrail(
  nodes: EchoTraceFlowNode[],
  edges: EchoTraceFlowEdge[],
  path: LogicStep[],
  secure: boolean
) {
  const audit: string[] = [
    `Loaded ${nodes.length} nodes and ${edges.length} edges from the React Flow JSON.`,
    path.length > 0
      ? `Started path derivation from entry node "${path[0].label}".`
      : "No valid entry node could be found in the JSON."
  ];

  if (path.length > 1) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const current = path[index];
      const next = path[index + 1];
      audit.push(
        `Followed the active edge from ${expectedStepLabel(current.type)} "${current.label}" to ${expectedStepLabel(next.type)} "${next.label}".`
      );
    }
  }

  audit.push(
    "Compared the derived order against the safe baseline: entry -> middleware -> authentication -> protected route."
  );
  audit.push(
    secure
      ? "Verdict: the JSON-derived path matches the safe trust chain."
      : "Verdict: the JSON-derived path breaks the safe trust chain or contains sabotage."
  );

  return audit;
}

function buildDerivedSteps(path: LogicStep[], secure: boolean, findings: string[]) {
  if (path.length === 0) {
    return ["No valid request path could be derived from the current canvas JSON."];
  }

  const steps = path.map((step, index) => {
    switch (step.type) {
      case "entry":
        return `${index + 1}. Request enters through "${step.label}".`;
      case "middleware":
        return `${index + 1}. Middleware "${step.label}" shapes and validates the request.`;
      case "auth":
        return `${index + 1}. Authentication "${step.label}" verifies access before protected work.`;
      case "database":
        return `${index + 1}. Protected route "${step.label}" is reached for ${step.action.replace(/_/g, " ")}.`;
      case "drop":
        return `${index + 1}. Traffic control "${step.label}" interrupts the request path.`;
      case "bypass":
        return `${index + 1}. Policy override "${step.label}" creates a shortcut around the normal trust chain.`;
    }
  });

  steps.push(
    secure
      ? "Final check: the derived path is safe and matches the intended order."
      : `Final check: the derived path is broken. ${findings[0] ?? "A trust-chain issue is still present."}`
  );

  return steps;
}

export function analyzeGraphSecurity(
  nodes: EchoTraceFlowNode[],
  edges: EchoTraceFlowEdge[]
): EchoTraceGraphAnalysis {
  const path = buildLinearExecutionPath(nodes, edges);
  const findings = detectFindings(path);
  const labels = path.map((step) => step.label);
  const sabotageActionsDetected: string[] = [];

  if (path.some((step) => step.type === "bypass")) {
    sabotageActionsDetected.push("Auth bypass inserted into the active path.");
  }

  if (path.some((step) => step.type === "drop")) {
    sabotageActionsDetected.push("Traffic dropper now sits in the request pipeline.");
  }

  const authIndex = path.findIndex((step) => step.type === "auth");
  const dbIndex = path.findIndex((step) => step.type === "database");

  if (dbIndex !== -1 && authIndex !== -1 && dbIndex < authIndex) {
    sabotageActionsDetected.push("Protected data route now appears before authentication.");
  }

  const criticalCount = findings.filter((finding) => finding.startsWith("CRITICAL")).length;
  const sabotageCount = path.filter(
    (step) => step.type === "bypass" || step.type === "drop"
  ).length + (dbIndex !== -1 && authIndex !== -1 && dbIndex < authIndex ? 1 : 0);
  const secure = findings.length === 0;
  const attackSurfaceScore = Math.max(
    0,
    Math.min(100, 28 + criticalCount * 24 + sabotageCount * 17 + (secure ? -20 : 0))
  );
  const derivedSteps = buildDerivedSteps(path, secure, findings);
  const jsonAuditTrail = buildJsonAuditTrail(nodes, edges, path, secure);

  return {
    routeLabels: labels,
    findings,
    sabotageActionsDetected,
    derivedSteps,
    jsonAuditTrail,
    criticalCount,
    sabotageCount,
    secure,
    severity: secure ? "secure" : criticalCount > 0 ? "critical" : "warning",
    attackSurfaceScore,
    exploitNarrative: secure
      ? "The request still flows through middleware, authentication, and the protected route in a safe order."
      : `The current path runs as ${labels.join(" -> ")}, leaving an exploitable business-logic gap for the responder.`,
    verdictLabel: secure ? "SAFE FLOW" : "BROKEN FLOW"
  };
}

function renderStep(step: LogicStep) {
  switch (step.type) {
    case "entry":
      return [`entry "${step.label}" {`, `}`].join("\n");
    case "middleware":
      return [`middleware "${step.label}" {`, ...step.rules.map((rule) => `  rule = "${rule}"`), `}`].join("\n");
    case "auth":
      return [
        `authentication "${step.label}" {`,
        `  strategy = "${step.strategy}"`,
        `  enforce = true`,
        `}`
      ].join("\n");
    case "database":
      return [
        `route "${step.label}" {`,
        `  resource = "${step.target}"`,
        `  action = "${step.action}"`,
        `}`
      ].join("\n");
    case "drop":
      return [`traffic_control "${step.label}" {`, `  action = "drop"`, `}`].join("\n");
    case "bypass":
      return [
        `policy_override "${step.label}" {`,
        `  skip_auth = true`,
        `  reason = "manual override injected"`,
        `}`
      ].join("\n");
  }
}

export function translateGraphToCode(nodes: EchoTraceFlowNode[], edges: EchoTraceFlowEdge[]) {
  const path = buildLinearExecutionPath(nodes, edges);
  const analysis = analyzeGraphSecurity(nodes, edges);
  const entryNode = findEntryNode(nodes);
  const runtimeMode =
    typeof entryNode?.data.config?.mode === "string" ? String(entryNode.data.config.mode) : "request_pipeline";
  const policyName =
    typeof entryNode?.data.config?.policyName === "string"
      ? String(entryNode.data.config.policyName)
      : "echotrace_runtime";
  const incidentBrief =
    typeof entryNode?.data.config?.incidentBrief === "string"
      ? String(entryNode.data.config.incidentBrief)
      : "";
  const repairTarget =
    typeof entryNode?.data.config?.repairTarget === "string"
      ? String(entryNode.data.config.repairTarget)
      : "";

  if (path.length === 0) {
    return `policy "echotrace_runtime" {\n  error = "No valid entry point found."\n}`;
  }

  const body = path.map(renderStep).join("\n\n");
  const findingsBlock =
    analysis.findings.length > 0
      ? analysis.findings.map((finding) => `# ${finding}`).join("\n")
      : "# SECURE: no immediate logic anomaly detected.";

  return [
    `policy "${policyName}" {`,
    `  mode = "${runtimeMode}"`,
    `  attack_surface_score = ${analysis.attackSurfaceScore}`,
    ``,
    ...(incidentBrief ? [`# INCIDENT: ${incidentBrief}`] : []),
    ...(repairTarget ? [`# REPAIR TARGET: ${repairTarget}`] : []),
    ...(incidentBrief || repairTarget ? [""] : []),
    findingsBlock,
    ``,
    body,
    `}`
  ].join("\n");
}

export function evaluateFix(developerCode: string, initialCode?: string): EchoTraceEvaluation {
  const normalized = developerCode.toLowerCase();
  const normalizedInitial = initialCode?.toLowerCase().trim();
  const findings: string[] = [];
  const declaredBlocks = extractDeclaredBlocks(normalized);
  const hasEntry = normalized.includes('entry "');
  const hasMiddleware = normalized.includes("middleware");
  const hasAuth = normalized.includes("authentication") && normalized.includes("enforce = true");
  const hasDatabase = normalized.includes('route "') && normalized.includes('resource = "') && normalized.includes('action = "');
  const hasBypass = normalized.includes("skip_auth = true");
  const hasDrop = normalized.includes('action = "drop"');
  const unchangedSubmission = Boolean(normalizedInitial) && normalized.trim() === normalizedInitial;

  if (!hasEntry) findings.push("Missing entry point declaration.");
  if (!hasMiddleware) findings.push("Shared validation middleware is missing from the runtime.");
  if (!hasAuth) findings.push("Authentication block is missing or not enforcing access.");
  if (!hasDatabase) findings.push("Protected database route is missing.");
  if (hasBypass) findings.push("Auth bypass override is still present.");
  if (hasDrop) findings.push("Traffic drop sabotage is still present.");

  const middlewareIndex = normalized.indexOf("middleware");
  const authIndex = normalized.indexOf("authentication");
  const dbIndex = normalized.indexOf('route "');
  if (middlewareIndex !== -1 && authIndex !== -1 && middlewareIndex > authIndex) {
    findings.push("Middleware still runs after authentication.");
  }
  if (authIndex !== -1 && dbIndex !== -1 && authIndex > dbIndex) {
    findings.push("Authentication is still declared after the database route.");
  }

  const blockOrder = declaredBlocks.join(" -> ");
  const expectedSafeOrder = "entry -> middleware -> authentication -> route";
  if (
    declaredBlocks.length >= 4 &&
    declaredBlocks.slice(0, 4).join(" -> ") !== expectedSafeOrder
  ) {
    findings.push(`Active block order is still unsafe: ${blockOrder}.`);
  }

  if (declaredBlocks.includes("policy_override")) {
    findings.push("Auth bypass override is still part of the declared runtime.");
  }

  if (declaredBlocks.includes("traffic_control")) {
    findings.push("Traffic drop block is still part of the declared runtime.");
  }

  if (unchangedSubmission) {
    findings.push("No runtime edits detected. The broken policy was shipped unchanged.");
  }

  const passed = findings.length === 0;
  const severity = countFindingsBySeverity(findings);
  // Weight score toward real recovery. Unchanged or still-unsafe submissions should never grade highly.
  const patchQuality = passed
    ? 44
    : Math.max(
        0,
        28 -
          severity.critical * 14 -
          severity.high * 9 -
          severity.medium * 6 -
          severity.other * 5 -
          (unchangedSubmission ? 10 : 0)
      );
  const cleanupScore = passed
    ? 28
    : Math.max(0, 16 - (hasBypass ? 10 : 0) - (hasDrop ? 8 : 0) - (unchangedSubmission ? 4 : 0));
  const resilienceScore = passed
    ? 28
    : Math.max(0, 18 - severity.critical * 8 - severity.high * 5 - severity.medium * 3);
  const successSummaries = [
    "Secure business logic restored. Authentication now protects the database route.",
    "Recovery successful. The protected route is back behind enforced authentication.",
    "Deployment hardened. The exploit path has been removed and the trust chain is intact."
  ];
  const failureSummaries = [
    "The deployment still contains exploitable business-logic risk.",
    "The incident is not fully contained yet. The runtime still exposes a risky path.",
    "Repair attempt incomplete. The pipeline still allows unsafe behavior in production."
  ];

  return {
    passed,
    findings,
    summary: pickVariant(
      developerCode + findings.join("|"),
      passed ? successSummaries : failureSummaries
    ),
    tone: passed ? "success" : "failure",
    finalScore: passed
      ? Math.max(82, Math.min(100, patchQuality + cleanupScore + resilienceScore))
      : Math.max(0, Math.min(59, patchQuality + cleanupScore + resilienceScore)),
    patchQuality,
    cleanupScore,
    resilienceScore
  };
}
