/**
 * Agent Bridge - Phase 4 Implementation
 * Abstracts agent calls with mock responses (no live LLM calls)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DialogSimResponse {
  id: string;
  timestamp: Date;
  response: string;
  confidence: number;
  suggestions?: string[];
}

export interface PropSuggestion {
  path: string;
  value: any;
  reason: string;
  confidence: number;
}

export interface PropSuggestionsResponse {
  suggestions: Record<string, any>;
  explanations: PropSuggestion[];
  confidence: number;
}

export interface DialogInput {
  boardId: string;
  frameId?: string;
  prompt: string;
  context?: {
    boardName?: string;
    frameType?: string;
    currentProps?: any;
  };
}

export interface PropSuggestInput {
  frameType: string;
  currentProps: any;
  context?: {
    boardName?: string;
    boardDescription?: string;
    pattern?: string;
  };
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const MOCK_RESPONSES = {
  general: [
    "I can help you improve your board design. What specific aspect would you like to work on?",
    "Based on your board structure, I notice you might want to consider adding more interactive elements.",
    "Your board looks good! Would you like me to suggest some enhancements?",
    "I can help with layout optimization, content suggestions, or interaction patterns. What interests you most?"
  ],
  cover: [
    "For your cover frame, consider using a hero image that represents your board's purpose.",
    "A compelling title and subtitle can make your board more engaging. Would you like suggestions?",
    "Cover frames work best with high-contrast images and clear, concise messaging.",
    "Consider adding a call-to-action button to guide users into your board experience."
  ],
  settings: [
    "Your settings look well-organized. Consider enabling autosave for better user experience.",
    "The default engagement pattern affects how new frames behave. Dialogic works well for interactive boards.",
    "Grid settings can help with precise layout control. A 12-pixel grid is often ideal.",
    "Consider your board's visibility settings based on who needs access."
  ],
  dialogic: [
    "Dialogic frames work great for conversational interfaces and guided experiences.",
    "Consider adding placeholder text to help users understand what to ask.",
    "For better engagement, you might want to add suggested conversation starters.",
    "Dialogic patterns are perfect for AI-assisted workflows and user guidance."
  ],
  wizard: [
    "Wizard patterns excel at breaking complex processes into manageable steps.",
    "Consider adding progress indicators and clear next/previous navigation.",
    "Each step should have a clear objective and validation before proceeding.",
    "Wizards work best with 3-7 steps - beyond that, consider breaking into multiple wizards."
  ],
  gallery: [
    "Gallery patterns are perfect for showcasing multiple items or media.",
    "Consider adding filters or categories to help users navigate large collections.",
    "Masonry layout often works better than strict grids for varied content sizes.",
    "Don't forget to add alt text and captions for accessibility."
  ]
};

const PROP_SUGGESTIONS = {
  media_card: {
    title: ["Engaging Title", "Clear & Descriptive", "Action-Oriented"],
    subtitle: ["Brief explanation", "Context setting", "Value proposition"],
    media: {
      type: "image",
      suggestions: ["Use high-quality images", "Ensure good contrast", "Consider aspect ratio"]
    },
    cta: {
      label: ["Get Started", "Learn More", "Explore", "Continue"],
      action: "Consider what users should do next"
    }
  },
  config_panel: {
    sections: ["Organize settings logically", "Group related options", "Use clear labels"],
    validation: ["Add helpful error messages", "Provide examples", "Use appropriate input types"]
  },
  dialog: {
    placeholder: ["What would you like to know?", "Ask me anything...", "How can I help?"],
    maxMessages: [20, 50, 100],
    showHistory: true
  }
};

// =============================================================================
// AGENT BRIDGE IMPLEMENTATION
// =============================================================================

export class AgentBridge {
  private static instance: AgentBridge;
  private dialogHistory: Map<string, DialogSimResponse[]> = new Map();

  private constructor() {}

  public static getInstance(): AgentBridge {
    if (!AgentBridge.instance) {
      AgentBridge.instance = new AgentBridge();
    }
    return AgentBridge.instance;
  }

  /**
   * Simulate a dialog interaction
   */
  public async simulateDialog(input: DialogInput): Promise<DialogSimResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const { boardId, frameId, prompt, context } = input;
    const sessionKey = `${boardId}:${frameId || 'general'}`;

    // Get or create history for this session
    if (!this.dialogHistory.has(sessionKey)) {
      this.dialogHistory.set(sessionKey, []);
    }
    const history = this.dialogHistory.get(sessionKey)!;

    // Generate response based on context and prompt
    let response = this.generateResponse(prompt, context);
    const confidence = 0.7 + Math.random() * 0.3; // 70-100%

    // Add some contextual awareness
    if (prompt.toLowerCase().includes('help')) {
      response = "I'm here to help! " + response;
    }
    
    if (prompt.toLowerCase().includes('suggest') || prompt.toLowerCase().includes('improve')) {
      response += " Would you like me to suggest specific improvements?";
    }

    const dialogResponse: DialogSimResponse = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      response,
      confidence,
      suggestions: this.generateSuggestions(prompt, context)
    };

    // Store in history
    history.push(dialogResponse);

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    return dialogResponse;
  }

  /**
   * Suggest props for a frame type
   */
  public async suggestProps(input: PropSuggestInput): Promise<PropSuggestionsResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    const { frameType, currentProps, context } = input;
    
    // Get base suggestions for frame type
    const baseSuggestions = PROP_SUGGESTIONS[frameType as keyof typeof PROP_SUGGESTIONS] || {};
    
    // Generate contextual suggestions
    const suggestions: Record<string, any> = {};
    const explanations: PropSuggestion[] = [];

    // Title suggestions based on context
    if (!currentProps.title || currentProps.title.length < 3) {
      const titleSuggestions = baseSuggestions.title || ["Untitled"];
      suggestions.title = titleSuggestions[Math.floor(Math.random() * titleSuggestions.length)];
      explanations.push({
        path: 'title',
        value: suggestions.title,
        reason: 'A clear title helps users understand the purpose of this frame',
        confidence: 0.8
      });
    }

    // Pattern-specific suggestions
    if (context?.pattern === 'dialogic' && !currentProps.placeholder) {
      suggestions.placeholder = "What would you like to know?";
      explanations.push({
        path: 'placeholder',
        value: suggestions.placeholder,
        reason: 'Placeholder text guides users on how to interact',
        confidence: 0.9
      });
    }

    if (context?.pattern === 'wizard' && !currentProps.steps?.length) {
      suggestions.steps = [
        { id: 'step1', label: 'Getting Started', completed: false },
        { id: 'step2', label: 'Configuration', completed: false },
        { id: 'step3', label: 'Review', completed: false }
      ];
      explanations.push({
        path: 'steps',
        value: suggestions.steps,
        reason: 'Wizard patterns work best with 3-5 clear steps',
        confidence: 0.85
      });
    }

    // Media suggestions for media cards
    if (frameType === 'media_card' && !currentProps.media) {
      suggestions.media = {
        type: 'image',
        url: null,
        placeholder: 'Consider adding a compelling image'
      };
      explanations.push({
        path: 'media',
        value: suggestions.media,
        reason: 'Visual content increases engagement and comprehension',
        confidence: 0.75
      });
    }

    const confidence = explanations.length > 0 ? 
      explanations.reduce((sum, exp) => sum + exp.confidence, 0) / explanations.length : 
      0.5;

    return {
      suggestions,
      explanations,
      confidence
    };
  }

  /**
   * Get dialog history for a session
   */
  public getDialogHistory(boardId: string, frameId?: string): DialogSimResponse[] {
    const sessionKey = `${boardId}:${frameId || 'general'}`;
    return this.dialogHistory.get(sessionKey) || [];
  }

  /**
   * Clear dialog history
   */
  public clearDialogHistory(boardId: string, frameId?: string): void {
    const sessionKey = `${boardId}:${frameId || 'general'}`;
    this.dialogHistory.delete(sessionKey);
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private generateResponse(prompt: string, context?: any): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Context-aware responses
    if (context?.frameType === 'media_card' || lowerPrompt.includes('cover')) {
      return this.getRandomResponse(MOCK_RESPONSES.cover);
    }
    
    if (context?.frameType === 'config_panel' || lowerPrompt.includes('settings')) {
      return this.getRandomResponse(MOCK_RESPONSES.settings);
    }
    
    if (context?.pattern === 'dialogic' || lowerPrompt.includes('dialog')) {
      return this.getRandomResponse(MOCK_RESPONSES.dialogic);
    }
    
    if (context?.pattern === 'wizard' || lowerPrompt.includes('wizard') || lowerPrompt.includes('step')) {
      return this.getRandomResponse(MOCK_RESPONSES.wizard);
    }
    
    if (context?.pattern === 'gallery' || lowerPrompt.includes('gallery')) {
      return this.getRandomResponse(MOCK_RESPONSES.gallery);
    }
    
    // Default responses
    return this.getRandomResponse(MOCK_RESPONSES.general);
  }

  private generateSuggestions(prompt: string, context?: any): string[] {
    const suggestions: string[] = [];
    
    if (prompt.toLowerCase().includes('improve') || prompt.toLowerCase().includes('better')) {
      suggestions.push("Add more visual elements", "Improve text clarity", "Consider user flow");
    }
    
    if (prompt.toLowerCase().includes('color') || prompt.toLowerCase().includes('theme')) {
      suggestions.push("Try a complementary color scheme", "Ensure good contrast", "Consider brand colors");
    }
    
    if (prompt.toLowerCase().includes('layout')) {
      suggestions.push("Use consistent spacing", "Align elements properly", "Consider mobile layout");
    }
    
    return suggestions;
  }

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Convenience functions for direct use
export const agentBridge = AgentBridge.getInstance();

export async function simulateDialog(input: DialogInput): Promise<DialogSimResponse> {
  return agentBridge.simulateDialog(input);
}

export async function suggestProps(input: PropSuggestInput): Promise<PropSuggestionsResponse> {
  return agentBridge.suggestProps(input);
}

export function getDialogHistory(boardId: string, frameId?: string): DialogSimResponse[] {
  return agentBridge.getDialogHistory(boardId, frameId);
}

export function clearDialogHistory(boardId: string, frameId?: string): void {
  return agentBridge.clearDialogHistory(boardId, frameId);
}
