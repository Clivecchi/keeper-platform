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

const SECRET_PATTERNS = [
  /sk-ant-[a-z0-9_-]+/gi,
  /sk-[a-z0-9_-]{8,}/gi,
  /bearer\s+\S+/gi,
];

/** Short, key-free provider text safe to show in Dialog. */
export function publicProviderFailureDetail(message: string | null | undefined): string | null {
  if (!message) return null;
  let text = message.replace(/\s+/g, ' ').trim();
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[redacted]');
  }
  if (text.length < 12) return null;
  if (text.length > 220) text = `${text.slice(0, 217)}…`;
  return text;
}

export function isDeprecatedTemperatureError(error: unknown): boolean {
  const texts: string[] = [];
  if (typeof error === 'string') texts.push(error);
  if (error instanceof Error) texts.push(error.message);
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; error?: unknown };
    if (typeof record.message === 'string') texts.push(record.message);
    const nested = record.error;
    if (typeof nested === 'string') texts.push(nested);
    if (nested && typeof nested === 'object' && typeof (nested as { message?: unknown }).message === 'string') {
      texts.push((nested as { message: string }).message);
    }
  }
  return texts.some((text) => /temperature[`'"]?\s+is deprecated/i.test(text));
}

export function isProviderOverload(params: {
  status?: number | null;
  message?: string | null;
}): boolean {
  const status = params.status ?? undefined;
  const lower = (params.message ?? '').toLowerCase();
  return (
    status === 529
    || status === 503
    || status === 502
    || status === 504
    || lower.includes('overloaded')
    || lower.includes('temporarily unavailable')
    || lower.includes('service unavailable')
  );
}

/**
 * Catch-all when the provider error is not timeout, quota, key, invalid model, or overload.
 * Keeps HTTP status and a clipped provider sentence. 4xx is not retried.
 */
export function unclassifiedProviderFailureMessage(
  providerLabel: string,
  rawMessage: string,
  status?: number,
): { message: string; detail: string | null; retryable: boolean } {
  const detail = publicProviderFailureDetail(rawMessage);
  const statusBit = typeof status === 'number' ? ` HTTP ${status}.` : '';
  const detailBit = detail ? ` ${detail}` : '';
  const retryable = typeof status !== 'number' || status >= 500;
  return {
    message: `${providerLabel} rejected the request.${statusBit}${detailBit}`.replace(/\s+/g, ' ').trim(),
    detail,
    retryable,
  };
}

/** Empty visible text. Retrying the same request does not fill it in. A sibling model might. */
export function isEmptyProviderCompletion(message: string | null | undefined): boolean {
  const lower = (message ?? '').toLowerCase();
  return (
    lower.includes('no response content')
    || lower.includes('output budget before writing')
  );
}

export function shouldFallbackToSiblingOffering(params: {
  errorCode?: string | null;
  providerStatus?: number | null;
  message?: string | null;
}): boolean {
  if (params.errorCode === 'INVALID_MODEL') return true;
  if (params.errorCode === 'PROVIDER_UNAVAILABLE' && params.providerStatus === 404) {
    return true;
  }
  if (isEmptyProviderCompletion(params.message)) return true;
  return false;
}
