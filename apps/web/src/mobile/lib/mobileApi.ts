import { apiFetch } from "../../lib/api";
import { getKeptMoments, type KeptMomentSummary } from "../../v0/api/v0Moments";
import type { MobileJourneySummary, MobileKeeperSummary, MobileMomentDetail } from "../types";

export async function fetchDomainJourneys(domainId: string): Promise<MobileJourneySummary[]> {
  const res = (await apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)) as {
    data?: { journeys?: MobileJourneySummary[] };
  };
  const list = res?.data?.journeys ?? [];
  return Array.isArray(list) ? list : [];
}

export async function fetchDomainKeepers(domainId: string): Promise<MobileKeeperSummary[]> {
  const res = (await apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)) as {
    data?: { keepers?: MobileKeeperSummary[] };
  };
  const list = res?.data?.keepers ?? [];
  return Array.isArray(list) ? list : [];
}

export async function fetchJourneyWithMoments(journeyId: string): Promise<{
  id: string;
  name: string;
  keeperId?: string | null;
  moment: Array<{
    id: string;
    title: string;
    narrative?: string | null;
    keptAt?: string | null;
    createdAt?: string;
  }>;
}> {
  const res = (await apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)) as {
    data?: {
      journey?: {
        id: string;
        name: string;
        keeperId?: string | null;
        moment?: Array<{
          id: string;
          title: string;
          narrative?: string | null;
          keptAt?: string | null;
          createdAt?: string;
        }>;
      };
    };
  };
  const journey = res?.data?.journey;
  if (!journey) {
    throw new Error("Journey not found");
  }
  return {
    id: journey.id,
    name: journey.name,
    keeperId: journey.keeperId ?? null,
    moment: Array.isArray(journey.moment) ? journey.moment : [],
  };
}

export async function fetchMomentDetail(momentId: string): Promise<MobileMomentDetail> {
  const res = (await apiFetch(`/api/moments/${encodeURIComponent(momentId)}`)) as {
    moment?: {
      id: string;
      title: string;
      narrative?: string | null;
      keptAt?: string | null;
      createdAt?: string;
      updatedAt?: string;
      journeyId?: string | null;
      Journey?: { name?: string | null } | null;
      Path?: { name?: string | null } | null;
    };
  };

  const moment = res?.moment;
  if (!moment) {
    throw new Error("Moment not found");
  }

  return {
    id: moment.id,
    title: moment.title,
    narrative: moment.narrative ?? "",
    keptAt: moment.keptAt ?? null,
    createdAt: moment.createdAt ?? new Date().toISOString(),
    updatedAt: moment.updatedAt ?? moment.createdAt ?? new Date().toISOString(),
    journeyId: moment.journeyId ?? null,
    journeyName: moment.Journey?.name ?? null,
    pathName: moment.Path?.name ?? null,
  };
}

export async function fetchKeptMomentsForWorld(options: {
  domainSlug: string;
  limit?: number;
}): Promise<KeptMomentSummary[]> {
  return getKeptMoments({
    domainSlug: options.domainSlug,
    limit: options.limit ?? 50,
  });
}
