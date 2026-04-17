import type { SafeUser } from "../auth/auth.types.js";

function formatMemberSince(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  }).format(new Date(createdAt));
}

function pickFavoriteMode(user: SafeUser) {
  return user.stats.totalMatches % 2 === 0 ? "Debug Arena" : "Misinfo Sim";
}

export function buildDashboardResponse(user: SafeUser) {
  return {
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
  };
}

export function buildProfileResponse(user: SafeUser) {
  const achievements = [
    {
      id: "first-login",
      icon: "🛡️",
      name: "First Contact",
      description: "Created your CodeContagion operator account.",
      unlocked: true
    },
    {
      id: "streak-starter",
      icon: "🔥",
      name: "Warm Start",
      description: "Maintain at least a 1-day login streak.",
      unlocked: user.stats.streak > 0
    },
    {
      id: "elo-builder",
      icon: "📈",
      name: "Signal Booster",
      description: "Reach 1200 ELO and unlock ranked progression.",
      unlocked: user.stats.elo >= 1200
    },
    {
      id: "first-win",
      icon: "🏆",
      name: "First Blood",
      description: "Win your first live match in any mode.",
      unlocked: user.stats.wins > 0
    }
  ];

  const recentMatches = [
    {
      id: "bootstrap-1",
      result: user.stats.wins > 0 ? "WIN" : "PENDING",
      scenario: "System onboarding challenge",
      mode: "Tutorial",
      date: "Today",
      eloChange: user.stats.wins > 0 ? 18 : 0,
      time: "00:58"
    },
    {
      id: "bootstrap-2",
      result: user.stats.losses > 0 ? "LOSS" : "PENDING",
      scenario: "Daily challenge calibration",
      mode: "Debug Arena",
      date: "Today",
      eloChange: user.stats.losses > 0 ? -9 : 0,
      time: "01:12"
    }
  ];

  return {
    profile: {
      ...user,
      memberSince: formatMemberSince(user.createdAt),
      favoriteMode: pickFavoriteMode(user)
    },
    achievements,
    recentMatches
  };
}
