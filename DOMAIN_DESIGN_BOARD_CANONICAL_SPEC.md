# Domain Design Board - Canonical Specification

**Date:** November 1, 2025  
**Status:** Authoritative Design Document  
**Purpose:** The one true dashboard for a Domain

---

## 🎯 Core Principles

### 1. **One Board, Two Modes**
- **Public/Visitor View:** Storytelling, brand, vibe
- **Owner/Admin View:** Operations, setup, keys, verification
- Achieved through **frame visibility**, not separate boards

### 2. **Engagement Templates = Actions**
- All actions are Engagement Templates executed **in-place**
- No separate pages or navigation
- Templates are the "verbs" of the Domain

### 3. **Canonical Surface**
- The Domain Design Board IS the domain
- Replaces "Root Dashboard → Domain Settings"
- All domain management happens here

---

## 📐 Required Frames (5 Frames)

### **Frame A: Hero / Identity**

**Purpose:** Present the domain as a living thing  
**Visibility:** Public + Admin  
**Layout:** `{ x: 0, y: 0, w: 12, h: 4 }`  
**Pattern:** `focus`

**Shows:**
- Domain name ("House Frogmore", "Keeper-Kip")
- Tagline / short description
- Theme / cover art / vibe
- Status badge (live, private, pending verification)
- "Contact / Follow / Enter" CTA for public

**Props:**
```typescript
{
  props: [
    {
      type: 'HeroImageProp',
      dataSource: 'domain.theme.coverImage'
    },
    {
      type: 'HeadingProp',
      dataSource: 'domain.name',
      level: 1
    },
    {
      type: 'TextBlockProp',
      dataSource: 'domain.description',
      style: 'tagline'
    },
    {
      type: 'StatusBadgeProp',
      dataSource: 'domain.status',
      labels: {
        active: 'Live',
        pending: 'Pending Verification',
        suspended: 'Private'
      }
    },
    {
      type: 'ActionButtonProp',
      label: 'Contact / Follow / Enter',
      engagementTemplate: 'domain.public.contact',
      variant: 'primary'
    }
  ]
}
```

**Why it matters:** This is the "aesthetically pleasing public interface" promise.

---

### **Frame B: Activity / Assets / Surface**

**Purpose:** Showcase what lives in this domain  
**Visibility:** Public + Admin  
**Layout:** `{ x: 0, y: 4, w: 8, h: 6 }`  
**Pattern:** `gallery`

**Shows:**
- Featured Keepers ("Pool Company", "Frogmore Juke Joint", etc.)
- Recent Journeys / Stories published
- Boards or showcases linked to work/products/media

**Props:**
```typescript
{
  props: [
    {
      type: 'HeadingProp',
      value: 'What We\'re Building',
      level: 2
    },
    {
      type: 'CardListProp',
      dataSource: 'domain.keepers',
      display: 'grid',
      columns: 3,
      cardTemplate: {
        title: 'keeper.title',
        description: 'keeper.purpose',
        image: 'keeper.theme.coverImage',
        action: {
          label: 'View',
          link: '/keeper/{keeper.id}'
        }
      }
    },
    {
      type: 'CardListProp',
      dataSource: 'domain.journeys',
      display: 'masonry',
      cardTemplate: {
        title: 'journey.name',
        description: 'journey.forward',
        action: {
          label: 'Explore',
          link: '/journey/{journey.id}'
        }
      }
    }
  ]
}
```

**Why it matters:** This is the "what we're doing / building in this world" frame.

---

### **Frame C: People / Membership**

**Purpose:** Show who this domain belongs to  
**Visibility:** Public + Admin (public view can be lighter)  
**Layout:** `{ x: 8, y: 4, w: 4, h: 6 }`  
**Pattern:** `canvas`

**Shows:**
- Owner / primary voice of the domain
- Key members / collaborators
- "Joined since" / credibility
- Optional: "verified domain of ____" badge

**Props:**
```typescript
{
  props: [
    {
      type: 'HeadingProp',
      value: 'Team',
      level: 2
    },
    {
      type: 'AvatarListProp',
      dataSource: 'domain.members',
      display: 'grid',
      showRole: true,
      showJoinDate: true,
      maxPublic: 5, // Only show 5 in public view
      template: {
        avatar: 'member.user.avatarUrl',
        name: 'member.user.name',
        role: 'member.role',
        joinedAt: 'member.grantedAt'
      }
    },
    {
      type: 'TextBlockProp',
      dataSource: 'domain.verification.badge',
      condition: 'domain.customDomainVerified',
      style: 'badge'
    }
  ]
}
```

**Why it matters:** Makes the domain feel human and trustworthy.

---

### **Frame D: Domain Operations**

**Purpose:** Admin controls to manage the domain  
**Visibility:** **Admin Only**  
**Layout:** `{ x: 0, y: 10, w: 6, h: 8 }`  
**Pattern:** `form`

**Shows:**
- Domain slug + description fields
- DNS/SSL verification status
- "Verify domain" button
- "Add domain" / "Connect custom domain"
- Nameserver info and copy buttons

**Props:**
```typescript
{
  props: [
    {
      type: 'HeadingProp',
      value: 'Domain Operations',
      level: 2
    },
    {
      type: 'FormProp',
      fields: [
        {
          name: 'name',
          label: 'Domain Name',
          type: 'text',
          dataSource: 'domain.name',
          editable: true
        },
        {
          name: 'slug',
          label: 'Domain Slug',
          type: 'text',
          dataSource: 'domain.slug',
          editable: true,
          validation: { pattern: '^[a-z0-9-]+$' }
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          dataSource: 'domain.description',
          editable: true
        }
      ],
      submitButton: {
        label: 'Save Changes',
        engagementTemplate: 'domain.admin.update'
      }
    },
    {
      type: 'StatusCardProp',
      title: 'DNS Configuration',
      dataSource: 'domain.dns',
      showStatus: true,
      showDetails: true
    },
    {
      type: 'ActionButtonProp',
      label: 'Verify Domain',
      engagementTemplate: 'domain.admin.verify',
      variant: 'primary',
      condition: '!domain.customDomainVerified'
    },
    {
      type: 'ActionButtonProp',
      label: 'Add Custom Domain',
      engagementTemplate: 'domain.admin.addCustomDomain',
      variant: 'secondary'
    },
    {
      type: 'CopyableTextProp',
      label: 'Nameservers',
      dataSource: 'domain.dns.nameservers',
      display: 'list'
    }
  ]
}
```

**Why it matters:** Replaces/absorbs "Root Dashboard → Domain Settings" UI.

---

### **Frame E: Keys / Integrations / Agents**

**Purpose:** Admin view of AI plumbing  
**Visibility:** **Admin Only**  
**Layout:** `{ x: 6, y: 10, w: 6, h: 8 }`  
**Pattern:** `canvas`

**Shows:**
- OpenAI key (state: active / fallback)
- Anthropic key (state)
- Agent assignments (which agent is primary for this domain)
- [Later] MCP connection health

**Props:**
```typescript
{
  props: [
    {
      type: 'HeadingProp',
      value: 'AI & Integrations',
      level: 2
    },
    {
      type: 'KeyStatusCardProp',
      title: 'OpenAI',
      dataSource: 'domain.keys.openai',
      showStatus: true,
      showLastUsed: true,
      actionButton: {
        label: 'Edit',
        engagementTemplate: 'domain.admin.editApiKey',
        params: { provider: 'openai' }
      }
    },
    {
      type: 'KeyStatusCardProp',
      title: 'Anthropic',
      dataSource: 'domain.keys.anthropic',
      showStatus: true,
      showLastUsed: true,
      actionButton: {
        label: 'Edit',
        engagementTemplate: 'domain.admin.editApiKey',
        params: { provider: 'anthropic' }
      }
    },
    {
      type: 'ActionButtonProp',
      label: 'Manage Your API Keys',
      link: '/settings/api-keys',
      variant: 'secondary'
    },
    {
      type: 'AIAssistantProp',
      title: 'Primary Agent',
      dataSource: 'domain.primaryAgent',
      showConfig: true,
      actionButton: {
        label: 'Assign Agent',
        engagementTemplate: 'domain.admin.assignAgent'
      }
    }
  ]
}
```

**Why it matters:** This is where Kip (or whoever) lives.

---

## 🎬 Engagement Templates (Domain Verbs)

### **What Are They?**
Engagement Templates are the "verbs" of the Domain. They define **how actions happen** inside frames.

### **Domain Keeper Type Engagement Templates:**

```typescript
const DOMAIN_ENGAGEMENT_TEMPLATES = [
  {
    id: 'domain.public.contact',
    name: 'Contact Domain',
    visibility: 'public',
    inputs: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'message', type: 'textarea', required: true }
    ],
    endpoint: '/api/domains/:domainId/contact',
    successMessage: 'Message sent!'
  },
  
  {
    id: 'domain.admin.update',
    name: 'Update Domain Info',
    visibility: 'admin',
    inputs: [
      { name: 'name', type: 'text' },
      { name: 'slug', type: 'text' },
      { name: 'description', type: 'textarea' }
    ],
    endpoint: 'PATCH /api/domains/:domainId',
    successMessage: 'Domain updated successfully'
  },
  
  {
    id: 'domain.admin.verify',
    name: 'Verify Domain',
    visibility: 'admin',
    inputs: [],
    endpoint: 'POST /api/domains/:domainId/verify',
    successMessage: 'Verification initiated'
  },
  
  {
    id: 'domain.admin.addCustomDomain',
    name: 'Add Custom Domain',
    visibility: 'admin',
    inputs: [
      { name: 'customDomain', type: 'text', required: true, placeholder: 'yourdomain.com' }
    ],
    endpoint: 'POST /api/domains/:domainId/custom-domain',
    successMessage: 'Custom domain added. Configure DNS to verify.'
  },
  
  {
    id: 'domain.admin.editApiKey',
    name: 'Edit API Key',
    visibility: 'admin',
    inputs: [
      { name: 'provider', type: 'hidden' },
      { name: 'apiKey', type: 'password', required: true }
    ],
    endpoint: 'POST /api/kip/user-keys',
    successMessage: 'API key updated'
  },
  
  {
    id: 'domain.admin.assignAgent',
    name: 'Assign Primary Agent',
    visibility: 'admin',
    inputs: [
      { name: 'agentId', type: 'select', required: true, dataSource: '/api/kip/agents' }
    ],
    endpoint: 'PATCH /api/domains/:domainId',
    params: { primaryAgentId: ':agentId' },
    successMessage: 'Primary agent assigned'
  }
];
```

### **How They Work:**

1. **Frame includes an ActionButton or Form**
2. **Button/Form references an Engagement Template ID**
3. **Click triggers the template:**
   - Shows modal/inline form if inputs needed
   - Collects data
   - Hits the endpoint
   - Shows success/error state
4. **Board refreshes to show updated data**

---

## 📊 API Response Structure

### **Single Endpoint:** `GET /api/domains/:id/board-data`

**Returns everything needed for all frames:**

```typescript
interface DomainBoardData {
  // Domain metadata (Frame A)
  domain: {
    id: string;
    name: string;
    slug: string;
    description: string;
    status: 'active' | 'pending' | 'suspended';
    createdAt: Date;
    theme: {
      coverImage?: string;
      primaryColor?: string;
    };
  };
  
  // Content (Frame B)
  keepers: Array<{
    id: string;
    title: string;
    purpose: string;
    theme: {
      coverImage?: string;
    };
    journeyCount: number;
  }>;
  
  journeys: Array<{
    id: string;
    name: string;
    forward: string;
    createdAt: Date;
  }>;
  
  boards: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  
  // People (Frame C)
  members: Array<{
    id: string;
    role: 'owner' | 'admin' | 'member' | 'guest';
    grantedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  
  verification: {
    badge?: string; // "Verified domain of John Doe"
  };
  
  // Operations (Frame D) - Admin only
  dns?: {
    configured: boolean;
    verified: boolean;
    nameservers: string[];
    records?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  };
  
  ssl?: {
    issued: boolean;
    pending: boolean;
    expiresAt?: Date;
  };
  
  customDomains?: Array<{
    domain: string;
    verified: boolean;
    status: string;
  }>;
  
  // Keys & Integrations (Frame E) - Admin only
  keys?: {
    openai: {
      configured: boolean;
      status: 'active' | 'fallback' | 'missing';
      lastUsed?: Date;
    };
    anthropic: {
      configured: boolean;
      status: 'active' | 'fallback' | 'missing';
      lastUsed?: Date;
    };
  };
  
  primaryAgent?: {
    id: string;
    name: string;
    slug: string;
    agentClass: string;
  };
  
  // Engagement Templates
  actions: Array<{
    id: string;
    name: string;
    visibility: 'public' | 'admin';
    availableInFrame: string;
  }>;
  
  // Permissions (for frame visibility)
  viewerPermissions: {
    isOwner: boolean;
    isAdmin: boolean;
    canEdit: boolean;
    role?: string;
  };
}
```

---

## 🔒 Visibility Rules

### **Frame Visibility Logic:**

```typescript
function isFrameVisible(frame: Frame, viewer: Viewer): boolean {
  const visibilityRules = {
    'hero-identity': true,           // Always visible
    'activity-assets': true,         // Always visible
    'people-membership': true,       // Always visible
    'domain-operations': viewer.isAdmin,  // Admin only
    'keys-integrations': viewer.isAdmin,  // Admin only
  };
  
  return visibilityRules[frame.id] ?? false;
}
```

### **Data Filtering:**

```typescript
function filterBoardData(data: DomainBoardData, viewer: Viewer): DomainBoardData {
  if (viewer.isAdmin) {
    return data; // Return everything
  }
  
  // Public view: remove admin-only sections
  return {
    ...data,
    dns: undefined,
    ssl: undefined,
    customDomains: undefined,
    keys: undefined,
    members: data.members.slice(0, 5), // Limit to 5 for public
    actions: data.actions.filter(a => a.visibility === 'public')
  };
}
```

---

## 🎯 Implementation Phases

### **Phase 1: Update Seed Data** ✅
- Modify `design-boards.seed.ts`
- Change Domain Management template to 5 frames (A-E)
- Set correct layouts and prop types

### **Phase 2: API Endpoint**
- Create `GET /api/domains/:id/board-data`
- Implement data aggregation
- Add permission checks
- Return formatted response

### **Phase 3: Engagement Templates Model**
- Define `engagement_templates` table (or use existing)
- Link to KeeperType
- Create domain-specific templates
- Build template executor

### **Phase 4: Frame Visibility**
- Implement visibility logic in board renderer
- Filter data based on viewer role
- Show/hide admin frames

### **Phase 5: Interactive Props**
- Build ActionButtonProp component
- Build FormProp component
- Build KeyStatusCardProp component
- Connect to engagement templates

---

## 📋 Summary

**The Domain Design Board is:**
- ✅ **One board**, not multiple dashboards
- ✅ **5 frames** (3 public, 2 admin-only)
- ✅ **Frame visibility** controls what viewers see
- ✅ **Engagement Templates** for all actions
- ✅ **Single API endpoint** feeds all frames
- ✅ **Canonical surface** for domain management

**It replaces:**
- ❌ Root Dashboard → Domain Settings
- ❌ Separate admin pages
- ❌ Multiple navigation flows

**Next Steps:**
1. Update Domain template seed (5 frames)
2. Build `/api/domains/:id/board-data` endpoint
3. Define Engagement Templates
4. Implement frame visibility
5. Build interactive prop components

---

**Status:** ✅ Specification Complete - Ready for Implementation  
**Design Authority:** Canonical  
**Approval:** User-Provided Requirements

