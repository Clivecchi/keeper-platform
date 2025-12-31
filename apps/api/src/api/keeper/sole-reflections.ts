import { Request, Response } from 'express';
import { prisma, Prisma } from '@keeper/database';
import { z } from 'zod';

// Validation schemas
const CreateReflectionSchema = z.object({
  keeperId: z.string().min(1, 'Keeper ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  content: z.string().min(1, 'Content is required'),
  topic: z.string().optional()
});

const UpdateReflectionSchema = z.object({
  content: z.string().min(1).optional(),
  topic: z.string().optional()
});

// Get all reflections for a keeper
export const getReflectionsByKeeper = async (req: Request, res: Response) => {
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

    const reflections = await prisma.soleReflection.findMany({
      where: {
        keeperId: keeperId
      },
      include: {
        SoleMemoryCard: {
          select: {
            id: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: reflections
    });
  } catch (error) {
        console.error('Error fetching reflections:', error);
    return res.status(500).json({
      error: 'Failed to fetch reflections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get suggested reflections for promotion to memory cards
export const getSuggestedPromotions = async (req: Request, res: Response) => {
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

    // Get unpromoted reflections that are older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const suggestions = await prisma.soleReflection.findMany({
      where: {
        keeperId: keeperId,
        promotedToMemoryCard: false,
        createdAt: {
          lt: oneDayAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limit suggestions
    });

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error fetching suggested promotions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch suggested promotions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new reflection
export const createReflection = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateReflectionSchema.parse(req.body);
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: validatedData.keeperId,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    const reflection = await prisma.soleReflection.create({
      data: {
        Keeper: { connect: { id: validatedData.keeperId } },
        agentId: validatedData.agentId,
        content: validatedData.content,
        ...(validatedData.topic && { topic: validatedData.topic })
      },
      include: {
        SoleMemoryCard: true
      }
    });

    return res.status(201).json({
      success: true,
      data: reflection
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
        console.error('Error creating reflection:', error);
    return res.status(500).json({
      error: 'Failed to create reflection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a reflection
export const updateReflection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateReflectionSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if reflection exists and belongs to user's keeper
    const reflection = await prisma.soleReflection.findFirst({
      where: {
        id: id,
        Keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!reflection) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    const updatedReflection = await prisma.soleReflection.update({
      where: { id: id },
      data: validatedData,
      include: {
        SoleMemoryCard: true
      }
    });

    return res.json({
      success: true,
      data: updatedReflection
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
        console.error('Error updating reflection:', error);
    return res.status(500).json({
      error: 'Failed to update reflection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a reflection
export const deleteReflection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if reflection exists and belongs to user's keeper
    const reflection = await prisma.soleReflection.findFirst({
      where: {
        id: id,
        Keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!reflection) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    // Check if reflection has been promoted to memory cards
    const memoryCardCount = await prisma.soleMemoryCard.count({
      where: {
        reflectionId: id
      }
    });

    if (memoryCardCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete reflection that has been promoted to memory cards' 
      });
    }

    await prisma.soleReflection.delete({
      where: { id: id }
    });

    return res.json({
      success: true,
      message: 'Reflection deleted successfully'
    });
  } catch (error) {
        console.error('Error deleting reflection:', error);
    return res.status(500).json({
      error: 'Failed to delete reflection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Promote a reflection to a memory card
export const promoteReflectionToMemoryCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if reflection exists and belongs to user's keeper
    const reflection = await prisma.soleReflection.findFirst({
      where: {
        id: id,
        Keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!reflection) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    if (reflection.promotedToMemoryCard) {
      return res.status(400).json({ error: 'Reflection has already been promoted' });
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mark reflection as promoted
      const updatedReflection = await tx.soleReflection.update({
        where: { id: id },
        data: {
          promotedToMemoryCard: true,
          promotedAt: new Date()
        }
      });

      // Create memory card
      const memoryCard = await tx.soleMemoryCard.create({
        data: {
          keeperId: reflection.keeperId,
          reflectionId: id,
          content: reflection.content,
          topic: reflection.topic,
          embedded: false // Will be processed later
        }
      });

      return { reflection: updatedReflection, memoryCard };
    });

    return res.json({
      success: true,
      data: result,
      message: 'Reflection promoted to memory card successfully'
    });
  } catch (error) {
        console.error('Error promoting reflection:', error);
    return res.status(500).json({
      error: 'Failed to promote reflection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 