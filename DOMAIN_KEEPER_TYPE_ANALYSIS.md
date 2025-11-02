# Domain Keeper Type - Complete Analysis

**Date:** November 1, 2025  
**Purpose:** Define what the Domain KeeperType needs for the Domain Design Board

---

## 🔍 Current State

### ✅ What EXISTS

#### 1. **KeeperType Model** (Prisma Schema)
**File:** `packages/database/prisma/schema.prisma` (Lines 117-132)

```prisma
model KeeperType {
  id                               String                             @id
  name                             String
  createdAt                        DateTime                           @default(now())
  memoryPattern                    String?
  system                           Boolean                            @default(false)
  
  // Design Board Template System
  defaultBoardTemplateId           String?                            @db.Uuid
  defaultBoardTemplate             Board?                             @relation("DefaultBoardTemplate", fields: [defaultBoardTemplateId], references: [id])
  
  Keeper                           Keeper[]
  KeeperRecord                     KeeperRecord[]
  keeper_type_engagement_templates keeper_type_engagement_templates[]
  kip_agent_keeper_types           kip_agent_keeper_types[]
}
```

**Key Fields:**
- `id` - Unique identifier
- `name` - Display name (e.g., "Domain", "Agent", "Journey")
- `system` - Whether it's a platform-defined type
- `defaultBoardTemplateId` - ✅ **ALREADY LINKED to Domain Management template**
- Relations to Keeper instances and KeeperRecords

#### 2. **"Domain" KeeperType** (Seeded in Database)
**File:** `packages/database/prisma/seeds/design-boards.seed.ts` (Line 67)

```typescript
const domainTypeId = await ensureKeeperType('Domain');
```

**Status:** ✅ EXISTS
- **Name:** "Domain"
- **System:** true
- **Template:** Linked to "Domain Management" board template (4 frames)

**Verification:**
```bash
# Run to confirm:
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const p = new PrismaClient();
  p.keeperType.findFirst({ 
    where: { name: 'Domain' },
    include: { defaultBoardTemplate: true }
  }).then(kt => console.log(JSON.stringify(kt, null, 2)))
"
```

#### 3. **Domain Model** (Prisma Schema)
**File:** `packages/database/prisma/schema.prisma` (Lines 859-913)

```prisma
model Domain {
  id                    String              @id @default(uuid())
  name                  String              @unique
  slug                  String              @unique
  slugHistory           String[]            @default([])
  customDomain          String?             @unique
  customDomainVerified  Boolean             @default(false)
  verificationToken     String?             @unique
  verificationMethod    String?
  verifiedAt            DateTime?
  status                String              @default("active")
  suspendedAt           DateTime?
  suspendedBy           String?
  suspensionReason      String?
  features              Json?               @default("{}")
  limits                Json?               @default("{}")
  subscription          String?
  isPublic              Boolean             @default(false)
  description           String?
  allowRequests         Boolean             @default(false)
  categories            String[]            @default([])
  ownerId               String
  isActive              Boolean             @default(true)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  deletedAt             DateTime?
  theme                 Json?               @default("{}")
  settings              Json?               @default("{}")
  
  // Relations
  users                 users               @relation(fields: [ownerId], references: [id])
  boards                Board[]
  DomainInvitation      DomainInvitation[]
  DomainPermission      DomainPermission[]
  journeys              Journey[]
  keepers               Keeper[]
  moments               Moment[]
  
  @@index([slug])
  @@index([customDomain])
  @@index([ownerId])
  @@index([status])
  @@index([isActive])
  @@index([isPublic])
}
```

**Domain Permissions:**
```prisma
model DomainPermission {
  id          String    @id @default(uuid())
  domainId    String
  userId      String
  role        String    @default("user")
  permissions String[]  @default([])
  grantedBy   String
  grantedAt   DateTime  @default(now())
  expiresAt   DateTime?
  Domain      Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  
  @@unique([domainId, userId])
}
```

---

## ❌ What DOES NOT EXIST

### **No Direct "DomainKeeper" Entity**

The codebase has:
- ✅ **Domain** - An organizational container
- ✅ **Keeper** - A content/memory container
- ✅ **KeeperType** "Domain" - A type classification

**But NOT:**
- ❌ A combined "DomainKeeper" model
- ❌ Specific Domain → Keeper relationship (Keeper has `domainId` foreign key)

---

## 🔗 Current Relationships

### **How Domains and Keepers Relate:**

```
Domain (1) ─────< Keeper (many)
  │
  ├─ id (UUID)
  └─ name, settings, members
                    │
                    └─ domainId (FK) ────> Domain
```

**Keeper Schema (Simplified):**
```prisma
model Keeper {
  id                   String       @id
  title                String
  purpose              String
  keeperTypeId         String?
  ownerId              String
  domainId             String?
  
  domain               Domain?      @relation(fields: [domainId], references: [id])
  KeeperType           KeeperType?  @relation(fields: [keeperTypeId], references: [id])
}
```

**Key Insight:**
- A Domain can have MANY Keepers
- A Keeper BELONGS TO a Domain (via `domainId`)
- A Keeper HAS A KeeperType (via `keeperTypeId`)

---

## 🎯 What the Domain Design Board Actually Needs

### **Conceptual Model:**

The Domain Design Board is **NOT** for a "DomainKeeper" entity.  
It's for managing a **Domain itself** - viewing and organizing everything inside it.

### **Domain Data Structure (For Board Display):**

```typescript
interface DomainForBoard {
  // Core Domain Info
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'suspended';
  healthStatus: 'healthy' | 'warning' | 'critical';
  
  // Membership
  members: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
    role: 'owner' | 'admin' | 'member' | 'guest';
    status: 'active' | 'inactive' | 'invited';
    permissions: string[];
    grantedAt: Date;
  }>;
  memberCount: number;
  
  // Keepers within Domain
  keepers: Array<{
    id: string;
    title: string;
    purpose: string;
    keeperType?: {
      id: string;
      name: string;
    };
    journeyCount: number;
  }>;
  
  // Journeys within Domain
  journeys: Array<{
    id: string;
    name: string;
    forward: string;
    keeperId: string;
    createdAt: Date;
  }>;
  
  // Work Items (if exists)
  openQuotes?: Array<{
    id: string;
    title: string;
    customerName: string;
    value: number;
    status: string;
    createdAt: Date;
  }>;
  
  pendingTasks?: Array<{
    id: string;
    title: string;
    assignee: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high';
  }>;
  
  // Boards in Domain
  boards: Array<{
    id: string;
    name: string;
    slug: string;
    frameCount: number;
  }>;
  
  // Primary Agent (if configured)
  primaryAgentId?: string;
  primaryAgent?: {
    id: string;
    name: string;
    slug: string;
    agentClass: string;
  };
  
  // Metrics
  metrics: {
    totalKeepers: number;
    totalJourneys: number;
    activeMembers: number;
    totalBoards: number;
    storageUsed?: number;
    activityScore?: number;
  };
  
  // Settings
  settings: {
    allowPublicJoin?: boolean;
    requireApproval?: boolean;
    defaultRole?: string;
    [key: string]: any;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📊 Data Sources for Domain Board Frames

### **Frame 1: Domain Overview**
**Data Source:** `Domain` table + calculated metrics

```typescript
// Query for Frame 1
const domain = await prisma.domain.findUnique({
  where: { id: domainId },
  select: {
    id: true,
    name: true,
    description: true,
    status: true,
    _count: {
      select: {
        keepers: true,
        journeys: true,
        boards: true,
        DomainPermission: true
      }
    }
  }
});

// Derived healthStatus logic
const healthStatus = calculateHealth(domain);
```

### **Frame 2: Team Members**
**Data Source:** `DomainPermission` table

```typescript
const members = await prisma.domainPermission.findMany({
  where: { domainId },
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
});
```

### **Frame 3: Active Work**
**Data Source:** Multiple tables (Keepers, Journeys, custom work items)

```typescript
// Keepers in domain
const keepers = await prisma.keeper.findMany({
  where: { domainId },
  include: {
    Journey: true,
    KeeperType: true
  }
});

// Journeys in domain
const journeys = await prisma.journey.findMany({
  where: { domainId },
  include: {
    Keeper: {
      select: { title: true }
    }
  }
});

// Custom work items (if you add Quote/Task models)
// const quotes = await prisma.quote.findMany({ where: { domainId } });
// const tasks = await prisma.task.findMany({ where: { domainId, status: 'pending' } });
```

### **Frame 4: AI Agent**
**Data Source:** `kip_agents` table (if domain has primary agent)

```typescript
// Option 1: Domain-specific agent (if you add this field)
const primaryAgent = await prisma.kip_agents.findFirst({
  where: { 
    // Need to add domainId field to kip_agents table
    domainId: domainId 
  }
});

// Option 2: Use a domain setting
const agentId = domain.settings?.primaryAgentId;
const agent = await prisma.kip_agents.findUnique({
  where: { id: agentId }
});
```

### **Frame 5: Metrics**
**Data Source:** Aggregated queries

```typescript
const metrics = {
  totalKeepers: await prisma.keeper.count({ where: { domainId } }),
  totalJourneys: await prisma.journey.count({ where: { domainId } }),
  activeMembers: await prisma.domainPermission.count({ 
    where: { domainId, /* active condition */ } 
  }),
  totalBoards: await prisma.board.count({ where: { domainId } }),
  // Add more as needed
};
```

---

## 🔧 What Needs to Be Added

### **1. Domain Board API Endpoint**
**File:** Create `apps/api/src/api/domains/board-data.ts`

```typescript
/**
 * GET /api/domains/:domainId/board-data
 * 
 * Returns all data needed for Domain Design Board
 */
router.get('/:domainId/board-data', authMiddleware, async (req, res) => {
  const { domainId } = req.params;
  
  // Check permissions
  const hasAccess = await checkDomainAccess(req.user.id, domainId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
  
  // Fetch all data
  const domain = await prisma.domain.findUnique({ 
    where: { id: domainId },
    include: {
      DomainPermission: {
        include: {
          users_DomainPermission_userIdTousers: true
        }
      },
      keepers: {
        include: {
          Journey: true,
          KeeperType: true
        }
      },
      journeys: true,
      boards: true
    }
  });
  
  // Transform and return
  return res.json({
    success: true,
    data: transformDomainForBoard(domain)
  });
});
```

### **2. Optional: Add `primaryAgentId` to Domain**

```prisma
model Domain {
  // ... existing fields
  
  primaryAgentId  String?      @db.Uuid
  primaryAgent    kip_agents?  @relation(fields: [primaryAgentId], references: [id])
}
```

### **3. Optional: Health Status Calculation**

```typescript
function calculateDomainHealth(domain: any): 'healthy' | 'warning' | 'critical' {
  const issues = [];
  
  // Check factors
  if (domain.DomainPermission.length === 0) issues.push('no-members');
  if (domain.keepers.length === 0) issues.push('no-keepers');
  if (domain.status === 'suspended') issues.push('suspended');
  
  if (issues.length === 0) return 'healthy';
  if (issues.includes('suspended')) return 'critical';
  return 'warning';
}
```

---

## 🎯 Summary

### **The Domain KeeperType:**
- ✅ **EXISTS** in database as KeeperType with name "Domain"
- ✅ **LINKED** to Domain Management template board
- ✅ **READY** to use

### **What "Domain Keeper Type" Actually Means:**
- It's **NOT** a special combined entity
- It's a **KeeperType** that classifies Domain-related functionality
- The Domain Design Board displays **Domain entity data**, not a Keeper

### **Key Distinction:**

```
┌─────────────────────────────────────────────────┐
│ Domain                                          │
│ ├─ Organization-level container                │
│ ├─ Has members (DomainPermission)              │
│ ├─ Contains Keepers, Journeys, Boards          │
│ └─ Domain Design Board shows THIS entity       │
└─────────────────────────────────────────────────┘

         vs.

┌─────────────────────────────────────────────────┐
│ Keeper (with keeperTypeId = "Domain")          │
│ ├─ A Keeper instance                           │
│ ├─ Classified as type "Domain"                 │
│ ├─ Belongs to a Domain (via domainId)          │
│ └─ This is NOT what we're displaying           │
└─────────────────────────────────────────────────┘
```

### **Next Steps:**
1. ✅ Domain KeeperType exists and is linked
2. ⏭️ Create API endpoint: `/api/domains/:domainId/board-data`
3. ⏭️ Implement data transformation function
4. ⏭️ Connect Domain Design Board frames to real data
5. ⏭️ Add domain selection UI (which domain to view)

---

**Key Files:**
- `packages/database/prisma/schema.prisma` - Lines 53-81 (Keeper), 117-132 (KeeperType), 859-913 (Domain)
- `packages/database/prisma/seeds/design-boards.seed.ts` - Line 67 (Domain KeeperType creation)
- `apps/api/src/api/domains.ts` - Existing Domain CRUD
- `apps/api/src/api/keeper-types.ts` - KeeperType management

**Status:** ✅ Domain KeeperType exists and is properly configured. Ready to implement data integration.

