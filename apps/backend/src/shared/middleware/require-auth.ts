import type { NextFunction, Request, Response } from "express";
import { getSupabaseAdminClient, hasSupabaseServerConfig } from "../../config/supabase.js";
import { getUserById } from "../../modules/auth/auth.service.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid authorization header." });
  }

  if (!hasSupabaseServerConfig()) {
    return res.status(500).json({ message: "Supabase auth is not configured on the backend." });
  }

  const token = authorizationHeader.replace("Bearer ", "");

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    const storedUser = await getUserById(data.user.id);
    const metadataHandle =
      typeof data.user.user_metadata.handle === "string" ? data.user.user_metadata.handle : null;
    const emailHandle = (data.user.email ?? "operator").split("@")[0] ?? "operator";

    req.user = {
      id: data.user.id,
      email: data.user.email ?? storedUser?.email ?? "",
      handle: storedUser?.handle ?? metadataHandle ?? emailHandle
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Session is no longer valid." });
  }
}
