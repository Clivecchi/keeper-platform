/**
 * Success contract for POST /api/v0/moments/claim.
 * The handler keeps the Moment and assigns ownerId from the session.
 * The JSON does not include ownerId. Ownership is the kept row on the right Domain.
 */

export type AnonymousClaimAssessment = {
  ok: boolean;
  reason?: string;
};

function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Unwrap `{ success, data }` or accept the data object itself. */
export function claimResponseData(body: unknown): Record<string, unknown> | null {
  const record = recordOf(body);
  if (!record) return null;
  const nested = recordOf(record.data);
  return nested ?? record;
}

export function assessAnonymousClaimResponse(params: {
  httpOk: boolean;
  body: unknown;
  draftId: string;
  domainSlug: string;
}): AnonymousClaimAssessment {
  if (!params.httpOk) return { ok: false, reason: 'The claim request failed.' };
  const data = claimResponseData(params.body);
  if (!data) return { ok: false, reason: 'The claim response had no data.' };
  if (data.id !== params.draftId) {
    return { ok: false, reason: 'The claimed Moment is not the anonymous draft.' };
  }
  if (data.status !== 'kept') {
    return { ok: false, reason: 'The claimed Moment is not kept.' };
  }
  if (typeof data.keptAt !== 'string' || data.keptAt.trim().length === 0) {
    return { ok: false, reason: 'keptAt is missing.' };
  }
  const domain = recordOf(data.domain);
  const slug = typeof domain?.slug === 'string' ? domain.slug : '';
  if (slug !== params.domainSlug) {
    return { ok: false, reason: 'The claimed Moment is not on this Domain.' };
  }
  return { ok: true };
}

/** After a claim, the anonymous key must no longer be able to write the draft. */
export function anonymousKeyLostWriteAccess(status: number): boolean {
  return status === 403 || status === 401;
}
