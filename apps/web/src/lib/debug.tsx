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


