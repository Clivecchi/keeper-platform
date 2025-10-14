import { useMemo, useRef } from "react";
import StudioDebug, { StudioDebugApi } from "./StudioDebug";

export function useStudioDebug() {
  const apiRef = useRef<StudioDebugApi | null>(null);

  const Panel = useMemo(() => {
    if (import.meta.env.VITE_STUDIO_DEBUG !== "1") return null;
    return function Panel() {
      return <StudioDebug apiRef={apiRef as any} />;
    };
  }, []);

  return {
    Panel,
    setContext: (ctx: { boardId?: string | null; activeFrameId?: string | null }) =>
      apiRef.current?.setContext(ctx),
    recordSave: (info: { payload: unknown; response: { ok: boolean; status: number; body?: unknown } }) =>
      apiRef.current?.recordSave(info),
    setUiPropCounter: (fn: () => number) => apiRef.current?.setUiPropCounter(fn),
  };
}


