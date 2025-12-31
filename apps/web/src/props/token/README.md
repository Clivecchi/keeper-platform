# AI Token v1 Placeholder

## 📌 Purpose
The AI Token is a configurable placeholder component for AI agents within board frames. It provides a visual representation of AI capabilities without executing any live AI calls.

## 🧱 Key Files
- `schema.ts` - Zod schemas and type definitions for token configuration
- `TokenPlaceholder.tsx` - React component for rendering tokens in different modes
- `README.md` - This documentation file

## 🔄 Data & Behavior
The AI Token stores configuration in frame props under the `tokens` key:

```typescript
{
  tokens: Array<{
    id: string;
    config: {
      name: string;
      persona?: string;
      avatarUrl?: string;
      styleNote?: string;
      agentId?: string;
      color: string;
      size: 'small' | 'medium' | 'large';
      position?: { x: number; y: number };
      isVisible: boolean;
    }
  }>
}
```

### Modes
- **Edit Mode**: Shows configuration icon, clickable to open config sheet
- **Layout Mode**: Shows visibility toggle, draggable positioning
- **Preview Mode**: Static display with ready indicator, no interaction

### Configuration Sheet
The token config sheet allows editing:
- Display name (required, max 50 chars)
- Persona/voice description (optional, max 200 chars)
- Avatar URL (optional, with fallback to initials)
- Style note (optional, max 100 chars)
- Color (hex color picker)
- Size (small/medium/large)
- Visibility toggle

## ⚠️ Notes & ToDo
- [ ] No live AI functionality - placeholder only
- [ ] Avatar URL validation could be enhanced
- [ ] Position saving in Layout mode not yet implemented
- [ ] Integration with actual agent system pending
- [ ] Consider adding more size options
- [ ] Add drag-and-drop positioning in Layout mode

## 📦 Usage

### Adding to Props Library
The token appears in the AI section of the Props Library and can be dragged into frames.

### Programmatic Usage
```typescript
import TokenPlaceholder from './TokenPlaceholder';
import { createDefaultToken } from './schema';

const token = createDefaultToken();

<TokenPlaceholder
  config={token.config}
  mode="edit"
  onUpdate={(newConfig) => updateToken(token.id, newConfig)}
  onDelete={() => removeToken(token.id)}
/>
```

### Integration with AI Assist
The AI Assist panel can suggest token configurations based on frame context and user interactions.

## 🔗 Related Components
- `AIAssistPanel` - Can suggest token configurations
- `PatternRenderer` - Renders tokens within frame patterns
- `FrameConfigSheet` - May include token management in future versions
