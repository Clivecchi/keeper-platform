# Template Loading Analysis

**Issue:** Clicking templates does nothing  
**Root Cause:** No onClick handler on template cards  
**Solution:** Use existing `handleBoardSelect` function

---

## ✅ What Already Works

### **Templates ARE Boards**
- Templates are `Board` records with `isTemplate: true`
- They have frames (FrameInstance records)
- They use the SAME schema as regular boards
- The existing board loading logic should work perfectly

### **Existing Board Loading Flow**
**File:** `apps/web/src/pages/studio/board-studio-page.tsx`

```typescript
const handleBoardSelect = async (boardId: string) => {
  // 1. Fetch board data
  const response = await apiFetch(`/api/board-data/${boardId}`);
  
  // 2. Set board state
  setSelectedBoardId(boardId);
  setMockFrames(response.data.frames);
  
  // 3. Update board properties
  setBoardName(response.data.name);
  // etc.
}
```

**This SAME function works for templates!**

---

## ❌ What's Missing

### **Template Cards Have No onClick**

**Current Code (Lines ~1770-1779):**
```tsx
templates.map((template) => (
  <div 
    key={template.id}
    className="flex items-center gap-2 p-2 rounded-md border border-purple-200..."
    title={`Used by KeeperTypes - click to view`}
    // ❌ NO onClick HANDLER
  >
    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
    <span className="text-sm font-medium text-purple-900 flex-1 truncate">
      {template.name}
    </span>
    <span className="text-xs text-purple-600">{template.frameCount} frames</span>
  </div>
))
```

**Regular Boards Have onClick:**
```tsx
boards.map((board) => (
  <div 
    key={board.id}
    onClick={() => handleBoardSelect(board.id)}  // ✅ HAS HANDLER
    className={...}
  >
```

---

## 🔧 The Fix (One Line)

### **Add onClick to Template Cards**

**Change:**
```tsx
templates.map((template) => (
  <div 
    key={template.id}
    onClick={() => handleBoardSelect(template.id)}  // ← ADD THIS
    className="flex items-center gap-2 p-2 rounded-md border border-purple-200..."
```

**That's it!** The template will load just like a regular board.

---

## 🎯 What Will Happen

### **When You Click "Domain Design B...":**

1. **`handleBoardSelect(template.id)` is called**
2. **Board loads:** `GET /api/board-data/{template-id}`
3. **5 frames display** in the canvas
4. **Board name shows:** "Domain Design Board"
5. **You can:**
   - ✅ View all 5 frames
   - ✅ See frame names, patterns, layouts
   - ✅ Inspect props configuration
   - ✅ Edit frame names
   - ✅ Reorder frames
   - ✅ Add new frames
   - ✅ Delete frames
   - ✅ Modify props

---

## 🎨 Enhanced UX (Optional Improvements)

### **1. Template Badge**
Show that this is a template being edited:

```tsx
{board.isTemplate && (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
    <Sparkles className="w-3 h-3" />
    Template
  </div>
)}
```

### **2. Template Mode Indicator**
Show which KeeperTypes use this template:

```tsx
{board.isTemplate && (
  <div className="text-xs text-purple-600">
    Used by: Domain, Agent, Journey...
  </div>
)}
```

### **3. Read-Only Warning (Optional)**
Warn before editing system templates:

```tsx
{board.isTemplate && (
  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
    ⚠️ This is a system template. Changes will affect all instances.
  </div>
)}
```

---

## 📊 What You'll Be Able to Do

### **Editing the Domain Design Board Template:**

1. **Click:** "Domain Design B..." in Templates view
2. **Loads:** Board editor with 5 frames
3. **View:**
   - Frame 0: Hero / Identity (focus pattern)
   - Frame 1: Activity / Assets (gallery pattern)
   - Frame 2: People / Membership (canvas pattern)
   - Frame 3: Domain Operations (form pattern)
   - Frame 4: Keys / Integrations (canvas pattern)

4. **Edit:**
   - Click any frame to see props
   - Edit frame names
   - Modify layouts
   - Change patterns
   - Update prop configurations

5. **Save:**
   - Changes persist to template
   - All future boards using this template inherit changes

---

## 🚀 Implementation Steps

### **Step 1: Add onClick Handler** (1 minute)
```tsx
onClick={() => handleBoardSelect(template.id)}
```

### **Step 2: (Optional) Add Template Badge** (5 minutes)
Show "Template" badge in board header when editing templates

### **Step 3: (Optional) Add KeeperType Info** (10 minutes)
Query and display which KeeperTypes use this template

---

## 🎯 Answer to Your Question

**"We should be able to manually edit the Domain Design Board"**

**YES! Absolutely correct.**

**Current State:**
- ✅ Template exists in database (5 frames)
- ✅ Board loading logic works
- ✅ Frame editor works
- ✅ Save functionality works
- ❌ Just missing onClick handler on template card

**Fix Required:**
- Add one line: `onClick={() => handleBoardSelect(template.id)}`

**After Fix:**
- Click template → Loads into editor
- View/edit all 5 frames
- See prop configurations
- Modify layouts
- Save changes

**This is MUCH simpler than the full Engagement Template execution system!**

---

## 📋 What This Enables

### **Immediate Benefits:**

1. **Inspect Templates**
   - See exactly how the 5 frames are configured
   - Review prop definitions
   - Understand layout structure

2. **Customize Templates**
   - Modify frame names
   - Adjust layouts
   - Change patterns
   - Update prop configurations

3. **Test Frame Designs**
   - Experiment with different layouts
   - Try different prop combinations
   - Preview patterns

4. **Create New Templates**
   - Start from existing template
   - Modify and save as new
   - Build template library

---

## 🔍 Comparison

### **Template Editing (This)**
**Purpose:** View and modify the template board itself  
**Complexity:** Very Low (1 line)  
**Timeline:** Immediate

vs.

### **Template Execution (Later - Phase 3)**
**Purpose:** Use templates to create instances, execute actions  
**Complexity:** Medium-High (executor engine)  
**Timeline:** 13-18 hours

---

## ✅ Recommendation

**Implement template loading NOW** (before full executor):

1. Add onClick handler (1 line)
2. Test loading Domain Design Board template
3. Inspect the 5 frames
4. Verify prop configurations
5. Make any adjustments needed

**Then** build the full engagement template executor in Phase 3.

---

**Status:** Simple fix identified  
**Impact:** High (enables template editing immediately)  
**Risk:** None (using existing board loading logic)

