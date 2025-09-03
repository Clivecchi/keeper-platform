# Lead Agent Page Testing Guide

## 🎯 Testing the Lead Agent Runtime System

### URLs to Test

1. **Kip Assistant**: `http://localhost:5173/kip`
2. **CeoX Executive**: `http://localhost:5173/ceox`
3. **Invalid Agent**: `http://localhost:5173/invalid-agent` (should show error)

### Test Scenarios

#### ✅ **Scenario 1: Agent Loading**
- Navigate to `/kip`
- Verify: Agent loads with correct branding (blue theme, 🤖 avatar)
- Verify: Header shows "Kip" name and tagline
- Verify: Welcome message appears in chat

#### ✅ **Scenario 2: Chat Interaction**
- Type a message: "Hello, can you help me organize my thoughts?"
- Submit message
- Verify: User message appears on right side
- Verify: Loading indicator shows "Thinking..."
- Verify: Agent response appears on left side
- Verify: Response is contextual to Kip's personality

#### ✅ **Scenario 3: CeoX Executive Agent**
- Navigate to `/ceox`
- Verify: Agent loads with red theme, 👔 avatar
- Verify: Header shows "CeoX" name and tagline
- Type: "What's your analysis of our quarterly performance?"
- Verify: Response reflects executive/strategic personality

#### ✅ **Scenario 4: Error Handling**
- Navigate to `/nonexistent-agent`
- Verify: Shows "Agent Not Found" error page
- Verify: "Go Home" button works

#### ✅ **Scenario 5: Mobile Responsiveness**
- Test on mobile viewport
- Verify: Chat interface adapts to smaller screens
- Verify: Input remains accessible
- Verify: Messages remain readable

### Expected Features

- **Auto-scroll**: New messages automatically scroll into view
- **Enter to Send**: Pressing Enter submits messages
- **Theme Colors**: Each agent has distinct branding
- **Timestamps**: Each message shows time sent
- **Loading States**: Proper loading indicators during processing
- **Error Recovery**: Graceful error handling for failed requests

### Database Integration

With database connection:
- Agents load from `kip_agents` table
- Messages are logged to `kip_agent_logs` table
– Agent home board configuration (avatar, theme, tagline) loads from `config` JSON field

Without database connection:
- Falls back to mock data in `kipApi.ts`
- Still functional for testing UI/UX

### Navigation

From Kip Studio (`/studio/kip`):
- Links to Lead agents in "Lead Agent Experiences" section
- Opens in new tabs for full-screen experience

### Performance

- Initial load: < 2 seconds
- Message response: < 3 seconds (including API call)
- Smooth animations with Framer Motion
- Responsive input with proper disabled states 