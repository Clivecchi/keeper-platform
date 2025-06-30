import { AgentInfo } from '../types/kip';

export const agentRegistry: AgentInfo[] = [
  {
    id: 'type-agent',
    name: 'TypeAgent',
    purpose: 'Extracts structured data and intent from natural language inputs',
    status: 'ready',
    model: 'claude-3.5-sonnet'
  },
  {
    id: 'keeper-agent',
    name: 'KeeperAgent',
    purpose: 'Manages personal data capture and organization within the platform',
    status: 'ready',
    model: 'claude-3.5-sonnet'
  },
  {
    id: 'orchestration-agent',
    name: 'OrchestrationAgent',
    purpose: 'Coordinates multi-agent workflows and task delegation',
    status: 'ready',
    model: 'gpt-4'
  },
  {
    id: 'analysis-agent',
    name: 'AnalysisAgent',
    purpose: 'Provides insights and patterns from captured keeper data',
    status: 'in-progress',
    model: 'claude-3.5-sonnet'
  }
];

// Mock TypeAgent extraction function
export class TypeAgent {
  static extract(input: string): Promise<any> {
    // Simulate API call delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          action: 'capture_thought',
          keeper_id: 'user_12345',
          type: 'reflection',
          data: {
            content: input,
            extracted_entities: ['thought', 'reflection'],
            sentiment: 'neutral',
            category: 'personal',
            confidence: 0.85
          }
        });
      }, 1000);
    });
  }
} 