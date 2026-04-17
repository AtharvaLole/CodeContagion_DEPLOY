import { randomUUID } from "node:crypto";
import { getUserById } from "../auth/auth.service.js";
import {
  type MultiplayerPlayer,
  type MultiplayerRoom,
  findRoom,
  saveRoom
} from "./misinfo-multiplayer.repository.js";
import {
  actOnNode,
  advanceSoloSimulation,
  consumeSoloChatbotQuestion,
  createSoloSimulation,
  inspectNode,
  summarizeSoloResult
} from "./misinfo-sim.service.js";

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function getPlayer(userId: string): Promise<MultiplayerPlayer> {
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

export async function createRoom(userId: string) {
  const host = await getPlayer(userId);
  const room: MultiplayerRoom = {
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
        message: `${host.handle} opened a containment room.`,
        sentAt: new Date().toISOString()
      }
    ],
    session: null
  };

  await saveRoom(room);
  return room;
}

export async function joinRoom(roomCode: string, userId: string) {
  const room = await findRoom(roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.players.length >= 4 && !room.players.some((player) => player.userId === userId)) {
    throw new Error("Room is full.");
  }

  if (!room.players.some((player) => player.userId === userId)) {
    const player = await getPlayer(userId);
    room.players.push(player);
    room.chat.push({
      id: randomUUID(),
      userId,
      handle: "SYSTEM",
      message: `${player.handle} joined the room.`,
      sentAt: new Date().toISOString()
    });
  }

  await saveRoom(room);
  return room;
}

export async function getRoom(roomCode: string) {
  return findRoom(roomCode);
}

export async function sendRoomMessage(roomCode: string, userId: string, message: string) {
  const room = await findRoom(roomCode);

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
  await saveRoom(room);
  return room;
}

export async function startRoom(roomCode: string, userId: string) {
  const room = await findRoom(roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.hostUserId !== userId) {
    throw new Error("Only the host can start the room.");
  }

  const session = await createSoloSimulation();
  session.chatbotQuestionLimit = 10;
  room.status = "playing";
  room.session = session;
  room.chat.push({
    id: randomUUID(),
    userId,
    handle: "SYSTEM",
    message: "Containment simulation started.",
    sentAt: new Date().toISOString()
  });

  await saveRoom(room);
  return room;
}

export async function tickRoom(roomCode: string) {
  const room = await findRoom(roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  const nextSession = await advanceSoloSimulation(room.session.sessionId);
  room.session = nextSession;

  if (nextSession.timeLeft === 0 || nextSession.panicLevel > 40) {
    room.status = "results";
  }

  await saveRoom(room);
  return {
    room,
    result: summarizeSoloResult(nextSession)
  };
}

export async function inspectRoomNode(roomCode: string, nodeId: number) {
  const room = await findRoom(roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  return inspectNode(room.session.sessionId, nodeId);
}

export async function actOnRoomNode(input: {
  roomCode: string;
  userId: string;
  nodeId: number;
  action: "investigate" | "fact-check" | "quarantine";
}) {
  const room = await findRoom(input.roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === input.userId)) {
    throw new Error("You are not part of this room.");
  }

  const result = await actOnNode({
    sessionId: room.session.sessionId,
    nodeId: input.nodeId,
    action: input.action,
    actor: {
      userId: input.userId,
      handle: room.players.find((player) => player.userId === input.userId)?.handle
    }
  });
  const summary = summarizeSoloResult(result.session);

  room.session = result.session;
  room.chat.push({
    id: randomUUID(),
    userId: input.userId,
    handle: "SYSTEM",
    message: `${input.action.toUpperCase()} executed on node ${input.nodeId}.`,
    sentAt: new Date().toISOString()
  });

  if (result.session.timeLeft === 0 || summary.panicLevel > 40) {
    room.status = "results";
  }

  await saveRoom(room);

  return {
    room,
    inspected: result.inspected,
    result: summary
  };
}

export async function consumeRoomChatbotQuestion(input: {
  roomCode: string;
  userId: string;
  nodeId: number;
  question: string;
}) {
  const room = await findRoom(input.roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === input.userId)) {
    throw new Error("You are not part of this room.");
  }

  const consumed = await consumeSoloChatbotQuestion({
    sessionId: room.session.sessionId,
    nodeId: input.nodeId,
    question: input.question
  });

  room.session = consumed.session;
  room.chat.push({
    id: randomUUID(),
    userId: input.userId,
    handle: "SYSTEM",
    message: `Team chatbot used on node ${input.nodeId}. Remaining questions: ${room.session.chatbotQuestionLimit - room.session.chatbotQuestionsUsed}.`,
    sentAt: new Date().toISOString()
  });
  room.chat = room.chat.slice(-30);

  await saveRoom(room);

  return {
    room,
    inspected: consumed.inspected
  };
}

export async function submitRoom(roomCode: string, userId: string) {
  const room = await findRoom(roomCode);

  if (!room || !room.session) {
    throw new Error("Active room session not found.");
  }

  if (!room.players.some((player) => player.userId === userId)) {
    throw new Error("You are not part of this room.");
  }

  if (room.hostUserId !== userId) {
    throw new Error("Only the host can submit the containment run.");
  }

  room.status = "results";
  room.chat.push({
    id: randomUUID(),
    userId,
    handle: "SYSTEM",
    message: "The containment run was submitted for final evaluation.",
    sentAt: new Date().toISOString()
  });

  await saveRoom(room);

  return {
    room,
    result: summarizeSoloResult(room.session)
  };
}
