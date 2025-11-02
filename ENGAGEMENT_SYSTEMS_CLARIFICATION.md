# Engagement Systems - Complete Clarification

**Date:** November 1, 2025  
**Purpose:** Definitive answer on Engagement Processes vs Engagement Templates

---

## 🎯 DIRECT ANSWER

**YES - You have TWO SEPARATE SYSTEMS:**

### **System A: Engagement Processes**
- **Status:** ❌ **MOCK DATA ONLY** - Not implemented
- **Purpose:** Interaction flow definitions (like "Sequential Dialogue")
- **Database:** ❌ No table exists
- **Used For:** Future feature (not functional)

### **System B: Engagement Templates**
- **Status:** ✅ **FULLY IMPLEMENTED** - Real database + executor
- **Purpose:** Executable actions/forms attached to Keeper Types
- **Database:** ✅ Real tables (engagement_templates, engagement_fields, etc.)
- **Used For:** Domain actions (Verify Domain, Update Info, etc.)

---

## 📊 Part 1: Engagement Processes (UI Surface A)

### **Where Defined:**
**File:** `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx` (Lines 70-98)

### **Model/Table:**
**Answer:** ❌ **NONE** - No database table exists

### **Evidence:**
```typescript
// Lines 70-98 in EngagementTemplatesPage.tsx
const mockEngagementProcesses: EngagementProcess[] = [
  {
    id: 'sole-dialogue',
    name: 'SOLE Dialogue',
    description: 'Self-Organizing Learning Environment conversation flow',
    steps: ['Initial Prompt', 'Memory Activation', 'Pattern Recognition', 'Synthesis'],
    category: 'Sequential',
    system: true,
    _count: { templates: 15 }
  },
  // ... more mock data
];
```

**This is hardcoded frontend data!**

### **TypeScript Interface:**
```typescript
// Lines 21-29 in EngagementTemplatesPage.tsx
type EngagementProcess = {
  id: string;
  name: string;
  description: string;
  steps: string[];
  category: 'Sequential' | 'Parallel' | 'Conditional';
  system: boolean;
  _count?: { templates: number };
};
```

### **UI File:**
**File:** `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx`

**Renders:**
- Content Types tab (mock data)
- Engagement Process tab (mock data)
- "Coming Soon" banner (Line 316)

**Quote from file (Lines 317-320):**
> "Coming Soon: Engagement Templates will combine Content Types and Engagement Processes 
> to create structured keeper interaction patterns. Template creation and management tools are in development."

---

## 📊 Part 2: Engagement Templates (UI Surface B)

### **Where Defined:**

**Database:** `packages/database/prisma/schema.prisma`

**Tables:**
1. `engagement_templates` (Lines 402-419)
2. `engagement_fields` (Lines 380-391)
3. `engagement_styles` (Lines 393-400)
4. `keeper_type_engagement_templates` (Lines 759-770)

---

### **Full Schema:**

#### **1. engagement_templates Table**
```prisma
model engagement_templates {
  id                               String @id @db.Uuid
  label                            String                // "Update Domain Info"
  slug                             String @unique        // "domain.admin.update"
  type                             String                // "form" or "action"
  targetType                       String                // "domain", "keeper", etc.
  icon                             String?
  style                            Json?
  config                           Json?                // STORES: visibility, action.endpoint, action.method, successMessage, etc.
  createdAt                        DateTime @default(now())
  updatedAt                        DateTime
  keeperId                         String?
  system                           Boolean @default(false)
  
  // Relations
  engagement_fields                engagement_fields[]
  engagement_styles                engagement_styles[]
  Keeper                           Keeper?
  keeper_type_engagement_templates keeper_type_engagement_templates[]
}
```

#### **2. engagement_fields Table**
```prisma
model engagement_fields {
  id                   String @id @db.Uuid
  templateId           String @db.Uuid
  label                String                // "Domain Name"
  type                 String                // "text", "email", "textarea", "select", "password"
  name                 String                // "name", "slug", "apiKey"
  placeholder          String?
  config               Json?                 // Validation, dataSource, options, etc.
  order                Int @default(0)
  createdAt            DateTime @default(now())
  engagement_templates engagement_templates @relation(...)
}
```

#### **3. keeper_type_engagement_templates (Junction)**
```prisma
model keeper_type_engagement_templates {
  id                     String @id @default(uuid())
  keeper_type_id         String               // FK to KeeperType
  engagement_template_id String @db.Uuid      // FK to engagement_templates
  created_at             DateTime @default(now())
  
  engagement_templates   engagement_templates @relation(...)
  KeeperType             KeeperType @relation(...)
  
  @@unique([keeper_type_id, engagement_template_id])
}
```

---

### **TypeScript Interface (Frontend):**

**File:** `apps/web/src/types/keeper.ts` (Lines 26-45)

```typescript
export interface EngagementTemplate {
  id: string;
  label: string;                    // "Update Domain Info"
  slug: string;                     // "domain.admin.update"
  type: string;                     // "form" or "action"
  targetType: string;               // "domain"
  icon?: string;
  style?: Record<string, unknown>;
  config?: Record<string, unknown>; // Contains action.endpoint, visibility, etc.
  system?: boolean;
  createdAt: string;
  updatedAt: string;
  keeperId?: string;
  engagement_fields?: EngagementField[];
  engagement_styles?: EngagementStyle[];
  Keeper?: {
    id: string;
    title: string;
  };
}
```

---

## 🔗 Part 3: Do Templates Reference Processes?

### **ANSWER: NO**

**There is NO linkage.**

**Evidence:**
- ❌ No `processId` field in engagement_templates
- ❌ No `processKey` field
- ❌ No relation to any "process" table
- ❌ Processes don't exist in database at all

**These are completely independent:**
- **Engagement Processes** = Concept UI only (mock data)
- **Engagement Templates** = Real system with DB + executor

---

## 🔗 Part 4: How Templates Link to Keeper Types

### **Junction Table:**
`keeper_type_engagement_templates`

**Schema:**
```prisma
@@unique([keeper_type_id, engagement_template_id])
```

**How It Works:**

1. **Seeding** (database/prisma/seeds/domain-engagement-templates.seed.ts):
```typescript
await prisma.keeper_type_engagement_templates.create({
  data: {
    id: randomUUID(),
    keeper_type_id: domainTypeId,        // "Domain" KeeperType
    engagement_template_id: templateId,   // "domain.admin.update"
    created_at: new Date()
  }
});
```

2. **Loading** (apps/api/src/api/keeper-types.ts, Lines 136-144):
```typescript
keeper_type_engagement_templates: {
  include: {
    engagement_templates: {
      include: {
        engagement_fields: true,
        engagement_styles: true,
      },
    },
  },
}
```

3. **UI Display** (apps/web/src/pages/keeper/KeeperTypesPage.tsx):
```typescript
// Line 76
const response = await keeperApi.getEngagementTemplatesByKeeperType(selectedKeeperType.id);

// Lines 243-275: Renders each template with Test button
```

---

## 📍 Part 5: Domain Templates in Database

### **ANSWER: YES - All 6 are in the database**

**Verified:** Just ran query, found all 6:

| Label | Slug | Type | Visibility | Endpoint |
|-------|------|------|------------|----------|
| Contact Domain | domain.public.contact | form | public | POST /api/domains/:domainId/contact |
| Update Domain Info | domain.admin.update | form | admin | PATCH /api/domains/:domainId |
| Verify Domain | domain.admin.verify | action | admin | POST .../custom-domain/verify |
| Add Custom Domain | domain.admin.addCustomDomain | form | admin | POST .../custom-domain |
| Edit API Key | domain.admin.editApiKey | form | admin | POST /api/kip/user-keys |
| Assign Primary Agent | domain.admin.assignAgent | form | admin | PATCH /api/domains/:domainId |

**Record Shape Example (domain.admin.update):**
```json
{
  "id": "uuid",
  "label": "Update Domain Info",
  "slug": "domain.admin.update",
  "type": "form",
  "targetType": "domain",
  "system": true,
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/domains/:domainId",
      "method": "PATCH",
      "successMessage": "Domain updated successfully",
      "errorMessages": {
        "SLUG_EXISTS": "That slug is already taken"
      }
    },
    "requiresConfirmation": false
  }
}
```

**Fields (in engagement_fields table):**
- name (text, required, dataSource: domain.name)
- slug (text, required, pattern validation)
- description (textarea, max 500 chars)

---

## 🔍 Part 6: The "Test" Button

### **Where Implemented:**
**File:** `apps/web/src/pages/keeper/KeeperTypesPage.tsx` (Lines 110-129)

### **What It Does:**

```typescript
const handleTestTemplate = (template: EngagementTemplate) => {
  // Map template slugs to routes
  const templateRoutes: Record<string, string> = {
    'reflection_journal': '/keeper/demo/reflection-journal',
    'memorycard_generator': '/keeper/demo/memory-cards',
    'voice_panel': '/keeper/demo/voice-panel',
    'echo_writer': '/keeper/demo/echo-writer',
    'identity_logbook': '/keeper/demo/identity-logbook'
  };

  const route = templateRoutes[template.slug];
  
  if (route) {
    navigate(route);  // ✅ Navigates to demo page
  } else {
    alert(`Template "${template.label}" testing is coming soon!`);  // ❌ For domain templates
  }
};
```

**For Domain Templates:**
- Clicking "Test" on domain.admin.update → Shows alert "testing is coming soon!"
- ❌ **Does NOT call executor**
- ❌ **Does NOT execute the template**
- ✅ **Only navigates for old keeper templates** (reflection_journal, etc.)

**The Test button is STUBBED for domain templates.**

---

## ✅ Part 7: Confirm Your Understanding

### **Your Statement:**
> "Engagement Process = reusable interaction flow definition (like 'Sequential Dialogue')"
> "Engagement Template = executable action/form attached to a Keeper Type (like 'Verify Domain')"

### **MY ANSWER: YES - Correct**

**But with critical caveat:**

**Engagement Processes:**
- ✅ Correct concept
- ❌ **Not implemented** - only mock UI

**Engagement Templates:**
- ✅ Correct concept
- ✅ **Fully implemented** - database + executor + UI

---

## 🔧 Part 8: What Would Break if Merged?

### **ANSWER: NOTHING would break**

**Why:** Because Engagement Processes don't actually exist in code!

They're just:
1. Mock data in EngagementTemplatesPage.tsx
2. "Coming Soon" banner
3. No backend
4. No database
5. No functionality

**If you merged them into "Actions":**
- ✅ Nothing breaks (processes aren't used)
- ✅ Simpler mental model
- ✅ One system instead of confusing two
- ✅ Could delete the EngagementTemplatesPage entirely

---

## 📊 Part 9: The Truth

### **What You Actually Have:**

```
┌────────────────────────────────────────────┐
│ ONE REAL SYSTEM:                           │
│ Engagement Templates                       │
│                                            │
│ ✅ Database tables (3)                     │
│ ✅ Executor service                        │
│ ✅ API endpoints (3)                       │
│ ✅ UI components (EngagementButton/Modal)  │
│ ✅ 11 templates seeded (5 keeper + 6 domain)│
│ ✅ Fully functional                        │
└────────────────────────────────────────────┘

            vs.

┌────────────────────────────────────────────┐
│ ONE FAKE SYSTEM:                           │
│ Engagement Processes                       │
│                                            │
│ ❌ No database                             │
│ ❌ No API                                  │
│ ❌ No executor                             │
│ ✅ One page with mock data                 │
│ ✅ "Coming Soon" banner                    │
│ ❌ Not functional                          │
└────────────────────────────────────────────┘
```

---

## 🗺️ Part 10: File Path Reference

### **Engagement Processes (Mock):**

**UI Only:**
- `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx` (343 lines)
  - Lines 21-29: TypeScript type (local to file)
  - Lines 70-98: Mock data array
  - Lines 216-299: Render function
  - Line 316-320: "Coming Soon" banner

**Backend:**
- ❌ None

**Database:**
- ❌ None

---

### **Engagement Templates (Real):**

**Database Schema:**
- `packages/database/prisma/schema.prisma`
  - Lines 380-391: engagement_fields
  - Lines 393-400: engagement_styles
  - Lines 402-419: engagement_templates
  - Lines 759-770: keeper_type_engagement_templates

**Backend:**
- `apps/api/src/services/EngagementTemplateExecutor.ts` (395 lines)
- `apps/api/src/api/engagement/execute.ts` (160 lines)
- `apps/api/src/api/keeper-types.ts` (Lines 136-144: loads templates for keeper type)

**Frontend:**
- `apps/web/src/types/keeper.ts` (Lines 26-58: interfaces)
- `apps/web/src/lib/keeperApi.ts` (Line 102-104: API call)
- `apps/web/src/pages/keeper/KeeperTypesPage.tsx` (Lines 71-86: loads templates, 221-286: renders)
- `apps/web/src/components/engagement/EngagementButton.tsx` (166 lines)
- `apps/web/src/components/engagement/EngagementModal.tsx` (237 lines)

**Seed Files:**
- `packages/database/prisma/seeds/domain-engagement-templates.seed.ts` (363 lines)

---

## 🔗 Part 11: The Keeper Type → Templates UI

### **File:** `apps/web/src/pages/keeper/KeeperTypesPage.tsx`

### **How It Works:**

**1. Load Keeper Type:**
```typescript
// Line 54
const response = await keeperApi.getKeeperTypes();
```

**2. When User Clicks "Engagement Templates" Tab:**
```typescript
// Lines 71-86
const loadEngagementTemplates = async () => {
  const response = await keeperApi.getEngagementTemplatesByKeeperType(
    selectedKeeperType.id
  );
  setEngagementTemplates(response.data);
};
```

**3. API Call:**
```typescript
// apps/web/src/lib/keeperApi.ts Line 102-104
async getEngagementTemplatesByKeeperType(keeperTypeId: string) {
  return this.request(`/keeper-types/${keeperTypeId}/engagement-templates`);
}
```

**4. Backend Loads:**
```typescript
// apps/api/src/api/keeper-types.ts Lines 136-144
keeper_type_engagement_templates: {
  include: {
    engagement_templates: {
      include: {
        engagement_fields: true,
        engagement_styles: true,
      },
    },
  },
}
```

**5. UI Displays:**
```typescript
// Lines 243-275 in KeeperTypesPage.tsx
engagementTemplates.map((template) => (
  <div>
    <h4>{template.label}</h4>
    <p>{template.slug}</p>
    <span>{template.type}</span>
    <span>{template.system ? 'System' : 'Custom'}</span>
    <button onClick={() => handleTestTemplate(template)}>
      Test
    </button>
  </div>
))
```

---

## 🧪 Part 12: Domain Templates - VERIFIED IN DATABASE

**Just queried the database - All 6 are real:**

### **1. domain.public.contact**
```json
{
  "label": "Contact Domain",
  "type": "form",
  "targetType": "domain",
  "config": {
    "visibility": "public",
    "action": {
      "endpoint": "/api/domains/:domainId/contact",
      "method": "POST",
      "successMessage": "Message sent! We'll get back to you soon."
    }
  }
}
```
**Fields:** name (text), email (email), message (textarea)

---

### **2. domain.admin.update**
```json
{
  "label": "Update Domain Info",
  "type": "form",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/domains/:domainId",
      "method": "PATCH",
      "successMessage": "Domain updated successfully"
    }
  }
}
```
**Fields:** name, slug, description

---

### **3. domain.admin.verify**
```json
{
  "label": "Verify Domain",
  "type": "action",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/domains/:domainId/custom-domain/verify",
      "method": "POST",
      "successMessage": "Domain verified successfully!"
    },
    "requiresConfirmation": true
  }
}
```
**Fields:** None (action-only)

---

### **4. domain.admin.addCustomDomain**
```json
{
  "label": "Add Custom Domain",
  "type": "form",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/domains/:domainId/custom-domain",
      "method": "POST",
      "successMessage": "Custom domain added. Configure your DNS with the provided records."
    }
  }
}
```
**Fields:** customDomain (text with domain pattern validation)

---

### **5. domain.admin.editApiKey**
```json
{
  "label": "Edit API Key",
  "type": "form",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/kip/user-keys",
      "method": "POST",
      "successMessage": "API key saved successfully"
    }
  }
}
```
**Fields:** provider (select), apiKey (password)

---

### **6. domain.admin.assignAgent**
```json
{
  "label": "Assign Primary Agent",
  "type": "form",
  "targetType": "domain",
  "config": {
    "visibility": "admin",
    "action": {
      "endpoint": "/api/domains/:domainId",
      "method": "PATCH",
      "body": {
        "settings": {
          "primaryAgentId": ":agentId"
        }
      },
      "successMessage": "Primary agent assigned successfully"
    }
  }
}
```
**Fields:** agentId (select dropdown)

---

## ✅ Part 13: Final Answers to Your Questions

### **Q1: Where is Engagement Process defined?**
**A:** Only in frontend mock data at `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx` (Lines 70-98)

### **Q2: What table backs it?**
**A:** ❌ None - it's mock data only

### **Q3: What are its fields?**
**A:** TypeScript type only (Lines 21-29): `id`, `name`, `description`, `steps`, `category`, `system`, `_count`

### **Q4: Which file renders Process Details panel?**
**A:** `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx` (Lines 216-299)

### **Q5: Where is Engagement Template defined?**
**A:** 
- **Database:** `schema.prisma` Lines 402-419
- **TypeScript:** `apps/web/src/types/keeper.ts` Lines 26-45
- **Seed:** `packages/database/prisma/seeds/domain-engagement-templates.seed.ts`

### **Q6: Confirm the model and related tables?**
**A:** ✅ Confirmed:
- engagement_templates (main)
- engagement_fields (form inputs)
- engagement_styles (visual variants)
- keeper_type_engagement_templates (junction to KeeperType)

### **Q7: Do Templates reference Processes?**
**A:** ❌ **NO** - No linkage exists. Completely independent systems.

### **Q8: How are Templates linked to Keeper Type?**
**A:** Via `keeper_type_engagement_templates` junction table:
```prisma
@@unique([keeper_type_id, engagement_template_id])
```
**UI:** `apps/web/src/pages/keeper/KeeperTypesPage.tsx` Lines 71-86, 221-286

### **Q9: Are domain.admin.* templates in DB?**
**A:** ✅ **YES** - All 6 templates stored with full config including endpoints, visibility, messages

### **Q10: Where is Test button implemented?**
**A:** `apps/web/src/pages/keeper/KeeperTypesPage.tsx` Lines 110-129
- ❌ **Does NOT call executor for domain templates**
- ✅ **Only navigates for old keeper templates**
- Shows alert("coming soon") for domain templates

### **Q11: Is your description accurate?**
**A:** ✅ **YES - Accurate**

### **Q12: What would break if merged?**
**A:** ❌ **NOTHING** - Processes don't exist, so merging just removes confusing UI

---

## 🎯 Part 14: Summary - The Brutal Truth

**You have:**

1. **One Real System:**
   - Engagement Templates
   - Fully functional
   - 11 templates in DB
   - Executor working
   - Used in Domain board frames

2. **One Fake System:**
   - Engagement Processes
   - Mock UI only
   - "Coming Soon" banner
   - No backend
   - Confuses users

**Recommendation:** Delete EngagementTemplatesPage.tsx or convert it to show real Engagement Templates globally (not scoped to keeper).

---

## 📋 Part 15: Complete File Reference

| Component | File Path | Status |
|-----------|-----------|--------|
| **Processes (Mock)** | apps/web/src/pages/keeper/EngagementTemplatesPage.tsx | Mock only |
| **Templates Schema** | packages/database/prisma/schema.prisma (Lines 402-419) | Real |
| **Templates Type** | apps/web/src/types/keeper.ts (Lines 26-45) | Real |
| **Templates Executor** | apps/api/src/services/EngagementTemplateExecutor.ts | Real |
| **Templates API** | apps/api/src/api/engagement/execute.ts | Real |
| **Templates UI** | apps/web/src/components/engagement/EngagementButton.tsx | Real |
| **KeeperType UI** | apps/web/src/pages/keeper/KeeperTypesPage.tsx | Real |
| **Test Button** | apps/web/src/pages/keeper/KeeperTypesPage.tsx (Lines 110-129) | Stubbed |
| **Domain Templates Seed** | packages/database/prisma/seeds/domain-engagement-templates.seed.ts | Real |

---

**FINAL ANSWER:** You have ONE real system (Engagement Templates) and ONE mock UI (Engagement Processes). They are NOT connected. Processes should probably be deleted or reimplemented to be real.
