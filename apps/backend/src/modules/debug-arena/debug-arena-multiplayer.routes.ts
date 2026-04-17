import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { emitDebugArenaRoomUpdate } from "../../realtime/misinfo-multiplayer.gateway.js";
import { applyScoreToUser } from "../users/score.service.js";
import {
  createDebugArenaRoom,
  getDebugArenaRoom,
  joinDebugArenaRoom,
  registerDebugArenaCoachUsage,
  sendDebugArenaRoomMessage,
  startDebugArenaRoom,
  submitDebugArenaRoom,
  updateDebugArenaRoomCode
} from "./debug-arena-multiplayer.service.js";

const roomCodeSchema = z.object({
  roomCode: z.string().min(6).max(6)
});

const joinSchema = z.object({
  roomCode: z.string().min(6).max(6)
});

const chatSchema = z.object({
  roomCode: z.string().min(6).max(6),
  message: z.string().min(1).max(200)
});

const startSchema = z.object({
  roomCode: z.string().min(6).max(6),
  scenarioId: z.string().min(1)
});

const syncCodeSchema = z.object({
  roomCode: z.string().min(6).max(6),
  code: z.string().min(1).max(20_000),
  keystrokes: z.number().min(0).max(50_000).optional(),
  editOperations: z.number().min(0).max(5_000).optional(),
  tabSwitches: z.number().min(0).max(50).optional(),
  pasteAttempts: z.number().min(0).max(50).optional()
});

export const debugArenaMultiplayerRouter = Router();

debugArenaMultiplayerRouter.post("/rooms", requireAuth, async (req, res) => {
  const room = await createDebugArenaRoom(req.user.id);
  emitDebugArenaRoomUpdate(room);
  res.status(201).json({ room });
});

debugArenaMultiplayerRouter.post("/rooms/join", requireAuth, async (req, res) => {
  try {
    const payload = joinSchema.parse(req.body);
    const room = await joinDebugArenaRoom(payload.roomCode.toUpperCase(), req.user.id);
    emitDebugArenaRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join room.";
    return res.status(400).json({ message });
  }
});

debugArenaMultiplayerRouter.get("/rooms/:roomCode", requireAuth, async (req, res) => {
  const roomCode = Array.isArray(req.params.roomCode) ? req.params.roomCode[0] : req.params.roomCode;
  const room = await getDebugArenaRoom(roomCode.toUpperCase());

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  return res.json({ room, result: room.result });
});

debugArenaMultiplayerRouter.post("/rooms/start", requireAuth, async (req, res) => {
  try {
    const payload = startSchema.parse(req.body);
    const room = await startDebugArenaRoom({
      roomCode: payload.roomCode.toUpperCase(),
      userId: req.user.id,
      scenarioId: payload.scenarioId
    });
    emitDebugArenaRoomUpdate(room);
    return res.json({ room, result: room.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start room.";
    return res.status(400).json({ message });
  }
});

debugArenaMultiplayerRouter.post("/rooms/chat", requireAuth, async (req, res) => {
  try {
    const payload = chatSchema.parse(req.body);
    const room = await sendDebugArenaRoomMessage(payload.roomCode.toUpperCase(), req.user.id, payload.message);
    emitDebugArenaRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send room message.";
    return res.status(400).json({ message });
  }
});

debugArenaMultiplayerRouter.post("/rooms/sync-code", requireAuth, async (req, res) => {
  try {
    const payload = syncCodeSchema.parse(req.body);
    const room = await updateDebugArenaRoomCode({
      roomCode: payload.roomCode.toUpperCase(),
      userId: req.user.id,
      code: payload.code,
      keystrokes: payload.keystrokes,
      editOperations: payload.editOperations,
      tabSwitches: payload.tabSwitches,
      pasteAttempts: payload.pasteAttempts
    });
    emitDebugArenaRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync code.";
    return res.status(400).json({ message });
  }
});

debugArenaMultiplayerRouter.post("/rooms/coach-used", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const room = await registerDebugArenaCoachUsage(payload.roomCode.toUpperCase(), req.user.id);
    emitDebugArenaRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to track coach usage.";
    return res.status(400).json({ message });
  }
});

debugArenaMultiplayerRouter.post("/rooms/submit", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const { room, result } = await submitDebugArenaRoom(payload.roomCode.toUpperCase(), req.user.id);

    for (const playerResult of result.players) {
      await applyScoreToUser({
        userId: playerResult.userId,
        sourceId: `debug-arena-duo:${room.roomCode}:${room.session?.scenarioId ?? "unknown"}:${playerResult.userId}`,
        mode: "debug-arena",
        result: {
          score: playerResult.contributionScore,
          contained: result.contained
        }
      });
    }

    emitDebugArenaRoomUpdate(room);
    return res.json({ room, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit room.";
    return res.status(400).json({ message });
  }
});
