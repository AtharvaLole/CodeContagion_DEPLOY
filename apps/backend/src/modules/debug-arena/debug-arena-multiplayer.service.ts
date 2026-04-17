import { randomUUID } from "node:crypto";
import { appendAttempt } from "./debug-arena.repository.js";
import {
  type DebugArenaContribution,
  type DebugArenaMultiplayerPlayer,
  type DebugArenaMultiplayerRoom,
  type DebugArenaRoomResult,
  findDebugArenaRoom,
  saveDebugArenaRoom
} from "./debug-arena-multiplayer.repository.js";
import { getUserById } from "../auth/auth.service.js";
import { evaluateScenarioPatch, getSoloScenario } from "./debug-arena.service.js";

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function getPlayer(userId: string): Promise<DebugArenaMultiplayerPlayer> {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    userId: user.id,
    handle: user.handle,
    avatar: user.avatar,
    joinedAt: new Date().toISOString()
  };
}

function getContribution(contributions: DebugArenaContribution[], userId: string) {
  const existing = contributions.find((entry) => entry.userId === userId);

  if (existing) {
    return existing;
  }

  const created: DebugArenaContribution = {
    userId,
    keystrokes: 0,
    editOperations: 0,
    tabSwitches: 0,
    pasteAttempts: 0,
    coachRequests: 0,
    submitted: false
  };
  contributions.push(created);
  return created;
}

function getContributionWeight(entry: DebugArenaContribution) {
  return (
    entry.keystrokes * 0.7 +
    entry.editOperations * 18 +
    entry.coachRequests * 8 +
    (entry.submitted ? 24 : 0)
  );
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildPlayerResult(input: {
  room: DebugArenaMultiplayerRoom;
  baseScore: number;
}) {
  const contributions = input.room.session?.contributions ?? [];
  const weightedTotal = Math.max(
    1,
    contributions.reduce((sum, entry) => sum + getContributionWeight(entry), 0)
  );

  return input.room.players.map((player) => {
    const stats = getContribution(contributions, player.userId);
    const contributionWeight = getContributionWeight(stats);
    const contributionPercent = Math.round((contributionWeight / weightedTotal) * 100);
    const disciplinePenalty = stats.tabSwitches * 3 + stats.pasteAttempts * 5;
    const contributionScore = clampScore(
      input.baseScore * 0.7 + contributionPercent * 0.3 - disciplinePenalty
    );

    return {
      userId: player.userId,
      handle: player.handle,
      avatar: player.avatar,
      contributionScore,
      contributionPercent,
      stats,
      summary:
        contributionPercent >= 55
          ? "You carried the majority of the patch execution in this room."
          : contributionPercent >= 35
            ? "You made a solid contribution to the final patch."
            : "You participated in the final patch, but your teammate contributed more of the working solution."
    };
  });
}

export async function createDebugArenaRoom(userId: string) {
  const host = await getPlayer(userId);
  const room: DebugArenaMultiplayerRoom = {
    roomCode: generateRoomCode(),
    hostUserId: userId,
    createdAt: new Date().toISOString(),
    status: "lobby",
    players: [host],
    chat: [
      {
        id: randomUUID(),
        userId,
        handle: "SYSTEM",
        message: `${host.handle} opened a duo debug room.`,
        sentAt: new Date().toISOString()
      }
    ],
    session: null,
    result: null
  };

  await saveDebugArenaRoom(room);
  return room;
}

export async function joinDebugArenaRoom(roomCode: string, userId: string) {
  const room = await findDebugArenaRoom(roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.players.length >= 2 && !room.players.some((player) => player.userId === userId)) {
    throw new Error("Room is full.");
  }

  if (!room.players.some((player) => player.userId === userId)) {
    const player = await getPlayer(userId);
    room.players.push(player);
    room.chat.push({
      id: randomUUID(),
      userId,
      handle: "SYSTEM",
      message: `${player.handle} joined the debug room.`,
      sentAt: new Date().toISOString()
    });
  }

  await saveDebugArenaRoom(room);
  return room;
}

export async function getDebugArenaRoom(roomCode: string) {
  return findDebugArenaRoom(roomCode);
}

export async function sendDebugArenaRoomMessage(roomCode: string, userId: string, message: string) {
  const room = await findDebugArenaRoom(roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  const sender = room.players.find((player) => player.userId === userId);

  if (!sender) {
    throw new Error("You are not part of this room.");
  }

  room.chat.push({
    id: randomUUID(),
    userId,
    handle: sender.handle,
    message,
    sentAt: new Date().toISOString()
  });
  room.chat = room.chat.slice(-30);
  await saveDebugArenaRoom(room);
  return room;
}

export async function startDebugArenaRoom(input: {
  roomCode: string;
  userId: string;
  scenarioId: string;
}) {
  const room = await findDebugArenaRoom(input.roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.hostUserId !== input.userId) {
    throw new Error("Only the host can start the room.");
  }

  const scenario = getSoloScenario(input.scenarioId);

  if (!scenario) {
    throw new Error("Scenario not found.");
  }

  room.status = "playing";
  room.result = null;
  room.session = {
    scenarioId: scenario.id,
    code: scenario.buggyCode,
    startedAt: new Date().toISOString(),
    durationSeconds: 90,
    finishedAt: null,
    elapsedSeconds: null,
    submittedByUserId: null,
    lastEditedByUserId: null,
    contributions: room.players.map((player) => ({
      userId: player.userId,
      keystrokes: 0,
      editOperations: 0,
      tabSwitches: 0,
      pasteAttempts: 0,
      coachRequests: 0,
      submitted: false
    }))
  };
  room.chat.push({
    id: randomUUID(),
    userId: input.userId,
    handle: "SYSTEM",
    message: `${room.players.find((player) => player.userId === input.userId)?.handle ?? "Host"} started the duo round.`,
    sentAt: new Date().toISOString()
  });

  await saveDebugArenaRoom(room);
  return room;
}

export async function updateDebugArenaRoomCode(input: {
  roomCode: string;
  userId: string;
  code: string;
  keystrokes?: number;
  editOperations?: number;
  tabSwitches?: number;
  pasteAttempts?: number;
}) {
  const room = await findDebugArenaRoom(input.roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === input.userId)) {
    throw new Error("You are not part of this room.");
  }

  if (room.status === "results" || room.session.submittedByUserId) {
    throw new Error("Room has already been submitted.");
  }

  room.session.code = input.code;
  room.session.lastEditedByUserId = input.userId;

  const contribution = getContribution(room.session.contributions, input.userId);
  contribution.keystrokes += input.keystrokes ?? 0;
  contribution.editOperations += input.editOperations ?? 0;
  contribution.tabSwitches += input.tabSwitches ?? 0;
  contribution.pasteAttempts += input.pasteAttempts ?? 0;

  await saveDebugArenaRoom(room);
  return room;
}

export async function registerDebugArenaCoachUsage(roomCode: string, userId: string) {
  const room = await findDebugArenaRoom(roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === userId)) {
    throw new Error("You are not part of this room.");
  }

  if (room.status === "results" || room.session.submittedByUserId) {
    throw new Error("Room has already been submitted.");
  }

  const contribution = getContribution(room.session.contributions, userId);
  contribution.coachRequests += 1;
  await saveDebugArenaRoom(room);
  return room;
}

export async function submitDebugArenaRoom(roomCode: string, userId: string) {
  const room = await findDebugArenaRoom(roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === userId)) {
    throw new Error("You are not part of this room.");
  }

  if (room.status === "results" || room.result || room.session.submittedByUserId) {
    throw new Error("Room has already been submitted.");
  }

  const durationSeconds = Math.min(
    room.session.durationSeconds,
    Math.max(0, Math.round((Date.now() - new Date(room.session.startedAt).getTime()) / 1000))
  );

  const teamContribution = room.session.contributions.reduce(
    (acc, entry) => ({
      keystrokes: acc.keystrokes + entry.keystrokes,
      tabSwitches: acc.tabSwitches + entry.tabSwitches,
      pasteAttempts: acc.pasteAttempts + entry.pasteAttempts,
      coachRequests: acc.coachRequests + entry.coachRequests,
      editOperations: acc.editOperations + entry.editOperations
    }),
    {
      keystrokes: 0,
      tabSwitches: 0,
      pasteAttempts: 0,
      coachRequests: 0,
      editOperations: 0
    }
  );

  const evaluation = evaluateScenarioPatch({
    scenarioId: room.session.scenarioId,
    code: room.session.code,
    durationSeconds,
    pasted: teamContribution.pasteAttempts > 0,
    tabSwitches: teamContribution.tabSwitches,
    keystrokes: Math.max(teamContribution.keystrokes, teamContribution.editOperations * 8)
  });

  room.status = "results";
  room.session.submittedByUserId = userId;
  room.session.finishedAt = new Date().toISOString();
  room.session.elapsedSeconds = durationSeconds;
  getContribution(room.session.contributions, userId).submitted = true;

  const playerResults = buildPlayerResult({
    room,
    baseScore: evaluation.scores.overall
  });

  room.result = {
    contained: evaluation.passed,
    score: evaluation.scores.overall,
    summary: evaluation.summary,
    tests: evaluation.tests,
    players: playerResults
  } satisfies DebugArenaRoomResult;

  for (const playerResult of playerResults) {
    await appendAttempt({
      id: randomUUID(),
      userId: playerResult.userId,
      scenarioId: evaluation.scenario.id,
      submittedAt: new Date().toISOString(),
      durationSeconds,
      pasted: playerResult.stats.pasteAttempts > 0,
      tabSwitches: playerResult.stats.tabSwitches,
      keystrokes: playerResult.stats.keystrokes,
      passed: evaluation.passed,
      score: playerResult.contributionScore
    });
  }

  room.chat.push({
    id: randomUUID(),
    userId,
    handle: "SYSTEM",
    message: `${room.players.find((player) => player.userId === userId)?.handle ?? "A player"} submitted the duo patch for evaluation.`,
    sentAt: new Date().toISOString()
  });

  await saveDebugArenaRoom(room);

  return {
    room,
    result: room.result
  };
}
