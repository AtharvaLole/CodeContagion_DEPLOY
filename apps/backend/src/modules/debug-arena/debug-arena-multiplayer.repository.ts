import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const dataDirectory = path.resolve(process.cwd(), "data");
const roomsFilePath = path.join(dataDirectory, "debug-arena-multiplayer-rooms.json");
let roomsCache: DebugArenaMultiplayerRoom[] | null = null;

async function ensureRoomsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(roomsFilePath, "utf8");
  } catch {
    await writeFile(roomsFilePath, "[]", "utf8");
  }
}

export async function readDebugArenaRooms(): Promise<DebugArenaMultiplayerRoom[]> {
  if (roomsCache) {
    return roomsCache;
  }

  await ensureRoomsFile();
  const raw = await readFile(roomsFilePath, "utf8");
  roomsCache = JSON.parse(raw) as DebugArenaMultiplayerRoom[];
  return roomsCache;
}

export async function saveDebugArenaRoom(room: DebugArenaMultiplayerRoom) {
  const rooms = await readDebugArenaRooms();
  const nextRooms = rooms.filter((entry) => entry.roomCode !== room.roomCode);
  nextRooms.push(room);
  roomsCache = nextRooms;
  await writeFile(roomsFilePath, JSON.stringify(nextRooms, null, 2), "utf8");
}

export async function findDebugArenaRoom(roomCode: string) {
  const rooms = await readDebugArenaRooms();
  return rooms.find((room) => room.roomCode === roomCode) ?? null;
}
