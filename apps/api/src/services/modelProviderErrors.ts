/**
 * Provider error classification for chat execution.
 * INVALID_MODEL must mean "this model ID is not accepted" — not any message
 * that happens to contain both "model" and "not".
 */

export function isGenuineInvalidModelError(params: {
  providerCode?: string | null;
  message?: string | null;
  status?: number | null;
}): boolean {
  const providerCode = (params.providerCode ?? '').toLowerCase();
  const message = (params.message ?? '').toLowerCase();
  const status = params.status ?? undefined;

  if (providerCode === 'model_not_found') return true;

  if (providerCode === 'not_found_error' && /\bmodel\b/.test(message)) {
    return true;
  }

  if (/"type"\s*:\s*"not_found_error"/.test(message) && /\bmodel\b/.test(message)) {
    return true;
  }

  if (
    /model[_ ]not[_ ]found/.test(message)
    || /\binvalid model\b/.test(message)
    || /\bunknown model\b/.test(message)
    || /could not (resolve|find) (the )?model/.test(message)
    || /does not have access to (the )?model/.test(message)
    || /model[:\s]+[\w./-]+ (was not found|does not exist|not found)/.test(message)
  ) {
    return true;
  }

  if (status === 404 && /\bmodel\b/.test(message) && /not found|does not exist/.test(message)) {
    return true;
  }

  return false;
}

export function shouldFallbackToSiblingOffering(params: {
  errorCode?: string | null;
  providerStatus?: number | null;
}): boolean {
  if (params.errorCode === 'INVALID_MODEL') return true;
  if (params.errorCode === 'PROVIDER_UNAVAILABLE' && params.providerStatus === 404) {
    return true;
  }
  return false;
}
