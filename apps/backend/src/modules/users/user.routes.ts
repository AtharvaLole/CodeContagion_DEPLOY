import { Router } from "express";
import { getUserById } from "../auth/auth.service.js";
import { requireAuth } from "../../shared/middleware/require-auth.js";

export const userRouter = Router();

userRouter.get("/me/dashboard", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    profile: user,
    livePlayers: 1247,
    dailyChallenges: [
      { id: "daily-debug", icon: "🐞", title: "Fix the Daily Bug", progress: 0, total: 1, reward: "+25 ELO" },
      { id: "daily-login", icon: "🔐", title: "Login Streak", progress: 1, total: 3, reward: "Streak x1" },
      { id: "daily-analyst", icon: "🕵️", title: "Contain One Signal", progress: 0, total: 1, reward: "Badge XP" }
    ],
    recentActivity: [
      { type: "system", message: `Welcome to CodeContagion, ${user.handle}.`, time: "Just now" },
      { type: "achievement", message: "Profile initialized and secured.", time: "Just now" },
      { type: "system", message: "Daily challenge is ready for your first attempt.", time: "Now live" }
    ],
    stats: {
      winRate: `${user.stats.winRate}%`,
      totalMatches: user.stats.totalMatches,
      elo: user.stats.elo,
      streak: user.stats.streak
    }
  });
});
