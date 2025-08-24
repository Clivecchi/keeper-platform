import { Request, Response } from 'express';
import { prisma } from '@keeper/database';
import { z } from 'zod';

// Validation schemas
const CreateEchoSchema = z.object({
  keeperId: z.string().min(1, 'Keeper ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  message: z.string().min(1, 'Message is required'),
  triggerDate: z.string().datetime().optional(),
  triggerConditions: z.record(z.any()).optional()
});

const UpdateEchoSchema = z.object({
  message: z.string().min(1).optional(),
  triggerDate: z.string().datetime().optional(),
  triggerConditions: z.record(z.any()).optional(),
  delivered: z.boolean().optional()
});

// Get all echoes for a keeper
export const getEchoesByKeeper = async (req: Request, res: Response) => {
  try {
    const { keeperId } = req.params;
    const { userId } = req.query;
    const { status } = req.query; // 'pending', 'delivered', or undefined for all

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

    // Build where clause with optional status filter
    const whereClause: Record<string, unknown> = {
      keeperId: keeperId
    };

    if (status === 'pending') {
      whereClause.delivered = false;
    } else if (status === 'delivered') {
      whereClause.delivered = true;
    }

    const echoes = await prisma.soleEcho.findMany({
      where: whereClause,
      orderBy: [
        { delivered: 'asc' }, // Pending first
        { triggerDate: 'asc' }, // Then by trigger date
        { createdAt: 'desc' } // Then by creation date
      ]
    });

    return res.json({
      success: true,
      data: echoes
    });
  } catch (error) {
    console.error('Error fetching echoes:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch echoes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get echoes ready to be triggered
export const getTriggeredEchoes = async (req: Request, res: Response) => {
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

    // Get echoes that should be triggered (past trigger date and not delivered)
    const now = new Date();
    
    const triggeredEchoes = await prisma.soleEcho.findMany({
      where: {
        keeperId: keeperId,
        delivered: false,
        triggerDate: {
          lte: now
        }
      },
      orderBy: {
        triggerDate: 'asc'
      }
    });

    return res.json({
      success: true,
      data: triggeredEchoes
    });
  } catch (error) {
    console.error('Error fetching triggered echoes:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch triggered echoes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new echo
export const createEcho = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateEchoSchema.parse(req.body);
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

    // Convert triggerDate string to Date if provided and prepare data with nested relations
    const echoData = {
      keeper: { connect: { id: validatedData.keeperId } },
      agent: { connect: { id: validatedData.agentId } },
      message: validatedData.message,
      triggerDate: validatedData.triggerDate ? new Date(validatedData.triggerDate) : null,
      ...(validatedData.triggerConditions && { triggerConditions: validatedData.triggerConditions })
    };

    const echo = await prisma.soleEcho.create({
      data: echoData
    });

    return res.status(201).json({
      success: true,
      data: echo
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error creating echo:', error);
    return res.status(500).json({ 
      error: 'Failed to create echo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update an echo
export const updateEcho = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateEchoSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if echo exists and belongs to user's keeper
    const echo = await prisma.soleEcho.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!echo) {
      return res.status(404).json({ error: 'Echo not found' });
    }

    // Convert triggerDate string to Date if provided
    const updateData = {
      ...validatedData,
      triggerDate: validatedData.triggerDate ? new Date(validatedData.triggerDate) : undefined
    };

    const updatedEcho = await prisma.soleEcho.update({
      where: { id: id },
      data: updateData
    });

    return res.json({
      success: true,
      data: updatedEcho
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error updating echo:', error);
    return res.status(500).json({ 
      error: 'Failed to update echo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Mark an echo as delivered
export const deliverEcho = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if echo exists and belongs to user's keeper
    const echo = await prisma.soleEcho.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!echo) {
      return res.status(404).json({ error: 'Echo not found' });
    }

    if (echo.delivered) {
      return res.status(400).json({ error: 'Echo has already been delivered' });
    }

    const updatedEcho = await prisma.soleEcho.update({
      where: { id: id },
      data: {
        delivered: true
      }
    });

    return res.json({
      success: true,
      data: updatedEcho,
      message: 'Echo marked as delivered'
    });
  } catch (error) {
    console.error('Error delivering echo:', error);
    return res.status(500).json({ 
      error: 'Failed to deliver echo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete an echo
export const deleteEcho = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if echo exists and belongs to user's keeper
    const echo = await prisma.soleEcho.findFirst({
      where: {
        id: id,
        keeper: {
          ownerId: userId as string
        }
      }
    });

    if (!echo) {
      return res.status(404).json({ error: 'Echo not found' });
    }

    await prisma.soleEcho.delete({
      where: { id: id }
    });

    return res.json({
      success: true,
      message: 'Echo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting echo:', error);
    return res.status(500).json({ 
      error: 'Failed to delete echo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 