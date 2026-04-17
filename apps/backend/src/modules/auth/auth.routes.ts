import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient, hasSupabaseServerConfig } from "../../config/supabase.js";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { ensureUserProfile, getUserById } from "./auth.service.js";

const registerSchema = z.object({
  handle: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const syncProfileSchema = z.object({
  handle: z.string().min(3).max(24).optional()
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    if (!hasSupabaseServerConfig()) {
      return res.status(500).json({ message: "Supabase auth is not configured on the backend." });
    }

    const payload = registerSchema.parse(req.body);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        handle: payload.handle.trim()
      }
    });

    if (error || !data.user) {
      return res.status(400).json({ message: error?.message ?? "Unable to create Supabase account." });
    }

    const user = await ensureUserProfile({
      id: data.user.id,
      email: data.user.email ?? payload.email,
      preferredHandle: payload.handle
    });

    return res.status(201).json({
      user,
      message: "Account created successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register user.";
    return res.status(400).json({ message });
  }
});

authRouter.post("/login", (_req, res) => {
  return res.status(410).json({
    message: "Login now uses Supabase Auth on the frontend."
  });
});

authRouter.post("/sync-profile", requireAuth, async (req, res) => {
  try {
    const payload = syncProfileSchema.parse(req.body);
    const user = await ensureUserProfile({
      id: req.user.id,
      email: req.user.email,
      preferredHandle: payload.handle ?? req.user.handle
    });
    return res.status(201).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync user profile.";
    return res.status(400).json({ message });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({ user });
});
