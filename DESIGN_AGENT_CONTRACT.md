# Design Agent Contract

## Overview

The **Design Agent Contract** is the authoritative specification for how frames are rendered in the Keeper Platform. **PatternRenderer** acts as the Design Agent - the single, centralized component responsible for all frame presentation.

**Core Principle:** All frame rendering MUST flow through PatternRenderer. No bypasses allowed.

---

## Contract Purpose

This contract serves multiple audiences:

1. **Board Studio developers** - Know how frames are rendered
2. **AI builder agents** - Understand the API for generating layouts
3. **Future contributors** - Maintain architectural consistency
4. **Integration partners** - Build compatible frame systems

---

## Architecture

### The Rendering Pipeline

```
User Action
    ↓
BoardStudio (orchestration)
    ↓
FrameRenderer (chrome + mode handling)
    ↓
PatternRenderer (Design Agent) ⭐
    ↓
Browser DOM
```

### Key Components

**BoardStudio**
- Manages board state
- Handles frame CRUD
- Persists to database
- Controls edit/preview modes

**FrameRenderer**
- Adds editing chrome (selection borders, active indicators)
- Handles mode switching
- Wraps PatternRenderer

**PatternRenderer (Design Agent)**
- THE authoritative presentation layer
- Renders based on pattern + props
- No role-based special cases
- Mode-aware (studio vs preview)

---

## The Contract

### Input Interface

PatternRenderer accepts:

```
interface DesignAgentInput {
  // Frame definition
  frame: {
    id: string;                    // Unique identifier
    name: string;                  // Display name
    role: FrameRole;              // Purpose: 'cover' | 'settings' | 'custom'
    pattern: FramePattern;        // How to render
    props: FrameProp[];           // What to render (always array)
  };
  
  // Rendering context
  mode: EditorMode;               // 'studio' | 'preview' | 'assist'
  boardName?: string;             // For template substitution
  boardDescription?: string;      // For template substitution
  boardData?: BoardData;          // Full board context
  
  // Callbacks
  onFrameUpdate?: (frameId: string, updates: Partial<Frame>) => void;
  onBoardUpdate?: (updates: Partial<Board>) => void;
}
```

### Frame Patterns

PatternRenderer supports six engagement patterns:

**1. Focus Pattern**
- Single-item deep dive
- Full-screen or prominent display
- Best for: Hero sections, featured content, cover frames
- Props: Any mix of media, text, buttons
- Example: Cover frame with hero image + title + CTA

**2. Canvas Pattern**
- Freeform composition
- Props arranged in custom layout
- Best for: Custom layouts, marketing pages, rich content
- Props: Composable mix of any prop types
- Example: Marketing page with heading + images + text + buttons

**3. Dialogic Pattern**
- Conversational interface
- Chat-style interaction
- Best for: AI assistants, support chat, Q&A
- Props: Typically AI assistant props
- Example: Customer support chat

**4. Wizard Pattern**
- Multi-step sequential flow
- Guided progression
- Best for: Onboarding, forms, processes
- Props: Step definitions with content
- Example: User registration wizard

**5. Gallery Pattern**
- Grid or list of items
- Browseable collection
- Best for: Photo galleries, product catalogs, portfolios
- Props: Gallery prop with images array
- Example: Product showcase

**6. Form Pattern**
- Input collection
- Data submission
- Best for: Contact forms, surveys, settings
- Props: Form prop with field definitions
- Example: Contact form, board settings

### Props System

**Core Principle:** Props define capabilities, not roles.

Any frame can have any prop. The pattern determines how props are presented.

**Available Prop Types:**

**Content Props:**
- heading: Title or section header
- text: Body content
- quote: Highlighted quotation

**Media Props:**
- image: Static image with alt text
- video: Video player with controls
- gallery: Collection of images

**Interactive Props:**
- button: Call-to-action
- form: Input collection
- ai-assistant: Conversational AI

**Prop Structure:**
```
{
  id: string;           // Unique within frame
  type: string;         // Prop type identifier
  config: {             // Type-specific configuration
    // Varies by type
  };
  orderIndex?: number;  // Display order
}
```

### Mode Behavior

**Studio Mode (mode === 'studio')**
- Show editing controls
- Enable inline editing
- Display MediaUploader for media props
- Show PropManager for prop editing
- Active hover states
- Configuration panels visible

**Preview Mode (mode === 'preview')**
- Pure presentation
- No editing controls
- Final user-facing view
- Autoplay media
- No hover states for editing

**Assist Mode (mode === 'assist')**
- AI-assisted editing
- Show AI suggestions
- Highlight editable areas
- Display improvement recommendations

---

## Constraints and Rules

### MUST Follow

1. **No Bypass Rendering**
   - ALL frame content MUST render through PatternRenderer
   - No direct JSX rendering based on frame.role or frame.pattern
   - No inline frame-specific rendering logic

2. **Props-Driven Rendering**
   - Frame appearance controlled by props, not role
   - Role is metadata, not rendering instruction
   - Pattern determines layout, props determine content

3. **Pattern-Based Logic**
   - Rendering decisions based on frame.pattern
   - No hardcoded role-based special cases
   - Patterns are composable and reusable

4. **Mode-Aware Rendering**
   - Different UI for each mode
   - Respect mode boundaries
   - No editing UI in preview mode

5. **Array-First Props**
   - Props are ALWAYS arrays
   - Never store as objects
   - Adapter layer handles conversions

### MUST NOT Do

1. **Role-Based Rendering**
   ```
   // ❌ WRONG
   if (frame.role === 'cover') {
     return <SpecialCoverComponent />
   }
   ```

2. **Bypass PatternRenderer**
   ```
   // ❌ WRONG
   function BoardStudio() {
     return frame.role === 'cover' 
       ? <CustomCoverRenderer /> 
       : <PatternRenderer />
   }
   ```

3. **Prop Format Assumptions**
   ```
   // ❌ WRONG
   const prop = frame.props.propId  // Assumes object
   
   // ✅ CORRECT
   const prop = frame.props.find(p => p.id === 'propId')
   ```

4. **Mode Mixing**
   ```
   // ❌ WRONG
   {mode === 'preview' && <EditButton />}
   ```

---

## Implementation Guide

### For Board Studio Developers

**Adding a New Frame:**
```
import { createDefaultCustomFrame } from '@/features/board-studio/types/frame-adapters';

const newFrame = createDefaultCustomFrame('My Frame');
newFrame.pattern = 'canvas';  // Choose pattern
newFrame.props = [
  {
    id: 'heading-1',
    type: 'heading',
    config: {
      content: 'Hello World',
      level: 2,
    }
  }
];
```

**Rendering a Frame:**
```
import { FrameRenderer } from '@/features/board-studio/v0/components/FrameRenderer';

<FrameRenderer
  frame={unifiedFrame}
  mode={currentMode}
  isActive={isSelected}
  onSelect={handleSelect}
  boardName={board.name}
  boardDescription={board.description}
  boardData={board}
  frames={allFrames}
  onFrameUpdate={handleUpdate}
  onBoardUpdate={handleBoardUpdate}
/>
```

### For AI Builder Agents

**Generating a Frame:**

AI builders should output frames in UnifiedFrame format:

```
{
  "id": "frame-generated-123",
  "name": "Hero Section",
  "role": "custom",
  "pattern": "focus",
  "frameType": "media_card",
  "props": [
    {
      "id": "hero-image",
      "type": "image",
      "config": {
        "url": "https://...",
        "alt": "Product showcase"
      },
      "orderIndex": 0
    },
    {
      "id": "headline",
      "type": "heading",
      "config": {
        "content": "Revolutionary New Product",
        "level": 1,
        "alignment": "center"
      },
      "orderIndex": 1
    },
    {
      "id": "cta-button",
      "type": "button",
      "config": {
        "label": "Learn More",
        "variant": "primary",
        "url": "/products"
      },
      "orderIndex": 2
    }
  ]
}
```

**Pattern Selection Guide:**

When to use each pattern:

- **Focus:** Single prominent item, hero sections, landing pages
- **Canvas:** Complex custom layouts with multiple content types
- **Dialogic:** Chat interfaces, Q&A, conversational AI
- **Wizard:** Multi-step processes, onboarding, guided flows
- **Gallery:** Image collections, portfolios, product grids
- **Form:** Data input, settings panels, contact forms

**Prop Composition Examples:**

Marketing Landing Page (Canvas):
```
props: [
  { type: 'heading', config: { content: 'Welcome' } },
  { type: 'text', config: { content: 'Our story...' } },
  { type: 'image', config: { url: '...' } },
  { type: 'button', config: { label: 'Get Started' } }
]
```

Product Showcase (Focus):
```
props: [
  { type: 'image', config: { url: 'product.jpg' } },
  { type: 'heading', config: { content: 'Product Name' } },
  { type: 'text', config: { content: 'Description...' } },
  { type: 'button', config: { label: 'Buy Now' } }
]
```

### For Pattern Developers

**Adding a New Pattern:**

1. Define pattern in unified-frame.ts:
```
export type FramePattern = 
  | 'focus'
  | 'canvas'
  | 'my-new-pattern'  // Add here
  // ...
```

2. Implement in PatternRenderer.tsx:
```
switch (frame.pattern) {
  case 'my-new-pattern':
    return <MyNewPattern frame={frame} mode={mode} />;
  // ...
}
```

3. Pattern component structure:
```
const MyNewPattern: React.FC<PatternProps> = ({ frame, mode }) => {
  const props = frame.props;
  
  if (mode === 'studio') {
    // Show editing UI
    return <EditableVersion />;
  }
  
  // Show final presentation
  return <PresentationVersion />;
};
```

---

## Testing the Contract

### Compliance Checklist

Before shipping frame-related code:

- [ ] All frames render through FrameRenderer → PatternRenderer
- [ ] No direct frame rendering based on role
- [ ] Props are arrays, not objects
- [ ] Pattern determines rendering logic
- [ ] Mode correctly controls editing UI
- [ ] No hardcoded special cases for specific frames
- [ ] Type adapters used for data conversions
- [ ] Validation passes for all frames

### Audit Commands

Search for potential contract violations:

```bash
# Look for role-based rendering
grep -r "frame\.role === " apps/web/src/

# Look for pattern-based rendering outside PatternRenderer
grep -r "frame\.pattern === " apps/web/src/ | grep -v PatternRenderer

# Look for direct prop access (should use helpers)
grep -r "frame\.props\[" apps/web/src/

# Look for switch statements on frame properties
grep -r "switch.*frame\." apps/web/src/
```

### Integration Tests

Test that frames render correctly through the contract:

```
describe('Design Agent Contract', () => {
  it('renders all frames through PatternRenderer', () => {
    // Verify FrameRenderer → PatternRenderer flow
  });
  
  it('respects mode boundaries', () => {
    // Verify studio vs preview behavior
  });
  
  it('handles all prop types', () => {
    // Verify each prop type renders
  });
  
  it('supports all patterns', () => {
    // Verify each pattern works
  });
});
```

---

## Migration Guide

### From Legacy MediaFrame

**Old Way (MediaFrame):**
```
<MediaFrame
  frameId={id}
  content={content}
  // Proprietary API
/>
```

**New Way (Design Agent Contract):**
```
<FrameRenderer
  frame={unifiedFrame}
  mode="preview"
  // Standard contract
/>
```

### From Direct Rendering

**Old Way:**
```
function renderFrame(frame) {
  if (frame.role === 'cover') {
    return <CoverComponent />
  }
  if (frame.type === 'gallery') {
    return <GalleryComponent />
  }
  // etc...
}
```

**New Way:**
```
<FrameRenderer
  frame={frame}
  mode={mode}
  // PatternRenderer handles all cases
/>
```

---

## Extending the Contract

### Adding New Prop Types

1. Define prop type in unified-frame.ts
2. Add interface extending BaseProp
3. Add to FrameProp union type
4. Implement rendering in PatternRenderer patterns
5. Update this documentation

### Adding New Patterns

1. Define pattern in FramePattern type
2. Implement pattern component
3. Add to PatternRenderer switch
4. Document pattern use cases
5. Provide AI builder examples

### Breaking Changes

Changes to this contract are breaking changes. Version them:

- v1: Initial implementation
- v2: [Future changes tracked here]

---

## Support and Questions

**For implementation questions:**
- Check examples in /features/board-studio/types/
- Review existing patterns in PatternRenderer.tsx
- See type definitions in unified-frame.ts

**For contract clarifications:**
- This document is the specification
- Code should match this document
- Discrepancies are bugs

**For proposing changes:**
- Open RFC with rationale
- Consider AI builder impact
- Ensure backward compatibility

---

## Summary

**The Design Agent Contract is simple:**

1. All frames render through PatternRenderer
2. Pattern + Props = Presentation
3. Mode controls editing vs viewing
4. No special cases, no bypasses
5. Props are composable and reusable

**Follow this contract and you get:**
- ✅ Consistent rendering
- ✅ AI-builder compatibility
- ✅ Maintainable codebase
- ✅ Predictable behavior
- ✅ Future-proof architecture

**Break this contract and you get:**
- ❌ Rendering inconsistencies
- ❌ AI builder failures
- ❌ Technical debt
- ❌ Maintenance nightmares
- ❌ Architectural drift

**The choice is yours. Choose wisely.**

---

Last Updated: 2025-10-28
Version: 1.0
Status: Active

