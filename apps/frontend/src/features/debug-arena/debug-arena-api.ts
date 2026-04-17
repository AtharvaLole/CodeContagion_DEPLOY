import { env } from "@/config/env";

export type SoloScenario = {
  id: string;
  topicId: string;
  topicLabel: string;
  variantLabel?: string;
  title: string;
  language: "typescript" | "python" | "cpp";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  description: string;
  stackTrace: string;
  buggyCode: string;
  hint: string;
};

export type SoloSubmissionResult = {
  scenario: {
    id: string;
    title: string;
    difficulty: SoloScenario["difficulty"];
  };
  attempt: {
    id: string;
    submittedAt: string;
    durationSeconds: number;
    pasted: boolean;
    tabSwitches: number;
    keystrokes: number;
    passed: boolean;
    score: number;
  };
  rankedUpdate?: {
    queueType: "casual" | "ranked";
    previousElo: number;
    nextElo: number;
    eloChange: number;
    league: string;
  };
  tests: Array<{
    name: string;
    description: string;
    passed: boolean;
  }>;
  scores: {
    correctness: number;
    speed: number;
    discipline: number;
    resilience: number;
    overall: number;
  };
  summary: string;
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
    throw new Error(body?.message ?? "Debug Arena request failed.");
  }

  return body as T;
}

export function fetchSoloScenarios(
  token: string,
  filters?: { language?: string; difficulty?: string; topicId?: string }
) {
  const params = new URLSearchParams();
  if (filters?.language && filters.language !== "All") {
    params.append("language", filters.language.toLowerCase());
  }
  if (filters?.difficulty && filters.difficulty !== "All") {
    params.append("difficulty", filters.difficulty);
  }
  if (filters?.topicId && filters.topicId !== "All" && filters.topicId !== "random") {
    params.append("topicId", filters.topicId);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return request<{ scenarios: SoloScenario[] }>(`/api/v1/debug-arena/scenarios${queryString}`, token);
}

export function submitSoloScenario(
  token: string,
  payload: {
    scenarioId: string;
    code: string;
    durationSeconds: number;
    pasted: boolean;
    tabSwitches: number;
    keystrokes: number;
    queueType?: "casual" | "ranked";
  }
) {
  return request<SoloSubmissionResult>("/api/v1/debug-arena/submit", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
