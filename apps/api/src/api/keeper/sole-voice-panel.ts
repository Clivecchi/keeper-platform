import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const CreateVoiceEntrySchema = z.object({
  keeperId: z.string().min(1, 'Keeper ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  label: z.string().min(1, 'Label is required'),
  belief: z.string().min(1, 'Belief content is required')
});

const UpdateVoiceEntrySchema = z.object({
  label: z.string().min(1).optional(),
  belief: z.string().min(1).optional()
});

// Get all voice entries for a keeper
export const getVoiceEntriesByKeeper = async (req: Request, res: Response) => {
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

    const voiceEntries = await prisma.soleVoiceEntry.findMany({
      where: {
        keeperId: keeperId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: voiceEntries
    });
  } catch (error) {
    console.error('Error fetching voice entries:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch voice entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new voice entry
export const createVoiceEntry = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateVoiceEntrySchema.parse(req.body);
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

    const voiceEntry = await prisma.soleVoiceEntry.create({
      data: validatedData
    });

    return res.status(201).json({
      success: true,
      data: voiceEntry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error creating voice entry:', error);
    return res.status(500).json({ 
      error: 'Failed to create voice entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a voice entry
export const updateVoiceEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateVoiceEntrySchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if voice entry exists and belongs to user's keeper
    const voiceEntry = await prisma.soleVoiceEntry.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!voiceEntry) {
      return res.status(404).json({ error: 'Voice entry not found' });
    }

    const updatedVoiceEntry = await prisma.soleVoiceEntry.update({
      where: { id: id },
      data: validatedData
    });

    return res.json({
      success: true,
      data: updatedVoiceEntry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error updating voice entry:', error);
    return res.status(500).json({ 
      error: 'Failed to update voice entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a voice entry
export const deleteVoiceEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if voice entry exists and belongs to user's keeper
    const voiceEntry = await prisma.soleVoiceEntry.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!voiceEntry) {
      return res.status(404).json({ error: 'Voice entry not found' });
    }

    await prisma.soleVoiceEntry.delete({
      where: { id: id }
    });

    return res.json({
      success: true,
      message: 'Voice entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting voice entry:', error);
    return res.status(500).json({ 
      error: 'Failed to delete voice entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 