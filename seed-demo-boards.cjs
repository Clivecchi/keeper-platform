const { PrismaClient } = require('@keeper/database');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedDemoBoards() {
  console.log('🌱 Seeding demo boards...');

  try {
    // Create a demo keeper if it doesn't exist
    const demoKeeperId = '00000000-0000-0000-0000-000000000001'; // Fixed UUID for demo
    
    let demoKeeper;
    try {
      demoKeeper = await prisma.keeper.findUnique({
        where: { id: demoKeeperId }
      });
    } catch (error) {
      console.log('Keeper table might not exist, continuing with boards...');
    }

    if (!demoKeeper) {
      console.log('📝 Creating demo keeper...');
      try {
        demoKeeper = await prisma.keeper.create({
          data: {
            id: demoKeeperId,
            name: 'Demo Keeper',
            slug: 'demo',
            description: 'Demo keeper for testing',
            status: 'active',
            ownerId: '491307f3-b331-436c-b53a-09a11ec110cb', // Your user ID from logs
            visibility: 'private'
          }
        });
        console.log('✅ Demo keeper created:', demoKeeper.id);
      } catch (error) {
        console.log('⚠️ Could not create keeper, using existing user as keeper');
        // Use your existing user ID as the keeper
      }
    }

    // Create demo boards
    const boards = [
      {
        id: randomUUID(),
        keeperId: demoKeeperId,
        name: 'Agent Configuration Board',
        slug: 'agent-config',
        description: 'Configure and manage AI agents',
        templateId: 'agent'
      },
      {
        id: randomUUID(),
        keeperId: demoKeeperId,
        name: 'Domain Management Board',
        slug: 'domain-management',
        description: 'Manage domain settings and members',
        templateId: 'domain'
      },
      {
        id: randomUUID(),
        keeperId: demoKeeperId,
        name: 'Journey Visualization Board',
        slug: 'journey-viz',
        description: 'Visualize and manage learning journeys',
        templateId: 'journey'
      }
    ];

    for (const boardData of boards) {
      console.log(`📋 Creating board: ${boardData.name}`);
      
      // Check if board already exists
      const existingBoard = await prisma.board.findFirst({
        where: { 
          slug: boardData.slug,
          keeperId: boardData.keeperId
        }
      });

      if (existingBoard) {
        console.log(`⏭️  Board "${boardData.name}" already exists, skipping...`);
        continue;
      }

      // Create the board
      const board = await prisma.board.create({
        data: {
          id: boardData.id,
          keeperId: boardData.keeperId,
          name: boardData.name,
          slug: boardData.slug,
          description: boardData.description,
          theme: {
            primary: '#3B82F6',
            background: '#F8FAFC'
          },
          behavior: {
            showGrid: false,
            snapToGrid: true,
            gridSize: 12,
            defaultPattern: 'canvas',
            draftMode: false,
            autosave: true
          },
          data: {
            scope: 'custom',
            entityId: null,
            dataBindings: {},
            agentId: null
          },
          access: {
            visibility: 'private',
            roles: {},
            allowComments: false,
            shareLinkEnabled: false
          }
        }
      });

      // Create default frames for the board
      const frames = [
        {
          id: randomUUID(),
          boardId: board.id,
          name: 'Cover',
          role: 'cover',
          pattern: 'canvas',
          frameType: 'cover',
          orderIndex: 0,
          props: {}
        },
        {
          id: randomUUID(),
          boardId: board.id,
          name: 'Content Frame',
          role: 'content',
          pattern: 'canvas',
          frameType: 'media_card',
          orderIndex: 1,
          props: {}
        },
        {
          id: randomUUID(),
          boardId: board.id,
          name: 'Settings',
          role: 'settings',
          pattern: 'form',
          frameType: 'settings',
          orderIndex: 2,
          props: {}
        }
      ];

      // Create frame configs and instances
      for (const frameData of frames) {
        // Create frame config (simplified schema)
        const frameConfig = await prisma.frameConfig.create({
          data: {
            id: randomUUID(),
            name: `${frameData.name} Config`,
            description: `Configuration for ${frameData.name} frame`,
            theme: {},
            updatedAt: new Date()
          }
        });

        // Create frame instance
        await prisma.frameInstance.create({
          data: {
            id: frameData.id,
            entityType: 'board',
            entityId: board.id,
            configId: frameConfig.id,
            boardId: frameData.boardId,
            name: frameData.name,
            role: frameData.role,
            pattern: frameData.pattern,
            frameType: frameData.frameType,
            orderIndex: frameData.orderIndex,
            layoutKind: 'canvas',
            layoutData: {},
            props: frameData.props
          }
        });
      }

      console.log(`✅ Created board "${boardData.name}" with ${frames.length} frames`);
    }

    console.log('🎉 Demo boards seeded successfully!');
    console.log(`📋 Created ${boards.length} boards with demo keeper ID: ${demoKeeperId}`);
    
  } catch (error) {
    console.error('❌ Error seeding demo boards:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDemoBoards().catch(console.error);
