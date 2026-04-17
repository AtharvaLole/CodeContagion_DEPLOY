import { env } from "@/config/env";

export type SimNode = {
  id: number;
  label: string;
  followers: number;
  credibility: number;
  status: "susceptible" | "infected" | "recovered" | "flagged";
  x: number;
  y: number;
  contentId?: string;
  resolvedByAction?: "fact-check" | "quarantine";
  resolvedByUserId?: string;
  resolvedByUserHandle?: string;
};

export type SimEdge = {
  source: number;
  target: number;
};

export type MisinfoSession = {
  sessionId: string;
  createdAt: string;
  timeLeft: number;
  actionPoints: number;
  maxActionPoints: number;
  tick: number;
  panicLevel: number;
  panicPenalty: number;
  chatbotQuestionsUsed: number;
  chatbotQuestionLimit: number;
  nodes: SimNode[];
  edges: SimEdge[];
  log: Array<{
    type: "system" | "action" | "intel";
    message: string;
    time: string;
  }>;
};

export type MisinfoResult = {
  score: number;
  panicLevel: number;
  contained: boolean;
  recovered: number;
  infected: number;
  falsePositiveActions: number;
  chatbotQuestionsUsed: number;
  chatbotQuestionLimit: number;
  summary: string;
  reviewItems: MisinfoReviewItem[];
};

export type MisinfoReviewItem = {
  nodeId: number;
  nodeLabel: string;
  headline: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  category: string;
  credibilityScore: number;
  riskLevel: string;
  actualType: "fake" | "real";
  selectedAction: "none" | "investigate" | "fact-check" | "quarantine";
  selectedByUserId?: string;
  selectedByHandle?: string;
  finalStatus: "susceptible" | "infected" | "recovered" | "flagged";
  wasCorrect: boolean;
  explanation: string;
  evidence: string;
  clues: string[];
  manipulationSignals: string[];
  reasoningSummary: string;
};

export type InspectedNode = {
  node: SimNode;
  content: null | {
    id: string;
    title: string;
    headline: string;
    content: string;
    source: string;
    sourceType: string;
    category: string;
    credibilityScore: number;
    riskLevel: string;
    clues: string[];
    reasoningSummary: string;
    difficulty: string;
    internalLabel: "real" | "fake";
    isReal: boolean;
    evidence: string;
    manipulationSignals: string[];
    artifactHint: string;
  };
};

async function request<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Misinfo Sim request failed.");
  }

  return body as T;
}

export function createSoloSession(token: string) {
  return request<{ session: MisinfoSession }>("/api/v1/misinfo-sim/solo/session", token, {
    method: "POST"
  });
}

export function fetchSoloSession(token: string, sessionId: string) {
  return request<{ session: MisinfoSession; result: MisinfoResult }>(
    `/api/v1/misinfo-sim/solo/session/${sessionId}`,
    token
  );
}

export function tickSoloSession(token: string, sessionId: string) {
  return request<{ session: MisinfoSession; result: MisinfoResult }>(
    `/api/v1/misinfo-sim/solo/session/${sessionId}/tick`,
    token,
    { method: "POST" }
  );
}

export function inspectSoloNode(token: string, sessionId: string, nodeId: number) {
  return request<{ inspected: InspectedNode }>(
    `/api/v1/misinfo-sim/solo/session/${sessionId}/inspect`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ nodeId })
    }
  );
}

export function actOnSoloNode(
  token: string,
  sessionId: string,
  payload: { nodeId: number; action: "investigate" | "fact-check" | "quarantine" }
) {
  return request<{ session: MisinfoSession; inspected: InspectedNode; result: MisinfoResult }>(
    `/api/v1/misinfo-sim/solo/session/${sessionId}/action`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export function submitSoloSession(token: string, sessionId: string) {
  return request<{ session: MisinfoSession; result: MisinfoResult }>(
    `/api/v1/misinfo-sim/solo/session/${sessionId}/submit`,
    token,
    { method: "POST" }
  );
}
