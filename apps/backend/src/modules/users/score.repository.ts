import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ScoreEvent = {
  id: string;
  userId: string;
  sourceId: string;
  mode:
    | "misinfo-solo"
    | "misinfo-multiplayer"
    | "debug-arena"
    | "debug-arena-ranked"
    | "echo-trace"
    | "echo-trace-ranked";
  score: number;
  pointsDelta?: number;
  won: boolean;
  createdAt: string;
};

const dataDirectory = path.resolve(process.cwd(), "data");
const scoreEventsFilePath = path.join(dataDirectory, "score-events.json");

async function ensureScoreEventsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(scoreEventsFilePath, "utf8");
  } catch {
    await writeFile(scoreEventsFilePath, "[]", "utf8");
  }
}

export async function readScoreEvents(): Promise<ScoreEvent[]> {
  await ensureScoreEventsFile();
  const raw = await readFile(scoreEventsFilePath, "utf8");
  return JSON.parse(raw) as ScoreEvent[];
}

export async function writeScoreEvents(events: ScoreEvent[]) {
  await ensureScoreEventsFile();
  await writeFile(scoreEventsFilePath, JSON.stringify(events, null, 2), "utf8");
}

export async function recordScoreEvent(input: Omit<ScoreEvent, "id" | "createdAt">) {
  const events = await readScoreEvents();
  const existing = events.find((event) => event.userId === input.userId && event.sourceId === input.sourceId);

  if (existing) {
    return existing;
  }

  const nextEvent: ScoreEvent = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };

  events.push(nextEvent);
  await writeScoreEvents(events);
  return nextEvent;
}
