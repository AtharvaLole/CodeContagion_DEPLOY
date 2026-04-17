import { env } from "@/config/env";
import { io, type Socket } from "socket.io-client";
import type { InspectedNode, MisinfoResult, MisinfoSession } from "./misinfo-sim-api";

export type MultiplayerPlayer = {
  userId: string;
  handle: string;
  avatar: string;
  joinedAt: string;
};

export type MultiplayerRoom = {
  roomCode: string;
  hostUserId: string;
  createdAt: string;
  status: "lobby" | "playing" | "results";
  players: MultiplayerPlayer[];
  chat: Array<{
    id: string;
    userId: string;
    handle: string;
    message: string;
    sentAt: string;
  }>;
  session: MisinfoSession | null;
};

export type MultiplayerRoomSnapshot = {
  room: MultiplayerRoom;
  result: MisinfoResult | null;
};

let misinfoSocket: Socket | null = null;

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
    throw new Error(body?.message ?? "Multiplayer request failed.");
  }

  return body as T;
}

export function getMisinfoSocket() {
  if (!misinfoSocket) {
    misinfoSocket = io(env.apiBaseUrl, {
      transports: ["websocket", "polling"]
    });
  }

  return misinfoSocket;
}

export function createMultiplayerRoom(token: string) {
  return request<{ room: MultiplayerRoom }>("/api/v1/misinfo-sim-mp/rooms", token, {
    method: "POST"
  });
}

export function joinMultiplayerRoom(token: string, roomCode: string) {
  return request<{ room: MultiplayerRoom }>("/api/v1/misinfo-sim-mp/rooms/join", token, {
    method: "POST",
    body: JSON.stringify({ roomCode })
  });
}

export function fetchMultiplayerRoom(token: string, roomCode: string) {
  return request<{ room: MultiplayerRoom; result: MisinfoResult | null }>(
    `/api/v1/misinfo-sim-mp/rooms/${roomCode}`,
    token
  );
}

export function startMultiplayerRoom(token: string, roomCode: string) {
  return request<{ room: MultiplayerRoom; result: MisinfoResult | null }>(
    "/api/v1/misinfo-sim-mp/rooms/start",
    token,
    {
      method: "POST",
      body: JSON.stringify({ roomCode })
    }
  );
}

export function tickMultiplayerRoom(token: string, roomCode: string) {
  return request<{ room: MultiplayerRoom; result: MisinfoResult }>(
    "/api/v1/misinfo-sim-mp/rooms/tick",
    token,
    {
      method: "POST",
      body: JSON.stringify({ roomCode })
    }
  );
}

export function sendMultiplayerChat(token: string, roomCode: string, message: string) {
  return request<{ room: MultiplayerRoom }>(
    "/api/v1/misinfo-sim-mp/rooms/chat",
    token,
    {
      method: "POST",
      body: JSON.stringify({ roomCode, message })
    }
  );
}

export function inspectMultiplayerNode(token: string, roomCode: string, nodeId: number) {
  return request<{ inspected: InspectedNode }>(
    "/api/v1/misinfo-sim-mp/rooms/inspect",
    token,
    {
      method: "POST",
      body: JSON.stringify({ roomCode, nodeId })
    }
  );
}

export function actOnMultiplayerNode(
  token: string,
  payload: { roomCode: string; nodeId: number; action: "investigate" | "fact-check" | "quarantine" }
) {
  return request<{ room: MultiplayerRoom; inspected: InspectedNode; result: MisinfoResult }>(
    "/api/v1/misinfo-sim-mp/rooms/action",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export function submitMultiplayerRoom(token: string, roomCode: string) {
  return request<{ room: MultiplayerRoom; result: MisinfoResult }>(
    "/api/v1/misinfo-sim-mp/rooms/submit",
    token,
    {
      method: "POST",
      body: JSON.stringify({ roomCode })
    }
  );
}
