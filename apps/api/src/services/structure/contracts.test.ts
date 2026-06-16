import { describe, expect, it } from 'vitest';
import {
  DOMAIN_FRAME_STRUCTURE_CONTRACTS,
  getDomainFrameStructureContractId,
  getStructureContract,
  hasDomainFrameStructureContract,
  listDomainFrameStructureContractIds,
} from './contracts.js';

describe('domain frame structure contracts', () => {
  it('registers a contract for each governed frame in FRAME_SCHEMA_MAP', () => {
    const ids = listDomainFrameStructureContractIds();
    expect(ids).toContain('domain.frame.cover');
    expect(ids).toContain('domain.frame.moments');
    expect(ids).toContain('domain.frame.admin');
    expect(ids).toContain('domain.frame.theme');
    expect(ids.length).toBe(Object.keys(DOMAIN_FRAME_STRUCTURE_CONTRACTS).length);
    expect(ids.length).toBeGreaterThanOrEqual(13);
  });

  it('resolves contract metadata with jsonSchema', () => {
    const id = getDomainFrameStructureContractId('agent');
    expect(id).toBe('domain.frame.agent');
    const contract = getStructureContract(id!);
    expect(contract?.jsonSchema).toBeTruthy();
    expect(contract?.frameKey).toBe('agent');
    expect(contract?.parseFallback).toBe('none');
  });

  it('returns null for ungoverned frames', () => {
    expect(getDomainFrameStructureContractId('hub')).toBeNull();
    expect(hasDomainFrameStructureContract('index')).toBe(false);
    expect(hasDomainFrameStructureContract('cover')).toBe(true);
    expect(hasDomainFrameStructureContract('theme')).toBe(true);
  });

  it('registers theme contract with DomainFrameTheme jsonSchema', () => {
    const contract = getStructureContract('domain.frame.theme');
    expect(contract?.frameKey).toBe('theme');
    const schema = contract?.jsonSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema?.required).toEqual(
      expect.arrayContaining(['wordmark', 'tagline', 'background', 'colors', 'fonts']),
    );
    expect(schema?.properties?.colors).toMatchObject({
      type: 'object',
      required: ['primary', 'accent', 'surface'],
    });
  });
});
