export type LastBoardDataError = {
  reqId: string | null
  url: string
  status: number | null
  boardId?: string | null
  at: string
};

declare global {
  interface Window {
    __KEEPER_DEBUG__?: {
      lastBoardDataError?: LastBoardDataError
      studioContext?: any
      studioSaves?: any[]
      uiPropCounter?: () => number
    }
  }
}

export function setLastBoardDataError(e: LastBoardDataError) {
  const w = window as any;
  w.__KEEPER_DEBUG__ = w.__KEEPER_DEBUG__ || {};
  w.__KEEPER_DEBUG__.lastBoardDataError = e;
}

export function getLastBoardDataError(): LastBoardDataError | null {
  return (window as any)?.__KEEPER_DEBUG__?.lastBoardDataError ?? null;
}

// Studio Debug utility object
export const debug = {
  setContext(context: any) {
    const w = window as any;
    w.__KEEPER_DEBUG__ = w.__KEEPER_DEBUG__ || {};
    w.__KEEPER_DEBUG__.studioContext = context;
  },
  
  recordSave(record: any) {
    const w = window as any;
    w.__KEEPER_DEBUG__ = w.__KEEPER_DEBUG__ || {};
    w.__KEEPER_DEBUG__.studioSaves = w.__KEEPER_DEBUG__.studioSaves || [];
    w.__KEEPER_DEBUG__.studioSaves.push({
      ...record,
      timestamp: new Date().toISOString()
    });
    // Keep only last 50 saves to prevent memory issues
    if (w.__KEEPER_DEBUG__.studioSaves.length > 50) {
      w.__KEEPER_DEBUG__.studioSaves = w.__KEEPER_DEBUG__.studioSaves.slice(-50);
    }
  },
  
  setUiPropCounter(fn: () => number) {
    const w = window as any;
    w.__KEEPER_DEBUG__ = w.__KEEPER_DEBUG__ || {};
    w.__KEEPER_DEBUG__.uiPropCounter = fn;
  }
};


