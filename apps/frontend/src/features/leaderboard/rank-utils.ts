import type { LeaderboardLeague } from "./leaderboard-api";

export function getLeagueFromElo(elo: number) {
  if (elo >= 1500) {
    return "Radiant";
  }

  if (elo >= 1401) {
    return "Immortal";
  }

  if (elo >= 1201) {
    return "Ascendant";
  }

  if (elo >= 1001) {
    return "Platinum";
  }

  if (elo >= 801) {
    return "Gold";
  }

  return "Bronze";
}

export function getLeagueBadge(league: string) {
  switch (league.toLowerCase()) {
    case "radiant":
      return "✹";
    case "immortal":
      return "♛";
    case "ascendant":
      return "⬢";
    case "platinum":
      return "◆";
    case "gold":
      return "⬡";
    default:
      return "🛡";
  }
}

export function getLeagueColorClass(league: string) {
  switch (league.toLowerCase()) {
    case "radiant":
      return "text-accent";
    case "immortal":
      return "text-primary";
    case "ascendant":
      return "text-neon-yellow";
    case "platinum":
      return "text-foreground";
    case "gold":
      return "text-neon-yellow";
    default:
      return "text-orange-300";
  }
}

export const leaderboardLeagueOptions: Array<{ value: LeaderboardLeague; label: string }> = [
  { value: "all", label: "ALL LEAGUES" },
  { value: "bronze", label: "BRONZE" },
  { value: "gold", label: "GOLD" },
  { value: "platinum", label: "PLATINUM" },
  { value: "ascendant", label: "ASCENDANT" },
  { value: "immortal", label: "IMMORTAL" },
  { value: "radiant", label: "RADIANT" }
];
