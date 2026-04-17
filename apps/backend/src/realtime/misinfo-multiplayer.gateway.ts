import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { MultiplayerRoom } from "../modules/misinfo-sim/misinfo-multiplayer.repository.js";
import type { DebugArenaMultiplayerRoom } from "../modules/debug-arena/debug-arena-multiplayer.repository.js";
import { env } from "../config/env.js";
import { summarizeSoloResult } from "../modules/misinfo-sim/misinfo-sim.service.js";

let io: Server | null = null;

export function initializeRealtimeServer(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("misinfo:join-room", (roomCode: string) => {
      if (typeof roomCode === "string" && roomCode.trim()) {
        socket.join(`misinfo:${roomCode.toUpperCase()}`);
      }
    });

    socket.on("misinfo:leave-room", (roomCode: string) => {
      if (typeof roomCode === "string" && roomCode.trim()) {
        socket.leave(`misinfo:${roomCode.toUpperCase()}`);
      }
    });

    socket.on("debug-arena:join-room", (roomCode: string) => {
      if (typeof roomCode === "string" && roomCode.trim()) {
        socket.join(`debug-arena:${roomCode.toUpperCase()}`);
      }
    });

    socket.on("debug-arena:leave-room", (roomCode: string) => {
      if (typeof roomCode === "string" && roomCode.trim()) {
        socket.leave(`debug-arena:${roomCode.toUpperCase()}`);
      }
    });
  });

  return io;
}

export function emitMisinfoRoomUpdate(room: MultiplayerRoom) {
  if (!io) {
    return;
  }

  io.to(`misinfo:${room.roomCode}`).emit("misinfo:room-update", {
    room,
    result: room.session ? summarizeSoloResult(room.session) : null
  });
}

export function emitDebugArenaRoomUpdate(room: DebugArenaMultiplayerRoom) {
  if (!io) {
    return;
  }

  io.to(`debug-arena:${room.roomCode}`).emit("debug-arena:room-update", {
    room,
    result: room.result
  });
}
