# Engagement Templates - Review & Implementation Plan

**Date:** November 1, 2025  
**Purpose:** Review current implementations and plan Engagement Template system  
**Type:** Analysis Report (No Code Changes)

---

## 📋 Executive Summary

**Current State:**
- ✅ Engagement Templates **table exists** in database
- ✅ 5 templates exist (all keeper/memory-focused)
- ✅ Infrastructure is in place (fields, styles, keeper-type junction)
- ❌ **NO execution engine** - templates are just data
- ❌ **NO domain-specific templates** exist
- ❌ Domain operations use **hardcoded endpoints**, not templates

**Gap:** The templates table exists but there's no **runtime executor** that:
- Takes a template + inputs
- Calls the appropriate API endpoint
- Handles success/error states
- Returns results to the UI

---

## 🔍 Part 1: Current Engagement Template System

### **Database Schema (Existing)**

**File:** `packages/database/prisma/schema.prisma`

#### 1. Main Table: `engagement_templates`
```prisma
model engagement_templates {
  id                               String                @id @db.Uuid
  label                            String                // Display name
  slug                             String                @unique  // Identifier
  type                             String                // 'memory', 'timeline', 'identity'
  targetType                       String                // 'keeper', 'domain', 'journey'
  icon                             String?               // Icon identifier
  style                            Json?                 // Visual styling
  config                           Json?                 // Additional configuration
  createdAt                        DateTime              @default(now())
  updatedAt                        DateTime
  keeperId                         String?               // Optional keeper scope
  system                           Boolean               @default(false)
  
  // Relations
  engagement_fields                engagement_fields[]
  engagement_styles                engagement_styles[]
  Keeper                           Keeper?
  keeper_type_engagement_templates keeper_type_engagement_templates[]
}
```

#### 2. Fields Table: `engagement_fields`
```prisma
model engagement_fields {
  id                   String               @id @db.Uuid
  templateId           String               @db.Uuid
  label                String               // Field label
  type                 String               // 'text', 'textarea', 'email', etc.
  name                 String               // Field name
  placeholder          String?              // Placeholder text
  config               Json?                // Validation, etc.
  order                Int                  @default(0)
  createdAt            DateTime             @default(now())
  engagement_templates engagement_templates @relation(...)
}
```

#### 3. Styles Table: `engagement_styles`
```prisma
model engagement_styles {
  id                   String               @id @db.Uuid
  templateId           String               @db.Uuid
  variant              String               // Style variant name
  style                Json?                // Style properties
  createdAt            DateTime             @default(now())
  engagement_templates engagement_templates @relation(...)
}
```

#### 4. KeeperType Junction: `keeper_type_engagement_templates`
```prisma
model keeper_type_engagement_templates {
  id                     String               @id @default(uuid())
  keeper_type_id         String
  engagement_template_id String               @db.Uuid
  created_at             DateTime             @default(now())
  
  engagement_templates   engagement_templates @relation(...)
  KeeperType             KeeperType           @relation(...)
  
  @@unique([keeper_type_id, engagement_template_id])
}
```

### **Existing Templates in Database**

**Count:** 5 templates (all system templates)

| Label | Slug | Type | Target | Purpose |
|-------|------|------|--------|---------|
| Echo Writer | echo_writer | memory | keeper | Memory management |
| Reflection Journal | reflection_journal | memory | keeper | Reflection processing |
| Identity Logbook | identity_logbook | timeline | keeper | Identity tracking |
| Voice Panel | voice_panel | identity | keeper | Voice interaction |
| MemoryCard Generator | memorycard_generator | memory | keeper | Memory cards |

**Observations:**
- All templates target `keeper` entity
- All are SOLE/memory-focused
- NO fields defined (engagement_fields empty)
- NO styles defined (engagement_styles empty)
- Linked to "AI SOLE Keeper" KeeperType
- **NO execution logic** - they're metadata only

### **Frontend Display (Existing)**

**File:** `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx`

**Current State:**
- Displays mock data (not reading from database)
- "Coming Soon" banner
- Shows content types and engagement processes
- **NO creation or execution functionality**

**Quote from file:**
> "Coming Soon: Engagement Templates will combine Content Types and Engagement Processes 
> to create structured keeper interaction patterns. Template creation and management tools are in development."

---

## 🔧 Part 2: Current Hardcoded Implementations

### **What Currently Exists (NOT as Engagement Templates)**

#### 1. Domain Verification
**Location:** `apps/api/src/api/domains/custom-domain-routes.ts`

**Endpoints:**
```typescript
POST   /api/domains/:domainId/custom-domain          // Add custom domain
POST   /api/domains/:domainId/custom-domain/verify   // Verify DNS
GET    /api/domains/:domainId/custom-domain/status   // Check status
GET    /api/domains/:domainId/custom-domain/dns      // Get DNS records
DELETE /api/domains/:domainId/custom-domain          // Remove domain
```

**Flow:**
1. User provides custom domain name
2. System calls Vercel API to add domain
3. Returns DNS records to configure
4. User configures DNS
5. User clicks "Verify"
6. System checks Vercel API
7. Updates `customDomainVerified` flag

**Services Used:**
- `VercelDomainManagerService` - Lines 1-355
- `DomainVerificationService` - Built-in class

#### 2. Domain Update (Name, Slug, Description)
**Location:** `apps/api/src/api/domains/routes.ts`

**Endpoints:**
```typescript
PUT   /api/domains/:id    // Full update
PATCH /api/domains/:id    // Partial update
```

**Flow:**
1. User edits domain fields
2. Frontend calls PATCH with changed fields
3. Backend validates with zod schema
4. Updates domain via `domainService.updateDomain()`
5. Returns updated domain

#### 3. API Key Management
**Location:** `apps/api/src/api/kip/user-keys.ts`

**Endpoints:**
```typescript
GET    /api/kip/user-keys              // List user's keys
POST   /api/kip/user-keys              // Add/update key
DELETE /api/kip/user-keys/:provider    // Delete key
GET    /api/kip/user-keys/providers    // List providers
```

**Flow:**
1. User provides provider + API key
2. Backend validates provider (openai, anthropic, together, elevenlabs)
3. Stores via `KipUserKeyService.setUserKey()`
4. Returns success/failure

**Service Used:**
- `KipUserKeyService` - Encryption, storage, retrieval

#### 4. Member Management
**Location:** `apps/api/src/api/domains/routes.ts`

**Endpoints:**
```typescript
GET    /api/domains/:id/members          // List members
POST   /api/domains/:id/members          // Add member
PATCH  /api/domains/:id/members/:userId  // Update role
DELETE /api/domains/:id/members/:userId  // Remove member
```

**Flow:**
1. Admin searches users
2. Selects user and role
3. Backend creates `DomainPermission` record
4. Returns created permission

**Service Used:**
- `DomainPermissionService`

#### 5. Contact Domain (NOT IMPLEMENTED)
**Status:** ❌ Does not exist

**Would Need:**
- Endpoint to accept contact form
- Email notification service
- Rate limiting
- Spam protection

---

## 🎯 Part 3: Engagement Templates Needed for Domain

### **The 6 Required Templates**

#### **1. domain.public.contact**
**Purpose:** Public contact form  
**Visibility:** Public  
**Target Frame:** Hero / Identity (Frame A)

**Current State:** ❌ Not implemented  
**Needs:**
```typescript
{
  slug: 'domain.public.contact',
  label: 'Contact Domain',
  type: 'form',
  targetType: 'domain',
  visibility: 'public',
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Your Name' },
    { name: 'email', type: 'email', required: true, label: 'Email' },
    { name: 'message', type: 'textarea', required: true, label: 'Message' }
  ],
  action: {
    endpoint: '/api/domains/:domainId/contact',
    method: 'POST',
    successMessage: 'Message sent! We\'ll get back to you soon.'
  }
}
```

**Required Endpoint:** `POST /api/domains/:domainId/contact`

---

#### **2. domain.admin.update**
**Purpose:** Update domain info (name, slug, description)  
**Visibility:** Admin  
**Target Frame:** Domain Operations (Frame D)

**Current State:** ✅ **Endpoints exist** (`PATCH /api/domains/:id`)  
**Needs:** Wrap existing endpoint in template format

```typescript
{
  slug: 'domain.admin.update',
  label: 'Update Domain Info',
  type: 'form',
  targetType: 'domain',
  visibility: 'admin',
  fields: [
    { name: 'name', type: 'text', label: 'Domain Name', dataSource: 'domain.name' },
    { name: 'slug', type: 'text', label: 'Slug', dataSource: 'domain.slug', validation: { pattern: '^[a-z0-9-]+$' } },
    { name: 'description', type: 'textarea', label: 'Description', dataSource: 'domain.description' }
  ],
  action: {
    endpoint: '/api/domains/:domainId',
    method: 'PATCH',
    successMessage: 'Domain updated successfully'
  }
}
```

**Required:** ✅ Already exists (just needs template wrapper)

---

#### **3. domain.admin.verify**
**Purpose:** Verify custom domain DNS configuration  
**Visibility:** Admin  
**Target Frame:** Domain Operations (Frame D)

**Current State:** ✅ **Endpoints exist** (`POST /api/domains/:domainId/custom-domain/verify`)  
**Needs:** Wrap existing endpoint in template format

```typescript
{
  slug: 'domain.admin.verify',
  label: 'Verify Domain',
  type: 'action',
  targetType: 'domain',
  visibility: 'admin',
  fields: [], // No inputs needed
  action: {
    endpoint: '/api/domains/:domainId/custom-domain/verify',
    method: 'POST',
    successMessage: 'Domain verified successfully!',
    errorMessages: {
      'DNS_NOT_CONFIGURED': 'DNS records not configured properly. Please check nameservers.',
      'VERIFICATION_FAILED': 'Verification failed. DNS may need more time to propagate (up to 48h).'
    }
  }
}
```

**Required:** ✅ Already exists (just needs template wrapper)

---

#### **4. domain.admin.addCustomDomain**
**Purpose:** Add a custom domain to Vercel project  
**Visibility:** Admin  
**Target Frame:** Domain Operations (Frame D)

**Current State:** ✅ **Endpoints exist** (`POST /api/domains/:domainId/custom-domain`)  
**Needs:** Wrap existing endpoint in template format

```typescript
{
  slug: 'domain.admin.addCustomDomain',
  label: 'Add Custom Domain',
  type: 'form',
  targetType: 'domain',
  visibility: 'admin',
  fields: [
    { 
      name: 'customDomain', 
      type: 'text', 
      required: true, 
      label: 'Custom Domain',
      placeholder: 'yourdomain.com',
      validation: { 
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]*\\.[a-zA-Z]{2,}$',
        message: 'Must be a valid domain (e.g., example.com)'
      }
    }
  ],
  action: {
    endpoint: '/api/domains/:domainId/custom-domain',
    method: 'POST',
    successMessage: 'Custom domain added. Configure your DNS with the provided records.',
    responseMapping: {
      dnsRecords: 'dns.records'
    }
  }
}
```

**Required:** ✅ Already exists (just needs template wrapper)

---

#### **5. domain.admin.editApiKey**
**Purpose:** Add/edit API keys for model providers  
**Visibility:** Admin  
**Target Frame:** Keys / Integrations (Frame E)

**Current State:** ✅ **Endpoints exist** (`POST /api/kip/user-keys`)  
**Needs:** Wrap existing endpoint in template format

```typescript
{
  slug: 'domain.admin.editApiKey',
  label: 'Edit API Key',
  type: 'form',
  targetType: 'domain', // Actually user-scoped, but shown in domain context
  visibility: 'admin',
  fields: [
    { 
      name: 'provider', 
      type: 'select',
      required: true,
      label: 'Provider',
      options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'together', label: 'Together AI' },
        { value: 'elevenlabs', label: 'ElevenLabs' }
      ]
    },
    { 
      name: 'apiKey', 
      type: 'password', 
      required: true, 
      label: 'API Key',
      placeholder: 'sk-...'
    }
  ],
  action: {
    endpoint: '/api/kip/user-keys',
    method: 'POST',
    successMessage: 'API key saved successfully',
    errorMessages: {
      'INVALID_KEY': 'Invalid API key format',
      'PROVIDER_ERROR': 'Failed to validate key with provider'
    }
  }
}
```

**Required:** ✅ Already exists (just needs template wrapper)

---

#### **6. domain.admin.assignAgent**
**Purpose:** Assign primary AI agent to domain  
**Visibility:** Admin  
**Target Frame:** Keys / Integrations (Frame E)

**Current State:** ❌ **Not implemented** (domains don't have primaryAgentId yet)  
**Needs:** New endpoint + schema change

```typescript
{
  slug: 'domain.admin.assignAgent',
  label: 'Assign Primary Agent',
  type: 'form',
  targetType: 'domain',
  visibility: 'admin',
  fields: [
    { 
      name: 'agentId', 
      type: 'select',
      required: true,
      label: 'Select Agent',
      dataSource: '/api/kip/agents', // Fetch available agents
      displayField: 'name',
      valueField: 'id'
    }
  ],
  action: {
    endpoint: '/api/domains/:domainId',
    method: 'PATCH',
    body: {
      settings: {
        primaryAgentId: ':agentId'
      }
    },
    successMessage: 'Primary agent assigned successfully'
  }
}
```

**Required:** 
- ✅ Update endpoint exists (`PATCH /api/domains/:id`)
- ❌ Need to add `primaryAgentId` to domain.settings or domain table

---

## 📊 Part 4: Gap Analysis

### **What Exists:**

| Component | Status | Location |
|-----------|--------|----------|
| Database schema | ✅ Complete | `schema.prisma` lines 380-419, 759-770 |
| Template records | ✅ 5 keeper templates | Database |
| Junction table | ✅ Functional | `keeper_type_engagement_templates` |
| Domain update API | ✅ Working | `/api/domains/:id` (PATCH/PUT) |
| DNS verification API | ✅ Working | `/api/domains/:domainId/custom-domain/verify` |
| Custom domain API | ✅ Working | `/api/domains/:domainId/custom-domain` |
| API key management | ✅ Working | `/api/kip/user-keys` |
| Member management | ✅ Working | `/api/domains/:id/members` |

### **What's Missing:**

| Component | Status | Impact |
|-----------|--------|--------|
| Template executor | ❌ Missing | **Critical** - No runtime execution |
| Domain templates | ❌ Missing | Need 6 templates seeded |
| Contact endpoint | ❌ Missing | Need to implement |
| Agent assignment | ❌ Missing | Need schema + endpoint |
| Template → Endpoint mapping | ❌ Missing | **Critical** - No connection |
| UI components for templates | ❌ Missing | Can't trigger templates from UI |
| Success/error handling | ❌ Missing | No feedback loop |

---

## 🏗️ Part 5: Implementation Strategy

### **Approach: Wrap Existing Endpoints**

**Philosophy:**
- ✅ Keep all existing API endpoints
- ✅ Don't refactor working code
- ✅ Add engagement template **layer on top**
- ✅ Templates become **declarative wrappers** for existing logic

### **Architecture:**

```
User Action (Button Click)
    ↓
Engagement Template (Metadata)
    ↓
Template Executor (Runtime)
    ↓
Existing API Endpoint
    ↓
Service Layer (Unchanged)
    ↓
Database
```

### **Components Needed:**

#### **1. Template Executor Service** (Backend)
**File:** `apps/api/src/services/EngagementTemplateExecutor.ts`

**Responsibilities:**
- Load template by slug
- Validate inputs against template fields
- Replace placeholders (:domainId, etc.)
- Call the target endpoint
- Transform response
- Return standardized result

**Pseudocode:**
```typescript
class EngagementTemplateExecutor {
  async execute(templateSlug: string, context: { domainId, userId, inputs }) {
    // 1. Load template from database
    const template = await loadTemplate(templateSlug);
    
    // 2. Validate inputs against fields
    validateInputs(template.fields, context.inputs);
    
    // 3. Check permissions (visibility: public/admin)
    checkPermissions(template.visibility, context.userId, context.domainId);
    
    // 4. Build API call
    const endpoint = replaceParams(template.action.endpoint, context);
    const body = buildRequestBody(template.action.body, context.inputs);
    
    // 5. Execute API call
    const response = await fetch(endpoint, {
      method: template.action.method,
      body: JSON.stringify(body)
    });
    
    // 6. Handle response
    if (response.ok) {
      return {
        success: true,
        message: template.action.successMessage,
        data: await response.json()
      };
    } else {
      const errorCode = getErrorCode(response);
      return {
        success: false,
        message: template.action.errorMessages[errorCode] || 'Action failed',
        error: errorCode
      };
    }
  }
}
```

#### **2. Template Executor API Endpoint** (Backend)
**File:** `apps/api/src/api/engagement/execute.ts`

**Endpoint:** `POST /api/engagement/execute`

**Request:**
```json
{
  "templateSlug": "domain.admin.verify",
  "context": {
    "domainId": "uuid",
    "entityType": "domain",
    "entityId": "uuid"
  },
  "inputs": {
    // Field values if needed
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain verified successfully!",
  "data": {
    // API response data
  }
}
```

#### **3. Frontend Template Trigger Component**
**File:** `apps/web/src/components/engagement/EngagementButton.tsx`

**Usage in Props:**
```tsx
<EngagementButton
  templateSlug="domain.admin.verify"
  context={{ domainId, entityType: 'domain', entityId: domainId }}
  variant="primary"
  onSuccess={(result) => {
    toast.success(result.message);
    refreshBoardData();
  }}
  onError={(error) => {
    toast.error(error.message);
  }}
>
  Verify Domain
</EngagementButton>
```

**Behavior:**
1. Fetches template definition
2. If template has fields, shows modal with form
3. Collects inputs
4. Calls `/api/engagement/execute`
5. Shows success/error message
6. Triggers callbacks

---

## 📋 Part 6: Conversion Plan (Hardcoded → Templates)

### **Template 1: domain.public.contact**
**Status:** ❌ Need to create endpoint + template

**Steps:**
1. Create endpoint: `POST /api/domains/:id/contact`
2. Implement email notification logic
3. Seed engagement template with form fields
4. Link to Domain KeeperType
5. Add EngagementButton to Frame A props

**Complexity:** Medium (new endpoint needed)

---

### **Template 2: domain.admin.update**
**Status:** ✅ Endpoint exists, just wrap it

**Steps:**
1. Create template record with fields (name, slug, description)
2. Link to Domain KeeperType
3. Point to existing `PATCH /api/domains/:id`
4. Add template execution call from Frame D
5. **No changes to existing endpoint**

**Complexity:** Low (just metadata)

---

### **Template 3: domain.admin.verify**
**Status:** ✅ Endpoint exists, just wrap it

**Steps:**
1. Create template record (no fields needed)
2. Link to Domain KeeperType
3. Point to existing `POST /api/domains/:id/custom-domain/verify`
4. Map error codes to user messages
5. **No changes to existing endpoint**

**Complexity:** Low (just metadata)

---

### **Template 4: domain.admin.addCustomDomain**
**Status:** ✅ Endpoint exists, just wrap it

**Steps:**
1. Create template record with field (customDomain input)
2. Link to Domain KeeperType
3. Point to existing `POST /api/domains/:id/custom-domain`
4. Handle response (DNS records display)
5. **No changes to existing endpoint**

**Complexity:** Low (just metadata)

---

### **Template 5: domain.admin.editApiKey**
**Status:** ✅ Endpoint exists, just wrap it

**Steps:**
1. Create template record with fields (provider, apiKey)
2. Link to Domain KeeperType
3. Point to existing `POST /api/kip/user-keys`
4. Add provider dropdown options
5. **No changes to existing endpoint**

**Complexity:** Low (just metadata)

---

### **Template 6: domain.admin.assignAgent**
**Status:** ⚠️ Partially exists

**Steps:**
1. Add `primaryAgentId` to Domain (schema change) OR use settings.primaryAgentId
2. Create template record with field (agentId select)
3. Link to Domain KeeperType
4. Point to existing `PATCH /api/domains/:id`
5. Fetch agent list dynamically

**Complexity:** Medium (schema change optional)

---

## 🔧 Part 7: How Execution Will Work

### **Flow Diagram:**

```
┌─────────────────────────────────────────┐
│ Frame D: Domain Operations              │
│                                         │
│ [Form: Name, Slug, Description]         │
│                                         │
│ <ActionButtonProp                       │
│   label="Save Changes"                  │
│   engagementTemplate="domain.admin.update"
│   variant="primary"                     │
│ />                                      │
└─────────────────────────────────────────┘
            ↓ User clicks button
            
┌─────────────────────────────────────────┐
│ EngagementButton Component              │
│ (Frontend)                              │
└─────────────────────────────────────────┘
            ↓ 1. Loads template metadata
            ↓ 2. Collects form values
            ↓ 3. Calls executor API
            
┌─────────────────────────────────────────┐
│ POST /api/engagement/execute            │
│ {                                       │
│   templateSlug: "domain.admin.update",  │
│   context: { domainId },                │
│   inputs: { name, slug, description }   │
│ }                                       │
└─────────────────────────────────────────┘
            ↓ 4. Executor loads template
            ↓ 5. Validates inputs
            ↓ 6. Checks permissions
            ↓ 7. Calls target endpoint
            
┌─────────────────────────────────────────┐
│ PATCH /api/domains/:id                  │
│ (Existing endpoint - unchanged)         │
└─────────────────────────────────────────┘
            ↓ 8. Updates domain
            ↓ 9. Returns result
            
┌─────────────────────────────────────────┐
│ EngagementButton Component              │
│ - Shows success message                 │
│ - Triggers onSuccess callback           │
│ - Refreshes board data                  │
└─────────────────────────────────────────┘
```

---

## 📊 Part 8: Data Model for Domain Templates

### **Template Record Structure:**

```typescript
{
  id: 'uuid',
  label: 'Update Domain Info',
  slug: 'domain.admin.update',
  type: 'form',
  targetType: 'domain',
  icon: 'pencil',
  system: true,
  config: {
    visibility: 'admin',
    requiresConfirmation: false,
    showInFrames: ['domain-operations']
  },
  style: {},
  
  // No keeperId (domain-scoped, not keeper-scoped)
  
  // Action configuration (new field or in config JSON)
  action: {
    endpoint: '/api/domains/:domainId',
    method: 'PATCH',
    successMessage: 'Domain updated successfully',
    errorMessages: {
      'SLUG_EXISTS': 'That slug is already taken',
      'INVALID_NAME': 'Domain name must be 1-100 characters'
    },
    refreshAfter: true
  }
}
```

### **Fields (engagement_fields):**

```typescript
// For domain.admin.update
[
  {
    id: 'uuid1',
    templateId: 'template-id',
    label: 'Domain Name',
    type: 'text',
    name: 'name',
    placeholder: 'My Domain',
    config: {
      required: true,
      minLength: 1,
      maxLength: 100,
      dataSource: 'domain.name' // Pre-fill from board data
    },
    order: 0
  },
  {
    id: 'uuid2',
    templateId: 'template-id',
    label: 'Slug',
    type: 'text',
    name: 'slug',
    placeholder: 'my-domain',
    config: {
      required: true,
      pattern: '^[a-z0-9-]+$',
      dataSource: 'domain.slug'
    },
    order: 1
  },
  {
    id: 'uuid3',
    templateId: 'template-id',
    label: 'Description',
    type: 'textarea',
    name: 'description',
    placeholder: 'Describe your domain...',
    config: {
      maxLength: 500,
      dataSource: 'domain.description'
    },
    order: 2
  }
]
```

---

## 🎯 Part 9: Implementation Approach

### **Phase 3A: Core Infrastructure (Critical)**

**Files to Create:**
1. `apps/api/src/services/EngagementTemplateExecutor.ts` (~200 lines)
2. `apps/api/src/api/engagement/execute.ts` (~100 lines)
3. `apps/web/src/components/engagement/EngagementButton.tsx` (~150 lines)
4. `apps/web/src/components/engagement/EngagementModal.tsx` (~200 lines)

**What They Do:**
- **Executor:** Runtime engine that executes templates
- **API:** Endpoint to trigger execution
- **Button:** UI component to trigger templates
- **Modal:** Form display when template has fields

**Complexity:** Medium-High (~4-6 hours)

---

### **Phase 3B: Domain Template Seeds** (Required)

**File to Create:**
`packages/database/prisma/seeds/domain-engagement-templates.seed.ts`

**Seeds 6 Templates:**
1. domain.public.contact (needs new endpoint)
2. domain.admin.update (wraps existing)
3. domain.admin.verify (wraps existing)
4. domain.admin.addCustomDomain (wraps existing)
5. domain.admin.editApiKey (wraps existing)
6. domain.admin.assignAgent (wraps existing, needs settings update)

**Complexity:** Low (~1-2 hours)  
**Blocker:** Need template executor first to test

---

### **Phase 3C: Missing Endpoints** (Optional)

**1. Contact Form Endpoint**
**File:** `apps/api/src/api/domains/contact.ts`

```typescript
POST /api/domains/:id/contact
Body: { name, email, message }
```

**Needs:**
- Email service integration
- Rate limiting
- Spam protection
- Notification to domain owner

**Complexity:** Medium (~2-3 hours)

**2. Agent Assignment Support**

**Option A:** Use `domain.settings` JSON (no schema change)
```typescript
PATCH /api/domains/:id
Body: { 
  settings: { 
    primaryAgentId: "uuid" 
  } 
}
```

**Option B:** Add field to Domain model (requires migration)
```prisma
model Domain {
  // ... existing fields
  primaryAgentId  String?     @db.Uuid
  primaryAgent    kip_agents? @relation(...)
}
```

**Recommendation:** Option A (simpler, no migration)  
**Complexity:** Low (endpoint already exists)

---

## 🔍 Part 10: Conversion Process (Hardcoded → Template)

### **Example: DNS Verification**

**Before (Hardcoded):**
```tsx
// In some admin page
<button onClick={async () => {
  const response = await fetch(`/api/domains/${domainId}/custom-domain/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    alert('Verified!');
    reloadDomain();
  } else {
    alert('Failed');
  }
}}>
  Verify Domain
</button>
```

**After (Template-Driven):**
```tsx
// In Domain Design Board Frame D
<ActionButtonProp
  label="Verify Domain"
  engagementTemplate="domain.admin.verify"
  variant="primary"
  onSuccess={() => refreshBoardData()}
/>
```

**Template Record:**
```json
{
  "slug": "domain.admin.verify",
  "label": "Verify Domain",
  "type": "action",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "endpoint": "/api/domains/:domainId/custom-domain/verify",
    "method": "POST",
    "successMessage": "Domain verified successfully!"
  }
}
```

**What Changed:**
- ✅ Button is now declarative (prop-based)
- ✅ Logic moved to executor service
- ✅ Endpoint unchanged
- ✅ Success/error handling standardized
- ✅ Reusable across multiple boards/frames

---

## 📊 Part 11: Implementation Phases

### **Phase 3A: Core Executor (Week 1)**
**Time:** 6-8 hours

**Deliverables:**
1. ✅ EngagementTemplateExecutor service
2. ✅ POST /api/engagement/execute endpoint
3. ✅ EngagementButton component
4. ✅ EngagementModal component
5. ✅ Basic error handling

**Test:** Execute one simple template (domain.admin.update)

---

### **Phase 3B: Seed Domain Templates (Week 1)**
**Time:** 2-3 hours

**Deliverables:**
1. ✅ 6 domain templates seeded
2. ✅ Linked to Domain KeeperType
3. ✅ Fields configured
4. ✅ Endpoints mapped

**Test:** All 6 templates load from API

---

### **Phase 3C: Missing Endpoints (Week 2)**
**Time:** 3-4 hours

**Deliverables:**
1. ✅ POST /api/domains/:id/contact
2. ✅ Email notification service
3. ✅ Agent assignment via settings

**Test:** Contact form and agent assignment work

---

### **Phase 3D: Integration (Week 2)**
**Time:** 2-3 hours

**Deliverables:**
1. ✅ ActionButtonProp calls EngagementButton
2. ✅ FormProp integrates with templates
3. ✅ Success/error states in UI
4. ✅ Board data refresh after actions

**Test:** End-to-end flow from button click to data refresh

---

## 🎯 Part 12: Benefits of Template System

### **Before (Hardcoded):**
- ❌ Logic scattered across multiple files
- ❌ No standardization
- ❌ Hard to discover available actions
- ❌ Difficult to add new actions
- ❌ No reusability
- ❌ Permission checks duplicated

### **After (Template-Driven):**
- ✅ Single source of truth (database)
- ✅ Standardized execution
- ✅ Actions discoverable via API
- ✅ New actions = new records (no code)
- ✅ Reusable across boards/frames
- ✅ Permission checks centralized

---

## 📝 Part 13: Schema Extensions Needed

### **Option A: Add Action Config to Templates** (Recommended)

No schema change! Store action config in existing `config` JSON field:

```typescript
config: {
  visibility: 'admin',
  action: {
    endpoint: '/api/domains/:domainId',
    method: 'PATCH',
    successMessage: 'Updated',
    errorMessages: { ... }
  }
}
```

### **Option B: New Action Table** (Over-engineered)

```prisma
model engagement_actions {
  id           String               @id @db.Uuid
  templateId   String               @db.Uuid
  endpoint     String
  method       String
  ...
}
```

**Recommendation:** Option A (simpler)

---

## 🚀 Part 14: Rollout Strategy

### **Stage 1: One Template Working (MVP)**
**Time:** 1-2 days  
**Template:** domain.admin.update

1. Build executor service
2. Build API endpoint
3. Build UI component
4. Seed ONE template
5. Test end-to-end
6. Verify existing endpoint still works

**Success Criteria:**
- Click "Save Changes" in Frame D
- Form modal appears with pre-filled data
- Submit calls template executor
- Executor calls PATCH /api/domains/:id
- Success message appears
- Board data refreshes

---

### **Stage 2: All Domain Templates (Full)**
**Time:** 2-3 days  
**Templates:** All 6

1. Seed remaining 5 templates
2. Build contact endpoint
3. Add agent assignment
4. Test all templates
5. Handle edge cases

**Success Criteria:**
- All 6 action buttons work in frames
- Public contact form works
- DNS verification works
- API key management works
- Agent assignment works

---

### **Stage 3: Other KeeperTypes (Expansion)**
**Time:** Ongoing  
**Templates:** Agent, Journey, Quote, etc.

1. Define templates for other types
2. Seed templates
3. Update their Design Boards
4. Link templates

---

## 📊 Part 15: Summary & Recommendations

### **What Exists:**
- ✅ Database schema (complete)
- ✅ 5 existing keeper templates (reference examples)
- ✅ All necessary API endpoints (5 of 6)
- ✅ Services layer working

### **What's Missing:**
- ❌ Template executor engine (**critical**)
- ❌ Domain templates (need to seed)
- ❌ UI components for execution
- ❌ Contact form endpoint

### **Recommended Approach:**

**DO NOT refactor existing code.**  
**DO wrap it with templates.**

**Step-by-Step:**
1. Build executor (1 service, 1 endpoint, 2 components)
2. Seed 6 domain templates
3. Add contact endpoint
4. Test each template
5. Deploy

**Timeline:**
- **Phase 3A** (Executor): 6-8 hours
- **Phase 3B** (Seeds): 2-3 hours
- **Phase 3C** (Endpoints): 3-4 hours
- **Phase 3D** (Integration): 2-3 hours

**Total: 13-18 hours** (2-3 days of focused work)

---

## 🎯 Part 16: Next Steps

### **For Testing Phase 1-2 (Now):**

When you deploy:
1. Check browser console for `🔍 [Design Boards]` logs
2. Click "Templates" toggle
3. Verify "Domain Design Board" shows 5 frames
4. Test: `curl https://api.ke3p.com/api/domains/DOMAIN_ID/board-data`

### **For Phase 3 (After Testing):**

If Phase 1-2 work:
1. Start with executor service
2. Build one template end-to-end
3. Test thoroughly
4. Expand to all 6 templates

---

## ✅ Key Takeaways

1. **Engagement Templates table exists** but is **not being used for domain actions**
2. **All domain APIs exist** except contact form
3. **Conversion is wrapping**, not rewriting
4. **Executor engine is the missing piece** - this is what makes templates "work"
5. **No breaking changes** - existing endpoints stay intact
6. **Templates are metadata** that describe how to call existing logic

---

**Status:** ✅ Analysis Complete  
**Recommendation:** Build executor in Phase 3  
**Risk Level:** Low (wraps existing, doesn't replace)  
**Ready to Proceed:** Yes (after Phase 1-2 testing)

