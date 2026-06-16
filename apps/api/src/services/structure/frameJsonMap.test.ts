import { describe, expect, it } from 'vitest';
import {
  FRAME_TO_JSON_KEY,
  getFrameSliceFromDomainFrame,
  getJsonSlicePath,
  isGovernedFrameKey,
  toDomainFrameStructureContractId,
} from '@keeper/shared';

describe('frameJsonMap', () => {
  it('maps route keys to DomainFrameJson slice paths', () => {
    expect(getJsonSlicePath('moments')).toBe('kept_moments');
    expect(getJsonSlicePath('admin')).toBe('domain_admin');
    expect(getJsonSlicePath('agent')).toBe('agent_board');
    expect(getJsonSlicePath('index')).toBeNull();
  });

  it('normalizes frame route keys', () => {
    expect(getJsonSlicePath('Admin')).toBe('domain_admin');
  });

  it('reads slices from domain frame json', () => {
    const block = { slide_type: 'cover', card: { type: 'welcome', available_to: ['guest'] } };
    const frameJson = { cover: block, kept_moments: { labels: {} } };
    expect(getFrameSliceFromDomainFrame(frameJson, 'cover')).toEqual(block);
    expect(getFrameSliceFromDomainFrame(frameJson, 'moments')).toEqual({ labels: {} });
    expect(getFrameSliceFromDomainFrame(frameJson, 'hub')).toBeNull();
  });

  it('builds domain.frame structure contract ids for governed frames', () => {
    expect(toDomainFrameStructureContractId('cover')).toBe('domain.frame.cover');
    expect(toDomainFrameStructureContractId('hub')).toBeNull();
    expect(isGovernedFrameKey('present')).toBe(false);
    expect(Object.keys(FRAME_TO_JSON_KEY).length).toBeGreaterThan(10);
  });
});
