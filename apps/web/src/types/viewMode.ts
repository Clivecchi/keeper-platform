export enum ViewMode {
  Architect = 'Architect',
  MyKeeper = 'My Keepers',
  Admin = 'System Admin'
}

export interface ViewModeContextType {
  currentMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMode: (mode: ViewMode) => boolean;
}

export type ViewModeState = {
  mode: ViewMode;
  timestamp: number;
}; 