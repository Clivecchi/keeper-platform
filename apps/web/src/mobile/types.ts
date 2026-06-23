export type MobileTabId = "world" | "keep" | "journeys";

export type MobileSurfaceMode = "mobile" | "desktop";

export interface MobileJourneySummary {
  id: string;
  name: string;
  momentCount?: number;
  updatedAt?: string;
  keeperId?: string | null;
}

export interface MobileKeeperSummary {
  id: string;
  title: string;
  display_label?: string | null;
}

export interface MobileMomentDetail {
  id: string;
  title: string;
  narrative: string;
  keptAt: string | null;
  createdAt: string;
  updatedAt: string;
  journeyId?: string | null;
  journeyName?: string | null;
  pathName?: string | null;
}
