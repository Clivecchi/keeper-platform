import { useEffect, useMemo, useRef, useState } from "react";

type ServerFrame = {
  id: string;
  role?: string;
  pattern?: string;
  props?: any[];
  items?: any[];
  elements?: any[];
};

type FramesResponse = ServerFrame[] | { frames?: ServerFrame[] };

function countServerProps(sf?: ServerFrame) {
  if (!sf) return 0;
  const arrays = [sf.props, sf.items, sf.elements].filter(Boolean) as any[][];
  return arrays.reduce((n, a) => n + a.length, 0);
}

export type StudioDebugApi = {
  setContext(ctx: { boardId?: string | null; activeFrameId?: string | null }): void;
  recordSave(info: { payload: unknown; response: { ok: boolean; status: number; body?: unknown } }): void;
  setUiPropCounter(fn: () => number): void;
};

export default function StudioDebug({
  apiRef,
  initialOpen = false,
}: {
  apiRef: React.MutableRefObject<StudioDebugApi | null>;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const uiCounterRef = useRef<() => number>(() => 0);
  const lastSavePayloadRef = useRef<any>(null);
  const lastSaveResponseRef = useRef<{ ok: boolean; status: number; body?: unknown } | null>(null);

  const [loading, setLoading] = useState(false);
  const [serverFrames, setServerFrames] = useState<ServerFrame[] | null>(null);
  const [status, setStatus] = useState<null | { kind: "ok" | "fail"; msg: string }>(null);
  const [recentCalls, setRecentCalls] = useState<string[]>([]);

  const apiBase = (import.meta.env.VITE_API_URL || "https://api.ke3p.com").replace(/\/$/, "");
  const authMode = useMemo(() => {
    try {
      const devToken = localStorage.getItem("keeper_token") || sessionStorage.getItem("keeper_token");
      return import.meta.env.PROD ? "cookie" : (devToken ? "header (dev)" : "cookie");
    } catch {
      return "cookie";
    }
  }, []);

  // Imperative API
  useEffect(() => {
    apiRef.current = {
      setContext: ({ boardId, activeFrameId }) => {
        if (boardId !== undefined) setBoardId(boardId ?? null);
        if (activeFrameId !== undefined) setActiveFrameId(activeFrameId ?? null);
      },
      recordSave: ({ payload, response }) => {
        lastSavePayloadRef.current = payload;
        lastSaveResponseRef.current = response;
        // lightweight ring buffer of last 10 calls
        setRecentCalls((arr) => {
          const line = `PATCH /board-data/${boardId ?? "-"} → ${response.status} (${response.ok ? "ok" : "fail"})`;
          const next = [...arr, line];
          if (next.length > 10) next.shift();
          return next;
        });
      },
      setUiPropCounter: (fn) => {
        uiCounterRef.current = fn || (() => 0);
      },
    };
  }, [apiRef, boardId]);

  async function fetchFramesAndCompare() {
    if (!boardId) return;
    setLoading(true);
    setStatus(null);
    try {
      const r = await fetch(`${apiBase}/api/frames/instances/board/${boardId}`, { credentials: "include" });
      const json: FramesResponse = await r.json();
      const frames = Array.isArray(json) ? json : (json.frames ?? []);
      setServerFrames(frames);
      const sf = frames.find((f) => f.id === activeFrameId);
      const serverCount = countServerProps(sf);
      const uiCount = uiCounterRef.current ? uiCounterRef.current() : 0;
      setStatus({
        kind: serverCount === uiCount ? "ok" : "fail",
        msg: `Active frame props — UI: ${uiCount}, Server: ${serverCount}`,
      });
      setRecentCalls((arr) => {
        const line = `GET /frames/instances/board/${boardId} → ${r.status} (${r.ok ? "ok" : "fail"})`;
        const next = [...arr, line];
        if (next.length > 10) next.shift();
        return next;
      });
    } catch (e: any) {
      setStatus({ kind: "fail", msg: `Fetch error: ${e?.message || String(e)}` });
    } finally {
      setLoading(false);
    }
  }

  // keyboard toggle (CTRL/ALT + D, CMD/OPT + D)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const combo = (isMac && e.metaKey && e.altKey && e.key.toLowerCase() === "d") ||
                    (!isMac && e.ctrlKey && e.altKey && e.key.toLowerCase() === "d");
      if (combo) setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (import.meta.env.VITE_STUDIO_DEBUG !== "1") return null;

  return (
    <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 9999 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ padding: "8px 10px", borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}
      >
        {open ? "Close Debug" : "Open Debug"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            width: 380,
            maxHeight: "70vh",
            overflow: "auto",
            background: "#0f1115",
            color: "#e7e7e7",
            padding: 12,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,.35)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Studio Debug</div>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>
            env: {import.meta.env.PROD ? "production" : "dev"} · auth: <b>{authMode}</b> · api: {apiBase}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div>boardId: <code>{boardId || "(none)"}</code></div>
            <div>activeFrameId: <code>{activeFrameId || "(none)"}</code></div>
            <div>UI prop count (active): <b>{uiCounterRef.current ? uiCounterRef.current() : 0}</b></div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchFramesAndCompare} disabled={!boardId || loading} style={{ padding: "6px 8px", borderRadius: 6 }}>
              Refresh From API
            </button>
            <button onClick={fetchFramesAndCompare} disabled={!boardId || loading} style={{ padding: "6px 8px", borderRadius: 6 }}>
              Verify Persistence
            </button>
          </div>

          {status && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 8,
                background: status.kind === "ok" ? "#0a3d12" : "#3d0a0a",
                color: "#fff",
              }}
            >
              {status.msg}
            </div>
          )}

          <hr style={{ opacity: 0.25, margin: "10px 0" }} />

          <div style={{ fontWeight: 700, marginBottom: 4 }}>Last Save — Request</div>
          <pre style={{ whiteSpace: "pre-wrap", background: "#13161d", padding: 8, borderRadius: 6 }}>
{JSON.stringify(lastSavePayloadRef.current ?? null, null, 2)}
          </pre>

          <div style={{ fontWeight: 700, margin: "8px 0 4px" }}>Last Save — Response</div>
          <pre style={{ whiteSpace: "pre-wrap", background: "#13161d", padding: 8, borderRadius: 6 }}>
{JSON.stringify(lastSaveResponseRef.current ?? null, null, 2)}
          </pre>

          <div style={{ fontWeight: 700, margin: "8px 0 4px" }}>Recent API calls</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {recentCalls.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}


