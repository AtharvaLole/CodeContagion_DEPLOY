import { env } from "@/config/env";
import { io, type Socket } from "socket.io-client";
import type { DebugCoachReport } from "@/features/ai/ai-api";
import type { SoloScenario } from "./debug-arena-api";

export type DebugArenaMultiplayerPlayer = {
  userId: string;
  handle: string;
  avatar: string;
  joinedAt: string;
};

export type DebugArenaContribution = {
  userId: string;
  keystrokes: number;
  editOperations: number;
  tabSwitches: number;
  pasteAttempts: number;
  coachRequests: number;
  submitted: boolean;
};

export type DebugArenaRoomResult = {
  contained: boolean;
  score: number;
  summary: string;
  tests: Array<{
    name: string;
    description: string;
    passed: boolean;
  }>;
  players: Array<{
    userId: string;
    handle: string;
    avatar: string;
    contributionScore: number;
    contributionPercent: number;
    stats: DebugArenaContribution;
    summary: string;
  }>;
};

export type DebugArenaMultiplayerRoom = {
  roomCode: string;
  hostUserId: string;
  createdAt: string;
  status: "lobby" | "playing" | "results";
  players: DebugArenaMultiplayerPlayer[];
  chat: Array<{
    id: string;
    userId: string;
    handle: string;
    message: string;
    sentAt: string;
  }>;
  session: null | {
    scenarioId: string;
    code: string;
    startedAt: string;
    durationSeconds: number;
    finishedAt: string | null;
    elapsedSeconds: number | null;
    submittedByUserId: string | null;
    lastEditedByUserId: string | null;
    contributions: DebugArenaContribution[];
  };
  result: DebugArenaRoomResult | null;
};

export type DebugArenaRoomSnapshot = {
  room: DebugArenaMultiplayerRoom;
  result: DebugArenaRoomResult | null;
};

let debugArenaSocket: Socket | null = null;

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
    throw new Error(body?.message ?? "Debug Arena duo request failed.");
  }

  return body as T;
}

export function getDebugArenaSocket() {
  if (!debugArenaSocket) {
    debugArenaSocket = io(env.apiBaseUrl, {
      transports: ["websocket", "polling"]
    });
  }

  return debugArenaSocket;
}

export function createDebugArenaRoom(token: string) {
  return request<{ room: DebugArenaMultiplayerRoom }>("/api/v1/debug-arena-mp/rooms", token, {
    method: "POST"
  });
}

export function joinDebugArenaRoom(token: string, roomCode: string) {
  return request<{ room: DebugArenaMultiplayerRoom }>("/api/v1/debug-arena-mp/rooms/join", token, {
    method: "POST",
    body: JSON.stringify({ roomCode })
  });
}

export function fetchDebugArenaRoom(token: string, roomCode: string) {
  return request<DebugArenaRoomSnapshot>(`/api/v1/debug-arena-mp/rooms/${roomCode}`, token);
}

export function startDebugArenaRoom(token: string, roomCode: string, scenarioId: SoloScenario["id"]) {
  return request<DebugArenaRoomSnapshot>("/api/v1/debug-arena-mp/rooms/start", token, {
    method: "POST",
    body: JSON.stringify({ roomCode, scenarioId })
  });
}

export function sendDebugArenaRoomMessage(token: string, roomCode: string, message: string) {
  return request<{ room: DebugArenaMultiplayerRoom }>("/api/v1/debug-arena-mp/rooms/chat", token, {
    method: "POST",
    body: JSON.stringify({ roomCode, message })
  });
}

export function syncDebugArenaRoomCode(
  token: string,
  payload: {
    roomCode: string;
    code: string;
    keystrokes?: number;
    editOperations?: number;
    tabSwitches?: number;
    pasteAttempts?: number;
  }
) {
  return request<{ room: DebugArenaMultiplayerRoom }>("/api/v1/debug-arena-mp/rooms/sync-code", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function registerDebugArenaCoachUse(token: string, roomCode: string) {
  return request<{ room: DebugArenaMultiplayerRoom }>("/api/v1/debug-arena-mp/rooms/coach-used", token, {
    method: "POST",
    body: JSON.stringify({ roomCode })
  });
}

export function submitDebugArenaRoom(token: string, roomCode: string) {
  return request<DebugArenaRoomSnapshot>("/api/v1/debug-arena-mp/rooms/submit", token, {
    method: "POST",
    body: JSON.stringify({ roomCode })
  });
}
