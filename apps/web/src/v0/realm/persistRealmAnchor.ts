import { apiFetch } from "../../lib/apiFetch"

export interface PersistRealmAnchorInput {
  domainId?: string
  domainSlug?: string
}

export async function persistRealmAnchor(
  input: PersistRealmAnchorInput,
): Promise<{ anchorDomainId: string; anchorDomainSlug: string }> {
  const response = (await apiFetch("/api/realm/anchor", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })) as {
    success?: boolean
    anchorDomainId?: string
    anchorDomainSlug?: string
    error?: string
  }

  if (!response?.success || !response.anchorDomainId || !response.anchorDomainSlug) {
    throw new Error(response?.error || "Could not save realm anchor")
  }

  return {
    anchorDomainId: response.anchorDomainId,
    anchorDomainSlug: response.anchorDomainSlug,
  }
}
