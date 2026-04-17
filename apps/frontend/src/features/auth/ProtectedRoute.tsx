import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import RouteLoadingScreen from "@/components/layout/RouteLoadingScreen";
import { appRoutes } from "@/app/routes";
import { useAuth } from "./auth-context";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <RouteLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={appRoutes.login} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
