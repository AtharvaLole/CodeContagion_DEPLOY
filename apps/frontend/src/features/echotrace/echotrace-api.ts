import { env } from "@/config/env";

export type EchoTraceSubmitResponse = {
  match: {
    scenarioId: string;
    mode: "ai" | "duo";
    userRole: "developer" | "saboteur";
    winner: "user" | "ai" | "developer" | "saboteur";
    winnerLabel: string;
    headline: string;
  };
  scores: {
    user: number;
    opponent: number;
    overall: number;
    breakdown: {
      execution: number;
      pressure: number;
      resilience: number;
      security: number;
    };
  };
  rankedUpdate: {
    queueType: "casual" | "ranked";
    previousElo: number;
    nextElo: number;
    eloChange: number;
    league: string;
  };
};

export async function submitEchoTraceMatch(
  token: string,
  payload: {
    scenarioId: string;
    queueType: "casual" | "ranked";
    mode: "ai" | "duo";
    userRole: "developer" | "saboteur";
    winner: "user" | "ai" | "developer" | "saboteur";
    developerPassed: boolean;
    durationSeconds: number;
    sabotageScore: number;
    developerScore: number;
    sabotageActions: string[];
    graphFindings: string[];
    repairFindings: string[];
  }
) {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/echo-trace/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? "Unable to score EchoTrace match.");
  }

  return body as EchoTraceSubmitResponse;
}
