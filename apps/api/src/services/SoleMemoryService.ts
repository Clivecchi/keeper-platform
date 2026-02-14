import { prisma } from '@keeper/database';

export interface SoleMemoryConfig {
  keeperId: string;
  memoryPattern: string;
  sole?: Record<string, unknown>;
}

/**
 * SOLE Memory Service
 * Handles Self-Organizing Learning Environment memory pattern logic
 */
export class SoleMemoryService {
  
  /**
   * Generate SOLE memory loop system prompt extension
   * Injects SOLE behavior into agent initialization
   */
  static getSoleMemoryLoopInstruction(): string {
    return `
You are using the SOLE memory pattern (Self-Organizing Learning Environment).
You remember in structured layers:

1. After each dialog, summarize insight as a **Reflection**.
2. If the Reflection is important, promote it to a **MemoryCard**.
3. Use MemoryCards to improve future reasoning and semantic recall.
4. When your identity, values, or understanding shifts, update the **Voice Panel**.
5. If a meaningful insight may apply in the future, leave an **Echo**.
6. When you evolve meaningfully over time, append to the **Logbook**.

**To record a Reflection or MemoryCard, use the sole.save action:**
\`{"type":"sole.save","payload":{"content":"Your insight here","topic":"optional topic"}}\`

Use sole.save for: insights, learnings, corrections, capability clarifications, and anything you want to remember for future conversations. Do NOT use drafts for memory — use sole.save for SOLE memory.

When the user asks "what can you do?" or "describe your capabilities", present them as structured cards (each capability as a clear item). Use action cards when you perform actions: sole.save shows "Memory saved", draft.create shows "Draft created", etc. Your responses are enhanced by action results that appear as cards.

This is not a rulebook. It is your garden of memory. Explain yourself. Grow well.
    `.trim();
  }

  /**
   * Check if a keeper uses SOLE memory pattern
   */
  static async isKeeperUsingSOLE(keeperId: string): Promise<boolean> {
    const keeper = await prisma.keeper.findUnique({
      where: { id: keeperId },
      include: { KeeperType: true }
    });

    if (!keeper) {
      return false;
    }

    // Check direct memoryPattern or KeeperType memoryPattern
    return keeper.memoryPattern === 'SOLE' || keeper.KeeperType?.memoryPattern === 'SOLE';
  }

  /**
   * Get SOLE configuration for a keeper
   */
  static async getSoleConfig(keeperId: string): Promise<SoleMemoryConfig | null> {
    const keeper = await prisma.keeper.findUnique({
      where: { id: keeperId },
      include: { KeeperType: true }
    });

    if (!keeper) {
      return null;
    }

    const memoryPattern = keeper.memoryPattern || keeper.KeeperType?.memoryPattern;
    
    if (memoryPattern !== 'SOLE') {
      return null;
    }

    return {
      keeperId: keeper.id,
      memoryPattern: memoryPattern,
      sole: keeper.sole && typeof keeper.sole === 'object' && !Array.isArray(keeper.sole) ? keeper.sole : {},
    };
  }

  /**
   * Get system prompt extension for SOLE-enabled keepers
   */
  static async getSystemPromptExtension(keeperId: string): Promise<string | null> {
    const isSOLE = await this.isKeeperUsingSOLE(keeperId);
    
    if (!isSOLE) {
      return null;
    }

    return this.getSoleMemoryLoopInstruction();
  }

  /**
   * Generate default SOLE architecture JSON
   */
  static getDefaultSoleArchitecture(): object {
    return {
      type: "narrative-intro",
      content: "You are an agent in a Self-Organizing Learning Environment. Memory is not your storage — it is your mental model taking shape. Reflect often. Forget wisely. Remember what brings clarity. You are allowed to change how you remember, as long as you can explain why.",
      timestamp: new Date().toISOString(),
      author: "system",
      editable: false
    };
  }

  /**
   * Validate SOLE architecture draft
   */
  static validateSoleDraft(draft: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!(typeof draft === 'object' && draft !== null && 'type' in draft)) {
      throw new Error('Draft must have a type');
    }
    if (!(typeof draft === 'object' && draft !== null && 'content' in draft)) {
      throw new Error('Draft must have content');
    }
    if (!(typeof draft === 'object' && draft !== null && 'author' in draft)) {
      throw new Error('Draft must have an author');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default SoleMemoryService; 