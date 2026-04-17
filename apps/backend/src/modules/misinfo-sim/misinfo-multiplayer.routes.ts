import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { emitMisinfoRoomUpdate } from "../../realtime/misinfo-multiplayer.gateway.js";
import { applyScoreToUsers } from "../users/score.service.js";
import {
  actOnRoomNode,
  createRoom,
  getRoom,
  inspectRoomNode,
  joinRoom,
  sendRoomMessage,
  startRoom,
  submitRoom,
  tickRoom
} from "./misinfo-multiplayer.service.js";
import { summarizeSoloResult } from "./misinfo-sim.service.js";

const roomCodeSchema = z.object({
  roomCode: z.string().min(6).max(6)
});

const chatSchema = z.object({
  roomCode: z.string().min(6).max(6),
  message: z.string().min(1).max(200)
});

const actionSchema = z.object({
  roomCode: z.string().min(6).max(6),
  nodeId: z.number().int().nonnegative(),
  action: z.enum(["investigate", "fact-check", "quarantine"])
});

const inspectSchema = z.object({
  roomCode: z.string().min(6).max(6),
  nodeId: z.number().int().nonnegative()
});

export const misinfoMultiplayerRouter = Router();

misinfoMultiplayerRouter.post("/rooms", requireAuth, async (req, res) => {
  const room = await createRoom(req.user.id);
  emitMisinfoRoomUpdate(room);
  res.status(201).json({ room });
});

misinfoMultiplayerRouter.post("/rooms/join", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const room = await joinRoom(payload.roomCode.toUpperCase(), req.user.id);
    emitMisinfoRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join room.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.get("/rooms/:roomCode", requireAuth, async (req, res) => {
  const roomCode = Array.isArray(req.params.roomCode) ? req.params.roomCode[0] : req.params.roomCode;
  const room = await getRoom(roomCode.toUpperCase());

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  return res.json({
    room,
    result: room.session ? summarizeSoloResult(room.session) : null
  });
});

misinfoMultiplayerRouter.post("/rooms/start", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const room = await startRoom(payload.roomCode.toUpperCase(), req.user.id);
    emitMisinfoRoomUpdate(room);
    return res.json({
      room,
      result: room.session ? summarizeSoloResult(room.session) : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start room.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.post("/rooms/tick", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const data = await tickRoom(payload.roomCode.toUpperCase());

    if (data.room.status === "results") {
      await applyScoreToUsers({
        userIds: data.room.players.map((player) => player.userId),
        sourceId: `misinfo-room:${data.room.roomCode}:${data.room.session?.sessionId ?? "unknown"}`,
        mode: "misinfo-multiplayer",
        result: data.result
      });
    }

    emitMisinfoRoomUpdate(data.room);
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to advance room.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.post("/rooms/chat", requireAuth, async (req, res) => {
  try {
    const payload = chatSchema.parse(req.body);
    const room = await sendRoomMessage(payload.roomCode.toUpperCase(), req.user.id, payload.message);
    emitMisinfoRoomUpdate(room);
    return res.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send chat message.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.post("/rooms/inspect", requireAuth, async (req, res) => {
  try {
    const payload = inspectSchema.parse(req.body);
    const inspected = await inspectRoomNode(payload.roomCode.toUpperCase(), payload.nodeId);
    return res.json({ inspected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect room node.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.post("/rooms/action", requireAuth, async (req, res) => {
  try {
    const payload = actionSchema.parse(req.body);
    const result = await actOnRoomNode({
      roomCode: payload.roomCode.toUpperCase(),
      userId: req.user.id,
      nodeId: payload.nodeId,
      action: payload.action
    });
    emitMisinfoRoomUpdate(result.room);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to perform room action.";
    return res.status(400).json({ message });
  }
});

misinfoMultiplayerRouter.post("/rooms/submit", requireAuth, async (req, res) => {
  try {
    const payload = roomCodeSchema.parse(req.body);
    const result = await submitRoom(payload.roomCode.toUpperCase(), req.user.id);
    await applyScoreToUsers({
      userIds: result.room.players.map((player) => player.userId),
      sourceId: `misinfo-room:${result.room.roomCode}:${result.room.session?.sessionId ?? "unknown"}`,
      mode: "misinfo-multiplayer",
      result: result.result
    });
    emitMisinfoRoomUpdate(result.room);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit room.";
    return res.status(400).json({ message });
  }
});
