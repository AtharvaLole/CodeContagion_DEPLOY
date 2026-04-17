import { Router } from "express";
import { getUserById } from "../auth/auth.service.js";
import { buildDashboardResponse, buildProfileResponse } from "./user.presenters.js";
import { getSupabaseLeaderboard } from "./leaderboard-supabase.service.js";
import { requireAuth } from "../../shared/middleware/require-auth.js";

export const userRouterV2 = Router();

userRouterV2.get("/me/dashboard", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(buildDashboardResponse(user));
});

userRouterV2.get("/me/profile", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(buildProfileResponse(user));
});

userRouterV2.get("/leaderboard", requireAuth, async (req, res) => {
  const filter = req.query.filter;
  const normalizedFilter =
    filter === "daily" || filter === "weekly" || filter === "all-time"
      ? filter
      : "all-time";
  const league = req.query.league;
  const normalizedLeague =
    league === "bronze" ||
    league === "gold" ||
    league === "platinum" ||
    league === "ascendant" ||
    league === "immortal" ||
    league === "radiant"
      ? league
      : "all";

  const leaderboard = await getSupabaseLeaderboard(normalizedFilter, normalizedLeague);
  const currentUser = leaderboard.find((entry) => entry.id === req.user.id) ?? null;

  return res.json({
    filter: normalizedFilter,
    league: normalizedLeague,
    leaderboard,
    currentUser
  });
});
