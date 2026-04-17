import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UserRecord } from "./auth.types.js";

const dataDirectory = path.resolve(process.cwd(), "data");
const usersFilePath = path.join(dataDirectory, "users.json");

async function ensureUsersFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(usersFilePath, "utf8");
  } catch {
    await writeFile(usersFilePath, "[]", "utf8");
  }
}

export async function readUsers(): Promise<UserRecord[]> {
  await ensureUsersFile();
  const raw = await readFile(usersFilePath, "utf8");
  return JSON.parse(raw) as UserRecord[];
}

export async function writeUsers(users: UserRecord[]) {
  await ensureUsersFile();
  await writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
}
