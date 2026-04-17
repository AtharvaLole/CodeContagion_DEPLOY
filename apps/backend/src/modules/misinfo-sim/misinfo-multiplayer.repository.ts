import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SoloSimulationState } from "./misinfo-sim.types.js";

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
  session: SoloSimulationState | null;
};

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(moduleDirectory, "../../../../../data");
const roomsFilePath = path.join(dataDirectory, "misinfo-multiplayer-runtime.json");
let roomsCache: MultiplayerRoom[] | null = null;

async function ensureRoomsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(roomsFilePath, "utf8");
  } catch {
    await writeFile(roomsFilePath, "[]", "utf8");
  }
}

export async function readRooms(): Promise<MultiplayerRoom[]> {
  if (roomsCache) {
    return roomsCache;
  }

  await ensureRoomsFile();
  const raw = await readFile(roomsFilePath, "utf8");
  roomsCache = JSON.parse(raw) as MultiplayerRoom[];
  return roomsCache;
}

export async function saveRoom(room: MultiplayerRoom) {
  const rooms = await readRooms();
  const nextRooms = rooms.filter((entry) => entry.roomCode !== room.roomCode);
  nextRooms.push(room);
  roomsCache = nextRooms;
  await writeFile(roomsFilePath, JSON.stringify(nextRooms, null, 2), "utf8");
}

export async function findRoom(roomCode: string) {
  const rooms = await readRooms();
  return rooms.find((room) => room.roomCode === roomCode) ?? null;
}
