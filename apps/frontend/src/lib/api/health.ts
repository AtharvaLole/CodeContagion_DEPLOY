import { apiClient } from "./client";

export type BackendHealth = {
  ok: boolean;
  service: string;
  environment: string;
  timestamp: string;
};

export function fetchBackendHealth() {
  return apiClient.get<BackendHealth>("/health");
}
