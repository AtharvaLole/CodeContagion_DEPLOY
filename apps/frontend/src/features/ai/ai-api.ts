import { env } from "@/config/env";

export type DebugCoachReport = {
  provider: "groq" | "fallback" | "python";
  title: string;
  rootCause: string;
  actionPlan: string[];
  riskFlags: string[];
  judgeLine: string;
};

export type DebugDebriefReport = {
  provider: "groq" | "fallback" | "python" | "nvidia-nim";
  verdict: string;
  confidenceBand: "low" | "medium" | "high";
  strengths: Array<{
    dimension: string;
    evidenceSpan: string;
    whyItHelped?: string;
  }>;
  weaknesses: Array<{
    dimension: string;
    evidenceSpan: string;
    impact?: string;
  }>;
  misconceptionTags: string[];
  nextPracticeFocus: string;
  hints: string[];
  approachSkeleton: string[];
  optimalApproach?: string;
  judgeSoundbite: string;
  safety: {
    leakRisk: "low" | "medium" | "high";
    redactionsApplied: boolean;
    fallbackUsed: boolean;
  };
};

export type HecklerTaunt = {
  taunt: string;
};

export type MisinfoIntelReport = {
  provider: "groq" | "fallback";
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  verdict: string;
  evidence: string[];
  recommendation: string;
  commsScript: string;
};

export type MisinfoChatResponse = {
  response: string;
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
    throw new Error(body?.message ?? "AI request failed.");
  }

  return body as T;
}

export function fetchDebugCoachReport(token: string, payload: { scenarioId: string; code: string }) {
  return request<{ report: DebugCoachReport }>("/api/v1/ai/debug-arena/coach", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchDebugDebriefReport(
  token: string,
  payload: {
    scenarioId: string;
    code: string;
    durationSeconds: number;
    pasted: boolean;
    tabSwitches: number;
    keystrokes: number;
  }
) {
  return request<{ report: DebugDebriefReport }>("/api/v1/ai/debug-arena/debrief", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchSoloMisinfoIntel(token: string, payload: { sessionId: string; nodeId: number }) {
  return request<{ report: MisinfoIntelReport }>("/api/v1/ai/misinfo-sim/solo-intel", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchRoomMisinfoIntel(token: string, payload: { roomCode: string; nodeId: number }) {
  return request<{ report: MisinfoIntelReport }>("/api/v1/ai/misinfo-sim/room-intel", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchSoloMisinfoChat(
  token: string,
  payload: { sessionId: string; nodeId: number; question: string }
) {
  return request<{
    response: string;
    session: import("@/features/misinfo-sim/misinfo-sim-api").MisinfoSession;
    inspected: import("@/features/misinfo-sim/misinfo-sim-api").InspectedNode;
  }>("/api/v1/ai/misinfo-sim/solo-chat", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchRoomMisinfoChat(
  token: string,
  payload: { roomCode: string; nodeId: number; question: string }
) {
  return request<{
    response: string;
    room: import("@/features/misinfo-sim/misinfo-multiplayer-api").MultiplayerRoom;
    inspected: import("@/features/misinfo-sim/misinfo-sim-api").InspectedNode;
  }>("/api/v1/ai/misinfo-sim/room-chat", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ── Python-backed Debug Arena API functions ───────────────────────── */

export function fetchPyDebugCoachReport(token: string, payload: { scenarioId: string; code: string }) {
  return request<{ report: DebugCoachReport }>("/api/v1/ai/debug-arena/py-coach", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchHecklerTaunt(
  token: string,
  payload: {
    scenarioId: string;
    code: string;
    timeLeft: number;
    keystrokes: number;
    tabSwitches: number;
    pasted: boolean;
  }
) {
  return request<HecklerTaunt>("/api/v1/ai/debug-arena/py-heckler", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchPyDebugDebriefReport(
  token: string,
  payload: {
    scenarioId: string;
    code: string;
    passed: boolean;
    durationSeconds: number;
    keystrokes: number;
    tabSwitches: number;
    pasted: boolean;
    testResults: Array<{ name: string; description: string; passed: boolean }>;
    scores: Record<string, number>;
  }
) {
  return request<{ report: DebugDebriefReport }>("/api/v1/ai/debug-arena/py-debrief", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
