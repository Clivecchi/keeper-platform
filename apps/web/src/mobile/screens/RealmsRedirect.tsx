"use client";

import { Navigate } from "react-router-dom";
import { HOME_PATH } from "../../v0/shell/shellMode";

/**
 * Authenticated entry — lands on user Home at `/home` (no domain slug).
 */
export function RealmsRedirect() {
  return <Navigate to={HOME_PATH} replace />;
}
