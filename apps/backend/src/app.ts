import cors from "cors";
import express from "express";
import helmet from "helmet";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { debugArenaMultiplayerRouter } from "./modules/debug-arena/debug-arena-multiplayer.routes.js";
import { debugArenaRouter } from "./modules/debug-arena/debug-arena.routes.js";
import { echoTraceRouter } from "./modules/echo-trace/echo-trace.routes.js";
import { misinfoMultiplayerRouter } from "./modules/misinfo-sim/misinfo-multiplayer.routes.js";
import { misinfoSimRouter } from "./modules/misinfo-sim/misinfo-sim.routes.js";
import { userRouterV2 } from "./modules/users/user.routes.v2.js";
import { env } from "./config/env.js";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouterV2);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/debug-arena", debugArenaRouter);
app.use("/api/v1/debug-arena-mp", debugArenaMultiplayerRouter);
app.use("/api/v1/echo-trace", echoTraceRouter);
app.use("/api/v1/misinfo-sim", misinfoSimRouter);
app.use("/api/v1/misinfo-sim-mp", misinfoMultiplayerRouter);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "codecontagion-backend",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/v1/status", (_req, res) => {
  const isProduction = env.NODE_ENV === "production";

  if (isProduction) {
    return res.json({
      project: "CodeContagion",
      status: "ok"
    });
  }

  res.json({
    project: "CodeContagion",
    phase: "Phase 7",
    frontendOrigin: env.CORS_ORIGINS,
    integrations: {
      groqConfigured: Boolean(env.GROQ_API_KEY),
      groqModel: env.GROQ_MODEL,
      supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      redisConfigured: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
      pistonConfigured: Boolean(env.PISTON_API_URL),
      authConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
    }
  });
});
