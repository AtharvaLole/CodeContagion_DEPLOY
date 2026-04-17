import {
  Bug,
  Home,
  LayoutDashboard,
  ShieldAlert,
  type LucideIcon,
  Network,
  Trophy
} from "lucide-react";

export const appRoutes = {
  home: "/",
  dashboard: "/dashboard",
  debugArena: "/debug-arena",
  debugArenaDuo: "/debug-arena/duo",
  echoTrace: "/echo-trace",
  misinfoSim: "/misinfo-sim",
  misinfoSimSolo: "/misinfo-sim/solo",
  misinfoSimMultiplayer: "/misinfo-sim/multiplayer",
  leaderboard: "/leaderboard",
  profile: "/profile",
  login: "/login"
} as const;

export type AppRoutePath = (typeof appRoutes)[keyof typeof appRoutes];

export type NavItem = {
  path: AppRoutePath;
  label: string;
  icon: LucideIcon;
};

export const primaryNavItems: NavItem[] = [
  { path: appRoutes.home, label: "HOME", icon: Home },
  { path: appRoutes.dashboard, label: "DASHBOARD", icon: LayoutDashboard },
  { path: appRoutes.debugArena, label: "DEBUG ARENA", icon: Bug },
  { path: appRoutes.echoTrace, label: "ECHOTRACE", icon: ShieldAlert },
  { path: appRoutes.misinfoSim, label: "MISINFO SIM", icon: Network },
  { path: appRoutes.leaderboard, label: "LEADERBOARD", icon: Trophy }
];
