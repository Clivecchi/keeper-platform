# Inline Board Editing - Design Spec

## 🎯 Vision

**Edit the board directly where you see it** - no modal, no separate UI, just click and edit in place.

## ✨ Proposed UX

### Edit Mode Toggle

```
┌─────────────────────────────────────────────────┐
│  [Your Name ▾]  [ Edit ]  [Dashboard]          │ ← Top right
└─────────────────────────────────────────────────┘

When clicked:
┌─────────────────────────────────────────────────┐
│  [Your Name ▾]  [ Cancel ]  [ 💾 Save Changes ] │
└─────────────────────────────────────────────────┘
```

### Frame Editing (In Edit Mode)

Each frame gets inline controls:

```
┌────────────────────────────────────────────┐
│  ✏️ KE3P                        [⚙️] [🗑️]  │ ← Hover shows controls
│  cryptically designed, wonderfully...       │
│  [Contact]                                  │
├────────────────────────────────────────────┤
│  Click any text to edit                    │
│  Click image to change                      │
│  Click button to edit action               │
└────────────────────────────────────────────┘
```

### Prop-Level Editing

```
┌────────────────────────────────────────────┐
│  ✏️ [Edit: KE3P________________]  ← Click heading to edit
│     
│  ✏️ [Edit: cryptically designed...]  ← Click tagline to edit
│     
│  ✏️ [Edit Button: Contact_____]  ← Click button to edit
└────────────────────────────────────────────┘
```

## 🎨 Visual Design

### Edit Mode Indicators

1. **Blue Border** around editable frames
2. **Hover State** shows edit pencil icon
3. **Click** opens inline editor
4. **Save Banner** at top with "X unsaved changes"

### Inline Editor Components

**Text Props:**
```
┌──────────────────────────────────────┐
│ ✏️ Heading Text                      │
│ ┌──────────────────────────────────┐ │
│ │ Enter text here...              │ │
│ └──────────────────────────────────┘ │
│ [Cancel] [Save]                      │
└──────────────────────────────────────┘
```

**Image Props:**
```
┌──────────────────────────────────────┐
│ 🖼️ Cover Image                       │
│ ┌──────────────────────────────────┐ │
│ │   [Current Image Preview]       │ │
│ │   [📁 Upload New]               │ │
│ │   or enter URL:                 │ │
│ │   [____________________]        │ │
│ └──────────────────────────────────┘ │
│ [Cancel] [Save]                      │
└──────────────────────────────────────┘
```

**Button Props:**
```
┌──────────────────────────────────────┐
│ 🔘 Button                            │
│ Label: [Contact_____________]        │
│ URL:   [mailto:...___________]       │
│ Style: [Primary ▾]                   │
│ [Cancel] [Save]                      │
└──────────────────────────────────────┘
```

## 🔧 Implementation Plan

### Phase 1: Framework (Current Task)
- ✅ Edit mode toggle (already working)
- ✅ Frame visibility (already working)
- ⚠️ Currently opens PropManager modal (ugly)

### Phase 2: Inline Prop Editing
- Replace PropManager modal with inline editors
- Click prop → shows inline form overlay
- Edit in place → save → updates frame
- No page navigation, stays on board

### Phase 3: Drag & Drop Reordering
- Drag frames to reorder
- Drag props within frames to reorder
- Visual drop zones
- Auto-save on drop

### Phase 4: Live Preview
- Changes show immediately
- "Unsaved changes" indicator
- Batch save on "Save Changes" click
- Auto-save option

## 🎯 Key Benefits

1. **Context Preserved** - See your changes in place
2. **Faster Workflow** - No modal switching
3. **Visual Feedback** - WYSIWYG editing
4. **Less Cognitive Load** - Edit what you see
5. **Mobile Friendly** - Touch-optimized inline editors

## 🚧 Current vs. Proposed

### Current (Backend UI)
```
Board View → Click Edit → Modal Opens → Find Frame → 
Find Prop → Edit in tiny input → Save → Close Modal → 
Hope it looks right
```

### Proposed (Inline)
```
Board View → Click Edit → Click text → 
Type new text → See it update → Click Save
```

## 📝 Technical Approach

### Component Structure

```typescript
<DomainBoardRenderer isEditMode={true}>
  <Frame isEditMode={true}>
    <EditableHeading 
      value="KE3P"
      onChange={handleUpdate}
      propId="heading-1"
    />
    <EditableText 
      value="cryptically designed..."
      onChange={handleUpdate}
      propId="tagline-1"
    />
    <EditableButton
      label="Contact"
      url="mailto:..."
      onChange={handleUpdate}
      propId="button-1"
    />
  </Frame>
</DomainBoardRenderer>
```

### Edit State Management

```typescript
interface EditState {
  isEditMode: boolean;
  editingPropId: string | null;
  changes: Map<string, PropUpdate>;
  isDirty: boolean;
}

function useBoardEditor() {
  const [editState, setEditState] = useState<EditState>({
    isEditMode: false,
    editingPropId: null,
    changes: new Map(),
    isDirty: false
  });

  const handlePropEdit = (propId: string, newValue: any) => {
    setEditState(prev => ({
      ...prev,
      changes: prev.changes.set(propId, newValue),
      isDirty: true
    }));
  };

  const handleSave = async () => {
    await apiFetch(`/api/domains/${domainId}/board-data`, {
      method: 'PUT',
      body: JSON.stringify({ 
        props: Array.from(editState.changes.entries()) 
      })
    });
    setEditState({ ...editState, changes: new Map(), isDirty: false });
  };

  return { editState, handlePropEdit, handleSave };
}
```

## 🎨 UI Components Needed

### New Components

1. **`<EditableProp>`** - Wrapper that makes any prop editable
2. **`<InlineEditor>`** - Overlay editor for prop values
3. **`<PropToolbar>`** - Inline edit/delete/move controls
4. **`<ChangeIndicator>`** - Shows unsaved changes count
5. **`<EditModeBar>`** - Top banner with save/cancel

### Modify Existing

1. **`<PropRenderer>`** - Add edit mode support
2. **`<DomainBoardRenderer>`** - Pass edit handlers
3. **`<PublicDomainPage>`** - Manage edit state

## 🚀 Next Steps

1. **Remove the ugly modal** (PropManager)
2. **Add inline edit UI** for each prop type
3. **Implement change tracking**
4. **Add save/cancel workflow**
5. **Polish animations and transitions**

---

**Priority:** HIGH - Current edit UI is unusable  
**Effort:** Medium - 2-3 hours to implement  
**Impact:** HUGE - Makes editing actually pleasant

