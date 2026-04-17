import { randomUUID } from "node:crypto";
import { createInitialNetwork, findMisinfoContentById } from "./misinfo-sim.data.js";
import { findSession, saveSession } from "./misinfo-sim.repository.js";
import type {
  MisinfoContent,
  MisinfoReviewItem,
  MisinfoSimulationResult,
  SimNode,
  SoloSimulationState
} from "./misinfo-sim.types.js";

function timestampLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function computePanic(nodes: SimNode[], panicPenalty = 0) {
  const infectedWeight = nodes
    .filter((node) => node.status === "infected")
    .reduce((sum, node) => sum + node.followers, 0);
  const flaggedWeight = nodes
    .filter((node) => node.status === "flagged")
    .reduce((sum, node) => sum + Math.round(node.followers * 0.18), 0);
  const totalWeight = nodes.reduce((sum, node) => sum + node.followers, 0);
  const weightedSpread = ((infectedWeight + flaggedWeight) / Math.max(1, totalWeight)) * 72;
  return Math.min(99, Math.max(3, Math.round(weightedSpread + panicPenalty)));
}

function refreshRecoveredFlags(nodes: SimNode[]) {
  return nodes.map((node) => (node.status === "flagged" ? { ...node, status: "recovered" as const } : node));
}

export async function createSoloSimulation() {
  const network = createInitialNetwork();
  const session: SoloSimulationState = {
    sessionId: randomUUID(),
    createdAt: new Date().toISOString(),
    timeLeft: 180,
    actionPoints: network.nodes.length,
    maxActionPoints: network.nodes.length,
    tick: 0,
    panicLevel: computePanic(network.nodes),
    panicPenalty: 0,
    chatbotQuestionsUsed: 0,
    chatbotQuestionLimit: 5,
    nodes: network.nodes,
    edges: network.edges,
    log: [
      { type: "system", message: "Patient Zero detected in two active clusters.", time: timestampLabel() },
      { type: "intel", message: "AI forensics suite online. Investigate suspicious nodes before severing reach.", time: timestampLabel() }
    ]
  };

  await saveSession(session);
  return session;
}

export async function getSoloSimulation(sessionId: string) {
  return findSession(sessionId);
}

function infectNeighbors(state: SoloSimulationState) {
  const nextNodes = [...state.nodes];
  const infectedIds = nextNodes.filter((node) => node.status === "infected").map((node) => node.id);

  infectedIds.forEach((nodeId) => {
    state.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => (edge.source === nodeId ? edge.target : edge.source))
      .forEach((neighborId) => {
        const neighbor = nextNodes.find((node) => node.id === neighborId);
        const neighborContent = getNodeContent(neighbor?.contentId);
        if (neighbor && neighbor.status === "susceptible" && neighborContent && !neighborContent.isReal) {
          const spreadRoll = ((neighbor.followers + state.tick * 17 + neighbor.credibility * 3) % 100) / 100;
          const spreadChance = neighbor.credibility < 45 ? 0.34 : neighbor.credibility < 65 ? 0.24 : 0.16;
          if (spreadRoll < spreadChance) {
            neighbor.status = "infected";
          }
        }
      });
  });

  return nextNodes;
}

export async function advanceSoloSimulation(sessionId: string) {
  const session = await findSession(sessionId);

  if (!session) {
    throw new Error("Simulation session not found.");
  }

  const updatedNodes = infectNeighbors(session);
  const nextState: SoloSimulationState = {
    ...session,
    tick: session.tick + 1,
    timeLeft: Math.max(0, session.timeLeft - 15),
    nodes: refreshRecoveredFlags(updatedNodes),
    panicLevel: computePanic(updatedNodes, session.panicPenalty),
    log: [
      ...session.log.slice(-8),
      { type: "system", message: "Network propagation tick executed.", time: timestampLabel() }
    ]
  };

  await saveSession(nextState);
  return nextState;
}

function getNodeContent(nodeContentId?: string): MisinfoContent | null {
  return findMisinfoContentById(nodeContentId);
}

export async function inspectNode(sessionId: string, nodeId: number) {
  const session = await findSession(sessionId);

  if (!session) {
    throw new Error("Simulation session not found.");
  }

  const node = session.nodes.find((entry) => entry.id === nodeId);

  if (!node) {
    throw new Error("Node not found.");
  }

  const content = getNodeContent(node.contentId);

  return {
    node,
    content
  };
}

export async function actOnNode(input: {
  sessionId: string;
  nodeId: number;
  action: "investigate" | "fact-check" | "quarantine";
  actor?: {
    userId?: string;
    handle?: string;
  };
}) {
  const session = await findSession(input.sessionId);

  if (!session) {
    throw new Error("Simulation session not found.");
  }

  const node = session.nodes.find((entry) => entry.id === input.nodeId);

  if (!node) {
    throw new Error("Node not found.");
  }

  const costs = {
    investigate: 0,
    "fact-check": 0,
    quarantine: 0
  } as const;

  const cost = costs[input.action];

  if (node.resolvedByAction) {
    throw new Error(`Node already locked by ${node.resolvedByAction.toUpperCase()}. Decisions are irreversible.`);
  }

  let updatedNodes = session.nodes.map((entry) => ({ ...entry }));
  let panicPenalty = session.panicPenalty;
  let actionMessage = "";
  const content = getNodeContent(node.contentId);
  const isRealArticle = content?.isReal ?? false;

  if (input.action === "investigate") {
    actionMessage = `Deep forensic scan completed on ${node.label}.`;
  }

  if (input.action === "fact-check") {
    updatedNodes = updatedNodes.map((entry) =>
      entry.id === input.nodeId
        ? {
            ...entry,
            status: "flagged",
            resolvedByAction: "fact-check",
            resolvedByUserId: input.actor?.userId,
            resolvedByUserHandle: input.actor?.handle
          }
        : entry
    );
    actionMessage = isRealArticle
      ? `False alarm: ${node.label} was fact-checked even though the article leans credible. Public trust dipped.`
      : `Fact-check deployed against ${node.label}.`;
    if (isRealArticle) {
      panicPenalty += 6;
    }
  }

  if (input.action === "quarantine") {
    updatedNodes = updatedNodes.map((entry) =>
      entry.id === input.nodeId
        ? {
            ...entry,
            status: "recovered",
            resolvedByAction: "quarantine",
            resolvedByUserId: input.actor?.userId,
            resolvedByUserHandle: input.actor?.handle
          }
        : entry
    );
    actionMessage = isRealArticle
      ? `Overreach warning: ${node.label} was quarantined despite carrying a credible report.`
      : `Quarantine wall deployed around ${node.label}.`;
    if (isRealArticle) {
      panicPenalty += 8;
    }
  }

  const nextState: SoloSimulationState = {
    ...session,
    nodes: updatedNodes,
    panicPenalty,
    panicLevel: computePanic(updatedNodes, panicPenalty),
    log: [
      ...session.log.slice(-8),
      { type: "action", message: actionMessage, time: timestampLabel() }
    ]
  };

  await saveSession(nextState);

  return {
    session: nextState,
    inspected: {
      node: updatedNodes.find((entry) => entry.id === input.nodeId) ?? node,
      content: getNodeContent(node.contentId)
    }
  };
}

export async function consumeSoloChatbotQuestion(input: {
  sessionId: string;
  nodeId: number;
  question: string;
}) {
  const session = await findSession(input.sessionId);

  if (!session) {
    throw new Error("Simulation session not found.");
  }

  if (session.chatbotQuestionsUsed >= session.chatbotQuestionLimit) {
    throw new Error("Chatbot limit reached for this solo run.");
  }

  const inspected = await inspectNode(input.sessionId, input.nodeId);

  if (!inspected.content) {
    throw new Error("No linked news item found for this node.");
  }

  const nextState: SoloSimulationState = {
    ...session,
    chatbotQuestionsUsed: session.chatbotQuestionsUsed + 1,
    log: [
      ...session.log.slice(-8),
      {
        type: "intel",
        message: `Chatbot consulted on ${inspected.node.label}: "${input.question.slice(0, 60)}${input.question.length > 60 ? "..." : ""}"`,
        time: timestampLabel()
      }
    ]
  };

  await saveSession(nextState);

  return {
    session: nextState,
    inspected
  };
}

function buildReviewItem(node: SimNode): MisinfoReviewItem | null {
  const content = getNodeContent(node.contentId);

  if (!content) {
    return null;
  }

  const actualType = content.isReal ? "real" : "fake";
  const selectedAction = node.resolvedByAction ?? "none";
  const wasCorrect =
    selectedAction === "none"
      ? content.isReal
      : content.isReal
        ? false
        : selectedAction === "fact-check" || selectedAction === "quarantine";

  const explanation =
    selectedAction === "none"
      ? content.isReal
        ? "No suppression was applied to a credible report, which preserved trust."
        : "This misinformation item was left unresolved, allowing risk to remain in the network."
      : content.isReal
        ? `This was a credible report, so ${selectedAction} was the wrong containment choice.`
        : `This story was misinformation, so ${selectedAction} was a valid containment choice.`;

  return {
    nodeId: node.id,
    nodeLabel: node.label,
    headline: content.headline,
    title: content.title,
    content: content.content,
    source: content.source,
    sourceType: content.sourceType,
    category: content.category,
    credibilityScore: content.credibilityScore,
    riskLevel: content.riskLevel,
    actualType,
    selectedAction,
    selectedByUserId: node.resolvedByUserId,
    selectedByHandle: node.resolvedByUserHandle,
    finalStatus: node.status,
    wasCorrect,
    explanation,
    evidence: content.evidence,
    clues: content.clues,
    manipulationSignals: content.manipulationSignals,
    reasoningSummary: content.reasoningSummary
  };
}

export function summarizeSoloResult(session: SoloSimulationState): MisinfoSimulationResult {
  const infected = session.nodes.filter((node) => node.status === "infected").length;
  const recovered = session.nodes.filter((node) => node.status === "recovered").length;
  const flagged = session.nodes.filter((node) => node.status === "flagged").length;
  const falsePositiveActions = session.nodes.filter((node) => {
    if (!node.resolvedByAction) {
      return false;
    }
    const content = getNodeContent(node.contentId);
    return content?.isReal ?? false;
  }).length;
  const correctlyContainedFakeNodes = session.nodes.filter((node) => {
    const content = getNodeContent(node.contentId);
    return Boolean(content && !content.isReal && node.resolvedByAction);
  }).length;
  const totalFakeNodes = session.nodes.filter((node) => {
    const content = getNodeContent(node.contentId);
    return Boolean(content && !content.isReal);
  }).length;
  const totalNodes = session.nodes.length;
  const containmentThreshold = Math.max(1, Math.floor(totalFakeNodes * 0.2));
  const strongRecoveryRatio = correctlyContainedFakeNodes / Math.max(1, totalFakeNodes);
  const contained =
    session.panicLevel <= 40 &&
    falsePositiveActions <= 1 &&
    (
      infected <= containmentThreshold ||
      strongRecoveryRatio >= 0.75 ||
      correctlyContainedFakeNodes >= Math.max(3, Math.floor(totalFakeNodes * 0.7))
    );
  const score = Math.max(
    0,
    100 -
      session.panicLevel +
      correctlyContainedFakeNodes * 6 +
      recovered * 2 +
      flagged * 2 -
      infected * 5 -
      falsePositiveActions * 9
  );
  const reviewItems = session.nodes
    .map((node) => buildReviewItem(node))
    .filter((item): item is MisinfoReviewItem => item !== null)
    .sort((left, right) => left.nodeLabel.localeCompare(right.nodeLabel));

  return {
    score,
    panicLevel: session.panicLevel,
    contained,
    recovered,
    infected,
    falsePositiveActions,
    chatbotQuestionsUsed: session.chatbotQuestionsUsed,
    chatbotQuestionLimit: session.chatbotQuestionLimit,
    reviewItems,
    summary:
      contained
        ? "Containment successful. You neutralized the dangerous misinformation cluster without over-censoring credible reporting."
        : session.panicLevel > 40
          ? "Containment failed. Panic crossed the critical 40% threshold before the network could be stabilized."
          : "Containment incomplete. Too many fake narratives remained active or credible reports were wrongly suppressed."
  };
}

export async function submitSoloSimulation(sessionId: string) {
  const session = await findSession(sessionId);

  if (!session) {
    throw new Error("Simulation session not found.");
  }

  return {
    session,
    result: summarizeSoloResult(session)
  };
}
