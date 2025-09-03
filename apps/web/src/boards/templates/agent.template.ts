/**
 * Agent Board Template - Phase 4 Implementation
 * Template for AI agent configuration and interaction boards
 */

import { z } from 'zod';

export const AgentTemplateSchema = z.object({
  id: z.literal('agent'),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  frames: z.array(z.object({
    name: z.string(),
    pattern: z.enum(['dialogic', 'wizard', 'focus', 'canvas', 'gallery', 'form']),
    frameType: z.string(),
    orderIndex: z.number(),
    props: z.record(z.any()).optional(),
    layoutKind: z.string().optional(),
    layoutData: z.record(z.any()).optional()
  }))
});

export type AgentTemplate = z.infer<typeof AgentTemplateSchema>;

export const agentTemplate: AgentTemplate = {
  id: 'agent',
  name: 'Agent Home Board',
  description: 'Agent-bound home board with conversation, preview, topics, draft, config',
  icon: '🤖',
  frames: [
    {
      name: 'Dialogic',
      pattern: 'dialogic',
      frameType: 'dialog',
      orderIndex: 2, // After Cover (0) and Settings (1)
      props: {
        title: 'Agent Conversation',
        placeholder: 'Ask your agent anything...',
        showHistory: true,
        maxMessages: 50,
        welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?'
      },
      layoutKind: 'canvas',
      layoutData: {}
    },
    {
      name: 'Agent Preview',
      pattern: 'focus',
      frameType: 'agent_preview',
      orderIndex: 3,
      props: {
        title: 'Agent Overview',
        showCapabilities: true,
        showStatus: true,
        showMetrics: true,
        capabilities: [
          'Answer questions about your content',
          'Provide suggestions and recommendations',
          'Help with board organization',
          'Assist with content creation'
        ],
        status: 'ready',
        avatar: null
      },
      layoutKind: 'focus',
      layoutData: {}
    },
    {
      name: 'Agent Settings',
      pattern: 'form',
      frameType: 'config_panel',
      orderIndex: 4,
      props: {
        title: 'Agent Configuration',
        sections: [
          {
            title: 'Personality',
            fields: [
              { name: 'voice', label: 'Voice & Tone', type: 'select', options: ['Professional', 'Friendly', 'Technical', 'Creative'] },
              { name: 'expertise', label: 'Expertise Areas', type: 'multiselect' },
              { name: 'responseStyle', label: 'Response Style', type: 'select', options: ['Concise', 'Detailed', 'Conversational'] }
            ]
          },
          {
            title: 'Behavior',
            fields: [
              { name: 'proactive', label: 'Proactive Suggestions', type: 'switch' },
              { name: 'contextAware', label: 'Context Awareness', type: 'switch' },
              { name: 'learningMode', label: 'Continuous Learning', type: 'switch' }
            ]
          }
        ]
      },
      layoutKind: 'form',
      layoutData: {}
    }
  ]
};

export default agentTemplate;
