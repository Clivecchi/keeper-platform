import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const UpdateMemoryCardSchema = z.object({
  content: z.string().min(1).optional(),
  topic: z.string().optional()
});

// Get all memory cards for a keeper
export const getMemoryCardsByKeeper = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;
    const { topic, embedded } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    // Build where clause with optional filters
    const whereClause: any = {
      keeperId: keeperId
    };

    if (topic) {
      whereClause.topic = topic;
    }

    if (embedded !== undefined) {
      whereClause.embedded = embedded === 'true';
    }

    const memoryCards = await prisma.soleMemoryCard.findMany({
      where: whereClause,
      include: {
        reflection: {
          select: {
            id: true,
            agentId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: memoryCards
    });
  } catch (error) {
        console.error('Error fetching memory cards:', error);
    return res.status(500).json({
      error: 'Failed to fetch memory cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get memory cards grouped by topic
export const getMemoryCardsByTopic = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    const memoryCards = await prisma.soleMemoryCard.findMany({
      where: {
        keeperId: keeperId
      },
      include: {
        reflection: {
          select: {
            id: true,
            agentId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group by topic
    const groupedByTopic = memoryCards.reduce((acc, card) => {
      const topic = card.topic || 'Uncategorized';
      if (!acc[topic]) {
        acc[topic] = [];
      }
      acc[topic].push(card);
      return acc;
    }, {} as Record<string, typeof memoryCards>);

    res.json({
      success: true,
      data: groupedByTopic
    });
  } catch (error) {
        console.error('Error fetching memory cards by topic:', error);
    return res.status(500).json({
      error: 'Failed to fetch memory cards by topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get embedding status summary
export const getEmbeddingStatus = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    const stats = await prisma.soleMemoryCard.groupBy({
      by: ['embedded'],
      where: {
        keeperId: keeperId
      },
      _count: {
        id: true
      }
    });

    const result = {
      total: 0,
      embedded: 0,
      pending: 0
    };

    stats.forEach(stat => {
      const count = stat._count.id;
      result.total += count;
      if (stat.embedded) {
        result.embedded += count;
      } else {
        result.pending += count;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching embedding status:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch embedding status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a memory card
export const updateMemoryCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateMemoryCardSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if memory card exists and belongs to user's keeper
    const memoryCard = await prisma.soleMemoryCard.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!memoryCard) {
      return res.status(404).json({ error: 'Memory card not found' });
    }

    // If content is being updated, mark as needing re-embedding
    const updateData: any = { ...validatedData };
    if (validatedData.content && validatedData.content !== memoryCard.content) {
      updateData.embedded = false;
      updateData.embedding = null;
    }

    const updatedMemoryCard = await prisma.soleMemoryCard.update({
      where: { id: id },
      data: updateData,
      include: {
        reflection: {
          select: {
            id: true,
            agentId: true,
            createdAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedMemoryCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
        console.error('Error updating memory card:', error);
    return res.status(500).json({
      error: 'Failed to update memory card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a memory card
export const deleteMemoryCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if memory card exists and belongs to user's keeper
    const memoryCard = await prisma.soleMemoryCard.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!memoryCard) {
      return res.status(404).json({ error: 'Memory card not found' });
    }

    await prisma.soleMemoryCard.delete({
      where: { id: id }
    });

    res.json({
      success: true,
      message: 'Memory card deleted successfully'
    });
  } catch (error) {
        console.error('Error deleting memory card:', error);
    return res.status(500).json({
      error: 'Failed to delete memory card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Generate embeddings for pending memory cards
export const generateEmbeddings = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    // Get pending memory cards
    const pendingCards = await prisma.soleMemoryCard.findMany({
      where: {
        keeperId: keeperId,
        embedded: false
      },
      take: 10 // Process in batches
    });

    // Mock embedding generation for now
    // In a real implementation, this would call OpenAI embeddings API
    const updatedCards = [];

    for (const card of pendingCards) {
      // Generate a mock embedding (in production, use actual embedding service)
      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      
      const updated = await prisma.soleMemoryCard.update({
        where: { id: card.id },
        data: {
          embedding: JSON.stringify(mockEmbedding),
          embedded: true
        }
      });
      
      updatedCards.push(updated);
    }

    res.json({
      success: true,
      data: updatedCards,
      message: `Generated embeddings for ${updatedCards.length} memory cards`
    });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return res.status(500).json({ 
      error: 'Failed to generate embeddings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search memory cards by semantic similarity (placeholder for now)
export const searchMemoryCards = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId, query } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    // For now, do a simple text search
    // In production, this would use vector similarity search
    const searchResults = await prisma.soleMemoryCard.findMany({
      where: {
        keeperId: keeperId,
        OR: [
          {
            content: {
              contains: query as string,
              mode: 'insensitive'
            }
          },
          {
            topic: {
              contains: query as string,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        reflection: {
          select: {
            id: true,
            agentId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json({
      success: true,
      data: searchResults,
      query: query
    });
  } catch (error) {
        console.error('Error searching memory cards:', error);
    return res.status(500).json({
      error: 'Failed to search memory cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 