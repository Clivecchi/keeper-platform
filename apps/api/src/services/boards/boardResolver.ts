/**
 * Board Resolver Service
 * 
 * Resolves which Board template to use for a given record.
 * Supports both KeeperRecord (generic) and first-class entities (Keeper, Journey, etc.)
 */

import { PrismaClient } from '@keeper/database';

export interface BoardResolutionResult {
  board: any; // Board with frames included
  source: 'customBoardId' | 'defaultBoardTemplateId' | 'none';
  record: any;
}

/**
 * Resolve board for a generic KeeperRecord
 * 
 * Resolution order:
 * 1. Record's custom board (if set)
 * 2. KeeperType's default template (if set)
 * 3. Throw error if neither exists
 */
export async function resolveBoardForRecord(
  prisma: PrismaClient,
  recordId: string
): Promise<BoardResolutionResult> {
  // Load the record, its type, and any custom board
  const record = await prisma.keeperRecord.findUnique({
    where: { id: recordId },
    include: {
      customBoard: {
        include: { frames: true },
      },
      type: {
        include: {
          defaultBoardTemplate: {
            include: { frames: true },
          },
        },
      },
    },
  });

  if (!record) {
    throw new Error(`No record found for id ${recordId}`);
  }

  // Prefer the record-specific board override
  if (record.customBoard) {
    return {
      board: record.customBoard,
      source: 'customBoardId',
      record,
    };
  }

  // Fall back to the KeeperType default template
  if (record.type?.defaultBoardTemplate) {
    return {
      board: record.type.defaultBoardTemplate,
      source: 'defaultBoardTemplateId',
      record,
    };
  }

  throw new Error(
    `No board available for record ${recordId} (no customBoardId and no defaultBoardTemplateId)`
  );
}

/**
 * Resolve board for first-class entities like Keeper, Journey, Agent, Domain
 * 
 * This is a helper for existing first-class models that aren't yet migrated to KeeperRecord.
 * It checks if the entity has a keeperTypeId and resolves the default board template.
 */
export async function resolveBoardForEntity(
  prisma: PrismaClient,
  entityType: 'keeper' | 'journey' | 'agent' | 'domain',
  entityId: string
): Promise<BoardResolutionResult | null> {
  let entity: any = null;
  let keeperTypeId: string | null = null;

  // Load entity based on type
  switch (entityType) {
    case 'keeper':
      entity = await prisma.keeper.findUnique({
        where: { id: entityId },
        select: { id: true, keeperTypeId: true, title: true }
      });
      keeperTypeId = entity?.keeperTypeId || null;
      break;
    
    case 'journey':
      entity = await prisma.journey.findUnique({
        where: { id: entityId },
        select: { id: true, name: true }
      });
      // Journeys don't have keeperTypeId yet, but we can check if there's a Journey KeeperType
      const journeyType = await prisma.keeperType.findFirst({
        where: { name: 'Journey' }
      });
      keeperTypeId = journeyType?.id || null;
      break;
    
    case 'agent':
      // Agents use a different approach - they typically have their own boards
      // For now, return null to indicate no template resolution needed
      return null;
    
    case 'domain':
      entity = await prisma.domain.findUnique({
        where: { id: entityId },
        select: { id: true, name: true }
      });
      // Check if there's a Domain KeeperType
      const domainType = await prisma.keeperType.findFirst({
        where: { name: 'Domain' }
      });
      keeperTypeId = domainType?.id || null;
      break;
  }

  if (!entity) {
    throw new Error(`${entityType} with id ${entityId} not found`);
  }

  // If no keeperTypeId found, can't resolve a template
  if (!keeperTypeId) {
    return {
      board: null,
      source: 'none',
      record: entity
    };
  }

  // Load the KeeperType with its default board template
  const keeperType = await prisma.keeperType.findUnique({
    where: { id: keeperTypeId },
    include: {
      defaultBoardTemplate: {
        include: { frames: true }
      }
    }
  });

  if (keeperType?.defaultBoardTemplate) {
    return {
      board: keeperType.defaultBoardTemplate,
      source: 'defaultBoardTemplateId',
      record: entity
    };
  }

  return {
    board: null,
    source: 'none',
    record: entity
  };
}

/**
 * Utility: Get all template boards
 */
export async function getAllBoardTemplates(prisma: PrismaClient) {
  return await prisma.board.findMany({
    where: { isTemplate: true },
    include: {
      frames: {
        orderBy: { orderIndex: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });
}

/**
 * Utility: Create a custom board from a template for a specific record
 */
export async function forkTemplateForRecord(
  prisma: PrismaClient,
  recordId: string,
  templateBoardId: string,
  keeperId: string
): Promise<any> {
  // Load the template
  const template = await prisma.board.findUnique({
    where: { id: templateBoardId },
    include: { frames: true }
  });

  if (!template) {
    throw new Error(`Template board ${templateBoardId} not found`);
  }

  if (!template.isTemplate) {
    throw new Error(`Board ${templateBoardId} is not a template`);
  }

  // Create a new board based on the template
  const newBoard = await prisma.board.create({
    data: {
      keeperId,
      name: `${template.name} (Custom)`,
      slug: `custom-${Date.now()}`,
      description: template.description,
      icon: template.icon,
      theme: template.theme,
      behavior: template.behavior,
      data: template.data,
      access: template.access,
      isTemplate: false, // This is not a template
    }
  });

  // Copy frames from template
  const framePromises = template.frames.map(async (frame) => {
    return prisma.frameInstance.create({
      data: {
        boardId: newBoard.id,
        entityType: frame.entityType,
        entityId: newBoard.id,
        configId: frame.configId,
        role: frame.role,
        name: frame.name,
        pattern: frame.pattern,
        frameType: frame.frameType,
        orderIndex: frame.orderIndex,
        layoutKind: frame.layoutKind,
        layoutData: frame.layoutData,
        props: frame.props,
      }
    });
  });

  await Promise.all(framePromises);

  // Link the new board to the record
  await prisma.keeperRecord.update({
    where: { id: recordId },
    data: { customBoardId: newBoard.id }
  });

  // Return the complete board with frames
  return await prisma.board.findUnique({
    where: { id: newBoard.id },
    include: { frames: true }
  });
}

