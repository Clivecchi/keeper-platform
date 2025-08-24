import { Request, Response } from 'express';
import { prisma } from '@keeper/database';
import { z } from 'zod';

// Validation schemas
const CreateLogbookEntrySchema = z.object({
  keeperId: z.string().min(1, 'Keeper ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  entry: z.string().min(1, 'Entry content is required'),
  label: z.string().min(1, 'Label is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([])
});

const UpdateLogbookEntrySchema = z.object({
  entry: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional()
});

// Get all logbook entries for a keeper
export const getLogbookEntriesByKeeper = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;
    const { category, tag } = req.query; // Optional filters

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
    const whereClause: Record<string, unknown> = {
      keeperId: keeperId
    };

    if (category) {
      whereClause.category = category;
    }

    if (tag) {
      whereClause.tags = {
        has: tag
      };
    }

    const logbookEntries = await prisma.soleLogbookEntry.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: logbookEntries
    });
  } catch (error) {
        console.error('Error fetching logbook entries:', error);
    return res.status(500).json({
      error: 'Failed to fetch logbook entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get unique categories for a keeper
export const getCategoriesByKeeper = async (req: Request, res: Response) => {
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

    const categories = await prisma.soleLogbookEntry.findMany({
      where: {
        keeperId: keeperId
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    return res.json({
      success: true,
      data: categories.map((c: { category: string }) => c.category)
    });
  } catch (error) {
        console.error('Error fetching categories:', error);
    return res.status(500).json({
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all unique tags for a keeper
export const getTagsByKeeper = async (req: Request, res: Response) => {
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

    const entries = await prisma.soleLogbookEntry.findMany({
      where: {
        keeperId: keeperId
      },
      select: {
        tags: true
      }
    });

    // Flatten and deduplicate tags
    const allTags = entries.flatMap((entry: { tags: string[] }) => entry.tags);
    const uniqueTags = Array.from(new Set(allTags));

    return res.json({
      success: true,
      data: uniqueTags
    });
  } catch (error) {
        console.error('Error fetching tags:', error);
    return res.status(500).json({
      error: 'Failed to fetch tags',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new logbook entry
export const createLogbookEntry = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateLogbookEntrySchema.parse(req.body);
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

    const logbookEntry = await prisma.soleLogbookEntry.create({
      data: {
        keeper: { connect: { id: validatedData.keeperId } },
        agentId: validatedData.agentId,
        entry: validatedData.entry,
        label: validatedData.label,
        category: validatedData.category,
        tags: validatedData.tags
      }
    });

    return res.status(201).json({
      success: true,
      data: logbookEntry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
        console.error('Error creating logbook entry:', error);
    return res.status(500).json({
      error: 'Failed to create logbook entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a logbook entry
export const updateLogbookEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateLogbookEntrySchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if logbook entry exists and belongs to user's keeper
    const logbookEntry = await prisma.soleLogbookEntry.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!logbookEntry) {
      return res.status(404).json({ error: 'Logbook entry not found' });
    }

    const updatedLogbookEntry = await prisma.soleLogbookEntry.update({
      where: { id: id },
      data: validatedData
    });

    return res.json({
      success: true,
      data: updatedLogbookEntry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
        console.error('Error updating logbook entry:', error);
    return res.status(500).json({
      error: 'Failed to update logbook entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a logbook entry
export const deleteLogbookEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if logbook entry exists and belongs to user's keeper
    const logbookEntry = await prisma.soleLogbookEntry.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!logbookEntry) {
      return res.status(404).json({ error: 'Logbook entry not found' });
    }

    await prisma.soleLogbookEntry.delete({
      where: { id: id }
    });

    return res.json({
      success: true,
      message: 'Logbook entry deleted successfully'
    });
  } catch (error) {
        console.error('Error deleting logbook entry:', error);
    return res.status(500).json({
      error: 'Failed to delete logbook entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 