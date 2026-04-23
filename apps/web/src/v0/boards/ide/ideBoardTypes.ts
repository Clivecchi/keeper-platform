export type IDEBoardKipContext =
  | { type: "journey"; id: string }
  | { type: "moment"; id: string }
  | { type: "keeper"; id: string }
  | { type: "draft"; id: string }
