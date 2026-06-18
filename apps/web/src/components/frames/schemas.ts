import { z } from 'zod';

export const DialogPropsSchema   = z.object({ agentId: z.string().optional() });
export const TopicsPropsSchema   = z.object({ agentId: z.string().optional(), filter: z.object({ topicId: z.string().optional() }).optional() });
export const TasksPropsSchema    = z.object({ agentId: z.string().optional(), topicId: z.string().optional() });
export const ConfigPropsSchema   = z.object({ agentId: z.string().optional() });
export const ActivityPropsSchema = z.object({ agentId: z.string().optional(), topicId: z.string().optional() });
export const MemoryPropsSchema   = z.object({ agentId: z.string().optional(), limit: z.number().int().positive().max(200).optional() });


