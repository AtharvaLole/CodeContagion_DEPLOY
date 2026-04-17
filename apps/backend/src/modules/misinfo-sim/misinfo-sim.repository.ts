import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SoloSimulationState } from "./misinfo-sim.types.js";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(moduleDirectory, "../../../../../data");
const sessionsFilePath = path.join(dataDirectory, "misinfo-solo-runtime.json");
let sessionsCache: SoloSimulationState[] | null = null;

async function ensureSessionsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(sessionsFilePath, "utf8");
  } catch {
    await writeFile(sessionsFilePath, "[]", "utf8");
  }
}

export async function readSessions(): Promise<SoloSimulationState[]> {
  if (sessionsCache) {
    return sessionsCache;
  }

  await ensureSessionsFile();
  const raw = await readFile(sessionsFilePath, "utf8");
  sessionsCache = JSON.parse(raw) as SoloSimulationState[];
  return sessionsCache;
}

export async function saveSession(session: SoloSimulationState) {
  const sessions = await readSessions();
  const nextSessions = sessions.filter((entry) => entry.sessionId !== session.sessionId);
  nextSessions.push(session);
  sessionsCache = nextSessions;
  await writeFile(sessionsFilePath, JSON.stringify(nextSessions, null, 2), "utf8");
}

export async function findSession(sessionId: string) {
  const sessions = await readSessions();
  return sessions.find((session) => session.sessionId === sessionId) ?? null;
}
