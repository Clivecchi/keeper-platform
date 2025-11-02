#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * Design Board Templates Seed
 * Creates reusable board templates for different Keeper Types
 */

// Helper to ensure a FrameConfig exists
async function ensureFrameConfig(name: string): Promise<string> {
  const existing = await prisma.frameConfig.findFirst({
    where: { name }
  });
  
  if (existing) {
    return existing.id;
  }
  
  const config = await prisma.frameConfig.create({
    data: {
      id: randomUUID(),
      name,
      description: `Config for ${name}`,
      theme: {},
      updatedAt: new Date(),
    }
  });
  
  return config.id;
}

// Helper to ensure a KeeperType exists
async function ensureKeeperType(name: string): Promise<string> {
  let keeperType = await prisma.keeperType.findFirst({
    where: { name }
  });
  
  if (!keeperType) {
    keeperType = await prisma.keeperType.create({
      data: {
        id: randomUUID(),
        name,
        system: true,
      }
    });
  }
  
  return keeperType.id;
}

export default async function seed() {
  console.log('🎨 Seeding Design Board Templates...');

  // We need a dummy keeperId for template boards
  // Templates use keeperId but are marked isTemplate=true
  const systemKeeperId = 'system-template-keeper-id';

  // ==========================================================================
  // 1. DOMAIN MANAGEMENT BOARD TEMPLATE
  // ==========================================================================
  console.log('  📋 Creating Domain Management template...');
  
  const domainTypeId = await ensureKeeperType('Domain');
  const domainBoardId = randomUUID();
  
  const domainBoard = await prisma.board.create({
    data: {
      id: domainBoardId,
      keeperId: systemKeeperId,
      name: 'Domain Design Board',
      slug: 'domain-design-board-template',
      description: 'Canonical board for domains - public showcase + admin operations',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'canvas',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  // Domain frames - Canonical 5-frame design with seeded props
  const domainFrames = [
    // Frame 0: Hero / Identity (Public)
    {
      layout: { x: 0, y: 0, w: 12, h: 4 },
      name: 'Hero / Identity',
      pattern: 'focus',
      visibility: 'public',
      props: [
        {
          id: 'hero-cover-image',
          type: 'image',
          config: {
            name: 'Cover Image',
            key: 'coverImage',
            dataSource: 'domain.theme.coverImage',
            variant: 'full-bleed'
          },
          orderIndex: 0
        },
        {
          id: 'hero-title',
          type: 'heading',
          config: {
            name: 'Domain Title',
            key: 'domainTitle',
            dataSource: 'domain.name',
            level: 'h1'
          },
          orderIndex: 1
        },
        {
          id: 'hero-tagline',
          type: 'text',
          config: {
            name: 'Tagline',
            key: 'domainTagline',
            dataSource: 'domain.description',
            tone: 'soft'
          },
          orderIndex: 2
        },
        {
          id: 'hero-contact-btn',
          type: 'button',
          config: {
            name: 'Contact Button',
            label: 'Contact',
            engagementTemplate: 'domain.public.contact',
            visibility: 'public'
          },
          orderIndex: 3
        }
      ]
    },
    // Frame 1: Activity / Assets (Public)
    {
      layout: { x: 0, y: 4, w: 8, h: 6 },
      name: 'Activity / Assets',
      pattern: 'gallery',
      visibility: 'public',
      props: [
        {
          id: 'activity-heading',
          type: 'heading',
          config: {
            name: 'Activity Heading',
            content: 'What We\'re Building',
            level: 'h2'
          },
          orderIndex: 0
        },
        {
          id: 'featured-work-gallery',
          type: 'gallery',
          config: {
            name: 'Featured Work',
            key: 'featuredWork',
            dataSource: 'domain.featured.keepersOrJourneys',
            layout: 'cards'
          },
          orderIndex: 1
        },
        {
          id: 'ethos-quote',
          type: 'quote',
          config: {
            name: 'Ethos Quote',
            key: 'ethosQuote',
            dataSource: 'domain.values.statement',
            content: 'We show our worth by what we build and keep.',
            variant: 'accent'
          },
          orderIndex: 2
        }
      ]
    },
    // Frame 2: People / Membership (Public)
    {
      layout: { x: 8, y: 4, w: 4, h: 6 },
      name: 'People / Membership',
      pattern: 'canvas',
      visibility: 'public',
      props: [
        {
          id: 'team-heading',
          type: 'heading',
          config: {
            name: 'Team Heading',
            content: 'Who\'s Here',
            level: 'h2'
          },
          orderIndex: 0
        },
        {
          id: 'member-gallery',
          type: 'gallery',
          config: {
            name: 'Member Gallery',
            key: 'memberGallery',
            dataSource: 'domain.members',
            layout: 'avatars+labels'
          },
          orderIndex: 1
        },
        {
          id: 'team-note',
          type: 'text',
          config: {
            name: 'Team Note',
            content: 'People who build, protect, and speak for this domain.',
            tone: 'subtle'
          },
          orderIndex: 2
        }
      ]
    },
    // Frame 3: Domain Operations (Admin Only)
    {
      layout: { x: 0, y: 10, w: 6, h: 8 },
      name: 'Domain Operations',
      pattern: 'form',
      visibility: 'admin',
      props: [
        {
          id: 'ops-heading',
          type: 'heading',
          config: {
            name: 'Operations Heading',
            content: 'Domain Settings',
            level: 'h2',
            visibility: 'admin'
          },
          orderIndex: 0
        },
        {
          id: 'update-domain-form',
          type: 'form',
          config: {
            name: 'Update Domain Form',
            engagementTemplate: 'domain.admin.update',
            fields: [
              { name: 'name', dataSource: 'domain.name', label: 'Domain Name' },
              { name: 'slug', dataSource: 'domain.slug', label: 'Slug' },
              { name: 'description', dataSource: 'domain.description', label: 'Description' }
            ],
            visibility: 'admin'
          },
          orderIndex: 1
        },
        {
          id: 'verify-domain-btn',
          type: 'button',
          config: {
            name: 'Verify Domain Button',
            label: 'Verify Domain',
            engagementTemplate: 'domain.admin.verify',
            visibility: 'admin'
          },
          orderIndex: 2
        },
        {
          id: 'dns-status',
          type: 'text',
          config: {
            name: 'DNS Status',
            dataSource: 'domain.dns.statusMessage',
            content: 'DNS detected — waiting for verification. You may click Verify now.',
            tone: 'status',
            visibility: 'admin'
          },
          orderIndex: 3
        }
      ]
    },
    // Frame 4: Keys / Integrations (Admin Only)
    {
      layout: { x: 6, y: 10, w: 6, h: 8 },
      name: 'Keys / Integrations',
      pattern: 'canvas',
      visibility: 'admin',
      props: [
        {
          id: 'keys-heading',
          type: 'heading',
          config: {
            name: 'Keys Heading',
            content: 'Keys & Integrations',
            level: 'h2',
            visibility: 'admin'
          },
          orderIndex: 0
        },
        {
          id: 'key-reminder',
          type: 'text',
          config: {
            name: 'Key Reminder',
            content: 'Bring your own keys to control cost and access. If you don\'t add keys, we\'ll use shared platform fallbacks.',
            visibility: 'admin'
          },
          orderIndex: 1
        },
        {
          id: 'edit-api-key-form',
          type: 'form',
          config: {
            name: 'Edit API Key Form',
            label: 'Edit API Key',
            engagementTemplate: 'domain.admin.editApiKey',
            fields: [
              { name: 'provider', type: 'select', label: 'Provider', optionsSource: 'providers' },
              { name: 'apiKey', type: 'password', label: 'API Key' }
            ],
            visibility: 'admin'
          },
          orderIndex: 2
        },
        {
          id: 'assign-agent-form',
          type: 'form',
          config: {
            name: 'Assign Agent Form',
            label: 'Assign Primary Agent',
            engagementTemplate: 'domain.admin.assignAgent',
            fields: [
              { name: 'agentId', type: 'select', label: 'Agent', optionsSource: 'agents' }
            ],
            visibility: 'admin'
          },
          orderIndex: 3
        },
        {
          id: 'primary-agent-card',
          type: 'ai-assistant',
          config: {
            name: 'Primary Agent Card',
            dataSource: 'domain.settings.primaryAgentSummary',
            content: 'No primary agent assigned.',
            visibility: 'admin'
          },
          orderIndex: 4
        }
      ]
    }
  ];

  for (let i = 0; i < domainFrames.length; i++) {
    const frame = domainFrames[i];
    const configId = await ensureFrameConfig(`domain-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: domainBoardId,
        entityType: 'board',
        entityId: domainBoardId,
        configId,
        name: frame.name,
        pattern: frame.pattern || 'canvas',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props, // Store props array directly
      }
    });
  }

  // Link to KeeperType
  await prisma.keeperType.update({
    where: { id: domainTypeId },
    data: { defaultBoardTemplateId: domainBoardId }
  });

  console.log('    ✅ Domain Management template created');

  // ==========================================================================
  // 2. AGENT COCKPIT BOARD TEMPLATE
  // ==========================================================================
  console.log('  🤖 Creating Agent Cockpit template...');
  
  const agentTypeId = await ensureKeeperType('Agent');
  const agentBoardId = randomUUID();
  
  const agentBoard = await prisma.board.create({
    data: {
      id: agentBoardId,
      keeperId: systemKeeperId,
      name: 'Agent Cockpit',
      slug: 'agent-cockpit-template',
      description: 'Default board for AI agents',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'dialogic',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  const agentFrames = [
    {
      layout: { x: 0, y: 0, w: 8, h: 6 },
      name: 'AI Conversation',
      props: {
        type: 'AIAssistantProp',
        dataSource: 'record.data.id'
      }
    },
    {
      layout: { x: 8, y: 0, w: 4, h: 4 },
      name: 'Drafts',
      props: {
        type: 'RecordListProp',
        dataSource: 'record.data.drafts'
      }
    },
    {
      layout: { x: 8, y: 4, w: 4, h: 3 },
      name: 'Recent Topics',
      props: {
        type: 'TagListProp',
        dataSource: 'record.data.recentTopics'
      }
    },
    {
      layout: { x: 8, y: 7, w: 4, h: 3 },
      name: 'Alerts',
      props: {
        type: 'AlertFeedProp',
        dataSource: 'record.data.alerts'
      }
    }
  ];

  for (let i = 0; i < agentFrames.length; i++) {
    const frame = agentFrames[i];
    const configId = await ensureFrameConfig(`agent-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: agentBoardId,
        entityType: 'board',
        entityId: agentBoardId,
        configId,
        name: frame.name,
        pattern: 'dialogic',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props,
      }
    });
  }

  await prisma.keeperType.update({
    where: { id: agentTypeId },
    data: { defaultBoardTemplateId: agentBoardId }
  });

  console.log('    ✅ Agent Cockpit template created');

  // ==========================================================================
  // 3. JOURNEY PROGRESS BOARD TEMPLATE
  // ==========================================================================
  console.log('  🚀 Creating Journey Progress template...');
  
  const journeyTypeId = await ensureKeeperType('Journey');
  const journeyBoardId = randomUUID();
  
  const journeyBoard = await prisma.board.create({
    data: {
      id: journeyBoardId,
      keeperId: systemKeeperId,
      name: 'Journey Progress',
      slug: 'journey-progress-template',
      description: 'Default board for tracking journeys',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'wizard',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  const journeyFrames = [
    {
      layout: { x: 0, y: 0, w: 8, h: 5 },
      name: 'Milestones',
      props: {
        type: 'MilestoneListProp',
        dataSource: 'record.data.milestones'
      }
    },
    {
      layout: { x: 8, y: 0, w: 4, h: 5 },
      name: 'Media Gallery',
      props: {
        type: 'MediaGalleryProp',
        dataSource: 'record.data.media'
      }
    },
    {
      layout: { x: 0, y: 5, w: 6, h: 4 },
      name: 'Next Action',
      props: {
        type: 'TaskSingleProp',
        dataSource: 'record.data.nextAction'
      }
    },
    {
      layout: { x: 6, y: 5, w: 6, h: 4 },
      name: 'Reflection',
      props: {
        type: 'ReflectionProp',
        dataSource: 'record.data.lastNote'
      }
    }
  ];

  for (let i = 0; i < journeyFrames.length; i++) {
    const frame = journeyFrames[i];
    const configId = await ensureFrameConfig(`journey-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: journeyBoardId,
        entityType: 'board',
        entityId: journeyBoardId,
        configId,
        name: frame.name,
        pattern: 'wizard',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props,
      }
    });
  }

  await prisma.keeperType.update({
    where: { id: journeyTypeId },
    data: { defaultBoardTemplateId: journeyBoardId }
  });

  console.log('    ✅ Journey Progress template created');

  // ==========================================================================
  // 4. QUOTE BOARD TEMPLATE
  // ==========================================================================
  console.log('  💰 Creating Quote template...');
  
  const quoteTypeId = await ensureKeeperType('Quote');
  const quoteBoardId = randomUUID();
  
  const quoteBoard = await prisma.board.create({
    data: {
      id: quoteBoardId,
      keeperId: systemKeeperId,
      name: 'Quote',
      slug: 'quote-template',
      description: 'Default board for quotes',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'focus',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  const quoteFrames = [
    {
      layout: { x: 0, y: 0, w: 12, h: 3 },
      name: 'Quote Header',
      props: [
        { type: 'HeroImageProp', dataSource: 'record.data.poolModelImage' },
        { type: 'TitleProp', dataSource: 'record.data.customerName' },
        { type: 'StatusTagProp', dataSource: 'record.data.status' }
      ]
    },
    {
      layout: { x: 0, y: 3, w: 8, h: 6 },
      name: 'Quote Details',
      props: {
        type: 'FieldGridProp',
        dataSource: [
          'record.data.basePrice',
          'record.data.craneAllowance',
          'record.data.electricalAllowance'
        ]
      }
    },
    {
      layout: { x: 8, y: 3, w: 4, h: 6 },
      name: 'Payment Terms',
      props: [
        {
          type: 'StaticTextProp',
          value: '25% down, 40% at delivery, 25% at fill, 10% at completion.'
        },
        {
          type: 'SignatureBlockProp',
          dataSource: 'record.data.signatureStatus'
        }
      ]
    }
  ];

  for (let i = 0; i < quoteFrames.length; i++) {
    const frame = quoteFrames[i];
    const configId = await ensureFrameConfig(`quote-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: quoteBoardId,
        entityType: 'board',
        entityId: quoteBoardId,
        configId,
        name: frame.name,
        pattern: 'focus',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props,
      }
    });
  }

  await prisma.keeperType.update({
    where: { id: quoteTypeId },
    data: { defaultBoardTemplateId: quoteBoardId }
  });

  console.log('    ✅ Quote template created');

  // ==========================================================================
  // 5. STORY BOARD TEMPLATE
  // ==========================================================================
  console.log('  📖 Creating Story template...');
  
  const storyTypeId = await ensureKeeperType('Story');
  const storyBoardId = randomUUID();
  
  const storyBoard = await prisma.board.create({
    data: {
      id: storyBoardId,
      keeperId: systemKeeperId,
      name: 'Story',
      slug: 'story-template',
      description: 'Default board for stories',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'focus',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  const storyFrames = [
    {
      layout: { x: 0, y: 0, w: 12, h: 4 },
      name: 'Story Header',
      props: [
        { type: 'HeroImageProp', dataSource: 'record.data.coverImage' },
        { type: 'TitleProp', dataSource: 'record.data.title' }
      ]
    },
    {
      layout: { x: 0, y: 4, w: 8, h: 8 },
      name: 'Story Content',
      props: {
        type: 'RichTextProp',
        dataSource: 'record.data.body'
      }
    },
    {
      layout: { x: 8, y: 4, w: 4, h: 8 },
      name: 'Attachments',
      props: {
        type: 'MediaGalleryProp',
        dataSource: 'record.data.attachments'
      }
    }
  ];

  for (let i = 0; i < storyFrames.length; i++) {
    const frame = storyFrames[i];
    const configId = await ensureFrameConfig(`story-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: storyBoardId,
        entityType: 'board',
        entityId: storyBoardId,
        configId,
        name: frame.name,
        pattern: 'focus',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props,
      }
    });
  }

  await prisma.keeperType.update({
    where: { id: storyTypeId },
    data: { defaultBoardTemplateId: storyBoardId }
  });

  console.log('    ✅ Story template created');

  // ==========================================================================
  // 6. INVENTORY BOARD TEMPLATE
  // ==========================================================================
  console.log('  📦 Creating Inventory template...');
  
  const inventoryTypeId = await ensureKeeperType('InventoryItem');
  const inventoryBoardId = randomUUID();
  
  const inventoryBoard = await prisma.board.create({
    data: {
      id: inventoryBoardId,
      keeperId: systemKeeperId,
      name: 'Inventory',
      slug: 'inventory-template',
      description: 'Default board for inventory items',
      isTemplate: true,
      theme: {},
      behavior: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 12,
        defaultPattern: 'canvas',
      },
      data: {},
      access: { visibility: 'private' },
    }
  });

  const inventoryFrames = [
    {
      layout: { x: 0, y: 0, w: 6, h: 4 },
      name: 'Item Details',
      props: {
        type: 'FieldGridProp',
        dataSource: [
          'record.data.sku',
          'record.data.itemName',
          'record.data.qtyOnHand',
          'record.data.location'
        ]
      }
    },
    {
      layout: { x: 6, y: 0, w: 6, h: 4 },
      name: 'Recent Moves',
      props: {
        type: 'RecordListProp',
        dataSource: 'record.data.recentMoves'
      }
    },
    {
      layout: { x: 0, y: 4, w: 12, h: 4 },
      name: 'Stock Alerts',
      props: {
        type: 'AlertFeedProp',
        dataSource: 'record.data.lowStockAlerts'
      }
    }
  ];

  for (let i = 0; i < inventoryFrames.length; i++) {
    const frame = inventoryFrames[i];
    const configId = await ensureFrameConfig(`inventory-frame-${i}`);
    
    await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId: inventoryBoardId,
        entityType: 'board',
        entityId: inventoryBoardId,
        configId,
        name: frame.name,
        pattern: 'canvas',
        frameType: 'media_card',
        orderIndex: i,
        layoutKind: 'canvas',
        layoutData: frame.layout,
        props: frame.props,
      }
    });
  }

  await prisma.keeperType.update({
    where: { id: inventoryTypeId },
    data: { defaultBoardTemplateId: inventoryBoardId }
  });

  console.log('    ✅ Inventory template created');

  console.log('✅ Design Board Templates seeded successfully!');
}

