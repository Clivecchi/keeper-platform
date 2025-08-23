# Agent Home Board System

## 📌 Purpose
Complete implementation of the Agent Home Board system for Keeper Platform, providing persistent, interactive workspaces for AI agents with Topics, Drafts, and comprehensive frame management.

## 🧱 Key Components

### Backend API Routes (`/api/agents/:id/`)
- `GET /home-board` - Get or create Agent Home Board with default frames
- `GET /draft` - Get agent draft from config
- `PATCH /draft` - Update agent draft
- `POST /draft/propose` - Propose draft for review
- `POST /draft/commit` - Commit proposed draft to history
- `GET /draft/history` - Get draft commit history

### Frame Types
- **DialogFrame** - Agent conversation with history
- **AgentPreviewFrame** - Agent status and capabilities
- **TopicsFrame** - Topic management with highlights
- **DraftFrame** - Draft editing with Form/JSON/Diff/History tabs
- **ConfigPanelFrame** - Agent configuration interface

### Frontend Components
- **AgentRegistry** - Main agent list with Home Board access
- **AgentBoard** - Updated to use real Agent Home Board API
- **TopicsFrame** - Full CRUD for topics and highlights
- **DraftFrame** - Complete draft lifecycle management
- **PropManager** - Visual props editor with feature flags

## 🔄 Data & Behavior

### Agent Home Board Bootstrap
1. Agent Home Board is automatically created on first access
2. Default frames: Dialog, Agent Preview, Topics, Draft, Config Panel
3. Board linked to agent via `data.agentId` field
4. Persistent across sessions

### Topics System
- **Active/Archived** status with grouping
- **Highlights** with kinds: fact, decision, task, question, risk
- **Tags** for organization
- **Quick actions** from DialogFrame

### Draft Management
- **Editing** → **Proposed** → **Committed** lifecycle
- **Form/JSON** editing modes with validation
- **Diff view** comparing current vs last committed
- **History** of all committed drafts
- **Auto-save** and unsaved changes detection

### Props System
- **Feature-flagged** with `KEEPER_DRAFT_MODE`
- **Visual editor** for common frame properties
- **JSON editor** for advanced editing
- **PropBlock** components for runtime rendering

## ⚠️ Notes & ToDo

### Implementation Status ✅
- [x] Backend API routes with real database integration
- [x] Agent Home Board auto-creation and templating
- [x] Topics and Draft management endpoints
- [x] Complete frame type system with registry
- [x] Agent Registry with Home Board navigation
- [x] Feature flags and configuration system
- [x] Props editing system with visual interface
- [x] ETag support for conflict resolution

### Database Schema
- Uses existing `Board` and `FrameInstance` models
- Agent drafts stored in `kip_agents.config.draft`
- Topics stored as mock data (implement `Topic` table later)
- Board-Agent linking via `Board.data.agentId`

### Configuration
- `KEEPER_DRAFT_MODE` - Enable draft features in PropManager
- `PROPS_SYSTEM` - Enable props editing interface
- `BOARD_LAYOUT_EDITING` - Enable layout editing controls

### Architecture Patterns
- **Swappable adapters** - Easy to replace mock data with real persistence
- **Feature flags** - Gradual rollout of advanced features  
- **Type-safe** - Full TypeScript coverage with Zod validation
- **Responsive** - Mobile-first stacked layout by default

## 📆 Update Log

**2025-01-28**: Complete Agent Home Board system implemented with:
- Backend API routes for board bootstrap and draft management
- Frontend components for Topics and Draft management
- Agent Registry with Home Board navigation
- Props system with feature flags
- Full TypeScript types and validation
- Real database integration with fallbacks