export type PipelineTriggerType = 'manual' | 'webhook' | 'branch' | 'schedule' | 'tag';
export interface PipelineTrigger {
  id: string;
  type: PipelineTriggerType;
  enabled: boolean;
  config: Record<string, unknown>;
}
