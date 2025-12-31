# Props Format Fix - Complete ✅

**Issue:** Board loaded to blank screen with error "Cannot read properties of undefined (reading 'name')"  
**Root Cause:** Props format didn't match PropManager's expected structure  
**Status:** Fixed and re-seeded

---

## ❌ **The Problem**

### **What PropManager Expected:**
```typescript
{
  id: string,
  type: string,
  config: {
    name: string,  // ← This was missing!
    ...other props
  },
  orderIndex: number
}
```

### **What We Were Storing:**
```typescript
{
  type: 'Heading',
  key: 'domainTitle',
  dataSource: 'domain.name',
  style: { level: 'h1' }
  // ❌ No 'id'
  // ❌ No 'config' wrapper
  // ❌ No 'config.name'
}
```

### **Error:**
Line 264 in PropManager tried to read:
```typescript
prop.config.name || prop.config.content || ...
```

But `prop.config` was undefined → Error!

---

## ✅ **The Fix**

### **Updated All Props to:**
```typescript
{
  id: 'hero-cover-image',
  type: 'image',
  config: {
    name: 'Cover Image',  // ✅ Now has name
    dataSource: 'domain.theme.coverImage',
    variant: 'full-bleed'
  },
  orderIndex: 0
}
```

**Key Changes:**
1. ✅ Added `id` field to every prop
2. ✅ Wrapped all properties in `config` object
3. ✅ Added `config.name` for display
4. ✅ Added `orderIndex` for ordering
5. ✅ Matched PropManager's expected PropData type

---

## 📊 **Updated Props by Frame**

### **Frame 0: Hero / Identity** (4 props)
```typescript
[
  { id: 'hero-cover-image', type: 'image', config: { name: 'Cover Image', ... } },
  { id: 'hero-title', type: 'heading', config: { name: 'Domain Title', ... } },
  { id: 'hero-tagline', type: 'text', config: { name: 'Tagline', ... } },
  { id: 'hero-contact-btn', type: 'button', config: { name: 'Contact Button', label: 'Contact', engagementTemplate: 'domain.public.contact' } }
]
```

### **Frame 1: Activity / Assets** (3 props)
```typescript
[
  { id: 'activity-heading', type: 'heading', config: { name: 'Activity Heading', content: 'What We\'re Building' } },
  { id: 'featured-work', type: 'gallery', config: { name: 'Featured Work', dataSource: 'domain.featured.keepersOrJourneys' } },
  { id: 'ethos-quote', type: 'quote', config: { name: 'Ethos Quote', content: 'We show our worth by what we build and keep.' } }
]
```

### **Frame 2: People / Membership** (3 props)
```typescript
[
  { id: 'team-heading', type: 'heading', config: { name: 'Team Heading', content: 'Who\'s Here' } },
  { id: 'member-gallery', type: 'gallery', config: { name: 'Member Gallery', dataSource: 'domain.members' } },
  { id: 'team-note', type: 'text', config: { name: 'Team Note', content: 'People who build, protect, and speak for this domain.' } }
]
```

### **Frame 3: Domain Operations** (4 props)
```typescript
[
  { id: 'ops-heading', type: 'heading', config: { name: 'Operations Heading', content: 'Domain Settings' } },
  { id: 'update-form', type: 'form', config: { name: 'Update Domain Form', engagementTemplate: 'domain.admin.update', fields: [...] } },
  { id: 'verify-btn', type: 'button', config: { name: 'Verify Domain Button', label: 'Verify Domain', engagementTemplate: 'domain.admin.verify' } },
  { id: 'dns-status', type: 'text', config: { name: 'DNS Status', content: 'DNS detected — waiting for verification.' } }
]
```

### **Frame 4: Keys / Integrations** (5 props)
```typescript
[
  { id: 'keys-heading', type: 'heading', config: { name: 'Keys Heading', content: 'Keys & Integrations' } },
  { id: 'key-reminder', type: 'text', config: { name: 'Key Reminder', content: 'Bring your own keys...' } },
  { id: 'edit-key-form', type: 'form', config: { name: 'Edit API Key Form', engagementTemplate: 'domain.admin.editApiKey', fields: [...] } },
  { id: 'assign-agent-form', type: 'form', config: { name: 'Assign Agent Form', engagementTemplate: 'domain.admin.assignAgent', fields: [...] } },
  { id: 'agent-card', type: 'ai-assistant', config: { name: 'Primary Agent Card', content: 'No primary agent assigned.' } }
]
```

---

## ✅ **What PropManager Sees Now**

For each prop, PropManager can now access:

**Display Name:**
```typescript
prop.config.name  // ✅ "Cover Image", "Domain Title", etc.
```

**Content Preview:**
```typescript
prop.config.content || prop.config.label || prop.type
// ✅ Shows meaningful preview
```

**Prop Type:**
```typescript
prop.type  // ✅ "heading", "text", "image", "gallery", etc.
```

**Configuration:**
```typescript
prop.config  // ✅ All settings available
```

---

## 🎯 **What You'll See After Refresh**

### **Before (Broken):**
```
Click template → Blank screen
Console error: "Cannot read properties of undefined (reading 'name')"
```

### **After (Fixed):**
```
Click "Domain Design B..." template
    ↓
Board loads with purple "Template" badge
    ↓
5 frame tabs appear
    ↓
Click "Hero / Identity" frame
    ↓
Props panel shows:
  ┌─────────────────────────────┐
  │ Props (4)                   │
  ├─────────────────────────────┤
  │ Cover Image                 │
  │ image · ...                 │
  │ [Edit] [Delete]             │
  ├─────────────────────────────┤
  │ Domain Title                │
  │ heading · h1                │
  │ [Edit] [Delete]             │
  ├─────────────────────────────┤
  │ Tagline                     │
  │ text · ...                  │
  │ [Edit] [Delete]             │
  ├─────────────────────────────┤
  │ Contact Button              │
  │ button · Contact            │
  │ [Edit] [Delete]             │
  └─────────────────────────────┘
  
  [+ Prop Drop Zone]
```

---

## 📋 **Prop Type Mapping**

**Types PropManager Recognizes:**

| Our Type | PropManager Type | Editor Component |
|----------|------------------|------------------|
| HeroImage → | `image` | ImagePropEditor |
| Heading → | `heading` | HeadingPropEditor |
| TextBlock → | `text` | TextPropEditor |
| ActionButton → | `button` | ButtonPropEditor |
| Form → | `form` | FormPropEditor |
| ImageGallery → | `gallery` | GalleryPropEditor |
| Quote → | `quote` | QuotePropEditor |
| AI Assistant → | `ai-assistant` | AIAssistantPropEditor |

---

## ✅ **Files Updated**

1. **`packages/database/prisma/seeds/design-boards.seed.ts`**
   - Restructured all 19 props
   - Added `id`, `config`, `orderIndex` to each
   - Added `config.name` for display
   - Updated prop types to match PropManager

2. **Database (via script)**
   - Updated all 5 frames with correct props format
   - Verified 19 total props

---

## 🚀 **Ready to Test**

**After Deployment:**

1. Navigate to Design Boards
2. Click "Templates" toggle
3. Click "Domain Design B..."
4. **Board should load** (no blank screen)
5. **5 frame tabs appear**
6. **Click any frame** (e.g., "Hero / Identity")
7. **Props panel shows 4 props** with names
8. **Each prop is editable**
9. **Prop Drop zone at bottom**

---

## 📊 **Verification**

```
✅ Frame 0: Hero / Identity - 4 props
✅ Frame 1: Activity / Assets - 3 props
✅ Frame 2: People / Membership - 3 props
✅ Frame 3: Domain Operations - 4 props
✅ Frame 4: Keys / Integrations - 5 props

Total: 19 props across 5 frames
```

All props now have:
- ✅ `id` field
- ✅ `type` field (matching PropManager types)
- ✅ `config` object
- ✅ `config.name` field (for display)
- ✅ `orderIndex` field

---

## 🎯 **Next Steps**

### **After This Fix:**
- Props will display in Board Studio
- Can view each prop's configuration
- Can edit props inline
- Can delete props
- Can drag to reorder
- Can add new props via Prop Drop

### **For Full Functionality (Later):**
- Build prop renderer components (Phase 5)
- Connect to actual domain data
- Implement engagement template triggers
- Add frame visibility logic

---

**Status:** ✅ Props Format Fixed  
**Database:** Updated with correct structure  
**UI:** Should display props correctly after refresh  
**Next:** Deploy and test in browser

