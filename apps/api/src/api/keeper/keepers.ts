import { Request, Response } from 'express';
import { prisma } from '@keeper/database';
import { z } from 'zod';
import SoleMemoryService from '../../services/SoleMemoryService.js';

// Validation schemas
const CreateKeeperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  keeperTypeId: z.string().optional(),
  keeperType: z.string().optional(),
  memoryPattern: z.string().optional(),
  theme_id: z.string().uuid().optional(),
  ownerId: z.string().min(1, 'Owner ID is required')
});

const UpdateKeeperSchema = z.object({
  title: z.string().min(1).optional(),
  purpose: z.string().min(1).optional(),
  keeperTypeId: z.string().optional(),
  keeperType: z.string().optional(),
  memoryPattern: z.string().optional(),
  theme_id: z.string().uuid().optional()
});

const CreateKeeperTypeSchema = z.object({
  name: z.string().min(1, 'Name is required')
});

// Get all keepers for a user
export const getAllKeepers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const keepers = await prisma.keeper.findMany({
      where: {
        ownerId: userId as string
      },
      include: {
        KeeperType: true,
        themes: true,
        engagement_templates: true,
        _count: {
          select: {
            Journey: true,
            Path: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: keepers
    });
  } catch (error) {
    console.error('Error fetching keepers:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch keepers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get a specific keeper by ID
export const getKeeperById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const keeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      },
      include: {
        KeeperType: true,
        themes: true,
        engagement_templates: {
          include: {
            engagement_fields: true,
            engagement_styles: true
          }
        },
        Journey: {
          include: {
            Path: true,
            Moment: true
          }
        },
        _count: {
          select: {
            Journey: true,
            Path: true
          }
        }
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    return res.json({
      success: true,
      data: keeper
    });
  } catch (error) {
    console.error('Error fetching keeper:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch keeper',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new keeper
export const createKeeper = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateKeeperSchema.parse(req.body);
    
    // Check if this keeper should use SOLE memory pattern
    let shouldUseSole = false;
    let keeperTypeMemoryPattern = null;
    
    // Check if keeper has direct memoryPattern set to SOLE
    if (validatedData.memoryPattern === 'SOLE') {
      shouldUseSole = true;
    }
    
    // Check if keeperTypeId is provided and has SOLE memory pattern
    if (validatedData.keeperTypeId && !shouldUseSole) {
      const keeperType = await prisma.keeperType.findUnique({
        where: { id: validatedData.keeperTypeId }
      });
      
      if (keeperType?.memoryPattern === 'SOLE') {
        shouldUseSole = true;
        keeperTypeMemoryPattern = 'SOLE';
      }
    }
    
    // Prepare keeper data
    const keeperData: Record<string, unknown> = {
      id: `keeper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...validatedData
    };
    
    // If using SOLE pattern, add default sole structure
    if (shouldUseSole) {
      keeperData.sole = {
        type: "narrative-intro",
        content: "You are an agent in a Self-Organizing Learning Environment. Memory is not your storage — it is your mental model taking shape. Reflect often. Forget wisely. Remember what brings clarity. You are allowed to change how you remember, as long as you can explain why.",
        timestamp: new Date().toISOString(),
        author: "system",
        editable: false
      };
      
      // Set memoryPattern if not already set
      if (!keeperData.memoryPattern) {
        keeperData.memoryPattern = keeperTypeMemoryPattern || 'SOLE';
      }
    }
    
    const keeper = await prisma.keeper.create({
      data: {
        id: keeperData.id as string,
        title: keeperData.title as string,
        purpose: keeperData.purpose as string,
        ownerId: keeperData.ownerId as string,
        domainId: keeperData.domainId as string,
        keeperType: keeperData.keeperType as string,
        memoryPattern: keeperData.memoryPattern as string,
        sole: keeperData.sole as any,
        soleDraft: keeperData.soleDraft as any,
        soleSubmittedAt: keeperData.soleSubmittedAt ? new Date(keeperData.soleSubmittedAt as string) : undefined,
        theme_id: keeperData.theme_id as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: keeper
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error creating keeper:', error);
    return res.status(500).json({ 
      error: 'Failed to create keeper',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a keeper
export const updateKeeper = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = UpdateKeeperSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const existingKeeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      }
    });

    if (!existingKeeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    const keeper = await prisma.keeper.update({
      where: { id: id },
      data: validatedData,
      include: {
        KeeperType: true,
        themes: true,
        engagement_templates: true
      }
    });

    return res.json({
      success: true,
      data: keeper
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error updating keeper:', error);
    return res.status(500).json({ 
      error: 'Failed to update keeper',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a keeper
export const deleteKeeper = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const existingKeeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      }
    });

    if (!existingKeeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    await prisma.keeper.delete({
      where: { id: id }
    });

    return res.json({
      success: true,
      message: 'Keeper deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting keeper:', error);
    return res.status(500).json({ 
      error: 'Failed to delete keeper',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all keeper types
export const getKeeperTypes = async (req: Request, res: Response) => {
  try {
    const keeperTypes = await prisma.keeperType.findMany({
      include: {
        _count: {
          select: {
            Keeper: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json({
      success: true,
      data: keeperTypes
    });
  } catch (error) {
    console.error('Error fetching keeper types:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch keeper types',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new keeper type
export const createKeeperType = async (req: Request, res: Response) => {
  try {
    const validatedData = CreateKeeperTypeSchema.parse(req.body);
    
    const keeperType = await prisma.keeperType.create({
      data: {
        id: `keeper_type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: validatedData.name
      }
    });

    return res.status(201).json({
      success: true,
      data: keeperType
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error creating keeper type:', error);
    return res.status(500).json({ 
      error: 'Failed to create keeper type',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get engagement templates for a keeper type
export const getEngagementTemplatesByType = async (req: Request, res: Response) => {
  try {
    const { keeperType } = req.params;
    
    const templates = await prisma.engagement_templates.findMany({
      where: {
        type: keeperType
      },
      include: {
        engagement_fields: true,
        engagement_styles: true,
        Keeper: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching engagement templates:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch engagement templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get engagement templates linked to a specific KeeperType
export const getEngagementTemplatesByKeeperType = async (req: Request, res: Response) => {
  try {
    const { keeperTypeId } = req.params;
    
    const templates = await prisma.engagement_templates.findMany({
      where: {
        keeper_type_engagement_templates: {
          some: {
            keeper_type_id: keeperTypeId
          }
        }
      },
      include: {
        engagement_fields: true,
        engagement_styles: true,
        keeper_type_engagement_templates: {
          include: {
            KeeperType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching engagement templates by keeper type:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch engagement templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Assign engagement template to keeper
export const assignEngagementTemplate = async (req: Request, res: Response) => {
  try {
    const { keeperId, templateId } = req.params;
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

    // Check if template exists
    const template = await prisma.engagement_templates.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Engagement template not found' });
    }

    // Update the template to associate with the keeper
    await prisma.engagement_templates.update({
      where: { id: templateId },
      data: {
        keeperId: keeperId
      }
    });

    return res.json({
      success: true,
      message: 'Engagement template assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning engagement template:', error);
    return res.status(500).json({ 
      error: 'Failed to assign engagement template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// SOLE Memory Pattern Endpoints

// Validation schema for SOLE draft
const ProposeSoleDraftSchema = z.object({
  soleDraft: z.object({
    type: z.string().min(1, 'Type is required'),
    content: z.string().min(1, 'Content is required'),
    author: z.string().min(1, 'Author is required'),
    timestamp: z.string().optional(),
    editable: z.boolean().optional()
  }).passthrough() // Allow additional fields
});

// POST /api/keeper/:id/sole/propose
export const proposeSoleDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const validatedData = ProposeSoleDraftSchema.parse(req.body);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    // Check if keeper uses SOLE memory pattern
    const isSOLE = await SoleMemoryService.isKeeperUsingSOLE(id);
    if (!isSOLE) {
      return res.status(400).json({ error: 'Keeper does not use SOLE memory pattern' });
    }

    // Validate the draft
    const validation = SoleMemoryService.validateSoleDraft(validatedData.soleDraft);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid SOLE draft',
        details: validation.errors
      });
    }

    // Add timestamp if not provided
    const draftWithTimestamp = {
      ...validatedData.soleDraft,
      timestamp: validatedData.soleDraft.timestamp || new Date().toISOString()
    };

    // Update keeper with new draft
    const updatedKeeper = await prisma.keeper.update({
      where: { id: id },
      data: {
        soleDraft: draftWithTimestamp,
        soleSubmittedAt: new Date()
      },
      include: {
        KeeperType: true
      }
    });

    return res.json({
      success: true,
      data: updatedKeeper,
      message: 'SOLE draft proposed successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (error as any).errors
      });
    }
    
    console.error('Error proposing SOLE draft:', error);
    return res.status(500).json({ 
      error: 'Failed to propose SOLE draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/keeper/:id/sole/approve
export const approveSoleDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    if (!keeper.soleDraft) {
      return res.status(400).json({ error: 'No SOLE draft to approve' });
    }

    // Move soleDraft to sole and clear draft fields
    const updatedKeeper = await prisma.keeper.update({
      where: { id: id },
      data: {
        sole: keeper.soleDraft,
        soleDraft: undefined,
        soleSubmittedAt: null
      },
      include: {
        KeeperType: true
      }
    });

    return res.json({
      success: true,
      data: updatedKeeper,
      message: 'SOLE draft approved successfully'
    });
  } catch (error) {
    console.error('Error approving SOLE draft:', error);
    return res.status(500).json({ 
      error: 'Failed to approve SOLE draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/keeper/:id/sole/reject
export const rejectSoleDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if keeper exists and belongs to user
    const keeper = await prisma.keeper.findFirst({
      where: {
        id: id,
        ownerId: userId as string
      }
    });

    if (!keeper) {
      return res.status(404).json({ error: 'Keeper not found' });
    }

    if (!keeper.soleDraft) {
      return res.status(400).json({ error: 'No SOLE draft to reject' });
    }

    // Clear draft fields
    const updatedKeeper = await prisma.keeper.update({
      where: { id: id },
      data: {
        soleDraft: undefined,
        soleSubmittedAt: null
      },
      include: {
        KeeperType: true
      }
    });

    return res.json({
      success: true,
      data: updatedKeeper,
      message: 'SOLE draft rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting SOLE draft:', error);
    return res.status(500).json({ 
      error: 'Failed to reject SOLE draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Agent ↔ KeeperType Assignment Endpoints

// Get assigned keeper types for an agent
export const getAgentKeeperTypes = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const assignments = await prisma.kip_agent_keeper_types.findMany({
      where: {
        agent_id: agentId
      },
      include: {
        KeeperType: {
          include: {
            _count: {
              select: {
                Keeper: true,
                kip_agent_keeper_types: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const keeperTypes = assignments.map((assignment: any) => assignment.KeeperType);

    return res.json({
      success: true,
      data: keeperTypes
    });
  } catch (error) {
    console.error('Error fetching agent keeper types:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch agent keeper types',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Assign a keeper type to an agent
export const assignKeeperTypeToAgent = async (req: Request, res: Response) => {
  try {
    const { agentId, keeperTypeId } = req.params;

    // Check if agent exists
    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if keeper type exists
    const keeperType = await prisma.keeperType.findUnique({
      where: { id: keeperTypeId }
    });

    if (!keeperType) {
      return res.status(404).json({ error: 'Keeper type not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.kip_agent_keeper_types.findUnique({
      where: {
        agent_id_keeper_type_id: {
          agent_id: agentId,
          keeper_type_id: keeperTypeId
        }
      }
    });

    if (existingAssignment) {
      return res.status(409).json({ error: 'Assignment already exists' });
    }

    // Create the assignment
    const assignment = await prisma.kip_agent_keeper_types.create({
      data: {
        agent_id: agentId,
        keeper_type_id: keeperTypeId
      },
      include: {
        KeeperType: true
      }
    });

    return res.status(201).json({
      success: true,
      data: assignment.KeeperType,
      message: 'Keeper type assigned to agent successfully'
    });
  } catch (error) {
    console.error('Error assigning keeper type to agent:', error);
    return res.status(500).json({ 
      error: 'Failed to assign keeper type to agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Unassign a keeper type from an agent
export const unassignKeeperTypeFromAgent = async (req: Request, res: Response) => {
  try {
    const { agentId, keeperTypeId } = req.params;

    // Check if assignment exists
    const assignment = await prisma.kip_agent_keeper_types.findUnique({
      where: {
        agent_id_keeper_type_id: {
          agent_id: agentId,
          keeper_type_id: keeperTypeId
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete the assignment
    await prisma.kip_agent_keeper_types.delete({
      where: {
        agent_id_keeper_type_id: {
          agent_id: agentId,
          keeper_type_id: keeperTypeId
        }
      }
    });

    return res.json({
      success: true,
      message: 'Keeper type unassigned from agent successfully'
    });
  } catch (error) {
    console.error('Error unassigning keeper type from agent:', error);
    return res.status(500).json({ 
      error: 'Failed to unassign keeper type from agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 