import { describe, expect, it } from 'vitest';
import { isGenuineInvalidModelError, shouldFallbackToSiblingOffering } from './modelProviderErrors.js';

describe('isGenuineInvalidModelError', () => {
  it('accepts Anthropic not_found_error that names a missing model', () => {
    expect(
      isGenuineInvalidModelError({
        providerCode: 'not_found_error',
        message: 'model: claude-sonnet-4-6',
        status: 404,
      }),
    ).toBe(true);
  });

  it('accepts OpenAI model_not_found', () => {
    expect(
      isGenuineInvalidModelError({
        providerCode: 'model_not_found',
        message: 'The model `gpt-nope` does not exist',
      }),
    ).toBe(true);
  });

  it('does not treat capability mismatches as an invalid model ID', () => {
    expect(
      isGenuineInvalidModelError({
        providerCode: 'invalid_request_error',
        message: 'this model does not support image content',
        status: 400,
      }),
    ).toBe(false);
  });

  it('does not treat generic invalid_request_error JSON as INVALID_MODEL', () => {
    expect(
      isGenuineInvalidModelError({
        providerCode: 'invalid_request_error',
        message: '400 {"type":"error","error":{"type":"invalid_request_error","message":"messages: Extra inputs are not permitted"}}',
        status: 400,
      }),
    ).toBe(false);
  });

  it('does not match any string that merely contains model and not', () => {
    expect(
      isGenuineInvalidModelError({
        message: 'The model could not complete the request because tools are not enabled',
      }),
    ).toBe(false);
  });
});

describe('shouldFallbackToSiblingOffering', () => {
  it('falls back on a genuine INVALID_MODEL', () => {
    expect(shouldFallbackToSiblingOffering({ errorCode: 'INVALID_MODEL' })).toBe(true);
  });

  it('does not fall back on timeout, quota, or missing key', () => {
    expect(shouldFallbackToSiblingOffering({ errorCode: 'TIMEOUT' })).toBe(false);
    expect(shouldFallbackToSiblingOffering({ errorCode: 'QUOTA_EXCEEDED' })).toBe(false);
    expect(shouldFallbackToSiblingOffering({ errorCode: 'MISSING_API_KEY' })).toBe(false);
  });

  it('does not fall back on a generic overload without 404', () => {
    expect(
      shouldFallbackToSiblingOffering({ errorCode: 'PROVIDER_UNAVAILABLE', providerStatus: 529 }),
    ).toBe(false);
  });
});
