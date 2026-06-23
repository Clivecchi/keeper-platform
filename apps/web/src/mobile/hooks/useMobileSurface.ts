import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "./useIsMobile";
import type { MobileSurfaceMode } from "../types";

export function useMobileSurface(isAuthenticated: boolean): MobileSurfaceMode {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const surfaceParam = searchParams.get("surface");

  if (surfaceParam === "desktop") return "desktop";
  if (surfaceParam === "mobile") return "mobile";
  if (isAuthenticated && isMobile) return "mobile";
  return "desktop";
}
