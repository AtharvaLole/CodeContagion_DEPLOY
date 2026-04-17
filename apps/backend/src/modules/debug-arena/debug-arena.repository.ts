import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DebugArenaAttempt } from "./debug-arena.types.js";

const dataDirectory = path.resolve(process.cwd(), "data");
const attemptsFilePath = path.join(dataDirectory, "debug-arena-attempts.json");

async function ensureAttemptsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(attemptsFilePath, "utf8");
  } catch {
    await writeFile(attemptsFilePath, "[]", "utf8");
  }
}

export async function readAttempts(): Promise<DebugArenaAttempt[]> {
  await ensureAttemptsFile();
  const raw = await readFile(attemptsFilePath, "utf8");
  return JSON.parse(raw) as DebugArenaAttempt[];
}

export async function appendAttempt(attempt: DebugArenaAttempt) {
  const attempts = await readAttempts();
  attempts.push(attempt);
  await writeFile(attemptsFilePath, JSON.stringify(attempts, null, 2), "utf8");
}
