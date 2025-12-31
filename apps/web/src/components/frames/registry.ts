import type { ComponentType } from 'react';
import { z } from 'zod';

export type FrameType =
  | 'dialog'
  | 'topics'
  | 'drafts'
  | 'tasks'
  | 'config'
  | 'activity'
  | 'memory';

export interface FrameDef<TProps = unknown> {
  type: FrameType;
  title: string;
  icon?: ComponentType<any>;
  zodPropsSchema: z.ZodType<TProps>;
  defaultProps?: Partial<TProps>;
  Component: ComponentType<TProps>;
}

const _registry = new Map<FrameType, FrameDef<any>>();

export function registerFrameType<TProps>(def: FrameDef<TProps>) {
  _registry.set(def.type, def as FrameDef<any>);
}

export function getFrameDef(type: FrameType) {
  return _registry.get(type);
}

export function listFrameDefs() {
  return Array.from(_registry.values());
}

export function parseFrameProps<T>(def: FrameDef<T>, raw: unknown): T {
  return def.zodPropsSchema.parse(raw);
}


