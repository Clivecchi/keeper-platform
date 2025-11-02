# Domain Design Board - Implementation Plan

**Date:** November 1, 2025  
**Spec:** Canonical (User-Provided)  
**Status:** Ready to Execute

---

## ✅ Completed

### 1. **Specification Documented**
- ✅ Created `DOMAIN_DESIGN_BOARD_CANONICAL_SPEC.md`
- ✅ 5 frames defined with exact props
- ✅ Engagement Templates specified
- ✅ API response structure defined
- ✅ Visibility rules documented

### 2. **Seed File Updated**
- ✅ Modified `packages/database/prisma/seeds/design-boards.seed.ts`
- ✅ Changed from 4 frames → 5 frames
- ✅ Added frame visibility (public/admin)
- ✅ Updated prop structures
- ✅ Renamed to "Domain Design Board"

---

## 📋 Next Steps

### **Phase 1: Re-seed Domain Template** (5 minutes)

The existing "Domain Management" template has 4 frames. We need to update it to 5 frames.

**Action:**
```bash
cd packages/database

# Delete existing Domain template
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const p = new PrismaClient();
  p.board.findFirst({ 
    where: { slug: 'domain-management-template' } 
  }).then(async (board) => {
    if (board) {
      await p.frameInstance.deleteMany({ where: { boardId: board.id } });
      await p.board.delete({ where: { id: board.id } });
      console.log('✅ Deleted old Domain template');
    }
  })
"

# Re-run seed to create new 5-frame version
npx tsx -e "
  import seed from './prisma/seeds/design-boards.seed.ts';
  seed().then(() => console.log('✅ Re-seeded Domain template'));
"
```

**Expected Result:**
- Domain Design Board template with 5 frames
- Frames 0-2: visibility = 'public'
- Frames 3-4: visibility = 'admin'

---

### **Phase 2: Create API Endpoint** (30-60 minutes)

**File:** `apps/api/src/api/domains/board-data.ts`

**Endpoint:** `GET /api/domains/:id/board-data`

**Implementation:**

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/domains/:id/board-data
 * Returns all data needed for Domain Design Board
 */
router.get('/:id/board-data', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: domainId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check permissions
    const permission = await prisma.domainPermission.findUnique({
      where: { domainId_userId: { domainId, userId } }
    });

    const isOwner = await prisma.domain.findFirst({
      where: { id: domainId, ownerId: userId }
    });

    const isAdmin = permission?.role === 'admin' || permission?.role === 'owner' || !!isOwner;

    // Fetch domain with all relations
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        DomainPermission: {
          include: {
            users_DomainPermission_userIdTousers: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          },
          orderBy: { grantedAt: 'asc' }
        },
        keepers: {
          include: {
            Journey: {
              select: { id: true }
            },
            KeeperType: {
              select: { name: true }
            }
          }
        },
        journeys: {
          select: {
            id: true,
            name: true,
            forward: true,
            createdAt: true
          }
        },
        boards: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Transform members
    const members = domain.DomainPermission.map(dp => ({
      id: dp.id,
      role: dp.role,
      grantedAt: dp.grantedAt,
      user: dp.users_DomainPermission_userIdTousers
    }));

    // Transform keepers
    const keepers = domain.keepers.map(k => ({
      id: k.id,
      title: k.title,
      purpose: k.purpose,
      theme: (k.theme_id as any) || {},
      journeyCount: k.Journey.length,
      keeperType: k.KeeperType?.name
    }));

    // Base response (always included)
    const response: any = {
      domain: {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        status: domain.status,
        createdAt: domain.createdAt,
        theme: (domain.theme as any) || {}
      },
      keepers,
      journeys: domain.journeys,
      boards: domain.boards,
      members: isAdmin ? members : members.slice(0, 5), // Limit for public
      verification: {
        badge: domain.customDomainVerified ? `Verified domain of ${domain.name}` : null
      },
      viewerPermissions: {
        isOwner: !!isOwner,
        isAdmin,
        canEdit: isAdmin,
        role: permission?.role
      },
      actions: getAvailableActions(isAdmin)
    };

    // Admin-only data
    if (isAdmin) {
      response.dns = {
        configured: !!domain.customDomain,
        verified: domain.customDomainVerified,
        nameservers: [] // Add actual nameservers if you have them
      };
      
      response.ssl = {
        issued: false, // Implement actual SSL check
        pending: false
      };
      
      response.customDomains = domain.customDomain ? [{
        domain: domain.customDomain,
        verified: domain.customDomainVerified,
        status: domain.customDomainVerified ? 'verified' : 'pending'
      }] : [];
      
      // Check for API keys (from user's keys, not domain-specific yet)
      const userKeys = await prisma.kip_user_keys.findMany({
        where: { userId },
        select: { provider: true, is_active: true }
      });
      
      response.keys = {
        openai: {
          configured: userKeys.some(k => k.provider === 'openai'),
          status: userKeys.find(k => k.provider === 'openai')?.is_active ? 'active' : 'missing'
        },
        anthropic: {
          configured: userKeys.some(k => k.provider === 'anthropic'),
          status: userKeys.find(k => k.provider === 'anthropic')?.is_active ? 'active' : 'missing'
        }
      };
      
      // Primary agent (if you add this to Domain model)
      // response.primaryAgent = await prisma.kip_agents.findFirst({
      //   where: { id: domain.primaryAgentId }
      // });
    }

    return res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching domain board data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function getAvailableActions(isAdmin: boolean): any[] {
  const publicActions = [
    { id: 'domain.public.contact', name: 'Contact Domain', visibility: 'public' }
  ];
  
  const adminActions = [
    { id: 'domain.admin.update', name: 'Update Domain', visibility: 'admin' },
    { id: 'domain.admin.verify', name: 'Verify Domain', visibility: 'admin' },
    { id: 'domain.admin.addCustomDomain', name: 'Add Custom Domain', visibility: 'admin' },
    { id: 'domain.admin.editApiKey', name: 'Edit API Key', visibility: 'admin' },
    { id: 'domain.admin.assignAgent', name: 'Assign Agent', visibility: 'admin' }
  ];
  
  return isAdmin ? [...publicActions, ...adminActions] : publicActions;
}

export default router;
```

**Register Route:**
In `apps/api/src/index.ts`:
```typescript
import domainBoardDataRouter from './api/domains/board-data.js';
app.use('/api/domains', domainBoardDataRouter);
```

---

### **Phase 3: Engagement Templates Model** (2-4 hours)

**Option A: Use Existing `engagement_templates` Table**

Check if this table exists:
```bash
npx prisma studio
# Look for engagement_templates table
```

**Option B: Create New Table**

Add to `schema.prisma`:
```prisma
model EngagementTemplate {
  id                String   @id @default(uuid())
  keeperTypeId      String?
  name              String
  slug              String   @unique
  visibility        String   @default("public") // public, admin, member
  inputs            Json     @default("[]")
  endpoint          String
  method            String   @default("POST")
  successMessage    String?
  errorHandling     Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  keeperType        KeeperType? @relation(fields: [keeperTypeId], references: [id])
  
  @@index([keeperTypeId])
  @@index([slug])
}
```

**Seed Domain Engagement Templates:**

```typescript
const domainTemplates = [
  {
    keeperTypeId: domainTypeId,
    name: 'Contact Domain',
    slug: 'domain.public.contact',
    visibility: 'public',
    inputs: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'message', type: 'textarea', required: true }
    ],
    endpoint: '/api/domains/:domainId/contact',
    method: 'POST',
    successMessage: 'Message sent!'
  },
  // ... add all 6 templates from spec
];

for (const template of domainTemplates) {
  await prisma.engagementTemplate.upsert({
    where: { slug: template.slug },
    create: template,
    update: template
  });
}
```

---

### **Phase 4: Frame Visibility Logic** (1-2 hours)

**Frontend Component:** `BoardRenderer.tsx` or similar

```typescript
interface Frame {
  id: string;
  name: string;
  props: {
    items: any[];
    visibility: 'public' | 'admin';
  };
}

function shouldShowFrame(frame: Frame, viewerPermissions: any): boolean {
  if (frame.props.visibility === 'admin') {
    return viewerPermissions.isAdmin;
  }
  return true; // Public frames always show
}

function BoardRenderer({ boardData, frames }: Props) {
  const visibleFrames = frames.filter(f => 
    shouldShowFrame(f, boardData.viewerPermissions)
  );
  
  return (
    <div className="board">
      {visibleFrames.map(frame => (
        <FrameRenderer key={frame.id} frame={frame} data={boardData} />
      ))}
    </div>
  );
}
```

---

### **Phase 5: Prop Components** (4-8 hours)

Build the prop components referenced in frames:

1. **HeroImageProp** - Cover image display
2. **HeadingProp** - Text heading
3. **TextBlockProp** - Rich text display
4. **StatusBadgeProp** - Status indicator
5. **ActionButtonProp** - Interactive button (triggers engagement template)
6. **CardListProp** - Grid/masonry of cards
7. **AvatarListProp** - List of user avatars
8. **FormProp** - Form with fields
9. **StatusCardProp** - Status display with details
10. **CopyableTextProp** - Text with copy button
11. **KeyStatusCardProp** - API key status card
12. **AIAssistantProp** - AI agent interface

**Directory:** `apps/web/src/components/props/`

Example:
```typescript
// ActionButtonProp.tsx
export function ActionButtonProp({ 
  label, 
  engagementTemplate, 
  variant, 
  condition, 
  data 
}: Props) {
  const handleClick = () => {
    // Load engagement template
    // Show modal/form if inputs needed
    // Execute API call
    // Show success/error
  };
  
  if (condition && !evaluateCondition(condition, data)) {
    return null;
  }
  
  return (
    <button 
      onClick={handleClick}
      className={`btn-${variant}`}
    >
      {label}
    </button>
  );
}
```

---

## 🎯 Testing Plan

### 1. **Template Verification**
```bash
# Check Domain template has 5 frames
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const p = new PrismaClient();
  p.board.findFirst({
    where: { slug: 'domain-design-board-template' },
    include: { frames: true }
  }).then(b => {
    console.log('Frames:', b.frames.length);
    b.frames.forEach(f => console.log('-', f.name, f.props.visibility));
  });
"
```

**Expected:**
```
Frames: 5
- Hero / Identity public
- Activity / Assets public
- People / Membership public
- Domain Operations admin
- Keys / Integrations admin
```

### 2. **API Endpoint Test**
```bash
curl -X GET https://api.ke3p.com/api/domains/DOMAIN_ID/board-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** JSON with all domain data

### 3. **Frame Visibility Test**
- View board as anonymous → See frames 0-2 only
- View board as admin → See all 5 frames

---

## 📊 Progress Tracking

- [x] Phase 1: Re-seed Domain Template
- [ ] Phase 2: Create API Endpoint
- [ ] Phase 3: Engagement Templates Model
- [ ] Phase 4: Frame Visibility Logic
- [ ] Phase 5: Prop Components (11 total)

**Estimated Total Time:** 10-20 hours

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Domain template has 5 frames
- [ ] API endpoint returns correct data
- [ ] Engagement templates seeded
- [ ] Frame visibility works
- [ ] All 11 prop components built
- [ ] Public view tested (no auth)
- [ ] Admin view tested (with auth)
- [ ] Engagement template execution works
- [ ] DNS/SSL status displays correctly
- [ ] API keys status displays correctly

---

## 📝 Notes

### Key Architectural Decisions:

1. **Single Board, Multiple Visibility Levels**
   - Simpler than maintaining separate boards
   - Props carry visibility metadata
   - Renderer filters based on viewer permissions

2. **Engagement Templates as First-Class**
   - Not ad-hoc endpoints
   - Reusable across frames
   - Discoverable via API
   - Consistent execution pattern

3. **Data-Driven Props**
   - Props know their data sources
   - No hardcoded logic in frame definitions
   - Easy to add new prop types

4. **Canonical Dashboard**
   - Replaces multiple admin pages
   - Single source of truth for domain management
   - Public and admin views in one place

---

**Status:** Phase 1 ready to execute  
**Next Action:** Re-seed Domain template with 5 frames

