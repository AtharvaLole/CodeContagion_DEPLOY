import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  JWT_SECRET: z.string().default("codecontagion-dev-secret-change-me"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  AI_PROVIDER: z.enum(["nvidia", "nvidia-nim", "nim", "groq"]).optional().default("nvidia-nim"),
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_MODEL_ID: z.string().default("meta/llama-3.1-8b-instruct"),
  PISTON_API_URL: z.string().default("https://emkc.org/api/v2/piston"),
  DEBUG_ARENA_AI_URL: z.string().default("http://localhost:5001/debug-arena"),
  MISINFO_SIM_AI_URL: z.string().default("https://cc-deploy-1-vtbv.onrender.com/misinfosim")
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  CORS_ORIGINS: parsedEnv.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};
