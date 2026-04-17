import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import RouteLoadingScreen from "@/components/layout/RouteLoadingScreen";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { appRoutes } from "./routes";
import HomePage from "@/pages/Index";

const DashboardPage = lazy(() => import("@/pages/DashboardHome"));
const DebugArenaPage = lazy(() => import("@/pages/DebugArenaSolo"));
const DebugArenaDuoPage = lazy(() => import("@/pages/DebugArenaDuo"));
const EchoTracePage = lazy(() => import("@/pages/EchoTrace"));
const MisinfoModeSelectPage = lazy(() => import("@/pages/MisinfoModeHub"));
const MisinfoSoloPage = lazy(() => import("@/pages/MisinfoSolo"));
const MisinfoMultiplayerPage = lazy(() => import("@/pages/MisinfoMultiplayer"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardScreen"));
const ProfilePage = lazy(() => import("@/pages/ProfileScreen"));
const LoginPage = lazy(() => import("@/pages/LoginScreen"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <Routes>
        <Route path={appRoutes.home} element={<HomePage />} />
        <Route path={appRoutes.dashboard} element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path={appRoutes.debugArena} element={<ProtectedRoute><DebugArenaPage /></ProtectedRoute>} />
        <Route path={appRoutes.debugArenaDuo} element={<ProtectedRoute><DebugArenaDuoPage /></ProtectedRoute>} />
        <Route path={appRoutes.echoTrace} element={<ProtectedRoute><EchoTracePage /></ProtectedRoute>} />
        <Route path={appRoutes.misinfoSim} element={<ProtectedRoute><MisinfoModeSelectPage /></ProtectedRoute>} />
        <Route path={appRoutes.misinfoSimSolo} element={<ProtectedRoute><MisinfoSoloPage /></ProtectedRoute>} />
        <Route path={appRoutes.misinfoSimMultiplayer} element={<ProtectedRoute><MisinfoMultiplayerPage /></ProtectedRoute>} />
        <Route path={appRoutes.leaderboard} element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path={appRoutes.profile} element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path={appRoutes.login} element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
