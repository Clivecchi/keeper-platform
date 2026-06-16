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
    expect(ids.length).toBe(Object.keys(DOMAIN_FRAME_STRUCTURE_CONTRACTS).length);
    expect(ids.length).toBeGreaterThanOrEqual(12);
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
  });
});
