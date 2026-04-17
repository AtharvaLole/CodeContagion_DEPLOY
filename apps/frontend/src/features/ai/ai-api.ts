import { env } from "@/config/env";

export type DebugCoachReport = {
  provider: "groq" | "fallback" | "python" | "nvidia-nim";
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

/* ── AI Scenario Generation Types ──────────────────────────────────── */

export type ScenarioDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXTREME";

export interface AiScenarioGeneratePayload {
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  errorTypes: string[];
  description?: string;
}

export interface AiGeneratedScenarioResponse {
  scenario: {
    id: string;
    title: string;
    language: "typescript" | "python" | "cpp";
    difficulty: ScenarioDifficulty;
    description: string;
    stackTrace: string;
    buggyCode: string;
    hint: string;
  };
  evaluationCriteria: string;
  expectedFix: string;
  provider: string;
}

export interface AiJudgePayload {
  buggyCode: string;
  userCode: string;
  evaluationCriteria: string;
  expectedFix: string;
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  durationSeconds: number;
  keystrokes: number;
  tabSwitches: number;
  pasted: boolean;
}

export interface AiJudgeResponse {
  result: {
    correct: boolean;
    score: number;
    feedback: string;
    correctnessScore: number;
    speedBonus: number;
    disciplineBonus: number;
    effortBonus: number;
  };
  provider: string;
}

/* ── Request helper ────────────────────────────────────────────────── */

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

/* ── Existing Debug Arena API functions ─────────────────────────────── */

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
  }>("/api/v1/ai/misinfo-sim/chat", token, {
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
  }>("/api/v1/ai/misinfo-sim/chat", token, {
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

/* ── AI Scenario Generation API functions ──────────────────────────── */

export function generateAiScenario(
  token: string,
  payload: AiScenarioGeneratePayload
): Promise<AiGeneratedScenarioResponse> {
  return request<AiGeneratedScenarioResponse>("/api/v1/ai/debug-arena/generate", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function submitAiJudge(
  token: string,
  payload: AiJudgePayload
): Promise<AiJudgeResponse> {
  return request<AiJudgeResponse>("/api/v1/ai/debug-arena/judge", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
